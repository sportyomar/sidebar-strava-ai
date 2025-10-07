from flask import Blueprint, request, jsonify, redirect, session
import requests
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import psycopg2
import psycopg2.extras
import json
from registry import get_strava_db
from auth_blueprint import get_current_user

# Create the blueprint
strava_oauth_bp = Blueprint('strava_oauth', __name__, url_prefix='/api/strava/oauth')

# Strava OAuth configuration
STRAVA_CLIENT_ID = os.getenv('STRAVA_CLIENT_ID')
STRAVA_CLIENT_SECRET = os.getenv('STRAVA_CLIENT_SECRET')
STRAVA_REDIRECT_URI = os.getenv('STRAVA_REDIRECT_URI', 'http://localhost:5002/api/strava/oauth/callback')

# Strava API endpoints
STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize'
STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token'


# ============================================================
# DATABASE HELPER FUNCTIONS
# ============================================================

def get_db_connection():
    """Get PostgreSQL connection for Strava tokens."""
    db_config = get_strava_db()
    return psycopg2.connect(
        host=db_config['host'],
        port=db_config['port'],
        database=db_config['database_name'],
        user=db_config['username'],
        password=db_config['password']
    )


def get_stored_tokens(user_id: str) -> Optional[Dict[str, Any]]:
    """Fetch tokens from database for a user."""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        cur.execute(
            "SELECT * FROM oauth_tokens WHERE user_id = %s",
            (user_id,)
        )
        result = cur.fetchone()

        if not result:
            return None

        # athlete is already a dict (JSONB column auto-parses)
        return {
            'access_token': result['access_token'],
            'refresh_token': result['refresh_token'],
            'expires_at': result['expires_at'],
            'athlete': result['athlete'] if result['athlete'] else {},
            'updated_at': result['updated_at'].isoformat() if result['updated_at'] else None
        }
    finally:
        cur.close()
        conn.close()


