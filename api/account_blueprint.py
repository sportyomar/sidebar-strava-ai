# account_blueprint.py

from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from registry import get_account_management_db
import traceback
import secrets
import string
from cryptography.fernet import Fernet
import requests

account_bp = Blueprint('account', __name__, url_prefix='/api/account')


ENCRYPTION_KEY = os.getenv('API_KEY_ENCRYPTION_KEY')
if not ENCRYPTION_KEY:
    ENCRYPTION_KEY = Fernet.generate_key()
    print("Warning: Using generated encryption key. Set API_KEY_ENCRYPTION_KEY in production.")

cipher_suite = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)

def encrypt_api_key(api_key):
    """Encrypt an API key for secure storage."""
    return cipher_suite.encrypt(api_key.encode()).decode()

def decrypt_api_key(encrypted_key):
    """Decrypt an API key for use."""
    return cipher_suite.decrypt(encrypted_key.encode()).decode()


# In account_blueprint.py, update token_required with debugging
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        print(f"🔍 DEBUG: Route {request.endpoint}, Token received: {token}")

        if not token:
            print("🔥 DEBUG: No Authorization header found")
            print(f"🔍 DEBUG: All headers: {dict(request.headers)}")
            return jsonify({'message': 'Token is missing'}), 401

        try:
            if token.startswith('Bearer '):
                token = token[7:]
            data = jwt.decode(token, os.getenv('JWT_SECRET', 'your-secret-key'), algorithms=['HS256'])
            current_user_id = data['user_id']
            print(f"🔍 DEBUG: Successfully decoded user_id: {current_user_id}")
        except Exception as e:
            print(f"🔥 DEBUG: JWT decode failed: {e}")
            return jsonify({'message': 'Token is invalid'}), 401

        return f(current_user_id, *args, **kwargs)

    return decorated


def get_db_connection():
    db_config = get_account_management_db()
    return psycopg2.connect(
        host=db_config['host'],
        port=db_config['port'],
        database=db_config['database_name'],
        user=db_config['username'],
        password=db_config['password'],
        cursor_factory=RealDictCursor
    )


