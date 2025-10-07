from flask import Blueprint, request, jsonify
import psycopg2
from registry import get_marketing_db

marketing_bp = Blueprint('marketing', __name__, url_prefix='/api/marketing')


def get_marketing_connection():
    """Get database connection for marketing database"""
    db_config = get_marketing_db()
    return psycopg2.connect(
        host=db_config['host'],
        port=db_config['port'],
        database=db_config['database_name'],
        user=db_config['username'],
        password=db_config['password']
    )


@marketing_bp.route('/content', methods=['GET'])
def get_content():
    """Get marketing content by page/component"""
    page = request.args.get('page')
    audience = request.args.get('audience', 'default')

    try:
        conn = get_marketing_connection()
        cur = conn.cursor()

        if page:
            cur.execute("""
                SELECT key, value, content_type 
                FROM marketing_content 
                WHERE page_component = %s AND audience_segment = %s AND status = 'active' AND is_latest = true
            """, (page, audience))
        else:
            cur.execute("""
                SELECT key, value, content_type 
                FROM marketing_content 
                WHERE audience_segment = %s AND status = 'active' AND is_latest = true
            """, (audience,))

        results = cur.fetchall()
        content = {row[0]: {'value': row[1], 'type': row[2]} for row in results}

        cur.close()
        conn.close()

        return jsonify(content)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@marketing_bp.route('/content/<key>', methods=['GET'])
def get_content_by_key(key):
    """Get specific content by key"""
    try:
        conn = get_marketing_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT value, content_type 
            FROM marketing_content 
            WHERE key = %s AND status = 'active'
        """, (key,))

        result = cur.fetchone()
        cur.close()
        conn.close()

        if result:
            return jsonify({'key': key, 'value': result[0], 'type': result[1]})
        else:
            return jsonify({'error': 'Content not found'}), 404

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@marketing_bp.route('/content', methods=['POST'])
def create_content():
    """Create new marketing content"""
    data = request.get_json()

    try:
        conn = get_marketing_connection()
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO marketing_content (key, value, content_type, page_component, audience_segment)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """, (
            data['key'],
            data['value'],
            data.get('content_type', 'text'),
            data.get('page_component'),
            data.get('audience_segment', 'default')
        ))

        content_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({'id': content_id, 'message': 'Content created successfully'}), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@marketing_bp.route('/content/<key>', methods=['PUT'])
