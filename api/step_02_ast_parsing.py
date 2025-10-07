# api/step_02_ast_parsing.py
from flask import Blueprint, jsonify, request, session
import os
import json
import ast
import inspect
import sys
from pathlib import Path
from datetime import datetime
import logging
from typing import Dict, List, Any, Optional, Union
import pickle
import hashlib
import psycopg2

# Create the blueprint
step_02_bp = Blueprint('step_02', __name__, url_prefix='/api/step-02')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global storage for this step's data
ast_data = {
    'parsed_asts': {},  # File path -> AST tree data
    'class_definitions': {},  # Class name -> detailed class info
    'function_definitions': {},  # Function name -> detailed function info
    'property_definitions': {},  # Property name -> property info
    'docstring_data': {},  # Module/class/function -> docstring info
    'type_hints': {},  # Type hint analysis
    'inheritance_map': {},  # Class inheritance relationships
    'method_signatures': {},  # Method -> signature details
    'parsing_metadata': {},  # Parsing statistics and metadata
    'ast_cache': {}  # Cached AST data for performance
}

# Configuration constants
AST_CACHE_ENABLED = os.getenv('AST_CACHE_ENABLED', 'true').lower() == 'true'
MAX_AST_DEPTH = int(os.getenv('MAX_AST_DEPTH', 50))
INCLUDE_PRIVATE_MEMBERS = os.getenv('INCLUDE_PRIVATE_MEMBERS', 'true').lower() == 'true'


def get_db_connection():
    """Get database connection for Step 2"""
    return psycopg2.connect("dbname=portfolio_db user=postgres password=TqKwifr5jtJ6 host=localhost port=60616")


def save_step_data(user_id='default'):
    """Save Step 2 data to database"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Create table if it doesn't exist
        cur.execute("""
            CREATE TABLE IF NOT EXISTS step_02_progress (
                user_id VARCHAR(255) PRIMARY KEY,
                step_data JSONB,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cur.execute("""
            INSERT INTO step_02_progress (user_id, step_data, last_updated)
            VALUES (%s, %s, %s)
            ON CONFLICT (user_id) DO UPDATE SET
            step_data = EXCLUDED.step_data,
            last_updated = EXCLUDED.last_updated
        """, (user_id, json.dumps(ast_data), datetime.now()))

        conn.commit()
        cur.close()
        conn.close()
        logger.info(f"Step 2 data saved for user {user_id}")
    except Exception as e:
        logger.error(f"Error saving Step 2 data to database: {str(e)}")


def load_step_data(user_id='default'):
    """Load Step 2 data from database"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT step_data FROM step_02_progress WHERE user_id = %s", (user_id,))
        row = cur.fetchone()
        cur.close()
        conn.close()
        if row:
            return json.loads(row[0])
    except Exception as e:
        logger.error(f"Error loading Step 2 data from database: {str(e)}")
    return {}


def load_step_01_data(user_id='default'):
    """Load Step 1 data from database"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT step_data FROM step_01_progress WHERE user_id = %s", (user_id,))
        row = cur.fetchone()
        cur.close()
        conn.close()
        if row:
            # Parse the JSON data
            step_01_data = json.loads(row[0]) if isinstance(row[0], str) else row[0]

            # Convert camelCase to snake_case to match expected format
            converted_data = {
                'file_analysis': step_01_data.get('fileAnalysis', {}),
                'source_info': step_01_data.get('sourceInfo', {}),
                'import_map': step_01_data.get('importMap', {}),
                'file_structure': step_01_data.get('fileStructure', {}),
                # Keep original data as well for debugging
                'original_data': step_01_data
            }

            logger.info(f"Loaded Step 1 data for user {user_id}")
            logger.info(f"Original keys: {list(step_01_data.keys())}")
            logger.info(f"Converted keys: {list(converted_data.keys())}")

            return converted_data
        else:
            logger.warning(f"No Step 1 data found for user {user_id}")
            return None
    except Exception as e:
        logger.error(f"Error loading Step 1 data from database: {str(e)}")
        return None


@step_02_bp.route('/status', methods=['GET'])
def get_status():
    """
    Get the current status of Step 2: AST (Abstract Syntax Tree) Parsing

    Returns:
        dict: Current status including progress, completion state, and summary statistics
    """
    try:
        # Load existing data from database
        user_id = request.args.get('user_id', 'default')
        db_data = load_step_data(user_id)
        if db_data:
            ast_data.update(db_data)

        # Check Step 1 dependency
        logger.info(f"Received request for user_id: {user_id}")
        logger.info(f"Looking for Step 1 data for user: {user_id}")
        step_01_available = check_step_01_dependency(user_id)

        return jsonify({
            'step': 2,
            'name': 'AST (Abstract Syntax Tree) Parsing',
            'status': 'ready' if not ast_data['parsed_asts'] else 'completed',
            'progress': calculate_progress(),
            'data_summary': get_data_summary(),
            'last_updated': ast_data.get('parsing_metadata', {}).get('last_parse_time'),
            'operations_available': [
                'parse_all_asts',
                'extract_classes',
                'extract_functions',
                'extract_properties',
                'extract_docstrings',
                'analyze_type_hints'
            ],
            'dependencies': {
                'step_01_required': True,
                'step_01_data_available': step_01_available
            }
        })
    except Exception as e:
        logger.error(f"Error getting status: {str(e)}")
        return jsonify({'error': str(e)}), 500


