from flask import Flask, jsonify, session, redirect, request
from flask_cors import CORS
from flask_session import Session
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from dotenv import load_dotenv
import os
import json
import datetime
import logging
import traceback
from decimal import Decimal

# Load env vars
load_dotenv()
os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

# Local config paths
DATA_DIR = "/Users/sporty/PycharmProjects/memory_issue/Sidebar/sidebar/src/data/private_equity_firms/standardized"
TEAM_DIR = "/Users/sporty/PycharmProjects/memory_issue/Sidebar/sidebar/src/data/private_equity_firms/teams"
PORTCO_TEAM_DIR = "/Users/sporty/PycharmProjects/memory_issue/Sidebar/sidebar/src/data/private_equity_firms/portfolio_management_teams"
PORTCO_DATA_SOURCES_DIR = "/Users/sporty/PycharmProjects/memory_issue/Sidebar/sidebar/src/data/private_equity_firms/portfolio_data_sources"

# Flask setup
app = Flask(__name__, static_url_path='/static', static_folder='static')
# Enable debug mode and detailed logging
app.config['DEBUG'] = True
logging.basicConfig(level=logging.DEBUG)

# Add error handler to see full tracebacks
@app.errorhandler(500)
def internal_error(error):
    app.logger.error(f"500 error: {error}")
    app.logger.error(f"Traceback: {traceback.format_exc()}")
    return jsonify({'error': 'Internal server error', 'details': str(error)}), 500
CORS(app, resources={
    r"/api/*": {"origins": "http://localhost:3000"}
}, supports_credentials=True)
app.config['SESSION_TYPE'] = 'filesystem'
Session(app)

# class DecimalEncoder(json.JSONEncoder):
#     def default(self, obj):
#         if isinstance(obj, Decimal):
#             return float(obj)
#         return super().default(obj)
#
# app.json_encoder = DecimalEncoder
# app.config['RESTFUL_JSON'] = {'cls': DecimalEncoder}

# Blueprints
from export_blueprint import export_bp
from database_api import database_api
from dashboard_api import portfolio_api
from step_01_filesystem_scanning import step_01_bp
from step_01_persistence import step_01_persistence
from step_02_ast_parsing import step_02_bp
from auth_blueprint import auth_bp
from user_blueprint import user_bp
from projects_blueprint import projects_api
from api_models_blueprint import ai_models_blueprint
from api_keys_blueprint import api_keys_bp
from profiles_api import profiles_bp
from modules_blueprint import modules_bp
from account_blueprint import account_bp
from llm_blueprint import llm_bp
from threads_api import threads_api
from docs_blueprint import docs_bp
from interactions_blueprint import interactions_api
from sessions_blueprint import sessions_api
from intent_overlap_blueprint import intent_overlap_api
from intent_rules_blueprint import intent_rules_api
from react_code_detector_blueprint import react_code_detector_api
from code_detector_thread_integration_blueprint import code_detector_thread_integration_api
from file_management_blueprint import file_management_bp
from threads_analytics_blueprint import threads_analytics_bp
from marketing_blueprint import marketing_bp
from templates_blueprint import templates_bp
from fields_blueprint import fields_bp
from welcome_blueprint import welcome_bp
from playbook_blueprint import playbook_bp
from problem_hierarchies_blueprint import problem_hierarchy_bp
from cognitive_frameworks_blueprint import cognitive_frameworks_bp
from welcome_deals_blueprint import welcome_deals_bp
from aicommands_blueprint import aicommands_bp
from aicommands_table import aitablecommands_bp
from datacommands_blueprint import datacommands_bp
from aichartcommands_bp import aichartcommands_bp
from strava_oauth_bp import strava_oauth_bp
from strava_data_bp import strava_data_bp
from strava_ai_bp import strava_ai_bp
from strava_feedback_bp import strava_feedback_bp
from strava_policies_bp import strava_policies_bp
from strava_performance_monitoring_bp import strava_performance_monitoring_bp

# Google OAuth
SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly']

def get_flow(state=None):
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": os.getenv("GOOGLE_CLIENT_ID"),
                "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [os.getenv("GOOGLE_REDIRECT_URI")]
            }
        },
        scopes=SCOPES,
        redirect_uri=os.getenv("GOOGLE_REDIRECT_URI")
    )
    if state:
        flow.fetch_token(state=state)
    return flow

def get_drive_service(credentials_data):
    creds = Credentials(**credentials_data)
    return build('drive', 'v3', credentials=creds)

# OAuth endpoints
@app.route('/api/drive/auth')
def drive_auth():
    flow = get_flow()
    auth_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'
    )
    session['state'] = state
    return redirect(auth_url)

@app.route('/auth/callback')
def drive_callback():
    state = session.get('state')
    flow = get_flow()
    flow.fetch_token(authorization_response=request.url)

    creds = flow.credentials
    session['credentials'] = {
        'token': creds.token,
        'refresh_token': creds.refresh_token,
        'token_uri': creds.token_uri,
        'client_id': creds.client_id,
        'client_secret': creds.client_secret,
        'scopes': creds.scopes
    }
    return redirect('http://localhost:3000/?mode=consultant&module=connectors&folder=Data+Source+Connectors&group=Cloud+Storage+%26+Files&item=Google+Drive+Connector')

