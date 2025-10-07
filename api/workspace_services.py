# workspace_services.py
import re
import psycopg2
from psycopg2.extras import RealDictCursor
from registry import get_account_management_db

# -------------------------
# DB connection (account/workspace metadata)
# -------------------------
def _account_conn():
    cfg = get_account_management_db()
    if not cfg:
        raise RuntimeError("registry.get_account_management_db() returned None")
    return psycopg2.connect(
        host=cfg["host"],
        port=cfg["port"],
        database=cfg["database_name"],
        user=cfg["username"],
        password=cfg["password"],
        cursor_factory=RealDictCursor,
    )

# -------------------------
# Membership / access
# -------------------------
def verify_workspace_access(user_id, workspace_id) -> bool:
    """Verify user has direct membership to workspace."""
    conn = _account_conn()
    try:
        with conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT 1
                FROM workspace_members
                WHERE workspace_id = %s AND user_id = %s
                LIMIT 1
                """,
                (workspace_id, user_id),
            )
            return cur.fetchone() is not None
    except Exception as e:
        print(f"[workspace_services.verify_workspace_access] {e}")
        return False
    finally:
        conn.close()

# -------------------------
# Provider & capability inference (no hardcoded model catalog)
# -------------------------
_PROVIDER_PATTERNS = [
    # (compiled_regex, provider_id)
    (re.compile(r"^(gpt-|o3|o4|gpt4|gpt-4o)", re.I), "openai"),
    (re.compile(r"^claude", re.I), "anthropic"),
]

def _infer_provider(model_id: str) -> str | None:
    """Best-effort provider inference from model_id prefix; no fixed model names."""
    if not model_id:
        return None
    for rx, prov in _PROVIDER_PATTERNS:
        if rx.search(model_id):
            return prov
    return None  # unknown

def _normalize_cap(value) -> int | None:
    """
    Try to normalize a 'cap' value (context window tokens) when supplied in settings.extra.
    Accepts int or strings like '128k', '32K', '2000'.
    """
    if value is None:
        return None
    if isinstance(value, int):
        return value
    s = str(value).strip().lower()
    m = re.match(r"^(\d+)\s*(k)?$", s)
    if not m:
        return None
    n = int(m.group(1))
    return n * 1000 if m.group(2) else n

# -------------------------
# Model metadata & settings
# -------------------------
def get_model_info(model_id: str, workspace_id: int) -> dict | None:
    """
    Return minimal provider/cap/category for an enabled model in this workspace.
    No 'models' table is used. We check 'workspace_llms' and read metadata from
    'workspace_llm_settings.extra' if present; otherwise we infer the provider.
    Shape:
      {
        "provider": "openai" | "anthropic" | None,
        "cap": <int | None>,
        "category": <str | None>,
        "provider_model": <str>  # typically equal to model_id
      }
    """
    if not model_id:
        return None

    conn = _account_conn()
    try:
        with conn, conn.cursor() as cur:
            # 1) ensure model is enabled for the workspace
            cur.execute(
                """
                SELECT 1
                FROM workspace_llms
                WHERE workspace_id = %s AND model_id = %s
                LIMIT 1
                """,
                (workspace_id, model_id),
            )
            if not cur.fetchone():
                return None  # not enabled -> treat as unknown

            # 2) try to read provider/cap/category from settings.extra
            cur.execute(
                """
                SELECT extra
                FROM workspace_llm_settings
                WHERE workspace_id = %s AND model_id = %s
                LIMIT 1
                """,
                (workspace_id, model_id),
            )
            row = cur.fetchone()
            extra = (row or {}).get("extra") or {}

        provider = extra.get("provider") or _infer_provider(model_id)
        cap = _normalize_cap(extra.get("cap"))
        category = extra.get("category")

        return {
            "provider": provider,
            "cap": cap,
            "category": category,
            "provider_model": model_id,
        }
    except Exception as e:
        print(f"[workspace_services.get_model_info] {e}")
        return None
    finally:
        conn.close()

def compute_effective_config(workspace_id: int, model_id: str) -> dict:
    """
    Merge sane defaults with per-workspace overrides from workspace_llm_settings,
    then clamp max_tokens by cap when available in settings.extra.
    """
    defaults = {
        "temperature": 0.7,
        "max_tokens": 1000,
        "system_prompt": "",
        "tool_choice": "auto",
        "extra": {},
        "is_default": False,
        "updated_at": None,
    }

    conn = _account_conn()
    try:
        with conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT temperature, max_tokens, system_prompt, tool_choice, extra, is_default, updated_at
                FROM workspace_llm_settings
                WHERE workspace_id = %s AND model_id = %s
                LIMIT 1
                """,
                (workspace_id, model_id),
            )
            row = cur.fetchone()

        if row:
            for k in ["temperature", "max_tokens", "system_prompt", "tool_choice", "extra", "is_default", "updated_at"]:
                if row.get(k) is not None:
                    defaults[k] = row[k]

        # Clamp by cap if provided in extra
        cap = _normalize_cap((defaults.get("extra") or {}).get("cap"))
        if cap and defaults.get("max_tokens"):
            defaults["max_tokens"] = min(int(defaults["max_tokens"]), int(cap))

        return defaults
    except Exception as e:
        print(f"[workspace_services.compute_effective_config] {e}")
        return defaults
    finally:
        conn.close()

def get_models_for_workspace(workspace_id: int) -> list[dict]:
    """
    Authoritative list of models for a workspace, with enablement and settings.
    Returns an array of:
      {
        "modelId": str,
        "enabled": True,
        "isDefault": bool,
        "settings": { ...raw settings row... } | None,
        "effectiveConfig": { ...merged defaults... },
        "modelInfo": {
          "provider": str | None,
          "cap": int | None,
          "category": str | None,
          "provider_model": str
        }
      }
    """
    conn = _account_conn()
    try:
        with conn, conn.cursor() as cur:
            # Enabled models
            cur.execute(
                """
                SELECT wl.model_id
                FROM workspace_llms wl
                WHERE wl.workspace_id = %s
                ORDER BY wl.model_id ASC
                """,
                (workspace_id,),
            )
            enabled_ids = [r["model_id"] for r in cur.fetchall()]

            if not enabled_ids:
                return []

            # Settings for those models
            cur.execute(
                """
                SELECT model_id,
                       temperature, max_tokens, system_prompt, tool_choice,
                       usage_limits, cost_controls, extra, is_default,
                       updated_by, updated_at
                FROM workspace_llm_settings
                WHERE workspace_id = %s
                  AND model_id = ANY(%s)
                """,
                (workspace_id, enabled_ids),
            )
            settings_by_id = {r["model_id"]: r for r in cur.fetchall()}

        result = []
        for mid in enabled_ids:
            eff = compute_effective_config(workspace_id, mid)
            info = get_model_info(mid, workspace_id) or {
                "provider": None,
                "cap": None,
                "category": None,
                "provider_model": mid,
            }
            result.append({
                "modelId": mid,
                "enabled": True,
                "isDefault": bool(eff.get("is_default")),
                "settings": settings_by_id.get(mid),
                "effectiveConfig": eff,
                "modelInfo": info,
            })
        return result
    except Exception as e:
        print(f"[workspace_services.get_models_for_workspace] {e}")
        return []
    finally:
        conn.close()
