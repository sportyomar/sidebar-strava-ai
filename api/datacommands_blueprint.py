from flask import Blueprint, request, jsonify
import anthropic
import json
import os
from typing import Dict, List, Any
from database_connector import execute_query, list_tables, describe_table, test_connection

# Create the blueprint
datacommands_bp = Blueprint('datacommands', __name__, url_prefix='/api')

# Initialize Anthropic client
client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))


@datacommands_bp.route('/data-parse', methods=['POST'])
def parse_data_command():
    """Parse natural language into structured data commands using Claude."""

    try:
        data = request.get_json()

        if not data or 'input' not in data:
            return jsonify({'error': 'Input is required'}), 400

        user_input = data['input']
        context = data.get('context', {})

        # Parse the command using Claude
        command = parse_command_with_anthropic(user_input, context)

        return jsonify({
            'command': command,
            'input': user_input,
            'timestamp': None
        })

    except Exception as e:
        print(f"Data command parsing error: {str(e)}")
        return jsonify({
            'error': 'Failed to parse data command',
            'details': str(e)
        }), 500


def parse_command_with_anthropic(user_input: str, context: Dict) -> Dict[str, Any]:
    """Use Claude to parse natural language into structured data commands."""

    # Build context string
    connection_status = context.get('connectionStatus', 'disconnected')
    available_tables = context.get('availableTables', [])
    current_database = context.get('currentDatabase', None)

    context_str = f"""
CONNECTION STATUS: {connection_status}
CURRENT DATABASE: {current_database or 'None'}
AVAILABLE TABLES: {', '.join(available_tables) if available_tables else 'None'}
"""

    system_prompt = f"""You are a database command parser. Convert natural language into structured commands for database operations.

CURRENT CONTEXT:
{context_str}

COMMAND STRUCTURE:
Return ONLY a JSON object with this exact structure:
{{
  "action": "connect|list_tables|describe_table|query|disconnect",
  "target": "database_name or table_name",
  "params": {{
    "host": "...",
    "port": 5432,
    "database": "...",
    "user": "...",
    "password": "..."
  }},
  "sql": "SELECT ... (only for query action)"
}}

EXAMPLES:
"connect to postgres" → {{"action": "connect", "params": {{"host": "localhost", "port": 5432, "database": "portfolio_db", "user": "sporty", "password": "TqKwifr5jtJ6"}}}}
"show me all tables" → {{"action": "list_tables"}}
"describe the customers table" → {{"action": "describe_table", "target": "customers"}}
"show me customers" → {{"action": "query", "target": "customers", "sql": "SELECT * FROM customers LIMIT 100"}}
"get revenue by month" → {{"action": "query", "sql": "SELECT DATE_TRUNC('month', date) as month, SUM(revenue) FROM orders GROUP BY month"}}
"disconnect" → {{"action": "disconnect"}}

IMPORTANT SQL GENERATION RULES:
- Always include LIMIT clause for safety (default 100 rows)
- Use proper PostgreSQL syntax
- For aggregations, include GROUP BY
- For time series, use DATE_TRUNC or similar
- Always alias computed columns
- Return valid SQL that can be executed directly

IMPORTANT:
- If user asks to "show" or "get" data, generate appropriate SELECT query
- Infer table names from context when possible
- Always validate table names against available tables if context provided
- Return ONLY the JSON object, no other text
"""

    try:
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1000,
            temperature=0.1,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": user_input
                }
            ]
        )

        ai_response = message.content[0].text.strip()

        # Parse the JSON response
        try:
            command = json.loads(ai_response)

            # VALIDATION LAYER
            if 'action' not in command:
                raise ValueError('Missing required field: action')

            valid_actions = ['connect', 'list_tables', 'describe_table', 'query', 'disconnect']
            if command['action'] not in valid_actions:
                raise ValueError(f"Invalid action: {command['action']}")

            # Action-specific validation
            if command['action'] == 'describe_table' and 'target' not in command:
                raise ValueError('describe_table action requires target table name')

            if command['action'] == 'query' and 'sql' not in command:
                raise ValueError('query action requires sql field')

            # Ensure sql queries have LIMIT
            if command['action'] == 'query' and 'LIMIT' not in command['sql'].upper():
                command['sql'] += ' LIMIT 100'

            return command

        except json.JSONDecodeError as e:
            print(f"Failed to parse AI response as JSON: {ai_response}")
            raise ValueError(f"Invalid AI response format: {str(e)}")

    except anthropic.APIError as e:
        raise Exception(f"Anthropic API error: {str(e)}")


