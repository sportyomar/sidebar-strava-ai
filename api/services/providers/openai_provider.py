import os
import time
import openai
from typing import Dict, Any


class OpenAIProvider:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.api_base = "https://api.openai.com/v1"

        # Set up OpenAI client
        openai.api_key = api_key
        openai.api_type = "open_ai"
        openai.api_base = self.api_base

    def chat_completion(self, model_id: str, prompt: str, **kwargs) -> Dict[str, Any]:
        """Send a chat completion request to OpenAI API."""

        # Extract parameters with defaults
        temperature = kwargs.get('temperature', 0.7)
        max_tokens = kwargs.get('max_tokens', 512)

        try:
            response = openai.ChatCompletion.create(
                model=model_id,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=max_tokens
            )

            # Extract response data
            output_text = response.choices[0].message["content"]
            usage = response.usage

            return {
                'content': output_text,
                'usage': {
                    'prompt_tokens': usage.prompt_tokens,
                    'completion_tokens': usage.completion_tokens,
                    'total_tokens': usage.total_tokens
                },
                'finish_reason': response.choices[0].get('finish_reason', 'completed')
            }

        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")


# Legacy function for backward compatibility
def chat_completion(model, prompt, temperature=0.7, max_tokens=512):
    """
    Legacy function - use OpenAIProvider class instead.

    Send a chat completion request to OpenAI or Azure OpenAI.
    Returns a standardized dict:
    {
        "text": str,
        "tokens": int,
        "cost": float,
        "provider": "openai" or "azureopenai"
    }
    """
    # Load environment variables
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    AZURE_OPENAI_KEY = os.getenv("AZURE_OPENAI_KEY")
    AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
    AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")

    # Default: use OpenAI API unless Azure config is present
    USE_AZURE = bool(AZURE_OPENAI_KEY and AZURE_OPENAI_ENDPOINT)

    start_time = time.time()

    if USE_AZURE:
        openai.api_type = "azure"
        openai.api_key = AZURE_OPENAI_KEY
        openai.api_base = AZURE_OPENAI_ENDPOINT
        openai.api_version = "2023-05-15"  # Adjust if newer API version is needed

        response = openai.ChatCompletion.create(
            engine=AZURE_OPENAI_DEPLOYMENT,  # Azure uses "engine"
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens
        )
        provider_name = "azureopenai"
    else:
        openai.api_key = OPENAI_API_KEY
        openai.api_type = "open_ai"

        response = openai.ChatCompletion.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens
        )
        provider_name = "openai"

    # Extract text
    output_text = response.choices[0].message["content"]
    tokens_used = response.usage.total_tokens

    # Cost calculation (example rates — update if prices change)
    cost_per_1k_tokens = {
        "gpt-4o": 0.005,  # Prompt
        "gpt-4o-mini": 0.0003,
        "gpt-3.5-turbo": 0.0015
    }
    model_key = model if not USE_AZURE else AZURE_OPENAI_DEPLOYMENT
    cost = (tokens_used / 1000) * cost_per_1k_tokens.get(model_key, 0.0)

    latency = time.time() - start_time

    return {
        "text": output_text,
        "tokens": tokens_used,
        "cost": cost,
        "latency": latency,
        "provider": provider_name
    }