# api/file_management_blueprint.py

import os
import json
import hashlib
import mimetypes
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge
import psycopg2
from psycopg2.extras import RealDictCursor
from registry import get_account_management_db
from auth_blueprint import get_current_user, token_required

# Create the blueprint
file_management_bp = Blueprint('file_management', __name__)

# Configuration
UPLOAD_FOLDER = 'uploads'
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB
ALLOWED_EXTENSIONS = {
    'txt', 'md', 'json', 'csv', 'js', 'ts', 'jsx', 'tsx',
    'html', 'css', 'py', 'java', 'cpp', 'c', 'xml',
    'pdf', 'jpg', 'jpeg', 'png', 'gif', 'svg'
}


def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
        filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def get_file_type(filename):
    """Categorize file by extension"""
    ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''

    if ext in ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'css', 'html']:
        return 'code'
    elif ext in ['txt', 'md', 'json', 'csv', 'xml']:
        return 'document'
    elif ext in ['jpg', 'jpeg', 'png', 'gif', 'svg']:
        return 'image'
    elif ext == 'pdf':
        return 'pdf'
    else:
        return 'file'


def calculate_checksum(file_path):
    """Calculate SHA-256 checksum of file"""
    hash_sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_sha256.update(chunk)
    return hash_sha256.hexdigest()


