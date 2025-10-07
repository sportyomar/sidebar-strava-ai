# Design Project File Guide

## 🎯 Quick Start

### Generate a Template
```bash
python validate_project.py --template portfolio_q3_2024
```

### Validate Before Use
```bash
python validate_project.py projects/portfolio_q3_2024.json
```

## 📋 Token Reference Guide

### ✅ Correct Token Paths

| **Category** | **Path Format** | **Example** |
|--------------|-----------------|-------------|
| **Colors** | `{{colors.colors.TOKEN}}` | `{{colors.colors.surface}}` |
| **Spacing** | `{{spacing.spacing.TOKEN}}` | `{{spacing.spacing.lg}}` |
| **Shadows** | `{{shadows.shadows.TOKEN}}` | `{{shadows.shadows.sm}}` |
| **Typography** | `{{typography.typography.TOKEN}}` | `{{typography.typography.font-size-md}}` |

### ❌ Common Mistakes

| **Wrong** | **Right** | **Why** |
|-----------|-----------|---------|
| `{{colors.surface}}` | `{{colors.colors.surface}}` | Missing nested structure |
| `{{spacing.lg}}` | `{{spacing.spacing.lg}}` | Missing nested structure |
| `"shadow": "..."` | `"boxShadow": "..."` | Wrong CSS property |
| `"border-radius": "..."` | `"borderRadius": "..."` | Use camelCase |

## 🏗️ Component Structure

### Basic Component
```json
{
  "component": {
    "header": {
      "padding": "{{spacing.spacing.sm}}",
      "background": "{{colors.colors.surface}}",
      "borderBottom": "1px solid {{colors.colors.border-subtle}}"
    }
  }
}
```

### Available CSS Properties (camelCase)

#### Layout
- `width`, `height`, `maxWidth`, `minWidth`
- `padding`, `paddingTop`, `paddingRight`, etc.
- `margin`, `marginTop`, `marginRight`, etc.

#### Visual
- `background`, `backgroundColor`
- `color`, `border`, `borderTop`, `borderRadius`
- `boxShadow` (NOT `shadow`)
- `opacity`, `visibility`

#### Typography
- `fontSize`, `fontWeight`, `fontFamily`
- `lineHeight`, `letterSpacing`
- `textAlign`, `textDecoration`

## 📏 Available Tokens

### Spacing Tokens
```
xs, sm, md, lg, xl, 2xl, 3xl
```

### Color Tokens
```
surface, surface-secondary, surface-tertiary
border-subtle, border-medium
text-primary, text-secondary, text-muted
accent-primary, accent-secondary
success, warning, error, info
brand-primary, brand-secondary, brand-accent
```

### Shadow Tokens
```
xs, sm, md, lg, xl
```

## 🎨 Complete Example

```json
{
  "extends": ["corporate", "light"],
  "tokens": {
    "component": {
      "header": {
        "padding": "{{spacing.spacing.sm}}",
        "background": "{{colors.colors.surface}}",
        "borderBottom": "1px solid {{colors.colors.border-subtle}}",
        "fontSize": "{{typography.typography.font-size-lg}}"
      },
      "card": {
        "padding": "{{spacing.spacing.lg}}",
        "background": "{{colors.colors.surface}}",
        "border": "1px solid {{colors.colors.border-subtle}}",
        "borderRadius": "8px",
        "boxShadow": "{{shadows.shadows.sm}}"
      },
      "button": {
        "padding": "{{spacing.spacing.sm}} {{spacing.spacing.md}}",
        "background": "{{colors.colors.accent-primary}}",
        "color": "{{colors.colors.surface}}",
        "borderRadius": "4px",
        "fontSize": "{{typography.typography.font-size-sm}}"
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
```

## 🚨 Validation Process

1. **Create project file** (use template or manual)
2. **Validate immediately**: `python validate_project.py projects/yourfile.json`
3. **Fix any errors** shown in validation
4. **Only then run**: `python resolve_designKinds.py project_name`

## 💡 IDE Setup (Optional)

### VS Code JSON Schema
Add to your VS Code settings:
```json
{
  "json.schemas": [
    {
      "fileMatch": ["**/designKinds/projects/*.json"],
      "url": "./design-project-schema.json"
    }
  ]
}
```

This gives you **auto-completion** and **real-time validation** as you type!