from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor
from registry import get_db_instance
import json

interactions_api = Blueprint('interactions_api', __name__)


def get_interactions_db():
    config = get_db_instance("interactions-db")
    # Fix the key name for psycopg2
    db_config = {
        'host': config['host'],
        'port': config['port'],
        'database': config['database_name'],  # psycopg2 uses 'database', not 'database_name'
        'user': config['username'],
        'password': config['password']
    }
    return psycopg2.connect(**db_config, cursor_factory=RealDictCursor)

def log_interaction(workspace_id, user_id, thread_id, prompt, response, model,
                    intent=None, latency_ms=None, tokens_used=None,
                    context_items_count=0, metadata=None):
    """Log an interaction to the interactions database"""
    try:
        with get_interactions_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO interactions (
                        workspace_id, user_id, thread_id, prompt, response, 
                        model, intent, latency_ms, tokens_used, context_items_count,
                        metadata, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                    RETURNING id
                """, (
                    workspace_id, user_id, thread_id, prompt, response,
                    model, intent, latency_ms, tokens_used, context_items_count,
                    json.dumps(metadata or {})
                ))

                interaction_id = cur.fetchone()['id']
                print(f"Logged interaction {interaction_id} for user {user_id}")
                return interaction_id
    except Exception as e:
        print(f"Failed to log interaction: {e}")
        return None


@interactions_api.route('/api/interactions/recent/<int:workspace_id>/<user_id>', methods=['GET'])
def get_recent_interactions(workspace_id, user_id):
    """Get recent interactions for a user - like a transaction history"""
    limit = request.args.get('limit', 10, type=int)

    try:
        with get_interactions_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 
                        id,
                        prompt,
                        LEFT(response, 200) as response_preview,
                        model,
                        intent,
                        latency_ms,
                        tokens_used,
                        quality_score,
                        user_feedback,
                        created_at
                    FROM interactions 
                    WHERE workspace_id = %s AND user_id = %s
                    ORDER BY created_at DESC
                    LIMIT %s
                """, (workspace_id, user_id, limit))

                interactions = []
                for row in cur.fetchall():
                    interactions.append({
                        'id': str(row['id']),
                        'prompt': row['prompt'],
                        'responsePreview': row['response_preview'] + '...' if len(row['response_preview']) == 200 else
                        row['response_preview'],
                        'model': row['model'],
                        'intent': row['intent'],
                        'latencyMs': row['latency_ms'],
                        'tokensUsed': row['tokens_used'],
                        'qualityScore': row['quality_score'],
                        'userFeedback': row['user_feedback'],
                        'timestamp': row['created_at'].isoformat() + 'Z'
                    })

                return jsonify({
                    'interactions': interactions,
                    'total': len(interactions)
                })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@interactions_api.route('/api/interactions/<interaction_id>', methods=['GET'])
