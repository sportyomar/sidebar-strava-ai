from flask import Blueprint, request, jsonify
import psycopg2
from psycopg2.extras import RealDictCursor
from registry import get_policies_db
import json
from datetime import datetime

strava_policies_bp = Blueprint('strava_policies', __name__, url_prefix='/api/strava/policies')


def get_db_connection():
    db_config = get_policies_db()
    return psycopg2.connect(
        host=db_config['host'],
        port=db_config['port'],
        database=db_config['database_name'],
        user=db_config['username'],
        password=db_config['password']
    )


@strava_policies_bp.route('/rules', methods=['GET'])
def get_strava_policy_rules():
    """Get Strava-specific policy rules"""
    category = request.args.get('category')

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            base_query = "SELECT * FROM policy_rules WHERE name LIKE 'strava_%' OR category IN ('data_quality', 'coverage', 'calculation')"

            if category:
                cur.execute(base_query + " AND category = %s ORDER BY name", (category,))
            else:
                cur.execute(base_query + " ORDER BY category, name")

            rules = cur.fetchall()
            return jsonify([dict(rule) for rule in rules])


@strava_policies_bp.route('/coverage-calculation', methods=['POST'])
def calculate_strava_coverage():
    """Calculate coverage for Strava data based on policy settings"""
    data = request.get_json()
    method = data.get('method', 'activities_analyzed')
    context = data.get('context', {})
    user_id = data.get('user_id', 'anonymous')

    # Get user's coverage calculation preference
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT custom_value FROM user_policy_preferences up
                JOIN policy_rules pr ON up.policy_rule_id = pr.id
                WHERE up.user_id = %s AND pr.name = 'coverage_calculation_method'
            """, (user_id,))

            user_pref = cur.fetchone()
            if user_pref:
                method = user_pref['custom_value'].get('value', method)

    if method == 'activities_analyzed':
        total_available = context.get('total_activities', 0)
        analyzed = context.get('activities_analyzed', 0)
        coverage = (analyzed / total_available * 100) if total_available > 0 else 0

        return jsonify({
            'coverage_percentage': round(coverage, 1),
            'method': method,
            'details': f"{analyzed} of {total_available} activities",
            'badge_text': f"{analyzed} of {total_available} activities" if coverage < 100 else "Complete dataset",
            'quality_level': 'high' if coverage > 90 else 'medium' if coverage > 70 else 'low'
        })

    elif method == 'time_period_covered':
        requested_days = context.get('requested_days', 30)
        actual_days = context.get('actual_days_covered', 0)
        coverage = (actual_days / requested_days * 100) if requested_days > 0 else 0

        return jsonify({
            'coverage_percentage': round(coverage, 1),
            'method': method,
            'details': f"{actual_days} of {requested_days} days covered",
            'badge_text': f"{actual_days}/{requested_days} days",
            'quality_level': 'high' if coverage > 90 else 'medium' if coverage > 70 else 'low'
        })

    elif method == 'data_fields_available':
        required_fields = context.get('required_fields', [])
        available_fields = context.get('available_fields', [])
        missing_fields = set(required_fields) - set(available_fields)
        coverage = ((len(required_fields) - len(missing_fields)) / len(
            required_fields) * 100) if required_fields else 100

        return jsonify({
            'coverage_percentage': round(coverage, 1),
            'method': method,
            'details': f"{len(available_fields)} of {len(required_fields)} required fields",
            'badge_text': "All fields available" if coverage == 100 else f"Missing: {', '.join(missing_fields)}",
            'quality_level': 'high' if coverage == 100 else 'medium' if coverage > 80 else 'low'
        })

    return jsonify({'error': 'Unknown calculation method'}), 400


@strava_policies_bp.route('/data-quality-check', methods=['POST'])
def check_data_quality():
    """Check data quality based on Strava-specific policies"""
    data = request.get_json()
    activities = data.get('activities', [])
    user_id = data.get('user_id', 'anonymous')

    # Get user's data quality thresholds
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT pr.name, COALESCE(up.custom_value, pr.default_value) as value
                FROM policy_rules pr
                LEFT JOIN user_policy_preferences up ON pr.id = up.policy_rule_id AND up.user_id = %s
                WHERE pr.category = 'data_quality'
            """, (user_id,))

            policies = {row['name']: row['value'] for row in cur.fetchall()}

    completeness_threshold = policies.get('data_completeness_threshold', {}).get('value', 0.8)
    require_gps = policies.get('require_gps_data', {}).get('value', False)
    max_age_hours = policies.get('max_data_age_hours', {}).get('value', 24)

    quality_issues = []
    passed_activities = 0

    for activity in activities:
        activity_issues = []

        # Check GPS requirement
        if require_gps and not activity.get('start_latlng'):
            activity_issues.append('Missing GPS data')

        # Check data age
        if 'start_date' in activity:
            # Data age check logic here
            pass

        # Check required fields completeness
        required_fields = ['distance', 'moving_time', 'type']
        missing_fields = [field for field in required_fields if not activity.get(field)]

        if len(missing_fields) / len(required_fields) > (1 - completeness_threshold):
            activity_issues.append(f"Missing critical fields: {', '.join(missing_fields)}")

        if not activity_issues:
            passed_activities += 1
        else:
            quality_issues.append({
                'activity_id': activity.get('id'),
                'activity_name': activity.get('name'),
                'issues': activity_issues
            })

    total_activities = len(activities)
    quality_score = (passed_activities / total_activities * 100) if total_activities > 0 else 0

    return jsonify({
        'quality_score': round(quality_score, 1),
        'passed_activities': passed_activities,
        'total_activities': total_activities,
        'issues': quality_issues,
        'policies_applied': {
            'completeness_threshold': completeness_threshold,
            'require_gps': require_gps,
            'max_age_hours': max_age_hours
        }
    })


