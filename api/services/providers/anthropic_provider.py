from typing import Dict, Any


class AnthropicProvider:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.api_base = "https://api.anthropic.com"

    def chat_completion(self, model_id: str, prompt: str, **kwargs) -> Dict[str, Any]:
        """Placeholder - implement Anthropic API call here"""
        return {
            'content': f'Placeholder response from {model_id}',
            'usage': {
                'prompt_tokens': 10,
                'completion_tokens': 20,
                'total_tokens': 30
            },
            'finish_reason': 'completed'
        }