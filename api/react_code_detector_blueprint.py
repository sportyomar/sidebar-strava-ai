from flask import Blueprint, request, jsonify
import re
import json

react_code_detector_api = Blueprint('react_code_detector_api', __name__)


def detect_react_patterns(text):
    """
    Detect React code patterns in text
    Returns detection results with confidence scores
    """
    if not text or not isinstance(text, str):
        return {
            'hasReactCode': False,
            'confidence': 0,
            'patterns': [],
            'codeBlocks': []
        }

    patterns = {
        # React imports
        'react_import': r'import\s+React(?:\s*,\s*\{[^}]*\})?\s+from\s+[\'"]react[\'"]',
        'react_hooks': r'import\s*\{[^}]*(?:useState|useEffect|useContext|useReducer|useMemo|useCallback)[^}]*\}\s*from\s*[\'"]react[\'"]',
        'react_dom': r'import.*from\s*[\'"]react-dom[\'"]',

        # JSX patterns
        'jsx_elements': r'<[A-Z][a-zA-Z0-9]*(?:\s+[^>]*)?>.*?</[A-Z][a-zA-Z0-9]*>',
        'jsx_self_closing': r'<[A-Z][a-zA-Z0-9]*(?:\s+[^/>]*)?/>',
        'jsx_fragments': r'<>.*?</>|<React\.Fragment>.*?</React\.Fragment>',

        # React component patterns
        'function_component': r'function\s+[A-Z][a-zA-Z0-9]*\s*\([^)]*\)\s*\{[\s\S]*?return\s*\([\s\S]*?<[\s\S]*?\)',
        'arrow_component': r'const\s+[A-Z][a-zA-Z0-9]*\s*=\s*\([^)]*\)\s*=>\s*\{[\s\S]*?return\s*\([\s\S]*?<[\s\S]*?\)',
        'arrow_component_short': r'const\s+[A-Z][a-zA-Z0-9]*\s*=\s*\([^)]*\)\s*=>\s*<[^;]*',

        # React-specific attributes and props
        'class_name': r'className\s*=',
        'react_props': r'\{[^}]*\}(?=\s*(?:>|/>))',
        'event_handlers': r'on[A-Z][a-zA-Z]*\s*=\s*\{[^}]*\}',

        # Hooks usage
        'use_state': r'useState\s*\(',
        'use_effect': r'useEffect\s*\(',
        'use_context': r'useContext\s*\(',
        'custom_hooks': r'use[A-Z][a-zA-Z0-9]*\s*\(',

        # State and props destructuring
        'props_destructure': r'const\s*\{[^}]+\}\s*=\s*props',
        'state_destructure': r'const\s*\[[^]]+\]\s*=\s*useState',

        # Export patterns
        'default_export': r'export\s+default\s+[A-Z][a-zA-Z0-9]*',
        'named_export': r'export\s*\{[^}]*[A-Z][a-zA-Z0-9]*[^}]*\}'
    }

    detected_patterns = []
    total_matches = 0

    # Check each pattern
    for pattern_name, pattern_regex in patterns.items():
        matches = re.findall(pattern_regex, text, re.MULTILINE | re.DOTALL)
        if matches:
            detected_patterns.append({
                'name': pattern_name,
                'matches': len(matches),
                'samples': matches[:3]  # First 3 matches as samples
            })
            total_matches += len(matches)

    # Extract potential code blocks
    code_blocks = extract_code_blocks(text)

    # Calculate confidence score
    confidence = calculate_confidence(detected_patterns, text)

    # Determine if it's React code
    has_react_code = confidence > 0.3  # 30% threshold

    return {
        'hasReactCode': has_react_code,
        'confidence': round(confidence, 2),
        'patterns': detected_patterns,
        'codeBlocks': code_blocks,
        'totalMatches': total_matches,
        'analysis': generate_analysis(detected_patterns, confidence)
    }


def extract_code_blocks(text):
    """
    Extract code blocks from markdown-formatted text
    """
    code_blocks = []

    # Markdown code blocks with language
    markdown_blocks = re.findall(r'```(\w+)?\n(.*?)\n```', text, re.DOTALL)
    for i, (language, code) in enumerate(markdown_blocks):
        if is_likely_react_code(code):
            code_blocks.append({
                'type': 'markdown',
                'language': language or 'javascript',
                'code': code.strip(),
                'startPattern': '```',
                'blockIndex': i,
                'isReactCode': True
            })

    # Inline code blocks
    inline_blocks = re.findall(r'`([^`]+)`', text)
    for i, code in enumerate(inline_blocks):
        if len(code) > 20 and is_likely_react_code(code):  # Only longer inline blocks
            code_blocks.append({
                'type': 'inline',
                'language': 'javascript',
                'code': code.strip(),
                'startPattern': '`',
                'blockIndex': i,
                'isReactCode': True
            })

    return code_blocks


