from flask import Blueprint, request, jsonify
import anthropic
import json
import os
from typing import Dict, List, Any

# Create the blueprint
aicommands_bp = Blueprint('aicommands', __name__, url_prefix='/api')

# Initialize Anthropic client
client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))


@aicommands_bp.route('/ai-parse', methods=['POST'])
def parse_command():
    """Parse natural language into structured chart commands using Claude."""

    try:
        data = request.get_json()

        if not data or 'input' not in data:
            return jsonify({'error': 'Input is required'}), 400

        user_input = data['input']
        element_context = data.get('context', [])

        # Parse the command using Claude
        command = parse_command_with_anthropic(user_input, element_context)

        return jsonify({
            'command': command,
            'input': user_input,
            'timestamp': None  # Could add datetime.now().isoformat()
        })

    except Exception as e:
        print(f"AI parsing error: {str(e)}")
        return jsonify({
            'error': 'Failed to parse command',
            'details': str(e)
        }), 500


def parse_command_with_anthropic(user_input: str, element_context: List[Dict]) -> Dict[str, Any]:
    """Use Claude to parse natural language into structured commands."""

    # Build context string from available elements
    context_str = "\n".join([
        f"- {el['id']}: {el['type']} (\"{el.get('text', 'no text')}\")"
        for el in element_context
    ])

    system_prompt = f"""You are a chart command parser. Convert natural language into structured commands for a flowchart.

AVAILABLE ELEMENTS:
{context_str}

COMMAND STRUCTURE:
Return ONLY a JSON object with this exact structure:
{{{{
  "action": "change|move|move_chart|scale|reset",
  "target": "elementId" or ["id1", "id2"] for multiple,
  "property": "fill|stroke|textColor|fontSize|text|x|y|width|height",
  "value": "newValue"
}}}}

EXAMPLES:
"make square1 blue" → {{{{"action": "change", "target": "square1", "property": "fill", "value": "#3b82f6"}}}}
"change text for step 1 to say blah" → {{{{"action": "change", "target": "square1", "property": "text", "value": "blah"}}}}
"change text color to red" → {{{{"action": "change", "target": ["square1", "square2", "square3", "square4"], "property": "textColor", "value": "#ef4444"}}}}
"make the first box bigger" → {{{{"action": "change", "target": "square1", "property": "width", "value": 300}}}}
"move square1 right" → {{{{"action": "move", "target": "square1", "value": {{"x": 50}}}}}}
"move chart right 10%" → {{{{"action": "move_chart", "value": {{"x": 50}}}}}}
"move the entire chart left" → {{{{"action": "move_chart", "value": {{"x": -50}}}}}}
"reset chart" → {{{{"action": "reset"}}}}
"zoom to 150%" → {{{{"action": "scale", "value": 1.5}}}}

IMPORTANT:
- "move chart" or "move the chart" → use "move_chart" action (NO target needed)
- "move square1" or "move element X" → use "move" action WITH target

COLOR MAPPINGS:
- blue → #3b82f6
- red → #ef4444  
- green → #22c55e
- yellow → #eab308
- purple → #a855f7
- gray/grey → #6b7280
- black → #000000
- white → #ffffff

IMPORTANT: 
- If target isn't specified, apply to ALL elements
- Use actual element IDs from the available elements list
- For colors, always use hex codes
- Return ONLY the JSON object, no other text
"""

    try:
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1000,
            temperature=0.1,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": user_input
                }
            ]
        )

        ai_response = message.content[0].text.strip()

        # Parse the JSON response
        try:
            command = json.loads(ai_response)

            # After: command = json.loads(ai_response)

            # LAYER 1 VALIDATION: Ensure data structures are valid

            # 1. Fix comma-separated strings → arrays
            if isinstance(command.get('target'), str) and ',' in command['target']:
                command['target'] = [t.strip() for t in command['target'].split(',')]

            # 2. Ensure required fields exist
            if 'action' not in command:
                raise ValueError('Missing required field: action')

            # 3. Type validation
            if command.get('target') is not None:
                if not isinstance(command['target'], (str, list)):
                    raise ValueError('target must be string or array')

                # Ensure array elements are strings
                if isinstance(command['target'], list):
                    if not all(isinstance(t, str) for t in command['target']):
                        raise ValueError('target array must contain only strings')

            # 4. Validate action type
            valid_actions = ['change', 'move', 'move_chart', 'scale', 'reset']
            if command['action'] not in valid_actions:
                raise ValueError(f"Invalid action: {command['action']}")

            # 5. Action-specific validation
            if command['action'] in ['change', 'move'] and 'target' not in command:
                action = command['action']
                raise ValueError(f"{action} action requires target")

            if command['action'] == 'change' and 'property' not in command:
                raise ValueError('change action requires property field')

            # 6. Ensure value types are reasonable
            if 'value' in command:
                # Numbers should be numbers, not strings
                if command.get('property') in ['fontSize', 'width', 'height', 'x', 'y']:
                    if isinstance(command['value'], str):
                        try:
                            command['value'] = float(command['value'])
                        except ValueError:
                            prop = command.get('property')
                            val = command.get('value')
                            raise ValueError(f'Invalid numeric value for {prop}: {val}')
            return command

        except json.JSONDecodeError as e:
            print(f"Failed to parse AI response as JSON: {ai_response}")
            raise ValueError(f"Invalid AI response format: {str(e)}")

    except anthropic.APIError as e:
        raise Exception(f"Anthropic API error: {str(e)}")


@aicommands_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for the AI commands service."""
    return jsonify({
        'status': 'healthy',
        'service': 'aicommands',
        'anthropic_configured': bool(os.getenv('ANTHROPIC_API_KEY'))
    })


# Additional utility endpoints
@aicommands_bp.route('/validate-command', methods=['POST'])
def validate_command():
    """Validate a structured command without executing it."""

    try:
        data = request.get_json()
        command = data.get('command')

        if not command:
            return jsonify({'error': 'Command is required'}), 400

        # Basic validation
        required_fields = ['action']
        missing_fields = [field for field in required_fields if field not in command]

        if missing_fields:
            return jsonify({
                'valid': False,
                'errors': [f'Missing required field: {field}' for field in missing_fields]
            }), 400

        # Validate action type
        valid_actions = ['change', 'move', 'scale', 'reset']
        if command['action'] not in valid_actions:
            return jsonify({
                'valid': False,
                'errors': [f"Invalid action: {command['action']}. Must be one of: {valid_actions}"]
            }), 400

        return jsonify({
            'valid': True,
            'command': command
        })

    except Exception as e:
        return jsonify({
            'valid': False,
            'errors': [str(e)]
        }), 500


@aicommands_bp.route('/suggest-commands', methods=['POST'])
def suggest_commands():
    """Suggest possible commands based on current chart state."""

    try:
        data = request.get_json()
        element_context = data.get('context', [])

        # Generate contextual suggestions
        suggestions = []

        if element_context:
            # Color suggestions
            colors = ['blue', 'red', 'green', 'yellow', 'purple']
            for color in colors:
                suggestions.append(f"make all boxes {color}")

            # Element-specific suggestions
            for element in element_context[:2]:  # First 2 elements
                suggestions.extend([
                    f"make {element['id']} blue",
                    f"change {element['id']} text to white"
                ])

        # General suggestions
        suggestions.extend([
            "reset chart",
            "zoom to 150%",
            "make text bigger",
            "change all colors to gray"
        ])

        return jsonify({
            'suggestions': suggestions[:8]  # Limit to 8 suggestions
        })

    except Exception as e:
        return jsonify({
            'error': 'Failed to generate suggestions',
            'details': str(e)
        }), 500