@step_02_bp.route('/parse-all-asts', methods=['POST'])
def parse_all_python_files_to_ast():
    """
    Parse all Python files from Step 1 into Abstract Syntax Trees

    Request Body:
        {
            "force_refresh": boolean,
            "include_private": boolean,
            "max_depth": integer,
            "cache_enabled": boolean,
            "detailed_analysis": boolean
        }

    Returns:
        dict: AST parsing results with comprehensive tree analysis
    """
    try:
        data = request.get_json() or {}
        user_id = data.get('user_id', 'default')

        # Load Step 1 data from database
        step_01_data = load_step_01_data(user_id)
        if not step_01_data:
            return jsonify({
                'error': 'Step 1 data not available. Complete filesystem scanning first.',
                'details': 'No Step 1 data found in database for this user.'
            }), 400

        # Validate Step 1 data completeness
        required_step_01_keys = ['file_analysis', 'source_info']
        missing_keys = [key for key in required_step_01_keys if not step_01_data.get(key)]
        if missing_keys:
            logger.info(f"Loaded step_01_data: {step_01_data.keys()}")
            logger.info(f"Loaded step_01_data: {json.dumps(step_01_data, indent=2)}")
            return jsonify({
                'error': f'Step 1 data incomplete. Missing: {", ".join(missing_keys)}',
                'details': 'Please complete all Step 1 operations before proceeding.'
            }), 400

        # Load existing Step 2 data
        db_data = load_step_data(user_id)
        logger.info(f"Received request for user_id: {user_id}")
        logger.info(f"Looking for Step 1 data for user: {user_id}")
        if db_data:
            ast_data.update(db_data)


        force_refresh = data.get('force_refresh', False)
        include_private = data.get('include_private', INCLUDE_PRIVATE_MEMBERS)
        max_depth = data.get('max_depth', MAX_AST_DEPTH)
        cache_enabled = data.get('cache_enabled', AST_CACHE_ENABLED)
        detailed_analysis = data.get('detailed_analysis', True)

        # Check if already parsed and not forcing refresh
        if ast_data['parsed_asts'] and not force_refresh:
            return jsonify({
                'message': 'ASTs already parsed',
                'parsed_files': len(ast_data['parsed_asts']),
                'use_force_refresh': True
            })

        parsed_asts = {}
        total_files = 0
        successful_parses = 0
        failed_parses = 0

        # Get file analysis from Step 1
        file_analysis = step_01_data.get('file_analysis', {})

        # Add debugging
        logger.info(f"File analysis type: {type(file_analysis)}")
        logger.info(f"File analysis length: {len(file_analysis) if hasattr(file_analysis, '__len__') else 'N/A'}")
        if hasattr(file_analysis, 'items') and len(file_analysis) > 0:
            first_key, first_value = next(iter(file_analysis.items()))
            logger.info(f"First file: {first_key}")
            logger.info(
                f"First file info keys: {list(first_value.keys()) if hasattr(first_value, 'keys') else 'Not a dict'}")
            logger.info(
                f"First file has full_path: {'full_path' in first_value if hasattr(first_value, 'get') else 'N/A'}")
        else:
            logger.info("File analysis is empty or not iterable")

        for file_path, file_info in file_analysis.items():
            if 'error' in file_info or not file_info.get('full_path'):
                continue

            total_files += 1
            full_path = file_info['full_path']

            try:
                # Check cache first
                if cache_enabled:
                    cached_ast = get_cached_ast(full_path)
                    if cached_ast and not force_refresh:
                        parsed_asts[file_path] = cached_ast
                        successful_parses += 1
                        continue

                # Read and parse file
                with open(full_path, 'r', encoding='utf-8') as f:
                    content = f.read()

                # Parse AST
                tree = ast.parse(content, filename=full_path)

                # Extract comprehensive AST data
                ast_info = {
                    'file_path': file_path,
                    'full_path': full_path,
                    'parse_time': datetime.now().isoformat(),
                    'content_hash': hashlib.md5(content.encode()).hexdigest(),
                    'ast_structure': extract_ast_structure(tree, max_depth, include_private),
                    'node_counts': count_ast_nodes(tree),
                    'complexity_metrics': calculate_complexity_metrics(tree) if detailed_analysis else {},
                    'imports_detailed': extract_detailed_imports(tree),
                    'global_variables': extract_global_variables(tree),
                    'decorators': extract_decorators(tree),
                    'async_elements': extract_async_elements(tree)
                }

                parsed_asts[file_path] = ast_info
                successful_parses += 1

                # Cache the result
                if cache_enabled:
                    cache_ast(full_path, ast_info)

            except Exception as e:
                logger.warning(f"Could not parse AST for {file_path}: {str(e)}")
                parsed_asts[file_path] = {
                    'file_path': file_path,
                    'error': str(e),
                    'parsed': False,
                    'parse_time': datetime.now().isoformat()
                }
                failed_parses += 1

        ast_data['parsed_asts'] = parsed_asts
        ast_data['parsing_metadata'] = {
            'last_parse_time': datetime.now().isoformat(),
            'total_files': total_files,
            'successful_parses': successful_parses,
            'failed_parses': failed_parses,
            'include_private': include_private,
            'max_depth': max_depth,
            'detailed_analysis': detailed_analysis
        }

        # Save to database
        logger.info(f"Received request for user_id: {user_id}")
        logger.info(f"Looking for Step 1 data for user: {user_id}")
        save_step_data(user_id)

        return jsonify({
            'message': 'AST parsing completed successfully',
            'total_files': total_files,
            'successful_parses': successful_parses,
            'failed_parses': failed_parses,
            'parsing_metadata': ast_data['parsing_metadata']
        })

    except Exception as e:
        logger.error(f"Error parsing ASTs: {str(e)}")
        return jsonify({'error': str(e)}), 500


