from flask import Blueprint, request, jsonify
from datetime import datetime
import uuid
import psycopg2
from psycopg2.extras import RealDictCursor
from account_blueprint import token_required, get_workspace_provider_credential
from chat_history import build_context
from interactions_blueprint import log_interaction
from workspace_services import (
    get_model_info,
    compute_effective_config,
    verify_workspace_access
)
from llm_blueprint import call_model_provider, normalize_provider
import json

threads_api = Blueprint('threads_api', __name__)

from decimal import Decimal

def convert_decimals(obj):
    """Recursively convert Decimal objects to float"""
    if isinstance(obj, dict):
        return {k: convert_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_decimals(item) for item in obj]
    elif isinstance(obj, Decimal):
        return float(obj)
    return obj

# Database connection
DB_CONFIG = {
    'host': 'localhost',
    'database': 'threads_db',
    'user': 'sporty',
    'password': 'TqKwifr5jtJ6'
}


def get_db_connection():
    return psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)


def now():
    return datetime.utcnow().isoformat() + 'Z'


# -------------------------
# ROUTES
# -------------------------

@threads_api.route('/api/threads', methods=['POST'])
def create_thread():
    data = request.json
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                thread_id = str(uuid.uuid4())
                cur.execute("""
                    INSERT INTO threads (id, title, model_id)
                    VALUES (%s, %s, %s)
                    RETURNING id, title, model_id, created_at, updated_at
                """, (thread_id, data.get("title", "Untitled Thread"), data.get("modelId", "unknown")))

                row = cur.fetchone()
                thread = {
                    "id": row["id"],
                    "title": row["title"],
                    "modelId": row["model_id"],
                    "updatedAt": str(row["updated_at"]) + 'Z' if row["updated_at"] else None,
                    "createdAt": str(row["created_at"]) + 'Z' if row["created_at"] else None,
                    "messageCount": 0
                }
                return jsonify(thread), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@threads_api.route('/api/threads', methods=['GET'])
