from flask import Blueprint, jsonify, request
import psycopg2
from psycopg2.extras import RealDictCursor
from registry import get_docs_db
import jwt
import os
from functools import wraps
from datetime import timezone

docs_bp = Blueprint('docs', __name__)

JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        try:
            token = token.replace('Bearer ', '')
            data = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            user_id = data['user_id']
            return f(user_id, *args, **kwargs)
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401

    return decorated


def get_db_connection():
    """Get database connection using registry"""
    db_config = get_docs_db()
    return psycopg2.connect(
        host=db_config['host'],
        port=db_config['port'],
        database=db_config['database_name'],
        user=db_config['username'],
        password=db_config['password']
    )


def extract_sections_from_content(markdown_content):
    """Extract h2 and h3 headings from markdown content"""
    import re

    lines = markdown_content.split('\n')
    sections = []

    for line in lines:
        # Match h2 and h3 headings
        h2_match = re.match(r'^## (.+)$', line.strip())
        h3_match = re.match(r'^### (.+)$', line.strip())

        if h2_match:
            title = h2_match.group(1)
            # Create anchor from title
            anchor = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
            sections.append({
                'title': title,
                'level': 2,
                'anchor': anchor
            })
        elif h3_match:
            title = h3_match.group(1)
            # Create anchor from title
            anchor = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
            sections.append({
                'title': title,
                'level': 3,
                'anchor': anchor
            })

    return sections

