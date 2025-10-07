# model_sync_script.py
# Script to programmatically populate model hierarchy from OpenAI API

import requests
import psycopg2
import json
from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime


@dataclass
class ModelInfo:
    id: str
    object: str
    created: int
    owned_by: str


class ModelRegistrySync:
    def __init__(self, openai_api_key: str, db_config: dict):
        self.openai_api_key = openai_api_key
        self.db_config = db_config

    def fetch_openai_models(self) -> List[ModelInfo]:
        """Fetch all models from OpenAI API"""
        headers = {
            "Authorization": f"Bearer {self.openai_api_key}",
            "Content-Type": "application/json"
        }

        try:
            response = requests.get("https://api.openai.com/v1/models", headers=headers)
            response.raise_for_status()
            data = response.json()

            models = []
            for model_data in data.get('data', []):
                models.append(ModelInfo(
                    id=model_data['id'],
                    object=model_data['object'],
                    created=model_data['created'],
                    owned_by=model_data['owned_by']
                ))

            return models
        except requests.RequestException as e:
            print(f"Error fetching OpenAI models: {e}")
            return []

    def categorize_model(self, model_id: str) -> dict:
        """Categorize model into hierarchy based on model ID patterns"""
        model_id_lower = model_id.lower()

        # Determine family
        if 'gpt-5' in model_id_lower:
            family_slug = 'gpt5'
            family_id = 3  # Based on our schema
        elif 'gpt-4' in model_id_lower:
            family_slug = 'gpt4'
            family_id = 1
        elif 'gpt-3.5' in model_id_lower:
            family_slug = 'gpt35'
            family_id = 2
        elif 'o1' in model_id_lower or 'o3' in model_id_lower:
            family_slug = 'gpt4'  # Reasoning models in GPT-4 family
            family_id = 1
        else:
            family_slug = 'legacy'
            family_id = None  # We'd need to create this family

        # Determine category
        if any(x in model_id_lower for x in ['reasoning', 'o1', 'o3']):
            category = 'Reasoning'
        elif any(x in model_id_lower for x in ['vision', 'gpt-4o', 'dall']):
            category = 'Vision'
        elif 'turbo' in model_id_lower:
            category = 'General'
        elif any(x in model_id_lower for x in ['instruct', 'text']):
            category = 'Specialized'
        else:
            category = 'General'

        # Create display name
        display_name = model_id.replace('-', ' ').title()
        display_name = display_name.replace('Gpt', 'GPT')

        return {
            'family_id': family_id,
            'family_slug': family_slug,
            'category': category,
            'display_name': display_name,
            'description': self._generate_description(model_id, category)
        }

    def _generate_description(self, model_id: str, category: str) -> str:
        """Generate description based on model ID and category"""
        descriptions = {
            'gpt-4': 'Most capable GPT-4 model for complex reasoning tasks',
            'gpt-4-turbo': 'Faster and more efficient GPT-4 variant',
            'gpt-4o': 'GPT-4 with vision and multimodal capabilities',
            'gpt-3.5-turbo': 'Fast and efficient model for most tasks',
            'gpt-5-chat': 'Next generation model with advanced capabilities'
        }

        # Try exact match first
        for key, desc in descriptions.items():
            if key in model_id.lower():
                return desc

        # Fallback based on category
        category_descriptions = {
            'Reasoning': 'Advanced reasoning and problem-solving capabilities',
            'Vision': 'Image understanding and multimodal processing',
            'General': 'Balanced performance for most tasks',
            'Specialized': 'Task-specific capabilities'
        }

        return category_descriptions.get(category, 'OpenAI language model')

    def get_model_pricing(self, model_id: str) -> dict:
        """Get pricing info - would need to be manually maintained or scraped"""
        # Since OpenAI doesn't provide pricing via API, we maintain a lookup table
        # This would need to be updated manually or scraped from their pricing page
        pricing_data = {
            'gpt-4': {'input': 30.00, 'output': 60.00},
            'gpt-4-turbo': {'input': 10.00, 'output': 30.00},
            'gpt-4o': {'input': 5.00, 'output': 15.00},
            'gpt-3.5-turbo': {'input': 0.50, 'output': 1.50},
            'gpt-5-chat-latest': {'input': 15.00, 'output': 45.00}
        }

        # Try exact match or partial match
        for key, prices in pricing_data.items():
            if key in model_id.lower():
                return prices

        return {'input': 0.00, 'output': 0.00}  # Default for unknown models

    def sync_to_database(self, models: List[ModelInfo]):
        """Sync models to the model_registry table"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cur = conn.cursor()

            for model in models:
                # Skip non-OpenAI models and fine-tuned models
                if model.owned_by != 'openai' or ':' in model.id:
                    continue

                categorization = self.categorize_model(model.id)
                pricing = self.get_model_pricing(model.id)

                # Check if model already exists
                cur.execute(
                    "SELECT id FROM model_registry WHERE model_id = %s",
                    (model.id,)
                )

                if cur.fetchone():
                    # Update existing
                    cur.execute("""
                        UPDATE model_registry SET
                            family_id = %s,
                            display_name = %s,
                            category = %s,
                            description = %s,
                            price_per_million_input_tokens = %s,
                            price_per_million_output_tokens = %s,
                            updated_at = %s
                        WHERE model_id = %s
                    """, (
                        categorization['family_id'],
                        categorization['display_name'],
                        categorization['category'],
                        categorization['description'],
                        pricing['input'],
                        pricing['output'],
                        datetime.now(),
                        model.id
                    ))
                    print(f"Updated model: {model.id}")
                else:
                    # Insert new
                    cur.execute("""
                        INSERT INTO model_registry (
                            model_id, family_id, display_name, category, description,
                            price_per_million_input_tokens, price_per_million_output_tokens,
                            rating, suggested_temperature
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        model.id,
                        categorization['family_id'],
                        categorization['display_name'],
                        categorization['category'],
                        categorization['description'],
                        pricing['input'],
                        pricing['output'],
                        4.5,  # Default rating
                        0.7  # Default temperature
                    ))
                    print(f"Inserted model: {model.id}")

            conn.commit()
            print(f"Successfully synced {len(models)} models to database")

        except psycopg2.Error as e:
            print(f"Database error: {e}")
            conn.rollback()
        finally:
            cur.close()
            conn.close()

    def run_sync(self):
        """Main sync process"""
        print("Fetching models from OpenAI API...")
        models = self.fetch_openai_models()

        if not models:
            print("No models fetched from OpenAI API")
            return

        print(f"Fetched {len(models)} models from OpenAI")

        # Filter to only OpenAI-owned models
        openai_models = [m for m in models if m.owned_by == 'openai']
        print(f"Found {len(openai_models)} OpenAI-owned models")

        print("Syncing to database...")
        self.sync_to_database(openai_models)
        print("Sync complete!")


