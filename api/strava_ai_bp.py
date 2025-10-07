from flask import Blueprint, request, jsonify
import anthropic
import os
from datetime import datetime, timedelta
import time
from typing import Dict, Any, List
import requests
from strava_oauth_bp import get_valid_token
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from registry import get_policies_db
from strava_performance_monitoring_bp import StravaPerformanceMonitor
from contextlib import nullcontext
from strava_constants_bp import STRAVA_API_BASE

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


def get_active_prompt(prompt_name='strava_expert', perf_monitor=None):
    """Load active system prompt from database"""
    print(f"ATTEMPTING TO LOAD PROMPT: {prompt_name}")
    db_config = get_policies_db()
    print(f"DB CONFIG: {db_config}")

    with perf_monitor.time_stage('db_prompt_load') if perf_monitor else nullcontext():
        try:
            # Fix the parameter names for psycopg2
            conn_params = {
                'host': db_config['host'],
                'port': db_config['port'],
                'database': db_config['database_name'],
                'user': db_config['username'],
                'password': db_config['password']
            }
            conn = psycopg2.connect(**conn_params)
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("SELECT id, content, version FROM system_prompts WHERE name = %s AND status = 'active'",
                        (prompt_name,))
            result = cur.fetchone()
            conn.close()
            if result:
                print(f"LOADED PROMPT: ID={result['id']}, VERSION={result['version']}")
                if perf_monitor:
                    perf_monitor.prompt_id = result['id']
                return dict(result)
            else:
                print("NO ACTIVE PROMPT FOUND - USING FALLBACK")
                return None
        except Exception as e:
            print(f"Error loading prompt: {e}")
            if perf_monitor:
                perf_monitor.log_error('db_prompt_load', e)
            return None


