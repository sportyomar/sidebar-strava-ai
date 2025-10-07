# llm_blueprint.py
from account_blueprint import get_workspace_provider_credential
from flask import Blueprint, request, jsonify
from chat_history import build_context
from account_blueprint import token_required
from functools import wraps
import jwt
import os
import psycopg2
from psycopg2.extras import RealDictCursor, Json
from registry import get_account_management_db
import traceback
import requests
import time
from decimal import Decimal
from datetime import datetime
import json

llm_bp = Blueprint('llms', __name__, url_prefix='/api/workspaces')

# Model registry for provider detection and capabilities
MODEL_REGISTRY = {
}


def get_model_info(model_id: str, workspace_id: int = None):
    """Get model information from registry or dynamic models"""
    # First check static registry
    static_info = MODEL_REGISTRY.get(model_id)
    if static_info:
        return static_info

    # If not found and we have workspace_id, check all dynamic models
    if workspace_id:
        try:
            from account_blueprint import get_workspace_provider_credential

            # Check OpenAI
            openai_creds = get_workspace_provider_credential(workspace_id, 'openai')
            if openai_creds:
                dynamic_models = fetch_available_openai_models(openai_creds)
                if model_id in dynamic_models:
                    return dynamic_models[model_id]

            # Check Anthropic
            anthropic_creds = get_workspace_provider_credential(workspace_id, 'anthropic')
            if anthropic_creds:
                dynamic_models = fetch_available_anthropic_models(anthropic_creds)
                if model_id in dynamic_models:
                    return dynamic_models[model_id]

            # Check Azure OpenAI
            azure_creds = get_workspace_provider_credential(workspace_id, 'azureopenai')
            if azure_creds:
                dynamic_models = fetch_available_azure_openai_models(azure_creds)
                if model_id in dynamic_models:
                    return dynamic_models[model_id]

            google_creds = get_workspace_provider_credential(workspace_id, 'google')
            if google_creds:
                dynamic_models = fetch_available_google_vertex_models(google_creds)
                if model_id in dynamic_models:
                    return dynamic_models[model_id]

        except Exception:
            pass

    return None




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


def verify_workspace_access(user_id, workspace_id) -> bool:
    """Verify user has direct membership to workspace"""
    conn = get_db_connection()
    try:
        with conn, conn.cursor() as cur:
            cur.execute("""
                SELECT 1 FROM workspace_members
                WHERE workspace_id = %s AND user_id = %s
                LIMIT 1
            """, (workspace_id, user_id))
            return cur.fetchone() is not None
    except Exception as e:
        print(f"Error verifying workspace access: {e}")
        return False
    finally:
        conn.close()


def has_workspace_role(user_id: str, workspace_id: int, allowed_roles: list[str]) -> bool:
    """Check if user has required role in workspace"""
    conn = get_db_connection()
    try:
        with conn, conn.cursor() as cur:
            cur.execute("""
                SELECT 1
                FROM workspace_members wm
                WHERE wm.workspace_id = %s
                  AND wm.user_id = %s
                  AND (wm.role = ANY(%s) OR 'ADMIN' = ANY(%s))
                LIMIT 1
            """, (workspace_id, user_id, allowed_roles, allowed_roles))
            return cur.fetchone() is not None
    except Exception as e:
        print(f"Error checking workspace role: {e}")
        return False
    finally:
        conn.close()


def require_role(*allowed_roles):
    """Decorator to require specific workspace roles"""

    def deco(f):
        @wraps(f)
        def inner(current_user_id, workspace_id, *args, **kwargs):
            if not verify_workspace_access(current_user_id, workspace_id):
                return jsonify({'error': 'Workspace not found or access denied'}), 404
            if not has_workspace_role(current_user_id, workspace_id, list(allowed_roles)):
                return jsonify({'error': 'Forbidden: insufficient role'}), 403
            return f(current_user_id, workspace_id, *args, **kwargs)

        return inner

    return deco


def get_system_defaults(model_id):
    """Get system default settings for a model"""
    print(f"🔍 get_system_defaults called with model_id: {model_id}")

    defaults = {
        'temperature': 0.7,
        'max_tokens': 1000,
        'system_prompt': '',
        'tool_choice': 'auto',
        'usage_limits': {},
        'cost_controls': {},
        'extra': {}
    }

    # Model-specific defaults from registry
    model_info = get_model_info(model_id)
    print(f"📊 model_info for {model_id}: {model_info}")

    if model_info:
        if model_info['provider'] == 'anthropic':
            cap_value = model_info.get('cap', 4000)
            print(f"🎯 Anthropic model - setting max_tokens to: {cap_value}")
            defaults['max_tokens'] = cap_value
        elif model_info['provider'] == 'openai':
            defaults['max_tokens'] = model_info.get('cap', 2000)
    else:
        print(f"❌ No model_info found for {model_id}")

    print(f"✅ Final defaults: {defaults}")
    return defaults


def compute_effective_config(workspace_id, model_id):
    """Compute effective config by merging system defaults with workspace settings"""
    conn = get_db_connection()
    try:
        with conn, conn.cursor() as cur:
            cur.execute("""
                SELECT temperature, max_tokens, system_prompt, tool_choice, 
                       usage_limits, cost_controls, extra, is_default, updated_at
                FROM workspace_llm_settings 
                WHERE workspace_id = %s AND model_id = %s
            """, (workspace_id, model_id))

            settings = cur.fetchone()

        # Start with system defaults
        effective = get_system_defaults(model_id)

        # Override with workspace settings if they exist
        if settings:
            for key in ['temperature', 'max_tokens', 'system_prompt', 'tool_choice', 'usage_limits', 'cost_controls',
                        'extra']:
                if settings.get(key) is not None:
                    effective[key] = settings[key]
            effective['is_default'] = settings.get('is_default', False)
            effective['updated_at'] = settings.get('updated_at')
        else:
            effective['is_default'] = False
            effective['updated_at'] = None

        # Clamp max_tokens to model cap
        model_info = get_model_info(model_id)
        if model_info and model_info.get('cap') and effective.get('max_tokens'):
            effective['max_tokens'] = min(effective['max_tokens'], model_info['cap'])

        return effective

    except Exception as e:
        print(f"Error computing effective config: {e}")
        return get_system_defaults(model_id)
    finally:
        conn.close()


def _jsonify_helper(obj):
    """Helper for JSON serialization of special types"""
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj


def parse_openai_error(exception):
    """Extract detailed error message from OpenAI exception"""
    try:
        resp = getattr(exception, "response", None)
        if resp is not None:
            try:
                error_data = resp.json()
                error_message = error_data.get("error", {}).get("message", "")
                error_type = error_data.get("error", {}).get("type", "")

                # Handle rate limits specifically
                if error_type == "requests" or "rate limit" in error_message.lower():
                    return f"OpenAI Rate Limit: {error_message}. Please wait and try again."

                if error_message:
                    return f"OpenAI API Error ({error_type}): {error_message}"
                else:
                    return f"OpenAI API Error: {resp.text}"
            except Exception:
                return f"OpenAI API Error: {resp.text}"
        return f"OpenAI Error: {str(exception)}"
    except Exception:
        return f"OpenAI Error: {str(exception)}"


import json
import time
import requests


def _is_reasoning_model(name: str) -> bool:
    """Check if model is a reasoning-capable model with restricted parameters"""
    n = name.lower()
    return n.startswith(("gpt-4.1", "gpt-4o", "gpt-5", "o1", "o3", "o4")) or "4.1" in n or "4o" in n


import json
import time
import requests


