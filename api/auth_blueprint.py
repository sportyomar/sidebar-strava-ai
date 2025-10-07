from flask_cors import cross_origin
from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
import jwt
import datetime
from functools import wraps
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from werkzeug.security import generate_password_hash
from registry import get_account_management_db

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")


def get_db_connection():
    """Get database connection using registry"""
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


def get_current_user():
    """Extract current user from JWT token in request headers - returns user object or None"""
    token = request.headers.get('Authorization')
    if not token:
        return None

    try:
        token = token.replace('Bearer ', '')
        data = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])

        # Validate token type
        if data.get('type') != 'access':
            return None

        user_id = data['user_id']
        return get_user_by_id(user_id)

    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_user_by_email(email):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        return user
    except Exception as e:
        print(f"DB error: {e}")
        return None


def get_user_by_id(user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        return user
    except Exception as e:
        print(f"DB error: {e}")
        return None


def create_tokens(user_id):
    """Create both access and refresh tokens"""
    access_payload = {
        'user_id': user_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=8),  # Extended to 8 hours
        'type': 'access'
    }
    refresh_payload = {
        'user_id': user_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7),  # 7 days
        'type': 'refresh'
    }
    access_token = jwt.encode(access_payload, JWT_SECRET, algorithm='HS256')
    refresh_token = jwt.encode(refresh_payload, JWT_SECRET, algorithm='HS256')
    return access_token, refresh_token


def validate_token(token_string, expected_type=None):
    """Validate and decode a JWT token, optionally checking type"""
    try:
        data = jwt.decode(token_string, JWT_SECRET, algorithms=['HS256'])

        if expected_type and data.get('type') != expected_type:
            return None, f'Invalid token type. Expected {expected_type}'

        return data, None

    except jwt.ExpiredSignatureError:
        return None, 'Token expired'
    except jwt.InvalidTokenError:
        return None, 'Invalid token'


def token_required(f):
    """Decorator that requires a valid access token"""

    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({
                'message': 'Access token is missing',
                'error_code': 'TOKEN_MISSING'
            }), 401

        try:
            token = token.replace('Bearer ', '')
            data, error = validate_token(token, 'access')

            if error:
                return jsonify({
                    'message': error,
                    'error_code': 'TOKEN_INVALID' if 'Invalid' in error else 'TOKEN_EXPIRED'
                }), 401

            user_id = data['user_id']
            return f(user_id, *args, **kwargs)

        except Exception as e:
            return jsonify({
                'message': 'Token validation failed',
                'error_code': 'TOKEN_ERROR'
            }), 401

    return decorated


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'message': 'Email and password required'}), 400

    user = get_user_by_email(email)
    if user and check_password_hash(user['password_hash'], password):
        access_token, refresh_token = create_tokens(user['id'])
        return jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'display_name': user.get('display_name', ''),
                'avatar': user.get('avatar') or user.get('avatar_url')
            }
        })
    return jsonify({'message': 'Invalid credentials'}), 401


@auth_bp.route('/refresh', methods=['POST'])
def refresh():
    data = request.get_json()
    refresh_token = data.get('refresh_token')

    if not refresh_token:
        return jsonify({
            'message': 'Refresh token required',
            'error_code': 'REFRESH_TOKEN_MISSING'
        }), 400

    token_data, error = validate_token(refresh_token, 'refresh')

    if error:
        return jsonify({
            'message': error,
            'error_code': 'REFRESH_TOKEN_INVALID'
        }), 401

    user_id = token_data['user_id']

    # Verify user still exists
    user = get_user_by_id(user_id)
    if not user:
        return jsonify({
            'message': 'User not found',
            'error_code': 'USER_NOT_FOUND'
        }), 401

    new_access_token, new_refresh_token = create_tokens(user_id)

    return jsonify({
        'access_token': new_access_token,
        'refresh_token': new_refresh_token
    })


@auth_bp.route('/validate', methods=['GET'])
def validate():
    """Endpoint to validate current access token"""
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'valid': False, 'message': 'No token provided'}), 401

    try:
        token = token.replace('Bearer ', '')
        data, error = validate_token(token, 'access')

        if error:
            return jsonify({'valid': False, 'message': error}), 401

        user = get_user_by_id(data['user_id'])
        if not user:
            return jsonify({'valid': False, 'message': 'User not found'}), 401

        return jsonify({
            'valid': True,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'display_name': user.get('display_name', ''),
                'avatar': user.get('avatar') or user.get('avatar_url')
            }
        })

    except Exception as e:
        return jsonify({'valid': False, 'message': 'Token validation failed'}), 401


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    username = data.get('username')
    display_name = data.get('display_name')

    if not all([email, password, username]):
        return jsonify({'message': 'Missing required fields: email, password, username'}), 400

    # Check if user already exists
    existing_user = get_user_by_email(email)
    if existing_user:
        return jsonify({'message': 'User with this email already exists'}), 409

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        hashed = generate_password_hash(password)
        cursor.execute("""
            INSERT INTO users (email, password_hash, username, display_name)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """, (email, hashed, username, display_name))
        user_id = cursor.fetchone()[0]
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            'message': 'User registered successfully',
            'user_id': user_id
        })
    except Exception as e:
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500