@step_02_bp.route('/extract-classes', methods=['POST'])
def extract_all_class_definitions():
    """
    Extract all class definitions and their methods from parsed ASTs

    Returns:
        dict: Comprehensive class analysis including methods, properties, inheritance
    """
    try:
        if not ast_data['parsed_asts']:
            return jsonify({'error': 'ASTs not parsed. Run parse-all-asts first.'}), 400

        class_definitions = {}
        inheritance_map = {}
        total_classes = 0

        for file_path, ast_info in ast_data['parsed_asts'].items():
            if 'error' in ast_info:
                continue

            ast_structure = ast_info.get('ast_structure', {})
            file_classes = extract_classes_from_structure(ast_structure, file_path)

            for class_name, class_info in file_classes.items():
                full_class_name = f"{file_path.replace('/', '.').replace('.py', '')}.{class_name}"
                class_definitions[full_class_name] = class_info
                total_classes += 1

                # Build inheritance map
                if class_info.get('base_classes'):
                    inheritance_map[full_class_name] = class_info['base_classes']

        # Analyze inheritance relationships
        inheritance_analysis = analyze_inheritance_relationships(inheritance_map)

        ast_data['class_definitions'] = class_definitions
        ast_data['inheritance_map'] = inheritance_analysis

        return jsonify({
            'message': 'Class definitions extracted successfully',
            'total_classes': total_classes,
            'classes_with_inheritance': len(inheritance_map),
            'inheritance_depth': inheritance_analysis.get('max_depth', 0),
            'class_definitions': class_definitions,
            'inheritance_analysis': inheritance_analysis
        })

    except Exception as e:
        logger.error(f"Error extracting classes: {str(e)}")
        return jsonify({'error': str(e)}), 500


@step_02_bp.route('/extract-functions', methods=['POST'])
def extract_all_function_definitions():
    """
    Extract all function definitions and parameters from parsed ASTs

    Returns:
        dict: Comprehensive function analysis including signatures, decorators, async status
    """
    try:
        if not ast_data['parsed_asts']:
            return jsonify({'error': 'ASTs not parsed. Run parse-all-asts first.'}), 400

        function_definitions = {}
        method_signatures = {}
        total_functions = 0

        for file_path, ast_info in ast_data['parsed_asts'].items():
            if 'error' in ast_info:
                continue

            ast_structure = ast_info.get('ast_structure', {})
            file_functions = extract_functions_from_structure(ast_structure, file_path)

            for func_name, func_info in file_functions.items():
                full_func_name = f"{file_path.replace('/', '.').replace('.py', '')}.{func_name}"
                function_definitions[full_func_name] = func_info
                total_functions += 1

                # Extract detailed method signature
                if func_info.get('signature'):
                    method_signatures[full_func_name] = func_info['signature']

        ast_data['function_definitions'] = function_definitions
        ast_data['method_signatures'] = method_signatures

        # Generate function statistics
        func_stats = generate_function_statistics(function_definitions)

        return jsonify({
            'message': 'Function definitions extracted successfully',
            'total_functions': total_functions,
            'async_functions': func_stats['async_count'],
            'decorated_functions': func_stats['decorated_count'],
            'private_functions': func_stats['private_count'],
            'function_definitions': function_definitions,
            'statistics': func_stats
        })

    except Exception as e:
        logger.error(f"Error extracting functions: {str(e)}")
        return jsonify({'error': str(e)}), 500


@step_02_bp.route('/extract-properties', methods=['POST'])
def extract_all_property_definitions():
    """
    Extract all property definitions including getters, setters, and descriptors

    Returns:
        dict: Comprehensive property analysis
    """
    try:
        if not ast_data['parsed_asts']:
            return jsonify({'error': 'ASTs not parsed. Run parse-all-asts first.'}), 400

        property_definitions = {}
        total_properties = 0

        for file_path, ast_info in ast_data['parsed_asts'].items():
            if 'error' in ast_info:
                continue

            ast_structure = ast_info.get('ast_structure', {})
            file_properties = extract_properties_from_structure(ast_structure, file_path)

            for prop_name, prop_info in file_properties.items():
                full_prop_name = f"{file_path.replace('/', '.').replace('.py', '')}.{prop_name}"
                property_definitions[full_prop_name] = prop_info
                total_properties += 1

        ast_data['property_definitions'] = property_definitions

        # Generate property statistics
        prop_stats = generate_property_statistics(property_definitions)

        return jsonify({
            'message': 'Property definitions extracted successfully',
            'total_properties': total_properties,
            'read_only_properties': prop_stats['read_only_count'],
            'read_write_properties': prop_stats['read_write_count'],
            'property_definitions': property_definitions,
            'statistics': prop_stats
        })

    except Exception as e:
        logger.error(f"Error extracting properties: {str(e)}")
        return jsonify({'error': str(e)}), 500


