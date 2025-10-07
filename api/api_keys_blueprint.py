from flask import Blueprint, request, jsonify
import psycopg2
from psycopg2.extras import RealDictCursor
from cryptography.fernet import Fernet
import os
import base64
from auth_blueprint import token_required
from registry import get_portfolio_db

api_keys_bp = Blueprint('api_keys', __name__, url_prefix='/api/keys')

# Encryption key for API keys (store securely in production)
ENCRYPTION_KEY = os.getenv('API_KEY_ENCRYPTION_KEY')
if not ENCRYPTION_KEY:
    # Generate a key if not provided (for development only)
    ENCRYPTION_KEY = Fernet.generate_key()
    print("Warning: Using generated encryption key. Set API_KEY_ENCRYPTION_KEY in production.")

cipher_suite = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)


def get_db_connection():
    """Get database connection for portfolio DB"""
    db_config = get_portfolio_db()
    if not db_config:
        raise Exception("Portfolio database configuration not found")

    return psycopg2.connect(
        host=db_config['host'],
        port=db_config['port'],
        database=db_config['database_name'],
        user=db_config['username'],
        password=db_config['password']
    )


def encrypt_api_key(api_key):
    """Encrypt an API key for secure storage."""
    return cipher_suite.encrypt(api_key.encode()).decode()


def decrypt_api_key(encrypted_key):
    """Decrypt an API key for use."""
    return cipher_suite.decrypt(encrypted_key.encode()).decode()