def get_interaction_details(interaction_id):
    """Get full details of a specific interaction"""
    try:
        with get_interactions_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT * FROM interactions WHERE id = %s
                """, (interaction_id,))

                row = cur.fetchone()
                if not row:
                    return jsonify({'error': 'Interaction not found'}), 404

                interaction = {
                    'id': str(row['id']),
                    'workspaceId': row['workspace_id'],
                    'userId': row['user_id'],
                    'threadId': str(row['thread_id']) if row['thread_id'] else None,
                    'prompt': row['prompt'],
                    'response': row['response'],
                    'model': row['model'],
                    'intent': row['intent'],
                    'latencyMs': row['latency_ms'],
                    'tokensUsed': row['tokens_used'],
                    'contextItemsCount': row['context_items_count'],
                    'qualityScore': row['quality_score'],
                    'userFeedback': row['user_feedback'],
                    'metadata': row['metadata'],
                    'timestamp': row['created_at'].isoformat() + 'Z'
                }

                return jsonify(interaction)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@interactions_api.route('/api/interactions/<interaction_id>/feedback', methods=['POST'])
def submit_feedback(interaction_id):
    """Submit user feedback on an interaction - like reporting fraud"""
    data = request.get_json() or {}
    feedback = data.get('feedback')  # 'good', 'bad', 'hallucination', 'irrelevant'
    quality_score = data.get('qualityScore')  # 1-5 rating

    if feedback not in ['good', 'bad', 'hallucination', 'irrelevant', None]:
        return jsonify({'error': 'Invalid feedback type'}), 400

    try:
        with get_interactions_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE interactions 
                    SET user_feedback = %s, quality_score = %s, updated_at = NOW()
                    WHERE id = %s
                    RETURNING id
                """, (feedback, quality_score, interaction_id))

                if not cur.fetchone():
                    return jsonify({'error': 'Interaction not found'}), 404

                return jsonify({'success': True, 'message': 'Feedback recorded'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@interactions_api.route('/api/interactions/analytics/<int:workspace_id>/<user_id>', methods=['GET'])
def get_interaction_analytics(workspace_id, user_id):
    """Get analytics on user interactions - performance by model, intent, etc."""
    days = request.args.get('days', 30, type=int)
    since_date = datetime.now() - timedelta(days=days)

    try:
        with get_interactions_db() as conn:
            with conn.cursor() as cur:
                # Model performance
                cur.execute("""
                    SELECT 
                        model,
                        COUNT(*) as total_interactions,
                        AVG(latency_ms) as avg_latency,
                        AVG(tokens_used) as avg_tokens,
                        AVG(quality_score) as avg_quality,
                        COUNT(CASE WHEN user_feedback = 'good' THEN 1 END) as positive_feedback,
                        COUNT(CASE WHEN user_feedback IN ('bad', 'hallucination') THEN 1 END) as negative_feedback
                    FROM interactions 
                    WHERE workspace_id = %s AND user_id = %s AND created_at >= %s
                    GROUP BY model
                    ORDER BY total_interactions DESC
                """, (workspace_id, user_id, since_date))

                model_stats = []
                for row in cur.fetchall():
                    model_stats.append({
                        'model': row['model'],
                        'totalInteractions': row['total_interactions'],
                        'avgLatencyMs': round(row['avg_latency'] or 0, 1),
                        'avgTokens': round(row['avg_tokens'] or 0, 1),
                        'avgQuality': round(row['avg_quality'] or 0, 2),
                        'positiveFeedback': row['positive_feedback'],
                        'negativeFeedback': row['negative_feedback']
                    })

                # Intent performance
                cur.execute("""
                    SELECT 
                        intent,
                        COUNT(*) as total_interactions,
                        AVG(quality_score) as avg_quality,
                        COUNT(CASE WHEN user_feedback IN ('bad', 'hallucination') THEN 1 END) as problems
                    FROM interactions 
                    WHERE workspace_id = %s AND user_id = %s AND created_at >= %s AND intent IS NOT NULL
                    GROUP BY intent
                    ORDER BY total_interactions DESC
                """, (workspace_id, user_id, since_date))

                intent_stats = []
                for row in cur.fetchall():
                    intent_stats.append({
                        'intent': row['intent'],
                        'totalInteractions': row['total_interactions'],
                        'avgQuality': round(row['avg_quality'] or 0, 2),
                        'problemRate': round((row['problems'] / row['total_interactions']) * 100, 1)
                    })

                # Recent problems
                cur.execute("""
                    SELECT 
                        id,
                        prompt,
                        model,
                        user_feedback,
                        created_at
                    FROM interactions 
                    WHERE workspace_id = %s AND user_id = %s 
                        AND user_feedback IN ('bad', 'hallucination', 'irrelevant')
                        AND created_at >= %s
                    ORDER BY created_at DESC
                    LIMIT 10
                """, (workspace_id, user_id, since_date))

                recent_problems = []
                for row in cur.fetchall():
                    recent_problems.append({
                        'id': str(row['id']),
                        'prompt': row['prompt'][:100] + '...' if len(row['prompt']) > 100 else row['prompt'],
                        'model': row['model'],
                        'feedback': row['user_feedback'],
                        'timestamp': row['created_at'].isoformat() + 'Z'
                    })

                return jsonify({
                    'modelStats': model_stats,
                    'intentStats': intent_stats,
                    'recentProblems': recent_problems,
                    'period': f'{days} days'
                })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@interactions_api.route('/api/interactions/debug/<int:workspace_id>/<user_id>', methods=['GET'])
def debug_interactions(workspace_id, user_id):
    """Debug endpoint to see what's being captured"""
    try:
        with get_interactions_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT COUNT(*) as total FROM interactions 
                    WHERE workspace_id = %s AND user_id = %s
                """, (workspace_id, user_id))

                total = cur.fetchone()['total']

                cur.execute("""
                    SELECT model, COUNT(*) as count 
                    FROM interactions 
                    WHERE workspace_id = %s AND user_id = %s
                    GROUP BY model
                """, (workspace_id, user_id))

                models = cur.fetchall()

                return jsonify({
                    'totalInteractions': total,
                    'modelBreakdown': [{'model': row['model'], 'count': row['count']} for row in models]
                })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Add these endpoints to your interactions_api.py

import re
from typing import Dict, Tuple


# Intent classification logic
def classify_intent(prompt: str, workspace_id: int = 0) -> Tuple[str, float]:
    """
    Classify intent using database-stored keyword/pattern matching rules
    Returns (intent, confidence_score)
    """
    prompt_lower = prompt.lower().strip()

    try:
        with get_interactions_db() as conn:
            with conn.cursor() as cur:
                # Get active classification rules for the workspace
                # Fall back to default rules (workspace_id = 0) if none exist for the workspace
                cur.execute("""
                    SELECT intent_name, keywords, phrases, confidence_weight, description
                    FROM intent_classification_rules 
                    WHERE workspace_id IN (%s, 0) AND is_active = true
                    ORDER BY workspace_id DESC, intent_name
                """, (workspace_id,))

                rules = cur.fetchall()

                if not rules:
                    # No rules found, return default
                    return 'other', 0.3

                # Convert database results to patterns dictionary
                patterns = {}
                seen_intents = set()

                for rule in rules:
                    intent_name = rule['intent_name']

                    # Skip if we already have this intent (prioritize workspace-specific rules)
                    if intent_name in seen_intents:
                        continue
                    seen_intents.add(intent_name)

                    patterns[intent_name] = {
                        'keywords': rule['keywords'] or [],
                        'phrases': rule['phrases'] or [],
                        'confidence': float(rule['confidence_weight']),
                        'description': rule['description']
                    }

    except Exception as e:
        print(f"Error loading classification rules: {e}")
        # Fallback to basic classification if database fails
        return 'other', 0.3

    # Score each intent using the database rules
    scores = {}
    for intent, config in patterns.items():
        score = 0

        # Check keywords
        for keyword in config['keywords']:
            if keyword.lower() in prompt_lower:
                score += 1

        # Check phrases (higher weight)
        for phrase in config['phrases']:
            if phrase.lower() in prompt_lower:
                score += 2

        if score > 0:
            scores[intent] = score * config['confidence']

    # Return best match or 'other'
    if scores:
        best_intent = max(scores.items(), key=lambda x: x[1])
        confidence = min(best_intent[1] / 3, 1.0)  # Normalize to 0-1
        return best_intent[0], confidence

    return 'other', 0.3


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


def test_intent_classification_with_rules(prompt: str, workspace_id: int = 0):
    """
    Test classification with detailed breakdown showing which rules matched
    """
    prompt_lower = prompt.lower().strip()

    try:
        rules = get_workspace_intent_rules(workspace_id)

        if not rules:
            return {
                'prompt': prompt,
                'predictedIntent': 'other',
                'confidence': 0.3,
                'matchedRules': [],
                'availableIntents': []
            }

        # Score each intent and track matches
        scores = {}
        matched_rules = []

        for rule in rules:
            intent_name = rule['intentName']
            score = 0
            matched_keywords = []
            matched_phrases = []

            # Check keywords
            for keyword in rule['keywords']:
                if keyword.lower() in prompt_lower:
                    score += 1
                    matched_keywords.append(keyword)

            # Check phrases (higher weight)
            for phrase in rule['phrases']:
                if phrase.lower() in prompt_lower:
                    score += 2
                    matched_phrases.append(phrase)

            if score > 0:
                final_score = score * rule['confidenceWeight']
                scores[intent_name] = final_score

                matched_rules.append({
                    'intentName': intent_name,
                    'description': rule['description'],
                    'rawScore': score,
                    'confidenceWeight': rule['confidenceWeight'],
                    'finalScore': final_score,
                    'matchedKeywords': matched_keywords,
                    'matchedPhrases': matched_phrases,
                    'isCustom': rule['isCustom']
                })

        # Get best match
        if scores:
            best_intent = max(scores.items(), key=lambda x: x[1])
            confidence = min(best_intent[1] / 3, 1.0)
            predicted_intent = best_intent[0]
        else:
            predicted_intent = 'other'
            confidence = 0.3

        return {
            'prompt': prompt,
            'predictedIntent': predicted_intent,
            'confidence': round(confidence, 3),
            'matchedRules': sorted(matched_rules, key=lambda x: x['finalScore'], reverse=True),
            'availableIntents': [rule['intentName'] for rule in rules],
            'workspaceId': workspace_id
        }

    except Exception as e:
        print(f"Error testing classification: {e}")
        return {
            'prompt': prompt,
            'predictedIntent': 'other',
            'confidence': 0.3,
            'error': str(e)
        }

@interactions_api.route('/api/interactions/classify/existing', methods=['POST'])
def classify_existing_interactions():
    """Classify all existing interactions with null intents"""
    try:
        with get_interactions_db() as conn:
            with conn.cursor() as cur:
                # Get interactions with null intents
                cur.execute("""
                    SELECT id, prompt FROM interactions 
                    WHERE intent = 'chat' OR intent IS NULL
                    ORDER BY created_at DESC
                """)

                interactions_to_classify = cur.fetchall()
                classified_count = 0
                results = []

                for row in interactions_to_classify:
                    interaction_id = row['id']
                    prompt = row['prompt']

                    # Classify the intent
                    intent, confidence = classify_intent(prompt)

                    # Update the database
                    cur.execute("""
                        UPDATE interactions 
                        SET intent = %s, 
                            metadata = COALESCE(metadata, '{}'::jsonb) || 
                                      jsonb_build_object('classification_confidence', %s, 'classification_method', 'keyword')
                        WHERE id = %s
                    """, (intent, confidence, interaction_id))

                    classified_count += 1
                    results.append({
                        'id': str(interaction_id),
                        'intent': intent,
                        'confidence': round(confidence, 2),
                        'prompt_preview': prompt[:100] + '...' if len(prompt) > 100 else prompt
                    })

                return jsonify({
                    'success': True,
                    'classified_count': classified_count,
                    'method': 'keyword-based (Basic Tier)',
                    'results': results[:10],  # Show first 10 for review
                    'message': f'Classified {classified_count} interactions using keyword matching'
                })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@interactions_api.route('/api/interactions/intents/stats', methods=['GET'])
def get_intent_stats():
    """Get intent distribution and classification performance metrics"""
    workspace_id = request.args.get('workspace_id', type=int)
    user_id = request.args.get('user_id')
    days = request.args.get('days', 30, type=int)

    if not workspace_id or not user_id:
        return jsonify({'error': 'workspace_id and user_id required'}), 400

    since_date = datetime.now() - timedelta(days=days)

    try:
        with get_interactions_db() as conn:
            with conn.cursor() as cur:
                # Overall intent distribution
                cur.execute("""
                    SELECT 
                        intent,
                        COUNT(*) as count,
                        AVG((metadata->>'classification_confidence')::float) as avg_confidence,
                        COUNT(CASE WHEN user_feedback = 'good' THEN 1 END) as positive_feedback,
                        COUNT(CASE WHEN user_feedback IN ('bad', 'hallucination') THEN 1 END) as negative_feedback
                    FROM interactions 
                    WHERE workspace_id = %s AND user_id = %s AND created_at >= %s
                        AND intent IS NOT NULL
                    GROUP BY intent
                    ORDER BY count DESC
                """, (workspace_id, user_id, since_date))

                intent_distribution = []
                total_classified = 0

                for row in cur.fetchall():
                    count = row['count']
                    total_classified += count

                    intent_distribution.append({
                        'intent': row['intent'],
                        'count': count,
                        'avgConfidence': round(row['avg_confidence'] or 0, 2),
                        'positiveFeedback': row['positive_feedback'],
                        'negativeFeedback': row['negative_feedback'],
                        'accuracy': round((row['positive_feedback'] / count) * 100, 1) if count > 0 else 0
                    })

                # Calculate percentages
                for item in intent_distribution:
                    item['percentage'] = round((item['count'] / total_classified) * 100,
                                               1) if total_classified > 0 else 0

                # Unclassified count
                cur.execute("""
                    SELECT COUNT(*) as unclassified
                    FROM interactions 
                    WHERE workspace_id = %s AND user_id = %s AND created_at >= %s
                        AND intent IS NULL
                """, (workspace_id, user_id, since_date))

                unclassified = cur.fetchone()['unclassified']

                # Classification method breakdown
                cur.execute("""
                    SELECT 
                        metadata->>'classification_method' as method,
                        COUNT(*) as count
                    FROM interactions 
                    WHERE workspace_id = %s AND user_id = %s AND created_at >= %s
                        AND intent IS NOT NULL AND metadata ? 'classification_method'
                    GROUP BY metadata->>'classification_method'
                """, (workspace_id, user_id, since_date))

                methods = []
                for row in cur.fetchall():
                    methods.append({
                        'method': row['method'] or 'unknown',
                        'count': row['count']
                    })

                # Service tier recommendation
                service_tier = "Basic Tier (Keyword-based)"
                recommendation = None

                if total_classified > 100:
                    service_tier = "Ready for Professional Tier (Real-time)"
                    recommendation = "Consider upgrading to Real-time classification for better accuracy on your specific use patterns"

                if total_classified > 500:
                    service_tier = "Ready for Enterprise Tier (ML-based)"
                    recommendation = "With 500+ interactions, ML-based classification could improve accuracy by ~25-30%"

                return jsonify({
                    'intentDistribution': intent_distribution,
                    'totalClassified': total_classified,
                    'unclassified': unclassified,
                    'classificationMethods': methods,
                    'serviceTier': service_tier,
                    'recommendation': recommendation,
                    'period': f'{days} days',
                    'overallAccuracy': round(
                        sum(item['accuracy'] * item['count'] for item in intent_distribution) / total_classified,
                        1) if total_classified > 0 else 0
                })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@interactions_api.route('/api/interactions/intents/test', methods=['POST'])
def test_intent_classification():
    """Test classification on sample text"""
    data = request.get_json() or {}
    test_prompt = data.get('prompt', '').strip()

    if not test_prompt:
        return jsonify({'error': 'prompt required'}), 400

    # Classify the test prompt
    intent, confidence = classify_intent(test_prompt)

    # Get examples of similar classified prompts for comparison
    try:
        with get_interactions_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT prompt, metadata->>'classification_confidence' as confidence
                    FROM interactions 
                    WHERE intent = %s
                    ORDER BY created_at DESC
                    LIMIT 3
                """, (intent,))

                similar_examples = []
                for row in cur.fetchall():
                    similar_examples.append({
                        'prompt': row['prompt'][:200] + '...' if len(row['prompt']) > 200 else row['prompt'],
                        'confidence': float(row['confidence']) if row['confidence'] else 0
                    })

        return jsonify({
            'prompt': test_prompt,
            'predictedIntent': intent,
            'confidence': round(confidence, 2),
            'method': 'keyword-based (Basic Tier)',
            'similarExamples': similar_examples,
            'explanation': f"Classified as '{intent}' based on keyword patterns with {round(confidence * 100, 1)}% confidence"
        })

    except Exception as e:
        # Return classification even if examples fail
        return jsonify({
            'prompt': test_prompt,
            'predictedIntent': intent,
            'confidence': round(confidence, 2),
            'method': 'keyword-based (Basic Tier)',
            'explanation': f"Classified as '{intent}' based on keyword patterns with {round(confidence * 100, 1)}% confidence"
        })