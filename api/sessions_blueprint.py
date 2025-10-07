from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor
from auth_blueprint import token_required, get_user_by_id
from registry import get_db_instance
import json

sessions_api = Blueprint('sessions_api', __name__)


def get_interactions_db():
    """Get connection to interactions database"""
    config = get_db_instance("interactions-db")
    db_config = {
        'host': config['host'],
        'port': config['port'],
        'database': config['database_name'],
        'user': config['username'],
        'password': config['password']
    }
    return psycopg2.connect(**db_config, cursor_factory=RealDictCursor)


@sessions_api.route('/api/sessions/ping', methods=['GET'])
def ping():
    """Simple test endpoint"""
    return jsonify({'status': 'sessions blueprint working'})


@sessions_api.route('/api/sessions/simple-test/<int:workspace_id>/<user_id>', methods=['GET'])
def simple_test(workspace_id, user_id):
    """Simple test with basic query"""
    try:
        with get_interactions_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT prompt, intent, created_at
                    FROM interactions 
                    WHERE workspace_id = %s AND user_id = %s
                    ORDER BY created_at DESC
                    LIMIT 5
                """, (workspace_id, user_id))

                interactions = cur.fetchall()
                return jsonify({
                    'found': len(interactions),
                    'latest': interactions[0]['prompt'][:50] if interactions else None
                })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sessions_api.route('/api/sessions/latest/<int:workspace_id>/<user_id>', methods=['GET'])
def get_latest_session(workspace_id, user_id):
    """Get the user's most recent meaningful session for continuity"""
    hours_back = request.args.get('hours', 24, type=int)
    since_date = datetime.now() - timedelta(hours=hours_back)

    try:
        with get_interactions_db() as conn:
            with conn.cursor() as cur:
                # Get recent interactions - simplified query
                cur.execute("""
                    SELECT 
                        id, thread_id, prompt, response, model, intent,
                        quality_score, user_feedback, created_at
                    FROM interactions 
                    WHERE workspace_id = %s AND user_id = %s AND created_at >= %s
                    ORDER BY created_at DESC
                    LIMIT 10
                """, (workspace_id, user_id, since_date))

                interactions = cur.fetchall()
                if not interactions:
                    return jsonify({
                        'hasRecentSession': False,
                        'message': 'No recent interactions found'
                    })

                # Simple analysis - just use the most recent interactions
                latest = interactions[0]

                # Count interactions by intent
                intent_counts = {}
                total_quality = 0
                quality_count = 0

                for interaction in interactions:
                    intent = interaction['intent'] or 'other'
                    intent_counts[intent] = intent_counts.get(intent, 0) + 1

                    if interaction['quality_score']:
                        total_quality += interaction['quality_score']
                        quality_count += 1

                # Find main intent
                main_intent = max(intent_counts.items(), key=lambda x: x[1])[0] if intent_counts else 'other'

                # Simple satisfaction check
                feedback_list = [i['user_feedback'] for i in interactions if i['user_feedback']]
                satisfaction = 'unknown'
                if feedback_list:
                    positive = sum(1 for f in feedback_list if f == 'good')
                    negative = sum(1 for f in feedback_list if f in ['bad', 'hallucination'])
                    satisfaction = 'satisfied' if positive > negative else 'unsatisfied' if negative > 0 else 'neutral'

                # Generate topic summary
                recent_prompts = [i['prompt'] for i in interactions[:3]]
                topic_summary = generate_topic_summary(recent_prompts, main_intent)

                avg_quality = (total_quality / quality_count) if quality_count > 0 else None

                return jsonify({
                    'hasRecentSession': True,
                    'sessionType': 'multi_interaction' if len(interactions) >= 2 else 'single_interaction',
                    'summary': {
                        'mainIntent': main_intent,
                        'topicSummary': topic_summary,
                        'userSatisfaction': satisfaction,
                        'avgQuality': round(avg_quality, 1) if avg_quality else None,
                        'interactionCount': len(interactions),
                        'lastActivity': latest['created_at'].isoformat() + 'Z',
                        'threadId': str(latest['thread_id']) if latest['thread_id'] else None,
                        'intents': list(intent_counts.keys())
                    }
                })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