def generate_unique_filename(original_filename, task_id, user_id):
    """Generate unique filename following naming convention"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    name, ext = os.path.splitext(original_filename)
    unique_id = hashlib.md5(f"{user_id}{timestamp}".encode()).hexdigest()[:8]
    return f"{secure_filename(name)}_{task_id}_{timestamp}_{unique_id}{ext}"


def get_db_connection():
    """Get database connection for account management DB"""
    db_config = get_account_management_db()
    if not db_config:
        raise Exception("Database configuration not found")

    return psycopg2.connect(
        host=db_config['host'],
        port=db_config['port'],
        database=db_config['database_name'],
        user=db_config['username'],
        password=db_config['password']
    )


# Error handlers
@file_management_bp.errorhandler(RequestEntityTooLarge)
def handle_file_too_large(e):
    return jsonify({
        'error': 'File too large',
        'message': f'Maximum file size is {MAX_FILE_SIZE // (1024 * 1024)}MB'
    }), 413


# Routes

@file_management_bp.route('/api/workspaces/<int:workspace_id>/files', methods=['POST'])
@token_required
def upload_workspace_file(workspace_id):
    """Upload file to workspace"""
    current_user = get_current_user()

    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed'}), 400

    # Get form data
    project_id = request.form.get('project_id', type=int)
    task_id = request.form.get('task_id', '')
    task_description = request.form.get('task_description', '')
    workflow_steps = request.form.get('workflow_steps', type=int)
    current_step = request.form.get('current_step', type=int)
    completion_percentage = request.form.get('completion_percentage', type=int)

    if not project_id:
        return jsonify({'error': 'project_id is required'}), 400

    if not task_id:
        return jsonify({'error': 'task_id is required'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Verify workspace and project exist and user has access
        cursor.execute("""
            SELECT p.id, p.name, w.name as workspace_name 
            FROM projects p 
            JOIN workspaces w ON p.workspace_id = w.id 
            LEFT JOIN workspace_members wm ON w.id = wm.workspace_id 
            WHERE p.id = %s AND w.id = %s 
            AND (wm.user_id = %s OR w.created_by = %s)
        """, (project_id, workspace_id, current_user['id'], current_user['id']))

        project = cursor.fetchone()
        if not project:
            return jsonify({'error': 'Project not found or access denied'}), 404

        # Generate unique filename and save file
        unique_filename = generate_unique_filename(file.filename, task_id, current_user['id'])

        # Ensure upload directory exists
        workspace_upload_dir = os.path.join(UPLOAD_FOLDER, str(workspace_id), str(project_id))
        os.makedirs(workspace_upload_dir, exist_ok=True)

        file_path = os.path.join(workspace_upload_dir, unique_filename)
        file.save(file_path)

        # Calculate file metadata
        file_size = os.path.getsize(file_path)
        checksum = calculate_checksum(file_path)
        mime_type = mimetypes.guess_type(file.filename)[0]
        file_type = get_file_type(file.filename)

        # Check for potential collisions
        cursor.execute("""
            SELECT id, filename, task_description, workflow_steps, completion_percentage
            FROM file_metadata 
            WHERE project_id = %s AND task_id = %s AND is_active = true
        """, (project_id, task_id))

        existing_files = cursor.fetchall()
        similarity_detected = len(existing_files) > 0

        # Insert file metadata
        cursor.execute("""
            INSERT INTO file_metadata (
                filename, original_filename, file_size, file_type, mime_type,
                storage_path, checksum, project_id, workspace_id, created_by,
                task_id, unique_identifier, task_description, workflow_steps,
                current_step, completion_percentage
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            ) RETURNING id, created_at
        """, (
            unique_filename, file.filename, file_size, file_type, mime_type,
            file_path, checksum, project_id, workspace_id, current_user['id'],
            task_id, unique_filename.split('_')[-1].split('.')[0], task_description,
            workflow_steps, current_step, completion_percentage
        ))

        file_record = cursor.fetchone()

        # Log collision if detected
        if similarity_detected:
            files_involved = [f['id'] for f in existing_files] + [file_record['id']]
            cursor.execute("""
                INSERT INTO file_collision_log (
                    project_id, task_id, similarity_score, files_involved
                ) VALUES (%s, %s, %s, %s)
            """, (project_id, task_id, 0.85, json.dumps(files_involved)))

        # Log file usage
        cursor.execute("""
            INSERT INTO file_usage_log (file_id, user_id, action_type, metadata)
            VALUES (%s, %s, %s, %s)
        """, (file_record['id'], current_user['id'], 'upload',
              json.dumps({'file_size': file_size, 'file_type': file_type})))

        conn.commit()

        response_data = {
            'id': file_record['id'],
            'filename': unique_filename,
            'original_filename': file.filename,
            'file_size': file_size,
            'file_type': file_type,
            'mime_type': mime_type,
            'task_id': task_id,
            'task_description': task_description,
            'created_at': file_record['created_at'].isoformat(),
            'similarity_detected': similarity_detected
        }

        if similarity_detected:
            response_data['message'] = 'File uploaded successfully. Similar files detected - collaboration recommended.'
            response_data['similar_files'] = [{'id': f['id'], 'filename': f['filename']} for f in existing_files]

        return jsonify(response_data), 201

    except Exception as e:
        if conn:
            conn.rollback()
        current_app.logger.error(f"File upload error: {str(e)}")

        # Clean up file if database insert failed
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)

        return jsonify({'error': 'Failed to upload file'}), 500

    finally:
        if conn:
            cursor.close()
            conn.close()


@file_management_bp.route('/api/workspaces/<int:workspace_id>/files', methods=['GET'])
@token_required
def list_workspace_files(workspace_id):
    """List files in workspace"""
    current_user = get_current_user()
    project_id = request.args.get('project_id', type=int)

    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Build query based on filters
        where_conditions = ["fm.workspace_id = %s", "fm.is_active = true"]
        params = [workspace_id]

        if project_id:
            where_conditions.append("fm.project_id = %s")
            params.append(project_id)

        # Verify user has access to workspace
        cursor.execute("""
            SELECT 1 FROM workspace_members wm
            JOIN workspaces w ON wm.workspace_id = w.id
            WHERE w.id = %s AND (wm.user_id = %s OR w.created_by = %s)
        """, (workspace_id, current_user['id'], current_user['id']))

        if not cursor.fetchone():
            return jsonify({'error': 'Access denied'}), 403

        # Get files with project info
        cursor.execute(f"""
            SELECT 
                fm.*,
                p.name as project_name,
                u.username as created_by_username,
                CASE WHEN fr.parent_file_id IS NOT NULL THEN true ELSE false END as is_child,
                parent_fm.filename as parent_filename
            FROM file_metadata fm
            JOIN projects p ON fm.project_id = p.id
            JOIN users u ON fm.created_by = u.id
            LEFT JOIN file_relationships fr ON fm.id = fr.child_file_id
            LEFT JOIN file_metadata parent_fm ON fr.parent_file_id = parent_fm.id
            WHERE {' AND '.join(where_conditions)}
            ORDER BY fm.created_at DESC
        """, params)

        files = cursor.fetchall()

        # Format response
        response = []
        for file_record in files:
            response.append({
                'id': file_record['id'],
                'filename': file_record['filename'],
                'original_filename': file_record['original_filename'],
                'file_size': file_record['file_size'],
                'file_type': file_record['file_type'],
                'mime_type': file_record['mime_type'],
                'project_id': file_record['project_id'],
                'project_name': file_record['project_name'],
                'task_id': file_record['task_id'],
                'task_description': file_record['task_description'],
                'workflow_steps': file_record['workflow_steps'],
                'current_step': file_record['current_step'],
                'completion_percentage': file_record['completion_percentage'],
                'created_by': file_record['created_by_username'],
                'created_at': file_record['created_at'].isoformat(),
                'updated_at': file_record['updated_at'].isoformat(),
                'is_child': file_record['is_child'],
                'parent_filename': file_record['parent_filename']
            })

        return jsonify(response)

    except Exception as e:
        current_app.logger.error(f"List files error: {str(e)}")
        return jsonify({'error': 'Failed to retrieve files'}), 500

    finally:
        if conn:
            cursor.close()
            conn.close()


@file_management_bp.route('/api/files/<int:file_id>', methods=['DELETE'])
@token_required
def delete_file(file_id):
    """Delete a file"""
    current_user = get_current_user()

    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Get file info and verify ownership/access
        cursor.execute("""
            SELECT fm.*, p.workspace_id
            FROM file_metadata fm
            JOIN projects p ON fm.project_id = p.id
            LEFT JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
            LEFT JOIN workspaces w ON p.workspace_id = w.id
            WHERE fm.id = %s AND fm.is_active = true
            AND (fm.created_by = %s OR wm.user_id = %s OR w.created_by = %s)
        """, (file_id, current_user['id'], current_user['id'], current_user['id']))

        file_record = cursor.fetchone()
        if not file_record:
            return jsonify({'error': 'File not found or access denied'}), 404

        # Check if file has children (prevent deletion of parent files)
        cursor.execute("""
            SELECT COUNT(*) as child_count 
            FROM file_relationships 
            WHERE parent_file_id = %s
        """, (file_id,))

        child_count = cursor.fetchone()['child_count']
        if child_count > 0:
            return jsonify({
                'error': 'Cannot delete file with child versions',
                'child_count': child_count
            }), 400

        # Mark as inactive instead of hard delete
        cursor.execute("""
            UPDATE file_metadata 
            SET is_active = false, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (file_id,))

        # Log the deletion
        cursor.execute("""
            INSERT INTO file_usage_log (file_id, user_id, action_type)
            VALUES (%s, %s, %s)
        """, (file_id, current_user['id'], 'delete'))

        conn.commit()

        # Optionally remove physical file (uncomment if desired)
        # if os.path.exists(file_record['storage_path']):
        #     os.remove(file_record['storage_path'])

        return jsonify({'message': 'File deleted successfully'})

    except Exception as e:
        if conn:
            conn.rollback()
        current_app.logger.error(f"Delete file error: {str(e)}")
        return jsonify({'error': 'Failed to delete file'}), 500

    finally:
        if conn:
            cursor.close()
            conn.close()