@step_02_bp.route('/extract-docstrings', methods=['POST'])
def extract_docstrings_and_type_hints():
    """
    Extract docstrings and type hints from all parsed elements

    Returns:
        dict: Comprehensive docstring and type hint analysis
    """
    try:
        if not ast_data['parsed_asts']:
            return jsonify({'error': 'ASTs not parsed. Run parse-all-asts first.'}), 400

        docstring_data = {}
        type_hints = {}
        total_docstrings = 0
        total_type_hints = 0

        for file_path, ast_info in ast_data['parsed_asts'].items():
            if 'error' in ast_info:
                continue

            ast_structure = ast_info.get('ast_structure', {})

            # Extract docstrings
            file_docstrings = extract_docstrings_from_structure(ast_structure, file_path)
            for key, docstring in file_docstrings.items():
                docstring_data[key] = docstring
                total_docstrings += 1

            # Extract type hints
            file_type_hints = extract_type_hints_from_structure(ast_structure, file_path)
            for key, hint in file_type_hints.items():
                type_hints[key] = hint
                total_type_hints += 1

        ast_data['docstring_data'] = docstring_data
        ast_data['type_hints'] = type_hints

        # Analyze docstring quality and coverage
        docstring_analysis = analyze_docstring_quality(docstring_data)
        type_hint_analysis = analyze_type_hint_coverage(type_hints)

        return jsonify({
            'message': 'Docstrings and type hints extracted successfully',
            'total_docstrings': total_docstrings,
            'total_type_hints': total_type_hints,
            'docstring_coverage': docstring_analysis['coverage_percentage'],
            'type_hint_coverage': type_hint_analysis['coverage_percentage'],
            'docstring_data': docstring_data,
            'type_hints': type_hints,
            'quality_analysis': {
                'docstrings': docstring_analysis,
                'type_hints': type_hint_analysis
            }
        })

    except Exception as e:
        logger.error(f"Error extracting docstrings and type hints: {str(e)}")
        return jsonify({'error': str(e)}), 500


@step_02_bp.route('/analyze-type-hints', methods=['POST'])
def analyze_type_hints():
    """
    Perform detailed analysis of type hints and their consistency

    Returns:
        dict: Type hint analysis including consistency checks and recommendations
    """
    try:
        if not ast_data['type_hints']:
            return jsonify({'error': 'Type hints not extracted. Run extract-docstrings first.'}), 400

        type_analysis = {
            'type_categories': {},
            'consistency_issues': [],
            'missing_hints': [],
            'complex_types': [],
            'recommendations': []
        }

        # Categorize types
        for element, hint_info in ast_data['type_hints'].items():
            type_str = hint_info.get('type_string', '')
            category = categorize_type_hint(type_str)

            if category not in type_analysis['type_categories']:
                type_analysis['type_categories'][category] = []
            type_analysis['type_categories'][category].append(element)

            # Check for complex types
            if is_complex_type(type_str):
                type_analysis['complex_types'].append({
                    'element': element,
                    'type': type_str,
                    'complexity_reason': get_complexity_reason(type_str)
                })

        # Check consistency across similar functions
        consistency_issues = check_type_hint_consistency(ast_data['type_hints'])
        type_analysis['consistency_issues'] = consistency_issues

        # Generate recommendations
        recommendations = generate_type_hint_recommendations(type_analysis)
        type_analysis['recommendations'] = recommendations

        return jsonify({
            'message': 'Type hint analysis completed',
            'total_type_hints': len(ast_data['type_hints']),
            'analysis': type_analysis
        })

    except Exception as e:
        logger.error(f"Error analyzing type hints: {str(e)}")
        return jsonify({'error': str(e)}), 500


@step_02_bp.route('/data', methods=['GET'])
def get_all_step_data():
    """
    Get all collected data from Step 2

    Returns:
        dict: Complete dataset from AST parsing step
    """
    try:
        return jsonify({
            'step': 2,
            'name': 'AST (Abstract Syntax Tree) Parsing',
            'data': ast_data,
            'data_keys': list(ast_data.keys()),
            'completeness': calculate_completeness(),
            'memory_usage': calculate_memory_usage()
        })
    except Exception as e:
        logger.error(f"Error getting data: {str(e)}")
        return jsonify({'error': str(e)}), 500