def _is_reasoning_model(name: str) -> bool:
    """Check if model is a reasoning-capable model with restricted parameters"""
    n = name.lower()
    return n.startswith(("gpt-4.1", "gpt-4o", "gpt-5", "o1", "o3", "o4")) or "4.1" in n or "4o" in n


# def call_model_provider(provider: str, model_id: str, prompt: str, effective_config: dict, creds: dict,
#                         messages: list | None = None):
#     """
#     Call the actual AI provider API
#     Returns (result_dict, raw_response_dict)
#     """
#     temperature = effective_config.get('temperature', 0.7)
#     max_tokens = effective_config.get('max_tokens', 512)
#     system_prompt = effective_config.get('system_prompt', '')
#
#     start_time = time.time()
#
#     if provider == 'openai':
#         try:
#             from openai import OpenAI
#             client = OpenAI(api_key=creds['api_key'])
#
#             # Get the provider model from registry
#             model_info = get_model_info(model_id)
#             provider_model = model_info.get('provider_model', model_id) if model_info else model_id
#
#             if messages is None or not isinstance(messages, list) or not messages:
#                 msgs = []
#                 if system_prompt:
#                     msgs.append({"role": "system", "content": system_prompt})
#                 msgs.append({"role": "user", "content": prompt})
#             else:
#                 msgs = messages
#
#             def _openai_chat(model):
#                 # Backwards-compatible parameter handling
#                 kwargs = {
#                     "model": model,
#                     "messages": msgs,
#                 }
#
#                 # Newer models: require max_completion_tokens, fixed temperature
#                 if _is_reasoning_model(model):
#                     kwargs["max_completion_tokens"] = max_tokens
#                     # Only allow default temperature (1.0) – skip if user sets custom
#                     if temperature == 1:
#                         kwargs["temperature"] = 1
#                 else:
#                     # Legacy models: use max_tokens and allow custom temperature
#                     kwargs["max_tokens"] = max_tokens
#                     kwargs["temperature"] = temperature
#
#                 return client.chat.completions.create(**kwargs)
#
#             fallback_note = ""
#             try:
#                 # Try the primary model
#                 resp = _openai_chat(provider_model)
#             except Exception as e:
#                 error_msg = parse_openai_error(e)
#
#                 # Check if it's a model not found error
#                 if ("model" in error_msg.lower() and "not found" in error_msg.lower()) or \
#                         ("does not exist" in error_msg.lower()) or \
#                         ("404" in str(e)):
#
#                     # Try fallback to gpt-4o
#                     try:
#                         resp = _openai_chat("gpt-4o")
#                         fallback_note = f" (fell back to gpt-4o; original '{provider_model}' not available)"
#                     except Exception as e2:
#                         # Try gpt-4o-mini as last resort
#                         try:
#                             resp = _openai_chat("gpt-4o-mini")
#                             fallback_note = f" (fell back to gpt-4o-mini; original '{provider_model}' not available)"
#                         except Exception:
#                             return {
#                                 'success': False,
#                                 'latency_ms': int((time.time() - start_time) * 1000),
#                                 'text': '',
#                                 'usage': {},
#                                 'provider_error': f"All models failed - Original: {error_msg}"
#                             }
#                 else:
#                     return {
#                         'success': False,
#                         'latency_ms': int((time.time() - start_time) * 1000),
#                         'text': '',
#                         'usage': {},
#                         'provider_error': error_msg
#                     }
#
#             latency_ms = int((time.time() - start_time) * 1000)
#
#             # Check for temperature note
#             temp_note = ""
#             if _is_reasoning_model(provider_model) and temperature != 1:
#                 temp_note = " (temperature fixed to 1 for this model)"
#
#             # Safely extract text content
#             text = ""
#             try:
#                 text = resp.choices[0].message.content or ""
#             except Exception:
#                 text = getattr(resp, "content", "") or str(resp)
#
#             # Add fallback note to response if we used a fallback
#             if fallback_note:
#                 text += fallback_note
#
#             # Add temperature note if applicable
#             if temp_note:
#                 text += temp_note
#
#             usage = {}
#             if getattr(resp, "usage", None):
#                 u = resp.usage
#                 usage = {
#                     "prompt_tokens": getattr(u, "prompt_tokens", getattr(u, "input_tokens", 0)),
#                     "completion_tokens": getattr(u, "completion_tokens", getattr(u, "output_tokens", 0)),
#                     "total_tokens": getattr(u, "total_tokens",
#                                             getattr(u, "input_tokens", 0) + getattr(u, "output_tokens", 0)),
#                 }
#
#             return {
#                 'success': True,
#                 'latency_ms': latency_ms,
#                 'text': text,
#                 'usage': usage,
#                 'provider_error': None
#             }
#
#         except Exception as e:
#             return {
#                 'success': False,
#                 'latency_ms': int((time.time() - start_time) * 1000),
#                 'text': '',
#                 'usage': {},
#                 'provider_error': parse_openai_error(e)
#             }
#
#     elif provider == 'anthropic':
#         try:
#             import anthropic
#             client = anthropic.Anthropic(api_key=creds['api_key'])
#
#             model_info = get_model_info(model_id)
#             provider_model = model_info.get('provider_model', model_id) if model_info else model_id
#
#             kwargs = {
#                 'model': provider_model,
#                 'temperature': temperature,
#                 'max_tokens': max_tokens,
#                 'messages': [{"role": "user", "content": prompt}]
#             }
#
#             if system_prompt:
#                 kwargs['system'] = system_prompt
#
#             msg = client.messages.create(**kwargs)
#
#             latency_ms = int((time.time() - start_time) * 1000)
#
#             # Extract text from content blocks
#             text_parts = []
#             for block in msg.content:
#                 if hasattr(block, 'text'):
#                     text_parts.append(block.text)
#                 elif isinstance(block, dict) and block.get('type') == 'text':
#                     text_parts.append(block.get('text', ''))
#
#             text = ''.join(text_parts)
#
#             usage = {
#                 'prompt_tokens': msg.usage.input_tokens if msg.usage else 0,
#                 'completion_tokens': msg.usage.output_tokens if msg.usage else 0,
#                 'total_tokens': (msg.usage.input_tokens + msg.usage.output_tokens) if msg.usage else 0,
#             }
#
#             return {
#                 'success': True,
#                 'latency_ms': latency_ms,
#                 'text': text,
#                 'usage': usage,
#                 'provider_error': None
#             }
#
#         except Exception as e:
#             return {
#                 'success': False,
#                 'latency_ms': int((time.time() - start_time) * 1000),
#                 'text': '',
#                 'usage': {},
#                 'provider_error': str(e)
#             }
#
#     elif provider == 'google' or provider == 'google_vertex':
#
#         try:
#             from google.oauth2 import service_account
#             from google.auth.transport.requests import Request
#
#             # Extract creds
#
#             service_account_json = creds.get('api_key')
#
#             project_id = creds.get('organization_id')
#
#             region = creds.get('deployment_names') or 'us-central1'
#
#             if not service_account_json:
#                 return {
#
#                     'success': False,
#
#                     'latency_ms': 0,
#
#                     'text': '',
#
#                     'usage': {},
#
#                     'provider_error': 'Missing service account JSON in credentials'
#
#                 }
#
#             # Clean malformed JSON (if trailing braces etc.)
#
#             cleaned_json = service_account_json.strip()
#
#             if cleaned_json.endswith('}\n}') or cleaned_json.count('}') > cleaned_json.count('{'):
#
#                 brace_count, last_valid_pos = 0, 0
#
#                 for i, char in enumerate(cleaned_json):
#
#                     if char == '{':
#
#                         brace_count += 1
#
#                     elif char == '}':
#
#                         brace_count -= 1
#
#                         if brace_count == 0:
#                             last_valid_pos = i + 1
#
#                             break
#
#                 cleaned_json = cleaned_json[:last_valid_pos]
#
#             service_account_info = json.loads(cleaned_json)
#
#             # Build Google OAuth2 credentials
#
#             credentials = service_account.Credentials.from_service_account_info(
#
#                 service_account_info,
#
#                 scopes=["https://www.googleapis.com/auth/cloud-platform"],
#
#             )
#
#             credentials.refresh(Request())
#
#             # Use model_id directly
#
#             provider_model = model_id
#
#             # Vertex AI publisher model endpoint
#
#             url = (
#
#                 f"https://{region}-aiplatform.googleapis.com/v1/"
#
#                 f"projects/{project_id}/locations/{region}/publishers/google/models/{provider_model}:predict"
#
#             )
#
#             headers = {
#
#                 "Authorization": f"Bearer {credentials.token}",
#
#                 "Content-Type": "application/json",
#
#             }
#
#             # Format request body
#
#             if 'gemini' in model_id.lower():
#
#                 # Gemini family expects messages
#
#                 messages = [{"role": "user", "content": prompt}]
#
#                 if system_prompt:
#                     messages.insert(0, {"role": "system", "content": system_prompt})
#
#                 request_body = {
#
#                     "instances": [{
#
#                         "messages": messages,
#
#                         "parameters": {
#
#                             "temperature": temperature,
#
#                             "maxOutputTokens": max_tokens,
#
#                         }
#
#                     }]
#
#                 }
#
#             else:
#
#                 # PaLM / Bison models expect prompt field
#
#                 request_body = {
#
#                     "instances": [{
#
#                         "prompt": prompt,
#
#                         "temperature": temperature,
#
#                         "maxOutputTokens": max_tokens,
#
#                     }]
#
#                 }
#
#             # Call Vertex AI
#
#             response = requests.post(url, headers=headers, json=request_body, timeout=30)
#
#             latency_ms = int((time.time() - start_time) * 1000)
#
#             if response.status_code == 200:
#
#                 result_data = response.json()
#
#                 predictions = result_data.get('predictions', [])
#
#                 if not predictions:
#                     return {
#
#                         'success': False,
#
#                         'latency_ms': latency_ms,
#
#                         'text': '',
#
#                         'usage': {},
#
#                         'provider_error': 'No predictions returned from Vertex AI'
#
#                     }
#
#                 prediction = predictions[0]
#
#                 # Extract text depending on model output format
#
#                 if 'content' in prediction:
#
#                     text = prediction['content']
#
#                 elif 'candidates' in prediction:
#
#                     candidates = prediction['candidates']
#
#                     if candidates and 'content' in candidates[0]:
#
#                         parts = candidates[0]['content'].get('parts', [])
#
#                         text = parts[0].get('text') if parts else str(candidates[0]['content'])
#
#                     else:
#
#                         text = str(prediction)
#
#                 else:
#
#                     text = str(prediction)
#
#                 metadata = result_data.get('metadata', {})
#
#                 token_meta = metadata.get('tokenMetadata', {})
#
#                 usage = {
#
#                     'prompt_tokens': token_meta.get('inputTokenCount', 0),
#
#                     'completion_tokens': token_meta.get('outputTokenCount', 0),
#
#                     'total_tokens': token_meta.get('totalTokenCount', 0),
#
#                 }
#
#                 return {
#
#                     'success': True,
#
#                     'latency_ms': latency_ms,
#
#                     'text': text,
#
#                     'usage': usage,
#
#                     'provider_error': None
#
#                 }
#
#             # Non-200 response
#
#             return {
#
#                 'success': False,
#
#                 'latency_ms': latency_ms,
#
#                 'text': '',
#
#                 'usage': {},
#
#                 'provider_error': f'Vertex AI API Error {response.status_code}: {response.text[:200]}'
#
#             }
#
#
#         except Exception as e:
#
#             return {
#
#                 'success': False,
#
#                 'latency_ms': int((time.time() - start_time) * 1000) if 'start_time' in locals() else 0,
#
#                 'text': '',
#
#                 'usage': {},
#
#                 'provider_error': f'Vertex AI Error: {str(e)}'
#
#             }
#
#     else:
#         return {
#             'success': False,
#             'latency_ms': int((time.time() - start_time) * 1000),
#             'text': '',
#             'usage': {},
#             'provider_error': f'Unsupported provider: {provider or "None"}'
#         }


