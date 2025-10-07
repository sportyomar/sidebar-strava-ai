import os
import json
import time
from typing import Dict, Any, Optional
from services.providers.openai_provider import OpenAIProvider
from services.providers.anthropic_provider import AnthropicProvider
from services.providers.azure_openai_provider import AzureOpenAIProvider


class ModelRouter:
    def __init__(self, user_api_keys=None):
        self.models_config = self._load_models_config()
        self.user_api_keys = user_api_keys or {}
        self.providers = self._initialize_providers()

    def _load_models_config(self) -> Dict[str, Any]:
        """Load the approved models configuration."""
        config_path = os.path.join(os.path.dirname(__file__), '..', 'config', 'models.json')
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            raise Exception("models.json configuration file not found")
        except json.JSONDecodeError:
            raise Exception("Invalid JSON in models.json configuration file")

    def _initialize_providers(self) -> Dict[str, Any]:
        """Initialize providers based on user's API keys."""
        providers = {}

        # Initialize OpenAI provider
        openai_keys = self.user_api_keys.get('openai')
        if openai_keys and openai_keys.get('api_key'):
            providers['openai'] = OpenAIProvider(api_key=openai_keys['api_key'])

        # Initialize Anthropic provider
        anthropic_keys = self.user_api_keys.get('anthropic')
        if anthropic_keys and anthropic_keys.get('api_key'):
            providers['anthropic'] = AnthropicProvider(api_key=anthropic_keys['api_key'])

        # Initialize Azure OpenAI provider
        azure_keys = self.user_api_keys.get('azure_openai')
        if azure_keys and azure_keys.get('api_key') and azure_keys.get('endpoint_url'):
            providers['azure_openai'] = AzureOpenAIProvider(
                api_key=azure_keys['api_key'],
                endpoint=azure_keys['endpoint_url'],
                api_version=azure_keys.get('api_version', '2024-02-15-preview')
            )

        return providers

    def _find_model_info(self, model_id: str) -> tuple[str, Dict[str, Any]]:
        """Find which provider handles the given model and return model info."""
        for provider_name, provider_config in self.models_config['providers'].items():
            for model_key, model_info in provider_config['models'].items():
                if model_info['id'] == model_id or model_key == model_id:
                    if not model_info.get('approved', False):
                        raise Exception(f"Model {model_id} is not approved for use")
                    return provider_name, model_info

        raise Exception(f"Model {model_id} not found in approved model registry")

    def get_available_models(self) -> list[Dict[str, Any]]:
        """Get list of available models based on user's configured API keys."""
        models = []

        for provider_name, provider_config in self.models_config['providers'].items():
            # Only include models if the user has API keys for this provider
            if provider_name not in self.providers:
                continue

            for model_key, model_info in provider_config['models'].items():
                if model_info.get('approved', False):
                    models.append({
                        'id': model_info['id'],
                        'name': model_info['name'],
                        'provider': provider_config['provider_name'],
                        'provider_key': provider_name,
                        'description': model_info.get('description', ''),
                        'use_cases': model_info.get('use_cases', []),
                        'pricing': model_info.get('pricing', {}),
                        'context_window': model_info.get('context_window', 0),
                        'max_output_tokens': model_info.get('max_output_tokens', 0)
                    })

        return models

    def route_to_model(self, model_id: str, prompt: str, **kwargs) -> Dict[str, Any]:
        """Route a prompt to the appropriate model using user's API keys."""
        start_time = time.time()

        try:
            # Find which provider handles this model
            provider_name, model_info = self._find_model_info(model_id)

            # Check if provider is available for this user
            if provider_name not in self.providers:
                raise Exception(f"Provider {provider_name} not configured or API key not available")

            # Get the provider instance
            provider = self.providers[provider_name]

            # Merge default parameters with provided kwargs
            parameters = model_info.get('default_parameters', {}).copy()
            parameters.update(kwargs)

            # Route to appropriate provider
            response = provider.chat_completion(
                model_id=model_info['id'],
                prompt=prompt,
                **parameters
            )

            # Calculate latency
            latency = time.time() - start_time

            # Calculate cost
            cost = self._calculate_cost(model_info, response.get('usage', {}))

            # Return standardized response
            return {
                'text': response.get('content', ''),
                'tokens': response.get('usage', {}).get('total_tokens', 0),
                'cost': cost,
                'latency_seconds': latency,
                'provider': provider_name,
                'model_id': model_id,
                'usage': response.get('usage', {}),
                'finish_reason': response.get('finish_reason', 'completed')
            }

        except Exception as e:
            return {
                'text': f'Error: {str(e)}',
                'tokens': 0,
                'cost': 0.0,
                'latency_seconds': time.time() - start_time,
                'provider': provider_name if 'provider_name' in locals() else 'unknown',
                'model_id': model_id,
                'error': str(e)
            }

    def _calculate_cost(self, model_info: Dict[str, Any], usage: Dict[str, Any]) -> float:
        """Calculate the cost of the API call based on token usage."""
        pricing = model_info.get('pricing', {})

        input_tokens = usage.get('prompt_tokens', 0)
        output_tokens = usage.get('completion_tokens', 0)

        input_cost = (input_tokens / 1000) * pricing.get('input_cost_per_1k_tokens', 0)
        output_cost = (output_tokens / 1000) * pricing.get('output_cost_per_1k_tokens', 0)

        return round(input_cost + output_cost, 6)

    def get_model_info(self, model_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific model."""
        try:
            provider_name, model_info = self._find_model_info(model_id)
            return {
                **model_info,
                'provider_name': provider_name,
                'available': provider_name in self.providers
            }
        except Exception:
            return None


# Updated functions for the blueprint
def route_to_model(model_id: str, prompt: str, user_api_keys: Dict[str, Any] = None, **kwargs) -> Dict[str, Any]:
    """Route a prompt to the appropriate model using user's API keys."""
    router = ModelRouter(user_api_keys=user_api_keys)
    return router.route_to_model(model_id, prompt, **kwargs)


def get_available_models(user_api_keys: Dict[str, Any] = None) -> list[Dict[str, Any]]:
    """Get list of available models based on user's API keys."""
    router = ModelRouter(user_api_keys=user_api_keys)
    return router.get_available_models()