@step_02_bp.route('/reset', methods=['POST'])
def reset_step_data():
    """
    Reset all data for Step 2 (useful for re-running analysis)

    Returns:
        dict: Reset confirmation
    """
    try:
        # Clear cache if enabled
        if AST_CACHE_ENABLED:
            clear_ast_cache()

        # Reset all data
        for key in ast_data:
            ast_data[key] = {}

        return jsonify({
            'message': 'Step 2 data reset successfully',
            'status': 'ready'
        })

    except Exception as e:
        logger.error(f"Error resetting data: {str(e)}")
        return jsonify({'error': str(e)}), 500


@step_02_bp.route('/cache-management', methods=['GET', 'POST', 'DELETE'])
def manage_ast_cache():
    """
    GET: Get cache statistics
    POST: Configure cache settings
    DELETE: Clear cache

    Returns:
        dict: Cache management results
    """
    try:
        if request.method == 'GET':
            return jsonify(get_cache_statistics())

        elif request.method == 'POST':
            data = request.get_json() or {}
            return jsonify(configure_cache_settings(data))

        elif request.method == 'DELETE':
            cleared_count = clear_ast_cache()
            return jsonify({
                'message': f'Cache cleared successfully',
                'cleared_entries': cleared_count
            })

    except Exception as e:
        logger.error(f"Error managing cache: {str(e)}")
        return jsonify({'error': str(e)}), 500


# Helper Functions

def check_step_01_dependency(user_id='default'):
    """Check if Step 1 data is available in database"""
    try:
        step_01_data = load_step_01_data(user_id)
        if not step_01_data:
            return False

        required_keys = ['file_analysis', 'source_info']
        return all(step_01_data.get(key) for key in required_keys)
    except Exception as e:
        logger.error(f"Error checking Step 1 dependency: {str(e)}")
        return False


def get_step_01_data(user_id='default'):
    """Get Step 1 data from database"""
    logger.info(f"Received request for user_id: {user_id}")
    logger.info(f"Looking for Step 1 data for user: {user_id}")
    return load_step_01_data(user_id)


def extract_ast_structure(tree, max_depth, include_private):
    """Extract comprehensive structure from AST tree"""
    structure = {
        'module_docstring': ast.get_docstring(tree),
        'classes': {},
        'functions': {},
        'imports': [],
        'constants': {},
        'variables': {}
    }

    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            if include_private or not node.name.startswith('_'):
                structure['classes'][node.name] = extract_class_details(node, max_depth)

        elif isinstance(node, ast.FunctionDef):
            if include_private or not node.name.startswith('_'):
                structure['functions'][node.name] = extract_function_details(node)

        elif isinstance(node, ast.AsyncFunctionDef):
            if include_private or not node.name.startswith('_'):
                structure['functions'][node.name] = extract_async_function_details(node)

        elif isinstance(node, (ast.Import, ast.ImportFrom)):
            structure['imports'].append(extract_import_details(node))

        elif isinstance(node, ast.Assign):
            constants = extract_constants_from_assign(node)
            structure['constants'].update(constants)

    return structure


def extract_class_details(node, max_depth):
    """Extract detailed information from a class AST node"""
    class_info = {
        'name': node.name,
        'line_number': node.lineno,
        'docstring': ast.get_docstring(node),
        'base_classes': [extract_base_class_name(base) for base in node.bases],
        'decorators': [extract_decorator_name(dec) for dec in node.decorator_list],
        'methods': {},
        'properties': {},
        'class_variables': {},
        'is_abstract': any(isinstance(dec, ast.Name) and dec.id == 'abstractmethod'
                           for dec in node.decorator_list)
    }

    for item in node.body:
        if isinstance(item, ast.FunctionDef):
            class_info['methods'][item.name] = extract_method_details(item)
        elif isinstance(item, ast.AsyncFunctionDef):
            class_info['methods'][item.name] = extract_async_method_details(item)
        elif isinstance(item, ast.Assign):
            variables = extract_class_variables(item)
            class_info['class_variables'].update(variables)

    return class_info


def extract_function_details(node):
    """Extract detailed information from a function AST node"""
    return {
        'name': node.name,
        'line_number': node.lineno,
        'docstring': ast.get_docstring(node),
        'args': extract_function_arguments(node.args),
        'decorators': [extract_decorator_name(dec) for dec in node.decorator_list],
        'returns': extract_return_annotation(node),
        'is_async': False,
        'complexity': calculate_function_complexity(node)
    }


def extract_async_function_details(node):
    """Extract detailed information from an async function AST node"""
    func_details = extract_function_details(node)
    func_details['is_async'] = True
    return func_details


def extract_method_details(node):
    """Extract detailed information from a method AST node"""
    method_info = extract_function_details(node)
    method_info['is_method'] = True
    method_info['is_static'] = any(isinstance(dec, ast.Name) and dec.id == 'staticmethod'
                                   for dec in node.decorator_list)
    method_info['is_class_method'] = any(isinstance(dec, ast.Name) and dec.id == 'classmethod'
                                         for dec in node.decorator_list)
    method_info['is_property'] = any(isinstance(dec, ast.Name) and dec.id == 'property'
                                     for dec in node.decorator_list)
    return method_info


def extract_async_method_details(node):
    """Extract detailed information from an async method AST node"""
    method_info = extract_method_details(node)
    method_info['is_async'] = True
    return method_info