def is_likely_react_code(code_snippet):
    """
    Quick check if a code snippet is likely React code
    """
    react_indicators = [
        r'<[A-Z][a-zA-Z0-9]*',  # JSX components
        r'className=',  # className attribute
        r'useState|useEffect',  # Common hooks
        r'import.*react',  # React imports
        r'export default',  # Component exports
        r'=>\s*<',  # Arrow functions returning JSX
        r'return\s*\(',  # Return JSX
    ]

    matches = 0
    for indicator in react_indicators:
        if re.search(indicator, code_snippet, re.IGNORECASE):
            matches += 1

    return matches >= 2  # Need at least 2 indicators


def calculate_confidence(patterns, text):
    """
    Calculate confidence score based on detected patterns
    """
    if not patterns:
        return 0.0

    # Weight different patterns by importance
    pattern_weights = {
        'react_import': 0.3,
        'react_hooks': 0.25,
        'jsx_elements': 0.2,
        'jsx_self_closing': 0.15,
        'function_component': 0.2,
        'arrow_component': 0.2,
        'class_name': 0.1,
        'use_state': 0.15,
        'use_effect': 0.15,
        'default_export': 0.1
    }

    weighted_score = 0.0
    for pattern in patterns:
        weight = pattern_weights.get(pattern['name'], 0.05)
        # Diminishing returns for multiple matches of same pattern
        match_score = min(pattern['matches'] * 0.1, 0.3)
        weighted_score += weight * (1 + match_score)

    # Normalize to 0-1 range
    return min(weighted_score, 1.0)


def generate_analysis(patterns, confidence):
    """
    Generate human-readable analysis of the detection
    """
    if confidence < 0.2:
        return "No significant React code detected"
    elif confidence < 0.5:
        return "Possible React code detected with low confidence"
    elif confidence < 0.8:
        return "React code detected with medium confidence"
    else:
        return "React code detected with high confidence"


@react_code_detector_api.route('/api/detect-react-code', methods=['POST'])
def detect_react_code():
    """
    Analyze text for React code patterns

    Expected JSON payload:
    {
        "text": "string content to analyze",
        "options": {
            "includeCodeBlocks": true,
            "minConfidence": 0.3
        }
    }
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'error': 'No JSON data provided'
            }), 400

        text = data.get('text', '')
        options = data.get('options', {})

        if not text:
            return jsonify({
                'success': False,
                'error': 'Text field is required'
            }), 400

        # Run detection
        detection_result = detect_react_patterns(text)

        # Apply minimum confidence filter if specified
        min_confidence = options.get('minConfidence', 0.0)
        if detection_result['confidence'] < min_confidence:
            detection_result['hasReactCode'] = False

        # Include code blocks based on options
        if not options.get('includeCodeBlocks', True):
            detection_result.pop('codeBlocks', None)

        return jsonify({
            'success': True,
            'detection': detection_result,
            'metadata': {
                'textLength': len(text),
                'processingTime': 'instant',
                'version': '1.0'
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Detection failed: {str(e)}'
        }), 500


@react_code_detector_api.route('/api/detect-react-code/batch', methods=['POST'])
def detect_react_code_batch():
    """
    Analyze multiple text samples for React code

    Expected JSON payload:
    {
        "texts": ["sample 1", "sample 2", ...],
        "options": {
            "includeCodeBlocks": true,
            "minConfidence": 0.3
        }
    }
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'error': 'No JSON data provided'
            }), 400

        texts = data.get('texts', [])
        options = data.get('options', {})

        if not texts or not isinstance(texts, list):
            return jsonify({
                'success': False,
                'error': 'Texts field must be a non-empty array'
            }), 400

        if len(texts) > 50:  # Limit batch size
            return jsonify({
                'success': False,
                'error': 'Batch size limited to 50 items'
            }), 400

        results = []
        for i, text in enumerate(texts):
            if isinstance(text, str):
                detection = detect_react_patterns(text)

                # Apply filters
                min_confidence = options.get('minConfidence', 0.0)
                if detection['confidence'] < min_confidence:
                    detection['hasReactCode'] = False

                if not options.get('includeCodeBlocks', True):
                    detection.pop('codeBlocks', None)

                results.append({
                    'index': i,
                    'detection': detection
                })
            else:
                results.append({
                    'index': i,
                    'error': 'Invalid text format'
                })

        return jsonify({
            'success': True,
            'results': results,
            'summary': {
                'totalProcessed': len(texts),
                'reactCodeFound': sum(1 for r in results if r.get('detection', {}).get('hasReactCode')),
                'averageConfidence': sum(r.get('detection', {}).get('confidence', 0) for r in results) / len(
                    results) if results else 0
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Batch detection failed: {str(e)}'
        }), 500


@react_code_detector_api.route('/api/detect-react-code/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'react-code-detector',
        'version': '1.0'
    }), 200