@file_management_bp.route('/api/projects/<int:project_id>/tasks', methods=['POST'])
@token_required
def create_task_definition(project_id):
    """Create a new task definition for a project"""
    current_user = get_current_user()
    data = request.get_json()

    required_fields = ['task_id', 'task_name']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Verify project exists and user has access
        cursor.execute("""
            SELECT p.id, p.workspace_id
            FROM projects p
            LEFT JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
            LEFT JOIN workspaces w ON p.workspace_id = w.id
            WHERE p.id = %s 
            AND (wm.user_id = %s OR w.created_by = %s)
        """, (project_id, current_user['id'], current_user['id']))

        project = cursor.fetchone()
        if not project:
            return jsonify({'error': 'Project not found or access denied'}), 404

        # Insert task definition
        cursor.execute("""
            INSERT INTO task_definitions (
                project_id, task_id, task_name, task_description,
                workflow_steps, estimated_duration_hours, created_by
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, created_at
        """, (
            project_id,
            data['task_id'],
            data['task_name'],
            data.get('task_description', ''),
            json.dumps(data.get('workflow_steps', [])),
            data.get('estimated_duration_hours'),
            current_user['id']
        ))

        task_record = cursor.fetchone()
        conn.commit()

        return jsonify({
            'id': task_record['id'],
            'task_id': data['task_id'],
            'task_name': data['task_name'],
            'project_id': project_id,
            'created_at': task_record['created_at'].isoformat()
        }), 201

    except psycopg2.IntegrityError:
        conn.rollback()
        return jsonify({'error': 'Task ID already exists for this project'}), 409
    except Exception as e:
        if conn:
            conn.rollback()
        current_app.logger.error(f"Create task error: {str(e)}")
        return jsonify({'error': 'Failed to create task'}), 500

    finally:
        if conn:
            cursor.close()
            conn.close()


