from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
import os
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
import sys

sys.path.append('/Users/sporty/PycharmProjects/memory_issue/Sidebar/sidebar')
from registry import get_db_instance

modules_bp = Blueprint('modules', __name__)

JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")


# Database connection using registry
def get_db_connection():
    db_config = get_db_instance("local-postgres")
    return psycopg2.connect(
        host=db_config["host"],
        port=db_config["port"],
        database=db_config["database_name"],
        user=db_config["username"],
        password=db_config["password"]
    )


# Auth decorator - matches your auth_blueprint.py
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        try:
            token = token.replace('Bearer ', '')
            data = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            user_id = data['user_id']  # Your auth uses user_id, not username
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401
        return f(user_id, *args, **kwargs)

    return decorated


# Helper function to get username from user_id
def get_username_by_id(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("SELECT username FROM users WHERE id = %s", (user_id,))
        result = cursor.fetchone()
        return result['username'] if result else None
    except Exception as e:
        print(f"Error getting username: {e}")
        return None
    finally:
        cursor.close()
        conn.close()


# Admin check decorator
def admin_required(f):
    @wraps(f)
    def decorated(user_id, *args, **kwargs):
        username = get_username_by_id(user_id)
        if not username:
            return jsonify({'message': 'User not found'}), 404

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        try:
            cursor.execute(
                "SELECT allowed_modules FROM user_profiles WHERE username = %s",
                (username,)
            )
            result = cursor.fetchone()

            if not result or 'adminConsole' not in (result['allowed_modules'] or []):
                return jsonify({'message': 'Admin access required'}), 403

        except Exception as e:
            return jsonify({'message': 'Database error', 'error': str(e)}), 500
        finally:
            cursor.close()
            conn.close()

        return f(user_id, *args, **kwargs)

    return decorated


@modules_bp.route('/api/user/modules', methods=['GET'])
@token_required
def get_user_modules(user_id):
    """Get user's module status (enabled, pending, available)"""
    username = get_username_by_id(user_id)
    if not username:
        return jsonify({'message': 'User not found'}), 404

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute(
            "SELECT allowed_modules, pending_modules FROM user_profiles WHERE username = %s",
            (username,)
        )
        result = cursor.fetchone()

        if not result:
            return jsonify({'message': 'User profile not found'}), 404

        enabled = result['allowed_modules'] or []
        pending = result['pending_modules'] or []

        all_modules = [
            'memoEditor', 'dealIntake', 'connectors', 'utilities',
            'adminConsole', 'metrics', 'manifest'
        ]

        available = [module for module in all_modules
                     if module not in enabled and module not in pending]

        return jsonify({
            'enabled': enabled,
            'pending': pending,
            'available': available
        })

    except Exception as e:
        return jsonify({'message': 'Database error', 'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@modules_bp.route('/api/user/request-module-access', methods=['POST'])
@token_required
def request_module_access(user_id):
    """Request access to a module (requires approval)"""
    username = get_username_by_id(user_id)
    if not username:
        return jsonify({'message': 'User not found'}), 404

    data = request.get_json()
    module_key = data.get('moduleKey')
    reason = data.get('reason', 'User requested access')

    if not module_key:
        return jsonify({'message': 'Module key is required'}), 400

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute(
            "SELECT id FROM module_requests WHERE username = %s AND module_key = %s AND status = %s",
            (username, module_key, 'pending')
        )

        if cursor.fetchone():
            return jsonify({'message': 'Request already pending for this module'}), 400

        cursor.execute(
            "INSERT INTO module_requests (username, module_key, reason) VALUES (%s, %s, %s)",
            (username, module_key, reason)
        )

        cursor.execute(
            """UPDATE user_profiles 
               SET pending_modules = array_append(COALESCE(pending_modules, '{}'), %s)
               WHERE username = %s""",
            (module_key, username)
        )

        conn.commit()
        return jsonify({'message': 'Access request submitted successfully'})

    except Exception as e:
        conn.rollback()
        return jsonify({'message': 'Database error', 'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@modules_bp.route('/api/user/enable-module', methods=['POST'])
@token_required
def enable_module(user_id):
    """Enable a module (no approval needed)"""
    username = get_username_by_id(user_id)
    if not username:
        return jsonify({'message': 'User not found'}), 404

    data = request.get_json()
    module_key = data.get('moduleKey')

    if not module_key:
        return jsonify({'message': 'Module key is required'}), 400

    modules_requiring_approval = ['dealIntake', 'connectors', 'adminConsole', 'manifest']
    if module_key in modules_requiring_approval:
        return jsonify({'message': 'This module requires approval'}), 400

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute(
            "SELECT allowed_modules FROM user_profiles WHERE username = %s",
            (username,)
        )
        result = cursor.fetchone()

        if result and module_key in (result['allowed_modules'] or []):
            return jsonify({'message': 'Module already enabled'}), 400

        cursor.execute(
            """UPDATE user_profiles 
               SET allowed_modules = array_append(COALESCE(allowed_modules, '{}'), %s)
               WHERE username = %s""",
            (module_key, username)
        )

        conn.commit()
        return jsonify({'message': 'Module enabled successfully'})

    except Exception as e:
        conn.rollback()
        return jsonify({'message': 'Database error', 'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@modules_bp.route('/api/user/disable-module', methods=['POST'])
@token_required
def disable_module(user_id):
    """Disable a module"""
    username = get_username_by_id(user_id)
    if not username:
        return jsonify({'message': 'User not found'}), 404

    data = request.get_json()
    module_key = data.get('moduleKey')

    if not module_key:
        return jsonify({'message': 'Module key is required'}), 400

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute(
            """UPDATE user_profiles 
               SET allowed_modules = array_remove(COALESCE(allowed_modules, '{}'), %s)
               WHERE username = %s""",
            (module_key, username)
        )

        conn.commit()
        return jsonify({'message': 'Module disabled successfully'})

    except Exception as e:
        conn.rollback()
        return jsonify({'message': 'Database error', 'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@modules_bp.route('/api/user/cancel-module-request/<module_key>', methods=['DELETE'])
@token_required
def cancel_module_request(user_id, module_key):
    """Cancel a pending module request"""
    username = get_username_by_id(user_id)
    if not username:
        return jsonify({'message': 'User not found'}), 404

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute(
            "DELETE FROM module_requests WHERE username = %s AND module_key = %s AND status = %s",
            (username, module_key, 'pending')
        )

        cursor.execute(
            """UPDATE user_profiles 
               SET pending_modules = array_remove(COALESCE(pending_modules, '{}'), %s)
               WHERE username = %s""",
            (module_key, username)
        )

        conn.commit()
        return jsonify({'message': 'Request cancelled successfully'})

    except Exception as e:
        conn.rollback()
        return jsonify({'message': 'Database error', 'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# Admin endpoints
@modules_bp.route('/api/admin/module-requests', methods=['GET'])
@token_required
@admin_required
def get_module_requests(current_user):
    """Get all pending module requests (admin only)"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute("""
            SELECT mr.*, u.display_name, u.email 
            FROM module_requests mr
            JOIN users u ON mr.username = u.username
            WHERE mr.status = 'pending'
            ORDER BY mr.requested_at DESC
        """)

        requests = cursor.fetchall()

        for req in requests:
            if req['requested_at']:
                req['requested_at'] = req['requested_at'].isoformat()
            if req['reviewed_at']:
                req['reviewed_at'] = req['reviewed_at'].isoformat()

        return jsonify(requests)

    except Exception as e:
        return jsonify({'message': 'Database error', 'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@modules_bp.route('/api/admin/module-requests/<int:request_id>/<action>', methods=['POST'])
@token_required
@admin_required
def process_module_request(current_user, request_id, action):
    """Approve or deny a module request (admin only)"""
    if action not in ['approve', 'deny']:
        return jsonify({'message': 'Invalid action'}), 400

    data = request.get_json()
    notes = data.get('notes', '')

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute(
            "SELECT username, module_key FROM module_requests WHERE id = %s",
            (request_id,)
        )
        result = cursor.fetchone()

        if not result:
            return jsonify({'message': 'Request not found'}), 404

        username = result['username']
        module_key = result['module_key']

        cursor.execute(
            """UPDATE module_requests 
               SET status = %s, reviewed_at = NOW(), reviewed_by = %s, notes = %s
               WHERE id = %s""",
            ('approved' if action == 'approve' else 'denied', current_user, notes, request_id)
        )

        if action == 'approve':
            cursor.execute(
                """UPDATE user_profiles 
                   SET allowed_modules = array_append(COALESCE(allowed_modules, '{}'), %s)
                   WHERE username = %s""",
                (module_key, username)
            )

        cursor.execute(
            """UPDATE user_profiles 
               SET pending_modules = array_remove(COALESCE(pending_modules, '{}'), %s)
               WHERE username = %s""",
            (module_key, username)
        )

        conn.commit()
        return jsonify({'message': f'Request {action}d successfully'})

    except Exception as e:
        conn.rollback()
        return jsonify({'message': 'Database error', 'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()