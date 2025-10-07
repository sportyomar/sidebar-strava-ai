# user_blueprint.py

import os
import psycopg2
from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from psycopg2.extras import RealDictCursor
from werkzeug.utils import secure_filename
from auth_blueprint import token_required
from PIL import Image
from registry import get_account_management_db

# Config
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "portfolio_db",
    "user": "sporty",
    "password": os.getenv("POSTGRES_PASSWORD", "your-db-password")
}

# Define a distinct blueprint for user routes
user_bp = Blueprint('user', __name__, url_prefix='/api/user')


@user_bp.route('/profile', methods=['PUT'])
@cross_origin(origins="http://localhost:3000", supports_credentials=True)
@token_required
def update_profile(user_id):
    try:
        avatar_file = request.files.get('avatar')
        form = request.form

        avatar_url = None
        if avatar_file and avatar_file.filename:
            AVATAR_DIR = 'static/avatars'
            os.makedirs(AVATAR_DIR, exist_ok=True)
            filename = f"{user_id}_{secure_filename(avatar_file.filename)}"
            avatar_path = os.path.join(AVATAR_DIR, filename)
            avatar_file.save(avatar_path)

            # ✅ Normalize image
            try:
                img = Image.open(avatar_path).convert("RGB")
                size = min(img.size)
                img = img.crop((
                    (img.width - size) // 2,
                    (img.height - size) // 2,
                    (img.width + size) // 2,
                    (img.height + size) // 2
                )).resize((240, 240))
                img.save(avatar_path, optimize=True, quality=85)
            except Exception as img_err:
                print(f"[Image Resize Error] {img_err}")

            avatar_url = f"http://localhost:5002/static/avatars/{filename}"

        fields = {
            "username": form.get('username'),
            "display_name": form.get('displayName'),
            "phone_number": form.get('phoneNumber'),
            "company_name": form.get('companyName'),
            "company_size": form.get('companySize'),
            "job_title": form.get('jobTitle'),
            "industry": form.get('industry'),
            "evaluating_for_team": form.get('evaluatingForTeam') == 'true'
        }

        update_fields = ", ".join([f"{key} = %s" for key in fields if fields[key] is not None])
        values = [fields[key] for key in fields if fields[key] is not None]

        if avatar_url:
            update_fields += ", avatar_url = %s"
            values.append(avatar_url)

        values.append(user_id)

        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute(f"""
            UPDATE users SET {update_fields}
            WHERE id = %s
        """, values)
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({**fields, "avatar_url": avatar_url}), 200

    except Exception as e:
        print(f"[Update Profile Error] {e}")
        return jsonify({'message': 'Failed to update profile'}), 500


@user_bp.route('/profile', methods=['GET'])
@cross_origin(origins="http://localhost:3000", supports_credentials=True)
@token_required
def get_profile(user_id):
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()

        if user:
            return jsonify(user), 200
        else:
            return jsonify({'message': 'User not found'}), 404

    except Exception as e:
        print(f"[Get Profile Error] {e}")
        return jsonify({'message': 'Failed to load profile'}), 500


def get_account_db_connection():
    """Get connection to account management database"""
    db_config = get_account_management_db()
    return psycopg2.connect(
        host=db_config['host'],
        port=db_config['port'],
        database=db_config['database_name'],
        user=db_config['username'],
        password=db_config['password'],
        cursor_factory=RealDictCursor
    )


@user_bp.route('/last-workspace', methods=['GET'])
@cross_origin(origins="http://localhost:3000", supports_credentials=True)
@token_required
def get_last_workspace(user_id):
    """Get user's last used workspace"""
    try:
        conn = get_account_db_connection()
        cursor = conn.cursor()

        # Get user's last used workspace with workspace details
        cursor.execute("""
            SELECT w.id, w.name, w.description, w.organization_id, w.created_at
            FROM workspaces w 
            JOIN users u ON u.last_used_workspace_id = w.id 
            WHERE u.id = %s
        """, (user_id,))

        workspace = cursor.fetchone()

        if workspace:
            return jsonify(dict(workspace)), 200
        else:
            # User has no last workspace set
            return jsonify(None), 200

    except Exception as e:
        print(f"[Get Last Workspace Error] {e}")
        return jsonify({'error': 'Failed to get last workspace'}), 500
    finally:
        if 'conn' in locals():
            conn.close()


@user_bp.route('/last-workspace', methods=['PUT'])
@cross_origin(origins="http://localhost:3000", supports_credentials=True)
@token_required
def update_last_workspace(user_id):
    """Update user's last used workspace"""
    try:
        data = request.get_json()
        workspace_id = data.get('workspace_id')

        if not workspace_id:
            return jsonify({'error': 'workspace_id is required'}), 400

        conn = get_account_db_connection()
        cursor = conn.cursor()

        # Verify the user has access to this workspace through organization membership
        cursor.execute("""
            SELECT w.id FROM workspaces w
            JOIN organization_members om ON w.organization_id = om.organization_id
            WHERE w.id = %s AND om.user_id = %s
        """, (workspace_id, user_id))

        if not cursor.fetchone():
            return jsonify({'error': 'Workspace not found or access denied'}), 404

        # Update user's last used workspace
        cursor.execute("""
            UPDATE users 
            SET last_used_workspace_id = %s, updated_at = NOW() 
            WHERE id = %s
        """, (workspace_id, user_id))

        conn.commit()

        return jsonify({'message': 'Last workspace updated successfully'}), 200

    except Exception as e:
        print(f"[Update Last Workspace Error] {e}")
        if 'conn' in locals():
            conn.rollback()
        return jsonify({'error': 'Failed to update last workspace'}), 500
    finally:
        if 'conn' in locals():
            conn.close()


@user_bp.route('/workspaces', methods=['GET'])
@cross_origin(origins="http://localhost:3000", supports_credentials=True)
@token_required
def get_user_workspaces(user_id):
    """Get all workspaces accessible to the user"""
    try:
        conn = get_account_db_connection()
        cursor = conn.cursor()

        # Get all workspaces the user has access to through their organization
        cursor.execute("""
            SELECT w.id, w.name, w.description, w.organization_id, w.created_at,
                   COUNT(p.id) as project_count
            FROM workspaces w
            JOIN organization_members om ON w.organization_id = om.organization_id
            LEFT JOIN projects p ON w.id = p.workspace_id
            WHERE om.user_id = %s
            GROUP BY w.id, w.name, w.description, w.organization_id, w.created_at
            ORDER BY w.created_at DESC
        """, (user_id,))

        workspaces = cursor.fetchall()
        return jsonify([dict(ws) for ws in workspaces]), 200

    except Exception as e:
        print(f"[Get User Workspaces Error] {e}")
        return jsonify({'error': 'Failed to get workspaces'}), 500
    finally:
        if 'conn' in locals():
            conn.close()