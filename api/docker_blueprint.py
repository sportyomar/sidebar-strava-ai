# docker_blueprint.py
from flask import Blueprint, request, jsonify
import docker
from docker.errors import DockerException
import random
import string
import time

docker_bp = Blueprint('docker', __name__, url_prefix='/api/docker')

def get_docker_client():
    try:
        return docker.from_env()
    except DockerException as e:
        print(f"⚠️ Docker not available: {e}")
        return None

# Minimal endpoint example
@docker_bp.route('/list', methods=['GET'])
def list_containers():
    docker_client = get_docker_client()
    if not docker_client:
        return jsonify({"error": "Docker is not running"}), 503

    containers = docker_client.containers.list(all=True)
    result = []
    for c in containers:
        result.append({
            "id": c.id,
            "name": c.name,
            "status": c.status,
            "image": c.image.tags,
            "created": c.attrs['Created']
        })

    return jsonify(result)
