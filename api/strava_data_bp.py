from flask import Blueprint, request, jsonify
import requests
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from strava_oauth_bp import get_valid_token
from strava_constants_bp import STRAVA_API_BASE
from strava_ai_bp import parse_query_with_claude

# Create the blueprint
strava_data_bp = Blueprint('strava_data', __name__, url_prefix='/api/strava/data')

# Strava API base URL
STRAVA_API_BASE = 'https://www.strava.com/api/v3'


@strava_data_bp.route('/activities', methods=['GET'])
def get_activities():
    """Fetch athlete's activities with optional filters."""

    try:
        # Get user_id
        user_id = request.args.get('user_id', 'default_user')

        # Get valid token (will auto-refresh if needed)
        access_token = get_valid_token(user_id)
        if not access_token:
            return jsonify({'error': 'Not connected to Strava'}), 401

        # Get query parameters for filtering
        after = request.args.get('after')  # Unix timestamp or ISO date
        before = request.args.get('before')
        activity_type = request.args.get('type')  # Run, Ride, Swim, etc.
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 30, type=int)

        # Build Strava API request
        params = {
            'page': page,
            'per_page': min(per_page, 200)  # Strava max is 200
        }

        # Add time filters if provided
        if after:
            params['after'] = parse_datetime_to_unix(after)
        if before:
            params['before'] = parse_datetime_to_unix(before)

        # Fetch from Strava
        response = requests.get(
            f'{STRAVA_API_BASE}/athlete/activities',
            headers={'Authorization': f'Bearer {access_token}'},
            params=params
        )

        if response.status_code != 200:
            return jsonify({
                'error': 'Failed to fetch activities from Strava',
                'details': response.text
            }), response.status_code

        activities = response.json()

        # Filter by activity type if specified
        if activity_type:
            activities = [a for a in activities if a.get('type') == activity_type]

        return jsonify({
            'activities': activities,
            'count': len(activities),
            'page': page,
            'per_page': per_page
        })

    except Exception as e:
        return jsonify({
            'error': 'Failed to fetch activities',
            'details': str(e)
        }), 500


@strava_data_bp.route('/activities/<int:activity_id>', methods=['GET'])
def get_activity_detail(activity_id):
    """Fetch detailed information for a specific activity."""

    try:
        user_id = request.args.get('user_id', 'default_user')

        access_token = get_valid_token(user_id)
        if not access_token:
            return jsonify({'error': 'Not connected to Strava'}), 401

        # Fetch activity details
        response = requests.get(
            f'{STRAVA_API_BASE}/activities/{activity_id}',
            headers={'Authorization': f'Bearer {access_token}'}
        )

        if response.status_code != 200:
            return jsonify({
                'error': 'Failed to fetch activity',
                'details': response.text
            }), response.status_code

        return jsonify(response.json())

    except Exception as e:
        return jsonify({
            'error': 'Failed to fetch activity detail',
            'details': str(e)
        }), 500


@strava_data_bp.route('/athlete', methods=['GET'])
def get_athlete():
    """Fetch athlete profile information."""

    try:
        user_id = request.args.get('user_id', 'default_user')

        access_token = get_valid_token(user_id)
        if not access_token:
            return jsonify({'error': 'Not connected to Strava'}), 401

        response = requests.get(
            f'{STRAVA_API_BASE}/athlete',
            headers={'Authorization': f'Bearer {access_token}'}
        )

        if response.status_code != 200:
            return jsonify({
                'error': 'Failed to fetch athlete data',
                'details': response.text
            }), response.status_code

        return jsonify(response.json())

    except Exception as e:
        return jsonify({
            'error': 'Failed to fetch athlete',
            'details': str(e)
        }), 500


@strava_data_bp.route('/stats', methods=['GET'])
def get_athlete_stats():
    """Fetch athlete statistics (totals and recent activities)."""

    try:
        user_id = request.args.get('user_id', 'default_user')
        athlete_id = request.args.get('athlete_id')

        if not athlete_id:
            return jsonify({'error': 'athlete_id is required'}), 400

        access_token = get_valid_token(user_id)
        if not access_token:
            return jsonify({'error': 'Not connected to Strava'}), 401

        response = requests.get(
            f'{STRAVA_API_BASE}/athletes/{athlete_id}/stats',
            headers={'Authorization': f'Bearer {access_token}'}
        )

        if response.status_code != 200:
            return jsonify({
                'error': 'Failed to fetch stats',
                'details': response.text
            }), response.status_code

        return jsonify(response.json())

    except Exception as e:
        return jsonify({
            'error': 'Failed to fetch stats',
            'details': str(e)
        }), 500


@strava_data_bp.route('/activities/summary', methods=['GET'])
def get_activities_summary():
    """Get aggregated summary of activities (custom endpoint)."""

    try:
        user_id = request.args.get('user_id', 'default_user')
        days = request.args.get('days', 30, type=int)
        activity_type = request.args.get('type')

        access_token = get_valid_token(user_id)
        if not access_token:
            return jsonify({'error': 'Not connected to Strava'}), 401

        # Calculate time range
        after_timestamp = int((datetime.now() - timedelta(days=days)).timestamp())

        # Fetch activities
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
            return jsonify({
                'error': 'Failed to fetch activities',
                'details': response.text
            }), response.status_code

        activities = response.json()

        # Filter by type if specified
        if activity_type:
            activities = [a for a in activities if a.get('type') == activity_type]

        # Calculate summary statistics
        summary = calculate_summary(activities)

        return jsonify({
            'period': f'last_{days}_days',
            'activity_count': len(activities),
            'summary': summary,
            'activities_included': len(activities)
        })

    except Exception as e:
        return jsonify({
            'error': 'Failed to calculate summary',
            'details': str(e)
        }), 500


