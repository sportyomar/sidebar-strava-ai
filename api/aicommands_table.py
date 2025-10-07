from flask import Blueprint, request, jsonify
import anthropic
import json
import os
from typing import Dict, List, Any

# Create the table commands blueprint
aitablecommands_bp = Blueprint('aitablecommands', __name__, url_prefix='/api')

# Initialize Anthropic client
client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))


@aitablecommands_bp.route('/ai-parse-table', methods=['POST'])
def parse_table_command():
    """Parse natural language into structured table commands using Claude."""

    try:
        data = request.get_json()

        if not data or 'input' not in data:
            return jsonify({'error': 'Input is required'}), 400

        user_input = data['input']
        table_context = data.get('context', {})

        # Parse the command using Claude
        command = parse_table_command_with_anthropic(user_input, table_context)

        return jsonify({
            'command': command,
            'input': user_input,
            'timestamp': None
        })

    except Exception as e:
        print(f"AI table parsing error: {str(e)}")
        return jsonify({
            'error': 'Failed to parse table command',
            'details': str(e)
        }), 500


def parse_table_command_with_anthropic(user_input: str, table_context: Dict) -> Dict[str, Any]:
    """Use Claude to parse natural language into structured table commands."""

    cells = table_context.get('cells', [])
    rows = table_context.get('rows', 5)
    cols = table_context.get('cols', 5)

    # Build a more concise context string - just show a sample of cells
    context_str = f"Grid: {rows} rows × {cols} columns (cells use 'row-col' format like '0-0' for A1)"
    if cells:
        sample_cells = cells[:5]  # Just show first 5 cells as examples
        context_str += "\nSample cells: " + ", ".join([f"{c.get('id', 'unknown')}" for c in sample_cells])

    system_prompt = f"""You are a table command parser. Convert natural language into structured commands for a spreadsheet table.

AVAILABLE CELLS:
{context_str}

COMMAND STRUCTURE:
Return ONLY a JSON object with this exact structure:
{{{{
  "action": "change|select|move_table|scale|reset|sequence",
  "target": "row-col" or ["0-0", "1-1"] for multiple or "all",
  "property": "value|fill|textColor|fontSize|fontWeight|align",
  "value": "newValue"
  "start": 1,
  "increment": 1,
  "operation": "add|subtract|multiply|divide",
  "operand": 0,
  "condition": {{"operator": "gt|lt|gte|lte|eq|between", "threshold": 5, "max": 10}},
  "color": "#ff0000"
  "data": [[row1], [row2], ...],
  "start_cell": "0-0",
  "end_cell": "0-5",
  "merge_text": "Header Text",
  "gradient": {{"low_color": "#22c55e", "mid_color": "#eab308", "high_color": "#ef4444", "low_value": 0, "high_value": 10}}
  "cohort_data": {{"months": ["Feb 2014", "Mar 2014"], "values": [[999, 2.5, 0.8], [293, 0.0, 1.5]]}}
}}}}

EXAMPLES:
"change cell A1 to Hello" → {{{{"action": "change", "target": "0-0", "property": "value", "value": "Hello"}}}}
"make row 1 blue" → {{{{"action": "change", "target": "row-0", "property": "fill", "value": "#3b82f6"}}}}
"select cell B2" → {{{{"action": "select", "target": "1-1"}}}}
"make all text red" → {{{{"action": "change", "target": "all", "property": "textColor", "value": "#ef4444"}}}}
"make column A bold" → {{{{"action": "change", "target": "col-0", "property": "fontWeight", "value": "bold"}}}}
"move table right" → {{{{"action": "move_table", "value": {{"x": 50}}}}}}
"number cells 1 to 100" → {{{{"action": "sequence", "target": "all", "start": 1, "increment": 1}}}}
"add 10 to cell C5" → {{{{"action": "arithmetic", "target": "4-2", "operation": "add", "operand": 10}}}}
"multiply all cells by 2" → {{{{"action": "arithmetic", "target": "all", "operation": "multiply", "operand": 2}}}}
"color cells red if greater than 5" → {{{{"action": "conditional_format", "target": "all", "condition": {{"operator": "gt", "threshold": 5}}, "color": "#ef4444"}}}}
"highlight values between 2 and 5 in yellow" → {{{{"action": "conditional_format", "target": "all", "condition": {{"operator": "between", "threshold": 2, "max": 5}}, "color": "#eab308"}}}}
"import data starting at A1" → {{{{"action": "import_data", "start_cell": "0-0", "data": [["Jan", 100], ["Feb", 200]]}}}}
"load cohort data" → {{{{"action": "import_data", "start_cell": "0-0", "data": [["Feb 2014", 999, "2.50%", "0.80%"]]}}}}
"merge cells A1 to F1 with text 'Lifetime month'" → {{{{"action": "merge_cells", "start_cell": "0-0", "end_cell": "0-5", "merge_text": "Lifetime month"}}}}
"merge row 1 columns 3 to 10" → {{{{"action": "merge_cells", "start_cell": "0-2", "end_cell": "0-9"}}}}
"apply heat map from green to red" → {{{{"action": "gradient_format", "target": "all", "gradient": {{"low_color": "#22c55e", "high_color": "#ef4444"}}}}}}
"color scale low green, high red for values 0 to 10" → {{{{"action": "gradient_format", "target": "all", "gradient": {{"low_color": "#22c55e", "high_color": "#ef4444", "low_value": 0, "high_value": 10}}}}}}
"apply cohort color gradient" → {{{{"action": "gradient_format", "target": "all", "gradient": {{"low_color": "#22c55e", "mid_color": "#eab308", "high_color": "#ef4444", "low_value": 0, "high_value": 7}}}}}}
"create cohort retention table" → {{{{"action": "create_cohort", "cohort_data": {{"months": [], "values": []}}}}}}
"build cohort table with this data" → {{{{"action": "create_cohort", "cohort_data": {{"months": ["Jan", "Feb"], "values": [[100, 2.5, 1.0], [200, 3.0, 1.5]]}}}}}}


CELL ADDRESSING:
- Individual cells: "0-0" (A1), "1-1" (B2), "2-3" (D3)
- Entire rows: "row-0" (row 1), "row-1" (row 2)
- Entire columns: "col-0" (column A), "col-1" (column B)
- All cells: "all"

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
- If target isn't specified, use "all"
- For colors, always use hex codes
- Use shorthand (row-N, col-N, all) instead of listing all cells
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

            # LAYER 1 VALIDATION: Ensure data structures are valid

            # 1. Fix comma-separated strings → arrays
            if isinstance(command.get('target'), str) and ',' in command['target']:
                # Don't split special targets like "row-0", "col-1", "all"
                if not any(command['target'].startswith(prefix) for prefix in ['row-', 'col-', 'all']):
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
            valid_actions = ['change', 'select', 'move_table', 'scale', 'reset', 'sequence', 'arithmetic', 'conditional_format', 'import_data', 'merge_cells', 'gradient_format', 'create_cohort']
            if command['action'] not in valid_actions:
                raise ValueError(f"Invalid action: {command['action']}")

            # 5. Action-specific validation
            if command['action'] in ['change', 'select'] and 'target' not in command:
                action = command['action']
                raise ValueError(f"{action} action requires target")

            if command['action'] == 'change' and 'property' not in command:
                raise ValueError('change action requires property field')

            # 6. Ensure value types are reasonable
            if 'value' in command:
                # Numbers should be numbers, not strings
                if command.get('property') in ['fontSize']:
                    if isinstance(command['value'], str):
                        try:
                            command['value'] = float(command['value'])
                        except ValueError:
                            prop = command.get('property')
                            val = command.get('value')
                            raise ValueError(f'Invalid numeric value for {prop}: {val}')

            # 7. Expand shorthand targets on the backend (optional - do this in your frontend/backend logic)
            # This keeps the AI response small but gives you the full list when needed
            target = command.get('target')
            if target == 'all':
                # Frontend should expand this to all cells
                pass
            elif isinstance(target, str) and target.startswith('row-'):
                # Frontend should expand to all cells in that row
                pass
            elif isinstance(target, str) and target.startswith('col-'):
                # Frontend should expand to all cells in that column
                pass

            return command

        except json.JSONDecodeError as e:
            print(f"Failed to parse AI response as JSON: {ai_response}")
            raise ValueError(f"Invalid AI response format: {str(e)}")

    except anthropic.APIError as e:
        raise Exception(f"Anthropic API error: {str(e)}")


@aitablecommands_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for table AI commands service."""
    return jsonify({
        'status': 'healthy',
        'service': 'aitablecommands',
        'anthropic_configured': bool(os.getenv('ANTHROPIC_API_KEY'))
    })


@aitablecommands_bp.route('/validate-table-command', methods=['POST'])
def validate_table_command():
    """Validate a structured table command without executing it."""

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
        valid_actions = ['change', 'select', 'move_table', 'scale', 'reset', 'sequence', 'arithmetic', 'conditional_format', 'import_data', 'merge_cells', 'gradient_format', 'create_cohort']
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


@aitablecommands_bp.route('/suggest-table-commands', methods=['POST'])
def suggest_table_commands():
    """Suggest possible commands based on current table state."""

    try:
        data = request.get_json()
        table_context = data.get('context', {})

        # Generate contextual suggestions
        suggestions = []

        # Color suggestions
        colors = ['blue', 'red', 'green', 'yellow', 'purple']
        for color in colors[:3]:  # Limit to 3 colors
            suggestions.append(f"make all cells {color}")

        # Row/column suggestions
        suggestions.extend([
            "make row 1 bold",
            "make column A blue",
            "select cell A1",
            "change cell B2 to Hello"
        ])

        # General suggestions
        suggestions.extend([
            "reset table",
            "make all text bigger",
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