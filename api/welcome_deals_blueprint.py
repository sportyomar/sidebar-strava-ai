from flask import Blueprint, jsonify, request
import json
import psycopg2
from registry import get_welcome_db
import logging

welcome_deals_bp = Blueprint('welcome_deals', __name__)

logger = logging.getLogger(__name__)


def get_db_connection():
    """
    Get connection to playbooks database using direct connection
    """
    try:
        print("=== Attempting direct connection ===")  # Debug

        # Test basic import first
        import psycopg2
        print("psycopg2 imported successfully")

        conn = psycopg2.connect(
            "postgresql://sporty:TqKwifr5jtJ6@localhost:5432/playbooks_db"
        )
        print("Direct connection successful!")  # Debug
        return conn

    except ImportError as e:
        print(f"Import error: {str(e)}")
        return None
    except Exception as e:
        print(f"Direct connection failed: {str(e)}")  # Debug
        logger.error(f"Database connection failed: {str(e)}")
        return None


def get_all_scenarios():
    """
    Fetch all scenarios for deal context selection
    """
    try:
        print("Attempting to connect to database...")  # Debug
        conn = get_db_connection()
        if not conn:
            return None

        cursor = conn.cursor()
        print("Database connection successful")  # Debug

        query = """
            SELECT 
                s.id,
                s.name,
                s.description,
                s.complexity_level,
                s.outcome_type,
                s.stakeholder_impact,
                s.risk_profile,
                d.name as domain_name,
                st.name as strategy_name
            FROM scenarios s
            LEFT JOIN domains d ON s.domain_id = d.id
            LEFT JOIN strategies st ON s.strategy_id = st.id
            ORDER BY s.name
        """

        print(f"Executing query: {query}")  # Debug
        cursor.execute(query)
        results = cursor.fetchall()
        print(f"Query returned {len(results)} rows")  # Debug

        scenarios = []
        for row in results:
            scenarios.append({
                'id': row[0],
                'name': row[1],
                'description': row[2],
                'complexity_level': row[3],
                'outcome_type': row[4],
                'stakeholder_impact': row[5],
                'risk_profile': row[6],
                'domain_name': row[7],
                'strategy_name': row[8]
            })

        cursor.close()
        conn.close()
        print(f"Returning {len(scenarios)} scenarios")  # Debug
        return scenarios

    except Exception as e:
        print(f"Detailed error in get_all_scenarios: {str(e)}")  # Debug
        logger.error(f"Error fetching scenarios: {str(e)}")
        return None


def get_scenarios_by_context(deal_stage=None, focus_area=None, revenue_size=None):
    """
    Get filtered scenarios based on deal context
    """
    try:
        print(f"Filtering with: deal_stage={deal_stage}, focus_area={focus_area}, revenue_size={revenue_size}")  # Debug
        conn = get_db_connection()
        if not conn:
            return None

        cursor = conn.cursor()

        # Base query - simplified to match get_all_scenarios structure
        query = """
            SELECT 
                s.id,
                s.name,
                s.description,
                s.complexity_level,
                s.outcome_type,
                s.stakeholder_impact,
                s.risk_profile,
                d.name as domain_name,
                st.name as strategy_name
            FROM scenarios s
            LEFT JOIN domains d ON s.domain_id = d.id
            LEFT JOIN strategies st ON s.strategy_id = st.id
        """

        conditions = []
        params = []

        # Add filters based on context
        if deal_stage:
            if deal_stage == 'early_diligence':
                conditions.append("s.complexity_level = 'intermediate'")
            elif deal_stage == 'deep_dive':
                conditions.append("s.complexity_level IN ('intermediate', 'advanced')")
            elif deal_stage == 'final_analysis':
                conditions.append("s.complexity_level = 'advanced'")

        if focus_area:
            if focus_area == 'cost_efficiency':
                conditions.append(
                    "(s.outcome_type LIKE '%cost%' OR s.outcome_type LIKE '%efficiency%' OR s.name LIKE '%cost%' OR s.name LIKE '%efficiency%')")
            elif focus_area == 'technology':
                conditions.append(
                    "(s.name LIKE '%technology%' OR s.name LIKE '%automation%' OR s.name LIKE '%system%' OR s.name LIKE '%AI%' OR s.name LIKE '%integration%')")
            elif focus_area == 'integration':
                conditions.append("(s.name LIKE '%integration%' OR s.name LIKE '%acquisition%')")
            elif focus_area == 'growth':
                conditions.append(
                    "(s.outcome_type LIKE '%growth%' OR s.outcome_type LIKE '%expansion%' OR s.name LIKE '%customer%' OR s.name LIKE '%service%')")

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY s.complexity_level, s.name"

        print(f"Final query: {query}")  # Debug
        cursor.execute(query)  # Remove params since we're not using parameterized queries
        results = cursor.fetchall()
        print(f"Query returned {len(results)} filtered rows")  # Debug

        # Check if no results found
        if not results:
            print("No matching scenarios found - returning empty list")
            cursor.close()
            conn.close()
            return []

        scenarios = []
        for i, row in enumerate(results):
            print(f"Processing row {i}: {row}")  # Debug

            # Safely check if row has enough elements
            if len(row) < 9:
                print(f"Warning: Row {i} has insufficient columns: {len(row)}")
                continue

            # Set framework count to 0 for now to avoid cursor issues
            framework_count = 0  # Default value - can be enhanced later

            scenarios.append({
                'id': row[0],
                'name': row[1],
                'description': row[2],
                'complexity_level': row[3],
                'outcome_type': row[4],
                'stakeholder_impact': row[5],
                'risk_profile': row[6],
                'domain_name': row[7],
                'strategy_name': row[8],
                'framework_count': framework_count
            })

        cursor.close()
        conn.close()
        print(f"Returning {len(scenarios)} filtered scenarios")  # Debug
        return scenarios

    except Exception as e:
        print(f"Detailed error in get_scenarios_by_context: {str(e)}")  # Debug
        import traceback
        traceback.print_exc()  # Print full stack trace
        logger.error(f"Error fetching filtered scenarios: {str(e)}")
        return None