def calculate_summary(activities: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculate summary statistics from activities."""

    if not activities:
        return {
            'total_distance': 0,
            'total_time': 0,
            'total_elevation': 0,
            'activity_count': 0
        }

    total_distance = sum(a.get('distance', 0) for a in activities)  # meters
    total_moving_time = sum(a.get('moving_time', 0) for a in activities)  # seconds
    total_elapsed_time = sum(a.get('elapsed_time', 0) for a in activities)  # seconds
    total_elevation = sum(a.get('total_elevation_gain', 0) for a in activities)  # meters

    # Calculate average pace (for runs)
    runs = [a for a in activities if a.get('type') == 'Run']
    avg_pace = None
    if runs and total_distance > 0:
        avg_pace_seconds_per_km = (total_moving_time / (total_distance / 1000))
        avg_pace = avg_pace_seconds_per_km  # seconds per km

    return {
        'total_distance_meters': total_distance,
        'total_distance_miles': total_distance / 1609.34,
        'total_moving_time_seconds': total_moving_time,
        'total_elapsed_time_seconds': total_elapsed_time,
        'total_elevation_meters': total_elevation,
        'total_elevation_feet': total_elevation * 3.28084,
        'activity_count': len(activities),
        'avg_pace_seconds_per_km': avg_pace,
        'activity_types': list(set(a.get('type') for a in activities))
    }


def parse_datetime_to_unix(date_str: str) -> int:
    """Convert ISO date string or unix timestamp to unix timestamp."""

    # If it's already a unix timestamp
    try:
        return int(date_str)
    except ValueError:
        pass

    # Try parsing as ISO date
    try:
        dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        return int(dt.timestamp())
    except:
        # Default to current time
        return int(datetime.now().timestamp())


@strava_data_bp.route('/test-api-call', methods=['POST'])
def test_api_call():
    """Proxy endpoint to test Strava API calls directly from the UI."""
    try:
        data = request.get_json()
        endpoint = data.get('endpoint')
        params = data.get('params', {})
        user_id = data.get('user_id', 'default_user')
        question = data.get('question')  # Optional question for hybrid parsing

        access_token = get_valid_token(user_id)
        if not access_token:
            return jsonify({'error': 'Not connected to Strava'}), 401

        processed_params = {}

        # If a question is provided, use the same hybrid parsing logic as AI endpoint
        if question:
            # Import the hybrid parsing function
            from strava_ai_bp import parse_query_with_claude

            # Parse the question using the same logic
            parsed_query = parse_query_with_claude(question)

            if parsed_query and 'time_filter' in parsed_query:
                time_filter = parsed_query['time_filter']
                start_date = time_filter.get('start_date')
                end_date = time_filter.get('end_date')

                if start_date and end_date:
                    import pytz
                    user_tz = pytz.timezone('America/New_York')

                    # Use the same timestamp conversion logic as fetch_relevant_data
                    start_dt = datetime.fromisoformat(start_date)
                    start_dt = user_tz.localize(start_dt.replace(hour=0, minute=0, second=0))
                    after_timestamp = int(start_dt.timestamp())

                    end_dt = datetime.fromisoformat(end_date)
                    end_dt = user_tz.localize(end_dt.replace(hour=23, minute=59, second=59))
                    before_timestamp = int(end_dt.timestamp())

                    processed_params['after'] = after_timestamp
                    processed_params['before'] = before_timestamp

                    # Add activity type filter if specified
                    activity_type = parsed_query.get('activity_type')
                    if activity_type and activity_type != 'all':
                        processed_params['type'] = activity_type

            # Add any additional params that weren't from parsing
            for key, value in params.items():
                if key not in processed_params:
                    processed_params[key] = value

        else:
            # Fallback to original logic for direct API calls without questions
            import pytz
            user_tz = pytz.timezone('America/New_York')

            for key, value in params.items():
                if key in ['after', 'before'] and isinstance(value, str):
                    try:
                        dt = datetime.fromisoformat(value.replace('Z', '+00:00'))

                        # If this looks like a date string, apply timezone logic
                        if key == 'after':
                            dt = user_tz.localize(dt.replace(hour=0, minute=0, second=0))
                        elif key == 'before':
                            dt = user_tz.localize(dt.replace(hour=23, minute=59, second=59))

                        processed_params[key] = int(dt.timestamp())
                    except:
                        processed_params[key] = value
                else:
                    processed_params[key] = value

        # Make the actual Strava API call
        response = requests.get(
            f'{STRAVA_API_BASE}{endpoint}',
            headers={'Authorization': f'Bearer {access_token}'},
            params=processed_params
        )

        if response.status_code != 200:
            return jsonify({
                'error': f'Strava API returned {response.status_code}',
                'details': response.text
            }), response.status_code

        activities = response.json()

        return jsonify({
            'activities': activities,
            'count': len(activities),
            'endpoint': endpoint,
            'params_sent': processed_params,
            'original_params': params,
            'parsing_method': 'hybrid' if question else 'direct',
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@strava_data_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'strava_data'
    })