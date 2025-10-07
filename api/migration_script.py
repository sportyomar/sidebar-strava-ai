# migration_script.py
def migrate_existing_models():
    print("Starting migration...")
    """Populate new columns from dynamic discovery"""
    from account_blueprint import get_workspace_provider_credential
    from registry import get_account_management_db
    from llm_blueprint import fetch_available_openai_models, fetch_available_anthropic_models

    try:
        conn = get_account_management_db()  # account_management_db
        print("Database connected successfully")

        # Get all workspaces that have LLM settings
        with conn.cursor() as cur:
            cur.execute("SELECT DISTINCT workspace_id FROM workspace_llm_settings")
            workspaces = [row['workspace_id'] for row in cur.fetchall()]
            print(f"Found workspaces: {workspaces}")

        for workspace_id in workspaces:
            print(f"Processing workspace {workspace_id}")
            # Fetch models from providers (your existing logic)
            dynamic_models = {}

            # Get models from each provider
            openai_creds = get_workspace_provider_credential(workspace_id, 'openai')
            if openai_creds:
                dynamic_models.update(fetch_available_openai_models(openai_creds))

            anthropic_creds = get_workspace_provider_credential(workspace_id, 'anthropic')
            if anthropic_creds:
                dynamic_models.update(fetch_available_anthropic_models(anthropic_creds))

            # Update existing records with provider info
            with conn.cursor() as cur:
                for model_id, model_info in dynamic_models.items():
                    cur.execute("""
                        UPDATE workspace_llm_settings 
                        SET provider = %s, input_cap = %s, output_cap = %s, use_case = 'chat'
                        WHERE workspace_id = %s AND model_id = %s
                    """, (
                        model_info.get('provider'),
                        model_info.get('input_cap'),
                        model_info.get('output_cap', model_info.get('cap')),
                        workspace_id,
                        model_id
                    ))

        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Migration failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    migrate_existing_models()
    print("Migration completed")