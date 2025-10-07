#!/usr/bin/env python3
"""
Design Project Validator
Validates project JSON files BEFORE they're processed to catch errors immediately.
Run this on project files as they're created/edited.
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Any

# JSON Schema for design project files
DESIGN_PROJECT_SCHEMA = {
    "type": "object",
    "required": ["extends", "tokens"],
    "properties": {
        "extends": {
            "type": "array",
            "items": {
                "type": "string",
                "enum": ["corporate", "light", "dark", "minimal"]  # Available extensions
            },
            "description": "Design extensions to inherit from (themes/brands)"
        },
        "tokens": {
            "type": "object",
            "properties": {
                "component": {
                    "type": "object",
                    "patternProperties": {
                        "^[a-zA-Z][a-zA-Z0-9_]*$": {  # Component names
                            "type": "object",
                            "properties": {
                                # Layout properties
                                "width": {"type": "string", "pattern": "^(\\{\\{.+\\}\\}|\\d+px|\\d+rem|\\d+%|auto)$"},
                                "height": {"type": "string", "pattern": "^(\\{\\{.+\\}\\}|\\d+px|\\d+rem|\\d+%|auto)$"},
                                "padding": {"type": "string",
                                            "pattern": "^(\\{\\{spacing\\.spacing\\.[a-z0-9]+\\}\\}|\\d+px|\\d+rem)$"},
                                "margin": {"type": "string",
                                           "pattern": "^(\\{\\{spacing\\.spacing\\.[a-z0-9]+\\}\\}|\\d+px|\\d+rem)$"},

                                # Visual properties
                                "background": {"type": "string",
                                               "pattern": "^(\\{\\{colors\\.colors\\.[a-z-]+\\}\\}|#[0-9a-fA-F]{6}|transparent)$"},
                                "backgroundColor": {"type": "string",
                                                    "pattern": "^(\\{\\{colors\\.colors\\.[a-z-]+\\}\\}|#[0-9a-fA-F]{6}|transparent)$"},
                                "color": {"type": "string",
                                          "pattern": "^(\\{\\{colors\\.colors\\.[a-z-]+\\}\\}|#[0-9a-fA-F]{6})$"},
                                "border": {"type": "string",
                                           "pattern": "^\\d+px solid \\{\\{colors\\.colors\\.[a-z-]+\\}\\}$"},
                                "borderBottom": {"type": "string",
                                                 "pattern": "^\\d+px solid \\{\\{colors\\.colors\\.[a-z-]+\\}\\}$"},
                                "borderRadius": {"type": "string", "pattern": "^\\d+px$"},
                                "boxShadow": {"type": "string", "pattern": "^\\{\\{shadows\\.shadows\\.[a-z]+\\}\\}$"},

                                # Typography
                                "fontSize": {"type": "string",
                                             "pattern": "^(\\{\\{typography\\.typography\\.font-size-[a-z]+\\}\\}|\\d+px|\\d+rem)$"},
                                "fontWeight": {"type": ["string", "integer"],
                                               "pattern": "^(\\{\\{typography\\.typography\\.font-weight-[a-z]+\\}\\}|[1-9]00)$"}
                            },
                            "additionalProperties": False
                        }
                    }
                },
                "layout": {
                    "type": "object",
                    "properties": {
                        "grid": {
                            "type": "object",
                            "properties": {
                                "gap": {"type": "string", "pattern": "^\\{\\{spacing\\.spacing\\.[a-z0-9]+\\}\\}$"},
                                "columns": {
                                    "type": "object",
                                    "properties": {
                                        "mobile": {"type": "integer", "minimum": 1, "maximum": 12},
                                        "tablet": {"type": "integer", "minimum": 1, "maximum": 12},
                                        "desktop": {"type": "integer", "minimum": 1, "maximum": 12}
                                    }
                                }
                            }
                        },
                        "container": {
                            "type": "object",
                            "properties": {
                                "maxWidth": {"type": "string", "pattern": "^\\d+px$"},
                                "padding": {"type": "string", "pattern": "^\\{\\{spacing\\.spacing\\.[a-z0-9]+\\}\\}$"}
                            }
                        }
                    }
                }
            }
        }
    }
}


def validate_project_json(project_file: Path, available_tokens: Dict[str, Any] = None) -> List[str]:
    """Validate a project JSON file against schema and token availability"""
    errors = []

    try:
        with open(project_file, 'r') as f:
            project_data = json.load(f)
    except json.JSONDecodeError as e:
        return [f"🚨 Invalid JSON: {e}"]
    except FileNotFoundError:
        return [f"🚨 File not found: {project_file}"]

    # Basic structure validation
    if not isinstance(project_data, dict):
        errors.append("🚨 Root must be an object")
        return errors

    # Required fields
    if "extends" not in project_data:
        errors.append("🚨 Missing required field: 'extends'")
    elif not isinstance(project_data["extends"], list):
        errors.append("🚨 'extends' must be an array")

    if "tokens" not in project_data:
        errors.append("🚨 Missing required field: 'tokens'")
        return errors

    # Validate token structure
    tokens = project_data.get("tokens", {})

    # Validate component tokens
    component_tokens = tokens.get("component", {})
    for comp_name, comp_settings in component_tokens.items():
        if not isinstance(comp_settings, dict):
            errors.append(f"🚨 Component '{comp_name}' must be an object")
            continue

        for prop, value in comp_settings.items():
            # Check for common mistakes
            if prop == "shadow":
                errors.append(f"🚨 Component '{comp_name}': Use 'boxShadow' instead of 'shadow'")
            elif "-" in prop:
                camel_prop = ''.join(word.capitalize() if i > 0 else word for i, word in enumerate(prop.split('-')))
                errors.append(f"🚨 Component '{comp_name}': Use camelCase '{camel_prop}' instead of '{prop}'")

            # Validate token references
            if isinstance(value, str) and value.startswith("{{") and value.endswith("}}"):
                token_path = value[2:-2].strip()
                error = validate_token_path(token_path, prop)
                if error:
                    errors.append(f"🚨 Component '{comp_name}.{prop}': {error}")

    return errors


def validate_token_path(token_path: str, property_name: str) -> str:
    """Validate token path format and suggest corrections"""
    parts = token_path.split('.')

    # Common token path patterns
    valid_patterns = {
        'colors': ['colors', 'colors', 'color-name'],
        'spacing': ['spacing', 'spacing', 'size'],
        'shadows': ['shadows', 'shadows', 'size'],
        'typography': ['typography', 'typography', 'property']
    }

    if len(parts) < 2:
        return f"Token path '{token_path}' is too short. Expected format: 'group.subgroup.token'"

    group = parts[0]
    if group not in valid_patterns:
        return f"Unknown token group '{group}'. Use: {list(valid_patterns.keys())}"

    expected_pattern = valid_patterns[group]
    if len(parts) != len(expected_pattern):
        example = '.'.join(expected_pattern)
        return f"Invalid token path '{token_path}'. Expected format: '{example}'"

    # Check for correct nesting
    if group == 'spacing' and not token_path.startswith('spacing.spacing.'):
        return f"Spacing tokens must use 'spacing.spacing.SIZE' format, not '{token_path}'"
    elif group == 'colors' and not token_path.startswith('colors.colors.'):
        return f"Color tokens must use 'colors.colors.COLOR' format, not '{token_path}'"
    elif group == 'shadows' and not token_path.startswith('shadows.shadows.'):
        return f"Shadow tokens must use 'shadows.shadows.SIZE' format, not '{token_path}'"

    return None  # Valid


def generate_project_template(project_name: str, extensions: List[str] = None) -> str:
    """Generate a template project file with proper token references"""
    if extensions is None:
        extensions = ["corporate", "light"]

    template = {
        "extends": extensions,
        "tokens": {
            "component": {
                "header": {
                    "padding": "{{spacing.spacing.sm}}",
                    "background": "{{colors.colors.surface}}",
                    "borderBottom": "1px solid {{colors.colors.border-subtle}}"
                },
                "card": {
                    "padding": "{{spacing.spacing.lg}}",
                    "background": "{{colors.colors.surface}}",
                    "border": "1px solid {{colors.colors.border-subtle}}",
                    "borderRadius": "8px",
                    "boxShadow": "{{shadows.shadows.sm}}"
                },
                "sidebar": {
                    "padding": "{{spacing.spacing.lg}}",
                    "background": "{{colors.colors.surface-secondary}}",
                    "width": "300px"
                }
            },
            "layout": {
                "grid": {
                    "gap": "{{spacing.spacing.lg}}",
                    "columns": {
                        "mobile": 1,
                        "tablet": 2,
                        "desktop": 4
                    }
                },
                "container": {
                    "maxWidth": "1400px",
                    "padding": "{{spacing.spacing.lg}}"
                }
            }
        }
    }

    return json.dumps(template, indent=2)


def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python validate_project.py <project_file>     # Validate existing file")
        print("  python validate_project.py --template <name>  # Generate template")
        sys.exit(1)

    if sys.argv[1] == "--template":
        if len(sys.argv) < 3:
            print("🚨 Template name required")
            sys.exit(1)

        project_name = sys.argv[2]
        template = generate_project_template(project_name)

        output_file = f"projects/{project_name}.json"
        os.makedirs("projects", exist_ok=True)

        with open(output_file, 'w') as f:
            f.write(template)

        print(f"✅ Generated template: {output_file}")
        print("📝 Edit the file and run validation before using it.")
        return

    # Validate existing file
    project_file = Path(sys.argv[1])
    errors = validate_project_json(project_file)

    if errors:
        print(f"🚨 VALIDATION FAILED for {project_file}:")
        for error in errors:
            print(f"   {error}")
        print("\n💡 Run with --template to generate a correct example")
        sys.exit(1)
    else:
        print(f"✅ Validation passed for {project_file}")


if __name__ == "__main__":
    main()