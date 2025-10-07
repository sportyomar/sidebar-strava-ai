from flask import Blueprint, request, jsonify
import json
from threads_utils import get_db_connection, convert_decimals

threads_analytics_bp = Blueprint('threads_analytics', __name__)


@threads_analytics_bp.route('/api/analytics/threads/overview', methods=['GET'])
def get_threads_overview():
    """Get high-level thread statistics"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Get basic thread counts and stats
                cur.execute("""
                    SELECT 
                        COUNT(*) as total_threads,
                        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as threads_last_7_days,
                        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as threads_last_30_days,
                        AVG(CASE WHEN updated_at >= NOW() - INTERVAL '7 days' THEN 1.0 ELSE 0.0 END) as active_threads_ratio
                    FROM threads
                """)

                overview_row = cur.fetchone()

                # Get message statistics
                cur.execute("""
                    SELECT 
                        COUNT(*) as total_messages,
                        COUNT(DISTINCT thread_id) as threads_with_messages,
                        AVG(message_count) as avg_messages_per_thread
                    FROM (
                        SELECT thread_id, COUNT(*) as message_count
                        FROM messages 
                        WHERE is_deleted = false AND role = 'assistant'
                        GROUP BY thread_id
                    ) as thread_stats
                """)

                message_row = cur.fetchone()

                # Get model usage stats
                cur.execute("""
                    SELECT 
                        COUNT(DISTINCT model) as unique_models_used,
                        mode() WITHIN GROUP (ORDER BY model) as most_popular_model
                    FROM messages 
                    WHERE is_deleted = false AND role = 'assistant' AND model IS NOT NULL
                """)

                model_row = cur.fetchone()

                overview = {
                    'threads': {
                        'total': overview_row['total_threads'],
                        'last_7_days': overview_row['threads_last_7_days'],
                        'last_30_days': overview_row['threads_last_30_days'],
                        'with_messages': message_row['threads_with_messages'] or 0
                    },
                    'messages': {
                        'total': message_row['total_messages'] or 0,
                        'avg_per_thread': float(message_row['avg_messages_per_thread']) if message_row[
                            'avg_messages_per_thread'] else 0
                    },
                    'models': {
                        'unique_count': model_row['unique_models_used'] or 0,
                        'most_popular': model_row['most_popular_model']
                    }
                }

                return jsonify(convert_decimals(overview))

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@threads_analytics_bp.route('/api/analytics/threads/tags', methods=['GET'])
def get_tag_analytics():
    """Get comprehensive tag usage statistics"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Get all tags with their usage counts
                cur.execute("""
                    SELECT 
                        tag,
                        COUNT(*) as usage_count,
                        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as recent_usage,
                        MIN(created_at) as first_used,
                        MAX(updated_at) as last_used
                    FROM (
                        SELECT 
                            jsonb_array_elements_text(tags) as tag,
                            created_at,
                            updated_at
                        FROM threads 
                        WHERE tags IS NOT NULL AND jsonb_array_length(tags) > 0
                    ) as tag_usage
                    GROUP BY tag
                    ORDER BY usage_count DESC
                """)

                tag_stats = []
                for row in cur.fetchall():
                    tag_stats.append({
                        'tag': row['tag'],
                        'usage_count': row['usage_count'],
                        'recent_usage': row['recent_usage'],
                        'first_used': row['first_used'].isoformat() + 'Z' if row['first_used'] else None,
                        'last_used': row['last_used'].isoformat() + 'Z' if row['last_used'] else None
                    })

                # Get tag combination statistics
                cur.execute("""
                    SELECT 
                        jsonb_array_length(tags) as tag_count,
                        COUNT(*) as thread_count
                    FROM threads 
                    WHERE tags IS NOT NULL 
                    GROUP BY jsonb_array_length(tags)
                    ORDER BY tag_count
                """)

                tag_combinations = []
                for row in cur.fetchall():
                    tag_combinations.append({
                        'tag_count': row['tag_count'],
                        'thread_count': row['thread_count']
                    })

                # Get total stats
                cur.execute("""
                    WITH unique_tags_cte AS (
                        SELECT DISTINCT jsonb_array_elements_text(tags) as tag
                        FROM threads 
                        WHERE tags IS NOT NULL AND jsonb_array_length(tags) > 0
                    )
                    SELECT 
                        (SELECT COUNT(*) FROM threads) as total_threads,
                        (SELECT COUNT(*) FROM threads WHERE tags IS NOT NULL AND jsonb_array_length(tags) > 0) as tagged_threads,
                        (SELECT COUNT(*) FROM unique_tags_cte) as unique_tags
                """)

                totals_row = cur.fetchone()

                analytics = {
                    'summary': {
                        'total_threads': totals_row['total_threads'],
                        'tagged_threads': totals_row['tagged_threads'],
                        'unique_tags': totals_row['unique_tags'],
                        'tagging_percentage': round(
                            (totals_row['tagged_threads'] / totals_row['total_threads'] * 100) if totals_row[
                                                                                                      'total_threads'] > 0 else 0,
                            2)
                    },
                    'tag_usage': tag_stats,
                    'tag_combinations': tag_combinations
                }

                return jsonify(convert_decimals(analytics))

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@threads_analytics_bp.route('/api/analytics/threads/tags/popular', methods=['GET'])
def get_popular_tags():
    """Get most popular tags with optional limit"""
    limit = request.args.get('limit', 10, type=int)
    days = request.args.get('days', 30, type=int)

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Use proper parameter substitution for INTERVAL
                query = """
                    SELECT 
                        tag,
                        COUNT(*) as usage_count,
                        COUNT(CASE WHEN created_at >= NOW() - INTERVAL %s THEN 1 END) as recent_usage,
                        ROUND(AVG(
                            CASE WHEN updated_at >= NOW() - INTERVAL '7 days' THEN 1.0 ELSE 0.0 END
                        ), 3) as activity_score
                    FROM (
                        SELECT 
                            jsonb_array_elements_text(tags) as tag,
                            created_at,
                            updated_at
                        FROM threads 
                        WHERE tags IS NOT NULL AND jsonb_array_length(tags) > 0
                    ) as tag_usage
                    GROUP BY tag
                    ORDER BY usage_count DESC, activity_score DESC
                    LIMIT %s
                """
                cur.execute(query, (f"{days} days", limit))

                popular_tags = []
                for row in cur.fetchall():
                    popular_tags.append({
                        'tag': row['tag'],
                        'usage_count': row['usage_count'],
                        'recent_usage': row['recent_usage'],
                        'activity_score': float(row['activity_score']) if row['activity_score'] else 0.0
                    })

                return jsonify(convert_decimals(popular_tags))

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@threads_analytics_bp.route('/api/analytics/threads/activity', methods=['GET'])
def get_thread_activity():
    """Get thread activity over time"""
    days = request.args.get('days', 30, type=int)

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Get daily thread creation and activity
                cur.execute("""
                    WITH date_series AS (
                        SELECT generate_series(
                            CURRENT_DATE - INTERVAL '%s days',
                            CURRENT_DATE,
                            '1 day'::interval
                        )::date as date
                    ),
                    thread_stats AS (
                        SELECT 
                            DATE(created_at) as date,
                            COUNT(*) as threads_created
                        FROM threads
                        WHERE created_at >= CURRENT_DATE - INTERVAL '%s days'
                        GROUP BY DATE(created_at)
                    ),
                    message_stats AS (
                        SELECT 
                            DATE(created_at) as date,
                            COUNT(CASE WHEN role = 'assistant' THEN 1 END) as messages_sent
                        FROM messages
                        WHERE created_at >= CURRENT_DATE - INTERVAL '%s days' 
                          AND is_deleted = false
                        GROUP BY DATE(created_at)
                    )
                    SELECT 
                        d.date,
                        COALESCE(t.threads_created, 0) as threads_created,
                        COALESCE(m.messages_sent, 0) as messages_sent
                    FROM date_series d
                    LEFT JOIN thread_stats t ON d.date = t.date
                    LEFT JOIN message_stats m ON d.date = m.date
                    ORDER BY d.date
                """, (days, days, days))

                activity_data = []
                for row in cur.fetchall():
                    activity_data.append({
                        'date': row['date'].isoformat(),
                        'threads_created': row['threads_created'],
                        'messages_sent': row['messages_sent']
                    })

                return jsonify(convert_decimals(activity_data))

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@threads_analytics_bp.route('/api/analytics/threads/models', methods=['GET'])
def get_model_analytics():
    """Get model usage statistics"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Get model usage with performance metrics
                cur.execute("""
                    SELECT 
                        model,
                        COUNT(*) as usage_count,
                        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as recent_usage,
                        AVG(CAST(metadata->>'tokens_used' AS INTEGER)) as avg_tokens_used,
                        AVG(CAST(metadata->>'latency_seconds' AS DECIMAL)) as avg_latency_seconds,
                        AVG(CAST(metadata->>'word_count' AS INTEGER)) as avg_word_count
                    FROM messages
                    WHERE role = 'assistant' 
                      AND is_deleted = false 
                      AND model IS NOT NULL
                      AND metadata IS NOT NULL
                    GROUP BY model
                    ORDER BY usage_count DESC
                """)

                model_stats = []
                for row in cur.fetchall():
                    model_stats.append({
                        'model': row['model'],
                        'usage_count': row['usage_count'],
                        'recent_usage': row['recent_usage'],
                        'avg_tokens_used': float(row['avg_tokens_used']) if row['avg_tokens_used'] else None,
                        'avg_latency_seconds': float(row['avg_latency_seconds']) if row[
                            'avg_latency_seconds'] else None,
                        'avg_word_count': float(row['avg_word_count']) if row['avg_word_count'] else None
                    })

                return jsonify(convert_decimals(model_stats))

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@threads_analytics_bp.route('/api/analytics/threads/search', methods=['GET'])
def search_threads_analytics():
    """Search and filter threads for analytics with advanced filtering"""
    tag = request.args.get('tag')
    model = request.args.get('model')
    days = request.args.get('days', type=int)
    min_messages = request.args.get('min_messages', type=int)

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Build dynamic query
                conditions = []
                params = []

                base_query = """
                    SELECT 
                        t.id,
                        t.title,
                        t.tags,
                        t.created_at,
                        t.updated_at,
                        COUNT(CASE WHEN m.role = 'assistant' THEN 1 END) as message_count,
                        COUNT(DISTINCT m.model) as unique_models_used,
                        ARRAY_AGG(DISTINCT m.model) FILTER (WHERE m.model IS NOT NULL) as models_used
                    FROM threads t
                    LEFT JOIN messages m ON t.id = m.thread_id AND m.is_deleted = false
                """

                if tag:
                    conditions.append("t.tags ? %s")
                    params.append(tag)

                if days:
                    conditions.append("t.created_at >= NOW() - INTERVAL %s")
                    params.append(f"{days} days")

                if conditions:
                    base_query += " WHERE " + " AND ".join(conditions)

                base_query += """
                    GROUP BY t.id, t.title, t.tags, t.created_at, t.updated_at
                """

                if min_messages:
                    base_query += " HAVING COUNT(CASE WHEN m.role = 'assistant' THEN 1 END) >= %s"
                    params.append(min_messages)

                if model:
                    if min_messages:
                        base_query += " AND %s = ANY(ARRAY_AGG(DISTINCT m.model))"
                    else:
                        base_query += " HAVING %s = ANY(ARRAY_AGG(DISTINCT m.model))"
                    params.append(model)

                base_query += " ORDER BY t.updated_at DESC"

                cur.execute(base_query, params)

                threads = []
                for row in cur.fetchall():
                    threads.append({
                        'id': row['id'],
                        'title': row['title'],
                        'tags': row['tags'] or [],
                        'created_at': row['created_at'].isoformat() + 'Z' if row['created_at'] else None,
                        'updated_at': row['updated_at'].isoformat() + 'Z' if row['updated_at'] else None,
                        'message_count': row['message_count'],
                        'unique_models_used': row['unique_models_used'],
                        'models_used': row['models_used'] or []
                    })

                # Get summary stats for the filtered results
                summary = {
                    'total_threads': len(threads),
                    'total_messages': sum(t['message_count'] for t in threads),
                    'avg_messages_per_thread': round(sum(t['message_count'] for t in threads) / len(threads),
                                                     2) if threads else 0
                }

                return jsonify({
                    'summary': summary,
                    'threads': convert_decimals(threads)
                })

    except Exception as e:
        return jsonify({"error": str(e)}), 500