def list_threads():
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT t.id, t.title, t.model_id, t.created_at, t.updated_at,
                           COUNT(CASE WHEN m.role = 'assistant' THEN 1 END)::int AS message_count
                    FROM threads t
                    LEFT JOIN messages m ON m.thread_id = t.id
                    GROUP BY t.id, t.title, t.model_id, t.created_at, t.updated_at
                    ORDER BY t.updated_at DESC
                """)

                threads = []
                for row in cur.fetchall():
                    threads.append({
                        "id": row["id"],
                        "title": row["title"],
                        "modelId": row["model_id"],
                        "updatedAt": str(row["updated_at"]) + 'Z' if row["updated_at"] else None,
                        "createdAt": str(row["created_at"]) + 'Z' if row["created_at"] else None,
                        "messageCount": row["message_count"]
                    })
                return jsonify(threads)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@threads_api.route('/api/threads/<thread_id>', methods=['GET'])
def get_thread(thread_id):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT t.id, t.title, t.model_id, t.created_at, t.updated_at,
                           COUNT(CASE WHEN m.role = 'assistant' THEN 1 END)::int AS message_count
                    FROM threads t
                    LEFT JOIN messages m ON m.thread_id = t.id
                    WHERE t.id = %s
                    GROUP BY t.id, t.title, t.model_id, t.created_at, t.updated_at
                """, (thread_id,))

                row = cur.fetchone()
                if not row:
                    return jsonify({"error": "Thread not found"}), 404

                thread = {
                    "id": row["id"],
                    "title": row["title"],
                    "modelId": row["model_id"],
                    "updatedAt": str(row["updated_at"]) + 'Z' if row["updated_at"] else None,
                    "createdAt": str(row["created_at"]) + 'Z' if row["created_at"] else None,
                    "messageCount": row["message_count"]
                }
                return jsonify(thread)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@threads_api.route('/api/threads/<thread_id>/messages', methods=['GET'])
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

                # DEBUG: Log raw database results
                print(f"\n=== DEBUG get_thread_messages for thread {thread_id} ===")
                print(f"Raw messages from DB: {len(messages)} messages")

                for i, msg in enumerate(messages):
                    if msg["role"] == "assistant" and "Basic Components" in msg["content"]:
                        print(f"\n--- RAW DB MESSAGE {i} ---")
                        print(f"Role: {msg['role']}")
                        print(f"Turn: {msg['turn_number']}")
                        print(f"Content (first 300 chars): {repr(msg['content'][:300])}")
                        print(f"Content type: {type(msg['content'])}")

                        # Check for specific numbering patterns
                        if "1. Basic Components" in msg["content"]:
                            print("✓ Found '1. Basic Components'")
                        if "2. Types of Systems" in msg["content"]:
                            print("✓ Found '2. Types of Systems'")
                        if "8. Types of Systems" in msg["content"]:
                            print("❌ Found WRONG '8. Types of Systems'")

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

                        # DEBUG: Log processed message content
                        if "Basic Components" in assistant_msg["content"]:
                            print(f"\n--- PROCESSED MESSAGE for turn {turn_num} ---")
                            print(f"Response content (first 300 chars): {repr(processed_message['response'][:300])}")

                            # Check for specific numbering patterns in processed content
                            if "1. Basic Components" in processed_message["response"]:
                                print("✓ Processed: Found '1. Basic Components'")
                            if "2. Types of Systems" in processed_message["response"]:
                                print("✓ Processed: Found '2. Types of Systems'")
                            if "8. Types of Systems" in processed_message["response"]:
                                print("❌ Processed: Found WRONG '8. Types of Systems'")

                        chat_messages.append(processed_message)

                # DEBUG: Log final JSON structure before returning
                print(f"\n--- FINAL CHAT_MESSAGES BEFORE JSONIFY ---")
                print(f"Total chat messages: {len(chat_messages)}")

                for i, chat_msg in enumerate(chat_messages):
                    if "Basic Components" in chat_msg.get("response", ""):
                        print(f"\nFinal message {i}:")
                        print(f"Response preview: {repr(chat_msg['response'][:200])}")

                # Convert to JSON and back to see if jsonify changes anything
                import json
                json_str = json.dumps(chat_messages, default=str)
                parsed_back = json.loads(json_str)

                for i, parsed_msg in enumerate(parsed_back):
                    if "Basic Components" in parsed_msg.get("response", ""):
                        print(f"\nAfter JSON serialization {i}:")
                        print(f"Response preview: {repr(parsed_msg['response'][:200])}")

                print("=== END DEBUG ===\n")

                return jsonify(chat_messages)
    except Exception as e:
        print(f"ERROR in get_thread_messages: {str(e)}")
        return jsonify({"error": str(e)}), 500


@threads_api.route('/api/threads/<thread_id>', methods=['DELETE'])
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

import time


