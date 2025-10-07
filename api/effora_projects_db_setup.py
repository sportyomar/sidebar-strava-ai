#!/usr/bin/env python3
"""
Projects Database Setup Script
Creates the projects_db database and initializes the schema
"""

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import requests

# Database configuration
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "username": "sporty",
    "password": "TqKwifr5jtJ6"
}

PROJECTS_DB_NAME = "projects_db"
FLASK_API_URL = "http://localhost:5002"  # Adjust if different


def create_database():
    """Create the projects database if it doesn't exist"""
    print(f"🚀 Creating database '{PROJECTS_DB_NAME}'...")

    try:
        # Connect to PostgreSQL server (using postgres database)
        conn = psycopg2.connect(
            host=DB_CONFIG["host"],
            port=DB_CONFIG["port"],
            database="postgres",  # Connect to default postgres db first
            user=DB_CONFIG["username"],
            password=DB_CONFIG["password"]
        )

        # Set autocommit for database creation
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        # Check if database already exists
        cursor.execute(
            "SELECT 1 FROM pg_catalog.pg_database WHERE datname = %s",
            (PROJECTS_DB_NAME,)
        )

        if cursor.fetchone():
            print(f"✅ Database '{PROJECTS_DB_NAME}' already exists!")
            cursor.close()
            conn.close()
            return True

        # Create the database
        cursor.execute(f'''
            CREATE DATABASE {PROJECTS_DB_NAME}
            WITH 
            OWNER = {DB_CONFIG["username"]}
            ENCODING = 'UTF8'
            LC_COLLATE = 'en_US.UTF-8'
            LC_CTYPE = 'en_US.UTF-8'
            TABLESPACE = pg_default
            CONNECTION LIMIT = -1
            IS_TEMPLATE = False;
        ''')

        # Add comment
        cursor.execute(f'''
            COMMENT ON DATABASE {PROJECTS_DB_NAME} 
            IS 'Dedicated database for project management system';
        ''')

        cursor.close()
        conn.close()

        print(f"✅ Database '{PROJECTS_DB_NAME}' created successfully!")
        return True

    except psycopg2.Error as e:
        print(f"❌ Failed to create database: {e}")
        return False


def test_projects_db_connection():
    """Test connection to the projects database"""
    print(f"🔍 Testing connection to '{PROJECTS_DB_NAME}'...")

    try:
        conn = psycopg2.connect(
            host=DB_CONFIG["host"],
            port=DB_CONFIG["port"],
            database=PROJECTS_DB_NAME,
            user=DB_CONFIG["username"],
            password=DB_CONFIG["password"]
        )

        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]

        cursor.execute("SELECT current_database();")
        current_db = cursor.fetchone()[0]

        cursor.close()
        conn.close()

        print(f"✅ Connection successful!")
        print(f"   Database: {current_db}")
        print(f"   Version: {version}")
        return True

    except psycopg2.Error as e:
        print(f"❌ Connection failed: {e}")
        return False


def initialize_projects_schema():
    """Initialize the projects schema via Flask API"""
    print(f"🏗️ Initializing projects schema...")

    try:
        response = requests.post(f"{FLASK_API_URL}/api/projects/init",
                                 json={"instance_name": "projects-db"})

        if response.status_code == 200:
            print("✅ Projects schema initialized successfully!")
            return True
        else:
            error_data = response.json()
            print(f"❌ Schema initialization failed: {error_data.get('error', 'Unknown error')}")
            return False

    except requests.RequestException as e:
        print(f"❌ Failed to call Flask API: {e}")
        print("   Make sure your Flask app is running!")
        return False


def create_sample_project():
    """Create a sample project to test the system"""
    print("📝 Creating sample project...")

    sample_project = {
        "name": "Welcome to Projects!",
        "type": "Document",
        "description": "This is your first project in the new projects database. You can edit or delete this sample project.",
        "module": "utilities",
        "workflow": "Workflow Mastery Tools",
        "stage": "Progress Tracking",
        "folder_path": "Utilities/Workflow Mastery Tools/Progress Tracking",
        "icon": "🎉",
        "color": "#4285f4",
        "owner_name": "System",
        "owner_email": "system@company.com",
        "owner_avatar": "https://i.pravatar.cc/32?img=10",
        "status": "active",
        "priority": "low",
        "tags": ["welcome", "sample", "getting-started"],
        "visibility": "private"
    }

    try:
        response = requests.post(f"{FLASK_API_URL}/api/projects",
                                 json={
                                     "instance_name": "projects-db",
                                     "project": sample_project,
                                     "collaborators": []
                                 })

        if response.status_code == 200:
            project = response.json()['project']
            print(f"✅ Sample project created with ID: {project['id']}")
            return True
        else:
            error_data = response.json()
            print(f"❌ Sample project creation failed: {error_data.get('error', 'Unknown error')}")
            return False

    except requests.RequestException as e:
        print(f"❌ Failed to create sample project: {e}")
        return False


def main():
    print("=" * 60)
    print("🏗️  PROJECTS DATABASE SETUP")
    print("=" * 60)
    print(f"Setting up dedicated database: {PROJECTS_DB_NAME}")
    print(f"Host: {DB_CONFIG['host']}:{DB_CONFIG['port']}")
    print(f"User: {DB_CONFIG['username']}")
    print()

    success_steps = 0
    total_steps = 4

    # Step 1: Create database
    if create_database():
        success_steps += 1

    print("-" * 40)

    # Step 2: Test connection
    if test_projects_db_connection():
        success_steps += 1

    print("-" * 40)

    # Step 3: Initialize schema
    if initialize_projects_schema():
        success_steps += 1

    print("-" * 40)

    # Step 4: Create sample project
    if create_sample_project():
        success_steps += 1

    print("\n" + "=" * 60)

    if success_steps == total_steps:
        print("🎉 SETUP COMPLETE!")
        print("=" * 60)
        print("Your projects database is ready!")
        print()
        print("✅ What was created:")
        print(f"   • Database: {PROJECTS_DB_NAME}")
        print("   • Tables: projects, project_collaborators, user_project_preferences")
        print("   • Sample project for testing")
        print()
        print("🚀 Next steps:")
        print("   1. Update your React components to use instanceName='projects-db'")
        print("   2. Test the ProjectSelectorModal")
        print("   3. Create your first real project!")
        print()
        print("💡 Usage in React:")
        print('   instanceName="projects-db"')
    else:
        print(f"⚠️  PARTIAL SETUP ({success_steps}/{total_steps} steps completed)")
        print("=" * 60)
        print("Some steps failed. Please check the errors above and:")
        print("1. Make sure PostgreSQL is running")
        print("2. Check database credentials")
        print("3. Ensure Flask app is running for schema initialization")


if __name__ == "__main__":
    main()