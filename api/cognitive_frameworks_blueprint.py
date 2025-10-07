from flask import Blueprint, jsonify, request
import psycopg2
import psycopg2.extras
import os
from typing import Dict, List, Optional

cognitive_frameworks_bp = Blueprint('cognitive_frameworks', __name__)


def get_db_connection():
    """Get database connection using environment variables or defaults"""
    return psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        database=os.getenv('DB_NAME', 'playbooks_db'),
        user=os.getenv('DB_USER', 'sporty'),
        password=os.getenv('DB_PASSWORD', ''),
        cursor_factory=psycopg2.extras.RealDictCursor
    )


@cognitive_frameworks_bp.route('/api/cognitive-frameworks/domains', methods=['GET'])
def get_domains():
    """Get all available domains"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT d.id, d.name, d.description, d.segment, d.complexity_level,
                   COUNT(s.id) as strategy_count
            FROM domains d
            LEFT JOIN strategies s ON d.id = s.domain_id
            GROUP BY d.id, d.name, d.description, d.segment, d.complexity_level
            ORDER BY d.name
        """)

        domains = cur.fetchall()

        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'domains': [dict(domain) for domain in domains]
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@cognitive_frameworks_bp.route('/api/cognitive-frameworks/domains/<int:domain_id>/strategies', methods=['GET'])
def get_domain_strategies(domain_id: int):
    """Get all strategies for a specific domain"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # First get domain info
        cur.execute("SELECT * FROM domains WHERE id = %s", (domain_id,))
        domain = cur.fetchone()

        if not domain:
            return jsonify({
                'success': False,
                'error': 'Domain not found'
            }), 404

        # Get strategies with scenario counts
        cur.execute("""
            SELECT s.id, s.name, s.description, s.strategy_type, 
                   s.priority_level, s.timeframe,
                   COUNT(sc.id) as scenario_count
            FROM strategies s
            LEFT JOIN scenarios sc ON s.id = sc.strategy_id
            WHERE s.domain_id = %s
            GROUP BY s.id, s.name, s.description, s.strategy_type, s.priority_level, s.timeframe
            ORDER BY s.priority_level DESC, s.name
        """, (domain_id,))

        strategies = cur.fetchall()

        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'domain': dict(domain),
            'strategies': [dict(strategy) for strategy in strategies]
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@cognitive_frameworks_bp.route('/api/cognitive-frameworks/strategies/<int:strategy_id>/scenarios', methods=['GET'])
def get_strategy_scenarios(strategy_id: int):
    """Get all scenarios for a specific strategy"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Get strategy info with domain
        cur.execute("""
            SELECT s.*, d.name as domain_name 
            FROM strategies s
            JOIN domains d ON s.domain_id = d.id
            WHERE s.id = %s
        """, (strategy_id,))
        strategy = cur.fetchone()

        if not strategy:
            return jsonify({
                'success': False,
                'error': 'Strategy not found'
            }), 404

        # Get scenarios with framework counts (including parent/child relationships)
        cur.execute("""
            SELECT sc.id, sc.name, sc.description, sc.complexity_level,
                   sc.outcome_type, sc.stakeholder_impact, sc.risk_profile,
                   sc.parent_scenario_id,
                   COUNT(f.id) as framework_count,
                   COUNT(child.id) as child_scenario_count
            FROM scenarios sc
            LEFT JOIN frameworks f ON sc.id = f.scenario_id
            LEFT JOIN scenarios child ON sc.id = child.parent_scenario_id
            WHERE sc.strategy_id = %s
            GROUP BY sc.id, sc.name, sc.description, sc.complexity_level,
                     sc.outcome_type, sc.stakeholder_impact, sc.risk_profile,
                     sc.parent_scenario_id
            ORDER BY sc.parent_scenario_id NULLS FIRST, sc.complexity_level, sc.name
        """, (strategy_id,))

        scenarios = cur.fetchall()

        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'strategy': dict(strategy),
            'scenarios': [dict(scenario) for scenario in scenarios]
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@cognitive_frameworks_bp.route('/api/cognitive-frameworks/scenarios/<int:scenario_id>/templates', methods=['GET'])
def get_scenario_templates(scenario_id: int):
    """Get framework templates for a specific scenario"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Get scenario info with strategy and domain
        cur.execute("""
            SELECT sc.*, s.name as strategy_name, d.name as domain_name 
            FROM scenarios sc
            JOIN strategies s ON sc.strategy_id = s.id
            JOIN domains d ON s.domain_id = d.id
            WHERE sc.id = %s
        """, (scenario_id,))
        scenario = cur.fetchone()

        if not scenario:
            return jsonify({
                'success': False,
                'error': 'Scenario not found'
            }), 404

        # Get framework templates ordered by stage
        cur.execute("""
            SELECT id, template, stage, stage_order
            FROM frameworks
            WHERE scenario_id = %s
            ORDER BY stage_order
        """, (scenario_id,))

        templates = cur.fetchall()

        cur.close()
        conn.close()

        # Structure templates by stage
        templates_by_stage = {}
        for template in templates:
            stage = template['stage']
            templates_by_stage[stage] = {
                'id': template['id'],
                'template': template['template'],
                'stage_order': template['stage_order']
            }

        return jsonify({
            'success': True,
            'scenario': dict(scenario),
            'templates': templates_by_stage
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@cognitive_frameworks_bp.route('/api/cognitive-frameworks/dropdown-options', methods=['GET'])
def get_dropdown_options():
    """Get dropdown options for framework templates"""
    try:
        framework_id = request.args.get('framework_id')
        stage = request.args.get('stage')
        context_filter = request.args.get('context_filter')

        if not framework_id and not stage:
            return jsonify({
                'success': False,
                'error': 'Either framework_id or stage parameter is required'
            }), 400

        conn = get_db_connection()
        cur = conn.cursor()

        # Build query based on parameters
        query = """
            SELECT stage, placeholder_key, option_text, option_value, 
                   display_order, context_filter
            FROM dropdown_options
            WHERE migrated_to_new_schema = false
        """
        params = []

        if framework_id:
            query += " AND framework_id = %s"
            params.append(framework_id)

        if stage:
            query += " AND stage = %s"
            params.append(stage)

        if context_filter:
            query += " AND (context_filter = %s OR context_filter IS NULL)"
            params.append(context_filter)

        query += " ORDER BY stage, placeholder_key, display_order"

        cur.execute(query, params)
        options = cur.fetchall()

        cur.close()
        conn.close()

        # Group options by stage and placeholder_key
        grouped_options = {}
        for option in options:
            stage_name = option['stage']
            placeholder = option['placeholder_key']

            if stage_name not in grouped_options:
                grouped_options[stage_name] = {}

            if placeholder not in grouped_options[stage_name]:
                grouped_options[stage_name][placeholder] = []

            grouped_options[stage_name][placeholder].append({
                'text': option['option_text'],
                'value': option['option_value'],
                'order': option['display_order']
            })

        # Sort each placeholder's options by display_order
        for stage_name in grouped_options:
            for placeholder in grouped_options[stage_name]:
                grouped_options[stage_name][placeholder].sort(key=lambda x: x['order'])

        return jsonify({
            'success': True,
            'dropdown_options': grouped_options
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@cognitive_frameworks_bp.route('/api/cognitive-frameworks/generate', methods=['POST'])
def generate_framework():
    """Generate complete framework from user selections"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400

        domain_id = data.get('domain_id')
        scenario_id = data.get('scenario_id')
        selections = data.get('selections', {})

        if not scenario_id:
            return jsonify({
                'success': False,
                'error': 'scenario_id is required'
            }), 400

        conn = get_db_connection()
        cur = conn.cursor()

        # Get framework templates for the scenario
        cur.execute("""
            SELECT template, stage, stage_order
            FROM frameworks
            WHERE scenario_id = %s
            ORDER BY stage_order
        """, (scenario_id,))

        templates = cur.fetchall()

        if not templates:
            return jsonify({
                'success': False,
                'error': 'No templates found for this scenario'
            }), 404

        # Generate the complete framework by replacing placeholders
        generated_framework = {}

        for template in templates:
            stage = template['stage']
            template_text = template['template']
            stage_selections = selections.get(stage, {})

            # Replace placeholders in the template
            for placeholder, value in stage_selections.items():
                placeholder_pattern = f'[{placeholder}]'
                template_text = template_text.replace(placeholder_pattern, value)

            generated_framework[stage] = template_text

        # Get scenario and strategy context for the response
        cur.execute("""
            SELECT sc.name as scenario_name, s.name as strategy_name, 
                   d.name as domain_name, sc.outcome_type, sc.risk_profile
            FROM scenarios sc
            JOIN strategies s ON sc.strategy_id = s.id
            JOIN domains d ON s.domain_id = d.id
            WHERE sc.id = %s
        """, (scenario_id,))

        context = cur.fetchone()

        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'generated_framework': generated_framework,
            'context': dict(context) if context else None,
            'selections_used': selections
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@cognitive_frameworks_bp.route('/api/cognitive-frameworks/patterns', methods=['GET'])
def get_patterns():
    """Get available patterns for meta-learning"""
    try:
        pattern_type = request.args.get('pattern_type')
        abstraction_level = request.args.get('abstraction_level')

        conn = get_db_connection()
        cur = conn.cursor()

        query = "SELECT * FROM patterns WHERE 1=1"
        params = []

        if pattern_type:
            query += " AND pattern_type = %s"
            params.append(pattern_type)

        if abstraction_level:
            query += " AND abstraction_level = %s"
            params.append(abstraction_level)

        query += " ORDER BY success_rate DESC, usage_count DESC"

        cur.execute(query, params)
        patterns = cur.fetchall()

        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'patterns': [dict(pattern) for pattern in patterns]
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@cognitive_frameworks_bp.route('/api/cognitive-frameworks/semantic-mappings/<int:domain_id>', methods=['GET'])
def get_semantic_mappings(domain_id: int):
    """Get domain-specific terminology mappings"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT universal_term, domain_specific_term, context_description
            FROM semantic_mappings
            WHERE domain_id = %s
            ORDER BY universal_term
        """, (domain_id,))

        mappings = cur.fetchall()

        cur.close()
        conn.close()

        # Structure as a mapping dictionary
        term_mappings = {}
        for mapping in mappings:
            universal = mapping['universal_term']
            term_mappings[universal] = {
                'domain_term': mapping['domain_specific_term'],
                'description': mapping['context_description']
            }

        return jsonify({
            'success': True,
            'semantic_mappings': term_mappings
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# Error handlers
@cognitive_frameworks_bp.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Resource not found'
    }), 404


@cognitive_frameworks_bp.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500