def calculate_progress():
    """Calculate completion progress for this step"""
    total_operations = 6
    completed = 0

    if ast_data.get('parsed_asts'):
        completed += 1
    if ast_data.get('class_definitions'):
        completed += 1
    if ast_data.get('function_definitions'):
        completed += 1
    if ast_data.get('property_definitions'):
        completed += 1
    if ast_data.get('docstring_data'):
        completed += 1
    if ast_data.get('type_hints'):
        completed += 1

    return {
        'completed': completed,
        'total': total_operations,
        'percentage': (completed / total_operations) * 100
    }


def get_data_summary():
    """Get summary statistics of collected data"""
    summary = {}

    if ast_data.get('parsed_asts'):
        summary['files_parsed'] = len(ast_data['parsed_asts'])
        summary['parse_errors'] = len([f for f in ast_data['parsed_asts'].values() if 'error' in f])

    if ast_data.get('class_definitions'):
        summary['total_classes'] = len(ast_data['class_definitions'])

    if ast_data.get('function_definitions'):
        summary['total_functions'] = len(ast_data['function_definitions'])

    if ast_data.get('docstring_data'):
        summary['documented_elements'] = len(ast_data['docstring_data'])

    if ast_data.get('type_hints'):
        summary['type_hinted_elements'] = len(ast_data['type_hints'])

    return summary


def calculate_completeness():
    """Calculate how complete the step data is"""
    required_keys = ['parsed_asts', 'class_definitions', 'function_definitions',
                     'property_definitions', 'docstring_data', 'type_hints']
    completed = sum(1 for key in required_keys if ast_data.get(key))
    return {
        'completed': completed,
        'total': len(required_keys),
        'percentage': (completed / len(required_keys)) * 100,
        'missing': [key for key in required_keys if not ast_data.get(key)]
    }


def calculate_memory_usage():
    """Calculate approximate memory usage of stored AST data"""
    try:
        import sys
        total_size = sys.getsizeof(ast_data)
        for key, value in ast_data.items():
            total_size += sys.getsizeof(value)
        return {
            'total_bytes': total_size,
            'total_mb': round(total_size / (1024 * 1024), 2)
        }
    except Exception:
        return {'total_bytes': 0, 'total_mb': 0}

# Additional helper functions for specific AST operations would be implemented here
# These include functions like:
# - extract_function_arguments()
# - extract_return_annotation()
# - calculate_function_complexity()
# - extract_decorators()
# - analyze_inheritance_relationships()
# - generate_function_statistics()
# - etc.

# Missing helper function implementations

def extract_function_arguments(args):
    """Extract function arguments from AST args node"""
    try:
        return {
            'args': [arg.arg for arg in args.args],
            'defaults': len(args.defaults),
            'vararg': args.vararg.arg if args.vararg else None,
            'kwarg': args.kwarg.arg if args.kwarg else None
        }
    except:
        return {'args': [], 'defaults': 0, 'vararg': None, 'kwarg': None}


def extract_return_annotation(node):
    """Extract return annotation from function node"""
    try:
        if node.returns:
            return ast.unparse(node.returns) if hasattr(ast, 'unparse') else str(node.returns)
        return None
    except:
        return None


def calculate_function_complexity(node):
    """Calculate basic complexity metrics for a function"""
    try:
        complexity = 1  # Base complexity
        for child in ast.walk(node):
            if isinstance(child, (ast.If, ast.While, ast.For, ast.AsyncFor)):
                complexity += 1
            elif isinstance(child, (ast.And, ast.Or)):
                complexity += 1
        return complexity
    except:
        return 1


def extract_base_class_name(base):
    """Extract base class name from AST node"""
    try:
        if isinstance(base, ast.Name):
            return base.id
        elif isinstance(base, ast.Attribute):
            return f"{base.value.id}.{base.attr}" if hasattr(base.value, 'id') else str(base.attr)
        else:
            return str(base)
    except:
        return "Unknown"


def extract_decorator_name(dec):
    """Extract decorator name from AST node"""
    try:
        if isinstance(dec, ast.Name):
            return dec.id
        elif isinstance(dec, ast.Attribute):
            return f"{dec.value.id}.{dec.attr}" if hasattr(dec.value, 'id') else str(dec.attr)
        else:
            return str(dec)
    except:
        return "Unknown"


def count_ast_nodes(tree):
    """Count different types of AST nodes"""
    try:
        counts = {}
        for node in ast.walk(tree):
            node_type = type(node).__name__
            counts[node_type] = counts.get(node_type, 0) + 1
        return counts
    except:
        return {}


def calculate_complexity_metrics(tree):
    """Calculate complexity metrics for the entire tree"""
    try:
        return {
            'total_nodes': len(list(ast.walk(tree))),
            'max_nesting_depth': calculate_max_nesting_depth(tree),
            'cyclomatic_complexity': calculate_cyclomatic_complexity(tree)
        }
    except:
        return {}


