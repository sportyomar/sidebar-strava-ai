#!/usr/bin/env python3
"""
Migration script to move static profile JSON files to database
Run with: python migrate_profiles_to_db.py
"""

import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from werkzeug.security import generate_password_hash

# Database configuration
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "portfolio_db",
    "user": "sporty",
    "password": "TqKwifr5jtJ6"
}


def create_tables():
    """Create the necessary tables for user profiles and assignments"""

    create_user_profiles_table = """
    CREATE TABLE IF NOT EXISTS user_profiles (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100),
        display_name VARCHAR(100),
        avatar VARCHAR(255),
        default_module VARCHAR(50),
        default_role VARCHAR(50),
        allowed_modules TEXT[], -- PostgreSQL array
        allowed_roles_by_module JSONB, -- JSON object for role mappings
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """

    create_project_assignments_table = """
    CREATE TABLE IF NOT EXISTS project_assignments (
        id SERIAL PRIMARY KEY,
        client VARCHAR(100) NOT NULL,
        project VARCHAR(100) NOT NULL,
        username VARCHAR(50) NOT NULL,
        role VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(client, project, username)
    );
    """

    create_user_sessions_table = """
    CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        username VARCHAR(50) NOT NULL,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        session_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """

    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        print("Creating tables...")
        cursor.execute(create_user_profiles_table)
        cursor.execute(create_project_assignments_table)
        cursor.execute(create_user_sessions_table)

        conn.commit()
        cursor.close()
        conn.close()
        print("✅ Tables created successfully")

    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False

    return True


def load_profile_files():
    """Load all profile JSON files from the profiles directory"""
    profiles_dir = "../src/profiles"
    profiles = {}

    if not os.path.exists(profiles_dir):
        print(f"❌ Profiles directory not found: {profiles_dir}")
        return None

    for filename in os.listdir(profiles_dir):
        if filename.endswith('.json') and filename != 'assignments.json':
            filepath = os.path.join(profiles_dir, filename)
            try:
                with open(filepath, 'r') as f:
                    profile_data = json.load(f)
                    username = filename.replace('.json', '')
                    profiles[username] = profile_data
                    print(f"📄 Loaded profile: {username}")
            except Exception as e:
                print(f"⚠️  Error loading {filename}: {e}")

    return profiles


def load_assignments():
    """Load assignments.json file"""
    assignments_path = "./profiles/assignments.json"

    if not os.path.exists(assignments_path):
        print(f"❌ Assignments file not found: {assignments_path}")
        return None

    try:
        with open(assignments_path, 'r') as f:
            assignments = json.load(f)
            print("📄 Loaded assignments.json")
            return assignments
    except Exception as e:
        print(f"❌ Error loading assignments: {e}")
        return None


def migrate_profiles(profiles):
    """Migrate profile data to user_profiles table"""

    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        print("Migrating user profiles...")

        for username, profile in profiles.items():
            # Extract profile data with defaults
            display_name = profile.get('displayName', username)
            avatar = profile.get('avatar', f'/avatars/{username}.jpg')
            default_module = profile.get('defaultModule', 'memoEditor')
            default_role = profile.get('defaultRole', 'consultant')
            allowed_modules = profile.get('allowedModules', [])
            allowed_roles_by_module = profile.get('allowedRolesByModule', {})

            # Generate email if not present
            email = profile.get('email', f'{username}@company.com')

            insert_query = """
            INSERT INTO user_profiles (
                username, email, display_name, avatar, default_module, 
                default_role, allowed_modules, allowed_roles_by_module
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (username) DO UPDATE SET
                email = EXCLUDED.email,
                display_name = EXCLUDED.display_name,
                avatar = EXCLUDED.avatar,
                default_module = EXCLUDED.default_module,
                default_role = EXCLUDED.default_role,
                allowed_modules = EXCLUDED.allowed_modules,
                allowed_roles_by_module = EXCLUDED.allowed_roles_by_module,
                updated_at = CURRENT_TIMESTAMP
            """

            cursor.execute(insert_query, (
                username, email, display_name, avatar, default_module,
                default_role, allowed_modules, json.dumps(allowed_roles_by_module)
            ))

            print(f"✅ Migrated profile: {username} ({display_name})")

        conn.commit()
        cursor.close()
        conn.close()
        print(f"✅ Successfully migrated {len(profiles)} profiles")

    except Exception as e:
        print(f"❌ Error migrating profiles: {e}")
        return False

    return True


def migrate_assignments(assignments):
    """Migrate assignments data to project_assignments table"""

    if not assignments or 'projects' not in assignments:
        print("⚠️  No project assignments found")
        return True

    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        print("Migrating project assignments...")

        for project in assignments['projects']:
            client = project.get('client', 'default')
            project_name = project.get('project', 'unknown')
            members = project.get('members', [])

            for member in members:
                username = member.get('username')
                role = member.get('role', 'consultant')

                if username:
                    insert_query = """
                    INSERT INTO project_assignments (client, project, username, role)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (client, project, username) DO UPDATE SET
                        role = EXCLUDED.role
                    """

                    cursor.execute(insert_query, (client, project_name, username, role))
                    print(f"✅ Assigned {username} as {role} to {client}/{project_name}")

        conn.commit()
        cursor.close()
        conn.close()
        print("✅ Successfully migrated project assignments")

    except Exception as e:
        print(f"❌ Error migrating assignments: {e}")
        return False

    return True


def create_demo_users_in_auth_table():
    """Create corresponding entries in the main users table for authentication"""

    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        print("Creating demo authentication users...")

        # Get all usernames from user_profiles
        cursor.execute("SELECT username, email, display_name, avatar FROM user_profiles")
        profiles = cursor.fetchall()

        for profile in profiles:
            username, email, display_name, avatar = profile

            # Check if user already exists in users table
            cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
            existing_user = cursor.fetchone()

            if not existing_user:
                # Create user with demo password
                password_hash = generate_password_hash('demo123')

                insert_user_query = """
                INSERT INTO users (email, password_hash, username, display_name, avatar_url)
                VALUES (%s, %s, %s, %s, %s)
                """

                cursor.execute(insert_user_query, (
                    email, password_hash, username, display_name, avatar
                ))

                print(f"✅ Created auth user: {username} (password: demo123)")
            else:
                print(f"⚠️  Auth user already exists: {username}")

        conn.commit()
        cursor.close()
        conn.close()
        print("✅ Demo authentication users ready")

    except Exception as e:
        print(f"❌ Error creating demo users: {e}")
        return False

    return True


def main():
    """Main migration function"""
    print("🚀 Starting profile migration to database...")
    print("=" * 50)

    # Step 1: Create tables
    if not create_tables():
        return

    # Step 2: Load profile files
    profiles = load_profile_files()
    if not profiles:
        return

    # Step 3: Load assignments
    assignments = load_assignments()

    # Step 4: Migrate profiles
    if not migrate_profiles(profiles):
        return

    # Step 5: Migrate assignments
    if assignments and not migrate_assignments(assignments):
        return

    # Step 6: Create demo auth users
    if not create_demo_users_in_auth_table():
        return

    print("=" * 50)
    print("🎉 Migration completed successfully!")
    print("\nNext steps:")
    print("1. Update AccessBar to use API endpoints instead of static files")
    print("2. Test login with any migrated user (password: demo123)")
    print("3. Verify user presence functionality")


if __name__ == "__main__":
    main()