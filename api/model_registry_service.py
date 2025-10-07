# model_registry_service.py
"""
Model Registry Microservice
Manages AI model availability, mappings, and metadata across providers
"""

from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from datetime import datetime, timedelta
import json
import os
import logging
from typing import Dict, List, Optional
import threading
import time
from dataclasses import dataclass
from enum import Enum

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///model_registry.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-key-change-in-production')

db = SQLAlchemy(app)
migrate = Migrate(app, db)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ProviderStatus(Enum):
    ACTIVE = "active"
    DEPRECATED = "deprecated"
    UNAVAILABLE = "unavailable"


class ModelStatus(Enum):
    AVAILABLE = "available"
    DEPRECATED = "deprecated"
    UNAVAILABLE = "unavailable"
    RATE_LIMITED = "rate_limited"


# Database Models
class Provider(db.Model):
    __tablename__ = 'providers'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)  # openai, anthropic, azureopenai
    display_name = db.Column(db.String(100), nullable=False)
    status = db.Column(db.Enum(ProviderStatus), default=ProviderStatus.ACTIVE)
    api_base_url = db.Column(db.String(200))
    min_sdk_version = db.Column(db.String(20))
    last_sync = db.Column(db.DateTime)
    sync_error = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    models = db.relationship('Model', backref='provider', lazy=True, cascade='all, delete-orphan')
    ui_mappings = db.relationship('UIModelMapping', backref='provider', lazy=True)


class Model(db.Model):
    __tablename__ = 'models'

    id = db.Column(db.Integer, primary_key=True)
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=False)
    model_id = db.Column(db.String(100), nullable=False)  # Actual API model ID
    deployment_name = db.Column(db.String(100))  # For Azure deployments
    display_name = db.Column(db.String(100))
    status = db.Column(db.Enum(ModelStatus), default=ModelStatus.AVAILABLE)
    max_tokens = db.Column(db.Integer)
    context_length = db.Column(db.Integer)
    supports_tools = db.Column(db.Boolean, default=False)
    supports_vision = db.Column(db.Boolean, default=False)
    cost_per_input_token = db.Column(db.Float)
    cost_per_output_token = db.Column(db.Float)
    rate_limit_rpm = db.Column(db.Integer)  # Requests per minute
    rate_limit_tpm = db.Column(db.Integer)  # Tokens per minute
    metadata = db.Column(db.JSON)  # Additional provider-specific metadata
    last_verified = db.Column(db.DateTime)
    verification_error = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Unique constraint
    __table_args__ = (db.UniqueConstraint('provider_id', 'model_id', name='_provider_model_uc'),)


class UIModelMapping(db.Model):
    __tablename__ = 'ui_model_mappings'

    id = db.Column(db.Integer, primary_key=True)
    ui_name = db.Column(db.String(100), unique=True, nullable=False)  # What users see
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=False)
    primary_model_id = db.Column(db.Integer, db.ForeignKey('models.id'), nullable=False)
    fallback_models = db.Column(db.JSON)  # List of model IDs to try if primary fails
    display_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    primary_model = db.relationship('Model', foreign_keys=[primary_model_id])


class SyncLog(db.Model):
    __tablename__ = 'sync_logs'

    id = db.Column(db.Integer, primary_key=True)
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'))
    sync_type = db.Column(db.String(50))  # 'models', 'verification', 'full'
    status = db.Column(db.String(20))  # 'success', 'error', 'partial'
    models_added = db.Column(db.Integer, default=0)
    models_updated = db.Column(db.Integer, default=0)
    models_removed = db.Column(db.Integer, default=0)
    duration_seconds = db.Column(db.Float)
    error_message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# Provider Adapters
class ProviderAdapter:
    """Base class for provider-specific adapters"""

    def fetch_models(self, api_key: str) -> List[Dict]:
        raise NotImplementedError

    def verify_model(self, api_key: str, model_id: str) -> Dict:
        raise NotImplementedError