@api_keys_bp.route('', methods=['GET'])
@token_required
def get_user_api_keys(user_id):
    """Get all API keys for the current user (without decrypting the actual keys)."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT provider, endpoint_url, api_version, organization_id, 
                   deployment_names, last_tested_at, last_test_status, 
                   test_error_message, created_at, updated_at
            FROM user_api_keys 
            WHERE user_id = %s
            ORDER BY provider
        """, (user_id,))

        keys = cursor.fetchall()
        cursor.close()
        conn.close()

        # Format response to match frontend expectations
        result = {}
        for key in keys:
            result[key['provider']] = {
                'status': key['last_test_status'],
                'endpoint': key['endpoint_url'],
                'apiVersion': key['api_version'],
                'orgId': key['organization_id'],
                'deployments': key['deployment_names'],
                'lastTested': key['last_tested_at'].isoformat() if key['last_tested_at'] else None,
                'errorMessage': key['test_error_message'],
                'hasKey': True  # Don't expose the actual key
            }

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_keys_bp.route('/<provider>', methods=['POST'])
@token_required
def save_api_key(user_id, provider):
    """Save or update API key for a specific provider."""
    try:
        data = request.get_json()
        api_key = data.get('apiKey')

        if not api_key:
            return jsonify({'error': 'API key is required'}), 400

        # Encrypt the API key
        encrypted_key = encrypt_api_key(api_key)

        # Extract provider-specific fields
        endpoint_url = data.get('endpoint')
        api_version = data.get('apiVersion')
        organization_id = data.get('orgId')
        deployment_names = data.get('deployments')

        conn = get_db_connection()
        cursor = conn.cursor()

        # Use UPSERT (INSERT ... ON CONFLICT)
        cursor.execute("""
            INSERT INTO user_api_keys 
                (user_id, provider, api_key_encrypted, endpoint_url, api_version, 
                 organization_id, deployment_names, last_test_status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'unknown')
            ON CONFLICT (user_id, provider) 
            DO UPDATE SET
                api_key_encrypted = EXCLUDED.api_key_encrypted,
                endpoint_url = EXCLUDED.endpoint_url,
                api_version = EXCLUDED.api_version,
                organization_id = EXCLUDED.organization_id,
                deployment_names = EXCLUDED.deployment_names,
                last_test_status = 'unknown',
                updated_at = NOW()
        """, (user_id, provider, encrypted_key, endpoint_url, api_version,
              organization_id, deployment_names))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({'message': f'{provider} API key saved successfully'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_keys_bp.route('/<provider>/test', methods=['POST'])
@token_required
def test_api_key(user_id, provider):
    """Test API key connection for a specific provider."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Get the encrypted API key
        cursor.execute("""
            SELECT api_key_encrypted, endpoint_url, api_version, organization_id
            FROM user_api_keys 
            WHERE user_id = %s AND provider = %s
        """, (user_id, provider))

        key_data = cursor.fetchone()
        if not key_data:
            return jsonify({'error': 'API key not found'}), 404

        # Decrypt the API key
        api_key = decrypt_api_key(key_data['api_key_encrypted'])

        # Update status to testing
        cursor.execute("""
            UPDATE user_api_keys 
            SET last_test_status = 'testing', last_tested_at = NOW()
            WHERE user_id = %s AND provider = %s
        """, (user_id, provider))
        conn.commit()

        # Test the connection based on provider
        success = False
        error_message = None

        try:
            if provider == 'openai':
                import requests
                response = requests.get(
                    'https://api.openai.com/v1/models',
                    headers={'Authorization': f'Bearer {api_key}'},
                    timeout=10
                )
                success = response.status_code == 200
                if not success:
                    error_message = f"HTTP {response.status_code}: {response.text[:200]}"

            elif provider == 'anthropic':
                import requests
                response = requests.post(
                    'https://api.anthropic.com/v1/messages',
                    headers={
                        'x-api-key': api_key,
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json'
                    },
                    json={
                        'model': 'claude-3-haiku-20240307',
                        'max_tokens': 1,
                        'messages': [{'role': 'user', 'content': 'test'}]
                    },
                    timeout=10
                )
                success = response.status_code in [200, 400]  # 400 is OK for test
                if not success:
                    error_message = f"HTTP {response.status_code}: {response.text[:200]}"

            elif provider == 'azure_openai':
                if not key_data['endpoint_url']:
                    success = False
                    error_message = "Azure endpoint URL is required"
                else:
                    import requests
                    endpoint = key_data['endpoint_url'].rstrip('/')
                    api_version = key_data['api_version'] or '2024-02-15-preview'

                    response = requests.get(
                        f"{endpoint}/openai/models?api-version={api_version}",
                        headers={'api-key': api_key},
                        timeout=10
                    )
                    success = response.status_code == 200
                    if not success:
                        error_message = f"HTTP {response.status_code}: {response.text[:200]}"

        except Exception as test_error:
            success = False
            error_message = str(test_error)

        # Update the test results
        status = 'connected' if success else 'failed'
        cursor.execute("""
            UPDATE user_api_keys 
            SET last_test_status = %s, last_tested_at = NOW(), test_error_message = %s
            WHERE user_id = %s AND provider = %s
        """, (status, error_message, user_id, provider))
        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            'success': success,
            'status': status,
            'message': 'Connected successfully' if success else error_message
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_keys_bp.route('/<provider>', methods=['DELETE'])
@token_required
def delete_api_key(user_id, provider):
    """Delete API key for a specific provider."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            DELETE FROM user_api_keys 
            WHERE user_id = %s AND provider = %s
        """, (user_id, provider))

        if cursor.rowcount == 0:
            return jsonify({'error': 'API key not found'}), 404

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({'message': f'{provider} API key deleted successfully'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


def get_user_api_key(user_id, provider):
    """Helper function to get decrypted API key for internal use."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT api_key_encrypted, endpoint_url, api_version, 
                   organization_id, deployment_names, last_test_status
            FROM user_api_keys 
            WHERE user_id = %s AND provider = %s AND last_test_status = 'connected'
        """, (user_id, provider))

        result = cursor.fetchone()
        cursor.close()
        conn.close()

        if result:
            return {
                'api_key': decrypt_api_key(result['api_key_encrypted']),
                'endpoint_url': result['endpoint_url'],
                'api_version': result['api_version'],
                'organization_id': result['organization_id'],
                'deployment_names': result['deployment_names']
            }
        return None

    except Exception as e:
        print(f"Error getting API key: {e}")
        return None