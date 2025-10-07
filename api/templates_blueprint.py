# api/templates_blueprint.py
from flask import Blueprint, jsonify, request, g
import psycopg2
from psycopg2.extras import RealDictCursor
from registry import get_templates_db

templates_bp = Blueprint('templates', __name__)


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






@templates_bp.route('/api/templates/<template_type>/<layout>', methods=['GET'])
def get_specific_template(template_type, layout):
    """Get specific template by type and layout"""
    try:
        conn = get_templates_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT id, name, type, layout, config, html_structure, css_overrides, created_at 
            FROM ui_templates 
            WHERE type = %s AND layout = %s
            ORDER BY created_at DESC
            LIMIT 1
        """, (template_type, layout))

        template = cursor.fetchone()
        cursor.close()
        conn.close()

        if template:
            return jsonify({
                'success': True,
                'template': dict(template)
            })
        else:
            return jsonify({
                'success': False,
                'error': f'Template not found: {template_type}/{layout}'
            }), 404

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500




@templates_bp.route('/api/templates/<int:template_id>', methods=['PUT'])
def update_template(template_id):
    """Update existing template"""
    try:
        data = request.get_json()

        conn = get_templates_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Build dynamic update query
        update_fields = []
        update_values = []

        allowed_fields = ['name', 'type', 'layout', 'config', 'html_structure', 'css_overrides']
        for field in allowed_fields:
            if field in data:
                update_fields.append(f"{field} = %s")
                update_values.append(data[field])

        if not update_fields:
            return jsonify({
                'success': False,
                'error': 'No valid fields to update'
            }), 400

        update_values.append(template_id)

        cursor.execute(f"""
            UPDATE ui_templates 
            SET {', '.join(update_fields)}
            WHERE id = %s
            RETURNING id, name, type, layout, config, created_at, is_active
        """, update_values)

        template = cursor.fetchone()

        if template:
            conn.commit()
            cursor.close()
            conn.close()

            return jsonify({
                'success': True,
                'template': dict(template)
            })
        else:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'error': 'Template not found'
            }), 404

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@templates_bp.route('/api/templates/<int:template_id>', methods=['DELETE'])
def delete_template(template_id):
    """Delete template"""
    try:
        conn = get_templates_connection()
        cursor = conn.cursor()

        cursor.execute("DELETE FROM ui_templates WHERE id = %s", (template_id,))

        if cursor.rowcount > 0:
            conn.commit()
            cursor.close()
            conn.close()

            return jsonify({
                'success': True,
                'message': 'Template deleted successfully'
            })
        else:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'error': 'Template not found'
            }), 404

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# api/templates_blueprint.py - ADD these endpoints to your existing file

@templates_bp.route('/api/templates/<int:template_id>/set-active', methods=['POST'])
def set_active_template(template_id):
    """Set a template as the active template for its type"""
    try:
        conn = get_templates_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # First, get the template to check if it exists and get its type
        cursor.execute("SELECT id, type FROM ui_templates WHERE id = %s", (template_id,))
        template = cursor.fetchone()

        if not template:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'error': 'Template not found'
            }), 404

        template_type = template['type']

        # Deactivate all templates of the same type
        cursor.execute("""
            UPDATE ui_templates 
            SET is_active = FALSE 
            WHERE type = %s
        """, (template_type,))

        # Activate the selected template
        cursor.execute("""
            UPDATE ui_templates 
            SET is_active = TRUE 
            WHERE id = %s
            RETURNING id, name, type, layout, is_active
        """, (template_id,))

        updated_template = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            'success': True,
            'message': f'Template set as active for {template_type}',
            'template': dict(updated_template)
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@templates_bp.route('/api/templates/active/<template_type>', methods=['GET'])
def get_active_template(template_type):
    """Get the active template for a specific type"""
    try:
        conn = get_templates_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT id, name, type, layout, config, html_structure, css_overrides, created_at, is_active
            FROM ui_templates 
            WHERE type = %s AND is_active = TRUE
            LIMIT 1
        """, (template_type,))

        template = cursor.fetchone()
        cursor.close()
        conn.close()

        if template:
            return jsonify({
                'success': True,
                'template': dict(template)
            })
        else:
            return jsonify({
                'success': False,
                'error': f'No active template found for type: {template_type}'
            }), 404

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# UPDATE these existing endpoints to include is_active field:

# REPLACE the get_all_templates function with this:
@templates_bp.route('/api/templates', methods=['GET'])
def get_all_templates():
    """Get all templates"""
    try:
        conn = get_templates_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT id, name, type, layout, config, html_structure, css_overrides, created_at, is_active
            FROM ui_templates 
            ORDER BY type, is_active DESC, created_at DESC
        """)

        templates = cursor.fetchall()
        cursor.close()
        conn.close()

        return jsonify({
            'success': True,
            'templates': [dict(template) for template in templates]
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# REPLACE the get_templates_by_type function with this:
@templates_bp.route('/api/templates/<template_type>', methods=['GET'])
def get_templates_by_type(template_type):
    """Get templates by type (login, dashboard, etc)"""
    try:
        conn = get_templates_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT id, name, type, layout, config, html_structure, css_overrides, created_at, is_active
            FROM ui_templates 
            WHERE type = %s 
            ORDER BY is_active DESC, created_at DESC
        """, (template_type,))

        templates = cursor.fetchall()
        cursor.close()
        conn.close()

        return jsonify({
            'success': True,
            'type': template_type,
            'templates': [dict(template) for template in templates]
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# REPLACE the create_template function with this:
@templates_bp.route('/api/templates', methods=['POST'])
def create_template():
    """Create new template"""
    try:
        data = request.get_json()

        required_fields = ['name', 'type', 'layout']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400

        conn = get_templates_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Check if this should be set as active (if no active template exists for this type)
        cursor.execute("""
            SELECT COUNT(*) as count FROM ui_templates 
            WHERE type = %s AND is_active = TRUE
        """, (data['type'],))

        active_count = cursor.fetchone()['count']
        is_active = active_count == 0  # Set as active if no active template exists

        cursor.execute("""
            INSERT INTO ui_templates (name, type, layout, config, html_structure, css_overrides, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, name, type, layout, config, created_at, is_active
        """, (
            data['name'],
            data['type'],
            data['layout'],
            data.get('config', {}),
            data.get('html_structure'),
            data.get('css_overrides'),
            is_active
        ))

        template = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            'success': True,
            'template': dict(template)
        }), 201

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500