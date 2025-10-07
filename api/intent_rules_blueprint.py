from flask import Blueprint, request, jsonify
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
from registry import get_db_instance
import json

intent_rules_api = Blueprint('intent_rules_api', __name__)


def get_interactions_db():
    config = get_db_instance("interactions-db")
    db_config = {
        'host': config['host'],
        'port': config['port'],
        'database': config['database_name'],
        'user': config['username'],
        'password': config['password']
    }
    return psycopg2.connect(**db_config, cursor_factory=RealDictCursor)


def get_workspace_intent_rules(workspace_id: int):
    """
    Get all active intent classification rules for a workspace
    Returns rules with fallback to default rules (workspace_id = 0)
    """
    try:
        with get_interactions_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 
                        id,
                        workspace_id,
                        intent_name, 
                        description,
                        keywords, 
                        phrases, 
                        confidence_weight,
                        version,
                        created_at,
                        updated_at
                    FROM intent_classification_rules 
                    WHERE workspace_id IN (%s, 0) AND is_active = true
                    ORDER BY workspace_id DESC, intent_name
                """, (workspace_id,))

                rules = []
                seen_intents = set()

                for row in cur.fetchall():
                    intent_name = row['intent_name']

                    # Skip if we already have this intent (prioritize workspace-specific)
                    if intent_name in seen_intents:
                        continue
                    seen_intents.add(intent_name)

                    rules.append({
                        'id': row['id'],
                        'workspaceId': row['workspace_id'],
                        'intentName': intent_name,
                        'description': row['description'],
                        'keywords': row['keywords'] or [],
                        'phrases': row['phrases'] or [],
                        'confidenceWeight': float(row['confidence_weight']),
                        'version': row['version'],
                        'isCustom': row['workspace_id'] != 0,
                        'createdAt': row['created_at'].isoformat() + 'Z',
                        'updatedAt': row['updated_at'].isoformat() + 'Z'
                    })

                return rules

    except Exception as e:
        print(f"Error fetching workspace intent rules: {e}")
        return []


def save_intent_rule(workspace_id: int, intent_name: str, description: str,
                     keywords: list, phrases: list, confidence_weight: float,
                     created_by: str = None):
    """
    Save a new or updated intent classification rule
    Deactivates previous version and creates new active version
    """
    try:
        with get_interactions_db() as conn:
            with conn.cursor() as cur:
                # Get the next version number
                cur.execute("""
                    SELECT COALESCE(MAX(version), 0) + 1 as next_version
                    FROM intent_classification_rules 
                    WHERE workspace_id = %s AND intent_name = %s
                """, (workspace_id, intent_name))

                next_version = cur.fetchone()['next_version']

                # Deactivate existing active rule for this intent/workspace
                cur.execute("""
                    UPDATE intent_classification_rules 
                    SET is_active = false 
                    WHERE workspace_id = %s AND intent_name = %s AND is_active = true
                """, (workspace_id, intent_name))

                # Insert new active rule
                cur.execute("""
                    INSERT INTO intent_classification_rules (
                        workspace_id, intent_name, description, keywords, phrases, 
                        confidence_weight, version, is_active, created_by
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, true, %s)
                    RETURNING id, version
                """, (
                    workspace_id, intent_name, description,
                    json.dumps(keywords), json.dumps(phrases),
                    confidence_weight, next_version, created_by
                ))

                result = cur.fetchone()
                return {
                    'id': result['id'],
                    'version': result['version'],
                    'success': True
                }

    except Exception as e:
        print(f"Error saving intent rule: {e}")
        return {'success': False, 'error': str(e)}


@intent_rules_api.route('/api/interactions/intents/rules/<int:workspace_id>', methods=['GET'])
def get_intent_rules(workspace_id):
    """Get all active intent classification rules for a workspace"""
    try:
        rules = get_workspace_intent_rules(workspace_id)
        return jsonify({
            'success': True,
            'rules': rules,
            'workspaceId': workspace_id,
            'count': len(rules)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@intent_rules_api.route('/api/interactions/intents/rules', methods=['POST'])
def save_intent_classification_rule():
    """Save or update an intent classification rule"""
    data = request.get_json() or {}

    # Required fields
    workspace_id = data.get('workspace_id')
    intent_name = data.get('intent_name', '').strip()
    description = data.get('description', '').strip()
    keywords = data.get('keywords', [])
    phrases = data.get('phrases', [])
    confidence_weight = data.get('confidence_weight', 1.0)
    created_by = data.get('created_by', 'user')

    # Validation
    if not workspace_id or not intent_name:
        return jsonify({'error': 'workspace_id and intent_name are required'}), 400

    if not isinstance(keywords, list):
        return jsonify({'error': 'keywords must be an array'}), 400

    if not isinstance(phrases, list):
        return jsonify({'error': 'phrases must be an array'}), 400

    try:
        confidence_weight = float(confidence_weight)
        if confidence_weight <= 0 or confidence_weight > 5.0:
            return jsonify({'error': 'confidence_weight must be between 0.1 and 5.0'}), 400
    except ValueError:
        return jsonify({'error': 'confidence_weight must be a number'}), 400

    # Clean up keywords and phrases
    keywords = [k.strip() for k in keywords if k.strip()]
    phrases = [p.strip() for p in phrases if p.strip()]

    if not keywords and not phrases:
        return jsonify({'error': 'At least one keyword or phrase is required'}), 400

    try:
        result = save_intent_rule(
            workspace_id=workspace_id,
            intent_name=intent_name,
            description=description,
            keywords=keywords,
            phrases=phrases,
            confidence_weight=confidence_weight,
            created_by=created_by
        )

        if result['success']:
            return jsonify({
                'success': True,
                'message': f'Intent rule "{intent_name}" saved successfully',
                'ruleId': result['id'],
                'version': result['version']
            })
        else:
            return jsonify({'error': result.get('error', 'Failed to save rule')}), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@intent_rules_api.route('/api/interactions/intents/rules/<int:workspace_id>/<intent_name>', methods=['DELETE'])
def delete_intent_rule(workspace_id, intent_name):
    """Deactivate (soft delete) an intent classification rule"""
    try:
        with get_interactions_db() as conn:
            with conn.cursor() as cur:
                # Deactivate the rule instead of hard delete
                cur.execute("""
                    UPDATE intent_classification_rules 
                    SET is_active = false, updated_at = NOW()
                    WHERE workspace_id = %s AND intent_name = %s AND is_active = true
                    RETURNING id, version
                """, (workspace_id, intent_name))

                result = cur.fetchone()
                if not result:
                    return jsonify({'error': 'Intent rule not found or already inactive'}), 404

                return jsonify({
                    'success': True,
                    'message': f'Intent rule "{intent_name}" deactivated',
                    'ruleId': result['id'],
                    'version': result['version']
                })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@intent_rules_api.route('/api/interactions/intents/rules/bulk-update', methods=['POST'])
def bulk_update_intent_rules():
    """Update multiple intent rules at once"""
    data = request.get_json() or {}
    workspace_id = data.get('workspace_id')
    rules = data.get('rules', [])

    if not workspace_id or not rules:
        return jsonify({'error': 'workspace_id and rules array required'}), 400

    try:
        updated_rules = []
        errors = []

        for rule_data in rules:
            try:
                result = save_intent_rule(
                    workspace_id=workspace_id,
                    intent_name=rule_data.get('intent_name', '').strip(),
                    description=rule_data.get('description', '').strip(),
                    keywords=rule_data.get('keywords', []),
                    phrases=rule_data.get('phrases', []),
                    confidence_weight=float(rule_data.get('confidence_weight', 1.0)),
                    created_by=rule_data.get('created_by', 'user')
                )

                if result['success']:
                    updated_rules.append({
                        'intentName': rule_data.get('intent_name'),
                        'ruleId': result['id'],
                        'version': result['version']
                    })
                else:
                    errors.append({
                        'intentName': rule_data.get('intent_name'),
                        'error': result.get('error', 'Unknown error')
                    })

            except Exception as e:
                errors.append({
                    'intentName': rule_data.get('intent_name', 'unknown'),
                    'error': str(e)
                })

        return jsonify({
            'success': len(errors) == 0,
            'updatedRules': updated_rules,
            'errors': errors,
            'message': f'Updated {len(updated_rules)} rules, {len(errors)} errors'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@intent_rules_api.route('/api/interactions/intents/rules/validate', methods=['POST'])
def validate_intent_rules():
    """Validate intent rules without saving them"""
    data = request.get_json() or {}
    workspace_id = data.get('workspace_id')
    rules = data.get('rules', [])

    if not workspace_id or not rules:
        return jsonify({'error': 'workspace_id and rules array required'}), 400

    validation_results = []

    for rule in rules:
        intent_name = rule.get('intent_name', '').strip()
        keywords = rule.get('keywords', [])
        phrases = rule.get('phrases', [])
        confidence_weight = rule.get('confidence_weight', 1.0)

        errors = []
        warnings = []

        # Validate intent name
        if not intent_name:
            errors.append('Intent name is required')
        elif len(intent_name) > 50:
            errors.append('Intent name too long (max 50 characters)')

        # Validate keywords and phrases
        if not keywords and not phrases:
            errors.append('At least one keyword or phrase is required')

        # Check for empty keywords/phrases
        empty_keywords = [k for k in keywords if not k.strip()]
        empty_phrases = [p for p in phrases if not p.strip()]

        if empty_keywords:
            warnings.append(f'{len(empty_keywords)} empty keywords will be removed')

        if empty_phrases:
            warnings.append(f'{len(empty_phrases)} empty phrases will be removed')

        # Validate confidence weight
        try:
            weight = float(confidence_weight)
            if weight <= 0 or weight > 5.0:
                errors.append('Confidence weight must be between 0.1 and 5.0')
        except ValueError:
            errors.append('Confidence weight must be a number')

        # Check for duplicates within the rule
        clean_keywords = [k.strip().lower() for k in keywords if k.strip()]
        clean_phrases = [p.strip().lower() for p in phrases if p.strip()]

        if len(clean_keywords) != len(set(clean_keywords)):
            warnings.append('Duplicate keywords detected')

        if len(clean_phrases) != len(set(clean_phrases)):
            warnings.append('Duplicate phrases detected')

        validation_results.append({
            'intentName': intent_name,
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings,
            'cleanKeywords': [k.strip() for k in keywords if k.strip()],
            'cleanPhrases': [p.strip() for p in phrases if p.strip()]
        })

    return jsonify({
        'success': True,
        'results': validation_results,
        'overallValid': all(r['valid'] for r in validation_results)
    })


@intent_rules_api.route('/api/interactions/intents/rules/export/<int:workspace_id>', methods=['GET'])
def export_intent_rules(workspace_id):
    """Export intent rules for backup or sharing"""
    try:
        rules = get_workspace_intent_rules(workspace_id)

        # Format for export
        export_data = {
            'workspaceId': workspace_id,
            'exportedAt': datetime.now().isoformat() + 'Z',
            'version': '1.0',
            'rules': []
        }

        for rule in rules:
            export_data['rules'].append({
                'intentName': rule['intentName'],
                'description': rule['description'],
                'keywords': rule['keywords'],
                'phrases': rule['phrases'],
                'confidenceWeight': rule['confidenceWeight'],
                'isCustom': rule['isCustom']
            })

        return jsonify(export_data)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@intent_rules_api.route('/api/interactions/intents/rules/import/<int:workspace_id>', methods=['POST'])
def import_intent_rules(workspace_id):
    """Import intent rules from backup"""
    data = request.get_json() or {}

    if 'rules' not in data:
        return jsonify({'error': 'No rules found in import data'}), 400

    rules = data['rules']
    created_by = data.get('created_by', 'import')

    try:
        imported_rules = []
        errors = []

        for rule in rules:
            try:
                result = save_intent_rule(
                    workspace_id=workspace_id,
                    intent_name=rule.get('intentName', ''),
                    description=rule.get('description', ''),
                    keywords=rule.get('keywords', []),
                    phrases=rule.get('phrases', []),
                    confidence_weight=rule.get('confidenceWeight', 1.0),
                    created_by=created_by
                )

                if result['success']:
                    imported_rules.append(rule.get('intentName'))
                else:
                    errors.append({
                        'intentName': rule.get('intentName'),
                        'error': result.get('error')
                    })

            except Exception as e:
                errors.append({
                    'intentName': rule.get('intentName', 'unknown'),
                    'error': str(e)
                })

        return jsonify({
            'success': len(errors) == 0,
            'imported': imported_rules,
            'errors': errors,
            'message': f'Imported {len(imported_rules)} rules, {len(errors)} errors'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500