@datacommands_bp.route('/execute-query', methods=['POST'])
def execute_query_endpoint():
    """Execute a SQL query against the connected database."""

    try:
        data = request.get_json()

        if not data or 'sql' not in data:
            return jsonify({'error': 'SQL query is required'}), 400

        sql = data['sql']
        connection_params = data.get('connection', {})

        # Execute real query using database connector
        result = execute_query(sql, connection_params)

        if result['success']:
            return jsonify({
                'success': True,
                'rows': result.get('rows', []),
                'columns': result.get('columns', []),
                'rowCount': result.get('rowCount', 0),
                'executionTime': 0,  # Could add timing later
                'query': sql
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Unknown error')
            }), 400

    except Exception as e:
        print(f"Query execution error: {str(e)}")
        return jsonify({
            'error': 'Failed to execute query',
            'details': str(e)
        }), 500


@datacommands_bp.route('/connect-database', methods=['POST'])
def connect_database():
    """Connect to a database."""

    try:
        data = request.get_json()

        if not data or 'params' not in data:
            return jsonify({'error': 'Connection parameters are required'}), 400

        params = data['params']

        # Test connection using database connector
        result = test_connection(params)

        if result['success']:
            # Get tables after successful connection
            tables_result = list_tables(params)

            return jsonify({
                'success': True,
                'database': params.get('database', 'unknown'),
                'type': params.get('type', 'postgres'),
                'tables': tables_result.get('tables', []) if tables_result['success'] else [],
                'version': result.get('version', 'Unknown')
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Connection failed')
            }), 400

    except Exception as e:
        print(f"Database connection error: {str(e)}")
        return jsonify({
            'error': 'Failed to connect to database',
            'details': str(e)
        }), 500


@datacommands_bp.route('/list-tables', methods=['POST'])
def list_tables_endpoint():
    """List all tables in the connected database."""

    try:
        data = request.get_json()
        connection_params = data.get('connection', {})

        # Get real tables from database
        result = list_tables(connection_params)

        if result['success']:
            return jsonify({
                'success': True,
                'tables': result['tables']
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Failed to list tables')
            }), 400

    except Exception as e:
        print(f"Table listing error: {str(e)}")
        return jsonify({
            'error': 'Failed to list tables',
            'details': str(e)
        }), 500


@datacommands_bp.route('/describe-table', methods=['POST'])
def describe_table_endpoint():
    """Describe the structure of a table."""

    try:
        data = request.get_json()

        if not data or 'table' not in data:
            return jsonify({'error': 'Table name is required'}), 400

        table_name = data['table']
        connection_params = data.get('connection', {})

        # Get real table structure from database
        result = describe_table(table_name, connection_params)

        if result['success']:
            return jsonify({
                'success': True,
                'table': result['table'],
                'columns': result['columns'],
                'rowCount': result['rowCount']
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Failed to describe table')
            }), 400

    except Exception as e:
        print(f"Table description error: {str(e)}")
        return jsonify({
            'error': 'Failed to describe table',
            'details': str(e)
        }), 500


@datacommands_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for the data commands service."""
    return jsonify({
        'status': 'healthy',
        'service': 'datacommands',
        'anthropic_configured': bool(os.getenv('ANTHROPIC_API_KEY'))
    })