import os
import json
from typing import List, Dict, Any


def get_available_models() -> List[Dict[str, Any]]:
    """
    Get list of all available and approved models from the registry.

    Returns a list of models in the format expected by the API:
    [
        {
            'id': 'gpt-4o',
            'name': 'GPT-4o',
            'provider': 'OpenAI',
            'description': '...',
            'pricing': {...},
            ...
        }
    ]
    """
    try:
        # Load models configuration
        config_path = os.path.join(os.path.dirname(__file__), '..', 'config', 'models.json')

        with open(config_path, 'r') as f:
            config = json.load(f)

        models = []

        # Extract models from each provider
        for provider_name, provider_config in config.get('providers', {}).items():
            for model_key, model_info in provider_config.get('models', {}).items():
                # Only include approved models
                if model_info.get('approved', False):
                    models.append({
                        'id': model_info['id'],
                        'name': model_info['name'],
                        'provider': provider_config['provider_name'],
                        'provider_key': provider_name,
                        'description': model_info.get('description', ''),
                        'type': model_info.get('type', 'chat'),
                        'context_window': model_info.get('context_window', 0),
                        'max_output_tokens': model_info.get('max_output_tokens', 0),
                        'pricing': model_info.get('pricing', {}),
                        'use_cases': model_info.get('use_cases', []),
                        'default_parameters': model_info.get('default_parameters', {})
                    })

        return models

    except FileNotFoundError:
        print("Warning: models.json not found, returning empty model list")
        return []

    except json.JSONDecodeError as e:
        print(f"Warning: Invalid JSON in models.json: {e}")
        return []

    except Exception as e:
        print(f"Error loading models: {e}")
        return []


def get_model_by_id(model_id: str) -> Dict[str, Any]:
    """
    Get a specific model by its ID.

    Args:
        model_id: The model identifier

    Returns:
        Model information dict or None if not found
    """
    models = get_available_models()

    for model in models:
        if model['id'] == model_id:
            return model

    return None


def get_models_by_provider(provider_name: str) -> List[Dict[str, Any]]:
    """
    Get all models for a specific provider.

    Args:
        provider_name: Name of the provider (e.g., 'OpenAI', 'Anthropic')

    Returns:
        List of models for that provider
    """
    models = get_available_models()

    return [model for model in models if model['provider'] == provider_name]


def get_models_by_use_case(use_case: str) -> List[Dict[str, Any]]:
    """
    Get models suitable for a specific use case.

    Args:
        use_case: Use case string (e.g., 'cost_optimization', 'complex_reasoning')

    Returns:
        List of models that support the use case
    """
    models = get_available_models()

    return [model for model in models if use_case in model.get('use_cases', [])]


def validate_model_config() -> Dict[str, Any]:
    """
    Validate the models configuration file.

    Returns:
        Dict with validation results and any issues found
    """
    try:
        config_path = os.path.join(os.path.dirname(__file__), '..', 'config', 'models.json')

        with open(config_path, 'r') as f:
            config = json.load(f)

        issues = []
        model_count = 0
        approved_count = 0

        for provider_name, provider_config in config.get('providers', {}).items():
            if 'provider_name' not in provider_config:
                issues.append(f"Provider {provider_name} missing 'provider_name' field")

            for model_key, model_info in provider_config.get('models', {}).items():
                model_count += 1

                # Check required fields
                required_fields = ['id', 'name', 'type']
                for field in required_fields:
                    if field not in model_info:
                        issues.append(f"Model {model_key} missing required field: {field}")

                if model_info.get('approved', False):
                    approved_count += 1

                    # Check approval has date
                    if 'approved_date' not in model_info:
                        issues.append(f"Approved model {model_key} missing 'approved_date'")

        return {
            'valid': len(issues) == 0,
            'issues': issues,
            'total_models': model_count,
            'approved_models': approved_count,
            'config_version': config.get('version', 'unknown')
        }

    except Exception as e:
        return {
            'valid': False,
            'issues': [f"Failed to validate config: {str(e)}"],
            'total_models': 0,
            'approved_models': 0
        }