# Usage
if __name__ == "__main__":
    # Configuration
    OPENAI_API_KEY = "your-openai-api-key"

    DB_CONFIG = {
        "host": "localhost",
        "port": 5432,
        "database": "account_management_db",
        "user": "sporty",
        "password": "TqKwifr5jtJ6"
    }

    # Run sync
    sync = ModelRegistrySync(OPENAI_API_KEY, DB_CONFIG)
    sync.run_sync()

# Alternative: Manual data based on OpenAI's current model list
# This could be used if API access is limited
MANUAL_OPENAI_MODELS = {
    # GPT-4 Family
    "gpt-4": {"family": "gpt4", "category": "Reasoning", "pricing": {"input": 30.00, "output": 60.00}},
    "gpt-4-turbo": {"family": "gpt4", "category": "General", "pricing": {"input": 10.00, "output": 30.00}},
    "gpt-4o": {"family": "gpt4", "category": "Vision", "pricing": {"input": 5.00, "output": 15.00}},
    "gpt-4o-mini": {"family": "gpt4", "category": "General", "pricing": {"input": 0.15, "output": 0.60}},

    # GPT-3.5 Family
    "gpt-3.5-turbo": {"family": "gpt35", "category": "General", "pricing": {"input": 0.50, "output": 1.50}},

    # GPT-5 Family (if available)
    "gpt-5-chat-latest": {"family": "gpt5", "category": "Reasoning", "pricing": {"input": 15.00, "output": 45.00}},

    # O1 Series (Reasoning)
    "o1-preview": {"family": "gpt4", "category": "Reasoning", "pricing": {"input": 15.00, "output": 60.00}},
    "o1-mini": {"family": "gpt4", "category": "Reasoning", "pricing": {"input": 3.00, "output": 12.00}},
}