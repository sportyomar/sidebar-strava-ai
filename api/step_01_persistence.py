from flask import Blueprint, request, jsonify
from datetime import datetime
import psycopg2
import os
import json

step_01_persistence = Blueprint('step_01_persistence', __name__, url_prefix='/api/step-01')

# Adjust these for your environment
DB_CONN = "dbname=portfolio_db user=postgres password=TqKwifr5jtJ6 host=localhost port=60616"

def get_db_connection():
    return psycopg2.connect(DB_CONN)

@step_01_persistence.route('/save-progress', methods=['POST'])
def save_progress():
    data = request.get_json()
    user_id = data.get('user_id', 'default')
    step_data = json.dumps(data.get('step_data', {}))
    current_phase = data.get('current_phase', 0)

    conn = get_db_connection()
    cur = conn.cursor()

    # Upsert style: delete + insert (or you can use ON CONFLICT)
    cur.execute("""
        DELETE FROM step_01_progress WHERE user_id = %s;
    """, (user_id,))
    cur.execute("""
        INSERT INTO step_01_progress (user_id, step_data, current_phase, last_updated)
        VALUES (%s, %s, %s, %s)
    """, (user_id, step_data, current_phase, datetime.now()))

    conn.commit()
    cur.close()
    conn.close()

    return jsonify({'message': 'Progress saved'}), 200

@step_01_persistence.route('/load-progress', methods=['GET'])
def load_progress():
    user_id = request.args.get('user_id', 'default')

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT step_data, current_phase, last_updated 
        FROM step_01_progress 
        WHERE user_id = %s 
        ORDER BY last_updated DESC 
        LIMIT 1
    """, (user_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()

    if row:
        return jsonify({
            'step_data': row[0],
            'current_phase': row[1],
            'last_updated': row[2]
        })
    else:
        return jsonify({'message': 'No saved progress'}), 404