# Organization Management
@account_bp.route('/organization', methods=['GET'])
@token_required
def get_organization(current_user_id):
    """Get organization details for current user"""
    print(f"🔍 DEBUG: get_organization called with user_id: {current_user_id}")

    try:
        print("🔍 DEBUG: Attempting to get DB connection...")
        conn = get_db_connection()
        print("🔍 DEBUG: DB connection successful")

        cursor = conn.cursor()
        print(f"🔍 DEBUG: Executing query for user_id: {current_user_id}")

        # Get user's organization
        cursor.execute("""
            SELECT o.*, om.role as user_role
            FROM organizations o
            JOIN organization_members om ON o.id = om.organization_id
            WHERE om.user_id = %s
        """, (current_user_id,))

        org = cursor.fetchone()
        print(f"🔍 DEBUG: Query result: {org}")

        if not org:
            print("🔍 DEBUG: No organization found for user")
            return jsonify({'error': 'No organization found'}), 404

        print(f"🔍 DEBUG: Returning organization: {dict(org)}")
        return jsonify(dict(org))

    except Exception as e:
        print(f"🔥 ERROR in get_organization: {str(e)}")
        print(f"🔥 ERROR traceback: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()
            print("🔍 DEBUG: DB connection closed")


@account_bp.route('/organization', methods=['PUT'])
@token_required
def update_organization(current_user_id):
    """Update organization settings"""
    try:
        data = request.get_json()
        conn = get_db_connection()
        cursor = conn.cursor()

        # Verify user has admin access
        cursor.execute("""
            SELECT om.role
            FROM organization_members om
            WHERE om.user_id = %s AND om.role IN ('admin', 'owner')
        """, (current_user_id,))

        if not cursor.fetchone():
            return jsonify({'error': 'Insufficient permissions'}), 403

        # Update organization
        cursor.execute("""
            UPDATE organizations 
            SET name = %s, billing_email = %s, updated_at = NOW()
            WHERE id = (
                SELECT organization_id FROM organization_members WHERE user_id = %s
            )
            RETURNING *
        """, (data.get('name'), data.get('billing_email'), current_user_id))

        updated_org = cursor.fetchone()
        conn.commit()

        return jsonify(dict(updated_org))

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


# Workspace Management
@account_bp.route('/workspaces', methods=['GET'])
@token_required
def get_workspaces(current_user_id):
    """Get all workspaces for user's organization"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT w.*, COUNT(p.id) as project_count
            FROM workspaces w
            LEFT JOIN projects p ON w.id = p.workspace_id
            WHERE w.organization_id = (
                SELECT organization_id FROM organization_members WHERE user_id = %s
            )
            GROUP BY w.id
            ORDER BY w.created_at DESC
        """, (current_user_id,))

        workspaces = cursor.fetchall()
        return jsonify([dict(ws) for ws in workspaces])

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@account_bp.route('/workspaces', methods=['POST'])
@token_required
def create_workspace(current_user_id):
    """Create new workspace"""
    try:
        data = request.get_json()
        conn = get_db_connection()
        cursor = conn.cursor()

        # Get user's organization
        cursor.execute("""
            SELECT organization_id FROM organization_members WHERE user_id = %s
        """, (current_user_id,))

        org = cursor.fetchone()
        if not org:
            return jsonify({'error': 'No organization found'}), 404

        # Create workspace
        cursor.execute("""
            INSERT INTO workspaces (name, description, organization_id, created_by)
            VALUES (%s, %s, %s, %s)
            RETURNING *
        """, (data.get('name'), data.get('description'), org['organization_id'], current_user_id))

        workspace = cursor.fetchone()
        conn.commit()

        return jsonify(dict(workspace)), 201

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@account_bp.route('/workspaces/<int:workspace_id>', methods=['PUT'])
@token_required
def update_workspace(current_user_id, workspace_id):
    """Update workspace"""
    try:
        data = request.get_json()
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE workspaces 
            SET name = %s, description = %s, updated_at = NOW()
            WHERE id = %s 
            AND organization_id = (
                SELECT organization_id FROM organization_members WHERE user_id = %s
            )
            RETURNING *
        """, (data.get('name'), data.get('description'), workspace_id, current_user_id))

        workspace = cursor.fetchone()
        if not workspace:
            return jsonify({'error': 'Workspace not found'}), 404

        conn.commit()
        return jsonify(dict(workspace))

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@account_bp.route('/workspaces/<int:workspace_id>', methods=['DELETE'])
@token_required
def delete_workspace(current_user_id, workspace_id):
    """Delete workspace"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if workspace has projects
        cursor.execute("""
            SELECT COUNT(*) as project_count
            FROM projects 
            WHERE workspace_id = %s
        """, (workspace_id,))

        result = cursor.fetchone()
        if result['project_count'] > 0:
            return jsonify({'error': 'Cannot delete workspace with existing projects'}), 400

        cursor.execute("""
            DELETE FROM workspaces 
            WHERE id = %s 
            AND organization_id = (
                SELECT organization_id FROM organization_members WHERE user_id = %s
            )
        """, (workspace_id, current_user_id))

        if cursor.rowcount == 0:
            return jsonify({'error': 'Workspace not found'}), 404

        conn.commit()
        return jsonify({'message': 'Workspace deleted successfully'})

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


# Workspace APIs & Services
@account_bp.route('/workspaces/<int:workspace_id>/apis', methods=['GET'])
@token_required
def get_workspace_apis(current_user_id, workspace_id):
    """Get enabled APIs for workspace"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT wa.*, am.name, am.description, am.category
            FROM workspace_apis wa
            JOIN api_modules am ON wa.api_module_id = am.id
            WHERE wa.workspace_id = %s
            ORDER BY am.category, am.name
        """, (workspace_id,))

        apis = cursor.fetchall()
        return jsonify([dict(api) for api in apis])

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@account_bp.route('/workspaces/<int:workspace_id>/apis/<int:api_id>', methods=['POST'])
@token_required
def enable_workspace_api(current_user_id, workspace_id, api_id):
    """Enable API for workspace"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO workspace_apis (workspace_id, api_module_id, enabled_by)
            VALUES (%s, %s, %s)
            ON CONFLICT (workspace_id, api_module_id) DO NOTHING
            RETURNING *
        """, (workspace_id, api_id, current_user_id))

        result = cursor.fetchone()
        conn.commit()

        return jsonify({'message': 'API enabled for workspace'})

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@account_bp.route('/workspaces/<int:workspace_id>/apis/<int:api_id>', methods=['DELETE'])
@token_required
def disable_workspace_api(current_user_id, workspace_id, api_id):
    """Disable API for workspace"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            DELETE FROM workspace_apis 
            WHERE workspace_id = %s AND api_module_id = %s
        """, (workspace_id, api_id))

        conn.commit()
        return jsonify({'message': 'API disabled for workspace'})

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