class OpenAIAdapter(ProviderAdapter):
    def fetch_models(self, api_key: str) -> List[Dict]:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=api_key)

            models = client.models.list()
            result = []

            for model in models.data:
                # Filter to only include chat models
                if any(x in model.id.lower() for x in ['gpt', 'o1']):
                    result.append({
                        'model_id': model.id,
                        'display_name': model.id,
                        'max_tokens': self._get_max_tokens(model.id),
                        'context_length': self._get_context_length(model.id),
                        'supports_tools': self._supports_tools(model.id),
                        'supports_vision': self._supports_vision(model.id),
                        'metadata': {
                            'created': getattr(model, 'created', None),
                            'owned_by': getattr(model, 'owned_by', None)
                        }
                    })

            return result
        except Exception as e:
            logger.error(f"OpenAI model fetch failed: {e}")
            raise

    def verify_model(self, api_key: str, model_id: str) -> Dict:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=api_key)

            # Quick test call
            response = client.chat.completions.create(
                model=model_id,
                messages=[{"role": "user", "content": "Hi"}],
                max_tokens=5
            )

            return {
                'status': 'available',
                'verified_at': datetime.utcnow(),
                'test_response': response.choices[0].message.content
            }
        except Exception as e:
            return {
                'status': 'error',
                'verified_at': datetime.utcnow(),
                'error': str(e)
            }

    def _get_max_tokens(self, model_id: str) -> int:
        # Known OpenAI model limits
        limits = {
            'gpt-4o': 4096,
            'gpt-4o-mini': 16384,
            'gpt-4-turbo': 4096,
            'gpt-4': 8192,
            'gpt-3.5-turbo': 4096
        }

        for pattern, limit in limits.items():
            if pattern in model_id:
                return limit
        return 4096  # Default

    def _get_context_length(self, model_id: str) -> int:
        # Known context lengths
        lengths = {
            'gpt-4o': 128000,
            'gpt-4o-mini': 128000,
            'gpt-4-turbo': 128000,
            'gpt-4': 8192,
            'gpt-3.5-turbo': 16385
        }

        for pattern, length in lengths.items():
            if pattern in model_id:
                return length
        return 8192  # Default

    def _supports_tools(self, model_id: str) -> bool:
        return 'gpt-3.5' in model_id or 'gpt-4' in model_id

    def _supports_vision(self, model_id: str) -> bool:
        return any(x in model_id for x in ['gpt-4o', 'gpt-4-turbo', 'gpt-4-vision'])


class AnthropicAdapter(ProviderAdapter):
    def fetch_models(self, api_key: str) -> List[Dict]:
        # Anthropic doesn't have a models.list() endpoint, so we maintain a known list
        known_models = [
            {
                'model_id': 'claude-3-5-sonnet-20241022',
                'display_name': 'Claude 3.5 Sonnet',
                'max_tokens': 8192,
                'context_length': 200000,
                'supports_tools': True,
                'supports_vision': True
            },
            {
                'model_id': 'claude-3-opus-20240229',
                'display_name': 'Claude 3 Opus',
                'max_tokens': 4096,
                'context_length': 200000,
                'supports_tools': True,
                'supports_vision': True
            },
            {
                'model_id': 'claude-3-sonnet-20240229',
                'display_name': 'Claude 3 Sonnet',
                'max_tokens': 4096,
                'context_length': 200000,
                'supports_tools': True,
                'supports_vision': True
            },
            {
                'model_id': 'claude-3-haiku-20240307',
                'display_name': 'Claude 3 Haiku',
                'max_tokens': 4096,
                'context_length': 200000,
                'supports_tools': True,
                'supports_vision': True
            }
        ]

        return known_models

    def verify_model(self, api_key: str, model_id: str) -> Dict:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)

            response = client.messages.create(
                model=model_id,
                max_tokens=5,
                messages=[{"role": "user", "content": "Hi"}]
            )

            return {
                'status': 'available',
                'verified_at': datetime.utcnow(),
                'test_response': response.content[0].text if response.content else ''
            }
        except Exception as e:
            return {
                'status': 'error',
                'verified_at': datetime.utcnow(),
                'error': str(e)
            }