@app.route('/api/drive/count')
def drive_count():
    if 'credentials' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    service = get_drive_service(session['credentials'])

    total_files = 0
    page_count = 0
    page_token = None

    while page_count < 5:
        response = service.files().list(
            q="trashed = false",
            spaces='drive',
            fields="nextPageToken, files(id)",
            pageSize=1000,
            pageToken=page_token
        ).execute()

        total_files += len(response.get('files', []))
        page_count += 1
        page_token = response.get('nextPageToken')
        if not page_token:
            break

    return jsonify({
        "total_files": f"{total_files}{'+' if page_token else ''}",
        "pages_checked": page_count
    })

@app.route('/api/drive/list')
def drive_list():
    if 'credentials' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    service = get_drive_service(session['credentials'])
    folder_id = request.args.get('folderId')
    recent_days = request.args.get('recent')

    q = "trashed = false"
    if folder_id:
        q = f"'{folder_id}' in parents and trashed = false"
    elif recent_days:
        cutoff = (datetime.datetime.utcnow() - datetime.timedelta(days=int(recent_days))).isoformat("T") + "Z"
        q = f"modifiedTime > '{cutoff}' and trashed = false"

    response = service.files().list(
        q=q,
        spaces='drive',
        fields="nextPageToken, files(id, name, mimeType, modifiedTime, size, owners, parents)",
        pageSize=500
    ).execute()

    return jsonify({
        "files": response.get('files', []),
        "has_more": response.get('nextPageToken') is not None
    })

@app.route('/api/drive/logout')
def drive_logout():
    session.pop('credentials', None)
    return jsonify({"message": "Logged out"})

# Static JSON endpoints
@app.route('/api/clients')
def get_clients():
    clients = []
    for filename in os.listdir(DATA_DIR):
        if filename.endswith('.json'):
            try:
                with open(os.path.join(DATA_DIR, filename)) as f:
                    data = json.load(f)
                    clients.append({'name': data.get('name', 'Unknown'), 'file': filename})
            except Exception as e:
                print(f"Error reading {filename}: {e}")
    return jsonify(clients)

@app.route('/api/client/<filename>')
def get_client_details(filename):
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.isfile(filepath):
        return jsonify({"error": "File not found"}), 404
    with open(filepath) as f:
        data = json.load(f)
        return jsonify({
            "client": data.get("name", "Unknown Client"),
            "companies": data.get('portfolio_companies', [])
        })

@app.route('/api/team/<filename>')
def get_team_for_client(filename):
    filepath = os.path.join(TEAM_DIR, filename)
    if not os.path.isfile(filepath):
        return jsonify({"error": "File not found"}), 404
    with open(filepath) as f:
        data = json.load(f)
        return jsonify({
            "company": data.get("company", "Unknown"),
            "team_members": data.get("team_members", [])
        })

@app.route('/api/portco-team/<filename>')
def get_portco_team(filename):
    filepath = os.path.join(PORTCO_TEAM_DIR, filename)
    if not os.path.isfile(filepath):
        return jsonify({"error": "File not found"}), 404
    with open(filepath) as f:
        data = json.load(f)
        return jsonify({
            "company": data.get("company", "Unknown"),
            "team_members": data.get("team_members", [])
        })

@app.route('/api/portco-data-sources/<filename>')
def get_portco_data_sources(filename):
    filepath = os.path.join(PORTCO_DATA_SOURCES_DIR, filename)
    if not os.path.isfile(filepath):
        return jsonify({"error": "File not found"}), 404
    with open(filepath) as f:
        return jsonify(json.load(f))

# Register all blueprints
app.register_blueprint(export_bp)
app.register_blueprint(database_api)
app.register_blueprint(portfolio_api)
app.register_blueprint(step_01_bp)
app.register_blueprint(step_01_persistence)
app.register_blueprint(step_02_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(user_bp)
app.register_blueprint(projects_api)
app.register_blueprint(ai_models_blueprint)
app.register_blueprint(api_keys_bp)
app.register_blueprint(profiles_bp)
app.register_blueprint(modules_bp)
app.register_blueprint(account_bp)
app.register_blueprint(llm_bp)
app.register_blueprint(threads_api)
app.register_blueprint(docs_bp)
app.register_blueprint(interactions_api)
app.register_blueprint(sessions_api)
app.register_blueprint(intent_overlap_api)
app.register_blueprint(intent_rules_api)
app.register_blueprint(react_code_detector_api)
app.register_blueprint(code_detector_thread_integration_api)
app.register_blueprint(file_management_bp)
app.register_blueprint(threads_analytics_bp)
app.register_blueprint(marketing_bp)
app.register_blueprint(templates_bp)
app.register_blueprint(fields_bp)
app.register_blueprint(welcome_bp)
app.register_blueprint(playbook_bp)
app.register_blueprint(problem_hierarchy_bp)
app.register_blueprint(cognitive_frameworks_bp)
app.register_blueprint(welcome_deals_bp)
app.register_blueprint(aicommands_bp)
app.register_blueprint(aitablecommands_bp)
app.register_blueprint(datacommands_bp)
app.register_blueprint(aichartcommands_bp)
app.register_blueprint(strava_oauth_bp)
app.register_blueprint(strava_data_bp)
app.register_blueprint(strava_ai_bp)
app.register_blueprint(strava_feedback_bp)
app.register_blueprint(strava_policies_bp)
app.register_blueprint(strava_performance_monitoring_bp)

# Run server
if __name__ == '__main__':
    app.run(debug=True, port=5002)
