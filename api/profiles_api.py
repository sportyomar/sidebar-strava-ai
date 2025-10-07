# profiles_api.py
from flask import Blueprint, request, jsonify
from functools import wraps
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import jwt

profiles_bp = Blueprint('profiles', __name__, url_prefix='/api/profiles')

JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")

DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "portfolio_db",
    "user": "sporty",
    "password": os.getenv("POSTGRES_PASSWORD", "TqKwifr5jtJ6")
}


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
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401
        return f(user_id, *args, **kwargs)

    return decorated


@profiles_bp.route('/<username>', methods=['GET'])
@token_required
def get_user_profile(user_id, username):
    """Get a specific user's profile"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT username, email, display_name, avatar, default_module, 
                   default_role, allowed_modules, allowed_roles_by_module
            FROM user_profiles 
            WHERE username = %s
        """, (username,))

        profile = cursor.fetchone()
        cursor.close()
        conn.close()

        if not profile:
            return jsonify({'message': 'Profile not found'}), 404

        return jsonify({
            'username': profile['username'],
            'displayName': profile['display_name'],
            'avatar': profile['avatar'],
            'defaultModule': profile['default_module'],
            'defaultRole': profile['default_role'],
            'allowedModules': profile['allowed_modules'],
            'allowedRolesByModule': profile['allowed_roles_by_module']
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@profiles_bp.route('/team/<client>/<project_id>', methods=['GET'])
@token_required
def get_project_team(user_id, client, project_id):
    """Get team members for a specific project"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Get team assignments for this project
        cursor.execute("""
            SELECT pa.username, pa.role, up.display_name, up.avatar
            FROM project_assignments pa
            LEFT JOIN user_profiles up ON pa.username = up.username
            WHERE pa.client = %s AND pa.project = %s
        """, (client, project_id))

        assignments = cursor.fetchall()

        team = []
        for assignment in assignments:
            team.append({
                'username': assignment['username'],
                'role': assignment['role'],
                'displayName': assignment['display_name'],
                'avatar': assignment['avatar']
            })

        cursor.close()
        conn.close()

        return jsonify(team)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@profiles_bp.route('/active', methods=['GET'])
@token_required
def get_active_users(user_id):
    """Get currently active users (those with recent sessions)"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Get users active in the last 30 minutes
        cursor.execute("""
            SELECT DISTINCT us.username, up.display_name, up.avatar, us.last_seen
            FROM user_sessions us
            LEFT JOIN user_profiles up ON us.username = up.username
            WHERE us.is_active = true 
            AND us.last_seen > NOW() - INTERVAL '30 minutes'
            ORDER BY us.last_seen DESC
        """)

        active_users = cursor.fetchall()

        users = []
        for user in active_users:
            users.append({
                'username': user['username'],
                'displayName': user['display_name'],
                'avatar': user['avatar'],
                'lastSeen': user['last_seen'].isoformat() if user['last_seen'] else None
            })

        cursor.close()
        conn.close()

        return jsonify(users)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@profiles_bp.route('/session/heartbeat', methods=['POST'])
@token_required
def update_session_heartbeat(user_id):
    """Update user's session heartbeat to show they're active"""
    try:
        data = request.get_json()
        username = data.get('username')

        if not username:
            return jsonify({'message': 'Username required'}), 400

        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        # Update or insert session record
        cursor.execute("""
            INSERT INTO user_sessions (user_id, username, last_seen, is_active)
            VALUES (%s, %s, NOW(), true)
            ON CONFLICT (user_id) DO UPDATE SET
                last_seen = NOW(),
                is_active = true
        """, (user_id, username))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({'message': 'Session updated'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@profiles_bp.route('/session/end', methods=['POST'])
@token_required
def end_session(user_id):
    """Mark user session as inactive"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE user_sessions 
            SET is_active = false 
            WHERE user_id = %s
        """, (user_id,))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({'message': 'Session ended'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@profiles_bp.route('/validate/<username>', methods=['GET'])
@token_required
def validate_user_session(user_id, username):
    """Validate if a user has an active session"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Check if user has active session in last 30 minutes
        cursor.execute("""
            SELECT username, last_seen, is_active
            FROM user_sessions
            WHERE username = %s 
            AND is_active = true
            AND last_seen > NOW() - INTERVAL '30 minutes'
        """, (username,))

        session = cursor.fetchone()
        cursor.close()
        conn.close()

        return jsonify({
            'isValid': session is not None,
            'lastSeen': session['last_seen'].isoformat() if session and session['last_seen'] else None
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@profiles_bp.route('/permissions/<username>/<workspace>', methods=['GET'])
@token_required
def get_user_permissions(user_id, username, workspace):
    """Get user's permissions for a specific workspace"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT allowed_modules, allowed_roles_by_module
            FROM user_profiles 
            WHERE username = %s
        """, (username,))

        profile = cursor.fetchone()
        cursor.close()
        conn.close()

        if not profile:
            return jsonify({'message': 'Profile not found'}), 404

        allowed_modules = profile['allowed_modules'] or []
        allowed_roles = profile['allowed_roles_by_module'].get(workspace, []) if profile[
            'allowed_roles_by_module'] else []

        return jsonify({
            'hasAccess': workspace in allowed_modules,
            'allowedRoles': allowed_roles,
            'allowedModules': allowed_modules
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500