# Provider Registry
ADAPTERS = {
    'openai': OpenAIAdapter(),
    'anthropic': AnthropicAdapter()
}


# Core Service Classes
class ModelSyncService:
    """Handles syncing models from providers"""

    @staticmethod
    def sync_provider_models(provider_name: str, api_key: str) -> Dict:
        """Sync models for a specific provider"""
        start_time = time.time()

        try:
            provider = Provider.query.filter_by(name=provider_name).first()
            if not provider:
                raise ValueError(f"Unknown provider: {provider_name}")

            adapter = ADAPTERS.get(provider_name)
            if not adapter:
                raise ValueError(f"No adapter for provider: {provider_name}")

            # Fetch models from provider
            logger.info(f"Fetching models from {provider_name}")
            models_data = adapter.fetch_models(api_key)

            models_added = 0
            models_updated = 0

            for model_data in models_data:
                existing_model = Model.query.filter_by(
                    provider_id=provider.id,
                    model_id=model_data['model_id']
                ).first()

                if existing_model:
                    # Update existing model
                    for key, value in model_data.items():
                        if key != 'model_id' and hasattr(existing_model, key):
                            setattr(existing_model, key, value)
                    existing_model.updated_at = datetime.utcnow()
                    models_updated += 1
                else:
                    # Create new model
                    new_model = Model(
                        provider_id=provider.id,
                        **model_data
                    )
                    db.session.add(new_model)
                    models_added += 1

            # Update provider sync time
            provider.last_sync = datetime.utcnow()
            provider.sync_error = None

            db.session.commit()

            duration = time.time() - start_time

            # Log sync
            sync_log = SyncLog(
                provider_id=provider.id,
                sync_type='models',
                status='success',
                models_added=models_added,
                models_updated=models_updated,
                duration_seconds=duration
            )
            db.session.add(sync_log)
            db.session.commit()

            logger.info(f"Sync completed for {provider_name}: +{models_added}, ~{models_updated} in {duration:.2f}s")

            return {
                'status': 'success',
                'provider': provider_name,
                'models_added': models_added,
                'models_updated': models_updated,
                'duration': duration
            }

        except Exception as e:
            logger.error(f"Sync failed for {provider_name}: {e}")

            # Log error
            if 'provider' in locals():
                provider.sync_error = str(e)
                db.session.commit()

                sync_log = SyncLog(
                    provider_id=provider.id,
                    sync_type='models',
                    status='error',
                    error_message=str(e),
                    duration_seconds=time.time() - start_time
                )
                db.session.add(sync_log)
                db.session.commit()

            return {
                'status': 'error',
                'provider': provider_name,
                'error': str(e)
            }


