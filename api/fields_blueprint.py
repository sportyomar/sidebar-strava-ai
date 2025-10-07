# api/fields_blueprint.py
from flask import Blueprint, jsonify, request
import psycopg2
from psycopg2.extras import RealDictCursor
import re
import json
from datetime import datetime
from html.parser import HTMLParser
from registry import get_templates_db

fields_bp = Blueprint('fields', __name__)


def get_templates_connection():
    """Get database connection for templates"""
    db_config = get_templates_db()
    if not db_config:
        raise Exception("Templates database configuration not found")

    return psycopg2.connect(
        host=db_config['host'],
        port=db_config['port'],
        database=db_config['database_name'],
        user=db_config['username'],
        password=db_config['password']
    )


class FieldExtractor(HTMLParser):
    """HTML parser to extract template fields safely"""

    def __init__(self):
        super().__init__()
        self.placeholders = []
        self.current_data = ""

    def handle_data(self, data):
        self.current_data += data
        # Find template placeholders in text content
        placeholders = re.findall(r'\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}', data)
        for placeholder in placeholders:
            if placeholder not in [p['key'] for p in self.placeholders]:
                self.placeholders.append({
                    'key': placeholder,
                    'full_match': f'{{{{{placeholder}}}}}',
                    'context': data.strip()[:100]
                })

    def extract_fields(self, html_content):
        """Extract all template fields from HTML"""
        self.placeholders = []
        self.current_data = ""

        if not html_content:
            return []

        try:
            self.feed(html_content)
            return self.placeholders
        except Exception as e:
            print(f"HTML parsing error: {e}")
            # Fallback to regex if HTML parser fails
            return self._extract_with_regex(html_content)

    def _extract_with_regex(self, html_content):
        """Fallback extraction using regex"""
        placeholders = []
        matches = re.finditer(r'\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}', html_content)

        for match in matches:
            key = match.group(1)
            if key not in [p['key'] for p in placeholders]:
                # Get context around the match
                start = max(0, match.start() - 50)
                end = min(len(html_content), match.end() + 50)
                context = html_content[start:end].strip()

                placeholders.append({
                    'key': key,
                    'full_match': match.group(0),
                    'context': context
                })

        return placeholders


# Global extractor instance
field_extractor = FieldExtractor()


