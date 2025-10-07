from flask import Blueprint, request, jsonify
import anthropic
import os
from datetime import datetime, timedelta
from typing import Dict, Any, List
import requests
from strava_data_bp import STRAVA_API_BASE
from strava_oauth_bp import get_valid_token

# Create the blueprint
strava_ai_bp = Blueprint('strava_ai', __name__, url_prefix='/api/strava/ai')

# Initialize Anthropic client
client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))

# Strava domain expert system prompt
STRAVA_SYSTEM_PROMPT = """You are a Strava data expert specializing in running, cycling, and endurance sports analytics.

DOMAIN KNOWLEDGE:

**Activity Types:**
- Run, Ride (cycling), Swim, Hike, Walk, VirtualRide, etc.

**Time Metrics:**
- moving_time: Active time (excludes paused/stopped periods) - USE THIS for pace calculations
- elapsed_time: Total time from start to finish (includes stops)
- CRITICAL: When calculating pace, ALWAYS use moving_time unless explicitly asked for elapsed time

**Distance:**
- Strava returns distance in METERS
- Convert to miles: meters / 1609.34
- Convert to kilometers: meters / 1000

**Pace Calculations:**
- Pace = moving_time / distance
- Express as minutes per mile or minutes per kilometer
- Example: 8:45/mile means 8 minutes 45 seconds per mile

**Elevation:**
- total_elevation_gain: Cumulative elevation climbed (meters)
- Convert to feet: meters * 3.28084

**Common Time Periods:**
- "this month" = last 30 days (NOT calendar month unless user specifies "October 2024")
- "this week" = last 7 days
- "today" = activities from today only

**Data Quality Considerations:**
- Some activities may have GPS errors
- Indoor activities may lack GPS data
- Manual activities may have incomplete data

YOUR RESPONSE FORMAT:

Always return a JSON object with this structure:
{
  "answer": "Direct answer to the user's question",
  "audit": {
    "data_sources": [{
      "endpoint": "API endpoint used",
      "params": {"key": "value"},
      "activities_fetched": 10
    }],
    "calculations": {
      "metric": "average_pace",
      "method": "moving_time divided by distance",
      "time_period": "last_30_days",
      "period_start": "2024-10-04",
      "period_end": "2024-11-03",
      "activities_included": 12,
      "activities_excluded": 3,
      "exclusion_reason": "walks excluded from running pace calculation"
    },
    "data_quality": {
      "completeness": 0.95,
      "last_synced": "2024-11-03T14:23:00Z"
    }
  },
  "alternatives": [
    "Use elapsed time instead of moving time",
    "Include all activity types"
  ],
  "raw_data": []
}

CRITICAL RULES:
- NEVER make up data - only use what's provided
- ALWAYS specify your calculation method in the audit
- ALWAYS clarify time period definitions (30 days vs calendar month)
- If data is insufficient, say so clearly
- Round pace to nearest 5 seconds for readability
"""


@strava_ai_bp.route('/query', methods=['POST'])
def query():
    """Handle natural language questions about Strava data."""

    try:
        data = request.get_json()
        user_question = data.get('question')
        user_id = data.get('user_id', 'default_user')

        if not user_question:
            return jsonify({'error': 'Question is required'}), 400

        # Check if user is connected
        access_token = get_valid_token(user_id)
        if not access_token:
            return jsonify({'error': 'Not connected to Strava'}), 401

        # Fetch relevant data based on question
        context_data = fetch_relevant_data(user_question, user_id, access_token)

        # Query Claude with domain expertise
        ai_response = query_claude_expert(user_question, context_data)

        return jsonify(ai_response)

    except Exception as e:
        return jsonify({
            'error': 'Failed to process query',
            'details': str(e)
        }), 500


def fetch_relevant_data(question: str, user_id: str, access_token: str) -> Dict[str, Any]:
    """Fetch relevant Strava data based on the question."""

    # Determine time range from question
    days = 30  # Default
    if 'week' in question.lower():
        days = 7
    elif 'today' in question.lower():
        days = 1
    elif 'year' in question.lower():
        days = 365

    # Determine activity type
    activity_type = None
    if 'run' in question.lower():
        activity_type = 'Run'
    elif 'ride' in question.lower() or 'cycling' in question.lower() or 'bike' in question.lower():
        activity_type = 'Ride'
    elif 'swim' in question.lower():
        activity_type = 'Swim'

    # Fetch activities
    after_timestamp = int((datetime.now() - timedelta(days=days)).timestamp())

    params = {
        'after': after_timestamp,
        'per_page': 200
    }

    response = requests.get(
        f'{STRAVA_API_BASE}/athlete/activities',
        headers={'Authorization': f'Bearer {access_token}'},
        params=params
    )

    if response.status_code != 200:
        return {
            'activities': [],
            'error': 'Failed to fetch activities'
        }

    activities = response.json()

    # Filter by type if specified
    if activity_type:
        activities = [a for a in activities if a.get('type') == activity_type]

    # Fetch athlete profile
    athlete_response = requests.get(
        f'{STRAVA_API_BASE}/athlete',
        headers={'Authorization': f'Bearer {access_token}'}
    )

    athlete = athlete_response.json() if athlete_response.status_code == 200 else {}

    return {
        'activities': activities,
        'athlete': athlete,
        'query_params': {
            'days': days,
            'activity_type': activity_type,
            'after_timestamp': after_timestamp
        }
    }


def query_claude_expert(question: str, context_data: Dict[str, Any]) -> Dict[str, Any]:
    """Query Claude with Strava domain expertise."""

    # Build context string
    activities = context_data.get('activities', [])
    athlete = context_data.get('athlete', {})
    query_params = context_data.get('query_params', {})

    context_str = f"""
USER QUESTION: {question}

ATHLETE INFO:
- Name: {athlete.get('firstname', 'Unknown')} {athlete.get('lastname', '')}
- Username: {athlete.get('username', 'Unknown')}

QUERY PARAMETERS:
- Time period: Last {query_params.get('days', 30)} days
- Activity type filter: {query_params.get('activity_type', 'All types')}

ACTIVITIES DATA ({len(activities)} activities):
"""

    # Add activity summaries
    for i, activity in enumerate(activities[:50]):  # Limit to 50 for context
        context_str += f"""
Activity {i + 1}:
- Type: {activity.get('type')}
- Name: {activity.get('name')}
- Date: {activity.get('start_date')}
- Distance: {activity.get('distance')} meters
- Moving Time: {activity.get('moving_time')} seconds
- Elapsed Time: {activity.get('elapsed_time')} seconds
- Elevation Gain: {activity.get('total_elevation_gain')} meters
- Average Speed: {activity.get('average_speed')} m/s
"""

    if len(activities) > 50:
        context_str += f"\n... and {len(activities) - 50} more activities"

    try:
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2000,
            temperature=0.1,
            system=STRAVA_SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": context_str
                }
            ]
        )

        ai_response = message.content[0].text.strip()

        # Parse JSON response
        import json
        try:
            parsed_response = json.loads(ai_response)
            return parsed_response
        except json.JSONDecodeError:
            # If Claude didn't return valid JSON, wrap it
            return {
                'answer': ai_response,
                'audit': {
                    'note': 'Response was not in structured format'
                }
            }

    except anthropic.APIError as e:
        return {
            'error': 'AI query failed',
            'details': str(e)
        }


@strava_ai_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'strava_ai',
        'anthropic_configured': bool(os.getenv('ANTHROPIC_API_KEY'))
    })