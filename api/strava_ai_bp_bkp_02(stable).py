from flask import Blueprint, request, jsonify
import anthropic
import os
from datetime import datetime, timedelta
from typing import Dict, Any, List
import requests
from strava_data_bp import STRAVA_API_BASE
from strava_oauth_bp import get_valid_token
import json

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

QUERY PARSING EXAMPLES:

"What is my pace this month?" → parsed_query: {{"time_filter": {{"type": "relative_days", "start_date": "2025-09-04", "end_date": "2025-10-04"}}, "activity_type": "Run"}}

"What is my pace in June?" → parsed_query: {{"time_filter": {{"type": "absolute_month", "start_date": "2025-06-01", "end_date": "2025-06-30"}}, "activity_type": "Run"}}

"How many miles did I cycle last week?" → parsed_query: {{"time_filter": {{"type": "relative_days", "start_date": "2025-09-27", "end_date": "2025-10-04"}}, "activity_type": "Ride"}}

"What was my fastest run in June 2024?" → parsed_query: {{"time_filter": {{"type": "absolute_month", "start_date": "2024-06-01", "end_date": "2024-06-30"}}, "activity_type": "Run"}}

CRITICAL: Always calculate start_date and end_date as absolute ISO dates. Today is 2025-10-04.

YOUR RESPONSE FORMAT:

Return a JSON object with this EXACT structure:

{{
  "parsed_query": {{
    "time_filter": {{
      "type": "relative_days|absolute_month|absolute_date_range|year_to_date",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD"
    }},
    "activity_type": "Run|Ride|Swim|all",
    "metrics_requested": ["pace", "distance", "elevation"]
  }},
  "answer": "Natural language answer to the user's question",
  "semantic_elements": {{
    "metrics": [
      {{
        "id": "unique_metric_id",
        "name": "running_pace",
        "aggregation": "average|total|median|max|min",
        "value": "7:52 per mile",
        "value_raw": 472,
        "unit": "seconds_per_mile",
        "display": "average running pace",
        "clickable_actions": ["change_aggregation", "change_metric", "compare_over_time"]
      }}
    ],
    "dimensions": [
      {{
        "id": "unique_dimension_id",
        "name": "time_period",
        "type": "time_range|category|filter",
        "value": 30,
        "unit": "days",
        "display": "last 30 days",
        "start_date": "2025-09-03",
        "end_date": "2025-10-02",
        "clickable_actions": ["adjust_period", "select_custom_range"]
      }}
    ],
    "values": [
      {{
        "id": "unique_value_id",
        "metric_id": "running_pace",
        "value": 472,
        "unit": "seconds_per_mile",
        "display": "7:52 per mile",
        "alternative_displays": [
          {{"unit": "seconds_per_km", "display": "4:54 per kilometer"}},
          {{"unit": "mph", "display": "7.6 mph"}}
        ],
        "clickable_actions": ["convert_unit", "view_raw"]
      }}
    ],
    "filters": [
      {{
        "id": "unique_filter_id",
        "field": "activity_type",
        "operator": "equals",
        "value": "Run",
        "count": 35,
        "display": "35 runs",
        "clickable_actions": ["change_activity_type", "view_activities"]
      }}
    ],
    "aggregations": [
      {{
        "id": "unique_agg_id",
        "method": "total|sum|average|calculated_from",
        "display": "calculated from",
        "applied_to": "metric_id",
        "clickable_actions": ["view_calculation", "change_method"]
      }}
    ]
  }},
  "audit": {{
    "data_sources": [{{
      "endpoint": "/athlete/activities",
      "params": {{"after": "2025-09-03", "per_page": 200}},
      "activities_fetched": 35
    }}],
    "calculations": {{
      "method": "total moving_time / total distance * conversion factor",
      "raw_calculation": "86914 / 296783 * 1609.34 = 472 seconds per mile",
      "time_period": "last_30_days",
      "period_start": "2025-09-03",
      "period_end": "2025-10-02",
      "activities_included": 35
    }},
    "data_quality": {{
      "completeness": 1.0,
      "confidence": "high"
    }}
  }},
  "raw_data": {{
    "activity_count": 35,
    "total_distance_meters": 296783,
    "total_moving_time": 86914
  }},
  "alternatives": [
    "Calculate pace using elapsed time instead of moving time",
    "Show pace by individual run instead of average"
  ]
}}