def get_scenario_frameworks(scenario_id):
    """
    Get all frameworks for a specific scenario
    """
    try:
        conn = get_db_connection()
        if not conn:
            return None

        cursor = conn.cursor()

        query = """
            SELECT 
                f.id,
                f.stage,
                f.stage_order,
                f.template,
                f.framework_type,
                s.name as scenario_name
            FROM frameworks f
            JOIN scenarios s ON f.scenario_id = s.id
            WHERE f.scenario_id = %s
            ORDER BY f.stage_order
        """

        cursor.execute(query, (scenario_id,))
        results = cursor.fetchall()

        frameworks = []
        for row in results:
            frameworks.append({
                'id': row[0],
                'stage': row[1],
                'stage_order': row[2],
                'template': row[3],
                'framework_type': row[4],
                'scenario_name': row[5]
            })

        cursor.close()
        conn.close()
        return frameworks

    except Exception as e:
        logger.error(f"Error fetching scenario frameworks: {str(e)}")
        return None


def get_dropdown_options_for_framework(framework_id):
    """
    Get dropdown options for a specific framework
    """
    try:
        conn = get_db_connection()
        if not conn:
            return None

        cursor = conn.cursor()

        query = """
            SELECT 
                option_text,
                option_value,
                placeholder_key,
                display_order
            FROM dropdown_options
            WHERE framework_id = %s
            ORDER BY placeholder_key, display_order
        """

        cursor.execute(query, (framework_id,))
        results = cursor.fetchall()

        options = {}
        for row in results:
            placeholder_key = row[2]
            if placeholder_key not in options:
                options[placeholder_key] = []

            options[placeholder_key].append({
                'text': row[0],
                'value': row[1] or row[0],
                'display_order': row[3]
            })

        cursor.close()
        conn.close()
        return options

    except Exception as e:
        logger.error(f"Error fetching dropdown options: {str(e)}")
        return None