@strava_policies_bp.route('/user-preferences/<user_id>', methods=['GET'])
def get_user_strava_preferences(user_id):
    """Get user's Strava-specific policy preferences"""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT up.*, pr.name, pr.category, pr.rule_type, pr.default_value, pr.constraints
                FROM user_policy_preferences up
                JOIN policy_rules pr ON up.policy_rule_id = pr.id
                WHERE up.user_id = %s AND (pr.name LIKE 'strava_%' OR pr.category IN ('data_quality', 'coverage', 'calculation'))
            """, (user_id,))

            preferences = cur.fetchall()
            return jsonify([dict(pref) for pref in preferences])


@strava_policies_bp.route('/user-preferences', methods=['POST'])
def set_user_strava_preference():
    """Set user's Strava policy preference"""
    data = request.get_json()

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO user_policy_preferences (user_id, policy_rule_id, custom_value, context)
                VALUES (%(user_id)s, %(policy_rule_id)s, %(custom_value)s, %(context)s)
                ON CONFLICT (user_id, policy_rule_id) 
                DO UPDATE SET custom_value = %(custom_value)s, context = %(context)s, updated_at = NOW()
                RETURNING *
            """, data)

            preference = cur.fetchone()
            conn.commit()
            return jsonify(dict(preference))


# Add to strava_policies_bp.py
@strava_policies_bp.route('/debug-coverage', methods=['POST'])
def debug_coverage_calculation():
    """Debug coverage calculation step by step"""
    data = request.get_json()
    context = data.get('context', {})

    debug_info = {
        'input_context': context,
        'total_activities': context.get('total_activities', 0),
        'activities_analyzed': context.get('activities_analyzed', 0),
        'calculation_steps': []
    }

    # Step 1: Check what data we received
    debug_info['calculation_steps'].append({
        'step': 'data_validation',
        'total_available': context.get('total_activities', 0),
        'actually_analyzed': context.get('activities_analyzed', 0),
        'source': 'frontend_context'
    })

    # Step 2: Calculate coverage
    total = context.get('total_activities', 0)
    analyzed = context.get('activities_analyzed', 0)

    if total > 0:
        coverage = (analyzed / total * 100)
        debug_info['calculation_steps'].append({
            'step': 'coverage_calculation',
            'formula': f'{analyzed} / {total} * 100',
            'result': coverage,
            'rounded': round(coverage, 1)
        })
    else:
        debug_info['calculation_steps'].append({
            'step': 'coverage_calculation',
            'error': 'total_activities is 0 or missing'
        })

    return jsonify(debug_info)


@strava_policies_bp.route('/prompts', methods=['GET'])
def get_prompts():
    """Get all system prompts with versions"""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT id, name, version, status, created_at, violation_count FROM system_prompts ORDER BY name, version")
            prompts = cur.fetchall()
            return jsonify([dict(prompt) for prompt in prompts])


@strava_policies_bp.route('/prompts/<prompt_name>/active', methods=['GET'])
def get_active_prompt(prompt_name):
    """Get active prompt content for LLM execution"""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT id, content, version FROM system_prompts WHERE name = %s AND status = 'active'",
                        (prompt_name,))
            result = cur.fetchone()
            if result:
                return jsonify(dict(result))
            return jsonify({'error': 'No active prompt found'}), 404


@strava_policies_bp.route('/prompts/executions', methods=['POST'])
def log_prompt_execution():
    """Log prompt execution results and policy violations"""
    data = request.get_json()

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Calculate selection ratio and check violations
            activities_available = data.get('activities_available', 0)
            activities_analyzed = data.get('activities_analyzed', 0)
            selection_ratio = activities_analyzed / activities_available if activities_available > 0 else 0

            # Check policy violations
            violations = []
            if selection_ratio < 0.8:  # llm_selection_threshold
                violations.append({
                    'rule': 'llm_selection_threshold',
                    'value': selection_ratio,
                    'threshold': 0.8,
                    'message': f'Selected {activities_analyzed}/{activities_available} activities ({selection_ratio:.1%}) below 80% threshold'
                })

            # Insert execution record
            cur.execute("""
                INSERT INTO prompt_executions (prompt_id, query, activities_available, activities_analyzed, 
                                             selection_ratio, policy_violations, execution_data)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                data.get('prompt_id'),
                data.get('query'),
                activities_available,
                activities_analyzed,
                selection_ratio,
                json.dumps(violations),
                json.dumps(data.get('response_data', {}))
            ))

            execution_id = cur.fetchone()['id']

            # Update prompt violation count if violations occurred
            if violations:
                cur.execute("UPDATE system_prompts SET violation_count = violation_count + 1 WHERE id = %s",
                            (data.get('prompt_id'),))

            conn.commit()

            return jsonify({
                'execution_id': execution_id,
                'selection_ratio': selection_ratio,
                'violations': violations,
                'violation_count': len(violations)
            })