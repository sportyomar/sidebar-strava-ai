from flask import Blueprint, request, jsonify
import uuid
import json
from threads_utils import get_db_connection, now

threads_crud_bp = Blueprint('threads_crud', __name__)


@threads_crud_bp.route('/api/threads', methods=['POST'])
def create_thread():
    data = request.json
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                thread_id = str(uuid.uuid4())
                cur.execute("""
                    INSERT INTO threads (id, title, model_id, tags)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id, title, model_id, tags, created_at, updated_at
                """, (thread_id, data.get("title", "Untitled Thread"), data.get("modelId", "unknown"),
                      json.dumps(data.get("tags", []))))

                row = cur.fetchone()
                thread = {
                    "id": row["id"],
                    "title": row["title"],
                    "modelId": row["model_id"],
                    "tags": row["tags"] or [],
                    "updatedAt": str(row["updated_at"]) + 'Z' if row["updated_at"] else None,
                    "createdAt": str(row["created_at"]) + 'Z' if row["created_at"] else None,
                    "messageCount": 0
                }
                return jsonify(thread), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@threads_crud_bp.route('/api/threads', methods=['GET'])
def list_threads():
    try:
        # Get optional tag filters
        tag_filters = request.args.get('tags')
        tag_list = [tag.strip() for tag in tag_filters.split(',')] if tag_filters else None

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                base_query = """
                    SELECT t.id, t.title, t.model_id, t.tags, t.created_at, t.updated_at,
                           COUNT(CASE WHEN m.role = 'assistant' THEN 1 END)::int AS message_count
                    FROM threads t
                    LEFT JOIN messages m ON m.thread_id = t.id
                """

                params = []
                where_clause = ""

                if tag_list:
                    # Filter threads that contain any of the specified tags
                    where_clause = "WHERE t.tags ?| %s"
                    params.append(tag_list)

                query = base_query + where_clause + """
                    GROUP BY t.id, t.title, t.model_id, t.tags, t.created_at, t.updated_at
                    ORDER BY t.updated_at DESC
                """

                cur.execute(query, params)

                threads = []
                for row in cur.fetchall():
                    threads.append({
                        "id": row["id"],
                        "title": row["title"],
                        "modelId": row["model_id"],
                        "tags": row["tags"] or [],
                        "updatedAt": str(row["updated_at"]) + 'Z' if row["updated_at"] else None,
                        "createdAt": str(row["created_at"]) + 'Z' if row["created_at"] else None,
                        "messageCount": row["message_count"]
                    })
                return jsonify(threads)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@threads_crud_bp.route('/api/threads/<thread_id>', methods=['GET'])