@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout(user_id):
    # In a more robust system, you'd invalidate the token on the server side
    # For now, client-side token removal is sufficient
    return jsonify({'message': 'Logged out successfully'})


@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user_info(user_id):
    user = get_user_by_id(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
    return jsonify({
        'id': user['id'],
        'username': user['username'],
        'email': user['email'],
        'display_name': user.get('display_name', ''),
        'avatar': user.get('avatar') or user.get('avatar_url')
    })


@auth_bp.route('/send-verification', methods=['POST', 'OPTIONS'])
@cross_origin(origins="http://localhost:3000", supports_credentials=True)
def send_verification():
    if request.method == 'OPTIONS':
        return '', 204

    try:
        data = request.get_json()
        email = data.get('email')
        if not email:
            return jsonify({'message': 'Email is required'}), 400

        print(f"Sending verification email to: {email}")
        # TODO: add actual email logic

        return jsonify({'message': 'Verification email sent'}), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@auth_bp.route('/create-business-account', methods=['POST', 'OPTIONS'])
@cross_origin(origins="http://localhost:3000", supports_credentials=True)
def create_business_account():
    if request.method == 'OPTIONS':
        return '', 204

    # Use form data instead of JSON
    email = request.form.get('email')
    phone = request.form.get('phoneNumber')
    company = request.form.get('companyName')
    size = request.form.get('companySize')
    title = request.form.get('jobTitle')
    industry = request.form.get('industry')
    evaluating = request.form.get('evaluatingForTeam', 'false') == 'true'
    avatar_file = request.files.get('avatar')

    # Default hashed password for demo login
    default_password = generate_password_hash('demo123')

    # Derive username from email
    username = email.split('@')[0]
    avatar_url = None

    # Handle avatar upload
    if avatar_file and avatar_file.filename:
        from werkzeug.utils import secure_filename
        AVATAR_UPLOAD_DIR = 'static/avatars'
        os.makedirs(AVATAR_UPLOAD_DIR, exist_ok=True)

        filename = secure_filename(avatar_file.filename)
        avatar_path = os.path.join(AVATAR_UPLOAD_DIR, filename)
        avatar_file.save(avatar_path)
        avatar_url = f"/{avatar_path}"

    if not all([email, phone, company, size, title, industry]):
        return jsonify({'message': 'Missing required fields'}), 400

    # Check if user already exists
    existing_user = get_user_by_email(email)
    if existing_user:
        return jsonify({'message': 'User with this email already exists'}), 409

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO users (
                email, password_hash, username, phone_number, company_name,
                company_size, job_title, industry, evaluating_for_team, avatar_url
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            email, default_password, username, phone, company,
            size, title, industry, evaluating, avatar_url
        ))
        user_id = cursor.fetchone()[0]
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            'message': 'Business account created successfully',
            'user_id': user_id
        }), 201

    except Exception as e:
        return jsonify({'message': f'Error creating account: {str(e)}'}), 500


@auth_bp.route('/update-avatar', methods=['PATCH'])
@cross_origin(origins="http://localhost:3000", supports_credentials=True)
@token_required
def update_avatar(user_id):
    avatar_file = request.files.get('avatar')

    if not avatar_file or not avatar_file.filename:
        return jsonify({'message': 'No avatar file provided'}), 400

    try:
        from werkzeug.utils import secure_filename
        AVATAR_UPLOAD_DIR = 'static/avatars'
        os.makedirs(AVATAR_UPLOAD_DIR, exist_ok=True)

        filename = f"{user_id}_{secure_filename(avatar_file.filename)}"
        avatar_path = os.path.join(AVATAR_UPLOAD_DIR, filename)
        avatar_file.save(avatar_path)
        avatar_url = f"/{avatar_path}"

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE users
            SET avatar_url = %s
            WHERE id = %s
        """, (avatar_url, user_id))
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            'message': 'Avatar updated successfully',
            'avatar': avatar_url
        }), 200

    except Exception as e:
        return jsonify({'message': f'Error updating avatar: {str(e)}'}), 500