SEMANTIC ELEMENT GUIDELINES:

1. **Metrics**: Measurements being calculated (pace, distance, elevation, time)
   - display: The descriptive name that appears in the answer (e.g., "average running pace")
   - value: The formatted metric value (e.g., "7:52 per mile")
   - value_raw: The raw numeric value (e.g., 472 seconds)
   - Include the aggregation method separately
   - Each metric gets a unique ID

2. **Dimensions**: How data is sliced/filtered (time periods, categories)
   - Time ranges should include start_date and end_date
   - Categories include activity type, gear, location
   - Each dimension gets a unique ID

3. **Values**: Actual calculated numbers
   - Link to parent metric via metric_id
   - Include alternative unit displays
   - Provide conversion options

4. **Filters**: What data was included/excluded
   - Show counts and operators
   - Link to the field being filtered

5. **Aggregations**: How data was combined
   - Reference which metric they apply to
   - Explain the calculation method

CRITICAL RULES:
- EVERY analytical concept in your answer must have a corresponding semantic element
- If you mention MULTIPLE measurements in the answer (e.g., pace AND distance), create SEPARATE metric objects for each
- Each number with a unit in your answer (7:52 per mile, 184.4 miles, 35 runs) must have a semantic element
- Use unique IDs so frontend can reference them
- Include clickable_actions for every element
- Display text should match what appears in the answer
- Provide enough metadata for UI to build interactive controls
- NEVER make up data - only use what's provided
- The parsed_query dates should match the calculation dates in the audit section
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

        # Step 1: Parse query to get dates
        parsed_query = parse_query_with_claude(user_question)

        # Step 2: Fetch relevant data using parsed dates
        context_data = fetch_relevant_data(user_question, user_id, access_token, parsed_query)

        # Query Claude with domain expertise
        ai_response = query_claude_expert(user_question, context_data)

        return jsonify(ai_response)

    except Exception as e:
        return jsonify({
            'error': 'Failed to process query',
            'details': str(e)
        }), 500


def parse_query_with_claude(question: str) -> Dict[str, Any]:
    """Quick Claude call to parse query into structured parameters."""
    try:
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=500,
            temperature=0.1,
            messages=[
                {
                    "role": "user",
                    "content": f"""Parse this Strava query. Today is 2025-10-04.

Question: {question}

Return ONLY this JSON:
{{
  "time_filter": {{
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD"
  }},
  "activity_type": "Run|Ride|Swim|all"
}}"""
                }
            ]
        )

        response = message.content[0].text.strip()
        parsed = json.loads(response)

        print("PARSED QUERY:", json.dumps(parsed, indent=2))
        return parsed

    except Exception as e:
        print(f"Query parsing failed: {e}")
        return {}