def generate_topic_summary(prompts, main_intent):
    """Generate a concise topic summary from recent prompts"""
    combined_text = ' '.join(prompts).lower()

    # Intent-specific topic extraction
    if main_intent == 'code':
        keywords = ['function', 'javascript', 'python', 'api', 'database', 'react', 'validation', 'algorithm']
        topics = [kw for kw in keywords if kw in combined_text]
        if topics:
            return f"{main_intent} work on {', '.join(topics[:3])}"
        return "coding and development tasks"

    elif main_intent == 'explanation':
        if 'how' in combined_text:
            return "understanding how things work"
        elif 'what' in combined_text:
            return "learning about concepts"
        return "seeking explanations"

    elif main_intent == 'analysis':
        return "analyzing data and information"

    elif main_intent == 'debug':
        return "troubleshooting and fixing issues"

    elif main_intent == 'creative':
        return "creative writing and content generation"

    else:
        # Extract first few significant words from the most recent prompt
        first_prompt = prompts[0] if prompts else ""
        words = [w for w in first_prompt.split()[:10] if len(w) > 3]
        if words:
            return f"discussion about {' '.join(words[:3])}"
        return "general assistance"


@sessions_api.route('/api/sessions/continue/<int:workspace_id>/<user_id>', methods=['POST'])
@token_required
def generate_continuity_prompt(user_id_from_token, workspace_id, user_id):
    """Generate a personalized greeting based on recent session history"""
    user = get_user_by_id(user_id_from_token)
    user_name = user['display_name'] if user and user['display_name'] else user['username'] if user else 'there'

    try:
        # Get latest session info
        with get_interactions_db() as conn:
            with conn.cursor() as cur:
                # Get session summary
                since_date = datetime.now() - timedelta(hours=24)
                cur.execute("""
                    SELECT 
                        prompt,
                        response,
                        intent,
                        quality_score,
                        user_feedback,
                        created_at
                    FROM interactions 
                    WHERE workspace_id = %s AND user_id = %s AND created_at >= %s
                    ORDER BY created_at DESC
                    LIMIT 10
                """, (workspace_id, user_id, since_date))

                recent_interactions = cur.fetchall()

                if not recent_interactions:
                    return jsonify({
                        'continuityPrompt': f"Hey {user_name}! How can I help you today?",
                        'context': {
                            'hasHistory': False,
                            'sessionType': 'new_user'
                        }
                    })

                # Analyze recent patterns
                latest = recent_interactions[0]
                main_intents = {}
                satisfaction_indicators = []

                for interaction in recent_interactions:
                    intent = interaction['intent']
                    main_intents[intent] = main_intents.get(intent, 0) + 1

                    if interaction['user_feedback']:
                        satisfaction_indicators.append(interaction['user_feedback'])

                # Determine primary intent and satisfaction
                primary_intent = max(main_intents.items(), key=lambda x: x[1])[0] if main_intents else 'other'

                satisfaction = 'neutral'
                if satisfaction_indicators:
                    positive = sum(1 for f in satisfaction_indicators if f == 'good')
                    negative = sum(1 for f in satisfaction_indicators if f in ['bad', 'hallucination'])
                    if positive > negative:
                        satisfaction = 'positive'
                    elif negative > 0:
                        satisfaction = 'negative'

                # Generate contextual greeting
                greeting = generate_contextual_greeting(
                    user_name,
                    primary_intent,
                    satisfaction,
                    latest,
                    len(recent_interactions)
                )

                return jsonify({
                    'continuityPrompt': greeting,
                    'context': {
                        'hasHistory': True,
                        'sessionType': 'returning_user',
                        'primaryIntent': primary_intent,
                        'recentInteractions': len(recent_interactions),
                        'userSatisfaction': satisfaction,
                        'lastActivity': latest['created_at'].isoformat() + 'Z'
                    },
                    'suggestions': generate_suggestions(primary_intent, satisfaction)
                })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


