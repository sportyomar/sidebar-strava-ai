from flask import Blueprint, request, jsonify
import psycopg2
from psycopg2.extras import RealDictCursor
from registry import get_db_instance
from typing import List, Dict, Tuple, Set
import json

intent_overlap_api = Blueprint('intent_overlap_api', __name__)


def get_interactions_db():
    """Reuse database connection logic"""
    config = get_db_instance("interactions-db")
    db_config = {
        'host': config['host'],
        'port': config['port'],
        'database': config['database_name'],
        'user': config['username'],
        'password': config['password']
    }
    return psycopg2.connect(**db_config, cursor_factory=RealDictCursor)


def calculate_keyword_overlap(keywords1: List[str], keywords2: List[str]) -> Dict:
    """Calculate overlap between two keyword lists with exact matching"""
    set1 = {k.lower().strip() for k in keywords1}
    set2 = {k.lower().strip() for k in keywords2}

    shared = set1.intersection(set2)
    total_unique = set1.union(set2)

    overlap_percentage = (len(shared) / len(total_unique)) * 100 if total_unique else 0

    return {
        'shared_keywords': list(shared),
        'overlap_percentage': round(overlap_percentage, 1),
        'shared_count': len(shared),
        'total_unique': len(total_unique)
    }


def calculate_phrase_overlap(phrases1: List[str], phrases2: List[str]) -> Dict:
    """Calculate overlap between phrase lists using substring detection"""
    phrases1_clean = [p.lower().strip() for p in phrases1]
    phrases2_clean = [p.lower().strip() for p in phrases2]

    shared_phrases = []

    # Check for exact matches first
    set1 = set(phrases1_clean)
    set2 = set(phrases2_clean)
    exact_matches = set1.intersection(set2)
    shared_phrases.extend(list(exact_matches))

    # Check for substring matches (phrase contains another phrase)
    for p1 in phrases1_clean:
        for p2 in phrases2_clean:
            if p1 != p2:  # Skip exact matches already found
                if p1 in p2 or p2 in p1:
                    # Store the longer phrase as the match
                    longer_phrase = p1 if len(p1) > len(p2) else p2
                    if longer_phrase not in shared_phrases:
                        shared_phrases.append(longer_phrase)

    all_phrases = set(phrases1_clean + phrases2_clean)
    overlap_percentage = (len(shared_phrases) / len(all_phrases)) * 100 if all_phrases else 0

    return {
        'shared_phrases': shared_phrases,
        'overlap_percentage': round(overlap_percentage, 1),
        'shared_count': len(shared_phrases),
        'total_unique': len(all_phrases)
    }


def classify_overlap_severity(overlap_percentage: float, shared_count: int) -> Dict:
    """Classify overlap severity and provide recommendations"""
    if overlap_percentage >= 50 or shared_count >= 5:
        return {
            'severity': 'high',
            'color': 'red',
            'message': 'High overlap - likely to cause misclassification',
            'recommendation': 'Consider using more specific keywords or merging these intents'
        }
    elif overlap_percentage >= 25 or shared_count >= 3:
        return {
            'severity': 'moderate',
            'color': 'orange',
            'message': 'Moderate overlap - review recommended',
            'recommendation': 'Add more distinctive keywords or adjust confidence weights'
        }
    elif overlap_percentage >= 10 or shared_count >= 1:
        return {
            'severity': 'low',
            'color': 'yellow',
            'message': 'Low overlap - monitor for conflicts',
            'recommendation': 'Consider if shared terms are truly appropriate for both intents'
        }
    else:
        return {
            'severity': 'none',
            'color': 'green',
            'message': 'No significant overlap detected',
            'recommendation': None
        }