class ModelQueryService:
    """Handles querying and mapping models"""

    @staticmethod
    def get_ui_models(include_inactive: bool = False) -> List[Dict]:
        """Get all UI model mappings with their details"""
        query = UIModelMapping.query
        if not include_inactive:
            query = query.filter_by(is_active=True)

        mappings = query.order_by(UIModelMapping.display_order).all()

        result = []
        for mapping in mappings:
            primary_model = mapping.primary_model
            provider = mapping.provider

            # Get fallback models
            fallback_models = []
            if mapping.fallback_models:
                for fallback_id in mapping.fallback_models:
                    fallback = Model.query.get(fallback_id)
                    if fallback:
                        fallback_models.append({
                            'model_id': fallback.model_id,
                            'status': fallback.status.value
                        })

            result.append({
                'ui_name': mapping.ui_name,
                'provider': provider.name,
                'provider_display_name': provider.display_name,
                'primary_model': {
                    'model_id': primary_model.model_id,
                    'deployment_name': primary_model.deployment_name,
                    'display_name': primary_model.display_name,
                    'status': primary_model.status.value,
                    'max_tokens': primary_model.max_tokens,
                    'context_length': primary_model.context_length,
                    'supports_tools': primary_model.supports_tools,
                    'supports_vision': primary_model.supports_vision,
                    'last_verified': primary_model.last_verified.isoformat() if primary_model.last_verified else None
                },
                'fallback_models': fallback_models,
                'is_active': mapping.is_active
            })

        return result

    @staticmethod
    def get_model_for_request(ui_name: str) -> Optional[Dict]:
        """Get the best available model for a UI request"""
        mapping = UIModelMapping.query.filter_by(ui_name=ui_name, is_active=True).first()
        if not mapping:
            return None

        # Check primary model first
        primary = mapping.primary_model
        if primary.status == ModelStatus.AVAILABLE:
            return {
                'provider': mapping.provider.name,
                'model_id': primary.model_id,
                'deployment_name': primary.deployment_name,
                'is_fallback': False
            }

        # Try fallback models
        if mapping.fallback_models:
            for fallback_id in mapping.fallback_models:
                fallback = Model.query.get(fallback_id)
                if fallback and fallback.status == ModelStatus.AVAILABLE:
                    return {
                        'provider': mapping.provider.name,
                        'model_id': fallback.model_id,
                        'deployment_name': fallback.deployment_name,
                        'is_fallback': True,
                        'fallback_reason': f"Primary model {primary.model_id} unavailable"
                    }

        return None


# Background Sync Scheduler
class SyncScheduler:
    """Handles scheduled syncing of models"""

    def __init__(self):
        self.running = False
        self.thread = None

    def start(self):
        """Start the background sync scheduler"""
        self.running = True
        self.thread = threading.Thread(target=self._sync_loop, daemon=True)
        self.thread.start()
        logger.info("Sync scheduler started")

    def stop(self):
        """Stop the background sync scheduler"""
        self.running = False
        if self.thread:
            self.thread.join()
        logger.info("Sync scheduler stopped")

    def _sync_loop(self):
        """Main sync loop - runs every 24 hours"""
        while self.running:
            try:
                self._daily_sync()
            except Exception as e:
                logger.error(f"Daily sync failed: {e}")

            # Sleep for 24 hours (or until stopped)
            for _ in range(24 * 60 * 6):  # Check every 10 seconds for 24 hours
                if not self.running:
                    break
                time.sleep(10)

    def _daily_sync(self):
        """Perform daily sync of all active providers"""
        logger.info("Starting daily model sync")

        providers = Provider.query.filter_by(status=ProviderStatus.ACTIVE).all()

        for provider in providers:
            # You would get API keys from your secure storage
            # For now, we'll skip if no API key is configured
            api_key = os.getenv(f'{provider.name.upper()}_API_KEY')
            if not api_key:
                logger.warning(f"No API key configured for {provider.name}")
                continue

            try:
                result = ModelSyncService.sync_provider_models(provider.name, api_key)
                logger.info(f"Synced {provider.name}: {result}")
            except Exception as e:
                logger.error(f"Failed to sync {provider.name}: {e}")

        logger.info("Daily sync completed")


# Initialize scheduler
scheduler = SyncScheduler()


# API Routes
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'providers_count': Provider.query.count(),
        'models_count': Model.query.count(),
        'ui_mappings_count': UIModelMapping.query.count()
    })


@app.route('/providers', methods=['GET'])
def get_providers():
    """Get all providers"""
    providers = Provider.query.all()
    return jsonify([{
        'id': p.id,
        'name': p.name,
        'display_name': p.display_name,
        'status': p.status.value,
        'last_sync': p.last_sync.isoformat() if p.last_sync else None,
        'models_count': len(p.models)
    } for p in providers])


@app.route('/models', methods=['GET'])
def get_models():
    """Get UI model mappings"""
    include_inactive = request.args.get('include_inactive', 'false').lower() == 'true'
    models = ModelQueryService.get_ui_models(include_inactive)
    return jsonify(models)


