from flask import Blueprint, request, jsonify
import psycopg2
from registry import get_playbooks_db

playbook_bp = Blueprint('playbook', __name__, url_prefix='/api/playbook')


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


@playbook_bp.route('/industries', methods=['GET'])
def get_industries():
    """Get all industries with nested teams and use cases"""
    # Optional filters
    segment = request.args.get('segment')
    team_filter = request.args.get('team')
    org_size = request.args.get('org_size')

    try:
        conn = get_playbook_connection()
        cur = conn.cursor()

        # Base query for industries
        industry_query = """
            SELECT DISTINCT i.id, i.name, i.description, i.segment
            FROM industries i
            JOIN teams t ON i.id = t.industry_id
            JOIN use_cases uc ON t.id = uc.team_id
            WHERE 1=1
        """
        params = []

        if segment:
            industry_query += " AND i.segment = %s"
            params.append(segment)

        industry_query += " ORDER BY i.name"

        cur.execute(industry_query, params)
        industries = cur.fetchall()

        result = []

        for industry in industries:
            industry_id, industry_name, industry_desc, industry_segment = industry

            # Get teams for this industry
            team_query = """
                SELECT DISTINCT t.id, t.name, t.description
                FROM teams t
                JOIN use_cases uc ON t.id = uc.team_id
                WHERE t.industry_id = %s
            """
            team_params = [industry_id]

            if team_filter:
                team_query += " AND LOWER(t.name) LIKE LOWER(%s)"
                team_params.append(f"%{team_filter}%")

            team_query += " ORDER BY t.name"

            cur.execute(team_query, team_params)
            teams = cur.fetchall()

            industry_data = {
                'id': industry_id,
                'name': industry_name,
                'description': industry_desc,
                'segment': industry_segment,
                'teams': []
            }

            for team in teams:
                team_id, team_name, team_desc = team

                # Get use cases for this team
                use_case_query = """
                    SELECT id, text, category
                    FROM use_cases
                    WHERE team_id = %s AND industry_id = %s
                    ORDER BY text
                """

                cur.execute(use_case_query, (team_id, industry_id))
                use_cases = cur.fetchall()

                team_data = {
                    'id': team_id,
                    'name': team_name,
                    'description': team_desc,
                    'use_cases': [
                        {
                            'id': uc[0],
                            'text': uc[1],
                            'category': uc[2]
                        }
                        for uc in use_cases
                    ]
                }

                industry_data['teams'].append(team_data)

            # Only include industries that have teams with use cases
            if industry_data['teams']:
                result.append(industry_data)

        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'industries': result,
            'total_count': len(result)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@playbook_bp.route('/industries/<int:industry_id>/teams', methods=['GET'])
