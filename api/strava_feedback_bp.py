from flask import Blueprint, request, jsonify
from datetime import datetime
import json
import os

strava_feedback_bp = Blueprint('strava_feedback', __name__, url_prefix='/api/strava/feedback')

# Simple file-based storage (replace with database in production)
FEEDBACK_FILE = 'token_feedback.jsonl'


@strava_feedback_bp.route('/token', methods=['POST'])
def submit_token_feedback():
    """Collect user feedback on token quality."""
    try:
        feedback = request.get_json()

        # Add metadata
        feedback['submitted_at'] = datetime.now().isoformat()
        feedback['feedback_type'] = 'missing_token'

        # Append to JSONL file
        with open(FEEDBACK_FILE, 'a') as f:
            f.write(json.dumps(feedback) + '\n')

        return jsonify({'success': True, 'message': 'Feedback recorded'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@strava_feedback_bp.route('/analyze', methods=['GET'])
def analyze_feedback():
    """Analyze collected feedback to identify patterns."""
    try:
        if not os.path.exists(FEEDBACK_FILE):
            return jsonify({'patterns': [], 'total_feedback': 0})

        feedback_items = []
        with open(FEEDBACK_FILE, 'r') as f:
            for line in f:
                feedback_items.append(json.loads(line))

        # Count frequency of suggested tokens
        token_frequency = {}
        for item in feedback_items:
            text = item.get('suggested_text', '').lower()
            token_type = item.get('type')
            key = f"{text}:{token_type}"

            if key not in token_frequency:
                token_frequency[key] = {
                    'text': text,
                    'type': token_type,
                    'count': 0,
                    'examples': []
                }

            token_frequency[key]['count'] += 1
            token_frequency[key]['examples'].append(item.get('answer', ''))

        # Sort by frequency
        patterns = sorted(
            token_frequency.values(),
            key=lambda x: x['count'],
            reverse=True
        )

        return jsonify({
            'patterns': patterns[:20],  # Top 20
            'total_feedback': len(feedback_items)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@strava_feedback_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'strava_feedback'})