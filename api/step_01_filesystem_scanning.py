# api/step_01_filesystem_scanning.py
from flask import Blueprint, jsonify, request, session
import os
import json
import ast
from pathlib import Path
import requests
import zipfile
import tempfile
import shutil
import logging
import psycopg2
from datetime import datetime, timedelta

# Create the blueprint
step_01_bp = Blueprint('step_01', __name__, url_prefix='/api/step-01')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global storage for this step's data
filesystem_data = {
    'source_info': {},
    'file_structure': {},
    'import_map': {},
    'file_analysis': {},
    'scan_metadata': {},
    'storage_config': {},
    'cache_metadata': {}
}



def refresh_filesystem_data(user_id='default'):
    """Ensure filesystem_data dict is always up to date from DB"""
    db_data = load_step_data(user_id)
    if db_data:
        filesystem_data.update(db_data)


def get_db_connection():
    return psycopg2.connect("dbname=portfolio_db user=postgres password=TqKwifr5jtJ6 host=localhost port=60616")

def save_step_data(user_id='default'):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO step_01_progress (user_id, step_data, last_updated)
            VALUES (%s, %s, %s)
            ON CONFLICT (user_id) DO UPDATE SET
            step_data = EXCLUDED.step_data,
            last_updated = EXCLUDED.last_updated
        """, (user_id, json.dumps(filesystem_data), datetime.now()))
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        logger.error(f"Error saving to database: {str(e)}")

def load_step_data(user_id='default'):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT step_data FROM step_01_progress WHERE user_id = %s", (user_id,))
        row = cur.fetchone()
        cur.close()
        conn.close()
        if row:
            return json.loads(row[0])
    except Exception as e:
        logger.error(f"Error loading from database: {str(e)}")
    return {}

# Configuration constants
DOWNLOAD_BASE_DIR = os.getenv('PPTX_DOWNLOAD_DIR', './downloads/pptx_sources')
CACHE_ENABLED = os.getenv('PPTX_CACHE_ENABLED', 'true').lower() == 'true'
CACHE_TTL = int(os.getenv('PPTX_CACHE_TTL', 86400))
AUTO_CLEANUP = os.getenv('PPTX_AUTO_CLEANUP', 'false').lower() == 'true'

# Ensure download directory exists
Path(DOWNLOAD_BASE_DIR).mkdir(parents=True, exist_ok=True)

@step_01_bp.route('/status', methods=['GET'])
def get_status():
    """
    Get the current status of Step 1: Library File System Scanning

    Returns:
        dict: Current status including progress, completion state, and summary statistics
    """
    try:
        return jsonify({
            'step': 1,
            'name': 'Library File System Scanning',
            'status': 'ready' if not filesystem_data['source_info'] else 'completed',
            'progress': calculate_progress(),
            'data_summary': get_data_summary(),
            'last_updated': filesystem_data.get('scan_metadata', {}).get('last_scan_time'),
            'operations_available': [
                'download_source',
                'parse_files',
                'extract_imports',
                'list_files',
                'create_structure_map'
            ]
        })
    except Exception as e:
        logger.error(f"Error getting status: {str(e)}")
        return jsonify({'error': str(e)}), 500


@step_01_bp.route('/download-source', methods=['POST'])
def download_python_pptx_source():
    """
    Download python-pptx source code from GitHub

    Request Body:
        {
            "version": "latest" | "specific_tag",
            "force_refresh": boolean,
            "persistent_storage": boolean,
            "cache_enabled": boolean
        }

    Returns:
        dict: Download status and source information
    """
    try:
        refresh_filesystem_data()
        data = request.get_json() or {}
        version = data.get('version', 'latest')
        force_refresh = data.get('force_refresh', False)
        persistent_storage = data.get('persistent_storage', False)
        cache_enabled = data.get('cache_enabled', CACHE_ENABLED)

        # Check if already downloaded and not forcing refresh
        if filesystem_data['source_info'] and not force_refresh:
            return jsonify({
                'message': 'Source already downloaded',
                'source_info': filesystem_data['source_info'],
                'use_force_refresh': True
            })

        # Check cache if enabled and not forcing refresh
        if cache_enabled and not force_refresh:
            cached = check_cached_source(version)
            if cached:
                filesystem_data['source_info'] = {
                    'version': version,
                    'download_url': cached['metadata']['download_url'],
                    'source_path': cached['cache_path'],
                    'temp_dir': None,
                    'download_time': cached['metadata']['cache_time'],
                    'total_size': cached['metadata']['total_size'],
                    'from_cache': True
                }
                return jsonify({
                    'message': 'Source loaded from cache',
                    'source_info': filesystem_data['source_info']
                })

        # GitHub URL for python-pptx
        if version == 'latest':
            url = 'https://github.com/scanny/python-pptx/archive/refs/heads/master.zip'
        else:
            url = f'https://github.com/scanny/python-pptx/archive/refs/tags/{version}.zip'

        # Create directory (permanent or temporary)
        if persistent_storage:
            download_dir = get_permanent_source_path(version)
            Path(download_dir).mkdir(parents=True, exist_ok=True)
            temp_dir = None
        else:
            download_dir = tempfile.mkdtemp(prefix='python_pptx_')
            temp_dir = download_dir

        zip_path = os.path.join(download_dir, 'python-pptx.zip')

        # Download the source
        logger.info(f"Downloading python-pptx from: {url}")
        response = requests.get(url, stream=True)
        response.raise_for_status()

        with open(zip_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        # Extract the zip
        extract_dir = os.path.join(download_dir, 'extracted')
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)

        # Find the actual source directory
        source_dir = None
        for item in os.listdir(extract_dir):
            item_path = os.path.join(extract_dir, item)
            if os.path.isdir(item_path) and 'python-pptx' in item:
                source_dir = item_path
                break

        if not source_dir:
            raise Exception("Could not find python-pptx source directory in extracted archive")

        # Store source information
        filesystem_data['source_info'] = {
            'version': version,
            'download_url': url,
            'source_path': source_dir,
            'temp_dir': temp_dir,
            'download_time': datetime.now().isoformat(),
            'total_size': get_directory_size(source_dir)
        }

        filesystem_data['scan_metadata']['last_scan_time'] = datetime.now().isoformat()

        # Save cache metadata if using persistent storage
        if persistent_storage and cache_enabled:
            cache_metadata = {
                'version': version,
                'download_url': url,
                'cache_time': datetime.now().isoformat(),
                'total_size': get_directory_size(source_dir)
            }
            metadata_file = os.path.join(source_dir, '.cache_metadata.json')
            with open(metadata_file, 'w') as f:
                json.dump(cache_metadata, f)

        save_step_data()
        return jsonify({
            'message': 'Source downloaded successfully',
            'source_info': filesystem_data['source_info']
        })

    except Exception as e:
        logger.error(f"Error downloading source: {str(e)}")
        return jsonify({'error': str(e)}), 500


@step_01_bp.route('/parse-files', methods=['POST'])
def parse_all_python_files():
    """
    Parse all .py files in the python-pptx package directory
    """
    try:
        refresh_filesystem_data()
        if not filesystem_data['source_info']:
            return jsonify({'error': 'Source not downloaded. Run download-source first.'}), 400

        source_path = filesystem_data['source_info']['source_path']
        possible_dirs = [
            os.path.join(source_path, 'pptx'),
            os.path.join(source_path, 'src', 'pptx')
        ]

        pptx_package_path = None
        for path in possible_dirs:
            if os.path.exists(path):
                pptx_package_path = path
                break

        if not pptx_package_path:
            return jsonify({'error': f'Could not find package dir. Looked in: {possible_dirs}'}), 404

        parsed_files = {}
        total_files = 0
        successful_parses = 0

        # Walk through all Python files
        for root, dirs, files in os.walk(pptx_package_path):
            for file in files:
                if file.endswith('.py'):
                    file_path = os.path.join(root, file)
                    relative_path = os.path.relpath(file_path, pptx_package_path)
                    total_files += 1

                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()

                        tree = ast.parse(content)

                        file_info = {
                            'path': relative_path,
                            'full_path': file_path,
                            'size': os.path.getsize(file_path),
                            'lines': len(content.splitlines()),
                            'classes': [],
                            'functions': [],
                            'imports': [],
                            'module_docstring': ast.get_docstring(tree)
                        }

                        for node in ast.walk(tree):
                            if isinstance(node, ast.ClassDef):
                                file_info['classes'].append({
                                    'name': node.name,
                                    'line': node.lineno,
                                    'methods': [n.name for n in node.body if isinstance(n, ast.FunctionDef)]
                                })
                            elif isinstance(node, ast.FunctionDef) and node.col_offset == 0:
                                file_info['functions'].append({
                                    'name': node.name,
                                    'line': node.lineno,
                                    'args': [arg.arg for arg in node.args.args]
                                })
                            elif isinstance(node, (ast.Import, ast.ImportFrom)):
                                if isinstance(node, ast.Import):
                                    for alias in node.names:
                                        file_info['imports'].append({
                                            'type': 'import',
                                            'module': alias.name,
                                            'alias': alias.asname
                                        })
                                elif isinstance(node, ast.ImportFrom):
                                    for alias in node.names:
                                        file_info['imports'].append({
                                            'type': 'from',
                                            'module': node.module,
                                            'name': alias.name,
                                            'alias': alias.asname
                                        })

                        parsed_files[relative_path] = file_info
                        successful_parses += 1

                    except Exception as e:
                        logger.warning(f"Could not parse {relative_path}: {str(e)}")
                        parsed_files[relative_path] = {
                            'path': relative_path,
                            'error': str(e),
                            'parsed': False
                        }

        filesystem_data['file_analysis'] = parsed_files
        filesystem_data['scan_metadata']['parse_time'] = datetime.now().isoformat()

        save_step_data()
        return jsonify({
            'message': 'Files parsed successfully',
            'total_files': total_files,
            'successful_parses': successful_parses,
            'failed_parses': total_files - successful_parses,
            'files': parsed_files
        })

    except Exception as e:
        logger.error(f"Error parsing files: {str(e)}")
        return jsonify({'error': str(e)}), 500


@step_01_bp.route('/extract-imports', methods=['POST'])
def extract_import_dependencies():
    """
    Extract import statements to map dependencies between modules

    Returns:
        dict: Dependency mapping and import analysis
    """
    try:
        refresh_filesystem_data()
        if not filesystem_data['file_analysis']:
            return jsonify({'error': 'Files not parsed. Run parse-files first.'}), 400

        import_map = {}
        dependency_graph = {}
        external_dependencies = set()
        internal_dependencies = set()

        # Process each file's imports
        for file_path, file_info in filesystem_data['file_analysis'].items():
            if 'imports' not in file_info:
                continue

            module_name = file_path.replace('/', '.').replace('.py', '')
            import_map[module_name] = {
                'file_path': file_path,
                'imports': file_info['imports'],
                'depends_on': [],
                'imported_by': []
            }

            # Categorize imports
            for imp in file_info['imports']:
                module = imp.get('module', '')
                if module:
                    if module.startswith('pptx') or module.startswith('.'):
                        internal_dependencies.add(module)
                        import_map[module_name]['depends_on'].append(module)
                    else:
                        external_dependencies.add(module)

        # Build reverse dependency map
        for module, info in import_map.items():
            for dep in info['depends_on']:
                if dep in import_map:
                    import_map[dep]['imported_by'].append(module)

        # Create dependency graph
        for module, info in import_map.items():
            dependency_graph[module] = {
                'depends_on': len(info['depends_on']),
                'imported_by': len(info['imported_by']),
                'dependencies': info['depends_on']
            }

        filesystem_data['import_map'] = {
            'dependency_graph': dependency_graph,
            'import_details': import_map,
            'external_dependencies': list(external_dependencies),
            'internal_dependencies': list(internal_dependencies),
            'analysis_time': datetime.now().isoformat()
        }

        save_step_data()
        return jsonify({
            'message': 'Import dependencies extracted successfully',
            'total_modules': len(import_map),
            'external_dependencies': len(external_dependencies),
            'internal_dependencies': len(internal_dependencies),
            'dependency_map': filesystem_data['import_map']
        })

    except Exception as e:
        logger.error(f"Error extracting imports: {str(e)}")
        return jsonify({'error': str(e)}), 500


@step_01_bp.route('/list-files', methods=['GET'])
def list_all_files_and_purposes():
    """
    List all Python files and their purposes based on analysis

    Returns:
        dict: Comprehensive file listing with purpose analysis
    """
    try:
        if not filesystem_data['file_analysis']:
            return jsonify({'error': 'Files not parsed. Run parse-files first.'}), 400

        file_purposes = {}

        for file_path, file_info in filesystem_data['file_analysis'].items():
            if 'error' in file_info:
                continue

            # Determine purpose based on file structure and content
            purpose = determine_file_purpose(file_path, file_info)

            file_purposes[file_path] = {
                'purpose': purpose,
                'classes': len(file_info.get('classes', [])),
                'functions': len(file_info.get('functions', [])),
                'imports': len(file_info.get('imports', [])),
                'lines': file_info.get('lines', 0),
                'size': file_info.get('size', 0),
                'docstring': file_info.get('module_docstring', '')[:200] + '...' if file_info.get(
                    'module_docstring') else None
            }

        # Group by purpose
        by_purpose = {}
        for file_path, info in file_purposes.items():
            purpose = info['purpose']
            if purpose not in by_purpose:
                by_purpose[purpose] = []
            by_purpose[purpose].append(file_path)

        return jsonify({
            'message': 'File listing completed',
            'total_files': len(file_purposes),
            'files_by_purpose': by_purpose,
            'file_details': file_purposes
        })

    except Exception as e:
        logger.error(f"Error listing files: {str(e)}")
        return jsonify({'error': str(e)}), 500


@step_01_bp.route('/create-structure-map', methods=['POST'])
def create_file_structure_map():
    """
    Create a comprehensive file structure map of the python-pptx library

    Returns:
        dict: Complete file structure mapping with hierarchical organization
    """
    try:
        if not filesystem_data['file_analysis']:
            return jsonify({'error': 'Files not parsed. Run parse-files first.'}), 400

        structure_map = {
            'root': {
                'type': 'package',
                'name': 'pptx',
                'children': {},
                'files': []
            }
        }

        # Build hierarchical structure
        for file_path, file_info in filesystem_data['file_analysis'].items():
            if 'error' in file_info:
                continue

            path_parts = file_path.split('/')
            current_level = structure_map['root']

            # Navigate/create directory structure
            for i, part in enumerate(path_parts[:-1]):  # All but the last part (filename)
                if part not in current_level['children']:
                    current_level['children'][part] = {
                        'type': 'directory',
                        'name': part,
                        'children': {},
                        'files': []
                    }
                current_level = current_level['children'][part]

            # Add file to the current level
            filename = path_parts[-1]
            current_level['files'].append({
                'name': filename,
                'type': 'file',
                'classes': [cls['name'] for cls in file_info.get('classes', [])],
                'functions': [func['name'] for func in file_info.get('functions', [])],
                'imports': len(file_info.get('imports', [])),
                'lines': file_info.get('lines', 0),
                'purpose': determine_file_purpose(file_path, file_info)
            })

        # Add statistics
        stats = calculate_structure_statistics(structure_map['root'])

        filesystem_data['file_structure'] = {
            'structure': structure_map,
            'statistics': stats,
            'creation_time': datetime.now().isoformat()
        }

        save_step_data()
        return jsonify({
            'message': 'File structure map created successfully',
            'structure': structure_map,
            'statistics': stats
        })

    except Exception as e:
        logger.error(f"Error creating structure map: {str(e)}")
        return jsonify({'error': str(e)}), 500


@step_01_bp.route('/data', methods=['GET'])
def get_all_step_data():
    """
    Get all collected data from Step 1

    Returns:
        dict: Complete dataset from filesystem scanning step
    """
    try:
        # Load from database instead of memory
        db_data = load_step_data()
        if db_data:
            filesystem_data.update(db_data)

        return jsonify({
            'step': 1,
            'name': 'Library File System Scanning',
            'data': filesystem_data,
            'data_keys': list(filesystem_data.keys()),
            'completeness': calculate_completeness()
        })
    except Exception as e:
        logger.error(f"Error getting data: {str(e)}")
        return jsonify({'error': str(e)}), 500


@step_01_bp.route('/reset', methods=['POST'])
def reset_step_data():
    """
    Reset all data for Step 1 (useful for re-running analysis)

    Returns:
        dict: Reset confirmation
    """
    try:
        # Clean up temporary directories
        if filesystem_data.get('source_info', {}).get('temp_dir'):
            temp_dir = filesystem_data['source_info']['temp_dir']
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)

        # Reset all data
        for key in filesystem_data:
            filesystem_data[key] = {}

        return jsonify({
            'message': 'Step 1 data reset successfully',
            'status': 'ready'
        })

    except Exception as e:
        logger.error(f"Error resetting data: {str(e)}")
        return jsonify({'error': str(e)}), 500


# More Helper functions

def get_permanent_source_path(version):
    """Generate permanent storage path for a specific version"""
    safe_version = version.replace('/', '_').replace('\\', '_')
    return os.path.join(DOWNLOAD_BASE_DIR, f'python-pptx-{safe_version}')


def check_cached_source(version):
    """Check if source is already cached and still valid"""
    if not CACHE_ENABLED:
        return None

    cache_path = get_permanent_source_path(version)
    cache_metadata_file = os.path.join(cache_path, '.cache_metadata.json')

    if os.path.exists(cache_metadata_file):
        try:
            with open(cache_metadata_file, 'r') as f:
                metadata = json.load(f)

            cache_time = datetime.fromisoformat(metadata['cache_time'])
            if (datetime.now() - cache_time).total_seconds() < CACHE_TTL:
                return {
                    'cached': True,
                    'cache_path': cache_path,
                    'metadata': metadata
                }
        except Exception as e:
            logger.warning(f"Error reading cache metadata: {e}")

    return None


def cleanup_expired_cache():
    """Remove expired cached downloads"""
    if not os.path.exists(DOWNLOAD_BASE_DIR):
        return []

    cleaned = []
    for item in os.listdir(DOWNLOAD_BASE_DIR):
        item_path = os.path.join(DOWNLOAD_BASE_DIR, item)
        if os.path.isdir(item_path):
            metadata_file = os.path.join(item_path, '.cache_metadata.json')
            if os.path.exists(metadata_file):
                try:
                    with open(metadata_file, 'r') as f:
                        metadata = json.load(f)

                    cache_time = datetime.fromisoformat(metadata['cache_time'])
                    if (datetime.now() - cache_time).total_seconds() >= CACHE_TTL:
                        shutil.rmtree(item_path)
                        cleaned.append(item)
                except Exception as e:
                    logger.warning(f"Error cleaning cache {item}: {e}")

    return cleaned


def get_storage_info():
    """Get information about storage configuration and usage"""
    storage_usage = 0
    cached_versions = []

    if os.path.exists(DOWNLOAD_BASE_DIR):
        for item in os.listdir(DOWNLOAD_BASE_DIR):
            item_path = os.path.join(DOWNLOAD_BASE_DIR, item)
            if os.path.isdir(item_path):
                size = get_directory_size(item_path)
                storage_usage += size

                metadata_file = os.path.join(item_path, '.cache_metadata.json')
                if os.path.exists(metadata_file):
                    try:
                        with open(metadata_file, 'r') as f:
                            metadata = json.load(f)
                        cached_versions.append({
                            'version': metadata['version'],
                            'size': size,
                            'cache_time': metadata['cache_time']
                        })
                    except Exception:
                        pass

    return {
        'download_dir': DOWNLOAD_BASE_DIR,
        'cache_enabled': CACHE_ENABLED,
        'cache_ttl': CACHE_TTL,
        'auto_cleanup': AUTO_CLEANUP,
        'storage_usage': storage_usage,
        'cached_versions': cached_versions
    }


# Helper functions
def calculate_progress():
    """Calculate completion progress for this step"""
    total_operations = 5
    completed = 0

    if filesystem_data.get('source_info'):
        completed += 1
    if filesystem_data.get('file_analysis'):
        completed += 1
    if filesystem_data.get('import_map'):
        completed += 1
    if filesystem_data.get('file_structure'):
        completed += 2  # This represents both list-files and create-structure-map

    return {
        'completed': completed,
        'total': total_operations,
        'percentage': (completed / total_operations) * 100
    }


def get_data_summary():
    """Get summary statistics of collected data"""
    summary = {}

    if filesystem_data.get('source_info'):
        summary['source_downloaded'] = True
        summary['source_size'] = filesystem_data['source_info'].get('total_size', 0)

    if filesystem_data.get('file_analysis'):
        summary['files_analyzed'] = len(filesystem_data['file_analysis'])
        summary['total_classes'] = sum(len(f.get('classes', [])) for f in filesystem_data['file_analysis'].values())
        summary['total_functions'] = sum(len(f.get('functions', [])) for f in filesystem_data['file_analysis'].values())

    if filesystem_data.get('import_map'):
        summary['internal_dependencies'] = len(filesystem_data['import_map'].get('internal_dependencies', []))
        summary['external_dependencies'] = len(filesystem_data['import_map'].get('external_dependencies', []))

    return summary


def determine_file_purpose(file_path, file_info):
    """Determine the purpose of a file based on its path and content"""
    path_lower = file_path.lower()

    if '__init__.py' in path_lower:
        return 'package_init'
    elif 'test' in path_lower:
        return 'test'
    elif 'util' in path_lower or 'helper' in path_lower:
        return 'utility'
    elif 'exception' in path_lower or 'error' in path_lower:
        return 'exception_handling'
    elif 'constant' in path_lower or 'enum' in path_lower:
        return 'constants'
    elif len(file_info.get('classes', [])) > 0:
        return 'class_definition'
    elif len(file_info.get('functions', [])) > 0:
        return 'function_module'
    else:
        return 'other'


def calculate_structure_statistics(node):
    """Calculate statistics for the file structure"""
    stats = {
        'total_directories': 0,
        'total_files': 0,
        'total_classes': 0,
        'total_functions': 0,
        'max_depth': 0
    }

    def traverse(node, depth=0):
        stats['max_depth'] = max(stats['max_depth'], depth)

        for child in node.get('children', {}).values():
            stats['total_directories'] += 1
            traverse(child, depth + 1)

        for file_info in node.get('files', []):
            stats['total_files'] += 1
            stats['total_classes'] += len(file_info.get('classes', []))
            stats['total_functions'] += len(file_info.get('functions', []))

    traverse(node)
    return stats


def calculate_completeness():
    """Calculate how complete the step data is"""
    required_keys = ['source_info', 'file_analysis', 'import_map', 'file_structure']
    completed = sum(1 for key in required_keys if filesystem_data.get(key))
    return {
        'completed': completed,
        'total': len(required_keys),
        'percentage': (completed / len(required_keys)) * 100,
        'missing': [key for key in required_keys if not filesystem_data.get(key)]
    }


def get_directory_size(path):
    """Calculate total size of a directory"""
    total = 0
    for dirpath, dirnames, filenames in os.walk(path):
        for filename in filenames:
            filepath = os.path.join(dirpath, filename)
            if os.path.exists(filepath):
                total += os.path.getsize(filepath)
    return total


@step_01_bp.route('/storage-config', methods=['GET', 'POST'])
def manage_storage_configuration():
    """
    GET: Get current storage configuration
    POST: Update storage configuration
    """
    try:
        if request.method == 'GET':
            return jsonify(get_storage_info())

        elif request.method == 'POST':
            refresh_filesystem_data()
            data = request.get_json() or {}

            # Store configuration
            filesystem_data['storage_config'] = {
                'download_dir': data.get('download_dir', DOWNLOAD_BASE_DIR),
                'cache_enabled': data.get('cache_enabled', CACHE_ENABLED),
                'cache_ttl': data.get('cache_ttl', CACHE_TTL),
                'auto_cleanup': data.get('auto_cleanup', AUTO_CLEANUP),
                'updated_time': datetime.now().isoformat()
            }

            return jsonify({
                'message': 'Storage configuration updated',
                'config': filesystem_data['storage_config']
            })

    except Exception as e:
        logger.error(f"Error managing storage config: {str(e)}")
        return jsonify({'error': str(e)}), 500


@step_01_bp.route('/cleanup', methods=['POST'])
def cleanup_old_downloads():
    """
    Clean up old downloads based on retention policy
    """
    try:
        refresh_filesystem_data()
        data = request.get_json() or {}
        keep_latest = data.get('keep_latest', 3)
        older_than_days = data.get('older_than_days', 30)

        cleaned_items = []

        if os.path.exists(DOWNLOAD_BASE_DIR):
            items_with_time = []

            for item in os.listdir(DOWNLOAD_BASE_DIR):
                item_path = os.path.join(DOWNLOAD_BASE_DIR, item)
                if os.path.isdir(item_path):
                    metadata_file = os.path.join(item_path, '.cache_metadata.json')
                    if os.path.exists(metadata_file):
                        try:
                            with open(metadata_file, 'r') as f:
                                metadata = json.load(f)
                            cache_time = datetime.fromisoformat(metadata['cache_time'])
                            items_with_time.append((item, item_path, cache_time))
                        except Exception:
                            pass

            # Sort by cache time (newest first)
            items_with_time.sort(key=lambda x: x[2], reverse=True)

            # Remove items older than specified days
            cutoff_date = datetime.now() - timedelta(days=older_than_days)
            for item, item_path, cache_time in items_with_time:
                if cache_time < cutoff_date:
                    shutil.rmtree(item_path)
                    cleaned_items.append(item)

            # Keep only the latest N items
            if len(items_with_time) > keep_latest:
                for item, item_path, cache_time in items_with_time[keep_latest:]:
                    if item not in cleaned_items:  # Don't double-count
                        shutil.rmtree(item_path)
                        cleaned_items.append(item)

        return jsonify({
            'message': f'Cleanup completed. Removed {len(cleaned_items)} items.',
            'cleaned_items': cleaned_items
        })

    except Exception as e:
        logger.error(f"Error during cleanup: {str(e)}")
        return jsonify({'error': str(e)}), 500


@step_01_bp.route('/cache-status/<version>', methods=['GET'])
def check_cache_status(version):
    """
    Check if a specific version is cached and cache details
    """
    try:
        cached = check_cached_source(version)

        if cached:
            return jsonify({
                'cached': True,
                'cache_path': cached['cache_path'],
                'cache_time': cached['metadata']['cache_time'],
                'expires': (datetime.fromisoformat(cached['metadata']['cache_time']) +
                            timedelta(seconds=CACHE_TTL)).isoformat(),
                'size': cached['metadata']['total_size']
            })
        else:
            return jsonify({
                'cached': False,
                'cache_path': None,
                'cache_time': None,
                'expires': None,
                'size': 0
            })

    except Exception as e:
        logger.error(f"Error checking cache status: {str(e)}")
        return jsonify({'error': str(e)}), 500