def fetch_relevant_data(question: str, user_id: str, access_token: str, parsed_query: Dict = None) -> Dict[str, Any]:
    """Fetch relevant Strava data based on the question."""

    # Use parsed dates if available, otherwise fall back to keyword matching
    if parsed_query and 'time_filter' in parsed_query:
        time_filter = parsed_query['time_filter']
        start_date = time_filter.get('start_date')
        end_date = time_filter.get('end_date')

        if start_date and end_date:
            import pytz

            # Use user's timezone (hardcode US Eastern for now, should come from user profile later)
            user_tz = pytz.timezone('America/New_York')

            # Start of day in user's timezone
            start_dt = datetime.fromisoformat(start_date)
            start_dt = user_tz.localize(start_dt.replace(hour=0, minute=0, second=0))
            after_timestamp = int(start_dt.timestamp())

            # End of day in user's timezone (23:59:59)
            end_dt = datetime.fromisoformat(end_date)
            end_dt = user_tz.localize(end_dt.replace(hour=23, minute=59, second=59))
            before_timestamp = int(end_dt.timestamp())

            days = (datetime.fromisoformat(end_date) - datetime.fromisoformat(start_date)).days
        else:
            # Fallback
            days = 30
            after_timestamp = int((datetime.now() - timedelta(days=days)).timestamp())
            before_timestamp = None
    else:
        # Old keyword-based approach as fallback
        days = 30  # Default
        if 'week' in question.lower():
            days = 7
        elif 'today' in question.lower():
            days = 1
        elif 'year' in question.lower():
            days = 365

        after_timestamp = int((datetime.now() - timedelta(days=days)).timestamp())
        before_timestamp = None

    # Determine activity type
    activity_type = None
    if parsed_query and 'activity_type' in parsed_query:
        activity_type = parsed_query['activity_type']
        if activity_type == 'all':
            activity_type = None
    else:
        # Fallback to keyword matching
        if 'run' in question.lower():
            activity_type = 'Run'
        elif 'ride' in question.lower() or 'cycling' in question.lower() or 'bike' in question.lower():
            activity_type = 'Ride'
        elif 'swim' in question.lower():
            activity_type = 'Swim'

    # Fetch activities with calculated timestamps
    params = {
        'after': after_timestamp,
        'per_page': 200
    }

    if before_timestamp:
        params['before'] = before_timestamp

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
            'after_timestamp': after_timestamp,
            'before_timestamp': before_timestamp
        }
    }

def query_claude_expert(question: str, context_data: Dict[str, Any]) -> Dict[str, Any]:
    """Query Claude with Strava domain expertise using two-step approach:
    1. Parse query to get date range
    2. Fetch data using parsed dates
    3. Generate answer with actual data
    """

    # STEP 1: Get Claude to parse the query (no data needed yet)
    try:
        parse_message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1000,
            temperature=0.1,
            system=STRAVA_SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"""Parse this query and return ONLY the parsed_query section:

USER QUESTION: {question}

Return just:
{{
  "parsed_query": {{
    "time_filter": {{ "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD" }},
    "activity_type": "Run|Ride|Swim|all"
  }}
}}"""
                }
            ]
        )

        parse_response = parse_message.content[0].text.strip()
        parsed = json.loads(parse_response)
        parsed_query = parsed.get('parsed_query', {})

        print("=" * 80)
        print("PARSED QUERY:")
        print(json.dumps(parsed_query, indent=2))
        print("=" * 80)

    except Exception as e:
        print(f"Query parsing failed: {e}")
        parsed_query = None

    # STEP 2: Fetch data using parsed dates (already done in context_data if using old flow)
    # For now, use the context_data that was passed in
    # TODO: Refactor to fetch data here using parsed_query

    activities = context_data.get('activities', [])

    # DEBUG: Verify what we're passing to Claude
    total_distance = sum(a.get('distance', 0) for a in activities)
    print("=" * 80)
    print(f"PASSING TO CLAUDE: {len(activities)} activities")
    print(f"TOTAL DISTANCE: {total_distance} meters = {total_distance / 1609.34:.2f} miles")
    print("=" * 80)
    # Pre-calculate totals to avoid Claude's math errors
    total_distance_meters = sum(a.get('distance', 0) for a in activities)
    total_distance_miles = round(total_distance_meters / 1609.34, 2)
    total_moving_time = sum(a.get('moving_time', 0) for a in activities)
    total_elevation = sum(a.get('total_elevation_gain', 0) for a in activities)

    athlete = context_data.get('athlete', {})
    query_params = context_data.get('query_params', {})

    # STEP 3: Build context with actual data
    context_str = f"""
    USER QUESTION: {question}

    ATHLETE INFO:
    - Name: {athlete.get('firstname', 'Unknown')} {athlete.get('lastname', '')}
    - Username: {athlete.get('username', 'Unknown')}

    QUERY PARAMETERS:
    - Time period: Last {query_params.get('days', 30)} days
    - Activity type filter: {query_params.get('activity_type', 'All types')}

    PRE-CALCULATED TOTALS (use these exact values):
    - Total activities: {len(activities)}
    - Total distance: {total_distance_meters:.2f} meters ({total_distance_miles:.2f} miles)
    - Total moving time: {total_moving_time} seconds
    - Total elevation gain: {total_elevation:.2f} meters

    ACTIVITIES DATA ({len(activities)} activities):
    """

    # Add activity summaries
    for i, activity in enumerate(activities[:50]):
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

    # STEP 4: Generate final answer
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

        try:
            parsed_response = json.loads(ai_response)

            print("=" * 80)
            print("CLAUDE RESPONSE STRUCTURE:")
            print(json.dumps(parsed_response, indent=2)[:2000])
            print("=" * 80)

            if 'semantic_elements' not in parsed_response:
                print("WARNING: No semantic_elements in response")
                parsed_response['semantic_elements'] = {
                    'metrics': [],
                    'dimensions': [],
                    'values': [],
                    'filters': [],
                    'aggregations': []
                }

            return parsed_response
        except json.JSONDecodeError:
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