def generate_contextual_greeting(user_name, primary_intent, satisfaction, latest_interaction, interaction_count):
    """Generate personalized greeting based on session context"""

    # Extract topic from latest interaction
    latest_prompt = latest_interaction['prompt'][:50] + '...' if len(latest_interaction['prompt']) > 50 else \
    latest_interaction['prompt']

    # Base greeting with name
    greeting = f"Hey {user_name}! "

    # Add context based on satisfaction and intent
    if satisfaction == 'positive':
        if primary_intent == 'code':
            greeting += f"I see our recent coding session went well. You were working on: '{latest_prompt}'. "
            greeting += "Ready to continue building, or would you like to tackle something new?"
        elif primary_intent == 'explanation':
            greeting += f"Glad I could help explain things clearly last time. Your question about '{latest_prompt}' "
            greeting += "seemed to get a good answer. What would you like to explore next?"
        else:
            greeting += f"Our last {primary_intent} session was productive. "
            greeting += "What can I help you with today?"

    elif satisfaction == 'negative':
        if primary_intent == 'code':
            greeting += f"I noticed you weren't satisfied with my coding help last time on '{latest_prompt}'. "
            greeting += "Would you like me to take another approach to that, or try something different?"
        else:
            greeting += f"I see our last session on '{latest_prompt}' didn't quite hit the mark. "
            greeting += "Let me try to do better - what would you like to work on?"

    else:  # neutral or unknown
        if interaction_count > 5:
            greeting += f"We've been working on {primary_intent} tasks recently. Your last question was about '{latest_prompt}'. "
            greeting += "Want to continue with that theme, or switch to something else?"
        else:
            greeting += f"I see you were asking about '{latest_prompt}' recently. "
            greeting += "How can I help you today?"

    return greeting


def generate_suggestions(primary_intent, satisfaction):
    """Generate contextual suggestions based on user patterns"""
    suggestions = []

    if primary_intent == 'code':
        suggestions = [
            "Continue with coding tasks",
            "Debug existing code",
            "Learn new programming concepts",
            "Code review and optimization"
        ]
    elif primary_intent == 'explanation':
        suggestions = [
            "Explain complex topics",
            "Break down concepts step-by-step",
            "Provide examples and analogies",
            "Answer follow-up questions"
        ]
    elif primary_intent == 'analysis':
        suggestions = [
            "Analyze data or documents",
            "Compare different options",
            "Provide insights and recommendations",
            "Research topics in depth"
        ]
    else:
        suggestions = [
            "Answer questions",
            "Help with tasks",
            "Provide explanations",
            "Generate content"
        ]

    # Add satisfaction-based suggestions
    if satisfaction == 'negative':
        suggestions.insert(0, "Try a different approach to your last question")
        suggestions.insert(1, "Get help from a different model")

    return suggestions[:4]


