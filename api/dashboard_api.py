import json
from flask import Blueprint, jsonify

portfolio_api = Blueprint('portfolio_api', __name__)

@portfolio_api.route('/api/dashboard/<instance_name>', methods=['GET'])
def get_portfolio_dashboard(instance_name):
    # For prototype: load from static JSON file
    with open('data/projects/my-project/portfolio_dashboard_q3_2024.json') as f:
        dashboard_data = json.load(f)
    return jsonify(dashboard_data)
