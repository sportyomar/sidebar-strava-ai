from flask import Blueprint, jsonify, request
import json
from registry import get_welcome_db
import logging

welcome_bp = Blueprint('welcome', __name__)

logger = logging.getLogger(__name__)


def get_content_by_audience(audience_segment):
    """
    Fetch all welcome page content for a specific audience segment
    """
    try:
        conn = get_welcome_db()
        cursor = conn.cursor()

        # Fetch all welcome page content for the specified audience
        query = """
            SELECT key, content_type, value 
            FROM marketing_content 
            WHERE page_component = 'welcome_page' 
            AND audience_segment = %s 
            AND status = 'active' 
            AND is_latest = true
            ORDER BY key
        """

        cursor.execute(query, (audience_segment,))
        results = cursor.fetchall()

        content = {}
        for row in results:
            key, content_type, value = row

            # Parse JSON content
            if content_type == 'json':
                try:
                    content[key] = json.loads(value)
                except json.JSONDecodeError:
                    logger.error(f"Failed to parse JSON for key: {key}")
                    content[key] = value
            else:
                content[key] = value

        cursor.close()
        conn.close()

        return content

    except Exception as e:
        logger.error(f"Error fetching content for audience {audience_segment}: {str(e)}")
        return None


def get_use_cases_by_audience(audience_segment):
    """
    Fetch just the use cases for a specific audience segment
    """
    try:
        conn = get_welcome_db()
        cursor = conn.cursor()

        key = f'welcome_use_cases_{audience_segment}'
        query = """
            SELECT value 
            FROM marketing_content 
            WHERE key = %s 
            AND status = 'active' 
            AND is_latest = true
        """

        cursor.execute(query, (key,))
        result = cursor.fetchone()

        cursor.close()
        conn.close()

        if result:
            try:
                return json.loads(result[0])
            except json.JSONDecodeError:
                logger.error(f"Failed to parse JSON for use cases: {key}")
                return []

        return []

    except Exception as e:
        logger.error(f"Error fetching use cases for audience {audience_segment}: {str(e)}")
        return []


def get_teams_by_audience(audience_segment):
    """
    Fetch just the teams for a specific audience segment
    """
    try:
        conn = get_welcome_db()
        cursor = conn.cursor()

        key = f'welcome_teams_{audience_segment}'
        query = """
            SELECT value 
            FROM marketing_content 
            WHERE key = %s 
            AND status = 'active' 
            AND is_latest = true
        """

        cursor.execute(query, (key,))
        result = cursor.fetchone()

        cursor.close()
        conn.close()

        if result:
            try:
                return json.loads(result[0])
            except json.JSONDecodeError:
                logger.error(f"Failed to parse JSON for teams: {key}")
                return []

        return []

    except Exception as e:
        logger.error(f"Error fetching teams for audience {audience_segment}: {str(e)}")
        return []


def get_animation_data_by_audience(audience_segment):
    """
    Fetch both teams and use cases for a specific audience segment
    """
    teams = get_teams_by_audience(audience_segment)
    use_cases = get_use_cases_by_audience(audience_segment)

    return {
        'teams': teams,
        'use_cases': use_cases
    }


@welcome_bp.route('/api/welcome/content/<audience_segment>', methods=['GET'])
def get_welcome_content(audience_segment):
    """
    Get all welcome page content for business or engineer audience
    """
    # Validate audience segment
    if audience_segment not in ['business', 'engineer']:
        return jsonify({
            'error': 'Invalid audience segment. Must be "business" or "engineer"'
        }), 400

    content = get_content_by_audience(audience_segment)

    if content is None:
        return jsonify({
            'error': 'Failed to fetch content'
        }), 500

    if not content:
        return jsonify({
            'error': f'No content found for audience: {audience_segment}'
        }), 404

    return jsonify({
        'audience_segment': audience_segment,
        'content': content
    })


@welcome_bp.route('/api/welcome/use-cases/<audience_segment>', methods=['GET'])
def get_welcome_use_cases(audience_segment):
    """
    Get just the animated use cases for business or engineer audience
    """
    # Validate audience segment
    if audience_segment not in ['business', 'engineer']:
        return jsonify({
            'error': 'Invalid audience segment. Must be "business" or "engineer"'
        }), 400

    use_cases = get_use_cases_by_audience(audience_segment)

    return jsonify({
        'audience_segment': audience_segment,
        'use_cases': use_cases
    })


@welcome_bp.route('/api/welcome/teams/<audience_segment>', methods=['GET'])
def get_welcome_teams(audience_segment):
    """
    Get just the animated teams for business or engineer audience
    """
    # Validate audience segment
    if audience_segment not in ['business', 'engineer']:
        return jsonify({
            'error': 'Invalid audience segment. Must be "business" or "engineer"'
        }), 400

    teams = get_teams_by_audience(audience_segment)

    return jsonify({
        'audience_segment': audience_segment,
        'teams': teams
    })


@welcome_bp.route('/api/welcome/animation-data/<audience_segment>', methods=['GET'])
def get_welcome_animation_data(audience_segment):
    """
    Get both teams and use cases for business or engineer audience in one call
    """
    # Validate audience segment
    if audience_segment not in ['business', 'engineer']:
        return jsonify({
            'error': 'Invalid audience segment. Must be "business" or "engineer"'
        }), 400

    animation_data = get_animation_data_by_audience(audience_segment)

    return jsonify({
        'audience_segment': audience_segment,
        **animation_data
    })


@welcome_bp.route('/api/welcome/content', methods=['GET'])
def get_all_welcome_content():
    """
    Get content for both business and engineer audiences in one call
    """
    business_content = get_content_by_audience('business')
    engineer_content = get_content_by_audience('engineer')

    if business_content is None or engineer_content is None:
        return jsonify({
            'error': 'Failed to fetch content'
        }), 500

    return jsonify({
        'business': business_content,
        'engineer': engineer_content
    })


@welcome_bp.route('/api/welcome/health', methods=['GET'])
def health_check():
    """
    Simple health check endpoint
    """
    return jsonify({
        'status': 'healthy',
        'service': 'welcome_page_api'
    })


# Error handlers
@welcome_bp.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'Endpoint not found'
    }), 404


@welcome_bp.errorhandler(500)
def internal_error(error):
    return jsonify({
        'error': 'Internal server error'
    }), 500