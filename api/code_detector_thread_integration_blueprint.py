from flask import Blueprint, request, jsonify
import time
import json
from decimal import Decimal

# Import from existing blueprints
from react_code_detector_blueprint import detect_react_patterns
from account_blueprint import token_required, get_workspace_provider_credential
from chat_history import build_context
from interactions_blueprint import log_interaction, classify_intent
from workspace_services import get_model_info, compute_effective_config, verify_workspace_access
from llm_blueprint import call_model_provider, normalize_provider

# Import thread functions
from threads_crud_blueprint import save_chat_to_thread
from threads_utils import get_db_connection

code_detector_thread_integration_api = Blueprint('code_detector_thread_integration_api', __name__)


def enhance_response_with_code_detection(response_text, model_id, original_metadata=None):
    """
    Enhance a chat response with code detection analysis

    Args:
        response_text (str): The LLM response text
        model_id (str): Model that generated the response
        original_metadata (dict): Existing metadata to enhance

    Returns:
        dict: Enhanced metadata with code detection results
    """
    if not response_text:
        return original_metadata or {}

    # Run code detection
    code_detection = detect_react_patterns(response_text)

    # Enhance metadata
    enhanced_metadata = original_metadata.copy() if original_metadata else {}
    enhanced_metadata['code_detection'] = code_detection

    # Add code analysis summary
    enhanced_metadata['code_analysis'] = {
        'has_code': code_detection['hasReactCode'],
        'confidence': code_detection['confidence'],
        'total_patterns': len(code_detection['patterns']),
        'code_blocks_found': len(code_detection['codeBlocks'])
    }

    return enhanced_metadata


def save_enhanced_chat_to_thread(thread_id, prompt, response, model, base_metadata, code_detection):
    """
    Save chat with enhanced code detection metadata
    """
    # Combine base metadata with code detection
    enhanced_metadata = base_metadata.copy() if base_metadata else {}
    enhanced_metadata['code_detection'] = code_detection

    return save_chat_to_thread(thread_id, prompt, response, model, enhanced_metadata)