# Team Management
@account_bp.route('/team', methods=['GET'])
@token_required
def get_team_members(current_user_id):
    """Get organization team members"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT u.id, u.username, u.email, u.display_name, om.role, om.joined_at
            FROM users u
            JOIN organization_members om ON u.id = om.user_id
            WHERE om.organization_id = (
                SELECT organization_id FROM organization_members WHERE user_id = %s
            )
            ORDER BY om.role, u.display_name
        """, (current_user_id,))

        members = cursor.fetchall()
        return jsonify([dict(member) for member in members])

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


# Projects within Workspace
@account_bp.route('/workspaces/<int:workspace_id>/projects', methods=['GET'])
@token_required
def get_workspace_projects(current_user_id, workspace_id):
    """Get projects within a workspace"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT p.*, u.display_name as created_by_name
            FROM projects p
            LEFT JOIN users u ON p.created_by = u.id
            WHERE p.workspace_id = %s
            ORDER BY p.created_at DESC
        """, (workspace_id,))

        projects = cursor.fetchall()
        return jsonify([dict(project) for project in projects])

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


# Analytics Dashboard
@account_bp.route('/workspaces/<int:workspace_id>/analytics', methods=['GET'])
@token_required
def get_workspace_analytics(current_user_id, workspace_id):
    """Get workspace analytics dashboard data"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Get project count, API usage, team size, etc.
        cursor.execute("""
            SELECT 
                COUNT(DISTINCT p.id) as project_count,
                COUNT(DISTINCT wa.api_module_id) as enabled_apis,
                COUNT(DISTINCT wm.user_id) as team_size
            FROM workspaces w
            LEFT JOIN projects p ON w.id = p.workspace_id
            LEFT JOIN workspace_apis wa ON w.id = wa.workspace_id
            LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
            WHERE w.id = %s
        """, (workspace_id,))

        analytics = cursor.fetchone()
        return jsonify(dict(analytics))

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()

# Workspace LLMs Management
@account_bp.route('/workspaces/<int:workspace_id>/llms', methods=['GET'])
@token_required
def get_workspace_llms(current_user_id, workspace_id):
    """Get enabled LLMs for workspace"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT wl.model_id, wl.enabled_by, wl.enabled_at, u.display_name as enabled_by_name
            FROM workspace_llms wl
            LEFT JOIN users u ON wl.enabled_by = u.id
            WHERE wl.workspace_id = %s
            ORDER BY wl.enabled_at DESC
        """, (workspace_id,))

        llms = cursor.fetchall()
        return jsonify([dict(llm) for llm in llms])

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@account_bp.route('/workspaces/<int:workspace_id>/llms/<model_id>', methods=['POST'])
@token_required
def enable_workspace_llm(current_user_id, workspace_id, model_id):
    """Enable LLM for workspace"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Verify user has access to this workspace
        cursor.execute("""
            SELECT w.id FROM workspaces w
            WHERE w.id = %s 
            AND w.organization_id = (
                SELECT organization_id FROM organization_members WHERE user_id = %s
            )
        """, (workspace_id, current_user_id))

        if not cursor.fetchone():
            return jsonify({'error': 'Workspace not found or access denied'}), 404

        # Enable the model for workspace
        cursor.execute("""
            INSERT INTO workspace_llms (workspace_id, model_id, enabled_by)
            VALUES (%s, %s, %s)
            ON CONFLICT (workspace_id, model_id) DO NOTHING
            RETURNING *
        """, (workspace_id, model_id, current_user_id))

        result = cursor.fetchone()
        conn.commit()

        return jsonify({'message': 'LLM enabled for workspace', 'model_id': model_id})

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@account_bp.route('/workspaces/<int:workspace_id>/llms/<model_id>', methods=['DELETE'])
@token_required
def disable_workspace_llm(current_user_id, workspace_id, model_id):
    """Disable LLM for workspace"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Verify user has access to this workspace
        cursor.execute("""
            SELECT w.id FROM workspaces w
            WHERE w.id = %s 
            AND w.organization_id = (
                SELECT organization_id FROM organization_members WHERE user_id = %s
            )
        """, (workspace_id, current_user_id))

        if not cursor.fetchone():
            return jsonify({'error': 'Workspace not found or access denied'}), 404

        # Disable the model for workspace
        cursor.execute("""
            DELETE FROM workspace_llms 
            WHERE workspace_id = %s AND model_id = %s
        """, (workspace_id, model_id))

        conn.commit()
        return jsonify({'message': 'LLM disabled for workspace', 'model_id': model_id})

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@account_bp.route('/modules/available', methods=['GET'])
@token_required
def get_available_modules(current_user_id):
    """Return all available API modules."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, name, description, category, endpoints, quota_limit
            FROM api_modules
            ORDER BY category, name
        """)
        modules = cursor.fetchall()
        return jsonify([dict(m) for m in modules])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


# Workspace API Keys Management
import secrets
import string


# Add this helper function for generating API keys
def generate_api_key(length=32):
    """Generate a secure random API key"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