@sessions_api.route('/api/sessions/related/<int:workspace_id>/<user_id>', methods=['GET'])
def get_related_sessions(workspace_id, user_id):
    """Find related past interactions for context and recommendations"""
    current_intent = request.args.get('intent', 'other')
    days_back = request.args.get('days', 7, type=int)
    limit = request.args.get('limit', 10, type=int)

    since_date = datetime.now() - timedelta(days=days_back)

    try:
        with get_interactions_db() as conn:
            with conn.cursor() as cur:
                # Find interactions with same intent that had good outcomes
                cur.execute("""
                    SELECT 
                        id,
                        prompt,
                        LEFT(response, 150) as response_preview,
                        model,
                        quality_score,
                        user_feedback,
                        created_at,
                        tokens_used,
                        latency_ms
                    FROM interactions 
                    WHERE workspace_id = %s AND user_id = %s 
                        AND intent = %s 
                        AND created_at >= %s
                        AND (quality_score >= 4 OR user_feedback = 'good')
                    ORDER BY 
                        CASE WHEN user_feedback = 'good' THEN 1 ELSE 2 END,
                        quality_score DESC NULLS LAST,
                        created_at DESC
                    LIMIT %s
                """, (workspace_id, user_id, current_intent, since_date, limit))

                successful_interactions = []
                for row in cur.fetchall():
                    successful_interactions.append({
                        'id': str(row['id']),
                        'prompt': row['prompt'],
                        'responsePreview': row['response_preview'] + '...' if len(row['response_preview']) == 150 else
                        row['response_preview'],
                        'model': row['model'],
                        'qualityScore': row['quality_score'],
                        'userFeedback': row['user_feedback'],
                        'timestamp': row['created_at'].isoformat() + 'Z',
                        'performance': {
                            'tokensUsed': row['tokens_used'],
                            'latencyMs': row['latency_ms']
                        }
                    })

                # Get model recommendations based on successful patterns
                cur.execute("""
                    SELECT 
                        model,
                        COUNT(*) as success_count,
                        AVG(quality_score) as avg_quality,
                        AVG(latency_ms) as avg_latency,
                        AVG(tokens_used) as avg_tokens
                    FROM interactions 
                    WHERE workspace_id = %s AND user_id = %s 
                        AND intent = %s 
                        AND created_at >= %s
                        AND (quality_score >= 4 OR user_feedback = 'good')
                    GROUP BY model
                    ORDER BY success_count DESC, avg_quality DESC NULLS LAST
                    LIMIT 3
                """, (workspace_id, user_id, current_intent, since_date))

                model_recommendations = []
                for row in cur.fetchall():
                    model_recommendations.append({
                        'model': row['model'],
                        'successCount': row['success_count'],
                        'avgQuality': round(row['avg_quality'] or 0, 1),
                        'avgLatencyMs': round(row['avg_latency'] or 0, 1),
                        'avgTokens': round(row['avg_tokens'] or 0, 1)
                    })

                return jsonify({
                    'intent': current_intent,
                    'relatedInteractions': successful_interactions,
                    'modelRecommendations': model_recommendations,
                    'searchPeriod': f'{days_back} days',
                    'insights': {
                        'totalSuccessful': len(successful_interactions),
                        'bestModel': model_recommendations[0]['model'] if model_recommendations else None,
                        'avgSuccessRate': len(successful_interactions)
                    }
                })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sessions_api.route('/api/sessions/test/<int:workspace_id>/<user_id>', methods=['GET'])
@token_required
def test_session_continuity(user_id_from_token, workspace_id, user_id):
    """Test endpoint to see what session continuity would look like"""
    # Get real user name
    user = get_user_by_id(user_id_from_token)
    user_name = user['display_name'] if user and user['display_name'] else user['username'] if user else 'Test User'
    try:
        # Get latest session directly (no response object needed)
        since_date = datetime.now() - timedelta(hours=24)

        with get_interactions_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 
                        prompt, intent, quality_score, user_feedback, created_at
                    FROM interactions 
                    WHERE workspace_id = %s AND user_id = %s AND created_at >= %s
                    ORDER BY created_at DESC
                    LIMIT 5
                """, (workspace_id, user_id, since_date))

                recent_interactions = cur.fetchall()

                if not recent_interactions:
                    return jsonify({
                        'testResult': 'No recent interactions found',
                        'testTimestamp': datetime.now().isoformat() + 'Z'
                    })

                # Analyze the data manually for test
                latest = recent_interactions[0]
                intents = [i['intent'] for i in recent_interactions]
                primary_intent = max(set(intents), key=intents.count)

                # Generate test greeting
                latest_prompt = latest['prompt'][:50] + '...' if len(latest['prompt']) > 50 else latest['prompt']

                test_greeting = f"Hey {user_name}! We've been working on {primary_intent} tasks recently. Your last question was about '{latest_prompt}'. Want to continue with that theme, or switch to something else?"

                return jsonify({
                    'testResult': {
                        'greeting': test_greeting,
                        'context': {
                            'primaryIntent': primary_intent,
                            'recentInteractionCount': len(recent_interactions),
                            'lastActivity': latest['created_at'].isoformat() + 'Z',
                            'sessionType': 'returning_user'
                        },
                        'recentPrompts': [i['prompt'][:100] for i in recent_interactions[:3]]
                    },
                    'testTimestamp': datetime.now().isoformat() + 'Z',
                    'testNote': 'This shows what a returning user experience would look like'
                })

    except Exception as e:
        return jsonify({
            'error': str(e),
            'fallback': {
                'greeting': 'Hey Alex! How can I help you today?',
                'context': {'sessionType': 'error_fallback'}
            }
        }), 200