@docs_bp.route('/api/docs', methods=['GET'])
def get_all_docs():
    """Get all documents with their groups - replaces docs.json"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Get all documents with group info
        cursor.execute("""
            SELECT 
                d.id,
                d.title,
                d.description,
                d.type,
                d.toc_id as "tocId",
                d.body_path as "bodyPath",
                d.code_snippet_path as "codeSnippetPath",
                d.sort_order,
                dg.title as group_title
            FROM documents d
            LEFT JOIN document_groups dg ON d.toc_id = dg.toc_id
            WHERE d.is_active = true
            ORDER BY dg.sort_order, d.sort_order, d.title
        """)

        docs = cursor.fetchall()
        cursor.close()
        conn.close()

        # Convert to list of dicts for JSON response
        docs_list = [dict(doc) for doc in docs]

        return jsonify(docs_list)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@docs_bp.route('/api/docs/groups', methods=['GET'])
def get_doc_groups():
    """Get all platform sections with their documents (unified endpoint)"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Get all platform sections (includes both migrated doc groups and new sections)
        cursor.execute("""
            SELECT id, title, description, type, status, sort_order
            FROM platform_sections
            ORDER BY sort_order, title
        """)
        sections = cursor.fetchall()

        result = []

        # Process each platform section
        for section in sections:
            cursor.execute("""
                SELECT 
                    id, title, description, type,
                    body_path as "bodyPath", code_snippet_path as "codeSnippetPath",
                    sort_order, status
                FROM documents
                WHERE platform_section_id = %s AND is_active = true
                ORDER BY sort_order, title
            """, (section['id'],))

            documents = cursor.fetchall()

            # Separate TOC and articles
            toc_docs = [dict(doc) for doc in documents if doc['type'] == 'toc']
            article_docs = [dict(doc) for doc in documents if doc['type'] == 'article']

            section_data = dict(section)
            section_data['tocId'] = f"platform-{section['id']}"  # For frontend compatibility

            # If this was a migrated document group, use TOC document data but preserve section type
            if toc_docs and section['type'] == 'documentation':
                original_type = section_data['type']  # Save the section type
                section_data.update(toc_docs[0])      # Update with TOC document data
                section_data['type'] = original_type  # Restore the section type

            section_data['articles'] = article_docs
            result.append(section_data)

        cursor.close()
        conn.close()

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@docs_bp.route('/api/docs/<doc_id>', methods=['GET'])
def get_document(doc_id):
    """Get a specific document with its sections"""
    try:
        # Get docs database connection
        docs_conn = get_db_connection()
        docs_cursor = docs_conn.cursor(cursor_factory=RealDictCursor)

        # Get document
        docs_cursor.execute("""
            SELECT 
                d.id, d.title, d.description, d.type,
                d.created_by as author_id, d.created_at, d.updated_at,
                d.toc_id as "tocId", d.body_path as "bodyPath",
                d.code_snippet_path as "codeSnippetPath"
            FROM documents d
            WHERE d.id = %s AND d.is_active = true
        """, (doc_id,))

        doc = docs_cursor.fetchone()
        if not doc:
            docs_cursor.close()
            docs_conn.close()
            return jsonify({'error': 'Document not found'}), 404

        # Get sections
        docs_cursor.execute("""
            SELECT id, title, anchor, level, sort_order
            FROM document_sections
            WHERE document_id = %s
            ORDER BY sort_order
        """, (doc_id,))

        sections = docs_cursor.fetchall()
        docs_cursor.close()
        docs_conn.close()

        # Get author info from portfolio database
        author_info = None
        if doc['author_id']:  # Changed from doc['created_by'] to doc['author_id']
            try:
                from registry import get_portfolio_db
                portfolio_config = get_portfolio_db()
                portfolio_conn = psycopg2.connect(
                    host=portfolio_config['host'],
                    port=portfolio_config['port'],
                    database=portfolio_config['database_name'],
                    user=portfolio_config['username'],
                    password=portfolio_config['password']
                )
                portfolio_cursor = portfolio_conn.cursor(cursor_factory=RealDictCursor)

                portfolio_cursor.execute("""
                    SELECT display_name, username, avatar_url
                    FROM users
                    WHERE id = %s
                """, (doc['author_id'],))  # Changed from doc['created_by'] to doc['author_id']

                author_data = portfolio_cursor.fetchone()
                if author_data:
                    author_info = dict(author_data)

                portfolio_cursor.close()
                portfolio_conn.close()

            except Exception as e:
                print(f"Warning: Could not fetch author info: {e}")

        # Structure the response
        result = dict(doc)
        result['sections'] = [dict(section) for section in sections]

        if author_info:
            result['author'] = author_info

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@docs_bp.route('/api/docs/<doc_id>/sections', methods=['GET'])
def get_document_sections(doc_id):
    """Get sections for a specific document"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT id, title, anchor, level, sort_order
            FROM document_sections
            WHERE document_id = %s
            ORDER BY sort_order
        """, (doc_id,))

        sections = cursor.fetchall()
        cursor.close()
        conn.close()

        return jsonify([dict(section) for section in sections])

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@docs_bp.route('/api/docs/search', methods=['GET'])
def search_docs():
    """Search documents by title, description, or content"""
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify([])

    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Search in documents and sections
        cursor.execute("""
            SELECT DISTINCT
                d.id, d.title, d.description, d.type,
                d.toc_id as "tocId", dg.title as group_title,
                'document' as match_type
            FROM documents d
            LEFT JOIN document_groups dg ON d.toc_id = dg.toc_id
            WHERE d.is_active = true
            AND (
                d.title ILIKE %s
                OR d.description ILIKE %s
            )

            UNION

            SELECT DISTINCT
                d.id, d.title, d.description, d.type,
                d.toc_id as "tocId", dg.title as group_title,
                'section' as match_type
            FROM documents d
            LEFT JOIN document_groups dg ON d.toc_id = dg.toc_id
            JOIN document_sections ds ON d.id = ds.document_id
            WHERE d.is_active = true
            AND ds.title ILIKE %s

            ORDER BY title
            LIMIT 20
        """, (f'%{query}%', f'%{query}%', f'%{query}%'))

        results = cursor.fetchall()
        cursor.close()
        conn.close()

        return jsonify([dict(result) for result in results])

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@docs_bp.route('/api/docs/<doc_id>/comments', methods=['GET'])
def get_document_comments(doc_id):
    """Get all comments for a document"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT 
                id, user_id, author_name, author_avatar, content,
                created_at, updated_at
            FROM document_comments
            WHERE document_id = %s AND is_deleted = false
            ORDER BY created_at ASC
        """, (doc_id,))

        comments = cursor.fetchall()
        cursor.close()
        conn.close()

        return jsonify([dict(comment) for comment in comments])

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@docs_bp.route('/api/docs/<doc_id>/comments', methods=['POST'])
@token_required
def add_document_comment(user_id, doc_id):
    """Add a new comment to a document"""
    try:
        data = request.get_json()
        content = data.get('content', '').strip()

        if not content:
            return jsonify({'error': 'Comment content is required'}), 400

        # Get user info from auth database
        from auth_blueprint import get_user_by_id
        user = get_user_by_id(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        author_name = user.get('display_name') or user.get('username') or 'Anonymous'
        author_avatar = user.get('avatar_url') or user.get('avatar')

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            INSERT INTO document_comments 
            (document_id, user_id, author_name, author_avatar, content)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, created_at
        """, (doc_id, user_id, author_name, author_avatar, content))

        result = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            'id': result['id'],
            'user_id': user_id,
            'author_name': author_name,
            'author_avatar': author_avatar,
            'content': content,
            'created_at': result['created_at'].astimezone(timezone.utc).isoformat(),
            'updated_at': result['created_at']
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@docs_bp.route('/api/docs/comments/<int:comment_id>', methods=['DELETE'])
@token_required
def delete_comment(user_id, comment_id):
    """Delete a comment (soft delete)"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Check if user owns the comment
        cursor.execute("""
            SELECT user_id FROM document_comments 
            WHERE id = %s AND is_deleted = false
        """, (comment_id,))

        comment = cursor.fetchone()
        if not comment:
            return jsonify({'error': 'Comment not found'}), 404

        if comment['user_id'] != user_id:
            return jsonify({'error': 'Unauthorized'}), 403

        # Soft delete
        cursor.execute("""
            UPDATE document_comments 
            SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (comment_id,))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({'message': 'Comment deleted successfully'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Add these endpoints to your existing docs_blueprint.py

@docs_bp.route('/api/docs', methods=['POST'])
@token_required
def create_document(user_id):
    try:
        data = request.get_json()
        title = data.get('title', '').strip()
        description = data.get('description', '').strip()
        platform_section_id = data.get('platform_section_id')
        doc_type = data.get('type', 'article')

        if not title:
            return jsonify({'error': 'Title is required'}), 400
        if not platform_section_id:
            return jsonify({'error': 'Platform section is required'}), 400

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Convert platform_section_id to UUID if it's a number
        if str(platform_section_id).isdigit():
            # Look for a platform_section UUID that ends with this number
            cursor.execute("""
                SELECT id FROM platform_sections 
                WHERE id::text LIKE %s
                LIMIT 1
            """, (f'%-{platform_section_id}',))

            result = cursor.fetchone()
            if result:
                platform_section_id = result['id']
            else:
                # If not found by UUID pattern, use first available section
                cursor.execute("SELECT id FROM platform_sections LIMIT 1")
                result = cursor.fetchone()
                if result:
                    platform_section_id = result['id']
                else:
                    cursor.close()
                    conn.close()
                    return jsonify({'error': f'No platform sections exist'}), 404

        # Get next sort order for this section
        cursor.execute("""
            SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order
            FROM documents 
            WHERE platform_section_id = %s AND type = %s
        """, (platform_section_id, doc_type))

        next_order = cursor.fetchone()['next_order']

        # Create document record
        cursor.execute("""
            INSERT INTO documents 
            (title, description, type, platform_section_id, sort_order, status, created_by)
            VALUES (%s, %s, %s, %s, %s, 'draft', %s)
            RETURNING id, created_at
        """, (title, description, doc_type, platform_section_id, next_order, user_id))

        doc_result = cursor.fetchone()
        doc_id = doc_result['id']

        # Create initial content record
        initial_content = f"# {title}\n\n{description}\n\nStart writing your content here..."
        cursor.execute("""
            INSERT INTO document_content 
            (document_id, content, version, created_by)
            VALUES (%s, %s, 1, %s)
        """, (doc_id, initial_content, user_id))

        conn.commit()

        # Get the complete document data to return
        cursor.execute("""
            SELECT 
                d.id, d.title, d.description, d.type,
                d.platform_section_id, d.status, d.sort_order,
                ps.title as section_title
            FROM documents d
            LEFT JOIN platform_sections ps ON d.platform_section_id = ps.id
            WHERE d.id = %s
        """, (doc_id,))

        document = cursor.fetchone()
        cursor.close()
        conn.close()

        return jsonify(dict(document)), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@docs_bp.route('/api/docs/<doc_id>/content', methods=['GET'])
def get_document_content(doc_id):
    """Get document content from database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Get latest content version
        cursor.execute("""
            SELECT 
                dc.content, dc.version, dc.created_at, dc.updated_at,
                d.title, d.description, d.status
            FROM document_content dc
            JOIN documents d ON dc.document_id = d.id
            WHERE dc.document_id = %s AND d.is_active = true
            ORDER BY dc.version DESC
            LIMIT 1
        """, (doc_id,))

        content = cursor.fetchone()
        cursor.close()
        conn.close()

        if not content:
            return jsonify({'error': 'Document content not found'}), 404

        return jsonify(dict(content))

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@docs_bp.route('/api/docs/<doc_id>/content', methods=['PUT'])
@token_required
def update_document_content(user_id, doc_id):
    try:
        data = request.get_json()
        content = data.get('content', '')
        if not content:
            return jsonify({'error': 'Content is required'}), 400

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Only creator can edit
        cursor.execute("""
            SELECT created_by FROM documents
            WHERE id = %s AND is_active = true
        """, (doc_id,))
        doc = cursor.fetchone()
        if not doc:
            return jsonify({'error': 'Document not found'}), 404
        if doc['created_by'] != user_id:
            return jsonify({'error': 'Unauthorized to edit this document'}), 403

        # Next version
        cursor.execute("""
            SELECT COALESCE(MAX(version), 0) AS v
            FROM document_content
            WHERE document_id = %s
        """, (doc_id,))
        next_version = (cursor.fetchone()['v'] or 0) + 1

        # Append a new version
        cursor.execute("""
            INSERT INTO document_content (document_id, content, version, created_by)
            VALUES (%s, %s, %s, %s)
        """, (doc_id, content, next_version, user_id))

        # Touch the doc
        cursor.execute("UPDATE documents SET updated_at = CURRENT_TIMESTAMP WHERE id = %s", (doc_id,))

        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'Content updated successfully', 'version': next_version})
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@docs_bp.route('/api/docs/<doc_id>/publish', methods=['PUT'])
@token_required
def toggle_document_status(user_id, doc_id):
    """Toggle document between draft and published status"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Check current status and permissions
        cursor.execute("""
            SELECT created_by, status FROM documents 
            WHERE id = %s AND is_active = true
        """, (doc_id,))

        doc = cursor.fetchone()
        if not doc:
            return jsonify({'error': 'Document not found'}), 404

        # For now, only allow creator to publish (can expand permissions later)
        if doc['created_by'] != user_id:
            return jsonify({'error': 'Unauthorized to publish this document'}), 403

        # Toggle status
        new_status = 'draft' if doc['status'] == 'published' else 'published'

        cursor.execute("""
            UPDATE documents 
            SET status = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (new_status, doc_id))

        # Log the status change
        cursor.execute("""
            INSERT INTO document_revisions 
            (document_id, user_id, action, details)
            VALUES (%s, %s, %s, %s)
        """, (doc_id, user_id, 'status_change', f'Changed status to {new_status}'))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            'message': f'Document {new_status} successfully',
            'status': new_status
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@docs_bp.route('/api/docs/<doc_id>', methods=['PUT'])
@token_required
def update_document_metadata(user_id, doc_id):
    """Update document title, description, and other metadata"""
    try:
        data = request.get_json()
        title = data.get('title', '').strip()
        description = data.get('description', '').strip()

        if not title:
            return jsonify({'error': 'Title is required'}), 400

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Check permissions
        cursor.execute("""
            SELECT created_by FROM documents 
            WHERE id = %s AND is_active = true
        """, (doc_id,))

        doc = cursor.fetchone()
        if not doc:
            return jsonify({'error': 'Document not found'}), 404

        if doc['created_by'] != user_id:
            return jsonify({'error': 'Unauthorized to edit this document'}), 403

        # Update document metadata
        cursor.execute("""
            UPDATE documents 
            SET title = %s, description = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (title, description, doc_id))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({'message': 'Document updated successfully'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@docs_bp.route('/api/docs/migrate', methods=['POST'])
@token_required
def migrate_file_content(user_id):
    """Migrate file-based documents to database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Get all documents that still use file-based content
        cursor.execute("""
            SELECT 
                d.id, d.title, d.description, d.type, d.toc_id,
                d.body_path, d.code_snippet_path
            FROM documents d
            LEFT JOIN document_content dc ON d.id = dc.document_id
            WHERE d.body_path IS NOT NULL 
            AND dc.document_id IS NULL
            AND d.is_active = true
            ORDER BY d.title
        """)

        file_based_docs = cursor.fetchall()
        migrated_docs = []
        failed_docs = []

        for doc in file_based_docs:
            try:
                # Read markdown content from file
                import os
                import requests

                # Handle both local file paths and URLs
                body_path = doc['body_path']
                if body_path.startswith('http'):
                    # It's a URL - fetch content
                    response = requests.get(body_path)
                    response.raise_for_status()
                    content = response.text
                else:
                    # Handle relative paths with correct base path
                    base_path = "/Users/sporty/PycharmProjects/memory_issue/Sidebar/sidebar/public"

                    # Remove leading slash if present and join paths
                    relative_path = body_path.lstrip('/')
                    full_path = os.path.join(base_path, relative_path)

                    if os.path.exists(full_path):
                        with open(full_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                    else:
                        raise FileNotFoundError(f"File not found: {full_path}")

                # Insert content into database
                cursor.execute("""
                    INSERT INTO document_content 
                    (document_id, content, version, created_by)
                    VALUES (%s, %s, 1, %s)
                """, (doc['id'], content, user_id))

                # Extract and create sections from markdown
                sections = extract_sections_from_content(content)
                for idx, section in enumerate(sections):
                    cursor.execute("""
                        INSERT INTO document_sections 
                        (document_id, title, anchor, level, sort_order)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (doc['id'], section['title'], section['anchor'],
                          section['level'], idx + 1))

                # Clear the body_path to indicate it's now database-based
                cursor.execute("""
                    UPDATE documents 
                    SET body_path = NULL, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (doc['id'],))

                migrated_docs.append({
                    'id': doc['id'],
                    'title': doc['title'],
                    'path': doc['body_path']
                })

            except Exception as file_error:
                failed_docs.append({
                    'id': doc['id'],
                    'title': doc['title'],
                    'path': doc['body_path'],
                    'error': str(file_error)
                })
                continue

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            'message': f'Migration completed. {len(migrated_docs)} documents migrated, {len(failed_docs)} failed.',
            'migrated': migrated_docs,
            'failed': failed_docs,
            'total_processed': len(file_based_docs)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@docs_bp.route('/api/docs/migration-status', methods=['GET'])
def get_migration_status():
    """Get count of documents that still need migration"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT COUNT(*) as pending_count
            FROM documents d
            LEFT JOIN document_content dc ON d.id = dc.document_id
            WHERE d.body_path IS NOT NULL 
            AND dc.document_id IS NULL
            AND d.is_active = true
        """)

        result = cursor.fetchone()
        cursor.close()
        conn.close()

        return jsonify({
            'pending_migration': result['pending_count'],
            'migration_needed': result['pending_count'] > 0
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@docs_bp.route('/api/docs/groups', methods=['POST'])
@token_required
def create_document_group(user_id):
    """Create a new document group/section"""
    try:
        data = request.get_json()
        title = data.get('title', '').strip()
        description = data.get('description', '').strip()

        if not title:
            return jsonify({'error': 'Title is required'}), 400

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Generate unique toc_id (could be UUID or slug-based)
        import uuid
        toc_id = str(uuid.uuid4())

        # Get next sort order
        cursor.execute("""
            SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order
            FROM document_groups
        """)
        next_order = cursor.fetchone()['next_order']

        # Create document group
        cursor.execute("""
            INSERT INTO document_groups (toc_id, title, description, sort_order)
            VALUES (%s, %s, %s, %s)
            RETURNING toc_id, created_at
        """, (toc_id, title, description, next_order))

        group_result = cursor.fetchone()

        # Also create a TOC document for this group
        cursor.execute("""
            INSERT INTO documents 
            (title, description, type, toc_id, sort_order, status, created_by)
            VALUES (%s, %s, 'toc', %s, 1, 'published', %s)
            RETURNING id
        """, (title, description, toc_id, user_id))

        doc_result = cursor.fetchone()
        doc_id = doc_result['id']

        # Create initial content for the TOC document
        initial_content = f"# {title}\n\n{description}\n\nThis section contains the following topics:\n\n*Articles will be listed here as they are added to this section.*"
        cursor.execute("""
            INSERT INTO document_content 
            (document_id, content, version, created_by)
            VALUES (%s, %s, 1, %s)
        """, (doc_id, initial_content, user_id))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            'toc_id': toc_id,
            'document_id': doc_id,
            'title': title,
            'description': description,
            'message': 'Document group created successfully'
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@docs_bp.route('/api/platform-sections/<section_id>/cta-blocks', methods=['POST'])
@token_required
def add_cta_block(user_id, section_id):
    """Add CTA block to section header"""
    try:
        data = request.get_json()
        byline = data.get('byline', '').strip()
        title = data.get('title', '').strip()
        description = data.get('description', '').strip()
        button_text = data.get('button_text', '').strip()
        button_link = data.get('button_link', '').strip()
        image_url = data.get('image_url', '').strip()

        if not title:
            return jsonify({'error': 'Title is required'}), 400

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Verify section exists and user has permission
        cursor.execute("""
            SELECT created_by FROM platform_sections 
            WHERE id = %s
        """, (section_id,))

        section = cursor.fetchone()
        if not section:
            return jsonify({'error': 'Section not found'}), 404

        if section['created_by'] != user_id:
            return jsonify({'error': 'Unauthorized to edit this section'}), 403

        # Get next sort order
        cursor.execute("""
            SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order
            FROM section_cta_blocks
            WHERE section_id = %s
        """, (section_id,))
        next_order = cursor.fetchone()['next_order']

        # Create CTA block
        cursor.execute("""
            INSERT INTO section_cta_blocks 
            (section_id, byline, title, description, button_text, button_link, image_url, sort_order)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (section_id, byline, title, description, button_text, button_link, image_url, next_order))

        cta_result = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            'id': cta_result['id'],
            'section_id': section_id,
            'byline': byline,
            'title': title,
            'description': description,
            'button_text': button_text,
            'button_link': button_link,
            'image_url': image_url,
            'sort_order': next_order,
            'message': 'CTA block added successfully'
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@docs_bp.route('/api/platform-sections/<section_id>/pages', methods=['POST'])
@token_required
def add_section_page(user_id, section_id):
    """Add page/card to section"""
    try:
        data = request.get_json()
        title = data.get('title', '').strip()
        description = data.get('description', '').strip()
        link_url = data.get('link_url', '').strip()

        if not title:
            return jsonify({'error': 'Title is required'}), 400

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Verify section exists and user has permission
        cursor.execute("""
            SELECT created_by FROM platform_sections 
            WHERE id = %s
        """, (section_id,))

        section = cursor.fetchone()
        if not section:
            return jsonify({'error': 'Section not found'}), 404

        if section['created_by'] != user_id:
            return jsonify({'error': 'Unauthorized to edit this section'}), 403

        # Get next sort order
        cursor.execute("""
            SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order
            FROM section_pages
            WHERE section_id = %s
        """, (section_id,))
        next_order = cursor.fetchone()['next_order']

        # Create page
        cursor.execute("""
            INSERT INTO section_pages 
            (section_id, title, description, link_url, sort_order)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, created_at
        """, (section_id, title, description, link_url, next_order))

        page_result = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            'id': page_result['id'],
            'section_id': section_id,
            'title': title,
            'description': description,
            'link_url': link_url,
            'sort_order': next_order,
            'created_at': page_result['created_at'].isoformat(),
            'message': 'Section page added successfully'
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@docs_bp.route('/api/platform-sections/<section_id>/cta-blocks/<block_id>', methods=['DELETE'])
@token_required
def delete_cta_block(user_id, section_id, block_id):
    """Delete a CTA block"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Verify section ownership
        cursor.execute("""
            SELECT created_by FROM platform_sections 
            WHERE id = %s
        """, (section_id,))

        section = cursor.fetchone()
        if not section:
            return jsonify({'error': 'Section not found'}), 404

        if section['created_by'] != user_id:
            return jsonify({'error': 'Unauthorized to edit this section'}), 403

        # Delete CTA block
        cursor.execute("""
            DELETE FROM section_cta_blocks 
            WHERE id = %s AND section_id = %s
        """, (block_id, section_id))

        if cursor.rowcount == 0:
            return jsonify({'error': 'CTA block not found'}), 404

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({'message': 'CTA block deleted successfully'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@docs_bp.route('/api/platform-sections/<section_id>/pages/<page_id>', methods=['DELETE'])
@token_required
def delete_section_page(user_id, section_id, page_id):
    """Delete a section page"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Verify section ownership
        cursor.execute("""
            SELECT created_by FROM platform_sections 
            WHERE id = %s
        """, (section_id,))

        section = cursor.fetchone()
        if not section:
            return jsonify({'error': 'Section not found'}), 404

        if section['created_by'] != user_id:
            return jsonify({'error': 'Unauthorized to edit this section'}), 403

        # Delete page
        cursor.execute("""
            DELETE FROM section_pages 
            WHERE id = %s AND section_id = %s
        """, (page_id, section_id))

        if cursor.rowcount == 0:
            return jsonify({'error': 'Section page not found'}), 404

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({'message': 'Section page deleted successfully'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@docs_bp.route('/api/platform-sections/<section_id>', methods=['PUT'])
@token_required
def update_platform_section(user_id, section_id):
    """Update platform section metadata"""
    try:
        data = request.get_json()
        title = data.get('title', '').strip()
        description = data.get('description', '').strip()
        status = data.get('status', 'draft')

        if not title:
            return jsonify({'error': 'Title is required'}), 400

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Verify section ownership
        cursor.execute("""
            SELECT created_by FROM platform_sections 
            WHERE id = %s
        """, (section_id,))

        section = cursor.fetchone()
        if not section:
            return jsonify({'error': 'Section not found'}), 404

        if section['created_by'] != user_id:
            return jsonify({'error': 'Unauthorized to edit this section'}), 403

        # Update section
        cursor.execute("""
            UPDATE platform_sections 
            SET title = %s, description = %s, status = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (title, description, status, section_id))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            'message': 'Platform section updated successfully',
            'title': title,
            'description': description,
            'status': status
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@docs_bp.route('/api/platform-sections', methods=['POST'])
@token_required
def create_platform_section(user_id):
    """Create a new platform section (mini-site)"""
    try:
        data = request.get_json()
        print(f"DEBUG: Received data: {data}")
        print(f"DEBUG: User ID: {user_id}")

        title = data.get('title', '').strip()
        description = data.get('description', '').strip()
        section_type = data.get('type', 'minisite')

        print(f"DEBUG: Parsed values - Title: '{title}', Description: '{description}', Type: '{section_type}'")

        if not title:
            return jsonify({'error': 'Title is required'}), 400

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Get next sort order
        print("DEBUG: Getting next sort order...")
        cursor.execute("""
            SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order
            FROM platform_sections
        """)
        next_order_result = cursor.fetchone()
        next_order = next_order_result['next_order']
        print(f"DEBUG: Next sort order: {next_order}")

        # Create platform section - let PostgreSQL generate the UUID
        sql_query = """
            INSERT INTO platform_sections 
            (title, description, type, sort_order, created_by)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, created_at
        """
        sql_params = (title, description, section_type, next_order, user_id)

        print(f"DEBUG: SQL Query: {sql_query}")
        print(f"DEBUG: SQL Parameters: {sql_params}")
        print(f"DEBUG: Parameter types: {[type(p).__name__ for p in sql_params]}")

        cursor.execute(sql_query, sql_params)

        section_result = cursor.fetchone()
        print(f"DEBUG: Insert result: {section_result}")

        conn.commit()
        cursor.close()
        conn.close()

        response_data = {
            'id': str(section_result['id']),  # Convert UUID to string for JSON
            'title': title,
            'description': description,
            'type': section_type,
            'message': 'Platform section created successfully'
        }

        print(f"DEBUG: Response data: {response_data}")

        return jsonify(response_data), 201

    except Exception as e:
        print(f"DEBUG: Exception occurred: {str(e)}")
        print(f"DEBUG: Exception type: {type(e).__name__}")
        import traceback
        print(f"DEBUG: Full traceback: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


@docs_bp.route('/api/platform-sections', methods=['GET'])
def get_platform_sections():
    """Get all platform sections"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT id, title, description, type, status, sort_order, created_at
            FROM platform_sections
            ORDER BY sort_order, title
        """)

        sections = cursor.fetchall()
        cursor.close()
        conn.close()

        return jsonify([dict(section) for section in sections])

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@docs_bp.route('/api/platform-sections/<section_id>', methods=['GET'])
def get_platform_section(section_id):
    """Get specific section with CTA blocks and pages"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Get section
        cursor.execute("""
            SELECT id, title, description, type, status, created_by, created_at
            FROM platform_sections
            WHERE id = %s
        """, (section_id,))

        section = cursor.fetchone()
        if not section:
            return jsonify({'error': 'Section not found'}), 404

        # Get CTA blocks
        cursor.execute("""
            SELECT id, byline, title, description, button_text, button_link, image_url, sort_order
            FROM section_cta_blocks
            WHERE section_id = %s
            ORDER BY sort_order
        """, (section_id,))
        cta_blocks = cursor.fetchall()

        # Get pages
        cursor.execute("""
            SELECT id, title, description, link_url, sort_order
            FROM section_pages
            WHERE section_id = %s
            ORDER BY sort_order
        """, (section_id,))
        pages = cursor.fetchall()

        cursor.close()
        conn.close()

        result = dict(section)
        result['cta_blocks'] = [dict(block) for block in cta_blocks]
        result['pages'] = [dict(page) for page in pages]

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500