def store_tokens(user_id: str, token_data: Dict[str, Any]) -> None:
    """Store or update tokens in database."""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            INSERT INTO oauth_tokens (user_id, access_token, refresh_token, expires_at, athlete, updated_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                access_token = EXCLUDED.access_token,
                refresh_token = EXCLUDED.refresh_token,
                expires_at = EXCLUDED.expires_at,
                athlete = EXCLUDED.athlete,
                updated_at = NOW()
        """, (
            user_id,
            token_data['access_token'],
            token_data['refresh_token'],
            token_data['expires_at'],
            json.dumps(token_data.get('athlete', {}))
        ))

        conn.commit()
        print(f"Stored tokens for user {user_id}")
    finally:
        cur.close()
        conn.close()


def delete_tokens(user_id: str) -> None:
    """Remove tokens from database."""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("DELETE FROM oauth_tokens WHERE user_id = %s", (user_id,))
        conn.commit()
        print(f"Deleted tokens for user {user_id}")
    finally:
        cur.close()
        conn.close()


# ============================================================
# OAUTH ROUTES
# ============================================================

@strava_oauth_bp.route('/authorize', methods=['GET'])
def authorize():
    """Initiate OAuth flow - redirect user to Strava authorization page."""

    if not STRAVA_CLIENT_ID:
        return jsonify({'error': 'Strava client ID not configured'}), 500

    # Get user from JWT token
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401

    user_id = user['id']

    # Build authorization URL
    params = {
        'client_id': STRAVA_CLIENT_ID,
        'redirect_uri': STRAVA_REDIRECT_URI,
        'response_type': 'code',
        'scope': 'read,activity:read_all,profile:read_all',
        'state': user_id
    }

    auth_url = f"{STRAVA_AUTH_URL}?{'&'.join(f'{k}={v}' for k, v in params.items())}"
    return redirect(auth_url)

@strava_oauth_bp.route('/callback', methods=['GET'])
def callback():
    """Handle OAuth callback from Strava."""

    try:
        # Check for errors
        error = request.args.get('error')
        if error:
            return jsonify({
                'error': 'Authorization denied',
                'details': error
            }), 400

        # Get authorization code
        code = request.args.get('code')
        user_id = request.args.get('state', 'default_user')

        if not code:
            return jsonify({'error': 'No authorization code received'}), 400

        # Exchange code for access token
        token_data = exchange_code_for_token(code)

        if not token_data:
            return jsonify({'error': 'Failed to exchange code for token'}), 500

        # Store tokens
        store_tokens(user_id, token_data)

        # Return success page or redirect back to app
        return redirect(f'http://localhost:3000?strava_connected=true')

    except Exception as e:
        print(f"OAuth callback error: {str(e)}")
        return jsonify({
            'error': 'OAuth callback failed',
            'details': str(e)
        }), 500


def exchange_code_for_token(code: str) -> Optional[Dict[str, Any]]:
    """Exchange authorization code for access token."""

    try:
        response = requests.post(STRAVA_TOKEN_URL, data={
            'client_id': STRAVA_CLIENT_ID,
            'client_secret': STRAVA_CLIENT_SECRET,
            'code': code,
            'grant_type': 'authorization_code'
        })

        if response.status_code != 200:
            print(f"Token exchange failed: {response.text}")
            return None

        return response.json()

    except Exception as e:
        print(f"Token exchange error: {str(e)}")
        return None


@strava_oauth_bp.route('/refresh', methods=['POST'])
def refresh_token():
    """Refresh an expired access token."""

    try:
        data = request.get_json()
        user_id = data.get('user_id', 'default_user')

        # Get stored tokens
        stored = get_stored_tokens(user_id)
        if not stored:
            return jsonify({'error': 'No tokens found for user'}), 404

        # Request new token
        response = requests.post(STRAVA_TOKEN_URL, data={
            'client_id': STRAVA_CLIENT_ID,
            'client_secret': STRAVA_CLIENT_SECRET,
            'refresh_token': stored['refresh_token'],
            'grant_type': 'refresh_token'
        })

        if response.status_code != 200:
            return jsonify({
                'error': 'Token refresh failed',
                'details': response.text
            }), 500

        # Update stored tokens
        new_token_data = response.json()
        store_tokens(user_id, new_token_data)

        return jsonify({
            'success': True,
            'expires_at': new_token_data['expires_at']
        })

    except Exception as e:
        return jsonify({
            'error': 'Token refresh failed',
            'details': str(e)
        }), 500


@strava_oauth_bp.route('/disconnect', methods=['POST'])
def disconnect():
    """Disconnect Strava - revoke tokens and remove from storage."""

    try:
        # Get user from JWT token
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Authentication required'}), 401

        user_id = user['id']

        # Get stored tokens
        stored = get_stored_tokens(user_id)
        if not stored:
            return jsonify({'error': 'No connection found'}), 404

        # Revoke token with Strava
        try:
            requests.post('https://www.strava.com/oauth/deauthorize', data={
                'access_token': stored['access_token']
            })
        except Exception as e:
            print(f"Token revocation error: {str(e)}")

        # Remove from database
        delete_tokens(user_id)

        return jsonify({
            'success': True,
            'message': 'Disconnected from Strava'
        })

    except Exception as e:
        return jsonify({
            'error': 'Disconnect failed',
            'details': str(e)
        }), 500

@strava_oauth_bp.route('/status', methods=['GET'])
def status():
    """Check connection status and token validity."""

    # Get user from JWT token
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401

    user_id = user['id']
    stored = get_stored_tokens(user_id)

    if not stored:
        return jsonify({'connected': False})

    # Check if token is expired
    expires_at = stored['expires_at']
    current_timestamp = int(datetime.now().timestamp())
    is_expired = expires_at < current_timestamp

    return jsonify({
        'connected': True,
        'athlete': {
            'id': stored['athlete'].get('id'),
            'firstname': stored['athlete'].get('firstname'),
            'lastname': stored['athlete'].get('lastname'),
            'username': stored['athlete'].get('username')
        },
        'token_expired': is_expired,
        'expires_at': datetime.fromtimestamp(expires_at).isoformat(),
        'updated_at': stored.get('updated_at')
    })

def get_valid_token(user_id: str) -> Optional[str]:
    """Get a valid access token, refreshing if necessary.

    This is a utility function that other blueprints can import and use.
    """

    stored = get_stored_tokens(user_id)
    if not stored:
        return None

    # Check if token is expired
    expires_at = stored['expires_at']
    current_timestamp = int(datetime.now().timestamp())

    # Refresh if expired or expiring in next 5 minutes
    if expires_at < (current_timestamp + 300):
        print(f"Token expired or expiring soon, refreshing for user {user_id}")

        try:
            response = requests.post(STRAVA_TOKEN_URL, data={
                'client_id': STRAVA_CLIENT_ID,
                'client_secret': STRAVA_CLIENT_SECRET,
                'refresh_token': stored['refresh_token'],
                'grant_type': 'refresh_token'
            })

            if response.status_code == 200:
                new_token_data = response.json()
                store_tokens(user_id, new_token_data)
                return new_token_data['access_token']
            else:
                print(f"Token refresh failed: {response.text}")
                return None

        except Exception as e:
            print(f"Token refresh error: {str(e)}")
            return None

    return stored['access_token']


@strava_oauth_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'strava_oauth',
        'configured': bool(STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET)
    })