@threads_api.route('/api/threads/<int:workspace_id>/chat', methods=['POST'])
@token_required
def chat(current_user_id, workspace_id):
    # Workspace access check (account DB)
    if not verify_workspace_access(current_user_id, workspace_id):
        return jsonify({'error': 'Workspace not found or access denied'}), 404

    data = request.get_json() or {}
    model_id = data.get('model')
    user_prompt = data.get('prompt', '')
    thread_id = data.get('threadId')
    overrides = data.get('settingsOverride') or {}
    second_opinion = data.get('secondOpinion')  # Existing field

    # NEW: Extract context data
    context = data.get('context', {})
    documents = context.get('documents', [])
    context_items = context.get('contextItems', [])  # CHANGED: codeItems -> contextItems
    # intent = context.get('intent', 'chat')
    provided_intent = context.get('intent')
    if provided_intent:
        intent = provided_intent
    else:
        # Auto-classify the intent - handle multiple return values
        from interactions_blueprint import classify_intent
        intent, confidence, *_ = classify_intent(user_prompt)
    include_history = context.get('includeHistory', True)
    context_mode = context.get('contextMode', 'recent')

    if not model_id or not user_prompt:
        return jsonify({'error': 'model and prompt are required'}), 400

    # Model info from account/workspace DB
    model_info = get_model_info(model_id, workspace_id)
    if not model_info:
        return jsonify({'error': 'Unknown model'}), 400

    # Ensure model is enabled for workspace (account DB)
    from account_blueprint import get_db_connection as get_account_db
    conn_acc = get_account_db()
    try:
        with conn_acc, conn_acc.cursor() as cur:
            cur.execute("""
                SELECT 1 FROM workspace_llms 
                WHERE workspace_id = %s AND model_id = %s
            """, (workspace_id, model_id))
            if not cur.fetchone():
                return jsonify({'error': f'Model {model_id} is not enabled for this workspace'}), 403
    finally:
        conn_acc.close()

    # Effective config for primary model
    effective = compute_effective_config(workspace_id, model_id)
    effective['workspace_id'] = workspace_id
    for k in ['temperature', 'max_tokens', 'system_prompt', 'tool_choice']:
        if k in overrides and overrides[k] is not None:
            effective[k] = overrides[k]

    provider = normalize_provider(model_info['provider'])
    creds = get_workspace_provider_credential(workspace_id, provider)
    if not creds or not creds.get('api_key'):
        return jsonify({'error': f'No {provider} credentials configured for this workspace'}), 400

    # Handle second opinion model if present
    second_model_info = None
    second_effective = None
    second_provider = None
    second_creds = None

    if second_opinion and second_opinion.get('model'):
        second_model_id = second_opinion['model']
        second_model_info = get_model_info(second_model_id, workspace_id)

        if not second_model_info:
            return jsonify({'error': f'Unknown second opinion model: {second_model_id}'}), 400

        # Check if second model is enabled
        conn_acc = get_account_db()
        try:
            with conn_acc, conn_acc.cursor() as cur:
                cur.execute("""
                    SELECT 1 FROM workspace_llms 
                    WHERE workspace_id = %s AND model_id = %s
                """, (workspace_id, second_model_id))
                if not cur.fetchone():
                    return jsonify(
                        {'error': f'Second opinion model {second_model_id} is not enabled for this workspace'}), 403
        finally:
            conn_acc.close()

        # Effective config for second model
        second_effective = compute_effective_config(workspace_id, second_model_id)
        second_effective['workspace_id'] = workspace_id
        second_overrides = second_opinion.get('settingsOverride') or {}
        for k in ['temperature', 'max_tokens', 'system_prompt', 'tool_choice']:
            if k in second_overrides and second_overrides[k] is not None:
                second_effective[k] = second_overrides[k]

        second_provider = normalize_provider(second_model_info['provider'])
        second_creds = get_workspace_provider_credential(workspace_id, second_provider)
        if not second_creds or not second_creds.get('api_key'):
            return jsonify({'error': f'No {second_provider} credentials configured for this workspace'}), 400

    # NEW: Build context text from context items and documents
    context_text = ""

    if context_items:  # CHANGED: code_items -> context_items
        context_text += "\n=== CONTEXT ===\n"  # CHANGED: More generic header
        for item in context_items:  # CHANGED: code_items -> context_items
            title = item.get('title', 'Context item')  # CHANGED: Generic default title
            item_type = item.get('type', 'unknown')  # NEW: Handle different item types
            language = item.get('language', '')
            content = item.get('content', '')

            context_text += f"\n**{title}**"

            # Handle different item types
            if item_type == 'code':
                if language:
                    context_text += f" ({language})"
                context_text += ":\n"
                # Add code block with language for syntax highlighting
                if language:
                    context_text += f"```{language}\n{content}\n```\n"
                else:
                    context_text += f"```\n{content}\n```\n"
            elif item_type == 'image':
                context_text += f" (Image - {item.get('preview', 'No preview')})"
                context_text += ":\n"
                # For images, include analysis if available
                if item.get('analysis'):
                    context_text += f"Image analysis: {item['analysis']}\n"
            else:
                # Generic context item
                context_text += ":\n"
                context_text += f"{content}\n"

    if documents:
        context_text += "\n=== DOCUMENT CONTEXT ===\n"
        for doc in documents:
            # Skip if doc is not a dict (probably an ID)
            if not isinstance(doc, dict):
                continue

            doc_name = doc.get('name', 'Document')
            doc_content = doc.get('content', '')
            context_text += f"\n**{doc_name}**:\n{doc_content}\n"

    # NEW: Build final prompt with context
    if context_text:
        # Add intent-specific instructions
        intent_instructions = ""
        if intent == 'analyze':
            intent_instructions = "\n\nPlease analyze the provided context and answer the user's question with detailed analysis."
        elif intent == 'summarize':
            intent_instructions = "\n\nPlease provide a clear summary based on the context provided."
        elif intent == 'create':
            intent_instructions = "\n\nPlease create or generate content based on the context and user request."

        # Build the final prompt
        final_prompt = context_text + f"\n=== USER REQUEST ===\n{user_prompt}" + intent_instructions
    else:
        final_prompt = user_prompt

    # Hydrate history from threads DB
    hydrated_messages = None
    if thread_id:
        conn_thr = get_db_connection()  # threads DB
        try:
            with conn_thr:
                hydrated_messages = build_context(
                    conn=conn_thr,
                    thread_id=thread_id,
                    new_user_prompt=final_prompt,
                    system_prompt=effective.get('system_prompt')
                )

                # DEBUG: Log what we're sending to the LLM
                print(f"\n=== CONVERSATION DEBUG for thread {thread_id} ===")
                print(f"Thread ID: {thread_id}")
                print(f"User prompt (original): {user_prompt}")
                print(f"Final prompt (with context): {final_prompt[:200]}...")
                print(f"Number of hydrated messages: {len(hydrated_messages) if hydrated_messages else 0}")

                if hydrated_messages:
                    print("\nHydrated messages being sent to LLM:")
                    for i, msg in enumerate(hydrated_messages):
                        role = msg.get('role', 'unknown')
                        content = msg.get('content', '')
                        print(f"  {i}: [{role}] {content[:100]}...")
                else:
                    print("  No hydrated messages found!")

                # Count total tokens roughly
                total_chars = sum(len(msg.get('content', '')) for msg in hydrated_messages) if hydrated_messages else 0
                estimated_tokens = total_chars // 4
                print(f"Estimated total tokens being sent: {estimated_tokens}")

                # Also debug the thread lookup in database
                with conn_thr.cursor() as cur:
                    cur.execute("SELECT COUNT(*) as message_count FROM messages WHERE thread_id = %s", (thread_id,))
                    db_message_count = cur.fetchone()['message_count']
                    print(f"Messages in database for thread {thread_id}: {db_message_count}")

                    if db_message_count > 0:
                        cur.execute("""
                            SELECT role, LEFT(content, 50) as preview, created_at 
                            FROM messages WHERE thread_id = %s 
                            ORDER BY created_at ASC LIMIT 10
                        """, (thread_id,))
                        db_messages = cur.fetchall()
                        print("Recent messages in database:")
                        for msg in db_messages:
                            print(f"  DB: [{msg['role']}] {msg['preview']}... ({msg['created_at']})")

                print("=== END DEBUG ===\n")
        finally:
            conn_thr.close()

    # Call primary model - convert decimals before passing to provider
    start_time = time.time()
    effective_converted = convert_decimals(effective)
    result = call_model_provider(provider, model_id, final_prompt, effective_converted, creds,
                                 messages=hydrated_messages)
    primary_latency = (time.time() - start_time) * 1000

    if not result['success']:
        return jsonify({
            'success': False,
            'response': '',
            'model': model_id,
            'latency_ms': primary_latency,
            'usage': result.get('usage', {}),
            'provider_error': result['provider_error'],
            'effective_config_used': convert_decimals(effective),
            'context_info': {
                'context_items': len(context_items),  # CHANGED: code_items -> context_items
                'documents': len(documents),
                'intent': intent
            }
        }), 200

    # Call second opinion model if configured
    second_result = None
    second_latency = 0
    if second_model_info:
        second_start = time.time()
        # Use same hydrated messages and final_prompt for consistency
        second_result = call_model_provider(
            second_provider,
            second_opinion['model'],
            final_prompt,  # Use final_prompt instead of user_prompt
            convert_decimals(second_effective),  # Convert decimals here too
            second_creds,
            messages=hydrated_messages
        )
        second_latency = (time.time() - second_start) * 1000

    # Prepare metadata for primary model with word count
    response_text = result['text'] or ''
    word_count = len(response_text.strip().split()) if response_text.strip() else 0

    metadata = {
        'tokens_used': result.get('usage', {}).get('total_tokens'),
        'latency_seconds': primary_latency / 1000,
        'provider': provider,
        'context_items': len(context_items) + len(documents),  # CHANGED: code_items -> context_items
        'intent': intent,
        'word_count': word_count
    }

    # Save primary response to threads DB (save original user_prompt, not final_prompt)
    if thread_id:
        if not save_chat_to_thread(thread_id, user_prompt, result['text'] or '', model_id, metadata):
            return jsonify({'success': False, 'error': 'Thread not found'}), 404

        # Log interaction for analytics
    log_interaction(
        workspace_id=workspace_id,
        user_id=current_user_id,
        thread_id=thread_id,
        prompt=user_prompt,
        response=result['text'] or '',
        model=model_id,
        intent=intent,
        latency_ms=int(primary_latency),
        tokens_used=result.get('usage', {}).get('total_tokens'),
        context_items_count=len(context_items) + len(documents),
        metadata=metadata
    )

    # Save second opinion response if present with word count
    if second_result and second_result['success'] and thread_id:
        second_response_text = second_result['text'] or ''
        second_word_count = len(second_response_text.strip().split()) if second_response_text.strip() else 0

        second_metadata = {
            'tokens_used': second_result.get('usage', {}).get('total_tokens'),
            'latency_seconds': second_latency / 1000,
            'provider': second_provider,
            'context_items': len(context_items) + len(documents),  # CHANGED: code_items -> context_items
            'intent': intent,
            'word_count': second_word_count
        }
        save_chat_to_thread(thread_id, user_prompt, second_result['text'] or '', second_opinion['model'],
                            second_metadata)

        # Log second opinion interaction
        log_interaction(
            workspace_id=workspace_id,
            user_id=current_user_id,
            thread_id=thread_id,
            prompt=user_prompt,
            response=second_result['text'] or '',
            model=second_opinion['model'],
            intent=intent,
            latency_ms=int(second_latency),
            tokens_used=second_result.get('usage', {}).get('total_tokens'),
            context_items_count=len(context_items) + len(documents),
            metadata=second_metadata
        )

    # Prepare response
    response_data = {
        'success': True,
        'response': result['text'] or '',
        'model': model_id,
        'latency_ms': primary_latency,
        'usage': convert_decimals(result.get('usage', {})),
        'effective_config_used': convert_decimals(effective),
        'context_info': {
            'context_items': len(context_items),
            'documents': len(documents),
            'intent': intent,
            'include_history': include_history,
            'context_mode': context_mode
        }
    }

    # Add second opinion to response if present
    if second_result and second_result['success']:
        response_data['secondOpinion'] = {
            'response': second_result['text'] or '',
            'model': second_opinion['model'],
            'latency_ms': second_latency,
            'usage': convert_decimals(second_result.get('usage', {})),
            'effective_config_used': convert_decimals(second_effective)
        }
    elif second_result and not second_result['success']:
        # If second opinion failed, include error but don't fail the whole request
        response_data['secondOpinion'] = {
            'error': second_result.get('provider_error', 'Second opinion model failed'),
            'model': second_opinion['model']
        }

    return jsonify(response_data), 200

@threads_api.route('/api/threads/<thread_id>', methods=['PATCH'])
def update_thread(thread_id):
    data = request.json
    title = data.get('title')

    if not title or not title.strip():
        return jsonify({"error": "Title is required"}), 400

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE threads 
                    SET title = %s, updated_at = now() 
                    WHERE id = %s
                    RETURNING id, title, model_id, created_at, updated_at
                """, (title.strip(), thread_id))

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
                    "updatedAt": str(row["updated_at"]) + 'Z' if row["updated_at"] else None,
                    "createdAt": str(row["created_at"]) + 'Z' if row["created_at"] else None,
                    "messageCount": message_count
                }
                return jsonify(thread), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500