# --- Provider constants & aliases ---
PROVIDER_OPENAI = "openai"
PROVIDER_ANTHROPIC = "anthropic"
PROVIDER_AZURE = "azureopenai"  # canonical
PROVIDER_GOOGLE = "google"  # canonical

PROVIDER_ALIASES = {
    "azure_openai": PROVIDER_AZURE,
    "azure-openai": PROVIDER_AZURE,
    "azure": PROVIDER_AZURE,
    "google_vertex": PROVIDER_GOOGLE,
    "google-vertex": PROVIDER_GOOGLE,
    "vertex": PROVIDER_GOOGLE,
}


def normalize_provider(p: str | None) -> str | None:
    if p is None:
        return None
    p = p.strip().lower()
    return PROVIDER_ALIASES.get(p, p)


def call_model_provider(provider: str, model_id: str, prompt: str, effective_config: dict, creds: dict,
                        messages: list | None = None):
    """
    Call the actual AI provider API
    Returns (result_dict, raw_response_dict)
    """
    # Add debug logging
    print(f"DEBUG call_model_provider: provider='{provider}', model_id='{model_id}'")
    print(f"DEBUG call_model_provider: creds keys={list(creds.keys()) if creds else 'None'}")

    # Normalize provider
    provider = normalize_provider(provider)
    print(f"DEBUG call_model_provider: normalized provider='{provider}'")

    # Check for None provider early
    if provider is None:
        return {
            'success': False,
            'latency_ms': 0,
            'text': '',
            'usage': {},
            'provider_error': 'Provider is None - model lookup failed'
        }

    temperature = effective_config.get('temperature', 0.7)
    max_tokens = effective_config.get('max_tokens', 512)
    system_prompt = effective_config.get('system_prompt', '')

    start_time = time.time()

    if provider == PROVIDER_OPENAI:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=creds['api_key'])

            # Get the provider model from registry
            model_info = get_model_info(model_id)
            provider_model = model_info.get('provider_model', model_id) if model_info else model_id

            if messages is None or not isinstance(messages, list) or not messages:
                msgs = []
                if system_prompt:
                    msgs.append({"role": "system", "content": system_prompt})
                msgs.append({"role": "user", "content": prompt})
            else:
                msgs = messages

            def _openai_chat(model):
                # Backwards-compatible parameter handling
                kwargs = {
                    "model": model,
                    "messages": msgs,
                }

                # Newer models: require max_completion_tokens, fixed temperature
                if _is_reasoning_model(model):
                    kwargs["max_completion_tokens"] = max_tokens
                    # Only allow default temperature (1.0) – skip if user sets custom
                    if temperature == 1:
                        kwargs["temperature"] = 1
                else:
                    # Legacy models: use max_tokens and allow custom temperature
                    kwargs["max_tokens"] = max_tokens
                    kwargs["temperature"] = temperature

                return client.chat.completions.create(**kwargs)

            fallback_note = ""
            try:
                # Try the primary model
                resp = _openai_chat(provider_model)
            except Exception as e:
                error_msg = parse_openai_error(e)

                # Check if it's a model not found error
                if ("model" in error_msg.lower() and "not found" in error_msg.lower()) or \
                        ("does not exist" in error_msg.lower()) or \
                        ("404" in str(e)):

                    # Try fallback to gpt-4o
                    try:
                        resp = _openai_chat("gpt-4o")
                        fallback_note = f" (fell back to gpt-4o; original '{provider_model}' not available)"
                    except Exception as e2:
                        # Try gpt-4o-mini as last resort
                        try:
                            resp = _openai_chat("gpt-4o-mini")
                            fallback_note = f" (fell back to gpt-4o-mini; original '{provider_model}' not available)"
                        except Exception:
                            return {
                                'success': False,
                                'latency_ms': int((time.time() - start_time) * 1000),
                                'text': '',
                                'usage': {},
                                'provider_error': f"All models failed - Original: {error_msg}"
                            }
                else:
                    return {
                        'success': False,
                        'latency_ms': int((time.time() - start_time) * 1000),
                        'text': '',
                        'usage': {},
                        'provider_error': error_msg
                    }

            latency_ms = int((time.time() - start_time) * 1000)

            # Check for temperature note
            temp_note = ""
            if _is_reasoning_model(provider_model) and temperature != 1:
                temp_note = " (temperature fixed to 1 for this model)"

            # Safely extract text content
            text = ""
            try:
                text = resp.choices[0].message.content or ""
            except Exception:
                text = getattr(resp, "content", "") or str(resp)

            # Add fallback note to response if we used a fallback
            if fallback_note:
                text += fallback_note

            # Add temperature note if applicable
            if temp_note:
                text += temp_note

            usage = {}
            if getattr(resp, "usage", None):
                u = resp.usage
                usage = {
                    "prompt_tokens": getattr(u, "prompt_tokens", getattr(u, "input_tokens", 0)),
                    "completion_tokens": getattr(u, "completion_tokens", getattr(u, "output_tokens", 0)),
                    "total_tokens": getattr(u, "total_tokens",
                                            getattr(u, "input_tokens", 0) + getattr(u, "output_tokens", 0)),
                }

            return {
                'success': True,
                'latency_ms': latency_ms,
                'text': text,
                'usage': usage,
                'provider_error': None
            }

        except Exception as e:
            return {
                'success': False,
                'latency_ms': int((time.time() - start_time) * 1000),
                'text': '',
                'usage': {},
                'provider_error': parse_openai_error(e)
            }


    elif provider == PROVIDER_ANTHROPIC:

        try:

            import anthropic

            client = anthropic.Anthropic(api_key=creds['api_key'])

            model_info = get_model_info(model_id)

            provider_model = model_info.get('provider_model', model_id) if model_info else model_id

            # Handle messages correctly - same logic as OpenAI

            if messages is None or not isinstance(messages, list) or not messages:

                # No conversation history - create new message

                msgs = []

                if system_prompt:
                    msgs.append({"role": "system", "content": system_prompt})

                msgs.append({"role": "user", "content": prompt})

            else:

                # Use existing conversation history

                msgs = messages

            # For Anthropic, system messages are handled separately

            anthropic_messages = []

            system_content = None

            for msg in msgs:

                if msg["role"] == "system":

                    system_content = msg["content"]

                else:

                    anthropic_messages.append(msg)

            kwargs = {

                'model': provider_model,

                'temperature': temperature,

                'max_tokens': max_tokens,

                'messages': anthropic_messages  # ✅ FIXED: Use conversation history

            }

            # Add system prompt if present

            if system_content:

                kwargs['system'] = system_content

            elif system_prompt:

                kwargs['system'] = system_prompt

            msg = client.messages.create(**kwargs)

            latency_ms = int((time.time() - start_time) * 1000)

            # Extract text from content blocks

            text_parts = []

            for block in msg.content:

                if hasattr(block, 'text'):

                    text_parts.append(block.text)

                elif isinstance(block, dict) and block.get('type') == 'text':

                    text_parts.append(block.get('text', ''))

            text = ''.join(text_parts)

            usage = {

                'prompt_tokens': msg.usage.input_tokens if msg.usage else 0,

                'completion_tokens': msg.usage.output_tokens if msg.usage else 0,

                'total_tokens': (msg.usage.input_tokens + msg.usage.output_tokens) if msg.usage else 0,

            }

            return {

                'success': True,

                'latency_ms': latency_ms,

                'text': text,

                'usage': usage,

                'provider_error': None

            }


        except Exception as e:

            return {

                'success': False,

                'latency_ms': int((time.time() - start_time) * 1000),

                'text': '',

                'usage': {},

                'provider_error': str(e)

            }

    elif provider == PROVIDER_GOOGLE:
        print(f"DEBUG: Google provider section, creds check...")

        # Check credentials early
        if not creds:
            return {
                'success': False,
                'latency_ms': 0,
                'text': '',
                'usage': {},
                'provider_error': f'No {PROVIDER_GOOGLE} credentials configured for this workspace'
            }

        try:
            from google.oauth2 import service_account
            from google.auth.transport.requests import Request

            # Extract creds
            service_account_json = creds.get('api_key')
            project_id = creds.get('organization_id')
            region = (
                    creds.get('region')
                    or creds.get('deployment_names')
                    or 'us-central1'
            )

            print(f"DEBUG: service_account_json exists: {service_account_json is not None}")
            print(f"DEBUG: project_id: {project_id}")
            print(f"DEBUG: region: {region}")

            if not service_account_json:
                return {
                    'success': False,
                    'latency_ms': 0,
                    'text': '',
                    'usage': {},
                    'provider_error': 'Missing service account JSON in credentials'
                }

            # Handle service account JSON - accept dict or string
            if isinstance(service_account_json, str):
                # Clean malformed JSON (if trailing braces etc.)
                cleaned_json = service_account_json.strip()
                if cleaned_json.endswith('}\n}') or cleaned_json.count('}') > cleaned_json.count('{'):
                    brace_count, last_valid_pos = 0, 0
                    for i, char in enumerate(cleaned_json):
                        if char == '{':
                            brace_count += 1
                        elif char == '}':
                            brace_count -= 1
                            if brace_count == 0:
                                last_valid_pos = i + 1
                                break
                    cleaned_json = cleaned_json[:last_valid_pos]
                service_account_info = json.loads(cleaned_json)
            else:
                service_account_info = service_account_json

            # Build Google OAuth2 credentials
            credentials = service_account.Credentials.from_service_account_info(
                service_account_info,
                scopes=["https://www.googleapis.com/auth/cloud-platform"],
            )
            credentials.refresh(Request())

            # Use model_id directly
            provider_model = model_id

            # Vertex AI publisher model endpoint
            url = (
                f"https://{region}-aiplatform.googleapis.com/v1/"
                f"projects/{project_id}/locations/{region}/publishers/google/models/{provider_model}:predict"
            )

            headers = {
                "Authorization": f"Bearer {credentials.token}",
                "Content-Type": "application/json",
            }

            # Format request body
            if 'gemini' in model_id.lower():
                # Gemini family expects messages
                msg_list = [{"role": "user", "content": prompt}]
                if system_prompt:
                    msg_list.insert(0, {"role": "system", "content": system_prompt})

                request_body = {
                    "instances": [{
                        "messages": msg_list,
                        "parameters": {
                            "temperature": temperature,
                            "maxOutputTokens": max_tokens,
                        }
                    }]
                }
            else:
                # PaLM / Bison models expect prompt field
                request_body = {
                    "instances": [{
                        "prompt": prompt,
                        "temperature": temperature,
                        "maxOutputTokens": max_tokens,
                    }]
                }

            print(f"DEBUG: Making request to {url}")
            print(f"DEBUG: Request body: {request_body}")

            # Call Vertex AI
            response = requests.post(url, headers=headers, json=request_body, timeout=30)
            latency_ms = int((time.time() - start_time) * 1000)

            print(f"DEBUG: Response status: {response.status_code}")
            print(f"DEBUG: Response text (first 200 chars): {response.text[:200]}")

            if response.status_code == 200:
                result_data = response.json()
                predictions = result_data.get('predictions', [])

                if not predictions:
                    return {
                        'success': False,
                        'latency_ms': latency_ms,
                        'text': '',
                        'usage': {},
                        'provider_error': 'No predictions returned from Vertex AI'
                    }

                prediction = predictions[0]

                # Extract text depending on model output format
                if 'content' in prediction:
                    text = prediction['content']
                elif 'candidates' in prediction:
                    candidates = prediction['candidates']
                    if candidates and 'content' in candidates[0]:
                        parts = candidates[0]['content'].get('parts', [])
                        text = parts[0].get('text') if parts else str(candidates[0]['content'])
                    else:
                        text = str(prediction)
                else:
                    text = str(prediction)

                metadata = result_data.get('metadata', {})
                token_meta = metadata.get('tokenMetadata', {})
                usage = {
                    'prompt_tokens': token_meta.get('inputTokenCount', 0),
                    'completion_tokens': token_meta.get('outputTokenCount', 0),
                    'total_tokens': token_meta.get('totalTokenCount', 0),
                }

                return {
                    'success': True,
                    'latency_ms': latency_ms,
                    'text': text,
                    'usage': usage,
                    'provider_error': None
                }

            # Non-200 response
            return {
                'success': False,
                'latency_ms': latency_ms,
                'text': '',
                'usage': {},
                'provider_error': f'Vertex AI API Error {response.status_code}: {response.text[:200]}'
            }

        except Exception as e:
            print(f"DEBUG: Exception in google provider: {str(e)}")
            return {
                'success': False,
                'latency_ms': int((time.time() - start_time) * 1000) if 'start_time' in locals() else 0,
                'text': '',
                'usage': {},
                'provider_error': f'Vertex AI Error: {str(e)}'
            }

    else:
        return {
            'success': False,
            'latency_ms': int((time.time() - start_time) * 1000),
            'text': '',
            'usage': {},
            'provider_error': f'Unsupported provider: {provider or "None"}'
        }