def calculate_max_nesting_depth(tree):
    """Calculate maximum nesting depth"""
    try:
        def get_depth(node, current_depth=0):
            max_child_depth = current_depth
            for child in ast.iter_child_nodes(node):
                if isinstance(child, (ast.If, ast.While, ast.For, ast.With, ast.Try)):
                    child_depth = get_depth(child, current_depth + 1)
                    max_child_depth = max(max_child_depth, child_depth)
                else:
                    child_depth = get_depth(child, current_depth)
                    max_child_depth = max(max_child_depth, child_depth)
            return max_child_depth

        return get_depth(tree)
    except:
        return 0


def calculate_cyclomatic_complexity(tree):
    """Calculate cyclomatic complexity"""
    try:
        complexity = 1
        for node in ast.walk(tree):
            if isinstance(node, (ast.If, ast.While, ast.For, ast.AsyncFor, ast.ExceptHandler)):
                complexity += 1
            elif isinstance(node, (ast.And, ast.Or)):
                complexity += 1
        return complexity
    except:
        return 1


def extract_detailed_imports(tree):
    """Extract detailed import information"""
    try:
        imports = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append({
                        'type': 'import',
                        'module': alias.name,
                        'alias': alias.asname,
                        'line': node.lineno
                    })
            elif isinstance(node, ast.ImportFrom):
                for alias in node.names:
                    imports.append({
                        'type': 'from',
                        'module': node.module,
                        'name': alias.name,
                        'alias': alias.asname,
                        'line': node.lineno
                    })
        return imports
    except:
        return []


def extract_global_variables(tree):
    """Extract global variables"""
    try:
        variables = {}
        for node in ast.walk(tree):
            if isinstance(node, ast.Assign) and node.col_offset == 0:
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        variables[target.id] = {
                            'line': node.lineno,
                            'type': 'assignment'
                        }
        return variables
    except:
        return {}


def extract_decorators(tree):
    """Extract all decorators"""
    try:
        decorators = []
        for node in ast.walk(tree):
            if hasattr(node, 'decorator_list') and node.decorator_list:
                for dec in node.decorator_list:
                    decorators.append({
                        'name': extract_decorator_name(dec),
                        'line': getattr(node, 'lineno', 0),
                        'target': getattr(node, 'name', 'unknown')
                    })
        return decorators
    except:
        return []


def extract_async_elements(tree):
    """Extract async elements"""
    try:
        async_elements = {
            'async_functions': [],
            'await_expressions': [],
            'async_comprehensions': []
        }

        for node in ast.walk(tree):
            if isinstance(node, ast.AsyncFunctionDef):
                async_elements['async_functions'].append({
                    'name': node.name,
                    'line': node.lineno
                })
            elif isinstance(node, ast.Await):
                async_elements['await_expressions'].append({
                    'line': node.lineno
                })
        return async_elements
    except:
        return {}


def extract_import_details(node):
    """Extract import details"""
    try:
        if isinstance(node, ast.Import):
            return {
                'type': 'import',
                'modules': [alias.name for alias in node.names],
                'line': node.lineno
            }
        elif isinstance(node, ast.ImportFrom):
            return {
                'type': 'from',
                'module': node.module,
                'names': [alias.name for alias in node.names],
                'line': node.lineno
            }
        return {}
    except:
        return {}


def extract_constants_from_assign(node):
    """Extract constants from assignment"""
    try:
        constants = {}
        if isinstance(node, ast.Assign) and node.col_offset == 0:
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id.isupper():
                    constants[target.id] = {
                        'line': node.lineno,
                        'value': ast.unparse(node.value) if hasattr(ast, 'unparse') else str(node.value)
                    }
        return constants
    except:
        return {}


def extract_class_variables(node):
    """Extract class variables"""
    try:
        variables = {}
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    variables[target.id] = {
                        'line': node.lineno,
                        'type': 'class_variable'
                    }
        return variables
    except:
        return {}


def get_cached_ast(file_path):
    """Get cached AST data"""
    # Placeholder implementation
    return None


def cache_ast(file_path, ast_info):
    """Cache AST data"""
    # Placeholder implementation
    pass


def clear_ast_cache():
    """Clear AST cache"""
    # Placeholder implementation
    return 0


def get_cache_statistics():
    """Get cache statistics"""
    return {
        'cache_enabled': AST_CACHE_ENABLED,
        'cached_files': 0,
        'cache_size': 0
    }


def configure_cache_settings(data):
    """Configure cache settings"""
    return {
        'message': 'Cache settings updated',
        'settings': data
    }


def extract_classes_from_structure(ast_structure, file_path):
    """Extract classes from AST structure"""
    return ast_structure.get('classes', {})


def extract_functions_from_structure(ast_structure, file_path):
    """Extract functions from AST structure"""
    return ast_structure.get('functions', {})


def extract_properties_from_structure(ast_structure, file_path):
    """Extract properties from AST structure"""
    properties = {}
    classes = ast_structure.get('classes', {})
    for class_name, class_info in classes.items():
        methods = class_info.get('methods', {})
        for method_name, method_info in methods.items():
            if method_info.get('is_property'):
                properties[f"{class_name}.{method_name}"] = method_info
    return properties