# Workspace API Keys Management
@account_bp.route('/workspaces/<int:workspace_id>/api-keys', methods=['GET'])
@token_required
def get_workspace_api_keys(current_user_id, workspace_id):
    """Get API keys for workspace"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Verify user has access to this workspace
        cursor.execute("""
            SELECT w.id FROM workspaces w
            WHERE w.id = %s 
            AND w.organization_id = (
                SELECT organization_id FROM organization_members WHERE user_id = %s
            )
        """, (workspace_id, current_user_id))

        if not cursor.fetchone():
            return jsonify({'error': 'Workspace not found or access denied'}), 404

        # Get workspace API keys
        cursor.execute("""
            SELECT wak.id, wak.name, wak.key_value as key, wak.created_at, wak.last_used_at,
                   u.display_name as created_by_name
            FROM workspace_api_keys wak
            LEFT JOIN users u ON wak.created_by = u.id
            WHERE wak.workspace_id = %s AND wak.is_active = true
            ORDER BY wak.created_at DESC
        """, (workspace_id,))

        api_keys = cursor.fetchall()
        return jsonify([dict(key) for key in api_keys])

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@account_bp.route('/workspaces/<int:workspace_id>/api-keys', methods=['POST'])
@token_required
def create_workspace_api_key(current_user_id, workspace_id):
    """Create new API key for workspace"""
    print(f"🔍 DEBUG: Creating API key for user_id: {current_user_id}, workspace_id: {workspace_id}")

    try:
        data = request.get_json()
        name = data.get('name')
        print(f"🔍 DEBUG: API key name: {name}")

        if not name:
            return jsonify({'error': 'API key name is required'}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # First, let's check if this user exists in organization_members
        cursor.execute("""
           SELECT om.user_id, om.organization_id 
           FROM organization_members om 
           WHERE om.user_id = %s
       """, (current_user_id,))

        user_org = cursor.fetchone()
        print(f"🔍 DEBUG: User organization: {user_org}")

        if not user_org:
            print(f"🔥 ERROR: User {current_user_id} not found in organization_members")
            return jsonify({'error': 'User not found in any organization'}), 404

        # Check if workspace exists and belongs to user's organization
        cursor.execute("""
           SELECT w.id, w.name, w.organization_id FROM workspaces w
           WHERE w.id = %s 
           AND w.organization_id = %s
       """, (workspace_id, user_org['organization_id']))

        workspace = cursor.fetchone()
        print(f"🔍 DEBUG: Workspace: {workspace}")

        if not workspace:
            print(f"🔥 ERROR: Workspace {workspace_id} not found or access denied")
            return jsonify({'error': 'Workspace not found or access denied'}), 404

        # Check if user exists in users table
        cursor.execute("SELECT id, username FROM users WHERE id = %s", (current_user_id,))
        user = cursor.fetchone()
        print(f"🔍 DEBUG: User in users table: {user}")

        if not user:
            print(f"🔥 ERROR: User {current_user_id} not found in users table")
            return jsonify({'error': 'User not found in users table'}), 404

        # Generate unique API key
        api_key = f"wsk_{generate_api_key()}"
        print(f"🔍 DEBUG: Generated API key: {api_key[:12]}...")

        # Insert new API key
        cursor.execute("""
           INSERT INTO workspace_api_keys (workspace_id, name, key_value, created_by)
           VALUES (%s, %s, %s, %s)
           RETURNING id, name, key_value as key, created_at
       """, (workspace_id, name, api_key, current_user_id))

        new_key = cursor.fetchone()
        print(f"🔍 DEBUG: Created API key: {dict(new_key)}")
        conn.commit()

        return jsonify(dict(new_key)), 201

    except Exception as e:
        print(f"🔥 ERROR in create_workspace_api_key: {str(e)}")
        print(f"🔥 ERROR traceback: {traceback.format_exc()}")
        if 'conn' in locals():
            conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()


@account_bp.route('/workspaces/<int:workspace_id>/api-keys/<int:key_id>', methods=['DELETE'])
@token_required
def delete_workspace_api_key(current_user_id, workspace_id, key_id):
    """Delete workspace API key"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Verify user has access to this workspace
        cursor.execute("""
            SELECT w.id FROM workspaces w
            WHERE w.id = %s 
            AND w.organization_id = (
                SELECT organization_id FROM organization_members WHERE user_id = %s
            )
        """, (workspace_id, current_user_id))

        if not cursor.fetchone():
            return jsonify({'error': 'Workspace not found or access denied'}), 404

        # Soft delete the API key (set is_active = false)
        cursor.execute("""
            UPDATE workspace_api_keys 
            SET is_active = false, updated_at = NOW()
            WHERE id = %s AND workspace_id = %s
        """, (key_id, workspace_id))

        if cursor.rowcount == 0:
            return jsonify({'error': 'API key not found'}), 404

        conn.commit()
        return jsonify({'message': 'API key deleted successfully'})

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@account_bp.route('/workspaces/<int:workspace_id>/provider-credentials', methods=['GET'])
@token_required
def get_workspace_provider_credentials(current_user_id, workspace_id):
    """Get all provider credentials for workspace"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Verify workspace access
        cursor.execute("""
            SELECT w.id FROM workspaces w
            WHERE w.id = %s 
            AND w.organization_id = (
                SELECT organization_id FROM organization_members WHERE user_id = %s
            )
        """, (workspace_id, current_user_id))

        if not cursor.fetchone():
            return jsonify({'error': 'Workspace not found or access denied'}), 404

        # Get provider credentials
        cursor.execute("""
            SELECT provider, endpoint_url, api_version, organization_id, 
                   deployment_names, last_tested_at, last_test_status, 
                   test_error_message, created_at, updated_at
            FROM provider_credentials 
            WHERE workspace_id = %s
            ORDER BY provider
        """, (workspace_id,))

        credentials = cursor.fetchall()

        # Format response to match frontend expectations
        result = {}
        for cred in credentials:
            result[cred['provider']] = {
                'status': cred['last_test_status'],
                'endpoint': cred['endpoint_url'],
                'apiVersion': cred['api_version'],
                'orgId': cred['organization_id'],
                'deployments': cred['deployment_names'],
                'lastTested': cred['last_tested_at'].isoformat() if cred['last_tested_at'] else None,
                'errorMessage': cred['test_error_message'],
                'hasKey': True
            }

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@account_bp.route('/workspaces/<int:workspace_id>/provider-credentials/<provider>', methods=['POST'])
@token_required
def save_workspace_provider_credential(current_user_id, workspace_id, provider):
    """Save or update provider credential for workspace"""
    conn = None
    cursor = None
    try:
        data = request.get_json()
        print(f"🔍 SAVE DEBUG: Provider={provider}, workspace_id={workspace_id}")
        print(f"🔍 SAVE DEBUG: Received data={data}")

        conn = get_db_connection()
        cursor = conn.cursor()

        # Verify workspace access
        cursor.execute("""
            SELECT w.id FROM workspaces w
            WHERE w.id = %s 
            AND w.organization_id = (
                SELECT organization_id FROM organization_members WHERE user_id = %s
            )
        """, (workspace_id, current_user_id))

        if not cursor.fetchone():
            print("🔥 SAVE ERROR: Workspace access denied")
            return jsonify({'error': 'Workspace not found or access denied'}), 404

        # Extract provider-specific fields
        if provider == "google":
            print("🔍 SAVE DEBUG: Processing Google provider")
            # For Google, we store:
            # - serviceAccountJson in api_key_encrypted (encrypted)
            # - projectId in organization_id field
            # - region in deployment_names field
            service_account_json = data.get('serviceAccountJson')
            project_id = data.get('projectId')
            region = data.get('region', 'us-central1')

            print(
                f"🔍 SAVE DEBUG: service_account_json length={len(service_account_json) if service_account_json else 0}")
            print(f"🔍 SAVE DEBUG: project_id={project_id}")
            print(f"🔍 SAVE DEBUG: region={region}")

            api_key = service_account_json  # This will be encrypted as api_key
            organization_id = project_id  # Store project_id in organization_id field
            endpoint_url = None
            api_version = None
            deployment_names = region  # Store region in deployment_names field

        else:
            print(f"🔍 SAVE DEBUG: Processing {provider} provider")
            # For other providers
            api_key = data.get('apiKey')
            endpoint_url = data.get('endpoint')
            api_version = data.get('apiVersion')
            organization_id = data.get('orgId')
            deployment_names = data.get('deployments')

        print(f"🔍 SAVE DEBUG: Final values - api_key exists={bool(api_key)}, org_id={organization_id}")

        # Build UPDATE dynamically so we don't overwrite the key if it's not sent
        sets = []
        params = []

        if endpoint_url is not None:
            sets.append("endpoint_url = %s")
            params.append(endpoint_url)
        if api_version is not None:
            sets.append("api_version = %s")
            params.append(api_version)
        if organization_id is not None:
            sets.append("organization_id = %s")
            params.append(organization_id)
        if deployment_names is not None:
            sets.append("deployment_names = %s")
            params.append(deployment_names)
        if api_key:  # only update when a new key is provided
            sets.append("api_key_encrypted = %s")
            params.append(encrypt_api_key(api_key))

        print(f"🔍 SAVE DEBUG: Sets to update: {sets}")

        if sets:
            # Try UPDATE first
            sql = f"UPDATE provider_credentials SET {', '.join(sets)}, last_test_status = 'unknown', updated_at = NOW() WHERE user_id = %s AND workspace_id = %s AND provider = %s"
            params.extend([current_user_id, workspace_id, provider])
            print(f"🔍 SAVE DEBUG: Executing UPDATE SQL: {sql}")
            print(f"🔍 SAVE DEBUG: With params: {params}")
            cursor.execute(sql, params)

            if cursor.rowcount == 0:
                print("🔍 SAVE DEBUG: No rows updated, inserting new record")
                # If no rows updated, INSERT new record
                if not api_key:
                    print("🔥 SAVE ERROR: API key is required for new credential")
                    return jsonify({'error': 'API key is required for new credential'}), 400

                cursor.execute("""
                    INSERT INTO provider_credentials 
                        (user_id, workspace_id, provider, api_key_encrypted, endpoint_url, 
                         api_version, organization_id, deployment_names, last_test_status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'unknown')
                """, (current_user_id, workspace_id, provider, encrypt_api_key(api_key),
                      endpoint_url, api_version, organization_id, deployment_names))
                print("🔍 SAVE DEBUG: INSERT executed successfully")
            else:
                print(f"🔍 SAVE DEBUG: UPDATE successful, {cursor.rowcount} rows affected")

        conn.commit()
        print("🔍 SAVE DEBUG: Transaction committed successfully")
        return jsonify({'message': f'{provider} API key saved successfully'})

    except Exception as e:
        print(f"🔥 SAVE ERROR: Exception occurred: {str(e)}")
        print(f"🔥 SAVE ERROR: Traceback: {traceback.format_exc()}")
        if conn:
            conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@account_bp.route('/workspaces/<int:workspace_id>/provider-credentials/<provider>/test', methods=['POST'])
@token_required
def test_workspace_provider_credential(current_user_id, workspace_id, provider):
    """Test provider credential connection for workspace"""
    print(f"🔍 TESTING PROVIDER: {provider} for workspace {workspace_id}")
    import requests
    import json

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Verify workspace access
        cursor.execute("""
           SELECT w.id FROM workspaces w
           WHERE w.id = %s 
           AND w.organization_id = (
               SELECT organization_id FROM organization_members WHERE user_id = %s
           )
       """, (workspace_id, current_user_id))

        if not cursor.fetchone():
            return jsonify({'error': 'Workspace not found or access denied'}), 404

        # Get the encrypted API key
        cursor.execute("""
           SELECT api_key_encrypted, endpoint_url, api_version, organization_id, deployment_names
           FROM provider_credentials 
           WHERE workspace_id = %s AND provider = %s
       """, (workspace_id, provider))

        key_data = cursor.fetchone()
        if not key_data:
            return jsonify({'error': 'API key not found'}), 404

        # Decrypt the API key
        api_key = decrypt_api_key(key_data['api_key_encrypted'])

        # Update status to testing
        cursor.execute("""
           UPDATE provider_credentials 
           SET last_test_status = 'testing', last_tested_at = NOW()
           WHERE workspace_id = %s AND provider = %s
       """, (workspace_id, provider))
        conn.commit()

        # Test the connection based on provider
        success = False
        error_message = None

        try:
            if provider == 'openai':
                response = requests.get(
                    'https://api.openai.com/v1/models',
                    headers={'Authorization': f'Bearer {api_key}'},
                    timeout=10
                )
                success = response.status_code == 200
                if not success:
                    error_message = f"HTTP {response.status_code}: {response.text[:200]}"

            elif provider == 'anthropic':
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
                success = response.status_code in [200, 400]
                if not success:
                    error_message = f"HTTP {response.status_code}: {response.text[:200]}"

            elif provider == 'azureopenai':
                endpoint = (key_data['endpoint_url'] or '').rstrip('/')
                api_version = key_data['api_version'] or '2023-05-15'
                headers = {'api-key': api_key}
                success = False
                error_message = None

                if not endpoint:
                    success = False
                    error_message = "Azure endpoint URL is required"
                else:
                    # 1) Basic service/key sanity check
                    for url in [
                        f"{endpoint}/openai/models?api-version={api_version}",
                        f"{endpoint}/openai/deployments?api-version={api_version}",
                    ]:
                        try:
                            r = requests.get(url, headers=headers, timeout=10)
                            if r.status_code == 200:
                                success = True
                                break
                        except Exception as exc:
                            error_message = str(exc)

                    if not success:
                        if 'r' in locals():
                            error_message = f"HTTP {r.status_code}: {r.text[:200]}"
                        else:
                            error_message = error_message or "Azure validation failed"
                    else:
                        # 2) If user specified a deployment, actually probe it
                        declared = (key_data.get('deployment_names') or '').split(',')
                        declared = [d.strip() for d in declared if d.strip()]

                        if declared:
                            probe_dep = declared[0]
                            probe_url = (
                                f"{endpoint}/openai/deployments/{probe_dep}/chat/completions"
                                f"?api-version={api_version}"
                            )
                            try:
                                probe_body = {
                                    "messages": [{"role": "user", "content": "ping"}],
                                    "max_tokens": 1,
                                    "temperature": 0
                                }
                                pr = requests.post(
                                    probe_url,
                                    headers={**headers, "content-type": "application/json"},
                                    json=probe_body,
                                    timeout=10,
                                )
                                # 200 = OK, 400 often means quota/format but confirms deployment exists
                                if pr.status_code in (200, 400):
                                    success = True
                                    error_message = None
                                elif pr.status_code == 404:
                                    success = False
                                    error_message = (
                                        f"Deployment not found: '{probe_dep}'. "
                                        f"Check the exact deployment name in Azure."
                                    )
                                else:
                                    success = False
                                    error_message = f"HTTP {pr.status_code}: {pr.text[:200]}"
                            except Exception as exc:
                                success = False
                                error_message = str(exc)

            elif provider == "google":
                print(f"=== Testing Google provider for workspace {workspace_id} ===")
                print(f"Retrieved key_data: {key_data}")

                try:
                    import json
                    import requests
                    from datetime import datetime
                    from google.oauth2 import service_account
                    from google.auth.transport.requests import Request

                    # For Google, the service account JSON is stored in api_key_encrypted
                    # and other fields are stored separately
                    service_account_json = decrypt_api_key(key_data['api_key_encrypted'])
                    project_id = key_data.get('organization_id')  # We store project_id in organization_id field
                    region = key_data.get('deployment_names') or 'us-central1'  # Get region from deployment_names field

                    print(f"Project ID: {project_id}")
                    print(f"Region: {region}")
                    print(f"Has service account JSON: {bool(service_account_json)}")
                    print(f"Service account JSON length: {len(service_account_json) if service_account_json else 0}")

                    if not service_account_json or not project_id:
                        success = False
                        error_message = "Service account JSON and Project ID are required"
                        print(
                            f"Missing required fields: service_account_json={bool(service_account_json)}, project_id={bool(project_id)}")
                    else:
                        try:
                            print("Parsing service account JSON...")
                            print(f"Raw JSON (first 100 chars): {service_account_json[:100]}")
                            print(f"Raw JSON (last 100 chars): {service_account_json[-100:]}")

                            # Clean the JSON string
                            cleaned_json = service_account_json.strip()

                            # Remove any trailing commas or extra content after the last }
                            if cleaned_json.endswith('}\n}') or cleaned_json.count('}') > cleaned_json.count('{'):
                                # Find the last complete JSON object
                                brace_count = 0
                                last_valid_pos = 0
                                for i, char in enumerate(cleaned_json):
                                    if char == '{':
                                        brace_count += 1
                                    elif char == '}':
                                        brace_count -= 1
                                        if brace_count == 0:
                                            last_valid_pos = i + 1
                                            break
                                cleaned_json = cleaned_json[:last_valid_pos]

                            print(f"Cleaned JSON length: {len(cleaned_json)}")
                            print(f"Cleaned JSON ends with: {cleaned_json[-20:]}")

                            service_account_info = json.loads(cleaned_json)
                            print("Service account JSON parsed successfully")
                            print(f"Service account email: {service_account_info.get('client_email', 'Not found')}")
                            print(f"Project ID from JSON: {service_account_info.get('project_id', 'Not found')}")
                        except json.JSONDecodeError as e:
                            success = False
                            error_message = f"Invalid service account JSON: {e}"
                            print(f"JSON decode error: {e}")
                            print(f"Error position: {e.pos}")
                            print(
                                f"JSON around error position: {repr(service_account_json[max(0, e.pos - 50):e.pos + 50])}")
                        else:
                            try:
                                print("Creating Google credentials...")
                                # Build Google credentials
                                credentials = service_account.Credentials.from_service_account_info(
                                    service_account_info,
                                    scopes=["https://www.googleapis.com/auth/cloud-platform"],
                                )
                                print("Google credentials created successfully")

                                print("Refreshing credentials...")
                                credentials.refresh(Request())
                                print("Credentials refreshed successfully")

                                # Test Vertex AI API call - use a simpler endpoint that definitely exists
                                url = f"https://{region}-aiplatform.googleapis.com/v1/projects/{project_id}/locations/{region}/endpoints"
                                print(f"Making request to: {url}")

                                headers = {
                                    "Authorization": f"Bearer {credentials.token}",
                                    "Content-Type": "application/json",
                                }
                                print("Making API request...")

                                response = requests.get(url, headers=headers, timeout=10)
                                print(f"API response status: {response.status_code}")
                                print(f"API response headers: {dict(response.headers)}")

                                if response.status_code == 200:
                                    success = True
                                    error_message = None
                                    print("✅ Google Vertex AI test successful!")
                                else:
                                    success = False
                                    error_message = f"HTTP {response.status_code}: {response.text[:200]}"
                                    print(f"❌ API request failed: {response.status_code}")
                                    print(f"Response text: {response.text[:500]}")

                            except Exception as cred_error:
                                success = False
                                error_message = f"Credential error: {str(cred_error)}"
                                print(f"❌ Credential error: {cred_error}")

                except Exception as test_error:
                    success = False
                    error_message = f"Test error: {str(test_error)}"
                    print(f"❌ General test error: {test_error}")
                    import traceback
                    traceback.print_exc()

        except Exception as test_error:
            success = False
            error_message = str(test_error)

        # Update the test results
        status = 'connected' if success else 'failed'
        cursor.execute("""
           UPDATE provider_credentials 
           SET last_test_status = %s, last_tested_at = NOW(), test_error_message = %s
           WHERE workspace_id = %s AND provider = %s
       """, (status, error_message, workspace_id, provider))
        conn.commit()

        return jsonify({
            'success': success,
            'status': status,
            'message': 'Connected successfully' if success else error_message
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


@account_bp.route('/workspaces/<int:workspace_id>/provider-credentials/<provider>', methods=['DELETE'])
@token_required
def delete_workspace_provider_credential(current_user_id, workspace_id, provider):
    """Delete provider credential for workspace"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Verify workspace access
        cursor.execute("""
            SELECT w.id FROM workspaces w
            WHERE w.id = %s 
            AND w.organization_id = (
                SELECT organization_id FROM organization_members WHERE user_id = %s
            )
        """, (workspace_id, current_user_id))

        if not cursor.fetchone():
            return jsonify({'error': 'Workspace not found or access denied'}), 404

        cursor.execute("""
            DELETE FROM provider_credentials 
            WHERE workspace_id = %s AND provider = %s
        """, (workspace_id, provider))

        if cursor.rowcount == 0:
            return jsonify({'error': 'Provider credential not found'}), 404

        conn.commit()
        return jsonify({'message': f'{provider} credential deleted successfully'})

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


def get_workspace_provider_credential(workspace_id, provider):
    """Helper function to get decrypted API key for internal use."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT api_key_encrypted, endpoint_url, api_version, 
                   organization_id, deployment_names, last_test_status
            FROM provider_credentials 
            WHERE workspace_id = %s AND provider = %s AND last_test_status = 'connected'
        """, (workspace_id, provider))

        result = cursor.fetchone()

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
        print(f"Error getting provider credential: {e}")
        return None
    finally:
        if conn:
            conn.close()