@code_detector_thread_integration_api.route('/api/threads/<int:workspace_id>/chat/detect', methods=['POST'])
@token_required
def enhanced_chat(current_user_id, workspace_id):
    """
    Enhanced chat endpoint with code detection integration
    Mirrors the original chat endpoint but adds code detection
    """
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
        # Auto-classify the intent - handle multiple return values
        intent_result = classify_intent(user_prompt)
        if isinstance(intent_result, tuple):
            intent = intent_result[0]  # Take first value (intent)
        else:
            intent = intent_result

    include_history = context.get('includeHistory', True)
    context_mode = context.get('contextMode', 'recent')

    if not model_id or not user_prompt:
        return jsonify({'error': 'model and prompt are required'}), 400

    # Model validation (reuse existing logic)
    model_info = get_model_info(model_id, workspace_id)
    if not model_info:
        return jsonify({'error': 'Unknown model'}), 400

    # Check model is enabled for workspace
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

    # Build effective config
    effective = compute_effective_config(workspace_id, model_id)
    effective['workspace_id'] = workspace_id
    for k in ['temperature', 'max_tokens', 'system_prompt', 'tool_choice']:
        if k in overrides and overrides[k] is not None:
            effective[k] = overrides[k]

    provider = normalize_provider(model_info['provider'])
    creds = get_workspace_provider_credential(workspace_id, provider)
    if not creds or not creds.get('api_key'):
        return jsonify({'error': f'No {provider} credentials configured for this workspace'}), 400

    # Build context text
    context_text = ""
    if context_items:
        context_text += "\n=== CONTEXT ===\n"
        for item in context_items:
            title = item.get('title', 'Context item')
            item_type = item.get('type', 'unknown')
            language = item.get('language', '')
            content = item.get('content', '')

            context_text += f"\n**{title}**"
            if item_type == 'code':
                if language:
                    context_text += f" ({language})"
                context_text += ":\n"
                if language:
                    context_text += f"```{language}\n{content}\n```\n"
                else:
                    context_text += f"```\n{content}\n```\n"
            else:
                context_text += ":\n"
                context_text += f"{content}\n"

    if documents:
        context_text += "\n=== DOCUMENT CONTEXT ===\n"
        for doc in documents:
            if not isinstance(doc, dict):
                continue
            doc_name = doc.get('name', 'Document')
            doc_content = doc.get('content', '')
            context_text += f"\n**{doc_name}**:\n{doc_content}\n"

    # Build final prompt
    if context_text:
        intent_instructions = ""
        if intent == 'analyze':
            intent_instructions = "\n\nPlease analyze the provided context and answer the user's question with detailed analysis."
        elif intent == 'summarize':
            intent_instructions = "\n\nPlease provide a clear summary based on the context provided."
        elif intent == 'create':
            intent_instructions = "\n\nPlease create or generate content based on the context and user request."

        final_prompt = context_text + f"\n=== USER REQUEST ===\n{user_prompt}" + intent_instructions
    else:
        final_prompt = user_prompt

    # Get conversation history
    hydrated_messages = None
    if thread_id:
        conn_thr = get_db_connection()
        try:
            with conn_thr:
                hydrated_messages = build_context(
                    conn=conn_thr,
                    thread_id=thread_id,
                    new_user_prompt=final_prompt,
                    system_prompt=effective.get('system_prompt')
                )
        finally:
            conn_thr.close()

    # Call primary model
    start_time = time.time()
    result = call_model_provider(provider, model_id, final_prompt, effective, creds, messages=hydrated_messages)
    primary_latency = (time.time() - start_time) * 1000

    if not result['success']:
        return jsonify({
            'success': False,
            'response': '',
            'model': model_id,
            'latency_ms': primary_latency,
            'usage': result.get('usage', {}),
            'provider_error': result['provider_error'],
            'effective_config_used': effective,
            'context_info': {
                'context_items': len(context_items),
                'documents': len(documents),
                'intent': intent
            }
        }), 200

    # NEW: Enhanced code detection on successful response
    code_detection = detect_react_patterns(result['text'] or '')

    # Prepare enhanced metadata
    base_metadata = {
        'tokens_used': result.get('usage', {}).get('total_tokens'),
        'latency_seconds': primary_latency / 1000,
        'provider': provider,
        'context_items': len(context_items) + len(documents),
        'intent': intent
    }

    enhanced_metadata = enhance_response_with_code_detection(
        result['text'] or '',
        model_id,
        base_metadata
    )

    # Handle second opinion model (if present)
    second_result = None
    second_latency = 0
    second_code_detection = None

    if second_opinion and second_opinion.get('model'):
        # Get second model info and credentials (existing logic)
        second_model_id = second_opinion['model']
        second_model_info = get_model_info(second_model_id, workspace_id)

        if second_model_info:
            second_effective = compute_effective_config(workspace_id, second_model_id)
            second_effective['workspace_id'] = workspace_id
            second_overrides = second_opinion.get('settingsOverride') or {}
            for k in ['temperature', 'max_tokens', 'system_prompt', 'tool_choice']:
                if k in second_overrides and second_overrides[k] is not None:
                    second_effective[k] = second_overrides[k]

            second_provider = normalize_provider(second_model_info['provider'])
            second_creds = get_workspace_provider_credential(workspace_id, second_provider)

            if second_creds and second_creds.get('api_key'):
                second_start = time.time()
                second_result = call_model_provider(
                    second_provider,
                    second_model_id,
                    final_prompt,
                    second_effective,
                    second_creds,
                    messages=hydrated_messages
                )
                second_latency = (time.time() - second_start) * 1000

                # NEW: Code detection for second opinion
                if second_result and second_result['success']:
                    second_code_detection = detect_react_patterns(second_result['text'] or '')

    # Save primary response to thread with enhanced metadata
    if thread_id:
        if not save_enhanced_chat_to_thread(thread_id, user_prompt, result['text'] or '', model_id, base_metadata,
                                            code_detection):
            return jsonify({'success': False, 'error': 'Thread not found'}), 404

        # Log enhanced interaction
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
            metadata=enhanced_metadata
        )

    # Save second opinion if present
    if second_result and second_result['success'] and thread_id:
        second_metadata = {
            'tokens_used': second_result.get('usage', {}).get('total_tokens'),
            'latency_seconds': second_latency / 1000,
            'provider': second_provider,
            'context_items': len(context_items) + len(documents),
            'intent': intent
        }
        save_enhanced_chat_to_thread(thread_id, user_prompt, second_result['text'] or '', second_opinion['model'],
                                     second_metadata, second_code_detection)

    # Prepare enhanced response with Decimal conversion
    def convert_decimals(obj):
        """Recursively convert Decimal objects to float"""
        if isinstance(obj, dict):
            return {k: convert_decimals(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [convert_decimals(item) for item in obj]
        elif isinstance(obj, Decimal):
            return float(obj)
        return obj

    response_data = {
        'success': True,
        'response': result['text'] or '',
        'model': model_id,
        'latency_ms': primary_latency,
        'usage': convert_decimals(result.get('usage', {})),
        'effective_config_used': convert_decimals(effective),
        'codeDetection': code_detection,  # NEW: Code detection results
        'context_info': {
            'context_items': len(context_items),
            'documents': len(documents),
            'intent': intent,
            'include_history': include_history,
            'context_mode': context_mode
        }
    }

    # Add second opinion with code detection
    if second_result and second_result['success']:
        response_data['secondOpinion'] = {
            'response': second_result['text'] or '',
            'model': second_opinion['model'],
            'latency_ms': second_latency,
            'usage': second_result.get('usage', {}),
            'effective_config_used': second_effective,
            'codeDetection': second_code_detection  # NEW: Second opinion code detection
        }
    elif second_result and not second_result['success']:
        response_data['secondOpinion'] = {
            'error': second_result.get('provider_error', 'Second opinion model failed'),
            'model': second_opinion['model']
        }

    return jsonify(response_data), 200


@code_detector_thread_integration_api.route('/api/detect-code/analyze-thread/<thread_id>', methods=['GET'])
@token_required
def analyze_thread_code(current_user_id, thread_id):
    """
    Analyze all messages in a thread for code patterns
    Useful for retrospective analysis of existing conversations
    """
    try:
        conn_thr = get_db_connection()

        with conn_thr:
            with conn_thr.cursor() as cur:
                # Get all assistant messages from thread
                cur.execute("""
                    SELECT id, content, model, created_at, metadata
                    FROM messages 
                    WHERE thread_id = %s AND role = 'assistant'
                    ORDER BY created_at ASC
                """, (thread_id,))

                messages = cur.fetchall()

                if not messages:
                    return jsonify({
                        'success': True,
                        'threadId': thread_id,
                        'analysis': 'No assistant messages found in thread',
                        'codeDetections': []
                    }), 200

                # Analyze each message
                code_detections = []
                total_react_blocks = 0
                highest_confidence = 0

                for msg in messages:
                    detection = detect_react_patterns(msg['content'] or '')

                    if detection['hasReactCode']:
                        total_react_blocks += len(detection['codeBlocks'])
                        highest_confidence = max(highest_confidence, detection['confidence'])

                    code_detections.append({
                        'messageId': msg['id'],
                        'timestamp': msg['created_at'].isoformat() + 'Z',
                        'model': msg['model'],
                        'detection': detection,
                        'preview': (msg['content'] or '')[:100] + '...' if len(msg['content'] or '') > 100 else msg[
                            'content']
                    })

                # Summary analysis
                messages_with_code = sum(1 for d in code_detections if d['detection']['hasReactCode'])

                return jsonify({
                    'success': True,
                    'threadId': thread_id,
                    'summary': {
                        'totalMessages': len(messages),
                        'messagesWithReactCode': messages_with_code,
                        'totalReactBlocks': total_react_blocks,
                        'highestConfidence': round(highest_confidence, 2),
                        'codePercentage': round((messages_with_code / len(messages)) * 100, 1) if messages else 0
                    },
                    'codeDetections': code_detections
                }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Thread analysis failed: {str(e)}'
        }), 500
    finally:
        if 'conn_thr' in locals():
            conn_thr.close()


@code_detector_thread_integration_api.route('/api/detect-code/extract-components/<thread_id>', methods=['POST'])
@token_required
def extract_react_components(current_user_id, thread_id):
    """
    Extract all React components from a thread for library storage
    """
    data = request.get_json() or {}
    min_confidence = data.get('minConfidence', 0.5)

    try:
        conn_thr = get_db_connection()

        with conn_thr:
            with conn_thr.cursor() as cur:
                cur.execute("""
                    SELECT id, content, model, created_at
                    FROM messages 
                    WHERE thread_id = %s AND role = 'assistant'
                    ORDER BY created_at ASC
                """, (thread_id,))

                messages = cur.fetchall()
                extracted_components = []

                for msg in messages:
                    detection = detect_react_patterns(msg['content'] or '')

                    if detection['hasReactCode'] and detection['confidence'] >= min_confidence:
                        for block in detection['codeBlocks']:
                            if block['isReactCode']:
                                extracted_components.append({
                                    'messageId': msg['id'],
                                    'timestamp': msg['created_at'].isoformat() + 'Z',
                                    'model': msg['model'],
                                    'confidence': detection['confidence'],
                                    'codeBlock': block,
                                    'suggestedName': extract_component_name(block['code']),
                                    'suggestedDescription': generate_component_description(block['code'])
                                })

                return jsonify({
                    'success': True,
                    'threadId': thread_id,
                    'extractedComponents': extracted_components,
                    'summary': {
                        'componentsFound': len(extracted_components),
                        'minConfidence': min_confidence
                    }
                }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Component extraction failed: {str(e)}'
        }), 500
    finally:
        if 'conn_thr' in locals():
            conn_thr.close()