@fields_bp.route('/api/fields/extract/<int:template_id>', methods=['POST'])
def extract_template_fields(template_id):
    """Extract fields from template HTML and update database"""
    try:
        conn = get_templates_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Get template
        cursor.execute("""
            SELECT id, html_structure, type 
            FROM ui_templates 
            WHERE id = %s
        """, (template_id,))

        template = cursor.fetchone()
        if not template:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'error': 'Template not found'
            }), 404

        # Extract fields from HTML
        html_content = template['html_structure'] or ''
        extracted_placeholders = field_extractor.extract_fields(html_content)

        # Get field definitions for this template type
        cursor.execute("""
            SELECT fd.*, fg.label as group_label, fg.priority as group_priority
            FROM template_field_definitions fd
            LEFT JOIN template_field_groups fg ON fd.field_group = fg.group_key
            WHERE %s = ANY(fg.template_types) OR fg.template_types = '{}'
            ORDER BY fg.priority, fd.field_key
        """, (template['type'],))

        field_definitions = {row['field_key']: dict(row) for row in cursor.fetchall()}

        # Match extracted fields with definitions
        found_fields = []
        field_values = {}

        for placeholder in extracted_placeholders:
            field_key = placeholder['key']

            if field_key in field_definitions:
                # Known field
                field_def = field_definitions[field_key]
                found_fields.append({
                    'key': field_key,
                    'label': field_def['label'],
                    'description': field_def['description'],
                    'type': field_def['field_type'],
                    'group': field_def['field_group'],
                    'group_label': field_def['group_label'],
                    'group_priority': field_def['group_priority'] or 999,
                    'default_value': field_def['default_value'],
                    'is_required': field_def['is_required'],
                    'is_custom': False,
                    'context': placeholder['context']
                })
                field_values[field_key] = field_def['default_value'] or ''
            else:
                # Custom field
                found_fields.append({
                    'key': field_key,
                    'label': field_key.replace('_', ' ').title(),
                    'description': 'Custom field (not in predefined schema)',
                    'type': 'text',
                    'group': 'custom',
                    'group_label': 'Custom Fields',
                    'group_priority': 999,
                    'default_value': '',
                    'is_required': False,
                    'is_custom': True,
                    'context': placeholder['context']
                })
                field_values[field_key] = ''

        # Update template with extracted fields
        cursor.execute("""
            UPDATE ui_templates 
            SET extracted_fields = %s, 
                field_values = %s, 
                last_extraction_at = %s
            WHERE id = %s
            RETURNING id, extracted_fields, field_values, last_extraction_at
        """, (
            json.dumps(found_fields),
            json.dumps(field_values),
            datetime.now(),
            template_id
        ))

        updated_template = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            'success': True,
            'template_id': template_id,
            'extracted_fields': found_fields,
            'field_values': field_values,
            'extraction_stats': {
                'total_placeholders': len(extracted_placeholders),
                'known_fields': len([f for f in found_fields if not f['is_custom']]),
                'custom_fields': len([f for f in found_fields if f['is_custom']])
            },
            'last_extraction_at': updated_template['last_extraction_at'].isoformat() if updated_template[
                'last_extraction_at'] else None
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@fields_bp.route('/api/fields/values/<int:template_id>', methods=['PUT'])
def update_field_values(template_id):
    """Update field values for a template"""
    try:
        data = request.get_json()
        field_values = data.get('field_values', {})

        if not field_values:
            return jsonify({
                'success': False,
                'error': 'No field values provided'
            }), 400

        conn = get_templates_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Get current template
        cursor.execute("""
            SELECT id, html_structure, field_values 
            FROM ui_templates 
            WHERE id = %s
        """, (template_id,))

        template = cursor.fetchone()
        if not template:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'error': 'Template not found'
            }), 404

        # Merge with existing field values
        current_values = template['field_values'] or {}
        updated_values = {**current_values, **field_values}

        # Generate HTML with updated values
        html_with_values = template['html_structure'] or ''
        for field_key, value in updated_values.items():
            placeholder = f'{{{{{field_key}}}}}'
            html_with_values = html_with_values.replace(placeholder, str(value or ''))

        # Update database
        cursor.execute("""
            UPDATE ui_templates 
            SET field_values = %s
            WHERE id = %s
            RETURNING id, field_values
        """, (json.dumps(updated_values), template_id))

        updated_template = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            'success': True,
            'template_id': template_id,
            'field_values': updated_values,
            'html_with_values': html_with_values
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@fields_bp.route('/api/fields/render/<int:template_id>', methods=['GET'])
def render_template_with_values(template_id):
    """Get template HTML with field values applied"""
    try:
        conn = get_templates_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT id, html_structure, field_values 
            FROM ui_templates 
            WHERE id = %s
        """, (template_id,))

        template = cursor.fetchone()
        cursor.close()
        conn.close()

        if not template:
            return jsonify({
                'success': False,
                'error': 'Template not found'
            }), 404

        # Apply field values to HTML
        html_content = template['html_structure'] or ''
        field_values = template['field_values'] or {}

        for field_key, value in field_values.items():
            placeholder = f'{{{{{field_key}}}}}'
            html_content = html_content.replace(placeholder, str(value or ''))

        return jsonify({
            'success': True,
            'template_id': template_id,
            'html_content': html_content,
            'field_values': field_values
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@fields_bp.route('/api/fields/definitions', methods=['GET'])
def get_field_definitions():
    """Get all field definitions grouped by category"""
    try:
        template_type = request.args.get('type', '')

        conn = get_templates_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Get field groups
        group_query = """
            SELECT * FROM template_field_groups 
            WHERE %s = ANY(template_types) OR template_types = '{}' OR %s = ''
            ORDER BY priority
        """
        cursor.execute(group_query, (template_type, template_type))
        groups = {row['group_key']: dict(row) for row in cursor.fetchall()}

        # Get field definitions
        field_query = """
            SELECT fd.*, fg.label as group_label, fg.priority as group_priority
            FROM template_field_definitions fd
            LEFT JOIN template_field_groups fg ON fd.field_group = fg.group_key
            WHERE (%s = ANY(fg.template_types) OR fg.template_types = '{}' OR %s = '')
            ORDER BY fg.priority, fd.field_key
        """
        cursor.execute(field_query, (template_type, template_type))

        fields_by_group = {}
        for row in cursor.fetchall():
            field = dict(row)
            group_key = field['field_group']

            if group_key not in fields_by_group:
                fields_by_group[group_key] = {
                    'group': groups.get(group_key,
                                        {'group_key': group_key, 'label': group_key.title(), 'priority': 999}),
                    'fields': []
                }

            fields_by_group[group_key]['fields'].append({
                'key': field['field_key'],
                'label': field['label'],
                'description': field['description'],
                'type': field['field_type'],
                'default_value': field['default_value'],
                'is_required': field['is_required'],
                'validation_rules': field['validation_rules']
            })

        cursor.close()
        conn.close()

        return jsonify({
            'success': True,
            'template_type': template_type,
            'field_groups': fields_by_group
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@fields_bp.route('/api/fields/definitions', methods=['POST'])
def create_field_definition():
    """Create new field definition"""
    try:
        data = request.get_json()

        required_fields = ['field_key', 'label', 'field_group']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400

        conn = get_templates_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            INSERT INTO template_field_definitions 
            (field_key, label, description, field_type, default_value, field_group, is_required, validation_rules)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (
            data['field_key'],
            data['label'],
            data.get('description', ''),
            data.get('field_type', 'text'),
            data.get('default_value', ''),
            data['field_group'],
            data.get('is_required', False),
            json.dumps(data.get('validation_rules', {}))
        ))

        field_def = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            'success': True,
            'field_definition': dict(field_def)
        }), 201

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@fields_bp.route('/api/fields/groups', methods=['GET'])
def get_field_groups():
    """Get all field groups"""
    try:
        template_type = request.args.get('type', '')

        conn = get_templates_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        query = """
            SELECT * FROM template_field_groups 
            WHERE %s = ANY(template_types) OR template_types = '{}' OR %s = ''
            ORDER BY priority
        """
        cursor.execute(query, (template_type, template_type))

        groups = [dict(row) for row in cursor.fetchall()]
        cursor.close()
        conn.close()

        return jsonify({
            'success': True,
            'template_type': template_type,
            'groups': groups
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@fields_bp.route('/api/fields/groups', methods=['POST'])
def create_field_group():
    """Create new field group"""
    try:
        data = request.get_json()

        required_fields = ['group_key', 'label']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400

        conn = get_templates_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            INSERT INTO template_field_groups 
            (group_key, label, description, priority, template_types)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING *
        """, (
            data['group_key'],
            data['label'],
            data.get('description', ''),
            data.get('priority', 0),
            data.get('template_types', [])
        ))

        group = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            'success': True,
            'field_group': dict(group)
        }), 201

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@fields_bp.route('/api/fields/validate/<int:template_id>', methods=['GET'])
def validate_field_extraction(template_id):
    """Validate the complete field extraction pipeline for a template"""
    try:
        conn = get_templates_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Get template details
        cursor.execute("""
            SELECT id, name, type, layout, html_structure, extracted_fields, field_values, last_extraction_at
            FROM ui_templates 
            WHERE id = %s
        """, (template_id,))

        template = cursor.fetchone()
        if not template:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'error': 'Template not found'
            }), 404

        template_dict = dict(template)
        html_content = template_dict['html_structure'] or ''

        validation_results = {
            'template_info': {
                'id': template_dict['id'],
                'name': template_dict['name'],
                'type': template_dict['type'],
                'layout': template_dict['layout'],
                'has_html': bool(html_content.strip()),
                'html_length': len(html_content),
                'last_extraction_at': template_dict['last_extraction_at'].isoformat() if template_dict[
                    'last_extraction_at'] else None
            },
            'extraction_test': {},
            'field_matching': {},
            'database_state': {},
            'validation_status': 'unknown',
            'issues': [],
            'warnings': []
        }

        # 1. Test HTML parsing and placeholder extraction
        try:
            extracted_placeholders = field_extractor.extract_fields(html_content)
            validation_results['extraction_test'] = {
                'success': True,
                'placeholders_found': len(extracted_placeholders),
                'placeholders': [
                    {
                        'key': p['key'],
                        'full_match': p['full_match'],
                        'context_preview': p['context'][:50] + '...' if len(p['context']) > 50 else p['context']
                    } for p in extracted_placeholders
                ]
            }
        except Exception as e:
            validation_results['extraction_test'] = {
                'success': False,
                'error': str(e)
            }
            validation_results['issues'].append(f"HTML extraction failed: {e}")

        # 2. Test field definition matching
        if validation_results['extraction_test'].get('success'):
            cursor.execute("""
                SELECT fd.*, fg.label as group_label, fg.priority as group_priority
                FROM template_field_definitions fd
                LEFT JOIN template_field_groups fg ON fd.field_group = fg.group_key
                WHERE %s = ANY(fg.template_types) OR fg.template_types = '{}'
                ORDER BY fg.priority, fd.field_key
            """, (template_dict['type'],))

            available_definitions = {row['field_key']: dict(row) for row in cursor.fetchall()}

            matched_fields = []
            custom_fields = []

            for placeholder in extracted_placeholders:
                field_key = placeholder['key']
                if field_key in available_definitions:
                    field_def = available_definitions[field_key]
                    matched_fields.append({
                        'key': field_key,
                        'label': field_def['label'],
                        'group': field_def['field_group'],
                        'group_label': field_def['group_label'],
                        'priority': field_def['group_priority'] or 999,
                        'default_value': field_def['default_value']
                    })
                else:
                    custom_fields.append({
                        'key': field_key,
                        'generated_label': field_key.replace('_', ' ').title(),
                        'context': placeholder['context'][:100]
                    })

            validation_results['field_matching'] = {
                'total_available_definitions': len(available_definitions),
                'matched_fields': len(matched_fields),
                'custom_fields': len(custom_fields),
                'matched_details': matched_fields,
                'custom_details': custom_fields
            }

            if custom_fields:
                validation_results['warnings'].append(f"Found {len(custom_fields)} custom fields not in schema")

        # 3. Check current database state
        current_extracted = template_dict['extracted_fields'] or {}
        current_values = template_dict['field_values'] or {}

        validation_results['database_state'] = {
            'has_extracted_fields': bool(current_extracted),
            'extracted_fields_count': len(current_extracted) if isinstance(current_extracted, (list, dict)) else 0,
            'has_field_values': bool(current_values),
            'field_values_count': len(current_values) if isinstance(current_values, dict) else 0,
            'needs_extraction': not template_dict['last_extraction_at'] or template_dict[
                'last_extraction_at'] < template_dict.get('updated_at', datetime.now())
        }

        # 4. Test complete pipeline by running extraction
        pipeline_test_results = {}
        try:
            # Simulate the full extraction process
            if validation_results['extraction_test'].get('success') and validation_results['field_matching']:
                found_fields = validation_results['field_matching']['matched_details'] + [
                    {
                        'key': cf['key'],
                        'label': cf['generated_label'],
                        'group': 'custom',
                        'is_custom': True
                    } for cf in validation_results['field_matching']['custom_details']
                ]

                field_values = {}
                for field in found_fields:
                    field_values[field['key']] = field.get('default_value', '')

                pipeline_test_results = {
                    'success': True,
                    'would_extract_fields': len(found_fields),
                    'would_create_values': len(field_values),
                    'groups_represented': len(set(f.get('group') for f in found_fields)),
                    'sample_rendering': _test_placeholder_replacement(html_content, field_values)
                }
        except Exception as e:
            pipeline_test_results = {
                'success': False,
                'error': str(e)
            }
            validation_results['issues'].append(f"Pipeline simulation failed: {e}")

        validation_results['pipeline_test'] = pipeline_test_results

        # 5. Overall validation status
        if validation_results['issues']:
            validation_results['validation_status'] = 'failed'
        elif validation_results['warnings']:
            validation_results['validation_status'] = 'warning'
        else:
            validation_results['validation_status'] = 'passed'

        # 6. Recommendations
        recommendations = []
        if not html_content.strip():
            recommendations.append("Template has no HTML content to extract fields from")
        elif validation_results['extraction_test'].get('placeholders_found', 0) == 0:
            recommendations.append("No template placeholders found - add {{variable_name}} syntax to HTML")
        elif validation_results['field_matching'].get('custom_fields', 0) > 0:
            recommendations.append("Consider adding field definitions for custom fields to improve UX")
        elif validation_results['database_state'].get('needs_extraction'):
            recommendations.append("Template has been updated since last extraction - run extraction endpoint")
        else:
            recommendations.append("Template is ready for field extraction")

        validation_results['recommendations'] = recommendations

        cursor.close()
        conn.close()

        return jsonify({
            'success': True,
            'validation': validation_results
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'validation_status': 'error'
        }), 500


def _test_placeholder_replacement(html_content, field_values):
    """Test placeholder replacement with sample values"""
    try:
        sample_html = html_content[:200]  # First 200 chars
        for field_key, value in list(field_values.items())[:3]:  # Test first 3 values
            placeholder = f'{{{{{field_key}}}}}'
            if placeholder in sample_html:
                sample_html = sample_html.replace(placeholder, str(value or f'[{field_key}]'))

        return {
            'success': True,
            'sample': sample_html,
            'tested_replacements': min(3, len(field_values))
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }