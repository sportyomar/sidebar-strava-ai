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
        "password": "TqKwifr5jtJ6"
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
    }
}

def get_db_instance(instance_name):
    return db_instances.get(instance_name)

def get_all_db_instances():
    """Return all available database instances"""
    return list(db_instances.keys())

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