def extract_component_name(code):
    """
    Try to extract a meaningful component name from React code
    """
    # Look for function/const component declarations
    patterns = [
        r'function\s+([A-Z][a-zA-Z0-9]*)',
        r'const\s+([A-Z][a-zA-Z0-9]*)\s*=',
        r'export\s+default\s+([A-Z][a-zA-Z0-9]*)'
    ]

    for pattern in patterns:
        match = re.search(pattern, code)
        if match:
            return match.group(1)

    return "UnnamedComponent"


def generate_component_description(code):
    """
    Generate a brief description of what the component does
    """
    # Simple heuristics based on code content
    if 'form' in code.lower() or 'input' in code.lower():
        return "Form component with input fields"
    elif 'button' in code.lower():
        return "Interactive button component"
    elif 'modal' in code.lower() or 'dialog' in code.lower():
        return "Modal or dialog component"
    elif 'list' in code.lower() or 'map(' in code:
        return "List or data display component"
    elif 'useState' in code:
        return "Stateful React component"
    else:
        return "React functional component"


@code_detector_thread_integration_api.route('/api/detect-code/health', methods=['GET'])
def integration_health_check():
    """Health check for the integration service"""
    return jsonify({
        'status': 'healthy',
        'service': 'code-detector-thread-integration',
        'version': '1.0',
        'integrations': {
            'react_code_detector': 'active',
            'threads_api': 'active'
        }
    }), 200