@app.route('/models/<ui_name>', methods=['GET'])
def get_model_details(ui_name: str):
    """Get details for a specific UI model"""
    model = ModelQueryService.get_model_for_request(ui_name)
    if not model:
        return jsonify({'error': 'Model not found'}), 404
    return jsonify(model)


@app.route('/sync/<provider_name>', methods=['POST'])
def sync_provider(provider_name: str):
    """Manually trigger sync for a provider"""
    data = request.get_json() or {}
    api_key = data.get('api_key')

    if not api_key:
        return jsonify({'error': 'API key required'}), 400

    result = ModelSyncService.sync_provider_models(provider_name, api_key)

    if result['status'] == 'error':
        return jsonify(result), 500

    return jsonify(result)


@app.route('/sync-logs', methods=['GET'])
def get_sync_logs():
    """Get recent sync logs"""
    limit = request.args.get('limit', 50, type=int)
    logs = SyncLog.query.order_by(SyncLog.created_at.desc()).limit(limit).all()

    return jsonify([{
        'id': log.id,
        'provider': log.provider.name if log.provider else None,
        'sync_type': log.sync_type,
        'status': log.status,
        'models_added': log.models_added,
        'models_updated': log.models_updated,
        'models_removed': log.models_removed,
        'duration_seconds': log.duration_seconds,
        'error_message': log.error_message,
        'created_at': log.created_at.isoformat()
    } for log in logs])


# Admin Routes (you might want to add authentication)
@app.route('/admin/mappings', methods=['POST'])
def create_ui_mapping():
    """Create a new UI model mapping"""
    data = request.get_json()

    # Validate required fields
    required = ['ui_name', 'provider_name', 'primary_model_id']
    for field in required:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400

    provider = Provider.query.filter_by(name=data['provider_name']).first()
    if not provider:
        return jsonify({'error': 'Provider not found'}), 404

    primary_model = Model.query.filter_by(
        provider_id=provider.id,
        model_id=data['primary_model_id']
    ).first()
    if not primary_model:
        return jsonify({'error': 'Primary model not found'}), 404

    mapping = UIModelMapping(
        ui_name=data['ui_name'],
        provider_id=provider.id,
        primary_model_id=primary_model.id,
        fallback_models=data.get('fallback_models', []),
        display_order=data.get('display_order', 0)
    )

    db.session.add(mapping)
    db.session.commit()

    return jsonify({'message': 'Mapping created', 'id': mapping.id}), 201


@app.route('/admin/mappings/<int:mapping_id>', methods=['PUT'])
def update_ui_mapping(mapping_id: int):
    """Update a UI model mapping"""
    mapping = UIModelMapping.query.get_or_404(mapping_id)
    data = request.get_json()

    # Update allowed fields
    for field in ['fallback_models', 'display_order', 'is_active']:
        if field in data:
            setattr(mapping, field, data[field])

    mapping.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({'message': 'Mapping updated'})


# Initialize database and default data
def init_db():
    """Initialize database with default providers"""
    db.create_all()

    # Create default providers if they don't exist
    providers_data = [
        {
            'name': 'openai',
            'display_name': 'OpenAI',
            'api_base_url': 'https://api.openai.com/v1',
            'min_sdk_version': '1.30.0'
        },
        {
            'name': 'anthropic',
            'display_name': 'Anthropic',
            'api_base_url': 'https://api.anthropic.com',
            'min_sdk_version': '0.25.0'
        }
    ]

    for provider_data in providers_data:
        existing = Provider.query.filter_by(name=provider_data['name']).first()
        if not existing:
            provider = Provider(**provider_data)
            db.session.add(provider)

    db.session.commit()
    logger.info("Database initialized")


if __name__ == '__main__':
    init_db()

    # Start background scheduler
    scheduler.start()

    try:
        app.run(host='0.0.0.0', port=5001, debug=True)
    finally:
        scheduler.stop()