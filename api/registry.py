# api/registry.py

db_instances = {
    "local-postgres": {
        "host": "localhost",
        "port": 5432,
        "database_name": "portfolio_db",
        "username": "sporty",
        "password": "TqKwifr5jtJ6"
    },
    "projects-db": {
        "host": "localhost",
        "port": 5432,
        "database_name": "projects_db",
        "username": "sporty",
        "password": "TqKwifr5jtJ6"
    },
    "account-management-db": {
        "host": "localhost",
        "port": 5432,
        "database_name": "account_management_db",  # New database for workspaces, projects, org management
        "username": "sporty",
        "password": "TqKwifr5jtJ6",
        "config_types": ["ui_customization", "workspace_settings", "user_preferences"]
    },
    "threads-db": {
        "host": "localhost",
        "port": 5432,
        "database_name": "threads_db",
        "username": "sporty",
        "password": "TqKwifr5jtJ6"
    },
    "docs-db": {  # New docs database
        "host": "localhost",
        "port": 5432,
        "database_name": "docs_db",
        "username": "sporty",
        "password": "TqKwifr5jtJ6"
    },
    "rag-db": {
        "host": "localhost",
        "port": 5432,
        "database_name": "rag_db",
        "username": "sporty",
        "password": "TqKwifr5jtJ6"
    },
    "interactions-db": {
        "host": "localhost",
        "port": 5432,
        "database_name": "interactions_db",
        "username": "sporty",
        "password": "TqKwifr5jtJ6"
    },
    "marketing-db": {
        "host": "localhost",
        "port": 5432,
        "database_name": "marketing_db",
        "username": "sporty",
        "password": "TqKwifr5jtJ6"
    },
    "templates-db": {
        "host": "localhost",
        "port": 5432,
        "database_name": "templates_db",
        "username": "sporty",
        "password": "TqKwifr5jtJ6"
    },
    "playbooks-db": {
        "host": "localhost",
        "port": 5432,
        "database_name": "playbooks_db",
        "username": "sporty",
        "password": "TqKwifr5jtJ6"
    },
    "welcome-db": {
        "host": "localhost",
        "port": 5432,
        # "database_name": "playbooks_db",
        "database_name": "welcome_db",
        "username": "sporty",
        "password": "TqKwifr5jtJ6"
    },
    "outreach-db": {
        "host": "localhost",
        "port": 5432,
        "database_name": "outreach_db",
        "username": "sporty",
        "password": "TqKwifr5jtJ6"
    },
    "strava-db": {
        "host": "localhost",
        "port": 5432,
        "database_name": "strava_db",
        "username": "sporty",
        "password": "TqKwifr5jtJ6"
    },
    "policies-db": {
        "host": "localhost",
        "port": 5432,
        "database_name": "policies_db",
        "username": "sporty",
        "password": "TqKwifr5jtJ6"
    }
}



def get_db_instance(instance_name):
    return db_instances.get(instance_name)

def get_policies_db():
    """Convenience function to get the policies database instance"""
    return get_db_instance("policies-db")

def get_strava_db():
    """Convenience function to get the Strava database instance"""
    return get_db_instance("strava-db")

def get_outreach_db():
    """Convenience function to get the outreach database instance"""
    return get_db_instance("outreach-db")

def get_playbooks_db():
    """Convenience function to get the playbooks database instance"""
    return get_db_instance("playbooks-db")

def get_welcome_db():
    """Convenience function to get the playbooks database instance"""
    return get_db_instance("welcome-db")


def get_all_db_instances():
    """Return all available database instances"""
    return list(db_instances.keys())

def get_templates_db():
    return get_db_instance("templates-db")

def get_marketing_db():
    """Convenience function to get the marketing database instance"""
    return get_db_instance("marketing-db")

def get_rag_db():
    return get_db_instance("rag-db")

def get_projects_db():
    """Convenience function to get the projects database instance"""
    return get_db_instance("projects-db")

def get_account_management_db():
    """Convenience function to get the account management database instance"""
    return get_db_instance("account-management-db")

def get_portfolio_db():
    """Convenience function to get the portfolio database instance"""
    return get_db_instance("local-postgres")

def get_threads_db():
    return get_db_instance("threads-db")

def get_docs_db():
    """Convenience function to get the docs database instance"""
    return get_db_instance("docs-db")

# New config-specific functions
def get_ui_config_db():
    """Get database instance for UI customization data"""
    return get_account_management_db()

def get_config_db_for_type(config_type):
    """Route different config types to appropriate databases"""
    config_routing = {
        "ui_customization": "account-management-db",
        "database_connections": "local-postgres", # meta config
        "feature_flags": "account-management-db",
        "api_settings": "account-management-db"
    }
    return get_db_instance(config_routing.get(config_type))