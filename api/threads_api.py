from flask import Blueprint
from threads_crud_blueprint import threads_crud_bp
from threads_chat_blueprint import threads_chat_bp

# Main threads API blueprint that orchestrates sub-blueprints
threads_api = Blueprint('threads_api', __name__)

# Register sub-blueprints
threads_api.register_blueprint(threads_crud_bp)
threads_api.register_blueprint(threads_chat_bp)