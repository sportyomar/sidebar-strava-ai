from flask import Blueprint, request, jsonify
import time
from services.model_router import route_to_model, get_available_models
from auth_blueprint import token_required
from api_keys_blueprint import get_user_api_key

ai_models_blueprint = Blueprint('ai_models', __name__)


def get_user_api_keys_dict(user_id):
    """Get all user's API keys in the format expected by model router."""
    api_keys = {}

    # Get API keys for each provider
    for provider in ['openai', 'anthropic', 'azure_openai']:
        key_data = get_user_api_key(user_id, provider)
        if key_data:
            api_keys[provider] = key_data

    return api_keys


@ai_models_blueprint.route('/models', methods=['GET'])
@token_required
def list_models(user_id):
    """List available AI models based on user's configured API keys."""
    try:
        # Get user's API keys
        user_api_keys = get_user_api_keys_dict(user_id)

        # Get available models based on user's keys
        models = get_available_models(user_api_keys=user_api_keys)

        return jsonify(models)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ai_models_blueprint.route('/chat', methods=['POST'])
@token_required
def chat_with_model(user_id):
    """Send a prompt to a selected AI model using user's API keys."""
    try:
        data = request.json
        model_id = data.get('model')
        prompt = data.get('prompt')

        if not model_id or not prompt:
            return jsonify({"error": "Missing model or prompt"}), 400

        # Get user's API keys
        user_api_keys = get_user_api_keys_dict(user_id)

        # Check if user has any API keys configured
        if not user_api_keys:
            return jsonify({
                "error": "No API keys configured. Please configure your API keys in the settings."
            }), 400

        start_time = time.time()

        # Route to model using user's API keys
        result = route_to_model(
            model_id=model_id,
            prompt=prompt,
            user_api_keys=user_api_keys,
            **data.get('parameters', {})  # Allow additional parameters
        )

        latency = time.time() - start_time

        # Check if there was an error in the model response
        if 'error' in result:
            return jsonify({
                "error": result['error'],
                "model": model_id,
                "prompt": prompt
            }), 400

        response = {
            "model": model_id,
            "prompt": prompt,
            "response": result['text'],
            "tokens_used": result['tokens'],
            "cost": result['cost'],
            "latency_seconds": latency,
            "provider": result['provider'],
            "usage": result.get('usage', {}),
            "finish_reason": result.get('finish_reason', 'completed')
        }

        return jsonify(response)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ai_models_blueprint.route('/models/<model_id>/info', methods=['GET'])
@token_required
def get_model_info(user_id, model_id):
    """Get detailed information about a specific model."""
    try:
        # Get user's API keys
        user_api_keys = get_user_api_keys_dict(user_id)

        # Create router instance with user's keys
        from services.model_router import ModelRouter
        router = ModelRouter(user_api_keys=user_api_keys)

        model_info = router.get_model_info(model_id)

        if not model_info:
            return jsonify({"error": "Model not found"}), 404

        return jsonify(model_info)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ai_models_blueprint.route('/user/providers', methods=['GET'])
@token_required
def get_user_providers(user_id):
    """Get status of user's configured providers."""
    try:
        providers_status = {}

        for provider in ['openai', 'anthropic', 'azure_openai']:
            key_data = get_user_api_key(user_id, provider)
            providers_status[provider] = {
                'configured': key_data is not None,
                'connected': key_data is not None,  # If key exists, assume it's tested and working
                'endpoint': key_data.get('endpoint_url') if key_data else None
            }

        return jsonify(providers_status)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


