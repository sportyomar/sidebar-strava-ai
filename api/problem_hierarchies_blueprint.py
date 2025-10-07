from flask import Blueprint, request, jsonify
import psycopg2
from registry import get_playbooks_db

problem_hierarchy_bp = Blueprint('problem_hierarchy', __name__, url_prefix='/api/problem-hierarchy')


def get_playbook_connection():
    """Get database connection for playbooks database"""
    db_config = get_playbooks_db()
    # Update database name for playbooks_db
    db_config['database_name'] = 'playbooks_db'
    return psycopg2.connect(
        host=db_config['host'],
        port=db_config['port'],
        database=db_config['database_name'],
        user=db_config['username'],
        password=db_config['password']
    )


@problem_hierarchy_bp.route('/templates/<int:industry_id>/<int:use_case_id>', methods=['GET'])
def get_problem_hierarchy_templates(industry_id, use_case_id):
    """Get problem hierarchy templates and dropdown options for dynamic sentence building"""
    try:
        conn = get_playbook_connection()
        cur = conn.cursor()

        # Get use case info first
        cur.execute("""
            SELECT uc.text, uc.category, t.name as team_name, i.name as industry_name
            FROM use_cases uc
            JOIN teams t ON uc.team_id = t.id
            JOIN industries i ON uc.industry_id = i.id
            WHERE uc.id = %s AND i.id = %s
        """, (use_case_id, industry_id))

        use_case_result = cur.fetchone()
        if not use_case_result:
            return jsonify({'error': 'Use case not found'}), 404

        use_case_text, category, team_name, industry_name = use_case_result

        # Get problem hierarchy templates
        cur.execute("""
            SELECT stage, narrative, template
            FROM problem_hierarchies
            WHERE industry_id = %s AND use_case_id = %s
            ORDER BY 
                CASE stage
                    WHEN 'problem' THEN 1
                    WHEN 'problem_detail' THEN 2
                    WHEN 'ai_solution' THEN 3
                    WHEN 'ai_risk' THEN 4
                    WHEN 'our_solution' THEN 5
                    ELSE 6
                END
        """, (industry_id, use_case_id))

        hierarchy_results = cur.fetchall()

        # Get all dropdown options for this industry (industry-specific + global)
        cur.execute("""
            SELECT stage, placeholder_key, option_text, display_order
            FROM dropdown_options
            WHERE hierarchy_id IS NULL  -- Global options for now
            ORDER BY stage, placeholder_key, display_order
        """)

        dropdown_results = cur.fetchall()

        # Structure the hierarchy templates
        templates = {}
        for stage, narrative, template in hierarchy_results:
            templates[stage] = {
                'narrative': narrative,
                'template': template
            }

        # Structure the dropdown options
        dropdown_options = {}
        for stage, placeholder_key, option_text, display_order in dropdown_results:
            if stage not in dropdown_options:
                dropdown_options[stage] = {}
            if placeholder_key not in dropdown_options[stage]:
                dropdown_options[stage][placeholder_key] = []

            dropdown_options[stage][placeholder_key].append({
                'text': option_text,
                'order': display_order
            })

        # Sort each dropdown by display_order
        for stage in dropdown_options:
            for key in dropdown_options[stage]:
                dropdown_options[stage][key].sort(key=lambda x: x['order'])

        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'use_case': {
                'id': use_case_id,
                'text': use_case_text,
                'category': category,
                'team_name': team_name,
                'industry_name': industry_name
            },
            'templates': templates,
            'dropdown_options': dropdown_options
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@problem_hierarchy_bp.route('/generate', methods=['POST'])
def generate_problem_hierarchy():
    """Generate complete problem hierarchy sentences from user selections"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'JSON data required'}), 400

        industry_id = data.get('industry_id')
        use_case_id = data.get('use_case_id')
        selections = data.get('selections', {})

        if not industry_id or not use_case_id:
            return jsonify({'error': 'industry_id and use_case_id required'}), 400

        conn = get_playbook_connection()
        cur = conn.cursor()

        # Get templates for this use case
        cur.execute("""
            SELECT stage, template
            FROM problem_hierarchies
            WHERE industry_id = %s AND use_case_id = %s
        """, (industry_id, use_case_id))

        template_results = cur.fetchall()

        if not template_results:
            return jsonify({'error': 'No templates found for this use case'}), 404

        # Generate sentences by replacing placeholders
        generated_hierarchy = {}
        for stage, template in template_results:
            if template and stage in selections:
                # Replace placeholders with user selections
                sentence = template
                stage_selections = selections[stage]

                for placeholder_key, selected_text in stage_selections.items():
                    placeholder = f'[{placeholder_key}]'
                    sentence = sentence.replace(placeholder, selected_text)

                generated_hierarchy[stage] = sentence
            elif template:
                # Return template as-is if no selections provided for this stage
                generated_hierarchy[stage] = template

        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'industry_id': industry_id,
            'use_case_id': use_case_id,
            'generated_hierarchy': generated_hierarchy,
            'selections_used': selections
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@problem_hierarchy_bp.route('/dropdown-options', methods=['GET'])
def get_dropdown_options():
    """Get all dropdown options, optionally filtered by stage or industry"""
    stage = request.args.get('stage')
    industry_id = request.args.get('industry_id')

    try:
        conn = get_playbook_connection()
        cur = conn.cursor()

        query = """
            SELECT stage, placeholder_key, option_text, display_order, hierarchy_id
            FROM dropdown_options
            WHERE 1=1
        """
        params = []

        if stage:
            query += " AND stage = %s"
            params.append(stage)

        if industry_id:
            # Include both global options (hierarchy_id IS NULL) and industry-specific options
            query += " AND (hierarchy_id IS NULL OR hierarchy_id IN (SELECT id FROM problem_hierarchies WHERE industry_id = %s))"
            params.append(industry_id)
        else:
            # Only global options if no industry specified
            query += " AND hierarchy_id IS NULL"

        query += " ORDER BY stage, placeholder_key, display_order"

        cur.execute(query, params)
        results = cur.fetchall()

        # Structure the options
        options = {}
        for stage, placeholder_key, option_text, display_order, hierarchy_id in results:
            if stage not in options:
                options[stage] = {}
            if placeholder_key not in options[stage]:
                options[stage][placeholder_key] = []

            options[stage][placeholder_key].append({
                'text': option_text,
                'order': display_order,
                'is_global': hierarchy_id is None
            })

        # Sort each dropdown by display_order
        for stage in options:
            for key in options[stage]:
                options[stage][key].sort(key=lambda x: x['order'])

        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'dropdown_options': options,
            'filters': {
                'stage': stage,
                'industry_id': industry_id
            }
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@problem_hierarchy_bp.route('/stages', methods=['GET'])
def get_stages():
    """Get all available stages in the problem hierarchy"""
    try:
        conn = get_playbook_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT DISTINCT stage, COUNT(*) as template_count
            FROM problem_hierarchies
            WHERE stage IS NOT NULL
            GROUP BY stage
            ORDER BY 
                CASE stage
                    WHEN 'problem' THEN 1
                    WHEN 'problem_detail' THEN 2
                    WHEN 'ai_solution' THEN 3
                    WHEN 'ai_risk' THEN 4
                    WHEN 'our_solution' THEN 5
                    ELSE 6
                END
        """)

        stages = cur.fetchall()

        stages_data = [
            {
                'name': stage[0],
                'template_count': stage[1],
                'order': i + 1
            }
            for i, stage in enumerate(stages)
        ]

        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'stages': stages_data
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@problem_hierarchy_bp.route('/placeholder-keys', methods=['GET'])
def get_placeholder_keys():
    """Get all available placeholder keys grouped by stage"""
    stage = request.args.get('stage')

    try:
        conn = get_playbook_connection()
        cur = conn.cursor()

        query = """
            SELECT DISTINCT stage, placeholder_key, COUNT(*) as option_count
            FROM dropdown_options
            WHERE placeholder_key IS NOT NULL
        """
        params = []

        if stage:
            query += " AND stage = %s"
            params.append(stage)

        query += " GROUP BY stage, placeholder_key ORDER BY stage, placeholder_key"

        cur.execute(query, params)
        results = cur.fetchall()

        # Structure by stage
        placeholder_keys = {}
        for stage, placeholder_key, option_count in results:
            if stage not in placeholder_keys:
                placeholder_keys[stage] = []

            placeholder_keys[stage].append({
                'key': placeholder_key,
                'option_count': option_count
            })

        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'placeholder_keys': placeholder_keys,
            'stage_filter': stage
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500