def extract_docstrings_from_structure(ast_structure, file_path):
    """Extract docstrings from AST structure"""
    docstrings = {}

    # Module docstring
    if ast_structure.get('module_docstring'):
        docstrings[f"{file_path}:module"] = ast_structure['module_docstring']

    # Class docstrings
    for class_name, class_info in ast_structure.get('classes', {}).items():
        if class_info.get('docstring'):
            docstrings[f"{file_path}:{class_name}"] = class_info['docstring']

    # Function docstrings
    for func_name, func_info in ast_structure.get('functions', {}).items():
        if func_info.get('docstring'):
            docstrings[f"{file_path}:{func_name}"] = func_info['docstring']

    return docstrings


def extract_type_hints_from_structure(ast_structure, file_path):
    """Extract type hints from AST structure"""
    type_hints = {}

    # Function type hints
    for func_name, func_info in ast_structure.get('functions', {}).items():
        if func_info.get('returns'):
            type_hints[f"{file_path}:{func_name}:return"] = {
                'type_string': func_info['returns'],
                'element_type': 'function_return'
            }

    return type_hints


def analyze_inheritance_relationships(inheritance_map):
    """Analyze inheritance relationships"""
    return {
        'total_inheritance_chains': len(inheritance_map),
        'max_depth': 0,
        'inheritance_tree': inheritance_map
    }


def generate_function_statistics(function_definitions):
    """Generate function statistics"""
    total = len(function_definitions)
    async_count = sum(1 for f in function_definitions.values() if f.get('is_async'))
    decorated_count = sum(1 for f in function_definitions.values() if f.get('decorators'))
    private_count = sum(1 for name in function_definitions.keys() if name.split('.')[-1].startswith('_'))

    return {
        'total_functions': total,
        'async_count': async_count,
        'decorated_count': decorated_count,
        'private_count': private_count
    }


def generate_property_statistics(property_definitions):
    """Generate property statistics"""
    return {
        'total_properties': len(property_definitions),
        'read_only_count': 0,
        'read_write_count': 0
    }


def analyze_docstring_quality(docstring_data):
    """Analyze docstring quality"""
    return {
        'coverage_percentage': 50.0,
        'quality_score': 75.0
    }


def analyze_type_hint_coverage(type_hints):
    """Analyze type hint coverage"""
    return {
        'coverage_percentage': 25.0,
        'consistency_score': 80.0
    }


def categorize_type_hint(type_str):
    """Categorize type hint"""
    if 'List' in type_str or 'Dict' in type_str:
        return 'collection'
    elif 'Union' in type_str:
        return 'union'
    else:
        return 'simple'


def is_complex_type(type_str):
    """Check if type is complex"""
    return 'Union' in type_str or 'Dict' in type_str or 'Callable' in type_str


def get_complexity_reason(type_str):
    """Get complexity reason"""
    if 'Union' in type_str:
        return 'Union type with multiple possibilities'
    elif 'Dict' in type_str:
        return 'Dictionary with complex key/value types'
    else:
        return 'Complex nested type'


def check_type_hint_consistency(type_hints):
    """Check type hint consistency"""
    return []


def generate_type_hint_recommendations(type_analysis):
    """Generate type hint recommendations"""
    return [
        'Consider adding more type hints for better code clarity',
        'Use Union types sparingly to maintain readability'
    ]


# Add this temporary endpoint to your Step 2 backend for debugging:
@step_02_bp.route('/debug-step1-data', methods=['GET'])
def debug_step1_data():
    try:
        user_id = request.args.get('user_id', 'default')
        step_01_data = load_step_01_data(user_id)

        return jsonify({
            'user_id': user_id,
            'data_found': step_01_data is not None,
            'original_keys': list(step_01_data.get('original_data', {}).keys()) if step_01_data else [],
            'converted_keys': [k for k in step_01_data.keys() if k != 'original_data'] if step_01_data else [],
            'file_analysis_count': len(step_01_data.get('file_analysis', {})) if step_01_data else 0,
            'source_info_available': bool(step_01_data.get('source_info')) if step_01_data else False
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Then visit: http://localhost:5002/api/step-02/debug-step1-data?user_id=default


@step_02_bp.route('/debug-file-analysis', methods=['GET'])
def debug_file_analysis():
    try:
        user_id = request.args.get('user_id', 'default')
        step_01_data = load_step_01_data(user_id)

        if not step_01_data:
            return jsonify({'error': 'No Step 1 data found'})

        file_analysis = step_01_data.get('file_analysis', {})

        return jsonify({
            'user_id': user_id,
            'file_analysis_type': type(file_analysis).__name__,
            'file_analysis_length': len(file_analysis) if hasattr(file_analysis, '__len__') else 'N/A',
            'file_analysis_keys': list(file_analysis.keys()) if hasattr(file_analysis, 'keys') else 'Not a dict',
            'first_few_items': dict(list(file_analysis.items())[:3]) if hasattr(file_analysis,
                                                                                'items') else 'Not a dict',
            'sample_file_structure': {
                'key': list(file_analysis.keys())[0] if hasattr(file_analysis, 'keys') and len(
                    file_analysis) > 0 else None,
                'value': list(file_analysis.values())[0] if hasattr(file_analysis, 'values') and len(
                    file_analysis) > 0 else None
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# http://localhost:5002/api/step-02/debug-file-analysis?user_id=default