def get_workspace_rules(workspace_id: int) -> List[Dict]:
    """Get all active intent rules for a workspace with fallback to defaults"""
    try:
        with get_interactions_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 
                        intent_name, 
                        keywords, 
                        phrases, 
                        confidence_weight,
                        workspace_id,
                        description
                    FROM intent_classification_rules 
                    WHERE workspace_id IN (%s, 0) AND is_active = true
                    ORDER BY workspace_id DESC, intent_name
                """, (workspace_id,))

                rules = []
                seen_intents = set()

                for row in cur.fetchall():
                    intent_name = row['intent_name']

                    # Skip duplicates (prioritize workspace-specific rules)
                    if intent_name in seen_intents:
                        continue
                    seen_intents.add(intent_name)

                    rules.append({
                        'intent_name': intent_name,
                        'keywords': row['keywords'] or [],
                        'phrases': row['phrases'] or [],
                        'confidence_weight': float(row['confidence_weight']),
                        'workspace_id': row['workspace_id'],
                        'description': row['description'],
                        'is_custom': row['workspace_id'] != 0
                    })

                return rules

    except Exception as e:
        print(f"Error fetching workspace rules: {e}")
        return []


def analyze_workspace_conflicts(workspace_id: int) -> Dict:
    """Generate full conflict matrix for all intents in a workspace"""
    rules = get_workspace_rules(workspace_id)

    if len(rules) < 2:
        return {
            'conflicts': [],
            'summary': {
                'total_intents': len(rules),
                'total_conflicts': 0,
                'high_severity': 0,
                'moderate_severity': 0,
                'low_severity': 0
            },
            'most_problematic_terms': []
        }

    conflicts = []
    severity_counts = {'high': 0, 'moderate': 0, 'low': 0}
    term_frequency = {}  # Track how often each term appears across intents

    # Build term frequency map
    for rule in rules:
        for keyword in rule['keywords']:
            term = keyword.lower().strip()
            if term not in term_frequency:
                term_frequency[term] = []
            term_frequency[term].append(rule['intent_name'])

        for phrase in rule['phrases']:
            term = phrase.lower().strip()
            if term not in term_frequency:
                term_frequency[term] = []
            term_frequency[term].append(rule['intent_name'])

    # Analyze all pairs of intents
    for i in range(len(rules)):
        for j in range(i + 1, len(rules)):
            rule1 = rules[i]
            rule2 = rules[j]

            keyword_analysis = calculate_keyword_overlap(rule1['keywords'], rule2['keywords'])
            phrase_analysis = calculate_phrase_overlap(rule1['phrases'], rule2['phrases'])

            # Calculate combined overlap
            total_shared = keyword_analysis['shared_count'] + phrase_analysis['shared_count']
            total_unique = keyword_analysis['total_unique'] + phrase_analysis['total_unique']
            combined_overlap = (total_shared / total_unique) * 100 if total_unique > 0 else 0

            if total_shared > 0:  # Only include conflicts with actual overlap
                severity_info = classify_overlap_severity(combined_overlap, total_shared)
                severity_counts[severity_info['severity']] += 1

                conflicts.append({
                    'intent1': rule1['intent_name'],
                    'intent2': rule2['intent_name'],
                    'intent1_is_custom': rule1['is_custom'],
                    'intent2_is_custom': rule2['is_custom'],
                    'keyword_overlap': keyword_analysis,
                    'phrase_overlap': phrase_analysis,
                    'combined_overlap_percentage': round(combined_overlap, 1),
                    'total_shared_terms': total_shared,
                    'severity': severity_info['severity'],
                    'severity_info': severity_info,
                    'impact_score': combined_overlap * (rule1['confidence_weight'] + rule2['confidence_weight']) / 2
                })

    # Find most problematic terms (appear in 3+ intents)
    problematic_terms = [
        {
            'term': term,
            'appears_in_intents': intents,
            'frequency': len(intents)
        }
        for term, intents in term_frequency.items()
        if len(intents) >= 3
    ]
    problematic_terms.sort(key=lambda x: x['frequency'], reverse=True)

    return {
        'conflicts': sorted(conflicts, key=lambda x: x['impact_score'], reverse=True),
        'summary': {
            'total_intents': len(rules),
            'total_conflicts': len(conflicts),
            'high_severity': severity_counts['high'],
            'moderate_severity': severity_counts['moderate'],
            'low_severity': severity_counts['low']
        },
        'most_problematic_terms': problematic_terms[:10]  # Top 10 most shared terms
    }


def check_rule_conflicts(new_rule: Dict, workspace_id: int) -> Dict:
    """Check a new/updated rule against existing rules for conflicts"""
    existing_rules = get_workspace_rules(workspace_id)

    # Filter out the rule being updated (if it exists)
    if 'intent_name' in new_rule:
        existing_rules = [r for r in existing_rules if r['intent_name'] != new_rule['intent_name']]

    conflicts = []
    warnings = []

    new_keywords = new_rule.get('keywords', [])
    new_phrases = new_rule.get('phrases', [])
    new_intent_name = new_rule.get('intent_name', 'Unnamed Intent')

    for existing_rule in existing_rules:
        keyword_analysis = calculate_keyword_overlap(new_keywords, existing_rule['keywords'])
        phrase_analysis = calculate_phrase_overlap(new_phrases, existing_rule['phrases'])

        total_shared = keyword_analysis['shared_count'] + phrase_analysis['shared_count']
        total_unique = keyword_analysis['total_unique'] + phrase_analysis['total_unique']
        combined_overlap = (total_shared / total_unique) * 100 if total_unique > 0 else 0

        if total_shared > 0:
            severity_info = classify_overlap_severity(combined_overlap, total_shared)

            conflict_info = {
                'conflicting_intent': existing_rule['intent_name'],
                'conflicting_intent_is_custom': existing_rule['is_custom'],
                'shared_keywords': keyword_analysis['shared_keywords'],
                'shared_phrases': phrase_analysis['shared_phrases'],
                'overlap_percentage': round(combined_overlap, 1),
                'severity': severity_info['severity'],
                'message': severity_info['message'],
                'recommendation': severity_info['recommendation']
            }

            if severity_info['severity'] == 'high':
                conflicts.append(conflict_info)
            else:
                warnings.append(conflict_info)

    # Check for extremely generic terms
    generic_terms = {'help', 'please', 'can', 'how', 'what', 'the', 'and', 'or', 'with', 'for'}
    generic_keywords = [k for k in new_keywords if k.lower().strip() in generic_terms]
    generic_phrases_found = [p for p in new_phrases if any(term in p.lower() for term in generic_terms)]

    if generic_keywords or generic_phrases_found:
        warnings.append({
            'type': 'generic_terms',
            'message': 'Generic terms detected - may cause broad matching',
            'generic_keywords': generic_keywords,
            'generic_phrases': generic_phrases_found,
            'recommendation': 'Consider using more specific terminology'
        })

    return {
        'intent_name': new_intent_name,
        'has_conflicts': len(conflicts) > 0,
        'has_warnings': len(warnings) > 0,
        'conflicts': conflicts,
        'warnings': warnings,
        'recommendation': 'Fix high-severity conflicts before saving' if conflicts else 'Review warnings and save when ready'
    }


@intent_overlap_api.route('/api/intents/conflicts/<int:workspace_id>', methods=['GET'])
def get_workspace_conflicts(workspace_id):
    """Get full conflict matrix for a workspace"""
    try:
        analysis = analyze_workspace_conflicts(workspace_id)

        return jsonify({
            'success': True,
            'workspace_id': workspace_id,
            'analysis': analysis,
            'generated_at': json.dumps(
                {'$date': {'$numberLong': str(int(psycopg2.Timestamp.now().timestamp() * 1000))}}),
            'recommendations': {
                'immediate_action_needed': analysis['summary']['high_severity'] > 0,
                'review_recommended': analysis['summary']['moderate_severity'] > 0,
                'total_issues': analysis['summary']['total_conflicts']
            }
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@intent_overlap_api.route('/api/intents/conflicts/validate', methods=['POST'])
def validate_rule_conflicts():
    """Validate a new or updated intent rule for conflicts"""
    data = request.get_json() or {}

    workspace_id = data.get('workspace_id')
    new_rule = data.get('rule', {})

    if not workspace_id:
        return jsonify({'error': 'workspace_id is required'}), 400

    if not new_rule.get('intent_name'):
        return jsonify({'error': 'rule.intent_name is required'}), 400

    try:
        validation_result = check_rule_conflicts(new_rule, workspace_id)

        return jsonify({
            'success': True,
            'validation': validation_result,
            'can_save': not validation_result['has_conflicts'],
            'should_review': validation_result['has_warnings']
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@intent_overlap_api.route('/api/intents/conflicts/terms/<int:workspace_id>', methods=['GET'])
def get_problematic_terms(workspace_id):
    """Get analysis of shared terms across intents"""
    try:
        rules = get_workspace_rules(workspace_id)
        term_analysis = {}

        # Analyze keyword distribution
        for rule in rules:
            for keyword in rule['keywords']:
                term = keyword.lower().strip()
                if term not in term_analysis:
                    term_analysis[term] = {
                        'term': term,
                        'type': 'keyword',
                        'appears_in': [],
                        'total_frequency': 0
                    }
                term_analysis[term]['appears_in'].append({
                    'intent': rule['intent_name'],
                    'confidence_weight': rule['confidence_weight'],
                    'is_custom': rule['is_custom']
                })
                term_analysis[term]['total_frequency'] += 1

        # Analyze phrase distribution
        for rule in rules:
            for phrase in rule['phrases']:
                term = phrase.lower().strip()
                if term not in term_analysis:
                    term_analysis[term] = {
                        'term': term,
                        'type': 'phrase',
                        'appears_in': [],
                        'total_frequency': 0
                    }
                term_analysis[term]['appears_in'].append({
                    'intent': rule['intent_name'],
                    'confidence_weight': rule['confidence_weight'],
                    'is_custom': rule['is_custom']
                })
                term_analysis[term]['total_frequency'] += 1

        # Filter and sort problematic terms
        problematic = []
        for term_data in term_analysis.values():
            if len(term_data['appears_in']) >= 2:  # Appears in 2+ intents
                term_data['conflict_level'] = (
                    'high' if len(term_data['appears_in']) >= 4 else
                    'moderate' if len(term_data['appears_in']) >= 3 else
                    'low'
                )
                problematic.append(term_data)

        # Sort by frequency and conflict level
        problematic.sort(key=lambda x: (len(x['appears_in']), x['total_frequency']), reverse=True)

        return jsonify({
            'success': True,
            'workspace_id': workspace_id,
            'total_terms_analyzed': len(term_analysis),
            'problematic_terms': problematic,
            'summary': {
                'high_conflict': len([t for t in problematic if t['conflict_level'] == 'high']),
                'moderate_conflict': len([t for t in problematic if t['conflict_level'] == 'moderate']),
                'low_conflict': len([t for t in problematic if t['conflict_level'] == 'low'])
            }
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@intent_overlap_api.route('/api/intents/conflicts/simulate', methods=['POST'])
def simulate_rule_changes():
    """Simulate the impact of proposed rule changes"""
    data = request.get_json() or {}

    workspace_id = data.get('workspace_id')
    proposed_changes = data.get('changes', [])  # List of rule changes

    if not workspace_id:
        return jsonify({'error': 'workspace_id is required'}), 400

    try:
        # Get current state
        current_analysis = analyze_workspace_conflicts(workspace_id)
        current_conflicts = len(current_analysis['conflicts'])

        # Create temporary rule set with proposed changes
        current_rules = get_workspace_rules(workspace_id)
        modified_rules = current_rules.copy()

        for change in proposed_changes:
            action = change.get('action')  # 'add', 'update', 'delete'
            rule_data = change.get('rule', {})
            intent_name = rule_data.get('intent_name')

            if action == 'add':
                modified_rules.append(rule_data)
            elif action == 'update' and intent_name:
                # Find and replace existing rule
                for i, rule in enumerate(modified_rules):
                    if rule['intent_name'] == intent_name:
                        modified_rules[i] = {**rule, **rule_data}
                        break
            elif action == 'delete' and intent_name:
                modified_rules = [r for r in modified_rules if r['intent_name'] != intent_name]

        # Simulate conflicts with modified rules
        # Note: This is a simplified simulation - we'd need to modify analyze_workspace_conflicts
        # to accept a rules list instead of fetching from DB

        simulation_results = []
        for change in proposed_changes:
            rule_data = change.get('rule', {})
            validation = check_rule_conflicts(rule_data, workspace_id)
            simulation_results.append({
                'action': change.get('action'),
                'intent_name': rule_data.get('intent_name'),
                'validation': validation
            })

        return jsonify({
            'success': True,
            'workspace_id': workspace_id,
            'current_conflicts': current_conflicts,
            'proposed_changes': len(proposed_changes),
            'simulation_results': simulation_results,
            'overall_impact': {
                'new_conflicts': sum(1 for r in simulation_results if r['validation']['has_conflicts']),
                'new_warnings': sum(1 for r in simulation_results if r['validation']['has_warnings']),
                'recommendation': 'Review all high-severity conflicts before applying changes'
            }
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@intent_overlap_api.route('/api/intents/conflicts/health/<int:workspace_id>', methods=['GET'])
def get_workspace_health(workspace_id):
    """Get overall workspace health score based on intent conflicts"""
    try:
        analysis = analyze_workspace_conflicts(workspace_id)
        rules = get_workspace_rules(workspace_id)

        total_intents = len(rules)
        total_conflicts = analysis['summary']['total_conflicts']
        high_severity = analysis['summary']['high_severity']
        moderate_severity = analysis['summary']['moderate_severity']

        # Calculate health score (0-100)
        if total_intents == 0:
            health_score = 100
        else:
            # Penalty system: high conflicts = -20 points, moderate = -10, low = -5
            penalty = (high_severity * 20) + (moderate_severity * 10) + (analysis['summary']['low_severity'] * 5)
            max_possible_conflicts = (total_intents * (total_intents - 1)) / 2  # n choose 2
            normalized_penalty = min(penalty, 100)  # Cap at 100
            health_score = max(0, 100 - normalized_penalty)

        # Determine health status
        if health_score >= 85:
            status = "Excellent"
            status_color = "green"
            message = "Intent classification setup is well-configured with minimal conflicts."
        elif health_score >= 70:
            status = "Good"
            status_color = "blue"
            message = "Some minor conflicts exist but overall configuration is solid."
        elif health_score >= 50:
            status = "Fair"
            status_color = "orange"
            message = "Moderate conflicts detected. Review and optimization recommended."
        else:
            status = "Poor"
            status_color = "red"
            message = "Significant conflicts detected. Immediate attention required."

        return jsonify({
            'success': True,
            'workspace_id': workspace_id,
            'health_score': round(health_score, 1),
            'status': status,
            'status_color': status_color,
            'message': message,
            'metrics': {
                'total_intents': total_intents,
                'total_conflicts': total_conflicts,
                'conflict_rate': round((total_conflicts / max(total_intents, 1)) * 100, 1),
                'high_severity_conflicts': high_severity,
                'moderate_severity_conflicts': moderate_severity
            },
            'recommendations': [
                "Review high-severity conflicts immediately" if high_severity > 0 else None,
                "Consider consolidating similar intents" if moderate_severity > 3 else None,
                "Add more specific keywords to reduce overlap" if total_conflicts > total_intents else None,
                "Your configuration looks good!" if health_score >= 85 else None
            ]
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500