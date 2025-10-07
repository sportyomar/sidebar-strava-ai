from flask import Blueprint, request, jsonify
import time
from account_blueprint import token_required, get_workspace_provider_credential
from chat_history import build_context
from interactions_blueprint import log_interaction
from workspace_services import (
    get_model_info,
    compute_effective_config,
    verify_workspace_access
)
from llm_blueprint import call_model_provider, normalize_provider
from threads_crud_blueprint import save_chat_to_thread
from threads_utils import get_db_connection, convert_decimals

threads_chat_bp = Blueprint('threads_chat', __name__)


def build_context_text(context_items, documents):
    """Build context text from context items and documents"""
    context_text = ""

    if context_items:
        context_text += "\n=== CONTEXT ===\n"
        for item in context_items:
            title = item.get('title', 'Context item')
            item_type = item.get('type', 'unknown')
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

    return context_text


def build_final_prompt(user_prompt, context_text, intent):
    """Build final prompt with context and intent instructions"""
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
        return context_text + f"\n=== USER REQUEST ===\n{user_prompt}" + intent_instructions
    else:
        return user_prompt


def prepare_model_config(workspace_id, model_id, overrides):
    """Prepare effective configuration for a model"""
    effective = compute_effective_config(workspace_id, model_id)
    effective['workspace_id'] = workspace_id
    for k in ['temperature', 'max_tokens', 'system_prompt', 'tool_choice']:
        if k in overrides and overrides[k] is not None:
            effective[k] = overrides[k]
    return effective


def validate_model_access(workspace_id, model_id):
    """Validate that model is enabled for workspace"""
    from account_blueprint import get_db_connection as get_account_db
    conn_acc = get_account_db()
    try:
        with conn_acc, conn_acc.cursor() as cur:
            cur.execute("""
                SELECT 1 FROM workspace_llms 
                WHERE workspace_id = %s AND model_id = %s
            """, (workspace_id, model_id))
            return cur.fetchone() is not None
    finally:
        conn_acc.close()


def get_provider_credentials(workspace_id, provider):
    """Get provider credentials for workspace"""
    creds = get_workspace_provider_credential(workspace_id, provider)
    if not creds or not creds.get('api_key'):
        return None
    return creds


def hydrate_conversation_history(thread_id, final_prompt, system_prompt):
    """Hydrate conversation history from threads DB"""
    if not thread_id:
        return None

    conn_thr = get_db_connection()
    try:
        with conn_thr:
            hydrated_messages = build_context(
                conn=conn_thr,
                thread_id=thread_id,
                new_user_prompt=final_prompt,
                system_prompt=system_prompt
            )

            # DEBUG: Log conversation context
            print(f"\n=== CONVERSATION DEBUG for thread {thread_id} ===")
            print(f"Number of hydrated messages: {len(hydrated_messages) if hydrated_messages else 0}")

            if hydrated_messages:
                print("\nHydrated messages being sent to LLM:")
                for i, msg in enumerate(hydrated_messages):
                    role = msg.get('role', 'unknown')
                    content = msg.get('content', '')
                    print(f"  {i}: [{role}] {content[:100]}...")

                # Count total tokens roughly
                total_chars = sum(len(msg.get('content', '')) for msg in hydrated_messages)
                estimated_tokens = total_chars // 4
                print(f"Estimated total tokens being sent: {estimated_tokens}")

            # Debug database message count
            with conn_thr.cursor() as cur:
                cur.execute("SELECT COUNT(*) as message_count FROM messages WHERE thread_id = %s", (thread_id,))
                db_message_count = cur.fetchone()['message_count']
                print(f"Messages in database for thread {thread_id}: {db_message_count}")

            print("=== END DEBUG ===\n")
            return hydrated_messages
    finally:
        conn_thr.close()


def call_primary_model(provider, model_id, final_prompt, effective_config, creds, hydrated_messages):
    """Call primary model and return result with latency"""
    start_time = time.time()
    effective_converted = convert_decimals(effective_config)
    result = call_model_provider(provider, model_id, final_prompt, effective_converted, creds,
                                 messages=hydrated_messages)
    latency = (time.time() - start_time) * 1000
    return result, latency


def call_second_opinion_model(second_opinion_config, final_prompt, hydrated_messages):
    """Call second opinion model if configured"""
    if not second_opinion_config:
        return None, 0

    model_id = second_opinion_config['model_id']
    provider = second_opinion_config['provider']
    effective_config = second_opinion_config['effective_config']
    creds = second_opinion_config['creds']

    start_time = time.time()
    result = call_model_provider(
        provider, model_id, final_prompt,
        convert_decimals(effective_config), creds,
        messages=hydrated_messages
    )
    latency = (time.time() - start_time) * 1000
    return result, latency