@file_management_bp.route('/api/files/<int:file_id>/create-child', methods=['POST'])
@token_required
def create_child_file(file_id):
    """Create a child file when modifying a parent file"""
    current_user = get_current_user()
    data = request.get_json()

    if 'new_task_id' not in data:
        return jsonify({'error': 'new_task_id is required'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Get parent file info
        cursor.execute("""
            SELECT fm.*, p.workspace_id
            FROM file_metadata fm
            JOIN projects p ON fm.project_id = p.id
            WHERE fm.id = %s AND fm.is_active = true
        """, (file_id,))

        parent_file = cursor.fetchone()
        if not parent_file:
            return jsonify({'error': 'Parent file not found'}), 404

        # Generate new filename for child
        original_name = parent_file['original_filename']
        new_filename = generate_unique_filename(original_name, data['new_task_id'], current_user['id'])

        # Copy file physically (placeholder - implement actual file copying)
        # For now, we'll just reference the same file
        new_storage_path = parent_file['storage_path']  # This should be updated to copy the file

        # Create child file record
        cursor.execute("""
            INSERT INTO file_metadata (
                filename, original_filename, file_size, file_type, mime_type,
                storage_path, checksum, project_id, workspace_id, created_by,
                task_id, unique_identifier, task_description, workflow_steps,
                current_step, completion_percentage
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            ) RETURNING id, created_at
        """, (
            new_filename, parent_file['original_filename'], parent_file['file_size'],
            parent_file['file_type'], parent_file['mime_type'], new_storage_path,
            parent_file['checksum'], parent_file['project_id'], parent_file['workspace_id'],
            current_user['id'], data['new_task_id'], new_filename.split('_')[-1].split('.')[0],
            data.get('task_description', ''), data.get('workflow_steps'),
            data.get('current_step'), data.get('completion_percentage')
        ))

        child_file = cursor.fetchone()

        # Create parent-child relationship
        cursor.execute("""
            INSERT INTO file_relationships (parent_file_id, child_file_id, created_by)
            VALUES (%s, %s, %s)
        """, (file_id, child_file['id'], current_user['id']))

        conn.commit()

        return jsonify({
            'id': child_file['id'],
            'filename': new_filename,
            'parent_file_id': file_id,
            'created_at': child_file['created_at'].isoformat(),
            'message': 'Child file created successfully'
        }), 201

    except Exception as e:
        if conn:
            conn.rollback()
        current_app.logger.error(f"Create child file error: {str(e)}")
        return jsonify({'error': 'Failed to create child file'}), 500

    finally:
        if conn:
            cursor.close()
            conn.close()


# Health check endpoint
@file_management_bp.route('/api/files/health', methods=['GET'])
def health_check():
    """Health check for file management service"""
    return jsonify({
        'status': 'healthy',
        'service': 'file_management',
        'timestamp': datetime.now().isoformat()
    })