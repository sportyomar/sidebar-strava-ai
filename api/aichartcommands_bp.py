from flask import Blueprint, request, jsonify
import anthropic
import json
import os
from typing import Dict, List, Any

# Create the chart commands blueprint
aichartcommands_bp = Blueprint('aichartcommands', __name__, url_prefix='/api')

# Initialize Anthropic client
client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))


@aichartcommands_bp.route('/ai-parse-chart', methods=['POST'])
def parse_chart_command():
    """Parse natural language into structured chart commands using Claude."""

    try:
        data = request.get_json()

        if not data or 'input' not in data:
            return jsonify({'error': 'Input is required'}), 400

        user_input = data['input']
        chart_context = data.get('context', {})

        # Parse the command using Claude
        command = parse_chart_command_with_anthropic(user_input, chart_context)

        return jsonify({
            'command': command,
            'input': user_input,
            'timestamp': None
        })

    except Exception as e:
        print(f"AI chart parsing error: {str(e)}")
        return jsonify({
            'error': 'Failed to parse chart command',
            'details': str(e)
        }), 500


def parse_chart_command_with_anthropic(user_input: str, chart_context: Dict) -> Dict[str, Any]:
    """Use Claude to parse natural language into structured chart commands."""

    loaded_templates = chart_context.get('loaded_templates', [])
    loaded_layers = chart_context.get('loaded_layers', [])
    current_elements = chart_context.get('elements', [])

    context_str = f"""
Current state:
- Base template: {loaded_templates[0] if loaded_templates else 'none'}
- Active layers: {', '.join(loaded_layers) if loaded_layers else 'none'}
- Elements: {len(current_elements)} primitives loaded
"""

    system_prompt = f"""You are a chart template parser. Convert natural language into structured commands for data visualization.

CONTEXT:
{context_str}

AVAILABLE TEMPLATES:
Base Templates:
- cohort_retention_base: Retention curves by cohort over time

Layer Templates (add to existing chart):
- benchmark_overlay: Add industry benchmark line
- confidence_bands: Add statistical confidence intervals
- event_annotations: Add timeline event markers
- expansion_comparison: Add expansion metrics panel

COMMAND STRUCTURE:
Return ONLY a JSON object:
{{{{
  "action": "load_template|add_layer|remove_layer|change|reset",
  "template": "template_name",
  "layer": "layer_name",
  "target": "element_id" or ["id1", "id2"],
  "property": "fill|stroke|textColor|fontSize",
  "value": "newValue"
}}}}

EXAMPLES:
"chart retention by cohort over time" → {{{{"action": "load_template", "template": "cohort_retention_base"}}}}
"add benchmarks" → {{{{"action": "add_layer", "layer": "benchmark_overlay"}}}}
"show confidence intervals" → {{{{"action": "add_layer", "layer": "confidence_bands"}}}}
"annotate key events" → {{{{"action": "add_layer", "layer": "event_annotations"}}}}
"compare to expansion" → {{{{"action": "add_layer", "layer": "expansion_comparison"}}}}
"remove benchmarks" → {{{{"action": "remove_layer", "layer": "benchmark_overlay"}}}}
"make line-jan red" → {{{{"action": "change", "target": "line-jan", "property": "stroke", "value": "#ef4444"}}}}

IMPORTANT:
- First command should load a base template
- Layers stack on top of base template
- Layers are reversible (can be removed)
- Primitive edits target specific element IDs
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

            # Validation
            if 'action' not in command:
                raise ValueError('Missing required field: action')

            valid_actions = ['load_template', 'add_layer', 'remove_layer', 'change', 'reset']
            if command['action'] not in valid_actions:
                raise ValueError(f"Invalid action: {command['action']}")

            # Action-specific validation
            if command['action'] == 'load_template' and 'template' not in command:
                raise ValueError('load_template requires template field')

            if command['action'] in ['add_layer', 'remove_layer'] and 'layer' not in command:
                raise ValueError(f"{command['action']} requires layer field")

            if command['action'] == 'change':
                if 'target' not in command or 'property' not in command:
                    raise ValueError('change action requires target and property fields')

            return command

        except json.JSONDecodeError as e:
            print(f"Failed to parse AI response as JSON: {ai_response}")
            raise ValueError(f"Invalid AI response format: {str(e)}")

    except anthropic.APIError as e:
        raise Exception(f"Anthropic API error: {str(e)}")


@aichartcommands_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for chart AI commands service."""
    return jsonify({
        'status': 'healthy',
        'service': 'aichartcommands',
        'anthropic_configured': bool(os.getenv('ANTHROPIC_API_KEY'))
    })