def update_content(key):
    """Update existing marketing content"""
    data = request.get_json()

    try:
        conn = get_marketing_connection()
        cur = conn.cursor()

        # Create version backup first
        cur.execute("""
            INSERT INTO content_versions (content_id, version_number, value)
            SELECT id, COALESCE(MAX(cv.version_number), 0) + 1, value
            FROM marketing_content mc
            LEFT JOIN content_versions cv ON mc.id = cv.content_id
            WHERE mc.key = %s
            GROUP BY mc.id, mc.value
        """, (key,))

        # Update content
        cur.execute("""
            UPDATE marketing_content 
            SET value = %s, updated_at = CURRENT_TIMESTAMP
            WHERE key = %s
        """, (data['value'], key))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({'message': 'Content updated successfully'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Additional endpoints for marketing_blueprint.py
# Add these routes to your existing marketing_bp Blueprint

import json
from datetime import datetime


@marketing_bp.route('/scenarios', methods=['GET'])
def get_scenarios():
    """Get all active interactive scenarios"""
    try:
        conn = get_marketing_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT scenario_key, title, description, step_count, status
            FROM interactive_scenarios 
            WHERE status = 'active'
            ORDER BY scenario_key
        """)

        results = cur.fetchall()
        scenarios = [{
            'key': row[0],
            'title': row[1],
            'description': row[2],
            'step_count': row[3],
            'status': row[4]
        } for row in results]

        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'scenarios': scenarios
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@marketing_bp.route('/scenarios/<scenario_key>', methods=['GET'])
def get_scenario(scenario_key):
    """Get specific scenario with steps"""
    try:
        conn = get_marketing_connection()
        cur = conn.cursor()

        # Get scenario with steps
        cur.execute("""
            SELECT 
                s.id, s.scenario_key, s.title, s.description, s.step_count, s.status,
                ss.step_number, ss.step_type, ss.content, ss.trigger_type, ss.trigger_delay
            FROM interactive_scenarios s
            LEFT JOIN scenario_steps ss ON s.id = ss.scenario_id
            WHERE s.scenario_key = %s AND s.status = 'active'
            ORDER BY ss.step_number
        """, (scenario_key,))

        results = cur.fetchall()
        cur.close()
        conn.close()

        if not results:
            return jsonify({'error': 'Scenario not found'}), 404

        # Build scenario object
        scenario_data = results[0]
        scenario = {
            'id': scenario_data[0],
            'key': scenario_data[1],
            'title': scenario_data[2],
            'description': scenario_data[3],
            'step_count': scenario_data[4],
            'status': scenario_data[5],
            'steps': []
        }

        # Add steps if they exist
        for row in results:
            if row[6] is not None:  # step_number exists
                scenario['steps'].append({
                    'step_number': row[6],
                    'step_type': row[7],
                    'content': row[8],  # Already JSON from database
                    'trigger_type': row[9],
                    'trigger_delay': row[10]
                })

        return jsonify({
            'success': True,
            'scenario': scenario
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@marketing_bp.route('/scenarios/<scenario_key>/analytics', methods=['POST'])
def log_scenario_analytics(scenario_key):
    """Log analytics event for scenario interaction"""
    data = request.get_json()

    try:
        conn = get_marketing_connection()
        cur = conn.cursor()

        # Create analytics table if it doesn't exist
        cur.execute("""
            CREATE TABLE IF NOT EXISTS scenario_analytics (
                id SERIAL PRIMARY KEY,
                scenario_key VARCHAR(50) NOT NULL,
                event_type VARCHAR(50) NOT NULL,
                step_number INTEGER,
                step_type VARCHAR(50),
                user_agent TEXT,
                session_id VARCHAR(100),
                ip_address INET,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Insert analytics event
        cur.execute("""
            INSERT INTO scenario_analytics 
            (scenario_key, event_type, step_number, step_type, user_agent, session_id, ip_address)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            scenario_key,
            data.get('event_type'),
            data.get('step_number'),
            data.get('step_type'),
            request.headers.get('User-Agent'),
            data.get('session_id'),
            request.remote_addr
        ))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({'success': True})

    except Exception as e:
        # Don't fail the request if analytics logging fails
        return jsonify({'success': True, 'warning': f'Analytics logging failed: {str(e)}'})


@marketing_bp.route('/scenarios', methods=['POST'])
def create_scenario():
    """Create new interactive scenario"""
    data = request.get_json()

    try:
        conn = get_marketing_connection()
        cur = conn.cursor()

        # Insert scenario
        cur.execute("""
            INSERT INTO interactive_scenarios (scenario_key, title, description, step_count, status)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """, (
            data['scenario_key'],
            data['title'],
            data.get('description', ''),
            data.get('step_count', 0),
            data.get('status', 'active')
        ))

        scenario_id = cur.fetchone()[0]

        # Insert steps if provided
        if 'steps' in data:
            for step in data['steps']:
                cur.execute("""
                    INSERT INTO scenario_steps 
                    (scenario_id, step_number, step_type, content, trigger_type, trigger_delay)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    scenario_id,
                    step['step_number'],
                    step['step_type'],
                    json.dumps(step['content']),
                    step.get('trigger_type', 'click'),
                    step.get('trigger_delay', 0)
                ))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'scenario_id': scenario_id,
            'message': 'Scenario created successfully'
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@marketing_bp.route('/scenarios/<scenario_key>', methods=['PUT'])
def update_scenario(scenario_key):
    """Update existing scenario"""
    data = request.get_json()

    try:
        conn = get_marketing_connection()
        cur = conn.cursor()

        # Update scenario
        cur.execute("""
            UPDATE interactive_scenarios 
            SET title = %s, description = %s, step_count = %s, status = %s
            WHERE scenario_key = %s
            RETURNING id
        """, (
            data.get('title'),
            data.get('description'),
            data.get('step_count'),
            data.get('status'),
            scenario_key
        ))

        result = cur.fetchone()
        if not result:
            return jsonify({'error': 'Scenario not found'}), 404

        scenario_id = result[0]

        # Update steps if provided
        if 'steps' in data:
            # Delete existing steps
            cur.execute("DELETE FROM scenario_steps WHERE scenario_id = %s", (scenario_id,))

            # Insert new steps
            for step in data['steps']:
                cur.execute("""
                    INSERT INTO scenario_steps 
                    (scenario_id, step_number, step_type, content, trigger_type, trigger_delay)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    scenario_id,
                    step['step_number'],
                    step['step_type'],
                    json.dumps(step['content']),
                    step.get('trigger_type', 'click'),
                    step.get('trigger_delay', 0)
                ))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'Scenario updated successfully'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@marketing_bp.route('/scenarios/<scenario_key>', methods=['DELETE'])
def delete_scenario(scenario_key):
    """Soft delete scenario by setting status to inactive"""
    try:
        conn = get_marketing_connection()
        cur = conn.cursor()

        cur.execute("""
            UPDATE interactive_scenarios 
            SET status = 'inactive' 
            WHERE scenario_key = %s
            RETURNING id
        """, (scenario_key,))

        result = cur.fetchone()
        if not result:
            return jsonify({'error': 'Scenario not found'}), 404

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'Scenario deactivated successfully'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@marketing_bp.route('/scenarios/analytics/summary', methods=['GET'])
def get_scenario_analytics_summary():
    """Get analytics summary for all scenarios"""
    try:
        conn = get_marketing_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT 
                scenario_key,
                event_type,
                COUNT(*) as event_count,
                COUNT(DISTINCT session_id) as unique_sessions,
                AVG(step_number) as avg_step_reached
            FROM scenario_analytics 
            WHERE timestamp >= NOW() - INTERVAL '30 days'
            GROUP BY scenario_key, event_type
            ORDER BY scenario_key, event_type
        """)

        results = cur.fetchall()
        cur.close()
        conn.close()

        analytics = {}
        for row in results:
            scenario_key = row[0]
            if scenario_key not in analytics:
                analytics[scenario_key] = {}

            analytics[scenario_key][row[1]] = {
                'event_count': row[2],
                'unique_sessions': row[3],
                'avg_step_reached': float(row[4]) if row[4] else 0
            }

        return jsonify({
            'success': True,
            'analytics': analytics,
            'period': 'last_30_days'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500