@welcome_deals_bp.route('/api/deals/scenarios', methods=['GET'])
def get_deal_scenarios():
    """
    Get all scenarios or filtered scenarios based on query parameters
    """
    print("=== ENDPOINT HIT ===")  # Debug
    try:
        # Get query parameters for filtering
        deal_stage = request.args.get('deal_stage')
        focus_area = request.args.get('focus_area')
        revenue_size = request.args.get('revenue_size')

        print(f"Query params: deal_stage={deal_stage}, focus_area={focus_area}, revenue_size={revenue_size}")  # Debug

        if any([deal_stage, focus_area, revenue_size]):
            print("Calling get_scenarios_by_context")  # Debug
            scenarios = get_scenarios_by_context(deal_stage, focus_area, revenue_size)
        else:
            print("Calling get_all_scenarios")  # Debug
            scenarios = get_all_scenarios()

        print(f"Function returned: {type(scenarios)}")  # Debug

        if scenarios is None:
            print("Scenarios is None - returning error")  # Debug
            return jsonify({
                'error': 'Failed to fetch scenarios'
            }), 500

        print(f"Returning {len(scenarios)} scenarios")  # Debug
        return jsonify({
            'success': True,
            'scenarios': scenarios,
            'total_count': len(scenarios)
        })

    except Exception as e:
        print(f"Endpoint exception: {str(e)}")  # Debug
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': f'Endpoint error: {str(e)}'
        }), 500


@welcome_deals_bp.route('/api/deals/scenarios/<int:scenario_id>', methods=['GET'])
def get_scenario_detail(scenario_id):
    """
    Get detailed information about a specific scenario including frameworks
    """
    frameworks = get_scenario_frameworks(scenario_id)

    if frameworks is None:
        return jsonify({
            'error': 'Failed to fetch scenario frameworks'
        }), 500

    if not frameworks:
        return jsonify({
            'error': f'No frameworks found for scenario {scenario_id}'
        }), 404

    return jsonify({
        'success': True,
        'scenario_id': scenario_id,
        'scenario_name': frameworks[0]['scenario_name'] if frameworks else None,
        'frameworks': frameworks,
        'total_stages': len(frameworks)
    })


@welcome_deals_bp.route('/api/deals/frameworks/<int:framework_id>/options', methods=['GET'])
def get_framework_options(framework_id):
    """
    Get dropdown options for a specific framework
    """
    options = get_dropdown_options_for_framework(framework_id)

    if options is None:
        return jsonify({
            'error': 'Failed to fetch framework options'
        }), 500

    return jsonify({
        'success': True,
        'framework_id': framework_id,
        'options': options
    })


@welcome_deals_bp.route('/api/deals/recommendations', methods=['POST'])
def get_scenario_recommendations():
    """
    Get AI-powered scenario recommendations based on user context
    """
    print("\n=== RECOMMENDATIONS ENDPOINT START ===")

    try:
        data = request.get_json()
        print(f"Received data: {data}")

        if not data:
            print("ERROR: No data provided")
            return jsonify({
                'error': 'No context data provided'
            }), 400

        deal_stage = data.get('deal_stage')
        focus_area = data.get('focus_area')
        revenue_size = data.get('revenue_size')
        company_profile = data.get('company_profile', {})

        print(f"Extracted params: deal_stage={deal_stage}, focus_area={focus_area}, revenue_size={revenue_size}")

        # Test database connection first
        print("Testing database connection...")
        conn = get_db_connection()
        if not conn:
            print("ERROR: Database connection failed")
            return jsonify({'error': 'Database connection failed'}), 500

        # Test a simple query first
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM scenarios")
        total_count = cursor.fetchone()[0]
        print(f"Total scenarios in database: {total_count}")

        # Test the specific filter query manually
        test_query = """
            SELECT s.id, s.name, s.complexity_level, s.outcome_type
            FROM scenarios s
            WHERE s.complexity_level = 'intermediate' 
            AND s.outcome_type = 'efficiency'
        """
        print(f"Testing manual query: {test_query}")
        cursor.execute(test_query)
        test_results = cursor.fetchall()
        print(f"Manual query returned {len(test_results)} rows:")
        for row in test_results:
            print(f"  - {row}")

        cursor.close()
        conn.close()

        # Now try the actual function
        print("\nCalling get_scenarios_by_context...")
        scenarios = get_scenarios_by_context(deal_stage, focus_area, revenue_size)
        print(f"get_scenarios_by_context returned: {type(scenarios)}")

        if scenarios is None:
            print("ERROR: get_scenarios_by_context returned None")
            return jsonify({
                'error': 'Failed to fetch scenarios - function returned None',
                'debug_info': {
                    'total_scenarios_in_db': total_count,
                    'manual_query_results': len(test_results),
                    'params': {
                        'deal_stage': deal_stage,
                        'focus_area': focus_area,
                        'revenue_size': revenue_size
                    }
                }
            }), 500

        print(f"Found {len(scenarios)} scenarios")
        for i, scenario in enumerate(scenarios):
            print(
                f"  Scenario {i}: {scenario.get('name')} - {scenario.get('complexity_level')} - {scenario.get('outcome_type')}")

        # If no filtered scenarios found, return a fallback set
        if not scenarios:
            print("No filtered scenarios found, falling back to all scenarios")
            scenarios = get_all_scenarios()
            if not scenarios:
                return jsonify({
                    'error': 'No scenarios available'
                }), 500

        # Simple scoring algorithm
        print("Applying scoring algorithm...")
        for scenario in scenarios:
            score = 50  # Base score

            # Boost score based on complexity vs deal stage
            if deal_stage == 'early_diligence' and scenario.get('complexity_level') == 'intermediate':
                score += 20
                print(f"  Boosted {scenario.get('name')} for early_diligence + intermediate")
            elif deal_stage == 'deep_dive' and scenario.get('complexity_level') in ['intermediate', 'advanced']:
                score += 20
                print(f"  Boosted {scenario.get('name')} for deep_dive + {scenario.get('complexity_level')}")
            elif deal_stage == 'final_analysis' and scenario.get('complexity_level') == 'advanced':
                score += 20
                print(f"  Boosted {scenario.get('name')} for final_analysis + advanced")

            # Boost score based on framework count
            score += min(scenario.get('framework_count', 0) * 2, 20)

            scenario['recommendation_score'] = score
            scenario['confidence'] = min(score / 100.0, 1.0)
            print(f"  Final score for {scenario.get('name')}: {score}")

        # Sort by recommendation score and return top 5
        scenarios.sort(key=lambda x: x.get('recommendation_score', 0), reverse=True)
        top_scenarios = scenarios[:5]

        print(f"Returning top {len(top_scenarios)} scenarios")
        print("=== RECOMMENDATIONS ENDPOINT SUCCESS ===\n")

        return jsonify({
            'success': True,
            'recommendations': top_scenarios,
            'context': {
                'deal_stage': deal_stage,
                'focus_area': focus_area,
                'revenue_size': revenue_size
            },
            'debug_info': {
                'total_found': len(scenarios),
                'total_in_db': total_count,
                'manual_test_results': len(test_results)
            }
        })

    except Exception as e:
        print(f"EXCEPTION in recommendations endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': f'Failed to generate recommendations: {str(e)}',
            'traceback': traceback.format_exc()
        }), 500