def prepare_response_metadata(result, provider, context_items, documents, intent, latency):
    """Prepare metadata for response"""
    response_text = result['text'] or ''
    word_count = len(response_text.strip().split()) if response_text.strip() else 0

    return {
        'tokens_used': result.get('usage', {}).get('total_tokens'),
        'latency_seconds': latency / 1000,
        'provider': provider,
        'context_items': len(context_items) + len(documents),
        'intent': intent,
        'word_count': word_count
    }


@threads_chat_bp.route('/api/threads/<int:workspace_id>/chat', methods=['POST'])
@token_required
def chat(current_user_id, workspace_id):
    # Workspace access check
    if not verify_workspace_access(current_user_id, workspace_id):
        return jsonify({'error': 'Workspace not found or access denied'}), 404

    data = request.get_json() or {}
    model_id = data.get('model')
    user_prompt = data.get('prompt', '')
    thread_id = data.get('threadId')
    overrides = data.get('settingsOverride') or {}
    second_opinion = data.get('secondOpinion')

    # Extract context data
    context = data.get('context', {})
    documents = context.get('documents', [])
    context_items = context.get('contextItems', [])
    provided_intent = context.get('intent')

    if provided_intent:
        intent = provided_intent
    else:
        # Auto-classify the intent
        from interactions_blueprint import classify_intent
        intent, confidence, *_ = classify_intent(user_prompt)

    include_history = context.get('includeHistory', True)
    context_mode = context.get('contextMode', 'recent')

    if not model_id or not user_prompt:
        return jsonify({'error': 'model and prompt are required'}), 400

    # Model info and validation
    model_info = get_model_info(model_id, workspace_id)
    if not model_info:
        return jsonify({'error': 'Unknown model'}), 400

    if not validate_model_access(workspace_id, model_id):
        return jsonify({'error': f'Model {model_id} is not enabled for this workspace'}), 403

    # Prepare primary model configuration
    effective = prepare_model_config(workspace_id, model_id, overrides)
    provider = normalize_provider(model_info['provider'])
    creds = get_provider_credentials(workspace_id, provider)

    if not creds:
        return jsonify({'error': f'No {provider} credentials configured for this workspace'}), 400

    # Handle second opinion model if present
    second_model_config = None
    if second_opinion and second_opinion.get('model'):
        second_model_id = second_opinion['model']
        second_model_info = get_model_info(second_model_id, workspace_id)

        if not second_model_info:
            return jsonify({'error': f'Unknown second opinion model: {second_model_id}'}), 400

        if not validate_model_access(workspace_id, second_model_id):
            return jsonify({'error': f'Second opinion model {second_model_id} is not enabled for this workspace'}), 403

        second_effective = prepare_model_config(workspace_id, second_model_id,
                                                second_opinion.get('settingsOverride') or {})
        second_provider = normalize_provider(second_model_info['provider'])
        second_creds = get_provider_credentials(workspace_id, second_provider)

        if not second_creds:
            return jsonify({'error': f'No {second_provider} credentials configured for this workspace'}), 400

        second_model_config = {
            'model_id': second_model_id,
            'provider': second_provider,
            'effective_config': second_effective,
            'creds': second_creds
        }

    # Build context and final prompt
    context_text = build_context_text(context_items, documents)
    final_prompt = build_final_prompt(user_prompt, context_text, intent)

    # Hydrate conversation history
    hydrated_messages = hydrate_conversation_history(thread_id, final_prompt, effective.get('system_prompt'))

    # Call primary model
    result, primary_latency = call_primary_model(provider, model_id, final_prompt, effective, creds, hydrated_messages)

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
                'context_items': len(context_items),
                'documents': len(documents),
                'intent': intent
            }
        }), 200

    # Call second opinion model if configured
    second_result, second_latency = call_second_opinion_model(second_model_config, final_prompt, hydrated_messages)

    # Prepare metadata for primary model
    metadata = prepare_response_metadata(result, provider, context_items, documents, intent, primary_latency)

    # Save primary response to threads DB
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

    # Save second opinion response if present
    if second_result and second_result['success'] and thread_id:
        second_metadata = prepare_response_metadata(second_result, second_model_config['provider'],
                                                    context_items, documents, intent, second_latency)
        save_chat_to_thread(thread_id, user_prompt, second_result['text'] or '',
                            second_model_config['model_id'], second_metadata)

        # Log second opinion interaction
        log_interaction(
            workspace_id=workspace_id,
            user_id=current_user_id,
            thread_id=thread_id,
            prompt=user_prompt,
            response=second_result['text'] or '',
            model=second_model_config['model_id'],
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
            'model': second_model_config['model_id'],
            'latency_ms': second_latency,
            'usage': convert_decimals(second_result.get('usage', {})),
            'effective_config_used': convert_decimals(second_model_config['effective_config'])
        }
    elif second_result and not second_result['success']:
        # If second opinion failed, include error but don't fail the whole request
        response_data['secondOpinion'] = {
            'error': second_result.get('provider_error', 'Second opinion model failed'),
            'model': second_model_config['model_id']
        }

    return jsonify(response_data), 200