from datetime import datetime, timedelta

def get_models_from_database(workspace_id):
    """Get models from database and return formatted response"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT wls.model_id, wls.provider, wls.temperature, wls.max_tokens, 
                       wls.system_prompt, wls.tool_choice, wls.usage_limits, wls.cost_controls, 
                       wls.extra, wls.is_default, wls.input_cap, wls.output_cap, wls.use_case, 
                       wls.enabled, wls.updated_by, wls.updated_at,
                       u.display_name as updated_by_name
                FROM workspace_llm_settings wls
                LEFT JOIN users u ON wls.updated_by = u.id
                WHERE wls.workspace_id = %s AND wls.enabled = true
                ORDER BY wls.provider, wls.model_id
            """, (workspace_id,))

            models = cur.fetchall()

        result = []
        for model in models:
            effective_config = compute_effective_config(workspace_id, model['model_id'])

            result.append({
                'modelId': model['model_id'],
                'enabled': model['enabled'],
                'isDefault': bool(model['is_default']),
                'provider': model['provider'],
                'input_cap': model['input_cap'],
                'output_cap': model['output_cap'],
                'effectiveConfig': effective_config,
                'modelInfo': {
                    'provider': model['provider'],
                    'provider_model': model['model_id'],
                    'category': model['use_case'].title() if model['use_case'] else 'Chat',
                    'cap': model['output_cap']
                }
            })

        return jsonify(result)

    except Exception as e:
        print(f"Error getting models from database: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@llm_bp.route('/<int:workspace_id>/llms', methods=['GET'])
@token_required
def get_workspace_llms(current_user_id, workspace_id):
    if not verify_workspace_access(current_user_id, workspace_id):
        return jsonify({'error': 'Workspace not found or access denied'}), 404

    # Check if we need to sync (configurable threshold)
    SYNC_THRESHOLD_MINUTES = 30  # Sync if data is older than 30 minutes

    should_sync = check_if_sync_needed(workspace_id, SYNC_THRESHOLD_MINUTES)

    if should_sync:
        # Background sync (non-blocking)
        sync_models_in_background(workspace_id)

    # Always return current database state (fast response)
    return get_models_from_database(workspace_id)

@llm_bp.route('/<int:workspace_id>/llms/sync-status', methods=['GET'])
@token_required
def get_sync_status(current_user_id, workspace_id):
    if not verify_workspace_access(current_user_id, workspace_id):
        return jsonify({'error': 'Access denied'}), 403

    conn = get_db_connection()
    try:
        with conn, conn.cursor() as cur:
            cur.execute("""
                SELECT provider, last_sync, sync_status, error_message
                FROM provider_sync_status
                WHERE workspace_id = %s
                ORDER BY provider
            """, (workspace_id,))
            results = cur.fetchall()
        return jsonify({'sync_status': results})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@llm_bp.route('/<int:workspace_id>/llms/sync-now', methods=['POST'])
@token_required
@require_role('MANAGE_MODELS')
def sync_now(current_user_id, workspace_id):
    sync_models_in_background(workspace_id)
    return jsonify({'message': 'Sync started in background'})


def sync_models_in_background(workspace_id):
    """Non-blocking sync that updates database with latest models"""
    import threading

    def do_sync():
        providers = ['openai', 'anthropic', 'google', 'azureopenai']

        for provider in providers:
            try:
                sync_provider_models(workspace_id, provider)
            except Exception as e:
                print(f"Sync failed for {provider}: {e}")

    # Run in background thread
    sync_thread = threading.Thread(target=do_sync, daemon=True)
    sync_thread.start()


def sync_provider_models(workspace_id, provider):
    """Sync models from specific provider"""
    creds = get_workspace_provider_credential(workspace_id, provider)
    if not creds:
        print(f"[SYNC] Skipping {provider} — missing credentials.")
        return

    print(f"[SYNC] Starting sync for provider: {provider}")
    update_sync_status(workspace_id, provider, 'in_progress')

    try:
        # Fetch latest models from provider API
        if provider == 'openai':
            api_models = fetch_available_openai_models(creds)
        elif provider == 'anthropic':
            api_models = fetch_available_anthropic_models(creds)
        elif provider == 'google':
            api_models = fetch_available_google_vertex_models(creds)
        elif provider == 'azureopenai':
            api_models = fetch_available_azure_openai_models(creds)
        else:
            print(f"[SYNC] Unknown provider: {provider}")
            return

        conn = get_db_connection()
        with conn.cursor() as cur:
            for model_id, model_info in api_models.items():
                print(f"[SYNC] Inserting/updating model: {model_id} from {provider} "
                      f"(input_cap={model_info['input_cap']}, output_cap={model_info['output_cap']})")

                cur.execute("""
                    INSERT INTO workspace_llm_settings 
                    (workspace_id, model_id, provider, input_cap, output_cap, 
                     enabled, use_case, last_synced, sync_source)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (workspace_id, model_id) 
                    DO UPDATE SET 
                        input_cap = EXCLUDED.input_cap,
                        output_cap = EXCLUDED.output_cap,
                        last_synced = EXCLUDED.last_synced,
                        sync_source = EXCLUDED.sync_source
                    WHERE workspace_llm_settings.sync_source IS DISTINCT FROM 'manual'
                """, (
                    workspace_id, model_id, provider,
                    model_info['input_cap'], model_info['output_cap'],
                    False, 'chat', datetime.now(), 'api'
                ))

        conn.commit()
        print(f"[SYNC] Sync completed for provider: {provider}")
        update_sync_status(workspace_id, provider, 'success')

    except Exception as e:
        print(f"[SYNC] Sync failed for provider: {provider} with error: {e}")
        update_sync_status(workspace_id, provider, 'failed', str(e))
        raise
    finally:
        conn.close()


def check_if_sync_needed(workspace_id, threshold_minutes):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT provider, last_sync 
                FROM provider_sync_status 
                WHERE workspace_id = %s
            """, (workspace_id,))

            sync_data = cur.fetchall()

        # Check if any provider needs sync
        cutoff_time = datetime.now() - timedelta(minutes=threshold_minutes)

        for row in sync_data:
            if not row['last_sync'] or row['last_sync'] < cutoff_time:
                return True

        return False
    finally:
        conn.close()


def update_sync_status(workspace_id, provider, status, error_message=None):
    """Update the sync status for a provider in a workspace"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO provider_sync_status 
                (workspace_id, provider, last_sync, sync_status, error_message)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (workspace_id, provider) 
                DO UPDATE SET 
                    last_sync = EXCLUDED.last_sync,
                    sync_status = EXCLUDED.sync_status,
                    error_message = EXCLUDED.error_message
            """, (
                workspace_id,
                provider,
                datetime.now(),
                status,
                error_message
            ))
        conn.commit()
    except Exception as e:
        print(f"Failed to update sync status: {e}")
    finally:
        conn.close()


# Get specific model config
@llm_bp.route('/<int:workspace_id>/llms/<model_id>/config', methods=['GET'])
@token_required
def get_model_config(current_user_id, workspace_id, model_id):
    """Get configuration for specific model"""
    if not verify_workspace_access(current_user_id, workspace_id):
        return jsonify({'error': 'Workspace not found or access denied'}), 404

    if not get_model_info(model_id, workspace_id):
        return jsonify({'error': 'Unknown model'}), 400

    conn = get_db_connection()
    try:
        with conn, conn.cursor() as cur:
            cur.execute("""
                SELECT wls.temperature, wls.max_tokens, wls.system_prompt, wls.tool_choice,
                       wls.usage_limits, wls.cost_controls, wls.extra, wls.is_default, wls.updated_by, wls.updated_at,
                       u.display_name as updated_by_name
                FROM workspace_llm_settings wls
                LEFT JOIN users u ON wls.updated_by = u.id
                WHERE wls.workspace_id = %s AND wls.model_id = %s
            """, (workspace_id, model_id))

            settings = cur.fetchone()

        effective_config = compute_effective_config(workspace_id, model_id)

        return jsonify({
            'modelId': model_id,
            'settings': dict(settings) if settings else None,
            'effectiveConfig': effective_config,
            'modelInfo': get_model_info(model_id)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


# Update model config
# Update model config
@llm_bp.route('/<int:workspace_id>/llms/<model_id>/config', methods=['PUT'])
@token_required
@require_role('MANAGE_MODELS')
def update_model_config(current_user_id, workspace_id, model_id):
    """Update configuration for specific model"""
    if not get_model_info(model_id, workspace_id):
        return jsonify({'error': 'Unknown model'}), 400

    # Get and safely coerce input values
    data = request.get_json(silent=True) or {}

    # Pull raw values
    temperature = data.get('temperature')
    max_tokens = data.get('max_tokens')
    system_prompt = data.get('system_prompt')
    tool_choice = data.get('tool_choice')
    usage_limits = data.get('usage_limits')
    cost_controls = data.get('cost_controls')
    extra = data.get('extra')

    # Coercion helpers
    def to_float(v, name):
        if v is None:
            return None
        try:
            return float(v)
        except (TypeError, ValueError):
            raise ValueError(f"{name} must be a number")

    def to_int(v, name):
        if v is None:
            return None
        try:
            return int(v)
        except (TypeError, ValueError):
            raise ValueError(f"{name} must be an integer")

    # Safely convert types
    try:
        temperature = to_float(temperature, "Temperature")
        max_tokens = to_int(max_tokens, "Max tokens")
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400

    # Now safe to validate with numeric comparisons
    if temperature is not None and not (0 <= temperature <= 2):
        return jsonify({'error': 'Temperature must be between 0 and 2'}), 400

    if max_tokens is not None and max_tokens <= 0:
        return jsonify({'error': 'Max tokens must be positive'}), 400

    if tool_choice is not None and tool_choice not in ['auto', 'none', 'required']:
        return jsonify({'error': 'Tool choice must be auto, none, or required'}), 400

    # Clamp max_tokens to model cap
    model_info = get_model_info(model_id)
    if max_tokens and model_info.get('cap') and max_tokens > model_info['cap']:
        max_tokens = model_info['cap']

    conn = get_db_connection()
    try:
        with conn, conn.cursor() as cur:
            cur.execute("""
                INSERT INTO workspace_llm_settings 
                    (workspace_id, model_id, temperature, max_tokens, system_prompt, 
                     tool_choice, usage_limits, cost_controls, extra, updated_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (workspace_id, model_id) DO UPDATE SET
                    temperature = COALESCE(EXCLUDED.temperature, workspace_llm_settings.temperature),
                    max_tokens = COALESCE(EXCLUDED.max_tokens, workspace_llm_settings.max_tokens),
                    system_prompt = COALESCE(EXCLUDED.system_prompt, workspace_llm_settings.system_prompt),
                    tool_choice = COALESCE(EXCLUDED.tool_choice, workspace_llm_settings.tool_choice),
                    usage_limits = COALESCE(EXCLUDED.usage_limits, workspace_llm_settings.usage_limits),
                    cost_controls = COALESCE(EXCLUDED.cost_controls, workspace_llm_settings.cost_controls),
                    extra = COALESCE(EXCLUDED.extra, workspace_llm_settings.extra),
                    updated_by = EXCLUDED.updated_by,
                    updated_at = NOW()
                RETURNING *
            """, (workspace_id, model_id, temperature, max_tokens, system_prompt,
                  tool_choice,
                  Json(usage_limits) if usage_limits is not None else None,
                  Json(cost_controls) if cost_controls is not None else None,
                  Json(extra) if extra is not None else None,
                  current_user_id))

            updated_settings = cur.fetchone()

        # Compute effective config
        effective_config = compute_effective_config(workspace_id, model_id)

        return jsonify({
            'modelId': model_id,
            'settings': dict(updated_settings),
            'effectiveConfig': effective_config
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

# Enable/disable model for workspace
@llm_bp.route('/<int:workspace_id>/llms/<model_id>/enable', methods=['PATCH'])
@token_required
@require_role('MANAGE_MODELS')
def enable_model(current_user_id, workspace_id, model_id):
    """Enable or disable model for workspace"""
    if not get_model_info(model_id, workspace_id):
        return jsonify({'error': 'Unknown model'}), 400

    data = request.get_json()
    enabled = data.get('enabled', False)

    conn = get_db_connection()
    try:
        with conn, conn.cursor() as cur:
            if enabled:
                # Enable model
                cur.execute("""
                    INSERT INTO workspace_llms (workspace_id, model_id, enabled_by)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (workspace_id, model_id) DO NOTHING
                """, (workspace_id, model_id, current_user_id))
            else:
                # Disable model and clear default if it was set
                cur.execute("""
                    DELETE FROM workspace_llms 
                    WHERE workspace_id = %s AND model_id = %s
                """, (workspace_id, model_id))

                cur.execute("""
                    UPDATE workspace_llm_settings 
                    SET is_default = FALSE 
                    WHERE workspace_id = %s AND model_id = %s AND is_default = TRUE
                """, (workspace_id, model_id))

        return jsonify({
            'modelId': model_id,
            'enabled': enabled,
            'message': f'Model {"enabled" if enabled else "disabled"}'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


# Set model as default
@llm_bp.route('/<int:workspace_id>/llms/<model_id>/default', methods=['PATCH'])
@token_required
@require_role('MANAGE_MODELS')
def set_model_default(current_user_id, workspace_id, model_id):
    """Set model as default for workspace"""
    if not get_model_info(model_id, workspace_id):
        return jsonify({'error': 'Unknown model'}), 400

    data = request.get_json()
    is_default = data.get('isDefault', False)

    conn = get_db_connection()
    try:
        if not is_default:
            # Just unset this model as default
            with conn, conn.cursor() as cur:
                cur.execute("""
                    UPDATE workspace_llm_settings
                    SET is_default = FALSE, updated_by = %s, updated_at = NOW()
                    WHERE workspace_id = %s AND model_id = %s
                """, (current_user_id, workspace_id, model_id))
        else:
            # Set as default (atomic operation)
            with conn, conn.cursor() as cur:
                # Clear all defaults for this workspace
                cur.execute("""
                    UPDATE workspace_llm_settings
                    SET is_default = FALSE
                    WHERE workspace_id = %s AND is_default = TRUE
                """, (workspace_id,))

                # Set or create this one as default
                cur.execute("""
                    INSERT INTO workspace_llm_settings (workspace_id, model_id, is_default, updated_by)
                    VALUES (%s, %s, TRUE, %s)
                    ON CONFLICT (workspace_id, model_id) DO UPDATE
                    SET is_default = TRUE, updated_by = EXCLUDED.updated_by, updated_at = NOW()
                """, (workspace_id, model_id, current_user_id))

        return jsonify({
            'modelId': model_id,
            'isDefault': is_default,
            'message': f'Model {"set as" if is_default else "removed as"} default'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


# Validate/test model
@llm_bp.route('/<int:workspace_id>/llms/validate', methods=['POST'])
@token_required
def validate_model(current_user_id, workspace_id):
    """Test model with current configuration using real API calls"""
    if not verify_workspace_access(current_user_id, workspace_id):
        return jsonify({'error': 'Workspace not found or access denied'}), 404

    data = request.get_json() or {}
    model_id = data.get('modelId')
    prompt = data.get('prompt', 'Hello, this is a test.')
    settings_override = data.get('settingsOverride', {}) or {}

    if not model_id:
        return jsonify({'error': 'Model ID is required'}), 400

    model_info = get_model_info(model_id, workspace_id)
    if not model_info:
        return jsonify({'error': 'Unknown model'}), 400

    # Get effective config and apply overrides
    effective_config = compute_effective_config(workspace_id, model_id)

    # Only allow specific keys to be overridden
    for k in ['temperature', 'max_tokens', 'system_prompt', 'tool_choice']:
        if k in settings_override and settings_override[k] is not None:
            effective_config[k] = settings_override[k]

    # Validate tool_choice in overrides
    if effective_config.get('tool_choice') not in [None, 'auto', 'none', 'required']:
        return jsonify({'error': 'Invalid tool_choice in override'}), 400

    provider = model_info['provider']

    # Get provider credentials
    from account_blueprint import get_workspace_provider_credential
    creds = get_workspace_provider_credential(workspace_id, provider)
    if not creds or not creds.get('api_key'):
        return jsonify({'error': f'No {provider} credentials configured for this workspace'}), 400

    # Call the real provider
    result = call_model_provider(provider, model_id, prompt, effective_config, creds)

    # Format response for frontend
    if result['success']:
        text = (result['text'] or '').strip()
        truncated = text[:4000]  # Keep UI responsive
        usage = result.get('usage', {})

        return jsonify({
            'success': True,
            'latency_ms': result['latency_ms'],
            'prompt_tokens': usage.get('prompt_tokens'),
            'completion_tokens': usage.get('completion_tokens'),
            'total_tokens': usage.get('total_tokens'),
            'truncated_output': truncated,
            'provider_error': None,
            'effective_config_used': effective_config,
            'model_info': model_info
        })
    else:
        return jsonify({
            'success': False,
            'latency_ms': result['latency_ms'],
            'prompt_tokens': None,
            'completion_tokens': None,
            'total_tokens': None,
            'truncated_output': '',
            'provider_error': result['provider_error'],
            'effective_config_used': effective_config,
            'model_info': model_info
        }), 200  # Keep 200 so frontend shows error nicely


# Diagnostic route to check available models
@llm_bp.route('/<int:workspace_id>/llms/available', methods=['GET'])
@token_required
def get_available_models(current_user_id, workspace_id):
    """Get models your API key actually has access to"""
    if not verify_workspace_access(current_user_id, workspace_id):
        return jsonify({'error': 'Workspace not found or access denied'}), 404

    try:
        from openai import OpenAI
        from account_blueprint import get_workspace_provider_credential

        creds = get_workspace_provider_credential(workspace_id, 'openai')
        if not creds or not creds.get('api_key'):
            return jsonify({'error': 'No OpenAI credentials configured'}), 400

        client = OpenAI(api_key=creds['api_key'])
        models = client.models.list()
        available = [m.id for m in models.data if any(x in m.id.lower() for x in ['gpt', 'o3', 'o4'])]

        return jsonify({'available_models': sorted(available)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Health check
@llm_bp.route('/<int:workspace_id>/llms/health', methods=['GET'])
@token_required
def llm_health(current_user_id, workspace_id):
    """Health check for LLM management"""
    if not verify_workspace_access(current_user_id, workspace_id):
        return jsonify({'error': 'Workspace not found or access denied'}), 404

    return jsonify({
        'status': 'healthy',
        'workspace_id': workspace_id,
        'available_models': len(MODEL_REGISTRY),
        'timestamp': time.time()
    })


# Get all LLMs for workspace (available + enabled + configs)
def fetch_available_openai_models(creds):
    """Fetch available models from OpenAI API"""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=creds['api_key'])
        models = client.models.list()

        # Group and filter models
        available = {}
        for model in models.data:
            model_id = model.id

            # Categorize models and set caps
            if model_id.startswith('gpt-5'):
                input_cap = 200000  # 200K tokens
                output_cap = 8192   # 8K tokens
                cap = 8192
                category = 'GPT-5'
            elif model_id.startswith('gpt-4.1'):
                input_cap = 128000  # 128K tokens
                output_cap = 4096   # 4K tokens
                cap = 4096
                category = 'GPT-4.1'
            elif model_id.startswith('gpt-4o'):
                input_cap = 128000  # 128K tokens
                output_cap = 4096   # 4K tokens
                cap = 4096
                category = 'GPT-4o'
            elif model_id.startswith('gpt-3.5'):
                input_cap = 16000   # 16K tokens
                output_cap = 2048   # 2K tokens
                cap = 2048
                category = 'GPT-3.5'
            elif model_id.startswith('o3') or model_id.startswith('o4'):
                input_cap = 128000  # 128K tokens
                output_cap = 4096   # 4K tokens
                cap = 4096
                category = 'Reasoning'
            else:
                # Skip unknown models or provide defaults
                continue

            available[model_id] = {
                'provider': 'openai',
                'cap': cap,
                'input_cap': input_cap,
                'output_cap': output_cap,
                'category': category
            }

        return available
    except Exception as e:
        print(f"Failed to fetch OpenAI models: {e}")
        return {}


def fetch_available_anthropic_models(creds):
    """Fetch available models from Anthropic API"""
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=creds['api_key'])

        # Use Anthropic's models list API (similar to OpenAI)
        models = client.models.list()

        # Process and categorize models
        available = {}
        for model in models.data:
            model_id = model.id

            # Categorize Anthropic models output max tokens
            if 'claude-opus-4-1-20250805' in model_id.lower():
                category = 'Claude-4-Opus'
                cap = 8192
                input_cap = 200000  # ~200k input tokens
                output_cap = 8192  # ~8k output tokens
            elif 'claude-opus-4-20250514' in model_id.lower():
                category = 'Claude-4-Opus'
                cap = 8192
                input_cap = 200000  # ~200k input tokens
                output_cap = 8192  # ~8k output tokens
            elif 'claude-sonnet-4-20250514' in model_id.lower():
                category = 'Claude-4-Sonnet'
                cap = 8192
                input_cap = 200000  # ~200k input tokens
                output_cap = 8192  # ~8k output tokens
            elif 'claude-3-7-sonnet-20250219' in model_id.lower():
                category = 'Claude-3.7-Sonnet'
                cap = 4096
                input_cap = 200000  # ~200k input tokens
                output_cap = 8192  # ~8k output tokens
            elif 'claude-3-5' in model_id.lower():
                category = 'Claude-3.5-Sonnet'
                cap = 8192
                input_cap = 200000  # ~200k input tokens
                output_cap = 8192  # ~8k output tokens
            elif 'claude-3' in model_id.lower():
                category = 'Claude-3'
                cap = 4096
                input_cap = 200000  # ~200k input tokens
                output_cap = 8192  # ~8k output tokens
            elif 'claude-4' in model_id.lower():
                category = 'Claude-4'
                cap = 8192
                input_cap = 200000  # ~200k input tokens
                output_cap = 8192  # ~8k output tokens
            else:
                category = 'Claude'
                cap = 4096
                input_cap = 200000  # ~200k input tokens
                output_cap = 8192  # ~8k output tokens

            available[model_id] = {
                'provider': 'anthropic',
                'cap': cap,
                'input_cap': input_cap,  # New field
                'output_cap': output_cap,  # New field
                'category': category,
                'provider_model': model_id
            }

        return available

    except ImportError:
        print("Anthropic library not installed")
        return {}
    except Exception as e:
        print(f"Failed to fetch Anthropic models: {e}")
        return {}


def fetch_available_azure_openai_models(creds):
    """Fetch available models from Azure OpenAI API"""
    try:
        print(f"DEBUG: Azure function called with creds: {creds}")
        import requests

        endpoint = creds.get('endpoint_url')  # Use endpoint_url instead
        api_key = creds.get('api_key')

        if not endpoint or not api_key:
            print("Missing Azure OpenAI endpoint or API key")
            return {}

        response = requests.get(
            f"{endpoint}/openai/models?api-version=2024-10-21",
            headers={"api-key": api_key}
        )
        response.raise_for_status()

        models_data = response.json()
        available = {}

        for model in models_data.get('data', []):
            model_id = model['id']

            # Set caps based on model type
            if 'gpt-4' in model_id.lower():
                input_cap = 128000  # 128K tokens
                output_cap = 4096  # 4K tokens
                cap = 4096
            elif 'gpt-3.5' in model_id.lower():
                input_cap = 16000  # 16K tokens
                output_cap = 2048  # 2K tokens
                cap = 2048
            else:
                input_cap = 128000  # Default
                output_cap = 4096  # Default
                cap = 4096

            available[model_id] = {
                'provider': 'azure_openai',
                'cap': cap,
                'input_cap': input_cap,
                'output_cap': output_cap,
                'category': 'Azure OpenAI',
                'provider_model': model_id
            }

        return available

    except Exception as e:
        print(f"Failed to fetch Azure OpenAI models: {e}")
        return {}


def fetch_available_google_vertex_models(creds):
    """Fetch available models from Google Vertex AI Publisher Models API"""
    try:
        import json
        import requests
        from google.oauth2 import service_account
        from google.auth.transport.requests import Request

        # Get credentials from the saved format
        service_account_json = creds.get('api_key')
        project_id = creds.get('organization_id')
        region = creds.get('region', 'us-central1')  # Better field name

        if not service_account_json or not project_id:
            print("Missing Google Vertex AI service account JSON or project ID")
            return {}

        # Handle service account JSON - accept dict or string
        if isinstance(service_account_json, str):
            service_account_info = json.loads(service_account_json.strip())
        else:
            service_account_info = service_account_json

        # Build Google credentials
        credentials = service_account.Credentials.from_service_account_info(
            service_account_info,
            scopes=["https://www.googleapis.com/auth/cloud-platform"],
        )
        credentials.refresh(Request())
        headers = {"Authorization": f"Bearer {credentials.token}"}

        # Optional sanity check - verify we can access the project
        test_url = f"https://{region}-aiplatform.googleapis.com/v1/projects/{project_id}/locations/{region}/endpoints"
        response = requests.get(test_url, headers=headers, timeout=10)

        if response.status_code != 200:
            print(f"Failed to verify Vertex AI access: {response.status_code}")
            return {}

        # Fetch available Google publisher models using the correct API
        models_url = f"https://{region}-aiplatform.googleapis.com/v1beta1/publishers/google/models"
        all_models = []
        page_token = None

        # Handle pagination
        while True:
            params = {"pageSize": 100}
            if page_token:
                params["pageToken"] = page_token

            response = requests.get(models_url, headers=headers, params=params, timeout=20)
            response.raise_for_status()

            data = response.json()
            all_models.extend(data.get("publisherModels", []))

            page_token = data.get("nextPageToken")
            if not page_token:
                break

        # Process models into the expected format
        available = {}

        for model in all_models:
            model_name = model["name"].split("/")[-1]

            # Extract model info
            display_name = model.get("displayName", model_name)
            description = model.get("description", "")

            # Set caps based on model type
            if 'gemini-pro' in model_name.lower():
                input_cap = 128000  # 128K tokens
                output_cap = 8192  # 8K tokens
            elif 'gemini-flash' in model_name.lower():
                input_cap = 128000  # 128K tokens
                output_cap = 8192  # 8K tokens
            elif 'text-bison' in model_name.lower():
                input_cap = 8192  # 8K tokens
                output_cap = 1024  # 1K tokens
            else:
                input_cap = 128000  # Default
                output_cap = 8192  # Default

            available[model_name] = {
                'provider': 'google',
                'input_cap': input_cap,
                'output_cap': output_cap,
                'provider_model': model_name,
                'display_name': display_name,
                'description': description,
                'publisher': 'google',
                'location': region,
                'category': 'Google Vertex AI'
            }

        print(f"DEBUG: Vertex AI models fetched: {len(available)}")
        print(f"DEBUG: Vertex AI model IDs: {list(available.keys())}")
        return available

    except requests.exceptions.RequestException as e:
        print(f"HTTP error fetching Google Vertex AI models: {e}")
        return {}
    except json.JSONDecodeError as e:
        print(f"JSON parsing error for service account credentials: {e}")
        return {}
    except Exception as e:
        print(f"Failed to fetch Google Vertex AI models: {e}")
        return {}