def get_thread(thread_id):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT t.id, t.title, t.model_id, t.tags, t.created_at, t.updated_at,
                           COUNT(CASE WHEN m.role = 'assistant' THEN 1 END)::int AS message_count
                    FROM threads t
                    LEFT JOIN messages m ON m.thread_id = t.id
                    WHERE t.id = %s
                    GROUP BY t.id, t.title, t.model_id, t.tags, t.created_at, t.updated_at
                """, (thread_id,))

                row = cur.fetchone()
                if not row:
                    return jsonify({"error": "Thread not found"}), 404

                thread = {
                    "id": row["id"],
                    "title": row["title"],
                    "modelId": row["model_id"],
                    "tags": row["tags"] or [],
                    "updatedAt": str(row["updated_at"]) + 'Z' if row["updated_at"] else None,
                    "createdAt": str(row["created_at"]) + 'Z' if row["created_at"] else None,
                    "messageCount": row["message_count"]
                }
                return jsonify(thread)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@threads_crud_bp.route('/api/threads/<thread_id>/messages', methods=['GET'])
def get_thread_messages(thread_id):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Check if thread exists
                cur.execute("SELECT id FROM threads WHERE id = %s", (thread_id,))
                if not cur.fetchone():
                    return jsonify({"error": "Thread not found"}), 404

                # Get messages with turn data, excluding soft-deleted messages
                cur.execute("""
                    SELECT id, role, content, model, metadata, created_at, turn_number, message_pair_id
                    FROM messages
                    WHERE thread_id = %s AND is_deleted = false
                    ORDER BY turn_number ASC, created_at ASC
                """, (thread_id,))

                messages = cur.fetchall()

                chat_messages = []

                # Group by turn number for cleaner pairing
                turns = {}
                for msg in messages:
                    turn_num = msg["turn_number"]
                    if turn_num not in turns:
                        turns[turn_num] = {"user": None, "assistant": None}
                    turns[turn_num][msg["role"]] = msg

                # Convert to chat format with turn data
                for turn_num in sorted(turns.keys()):
                    turn_data = turns[turn_num]
                    user_msg = turn_data["user"]
                    assistant_msg = turn_data["assistant"]

                    # Only include complete pairs (both user and assistant)
                    if user_msg and assistant_msg:
                        processed_message = {
                            "prompt": user_msg["content"],
                            "response": assistant_msg["content"],
                            "model": assistant_msg["model"] or "unknown",
                            "timestamp": assistant_msg["created_at"].isoformat() + 'Z',
                            "metadata": assistant_msg["metadata"] or {},
                            "turnNumber": turn_num,
                            "messagePairId": assistant_msg["message_pair_id"],
                            "userMessageId": user_msg["id"],
                            "assistantMessageId": assistant_msg["id"]
                        }

                        chat_messages.append(processed_message)

                return jsonify(chat_messages)
    except Exception as e:
        print(f"ERROR in get_thread_messages: {str(e)}")
        return jsonify({"error": str(e)}), 500


@threads_crud_bp.route('/api/threads/<thread_id>', methods=['DELETE'])
def delete_thread(thread_id):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM threads WHERE id = %s", (thread_id,))
                if cur.rowcount > 0:
                    return '', 204
                else:
                    return jsonify({"error": "Thread not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@threads_crud_bp.route('/api/threads/<thread_id>', methods=['PATCH'])
def update_thread(thread_id):
    data = request.json
    title = data.get('title')
    tags = data.get('tags')

    # Validate inputs
    updates = {}
    if title is not None:
        if not title.strip():
            return jsonify({"error": "Title cannot be empty"}), 400
        updates['title'] = title.strip()

    if tags is not None:
        if not isinstance(tags, list):
            return jsonify({"error": "Tags must be an array"}), 400
        # Clean and validate tags
        clean_tags = [tag.strip() for tag in tags if tag and tag.strip()]
        updates['tags'] = json.dumps(clean_tags)

    if not updates:
        return jsonify({"error": "No valid updates provided"}), 400

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Build dynamic update query
                set_clauses = []
                params = []
                for field, value in updates.items():
                    set_clauses.append(f"{field} = %s")
                    params.append(value)

                set_clauses.append("updated_at = now()")
                params.append(thread_id)

                query = f"""
                    UPDATE threads 
                    SET {', '.join(set_clauses)}
                    WHERE id = %s
                    RETURNING id, title, model_id, tags, created_at, updated_at
                """

                cur.execute(query, params)

                row = cur.fetchone()
                if not row:
                    return jsonify({"error": "Thread not found"}), 404

                # Get message count
                cur.execute("""
                    SELECT COUNT(CASE WHEN role = 'assistant' THEN 1 END)::int AS message_count
                    FROM messages WHERE thread_id = %s
                """, (thread_id,))

                count_row = cur.fetchone()
                message_count = count_row["message_count"] if count_row else 0

                thread = {
                    "id": row["id"],
                    "title": row["title"],
                    "modelId": row["model_id"],
                    "tags": row["tags"] or [],
                    "updatedAt": str(row["updated_at"]) + 'Z' if row["updated_at"] else None,
                    "createdAt": str(row["created_at"]) + 'Z' if row["created_at"] else None,
                    "messageCount": message_count
                }
                return jsonify(thread), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Helper function to save chat messages to thread
def save_chat_to_thread(thread_id, prompt, response, model, metadata=None):
    """Save a chat exchange to a thread with turn numbering"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Check if thread exists
                cur.execute("SELECT id FROM threads WHERE id = %s", (thread_id,))
                if not cur.fetchone():
                    return False

                # Get next turn number for this thread
                cur.execute("""
                    SELECT COALESCE(MAX(turn_number), 0) + 1 as next_turn
                    FROM messages 
                    WHERE thread_id = %s AND is_deleted = false
                """, (thread_id,))

                next_turn = cur.fetchone()['next_turn']

                # Generate shared pair ID for this conversation turn
                pair_id = str(uuid.uuid4())

                # Add user message
                cur.execute("""
                    INSERT INTO messages (thread_id, role, content, turn_number, message_pair_id, is_deleted)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (thread_id, "user", prompt, next_turn, pair_id, False))

                # Add assistant message
                cur.execute("""
                    INSERT INTO messages (thread_id, role, content, model, metadata, turn_number, message_pair_id, is_deleted)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (thread_id, "assistant", response, model, json.dumps(metadata or {}), next_turn, pair_id, False))

                # Update thread updated_at
                cur.execute("""
                    UPDATE threads SET updated_at = now() WHERE id = %s
                """, (thread_id,))

                return True
    except Exception as e:
        print(f"Error saving chat to thread: {e}")
        return False