@welcome_deals_bp.route('/api/deals/test-query', methods=['GET'])
def test_query():
    """
    Test endpoint to debug database structure
    """
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'})

        cursor = conn.cursor()

        # Test complexity levels
        cursor.execute("SELECT DISTINCT complexity_level FROM scenarios ORDER BY complexity_level")
        complexity_levels = [row[0] for row in cursor.fetchall()]

        # Test outcome types
        cursor.execute("SELECT DISTINCT outcome_type FROM scenarios ORDER BY outcome_type")
        outcome_types = [row[0] for row in cursor.fetchall()]

        # Test scenario names
        cursor.execute("SELECT name FROM scenarios ORDER BY name LIMIT 10")
        scenario_names = [row[0] for row in cursor.fetchall()]

        cursor.close()
        conn.close()

        return jsonify({
            'complexity_levels': complexity_levels,
            'outcome_types': outcome_types,
            'sample_scenario_names': scenario_names
        })
    except Exception as e:
        return jsonify({'error': str(e)})


@welcome_deals_bp.route('/api/deals/debug', methods=['GET'])
def debug_connection():
    """
    Debug endpoint to check database configuration
    """
    try:
        print("=== DEBUG START ===")
        db_config = get_welcome_db()
        print(f"get_welcome_db() returned: {db_config}")
        print(f"Type: {type(db_config)}")

        if db_config:
            print(f"Keys: {db_config.keys()}")

        return jsonify({
            'db_config': db_config,
            'type': str(type(db_config))
        })
    except Exception as e:
        print(f"Debug error: {str(e)}")
        return jsonify({
            'error': str(e)
        })


@welcome_deals_bp.route('/api/deals/health', methods=['GET'])
def health_check():
    """
    Health check endpoint for deals API
    """
    return jsonify({
        'status': 'healthy',
        'service': 'welcome_deals_api'
    })


# Error handlers
@welcome_deals_bp.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'Endpoint not found'
    }), 404


@welcome_deals_bp.errorhandler(500)
def internal_error(error):
    return jsonify({
        'error': 'Internal server error'
    }), 500