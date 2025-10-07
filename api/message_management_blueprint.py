from flask import Blueprint, request, jsonify
from datetime import datetime
import uuid
import psycopg2
from psycopg2.extras import RealDictCursor
import json

message_management_api = Blueprint('message_management_api', __name__)

# Database connection (same as threads_api)
DB_CONFIG = {
    'host': 'localhost',
    'database': 'threads_db',
    'user': 'sporty',
    'password': 'TqKwifr5jtJ6'
}


def get_db_connection():
    return psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)


# -------------------------
# BULK OPERATIONS
# -------------------------

@message_management_api.route('/api/threads/<thread_id>/messages/bulk', methods=['GET'])
def get_messages_with_turns(thread_id):
    """Get messages with detailed turn information for bulk operations"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Check if thread exists
                cur.execute("SELECT id FROM threads WHERE id = %s", (thread_id,))
                if not cur.fetchone():
                    return jsonify({"error": "Thread not found"}), 404

                # Get all messages with turn data
                cur.execute("""
                    SELECT id, role, content, model, metadata, created_at, 
                           turn_number, message_pair_id, is_deleted
                    FROM messages
                    WHERE thread_id = %s
                    ORDER BY turn_number ASC, created_at ASC
                """, (thread_id,))

                messages = cur.fetchall()
                turn_data = []

                # Group by turn number
                turns = {}
                for msg in messages:
                    turn_num = msg["turn_number"]
                    if turn_num not in turns:
                        turns[turn_num] = {"user": None, "assistant": None}
                    turns[turn_num][msg["role"]] = msg

                # Format for bulk operations UI
                for turn_num in sorted(turns.keys()):
                    turn = turns[turn_num]
                    user_msg = turn["user"]
                    assistant_msg = turn["assistant"]

                    turn_data.append({
                        "turnNumber": turn_num,
                        "messagePairId": user_msg["message_pair_id"] if user_msg else assistant_msg["message_pair_id"],
                        "isDeleted": (user_msg and user_msg["is_deleted"]) or (
                                    assistant_msg and assistant_msg["is_deleted"]),
                        "user": {
                            "id": user_msg["id"] if user_msg else None,
                            "content": user_msg["content"] if user_msg else None,
                            "createdAt": user_msg["created_at"].isoformat() + 'Z' if user_msg else None,
                            "isDeleted": user_msg["is_deleted"] if user_msg else True
                        } if user_msg else None,
                        "assistant": {
                            "id": assistant_msg["id"] if assistant_msg else None,
                            "content": assistant_msg["content"] if assistant_msg else None,
                            "model": assistant_msg["model"] if assistant_msg else None,
                            "metadata": assistant_msg["metadata"] if assistant_msg else {},
                            "createdAt": assistant_msg["created_at"].isoformat() + 'Z' if assistant_msg else None,
                            "isDeleted": assistant_msg["is_deleted"] if assistant_msg else True
                        } if assistant_msg else None
                    })

                return jsonify(turn_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@message_management_api.route('/api/threads/<thread_id>/messages/bulk', methods=['DELETE'])
def bulk_delete_turns(thread_id):
    """Soft delete multiple turns"""
    data = request.get_json() or {}
    turn_numbers = data.get('turnNumbers', [])

    if not turn_numbers:
        return jsonify({"error": "turnNumbers array is required"}), 400

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Check if thread exists
                cur.execute("SELECT id FROM threads WHERE id = %s", (thread_id,))
                if not cur.fetchone():
                    return jsonify({"error": "Thread not found"}), 404

                # Soft delete messages for specified turns
                cur.execute("""
                    UPDATE messages 
                    SET is_deleted = true, updated_at = now()
                    WHERE thread_id = %s AND turn_number = ANY(%s)
                """, (thread_id, turn_numbers))

                deleted_count = cur.rowcount

                # Update thread timestamp
                cur.execute("UPDATE threads SET updated_at = now() WHERE id = %s", (thread_id,))

                return jsonify({
                    "success": True,
                    "deletedTurns": turn_numbers,
                    "messagesAffected": deleted_count
                })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@message_management_api.route('/api/threads/<thread_id>/messages/bulk/restore', methods=['POST'])
def bulk_restore_turns(thread_id):
    """Restore soft-deleted turns"""
    data = request.get_json() or {}
    turn_numbers = data.get('turnNumbers', [])

    if not turn_numbers:
        return jsonify({"error": "turnNumbers array is required"}), 400

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Check if thread exists
                cur.execute("SELECT id FROM threads WHERE id = %s", (thread_id,))
                if not cur.fetchone():
                    return jsonify({"error": "Thread not found"}), 404

                # Restore messages for specified turns
                cur.execute("""
                    UPDATE messages 
                    SET is_deleted = false, updated_at = now()
                    WHERE thread_id = %s AND turn_number = ANY(%s) AND is_deleted = true
                """, (thread_id, turn_numbers))

                restored_count = cur.rowcount

                # Update thread timestamp
                cur.execute("UPDATE threads SET updated_at = now() WHERE id = %s", (thread_id,))

                return jsonify({
                    "success": True,
                    "restoredTurns": turn_numbers,
                    "messagesAffected": restored_count
                })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@message_management_api.route('/api/threads/<thread_id>/messages/bulk/edit', methods=['PATCH'])
def bulk_edit_turns(thread_id):
    """Edit content of multiple turns"""
    data = request.get_json() or {}
    edits = data.get('edits', [])  # [{"turnNumber": 1, "role": "user", "content": "new content"}]

    if not edits:
        return jsonify({"error": "edits array is required"}), 400

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Check if thread exists
                cur.execute("SELECT id FROM threads WHERE id = %s", (thread_id,))
                if not cur.fetchone():
                    return jsonify({"error": "Thread not found"}), 404

                updated_messages = []

                # Process each edit
                for edit in edits:
                    turn_number = edit.get('turnNumber')
                    role = edit.get('role')
                    new_content = edit.get('content')

                    if not all([turn_number, role, new_content]):
                        continue

                    # Update the specific message
                    cur.execute("""
                        UPDATE messages 
                        SET content = %s, updated_at = now()
                        WHERE thread_id = %s AND turn_number = %s AND role = %s AND is_deleted = false
                        RETURNING id
                    """, (new_content, thread_id, turn_number, role))

                    result = cur.fetchone()
                    if result:
                        updated_messages.append({
                            "messageId": result["id"],
                            "turnNumber": turn_number,
                            "role": role
                        })

                # Update thread timestamp
                cur.execute("UPDATE threads SET updated_at = now() WHERE id = %s", (thread_id,))

                return jsonify({
                    "success": True,
                    "updatedMessages": updated_messages
                })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@message_management_api.route('/api/threads/<thread_id>/messages/export', methods=['POST'])
def export_selected_turns(thread_id):
    """Export selected turns in various formats"""
    data = request.get_json() or {}
    turn_numbers = data.get('turnNumbers', [])
    format_type = data.get('format', 'json')  # json, markdown, csv

    if not turn_numbers:
        return jsonify({"error": "turnNumbers array is required"}), 400

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Check if thread exists
                cur.execute("SELECT id, title FROM threads WHERE id = %s", (thread_id,))
                thread = cur.fetchone()
                if not thread:
                    return jsonify({"error": "Thread not found"}), 404

                # Get selected turns
                cur.execute("""
                    SELECT role, content, model, metadata, created_at, turn_number
                    FROM messages
                    WHERE thread_id = %s AND turn_number = ANY(%s) AND is_deleted = false
                    ORDER BY turn_number ASC, created_at ASC
                """, (thread_id, turn_numbers))

                messages = cur.fetchall()

                # Group by turns
                turns = {}
                for msg in messages:
                    turn_num = msg["turn_number"]
                    if turn_num not in turns:
                        turns[turn_num] = {"user": None, "assistant": None}
                    turns[turn_num][msg["role"]] = msg

                if format_type == 'markdown':
                    # Generate markdown format
                    md_content = f"# {thread['title']}\n\n"
                    for turn_num in sorted(turns.keys()):
                        turn = turns[turn_num]
                        if turn["user"]:
                            md_content += f"## Turn [{turn_num}]\n\n**User:**\n{turn['user']['content']}\n\n"
                        if turn["assistant"]:
                            md_content += f"**Assistant ({turn['assistant']['model']}):**\n{turn['assistant']['content']}\n\n"

                    return jsonify({
                        "success": True,
                        "format": "markdown",
                        "content": md_content,
                        "filename": f"{thread['title']}_turns_{'-'.join(map(str, sorted(turn_numbers)))}.md"
                    })

                elif format_type == 'json':
                    # Generate JSON format
                    export_data = {
                        "thread": {
                            "id": thread_id,
                            "title": thread['title']
                        },
                        "turns": []
                    }

                    for turn_num in sorted(turns.keys()):
                        turn = turns[turn_num]
                        export_data["turns"].append({
                            "turnNumber": turn_num,
                            "user": {
                                "content": turn["user"]["content"],
                                "createdAt": turn["user"]["created_at"].isoformat() + 'Z'
                            } if turn["user"] else None,
                            "assistant": {
                                "content": turn["assistant"]["content"],
                                "model": turn["assistant"]["model"],
                                "metadata": turn["assistant"]["metadata"],
                                "createdAt": turn["assistant"]["created_at"].isoformat() + 'Z'
                            } if turn["assistant"] else None
                        })

                    return jsonify({
                        "success": True,
                        "format": "json",
                        "data": export_data,
                        "filename": f"{thread['title']}_turns_{'-'.join(map(str, sorted(turn_numbers)))}.json"
                    })

                else:
                    return jsonify({"error": f"Unsupported format: {format_type}"}), 400

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@message_management_api.route('/api/threads/<thread_id>/messages/reorder', methods=['POST'])
def reorder_turns(thread_id):
    """Reorder turn sequence"""
    data = request.get_json() or {}
    new_order = data.get('newOrder', [])  # [{"currentTurn": 3, "newTurn": 1}, ...]

    if not new_order:
        return jsonify({"error": "newOrder array is required"}), 400

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Check if thread exists
                cur.execute("SELECT id FROM threads WHERE id = %s", (thread_id,))
                if not cur.fetchone():
                    return jsonify({"error": "Thread not found"}), 404

                # Use a transaction for consistency
                for reorder in new_order:
                    current_turn = reorder.get('currentTurn')
                    new_turn = reorder.get('newTurn')

                    if current_turn and new_turn and current_turn != new_turn:
                        # Update turn number for all messages in this turn
                        cur.execute("""
                            UPDATE messages 
                            SET turn_number = %s, updated_at = now()
                            WHERE thread_id = %s AND turn_number = %s
                        """, (new_turn, thread_id, current_turn))

                # Update thread timestamp
                cur.execute("UPDATE threads SET updated_at = now() WHERE id = %s", (thread_id,))

                return jsonify({
                    "success": True,
                    "reorderedTurns": len(new_order)
                })

    except Exception as e:
        return jsonify({"error": str(e)}), 500