def get_teams_by_industry(industry_id):
    """Get teams for specific industry with nested use cases"""
    # Optional filters
    team_function = request.args.get('function')  # e.g., 'due_diligence', 'investment'

    try:
        conn = get_playbook_connection()
        cur = conn.cursor()

        # Get industry info first
        cur.execute("SELECT name, description, segment FROM industries WHERE id = %s", (industry_id,))
        industry_result = cur.fetchone()

        if not industry_result:
            return jsonify({'error': 'Industry not found'}), 404

        industry_name, industry_desc, industry_segment = industry_result

        # Get teams with use cases
        team_query = """
            SELECT DISTINCT t.id, t.name, t.description
            FROM teams t
            JOIN use_cases uc ON t.id = uc.team_id
            WHERE t.industry_id = %s
        """
        params = [industry_id]

        if team_function:
            team_query += " AND uc.category = %s"
            params.append(team_function)

        team_query += " ORDER BY t.name"

        cur.execute(team_query, params)
        teams = cur.fetchall()

        teams_data = []
        for team in teams:
            team_id, team_name, team_desc = team

            # Get use cases for this team
            use_case_query = """
                SELECT id, text, category
                FROM use_cases
                WHERE team_id = %s AND industry_id = %s
            """
            use_case_params = [team_id, industry_id]

            if team_function:
                use_case_query += " AND category = %s"
                use_case_params.append(team_function)

            use_case_query += " ORDER BY text"

            cur.execute(use_case_query, use_case_params)
            use_cases = cur.fetchall()

            team_data = {
                'id': team_id,
                'name': team_name,
                'description': team_desc,
                'use_cases': [
                    {
                        'id': uc[0],
                        'text': uc[1],
                        'category': uc[2]
                    }
                    for uc in use_cases
                ]
            }

            teams_data.append(team_data)

        cur.close()
        conn.close()

        # FIXED: Nest teams inside the industry object
        return jsonify({
            'success': True,
            'industry': {
                'id': industry_id,
                'name': industry_name,
                'description': industry_desc,
                'segment': industry_segment,
                'teams': teams_data  # ← MOVED teams inside industry object
            },
            'total_teams': len(teams_data)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@playbook_bp.route('/teams/<int:team_id>/use-cases', methods=['GET'])
def get_use_cases_by_team(team_id):
    """Get use cases for specific team"""
    category_filter = request.args.get('category')

    try:
        conn = get_playbook_connection()
        cur = conn.cursor()

        # Get team info first
        cur.execute("""
            SELECT t.name, t.description, i.name as industry_name, i.segment
            FROM teams t
            JOIN industries i ON t.industry_id = i.id
            WHERE t.id = %s
        """, (team_id,))

        team_result = cur.fetchone()
        if not team_result:
            return jsonify({'error': 'Team not found'}), 404

        team_name, team_desc, industry_name, industry_segment = team_result

        # Get use cases
        use_case_query = """
            SELECT id, text, category
            FROM use_cases
            WHERE team_id = %s
        """
        params = [team_id]

        if category_filter:
            use_case_query += " AND category = %s"
            params.append(category_filter)

        use_case_query += " ORDER BY text"

        cur.execute(use_case_query, params)
        use_cases = cur.fetchall()

        use_cases_data = [
            {
                'id': uc[0],
                'text': uc[1],
                'category': uc[2]
            }
            for uc in use_cases
        ]

        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'team': {
                'id': team_id,
                'name': team_name,
                'description': team_desc,
                'industry': {
                    'name': industry_name,
                    'segment': industry_segment
                }
            },
            'use_cases': use_cases_data,
            'total_use_cases': len(use_cases_data)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@playbook_bp.route('/use-cases/<int:use_case_id>/problem-hierarchy', methods=['GET'])
def get_problem_hierarchy(use_case_id):
    """Get complete problem hierarchy for a use case"""
    try:
        conn = get_playbook_connection()
        cur = conn.cursor()

        # Get use case info first
        cur.execute("""
            SELECT uc.text, uc.category, t.name as team_name, i.name as industry_name
            FROM use_cases uc
            JOIN teams t ON uc.team_id = t.id
            JOIN industries i ON uc.industry_id = i.id
            WHERE uc.id = %s
        """, (use_case_id,))

        use_case_result = cur.fetchone()
        if not use_case_result:
            return jsonify({'error': 'Use case not found'}), 404

        use_case_text, category, team_name, industry_name = use_case_result

        # Get problem hierarchy
        cur.execute("""
            SELECT stage, narrative
            FROM problem_hierarchies
            WHERE use_case_id = %s
            ORDER BY 
                CASE stage
                    WHEN 'problem' THEN 1
                    WHEN 'problem_detail' THEN 2
                    WHEN 'ai_solution' THEN 3
                    WHEN 'ai_risk' THEN 4
                    WHEN 'our_solution' THEN 5
                    ELSE 6
                END
        """, (use_case_id,))

        hierarchy_results = cur.fetchall()

        # Structure the hierarchy
        hierarchy = {}
        for stage, narrative in hierarchy_results:
            hierarchy[stage] = narrative

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
            'problem_hierarchy': hierarchy
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@playbook_bp.route('/search', methods=['GET'])
def search_playbooks():
    """Search across industries, teams, and use cases"""
    query = request.args.get('q', '').strip()
    segment = request.args.get('segment')
    category = request.args.get('category')

    if not query:
        return jsonify({'error': 'Search query required'}), 400

    try:
        conn = get_playbook_connection()
        cur = conn.cursor()

        search_query = """
            SELECT DISTINCT
                i.id as industry_id, i.name as industry_name, i.segment,
                t.id as team_id, t.name as team_name,
                uc.id as use_case_id, uc.text as use_case_text, uc.category,
                'use_case' as match_type
            FROM use_cases uc
            JOIN teams t ON uc.team_id = t.id
            JOIN industries i ON uc.industry_id = i.id
            WHERE (
                LOWER(uc.text) LIKE LOWER(%s) OR
                LOWER(t.name) LIKE LOWER(%s) OR
                LOWER(i.name) LIKE LOWER(%s)
            )
        """

        search_term = f"%{query}%"
        params = [search_term, search_term, search_term]

        if segment:
            search_query += " AND i.segment = %s"
            params.append(segment)

        if category:
            search_query += " AND uc.category = %s"
            params.append(category)

        search_query += " ORDER BY i.name, t.name, uc.text LIMIT 50"

        cur.execute(search_query, params)
        results = cur.fetchall()

        # Group results by industry
        industries_map = {}
        for row in results:
            industry_id, industry_name, segment, team_id, team_name, use_case_id, use_case_text, category, match_type = row

            if industry_id not in industries_map:
                industries_map[industry_id] = {
                    'id': industry_id,
                    'name': industry_name,
                    'segment': segment,
                    'teams': {}
                }

            if team_id not in industries_map[industry_id]['teams']:
                industries_map[industry_id]['teams'][team_id] = {
                    'id': team_id,
                    'name': team_name,
                    'use_cases': []
                }

            industries_map[industry_id]['teams'][team_id]['use_cases'].append({
                'id': use_case_id,
                'text': use_case_text,
                'category': category,
                'match_type': match_type
            })

        # Convert to list format
        search_results = []
        for industry in industries_map.values():
            industry['teams'] = list(industry['teams'].values())
            search_results.append(industry)

        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'query': query,
            'results': search_results,
            'total_matches': len(results)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@playbook_bp.route('/categories', methods=['GET'])
def get_categories():
    """Get all available use case categories"""
    segment = request.args.get('segment')

    try:
        conn = get_playbook_connection()
        cur = conn.cursor()

        category_query = """
            SELECT DISTINCT uc.category, COUNT(*) as use_case_count
            FROM use_cases uc
            JOIN industries i ON uc.industry_id = i.id
            WHERE uc.category IS NOT NULL
        """
        params = []

        if segment:
            category_query += " AND i.segment = %s"
            params.append(segment)

        category_query += " GROUP BY uc.category ORDER BY uc.category"

        cur.execute(category_query, params)
        categories = cur.fetchall()

        categories_data = [
            {
                'name': cat[0],
                'use_case_count': cat[1]
            }
            for cat in categories
        ]

        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'categories': categories_data
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@playbook_bp.route('/segments', methods=['GET'])
def get_segments():
    """Get all available industry segments"""
    try:
        conn = get_playbook_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT segment, COUNT(DISTINCT i.id) as industry_count,
                   COUNT(DISTINCT t.id) as team_count,
                   COUNT(DISTINCT uc.id) as use_case_count
            FROM industries i
            LEFT JOIN teams t ON i.id = t.industry_id
            LEFT JOIN use_cases uc ON t.id = uc.team_id
            WHERE i.segment IS NOT NULL
            GROUP BY segment
            ORDER BY segment
        """)

        segments = cur.fetchall()

        segments_data = [
            {
                'name': seg[0],
                'industry_count': seg[1],
                'team_count': seg[2],
                'use_case_count': seg[3]
            }
            for seg in segments
        ]

        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'segments': segments_data
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500