@strava_ai_bp.route('/critique-tokens', methods=['POST'])
def critique_tokens():
    """Ask Claude to critique its own token selection."""
    try:
        data = request.get_json()
        original_answer = data.get('answer')
        original_tokens = data.get('tokens')

        critique_prompt = f"""You previously analyzed a Strava query and created this response:

ANSWER: {original_answer}

TOKENS YOU IDENTIFIED:
{json.dumps(original_tokens, indent=2)}

Now, critically review your token selection with EXTREME scrutiny. You were too conservative. Look for:
1. ALL measurement types (e.g., "moving time", "elapsed time", "distance") - these should ALWAYS be tokens since users may want to switch between measurement methods
2. ALL aggregation methods (e.g., "average", "total", "sum", "calculated from")
3. ANY analytical term that describes HOW data was processed
4. Values that appear without their measurement type tokenized

CRITICAL RULE: Proximity to values does NOT matter. Even if a measurement type like "total moving time" or "average pace" appears immediately before its value, it MUST still be tokenized separately. Users need to click the measurement type to change it, regardless of how close it is to the number.
Be aggressive - assume the user wants MAXIMUM interactivity. It's better to over-tokenize than under-tokenize.

Return ONLY a JSON object with this structure:
{{
  "missing_tokens": [
    {{
      "text": "EXACT text from answer - must be word-for-word substring",
      "type": "metric|dimension|value|aggregation|source",
      "reason": "why this should be tokenized",
      "metadata": {{
        "clickable_actions": ["action1", "action2"]
      }}
    }}
  ],
  "critique": "Brief explanation of what you missed and why"
}}

CRITICAL: The "text" field must be an EXACT substring from the answer. Do not abbreviate. 
- If answer says "total moving time", suggest "total moving time" not "moving time"
- If answer says "average running pace", suggest "average running pace" not "running pace"
DO NOT include character positions - these will be calculated automatically.
"""

        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1500,
            temperature=0.1,
            messages=[
                {
                    "role": "user",
                    "content": critique_prompt
                }
            ]
        )

        critique_response = message.content[0].text.strip()

        # Parse JSON
        try:
            parsed = json.loads(critique_response)

            # Find positions for missing tokens (Claude doesn't provide positions anymore)
            if 'missing_tokens' in parsed:
                parsed['missing_tokens'] = find_token_positions(
                    original_answer,
                    parsed['missing_tokens']
                )

            return jsonify(parsed)
        except json.JSONDecodeError:
            return jsonify({
                'error': 'Failed to parse critique',
                'raw_response': critique_response
            })

    except Exception as e:
        return jsonify({'error': str(e)}), 500