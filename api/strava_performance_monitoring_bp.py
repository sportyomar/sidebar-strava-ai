# strava_performance_monitoring_bp.py
from flask import Blueprint, request, jsonify
import time
import uuid
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager, nullcontext
from registry import get_strava_db

strava_performance_monitoring_bp = Blueprint('strava_performance_monitoring', __name__,
                                             url_prefix='/api/strava/performance')


class StravaPerformanceMonitor:
    def __init__(self):
        self.request_id = str(uuid.uuid4())
        self.user_id = None
        self.query = None
        self.prompt_id = None
        self.stage_timings = {}
        self.resource_metrics = {}
        self.error_details = {}
        self.start_time = time.time()

    @contextmanager
    def time_stage(self, stage_name):
        start = time.time()
        try:
            yield
        finally:
            duration_ms = (time.time() - start) * 1000
            self.stage_timings[stage_name] = round(duration_ms, 2)

    def log_resource_metric(self, key, value):
        self.resource_metrics[key] = value

    def estimate_tokens(self, text):
        """Rough token estimate: ~4 characters per token"""
        return len(str(text)) // 4

    def log_claude_usage(self, prompt_tokens, response_tokens=None, context_text=None):
        """Log Claude API usage metrics"""
        self.resource_metrics['prompt_tokens_estimated'] = prompt_tokens
        if response_tokens:
            self.resource_metrics['response_tokens_estimated'] = response_tokens
        if context_text:
            self.resource_metrics['context_size_chars'] = len(context_text)
            self.resource_metrics['context_tokens_estimated'] = self.estimate_tokens(context_text)

    def log_error(self, stage, error):
        self.error_details[stage] = str(error)

    def save_to_db(self):
        try:
            db_config = get_strava_db()
            conn_params = {
                'host': db_config['host'],
                'port': db_config['port'],
                'database': db_config['database_name'],
                'user': db_config['username'],
                'password': db_config['password']
            }
            conn = psycopg2.connect(**conn_params)
            cur = conn.cursor()

            total_time_ms = (time.time() - self.start_time) * 1000
            self.stage_timings['total_request_ms'] = round(total_time_ms, 2)

            cur.execute("""
                INSERT INTO performance_metrics 
                (request_id, user_id, query, prompt_id, stage_timings, resource_metrics, error_details)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                self.request_id,
                self.user_id,
                self.query,
                self.prompt_id,
                json.dumps(self.stage_timings),
                json.dumps(self.resource_metrics),
                json.dumps(self.error_details) if self.error_details else None
            ))

            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Failed to save performance metrics: {e}")


# Analytics endpoints
@strava_performance_monitoring_bp.route('/metrics/recent', methods=['GET'])
def get_recent_metrics():
    """Get recent Strava AI performance metrics"""
    limit = int(request.args.get('limit', 50))

    try:
        db_config = get_strava_db()
        conn_params = {
            'host': db_config['host'],
            'port': db_config['port'],
            'database': db_config['database_name'],
            'user': db_config['username'],
            'password': db_config['password']
        }
        conn = psycopg2.connect(**conn_params)
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute("""
            SELECT 
                request_id,
                timestamp,
                user_id,
                query,
                prompt_id,
                stage_timings,
                resource_metrics,
                error_details
            FROM performance_metrics 
            ORDER BY timestamp DESC 
            LIMIT %s
        """, (limit,))

        results = cur.fetchall()
        conn.close()

        metrics = []
        for row in results:
            metrics.append({
                'request_id': row['request_id'],
                'timestamp': row['timestamp'].isoformat(),
                'user_id': row['user_id'],
                'query': row['query'],
                'prompt_id': row['prompt_id'],
                'stage_timings': row['stage_timings'],
                'resource_metrics': row['resource_metrics'],
                'error_details': row['error_details']
            })

        return jsonify({'metrics': metrics})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@strava_performance_monitoring_bp.route('/analytics/bottlenecks', methods=['GET'])
def analyze_bottlenecks():
    """Analyze Strava AI performance bottlenecks"""
    hours = int(request.args.get('hours', 24))

    try:
        db_config = get_strava_db()
        conn_params = {
            'host': db_config['host'],
            'port': db_config['port'],
            'database': db_config['database_name'],
            'user': db_config['username'],
            'password': db_config['password']
        }
        conn = psycopg2.connect(**conn_params)
        cur = conn.cursor()

        cur.execute("""
            SELECT 
                stage_timings,
                resource_metrics
            FROM performance_metrics 
            WHERE timestamp > NOW() - INTERVAL '%s hours'
            AND stage_timings IS NOT NULL
        """, (hours,))

        results = cur.fetchall()
        conn.close()

        if not results:
            return jsonify({
                'message': f'No data found for last {hours} hours',
                'total_requests': 0
            })

        # Aggregate timing data
        stage_totals = {}
        stage_counts = {}

        for row in results:
            timings = row[0]
            for stage, duration in timings.items():
                if stage not in stage_totals:
                    stage_totals[stage] = 0
                    stage_counts[stage] = 0
                stage_totals[stage] += duration
                stage_counts[stage] += 1

        # Calculate averages and identify bottlenecks
        stage_averages = {
            stage: round(total / stage_counts[stage], 2)
            for stage, total in stage_totals.items()
        }

        # Sort by average duration (biggest bottlenecks first)
        sorted_stages = sorted(stage_averages.items(), key=lambda x: x[1], reverse=True)

        # Calculate resource efficiency
        total_activities_fetched = sum(r[1].get('activities_fetched_count', 0) for r in results if r[1])
        total_activities_analyzed = sum(r[1].get('activities_analyzed_count', 0) for r in results if r[1])
        efficiency = total_activities_analyzed / total_activities_fetched if total_activities_fetched > 0 else 0

        return jsonify({
            'time_period_hours': hours,
            'total_requests': len(results),
            'bottlenecks': sorted_stages,
            'stage_averages': stage_averages,
            'resource_efficiency': {
                'activities_fetched': total_activities_fetched,
                'activities_analyzed': total_activities_analyzed,
                'efficiency_ratio': round(efficiency, 3)
            },
            'recommendations': generate_performance_recommendations(stage_averages, efficiency)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@strava_performance_monitoring_bp.route('/analytics/user-patterns', methods=['GET'])
def analyze_user_patterns():
    """Analyze performance patterns by user"""
    hours = int(request.args.get('hours', 168))  # Default 1 week

    try:
        db_config = get_strava_db()
        conn_params = {
            'host': db_config['host'],
            'port': db_config['port'],
            'database': db_config['database_name'],
            'user': db_config['username'],
            'password': db_config['password']
        }
        conn = psycopg2.connect(**conn_params)
        cur = conn.cursor()

        cur.execute("""
            SELECT 
                user_id,
                COUNT(*) as request_count,
                AVG((stage_timings->>'total_request_ms')::float) as avg_response_time,
                AVG((resource_metrics->>'activities_fetched_count')::int) as avg_activities_fetched
            FROM performance_metrics 
            WHERE timestamp > NOW() - INTERVAL '%s hours'
            AND stage_timings->>'total_request_ms' IS NOT NULL
            GROUP BY user_id
            ORDER BY request_count DESC
        """, (hours,))

        results = cur.fetchall()
        conn.close()

        user_patterns = []
        for row in results:
            user_patterns.append({
                'user_id': row[0],
                'request_count': row[1],
                'avg_response_time_ms': round(row[2], 2) if row[2] else 0,
                'avg_activities_fetched': round(row[3], 2) if row[3] else 0
            })

        return jsonify({
            'time_period_hours': hours,
            'user_patterns': user_patterns,
            'total_users': len(user_patterns)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


def generate_performance_recommendations(stage_averages, efficiency):
    """Generate performance optimization recommendations"""
    recommendations = []

    # Check for Claude API bottlenecks
    claude_stages = ['claude_parse_query', 'claude_analysis']
    total_claude_time = sum(stage_averages.get(stage, 0) for stage in claude_stages)

    if total_claude_time > 4000:  # > 4 seconds
        recommendations.append({
            'priority': 'high',
            'category': 'ai_optimization',
            'issue': f'Claude API calls taking {total_claude_time / 1000:.1f}s total',
            'suggestion': 'Consider combining parse + analysis into single Claude call'
        })

    # Check for API call efficiency
    api_stages = ['strava_activities_fetch', 'strava_athlete_fetch']
    total_api_time = sum(stage_averages.get(stage, 0) for stage in api_stages)

    if total_api_time > 1000:  # > 1 second
        recommendations.append({
            'priority': 'medium',
            'category': 'api_optimization',
            'issue': f'Strava API calls taking {total_api_time}ms total',
            'suggestion': 'Parallelize API calls or implement caching'
        })

    # Check data selection efficiency
    if efficiency < 0.7:
        recommendations.append({
            'priority': 'medium',
            'category': 'data_efficiency',
            'issue': f'Only {efficiency:.1%} of fetched activities being analyzed',
            'suggestion': 'Improve data filtering or prompt optimization'
        })

    return recommendations



@strava_performance_monitoring_bp.route('/analytics/token-usage', methods=['GET'])
def analyze_token_usage():
    """Analyze Claude token usage patterns"""
    hours = int(request.args.get('hours', 24))

    try:
        db_config = get_strava_db()
        conn_params = {
            'host': db_config['host'],
            'port': db_config['port'],
            'database': db_config['database_name'],
            'user': db_config['username'],
            'password': db_config['password']
        }
        conn = psycopg2.connect(**conn_params)
        cur = conn.cursor()

        cur.execute("""
            SELECT 
                AVG((resource_metrics->>'context_tokens_estimated')::int) as avg_context_tokens,
                MAX((resource_metrics->>'context_tokens_estimated')::int) as max_context_tokens,
                AVG((stage_timings->>'claude_analysis')::float) as avg_claude_time,
                COUNT(*) as total_requests
            FROM performance_metrics 
            WHERE timestamp > NOW() - INTERVAL '%s hours'
            AND resource_metrics->>'context_tokens_estimated' IS NOT NULL
        """, (hours,))

        result = cur.fetchone()
        conn.close()

        return jsonify({
            'time_period_hours': hours,
            'avg_context_tokens': result[0],
            'max_context_tokens': result[1],
            'avg_claude_time_ms': result[2],
            'total_requests': result[3]
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500