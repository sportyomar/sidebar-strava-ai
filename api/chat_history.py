# utils/chat_history.py
from psycopg2.extras import RealDictCursor


def load_thread_messages(conn, thread_id, limit=50):
    """Load recent messages with a limit to prevent massive queries"""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT role, content
            FROM messages
            WHERE thread_id = %s
            ORDER BY created_at DESC
            LIMIT %s
        """, (thread_id, limit))
        rows = cur.fetchall()

    # Reverse to get chronological order (oldest first)
    history = [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]
    return history


def estimate_tokens(text):
    """Rough token estimation: ~4 characters = 1 token"""
    return len(text) // 4


def build_context(conn, thread_id, new_user_prompt, system_prompt=None,
                  prepend_system_if_missing=True, max_tokens=6000):
    """
    Build context with conversation history limits to prevent token overflow.

    Args:
        max_tokens: Maximum total tokens to include (default 6000 for GPT-4)
    """
    msgs = []

    # Add system message first
    if system_prompt:
        msgs.append({"role": "system", "content": system_prompt})
    elif prepend_system_if_missing:
        msgs.append({"role": "system", "content": "You are a helpful assistant."})

    # Load recent message history (limit to prevent massive DB queries)
    history = load_thread_messages(conn, thread_id, limit=100)

    if not history:
        # No conversation history - this is a new conversation
        msgs.append({"role": "user", "content": new_user_prompt})
        return msgs

    # Calculate token budget
    system_tokens = estimate_tokens(msgs[0]["content"]) if msgs else 0
    new_prompt_tokens = estimate_tokens(new_user_prompt)
    buffer_tokens = 500  # Safety buffer for response
    available_tokens = max_tokens - system_tokens - new_prompt_tokens - buffer_tokens

    # Build conversation history within token limit
    current_tokens = 0
    included_history = []

    # Start from most recent and work backwards
    for msg in reversed(history):
        msg_tokens = estimate_tokens(msg["content"])

        # Check if adding this message would exceed our limit
        if current_tokens + msg_tokens > available_tokens:
            break

        # Insert at beginning to maintain chronological order
        included_history.insert(0, msg)
        current_tokens += msg_tokens

    # Build final message array
    msgs.extend(included_history)
    msgs.append({"role": "user", "content": new_user_prompt})

    # Debug info (you can remove this later)
    total_messages = len(included_history) + len(msgs) - len(included_history)  # system + history + new
    total_estimated_tokens = system_tokens + current_tokens + new_prompt_tokens
    print(f"Context built: {len(included_history)} history messages, ~{total_estimated_tokens} tokens")

    return msgs


def build_context_smart_truncation(conn, thread_id, new_user_prompt, system_prompt=None,
                                   max_tokens=6000, keep_recent_pairs=10):
    """
    Alternative: Keep recent conversation pairs (user + assistant) intact
    """
    msgs = []

    # Add system message
    if system_prompt:
        msgs.append({"role": "system", "content": system_prompt})
    else:
        msgs.append({"role": "system", "content": "You are a helpful assistant."})

    # Load messages
    history = load_thread_messages(conn, thread_id, limit=keep_recent_pairs * 2)

    if not history:
        msgs.append({"role": "user", "content": new_user_prompt})
        return msgs

    # Group into conversation pairs and keep recent ones
    pairs = []
    i = 0
    while i < len(history) - 1:
        if history[i]["role"] == "user" and history[i + 1]["role"] == "assistant":
            pairs.append([history[i], history[i + 1]])
            i += 2
        else:
            i += 1

    # Keep most recent pairs that fit in token budget
    system_tokens = estimate_tokens(msgs[0]["content"])
    new_prompt_tokens = estimate_tokens(new_user_prompt)
    available_tokens = max_tokens - system_tokens - new_prompt_tokens - 500

    current_tokens = 0
    included_pairs = []

    for pair in reversed(pairs):
        pair_tokens = estimate_tokens(pair[0]["content"]) + estimate_tokens(pair[1]["content"])
        if current_tokens + pair_tokens > available_tokens:
            break
        included_pairs.insert(0, pair)
        current_tokens += pair_tokens

    # Add included pairs to messages
    for pair in included_pairs:
        msgs.extend(pair)

    msgs.append({"role": "user", "content": new_user_prompt})
    return msgs