def log_prompt_execution(prompt_id, query, activities_available, activities_analyzed, response_data=None):
    """Log prompt execution results and check policy violations"""
    print(f"DEBUG: Starting governance logging - {activities_analyzed}/{activities_available}")

    db_config = get_policies_db()
    try:
        # Fix the parameter names for psycopg2
        conn_params = {
            'host': db_config['host'],
            'port': db_config['port'],
            'database': db_config['database_name'],
            'user': db_config['username'],
            'password': db_config['password']
        }
        conn = psycopg2.connect(**conn_params)
        cur = conn.cursor()

        # Calculate selection ratio and check violations
        selection_ratio = activities_analyzed / activities_available if activities_available > 0 else 0

        violations = []
        if selection_ratio < 0.8:  # llm_selection_threshold policy
            violations.append({
                'rule': 'llm_selection_threshold',
                'value': selection_ratio,
                'threshold': 0.8,
                'message': f'Selected {activities_analyzed}/{activities_available} activities ({selection_ratio:.1%}) below 80% threshold'
            })

        # Insert execution record
        cur.execute("""
            INSERT INTO prompt_executions (prompt_id, query, activities_available, activities_analyzed, 
                                         selection_ratio, policy_violations)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            prompt_id, query, activities_available, activities_analyzed,
            selection_ratio, json.dumps(violations)
        ))

        # Update prompt violation count if violations occurred
        if violations:
            cur.execute("UPDATE system_prompts SET violation_count = violation_count + 1 WHERE id = %s", (prompt_id,))

        conn.commit()
        conn.close()

        print(
            f"GOVERNANCE: Logged execution - {activities_analyzed}/{activities_available} activities, {len(violations)} violations")

    except Exception as e:
        print(f"Error logging execution: {e}")


@strava_ai_bp.route('/query', methods=['POST'])
def query():
    """Handle natural language questions about Strava data."""
    perf = StravaPerformanceMonitor()

    try:
        data = request.get_json()
        user_question = data.get('question')
        user_id = data.get('user_id', 'default_user')

        perf.user_id = user_id
        perf.query = user_question

        if not user_question:
            return jsonify({'error': 'Question is required'}), 400

        # Check if user is connected
        with perf.time_stage('token_validation'):
            access_token = get_valid_token(user_id)
            if not access_token:
                return jsonify({'error': 'Not connected to Strava'}), 401

        # Step 1: Parse query to get dates
        with perf.time_stage('claude_parse_query'):
            parsed_query = parse_query_with_claude(user_question)

        # Step 2: Fetch relevant data using parsed dates
        with perf.time_stage('data_fetch'):
            context_data = fetch_relevant_data(user_question, user_id, access_token, parsed_query, perf)

        # Query Claude with domain expertise
        with perf.time_stage('claude_analysis'):
            ai_response = query_claude_expert(user_question, context_data, perf)

        return jsonify(ai_response)

    except Exception as e:
        perf.log_error('main_pipeline', e)
        return jsonify({
            'error': 'Failed to process query',
            'details': str(e)
        }), 500
    finally:
        perf.save_to_db()


def fetch_relevant_data(question: str, user_id: str, access_token: str, parsed_query: Dict = None, perf_monitor=None) -> Dict[str, Any]:
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

    with perf_monitor.time_stage('strava_activities_fetch') if perf_monitor else nullcontext():
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

    # Track pipeline stages for governance
    pipeline_data = {
        'retrieved_count': len(activities),
        'after_date_filter': len(activities),  # No date filtering happening at API level
        'after_type_filter': 0,
        'final_count': 0,
        'filtering_stages': []
    }

    # Filter by type if specified
    if activity_type:
        filtered_activities = [a for a in activities if a.get('type') == activity_type]
        pipeline_data['after_type_filter'] = len(filtered_activities)
        pipeline_data['filtering_stages'].append({
            'stage': 'activity_type_filter',
            'filter': activity_type,
            'before_count': len(activities),
            'after_count': len(filtered_activities),
            'excluded_count': len(activities) - len(filtered_activities)
        })
        activities = filtered_activities
    else:
        pipeline_data['after_type_filter'] = len(activities)

    pipeline_data['final_count'] = len(activities)

    # Debug logging
    print(
        f"PIPELINE: Retrieved {pipeline_data['retrieved_count']} → Type filter {pipeline_data['after_type_filter']} → Final {pipeline_data['final_count']}")

    # Fetch athlete profile
    with perf_monitor.time_stage('strava_athlete_fetch') if perf_monitor else nullcontext():
        athlete_response = requests.get(
            f'{STRAVA_API_BASE}/athlete',
            headers={'Authorization': f'Bearer {access_token}'}
        )

    athlete = athlete_response.json() if athlete_response.status_code == 200 else {}

    # Capture technical details for frontend
    # Calculate totals for data flow trace
    total_distance = sum(a.get('distance', 0) for a in activities)
    activity_names = [a.get('name', 'Unknown')[:30] for a in activities[:3]]

    # Capture complete pipeline stages for frontend
    pipeline_stages = {
        'system_prompt': {
            'version': 'strava_expert v2.0',  # Will get from database
            'status': 'active'
        },
        'user_query': question,
        'query_parsing': {
            'input': question,
            'parsed_activity_type': activity_type,
            'parsed_time_period': 'this month'  # Will extract from parsing
        },
        'date_inference': {
            'natural_language': 'this month',
            'calculated_start': start_date if 'start_date' in locals() else None,
            'calculated_end': end_date if 'end_date' in locals() else None,
            'days_in_range': days,
            'timezone': 'America/New_York'
        },
        'api_request': {
            'endpoint': f'{STRAVA_API_BASE}/athlete/activities',
            'parameters': params,
            'timestamp_range': f"{after_timestamp} to {before_timestamp if before_timestamp else 'now'}"
        },
        'api_response': {
            'status_code': response.status_code,
            'activities_returned': len(activities),
            'activity_names': [a.get('name', 'Unknown')[:30] for a in activities[:5]]
        },
        'data_processing': {
            'input_count': len(activities),
            'filtering_applied': pipeline_data['filtering_stages'],
            'output_count': pipeline_data['final_count']
        }
    }

    technical_debug = {
        'pipeline_stages': pipeline_stages,
        'pipeline_log': f"PIPELINE: Retrieved {pipeline_data['retrieved_count']} → Type filter {pipeline_data['after_type_filter']} → Final {pipeline_data['final_count']}",
        # existing sections can be simplified or removed
    }

    # Log resource metrics
    if perf_monitor:
        perf_monitor.log_resource_metric('activities_fetched_count', len(activities))
        perf_monitor.log_resource_metric('total_distance_meters', sum(a.get('distance', 0) for a in activities))

    return {
        'activities': activities,
        'athlete': athlete,
        'pipeline_data': pipeline_data,
        'technical_debug': technical_debug,
        'query_params': {
            'days': days,
            'activity_type': activity_type,
            'after_timestamp': after_timestamp,
            'before_timestamp': before_timestamp
        }
    }


def generate_llm_processing_trace(activities: List[Dict], claude_response: Dict, user_question: str) -> Dict:
    """Generate detailed LLM processing trace by analyzing what data was available vs. what Claude used."""

    # Calculate activity type distribution from available data
    activity_types = {}
    for activity in activities:
        activity_type = activity.get('type', 'Unknown')
        activity_types[activity_type] = activity_types.get(activity_type, 0) + 1

    # Extract Claude's reported data usage
    claude_activity_count = claude_response.get('raw_data', {}).get('activity_count', 0)
    claude_llm_processing = claude_response.get('llm_processing', {})

    # Calculate selection metrics
    activities_received = len(activities)
    selection_rate = f"{claude_activity_count}/{activities_received} ({claude_activity_count / activities_received * 100:.1f}%)" if activities_received > 0 else "0/0 (0%)"
    excluded_activities = activities_received - claude_activity_count

    # Determine date range from activities
    if activities:
        sorted_activities = sorted(activities, key=lambda x: x.get('start_date', ''))
        date_range_coverage = f"{sorted_activities[0]['start_date'][:10]} to {sorted_activities[-1]['start_date'][:10]}"
    else:
        date_range_coverage = "No activities"

    # Build comprehensive LLM processing trace
    llm_processing_trace = {
        "data_inspection": {
            "activities_received": activities_received,
            "activity_types_discovered": list(activity_types.keys()),
            "activity_type_distribution": activity_types,
            "date_range_coverage": date_range_coverage,
            "data_completeness": "100%" if activities_received > 0 else "0%"
        },
        "selection_process": {
            **claude_llm_processing.get('selection_process', {}),
            "matches_found": claude_activity_count,
            "selection_rate": selection_rate,
            "excluded_activities": excluded_activities,
            "data_utilization_efficiency": f"{claude_activity_count / activities_received * 100:.1f}%" if activities_received > 0 else "0%"
        },
        "analysis_execution": {
            "activities_analyzed": claude_activity_count,
            "python_calculated_totals": {
                "total_activities": activities_received,
                "total_distance_meters": sum(a.get('distance', 0) for a in activities),
                "total_moving_time": sum(a.get('moving_time', 0) for a in activities),
                "total_elevation_gain": sum(a.get('total_elevation_gain', 0) for a in activities)
            },
            "claude_reported_totals": claude_response.get('raw_data', {}),
            "data_consistency_check": "PASS" if claude_activity_count <= activities_received else "FAIL - Claude reported more activities than available"
        }
    }

    return llm_processing_trace


def query_claude_expert(question: str, context_data: Dict[str, Any], perf_monitor=None) -> Dict[str, Any]:
    """Query Claude with Strava domain expertise using two-step approach:
    1. Parse query to get date range
    2. Fetch data using parsed dates
    3. Generate answer with actual data
    """

    # Load prompt from database
    prompt_data = get_active_prompt('strava_expert', perf_monitor)
    if not prompt_data:
        prompt_content = STRAVA_SYSTEM_PROMPT  # Fallback
        prompt_id = None
    else:
        prompt_content = prompt_data['content']
        prompt_id = prompt_data['id']

    # STEP 1: Get Claude to parse the query (no data needed yet)
    try:
        parse_message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1000,
            temperature=0.1,
            system=prompt_content,
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
    pipeline_data = context_data.get('pipeline_data', {})

    # DEBUG: Trace data flow completely
    print("=" * 80)
    print("DATA FLOW TRACE:")
    print(f"1. PIPELINE DATA: {pipeline_data}")
    print(f"2. CONTEXT ACTIVITIES: {len(activities)} activities")
    print(f"3. FIRST FEW ACTIVITIES: {[a.get('name', 'Unknown')[:30] for a in activities[:3]]}")

    total_distance = sum(a.get('distance', 0) for a in activities)
    print(f"4. TOTAL DISTANCE: {total_distance} meters = {total_distance / 1609.34:.2f} miles")
    print(f"5. ACTIVITIES DETAILS:")
    for i, activity in enumerate(activities[:5]):
        print(f"   Activity {i + 1}: {activity.get('name', 'Unknown')} - {activity.get('distance', 0)}m")
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
        # Log token usage before Claude call
        if perf_monitor:
            context_tokens = perf_monitor.estimate_tokens(context_str)
            perf_monitor.log_claude_usage(
                prompt_tokens=context_tokens,
                context_text=context_str
            )

        # Debug prompt sizes
        print(f"TOTAL PROMPT SIZE: {len(prompt_content)} chars")
        print(f"CONTEXT SIZE: {len(context_str)} chars")
        print(f"COMBINED SIZE: {len(prompt_content + context_str)} chars")

        api_start = time.time()
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2000,
            temperature=0.1,
            system=prompt_content,
            messages=[
                {
                    "role": "user",
                    "content": context_str
                }
            ]
        )
        api_duration = time.time() - api_start
        print(f"PURE CLAUDE API CALL: {api_duration:.2f} seconds")

        ai_response = message.content[0].text.strip()

        # Log response token usage
        if perf_monitor:
            response_tokens = perf_monitor.estimate_tokens(ai_response)
            perf_monitor.log_resource_metric('response_tokens_estimated', response_tokens)

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

            print(
                f"DEBUG: About to log execution - prompt_id={prompt_id}, activities={len(activities)}, activity_count={parsed_response.get('raw_data', {}).get('activity_count', 0)}")

            # Log execution for governance tracking
            print("=" * 80)
            print("CLAUDE RESPONSE ANALYSIS:")
            print(f"Claude says: {parsed_response.get('answer', '')[:100]}...")
            print(f"Raw data count: {parsed_response.get('raw_data', {}).get('activity_count', 0)}")
            print(
                f"Audit activities fetched: {parsed_response.get('audit', {}).get('data_sources', [{}])[0].get('activities_fetched', 0)}")
            print("=" * 80)

            # Log execution for governance tracking
            if prompt_id:
                log_prompt_execution(
                    prompt_id=prompt_id,
                    query=question,
                    activities_available=len(activities),
                    activities_analyzed=parsed_response.get('raw_data', {}).get('activity_count', 0),
                    response_data=parsed_response
                )

            # ENHANCEMENT: Generate comprehensive LLM processing trace
            llm_processing_trace = generate_llm_processing_trace(
                activities=activities,
                claude_response=parsed_response,
                user_question=question
            )

            # Merge Claude's LLM processing with our calculated trace
            if 'llm_processing' in parsed_response:
                parsed_response['llm_processing'] = {
                    **parsed_response['llm_processing'],
                    **llm_processing_trace
                }
            else:
                parsed_response['llm_processing'] = llm_processing_trace

            # Include pipeline data and technical debug in response for frontend debugging
            response_with_pipeline = {
                **parsed_response,
                'pipeline_data': context_data.get('pipeline_data', {}),
                'technical_debug': context_data.get('technical_debug', {}),
                'debug_info': 'Pipeline data, technical debug, and LLM processing trace attached'
            }

            return response_with_pipeline
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


@strava_ai_bp.route('/convert-unit', methods=['POST'])
def convert_unit():
    """Convert a value between units (miles/km, seconds/minutes, etc.)"""
    try:
        data = request.get_json()
        value = data.get('value')
        from_unit = data.get('from_unit')
        to_unit = data.get('to_unit')
        element_id = data.get('element_id')

        # Simple conversion logic
        if from_unit == 'miles' and to_unit == 'kilometers':
            converted_value = value * 1.609344
            display = f"{converted_value:.1f} km"
        elif from_unit == 'kilometers' and to_unit == 'miles':
            converted_value = value / 1.609344
            display = f"{converted_value:.1f} miles"
        else:
            return jsonify({'error': 'Conversion not supported'}), 400

        return jsonify({
            'element_id': element_id,
            'new_value': converted_value,
            'new_display': display,
            'new_unit': to_unit
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


def generate_distance_over_time_chart():
    """Generate daily distance data for last 30 days"""
    try:
        token = get_valid_token()
        if not token:
            return []

        # Get activities from last 30 days
        after = datetime.now() - timedelta(days=30)
        url = f"{STRAVA_API_BASE}/athlete/activities"
        headers = {'Authorization': f'Bearer {token}'}
        params = {
            'after': int(after.timestamp()),
            'per_page': 200
        }

        response = requests.get(url, headers=headers, params=params)
        activities = response.json()

        # Group by date and sum distances
        daily_distances = {}
        for activity in activities:
            if activity.get('type') == 'Run':
                date = activity['start_date'][:10]  # YYYY-MM-DD
                distance_miles = activity.get('distance', 0) / 1609.34
                daily_distances[date] = daily_distances.get(date, 0) + distance_miles

        # Convert to chart format
        chart_data = []
        for date, distance in sorted(daily_distances.items()):
            chart_data.append({
                'date': date,
                'distance': round(distance, 2),
                'label': f"{round(distance, 1)} miles"
            })

        return chart_data

    except Exception as e:
        print(f"Error generating distance chart: {e}")
        return []


def generate_run_distance_chart():
    """Generate individual run distances"""
    try:
        token = get_valid_token()
        if not token:
            return []

        # Get recent runs
        url = f"{STRAVA_API_BASE}/athlete/activities"
        headers = {'Authorization': f'Bearer {token}'}
        params = {
            'per_page': 20  # Last 20 runs
        }

        response = requests.get(url, headers=headers, params=params)
        activities = response.json()

        chart_data = []
        for i, activity in enumerate(activities):
            if activity.get('type') == 'Run':
                distance_miles = activity.get('distance', 0) / 1609.34
                chart_data.append({
                    'run': f"Run {i + 1}",
                    'distance': round(distance_miles, 2),
                    'name': activity.get('name', f"Run {i + 1}"),
                    'date': activity['start_date'][:10]
                })

        return chart_data[:10]  # Limit to 10 most recent

    except Exception as e:
        print(f"Error generating run chart: {e}")
        return []


def determine_chart_type(semantic_elements, answer):
    """Determine appropriate chart type based on semantic context"""
    metrics = [m.get('text', '').lower() for m in semantic_elements.get('metrics', [])]
    dimensions = [d.get('text', '').lower() for d in semantic_elements.get('dimensions', [])]

    # Time-based data
    if any(time_word in answer.lower() for time_word in ['days', 'weeks', 'months', 'over time']):
        return 'line'

    # Individual items comparison
    elif any(item_word in answer.lower() for item_word in ['runs', 'activities', 'each']):
        return 'bar'

    # Default to bar chart
    else:
        return 'bar'


@strava_ai_bp.route('/generate-chart', methods=['POST'])
def generate_chart():
    try:
        data = request.get_json()
        answer = data.get('answer', '')
        semantic_elements = data.get('semantic_elements', {})
        element_id = data.get('element_id')

        # Determine chart type
        chart_type = determine_chart_type(semantic_elements, answer)

        # Generate appropriate chart data
        metrics = [m.get('text', '').lower() for m in semantic_elements.get('metrics', [])]

        if 'distance' in str(metrics):
            if 'last 30 days' in answer.lower() or 'days' in answer.lower():
                chart_data = generate_distance_over_time_chart()
                title = 'Daily Distance - Last 30 Days'
            else:
                chart_data = generate_run_distance_chart()
                title = 'Recent Run Distances'
        else:
            # Fallback for other metrics
            chart_data = generate_run_distance_chart()
            title = 'Recent Activity Data'

        return jsonify({
            'chart_type': chart_type,
            'data': chart_data,
            'title': title,
            'element_id': element_id,
            'success': True
        })

    except Exception as e:
        return jsonify({
            'error': str(e),
            'success': False
        }), 500


@strava_ai_bp.route('/step-1-parse-query-with-claude', methods=['POST'])
def test_parse_query_with_claude():
    """Test endpoint to isolate and debug the hybrid parse_query_with_claude function."""
    try:
        data = request.get_json()
        question = data.get('question')

        if not question:
            return jsonify({'error': 'Question is required'}), 400

        # Call the hybrid parsing function
        parsed_result = parse_query_with_claude(question)

        # Calculate what the expected results should be for comparison
        today = datetime.now()
        current_date = today.strftime('%Y-%m-%d')

        expected_this_month = {
            'start_date': today.replace(day=1).strftime('%Y-%m-%d'),
            'end_date': current_date
        }

        expected_last_30_days = {
            'start_date': (today - timedelta(days=30)).strftime('%Y-%m-%d'),
            'end_date': current_date
        }

        # Determine which method was used
        question_lower = question.lower()
        parsing_method = "python"
        if "this month" not in question_lower and "last 30 days" not in question_lower and "past 30 days" not in question_lower:
            parsing_method = "claude"

        # Calculate date range analysis
        if parsed_result and 'time_filter' in parsed_result:
            time_filter = parsed_result['time_filter']
            if 'start_date' in time_filter and 'end_date' in time_filter:
                start = datetime.strptime(time_filter['start_date'], '%Y-%m-%d')
                end = datetime.strptime(time_filter['end_date'], '%Y-%m-%d')
                date_range_days = (end - start).days + 1
            else:
                date_range_days = None
        else:
            date_range_days = None

        return jsonify({
            'input': {
                'question': question,
                'current_date_used': current_date,
                'parsing_method_used': parsing_method
            },
            'output': {
                'parsed_query': parsed_result
            },
            'debug_info': {
                'function_called': 'parse_query_with_claude (hybrid version)',
                'python_patterns_checked': ['this month', 'last 30 days', 'past 30 days'],
                'expected_behavior': {
                    'this_month_should_be': expected_this_month,
                    'last_30_days_should_be': expected_last_30_days
                }
            },
            'analysis': {
                'date_range_days': date_range_days,
                'interpretation_type': 'month-to-date' if 'this month' in question_lower else 'rolling-30-day' if 'last 30 days' in question_lower or 'past 30 days' in question_lower else 'complex-pattern',
                'matches_expected_logic': {
                    'this_month': parsed_result.get('time_filter', {}) == {
                        'start_date': expected_this_month['start_date'], 'end_date': expected_this_month['end_date'],
                        'activity_type': parsed_result.get(
                            'activity_type')} if 'this month' in question_lower else None,
                    'last_30_days': parsed_result.get('time_filter', {}) == {
                        'start_date': expected_last_30_days['start_date'],
                        'end_date': expected_last_30_days['end_date'], 'activity_type': parsed_result.get(
                            'activity_type')} if 'last 30 days' in question_lower or 'past 30 days' in question_lower else None
                }
            }
        })

    except Exception as e:
        return jsonify({
            'error': 'Failed to parse query',
            'details': str(e)
        }), 500



def parse_query_with_claude(question: str) -> Dict[str, Any]:
    """Parse query with Python date logic for common patterns, Claude for complex cases."""

    question_lower = question.lower()
    today = datetime.now()

    # Python logic for your specified patterns
    if "this month" in question_lower:
        # Your logic: start_date = month + day 1, end_date = month + today's day
        start_date = today.replace(day=1).strftime('%Y-%m-%d')
        end_date = today.strftime('%Y-%m-%d')
        time_filter = {"start_date": start_date, "end_date": end_date}


    elif "last 30 days" in question_lower or "past 30 days" in question_lower:

        # Your logic: rolling 30-day window ending today

        start_date = (today - timedelta(days=30)).strftime('%Y-%m-%d')

        end_date = today.strftime('%Y-%m-%d')

        time_filter = {"start_date": start_date, "end_date": end_date}


    elif "this week" in question_lower:

        # Monday-based weeks

        days_since_monday = today.weekday()  # Monday=0, Sunday=6

        start_date = (today - timedelta(days=days_since_monday)).strftime('%Y-%m-%d')

        end_date = today.strftime('%Y-%m-%d')

        time_filter = {"start_date": start_date, "end_date": end_date}


    elif "last week" in question_lower:

        days_since_monday = today.weekday()

        last_week_end = today - timedelta(days=days_since_monday + 1)  # Last Sunday

        last_week_start = last_week_end - timedelta(days=6)  # Previous Monday

        start_date = last_week_start.strftime('%Y-%m-%d')

        end_date = last_week_end.strftime('%Y-%m-%d')

        time_filter = {"start_date": start_date, "end_date": end_date}


    elif any(day in question_lower for day in
             ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]):

        # Let Claude handle specific days since it requires more complex logic

        return call_claude_for_complex_parsing(question)


    else:

        # Use Claude for complex cases (last Tuesday, since marathon, etc.)

        return call_claude_for_complex_parsing(question)

    # Determine activity type (still use simple logic)
    activity_type = "all"  # default
    if "run" in question_lower:
        activity_type = "Run"
    elif "ride" in question_lower or "cycling" in question_lower or "bike" in question_lower:
        activity_type = "Ride"
    elif "swim" in question_lower:
        activity_type = "Swim"

    result = {
        "time_filter": time_filter,
        "activity_type": activity_type
    }

    print(f"PYTHON PARSING: '{question}' -> {json.dumps(result, indent=2)}")
    return result


def call_claude_for_complex_parsing(question: str) -> Dict[str, Any]:
    """Fallback to Claude for complex date parsing."""
    try:
        current_date = datetime.now().strftime('%Y-%m-%d')

        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=500,
            temperature=0.1,
            messages=[
                {
                    "role": "user",
                    "content": f"""Parse this Strava query. Today is {current_date}.

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

        print(f"CLAUDE PARSING: '{question}' -> {json.dumps(parsed, indent=2)}")
        return parsed

    except Exception as e:
        print(f"Claude parsing failed: {e}")
        return {}

