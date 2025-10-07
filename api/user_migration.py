# user_migration.py
# Script to migrate user data from portfolio_db to account_management_db

import psycopg2
from psycopg2.extras import RealDictCursor
from registry import get_account_management_db

# Source database (portfolio_db) configuration
PORTFOLIO_DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "portfolio_db",
    "user": "sporty",
    "password": "TqKwifr5jtJ6"
}


def get_portfolio_connection():
    """Get connection to portfolio_db (source)"""
    return psycopg2.connect(**PORTFOLIO_DB_CONFIG)


def get_account_management_connection():
    """Get connection to account_management_db (target)"""
    db_config = get_account_management_db()
    return psycopg2.connect(
        host=db_config['host'],
        port=db_config['port'],
        database=db_config['database_name'],
        user=db_config['username'],
        password=db_config['password']
    )


def check_existing_users():
    """Check what users already exist in both databases"""
    print("=== CHECKING EXISTING USERS ===")

    # Check portfolio_db users
    portfolio_conn = get_portfolio_connection()
    portfolio_cursor = portfolio_conn.cursor(cursor_factory=RealDictCursor)
    portfolio_cursor.execute("SELECT id, username, email, display_name FROM users")
    portfolio_users = portfolio_cursor.fetchall()

    print(f"Portfolio DB has {len(portfolio_users)} users:")
    for user in portfolio_users:
        print(f"  - {user['username']} ({user['email']}) - ID: {user['id']}")

    # Check account_management_db users
    account_conn = get_account_management_connection()
    account_cursor = account_conn.cursor(cursor_factory=RealDictCursor)
    account_cursor.execute("SELECT id, username, email, display_name FROM users")
    account_users = account_cursor.fetchall()

    print(f"\nAccount Management DB has {len(account_users)} users:")
    for user in account_users:
        print(f"  - {user['username']} ({user['email']}) - ID: {user['id']}")

    portfolio_conn.close()
    account_conn.close()

    return portfolio_users, account_users


def compare_schemas():
    """Compare user table schemas between databases"""
    print("\n=== COMPARING SCHEMAS ===")

    # Get portfolio_db schema
    portfolio_conn = get_portfolio_connection()
    portfolio_cursor = portfolio_conn.cursor()
    portfolio_cursor.execute("""
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position
    """)
    portfolio_schema = portfolio_cursor.fetchall()

    # Get account_management_db schema
    account_conn = get_account_management_connection()
    account_cursor = account_conn.cursor()
    account_cursor.execute("""
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position
    """)
    account_schema = account_cursor.fetchall()

    print("Portfolio DB schema:")
    for col in portfolio_schema:
        print(f"  {col[0]}: {col[1]} ({'NULL' if col[2] == 'YES' else 'NOT NULL'})")

    print("\nAccount Management DB schema:")
    for col in account_schema:
        print(f"  {col[0]}: {col[1]} ({'NULL' if col[2] == 'YES' else 'NOT NULL'})")

    portfolio_conn.close()
    account_conn.close()

    return portfolio_schema, account_schema


def add_missing_columns():
    """Add missing columns to account_management_db users table"""
    print("\n=== ADDING MISSING COLUMNS ===")

    account_conn = get_account_management_connection()
    account_cursor = account_conn.cursor()

    # Add columns that exist in portfolio_db but not in account_management_db
    columns_to_add = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS company_size TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS industry TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS evaluating_for_team BOOLEAN DEFAULT false",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true"
    ]

    for sql in columns_to_add:
        try:
            account_cursor.execute(sql)
            print(f"✓ Added column: {sql.split('ADD COLUMN IF NOT EXISTS')[1].split()[0]}")
        except Exception as e:
            print(f"✗ Failed to add column: {e}")

    account_conn.commit()
    account_conn.close()


def migrate_users(dry_run=True):
    """Migrate users from portfolio_db to account_management_db"""
    print(f"\n=== {'DRY RUN - ' if dry_run else ''}MIGRATING USERS ===")

    portfolio_conn = get_portfolio_connection()
    portfolio_cursor = portfolio_conn.cursor(cursor_factory=RealDictCursor)

    account_conn = get_account_management_connection()
    account_cursor = account_conn.cursor(cursor_factory=RealDictCursor)

    # Get all users from portfolio_db
    portfolio_cursor.execute("""
        SELECT id, username, email, display_name, password_hash, 
               phone_number, company_name, company_size, job_title, 
               industry, evaluating_for_team, avatar_url, created_at,
               is_active
        FROM users
    """)
    users_to_migrate = portfolio_cursor.fetchall()

    print(f"Found {len(users_to_migrate)} users to migrate")

    for user in users_to_migrate:
        # Check if user already exists by ID or email
        account_cursor.execute("SELECT id FROM users WHERE id = %s OR email = %s", (str(user['id']), user['email']))
        existing_user = account_cursor.fetchone()

        if existing_user:
            print(f"⚠️  User {user['email']} already exists, updating...")
            if not dry_run:
                # Update existing user with portfolio_db data
                account_cursor.execute("""
                    UPDATE users SET
                        username = %s,
                        display_name = %s,
                        password_hash = %s,
                        phone_number = %s,
                        company_name = %s,
                        company_size = %s,
                        job_title = %s,
                        industry = %s,
                        evaluating_for_team = %s,
                        avatar_url = %s,
                        is_active = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE email = %s
                """, (
                    user['username'], user['display_name'], user['password_hash'],
                    user['phone_number'], user['company_name'], user['company_size'],
                    user['job_title'], user['industry'], user['evaluating_for_team'],
                    user['avatar_url'], user['is_active'], user['email']
                ))
        else:
            print(f"➕ Creating new user: {user['email']}")
            if not dry_run:
                # Insert new user (keep original ID if possible, or generate new UUID)
                account_cursor.execute("""
                    INSERT INTO users (
                        id, username, email, display_name, password_hash,
                        phone_number, company_name, company_size, job_title,
                        industry, evaluating_for_team, avatar_url, created_at, 
                        updated_at, is_active
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                """, (
                    str(user['id']), user['username'], user['email'], user['display_name'],
                    user['password_hash'], user['phone_number'], user['company_name'],
                    user['company_size'], user['job_title'], user['industry'],
                    user['evaluating_for_team'], user['avatar_url'], user['created_at'],
                    user['created_at'], user['is_active']
                ))

    if not dry_run:
        account_conn.commit()
        print("✅ Migration completed successfully!")
    else:
        print("🔍 Dry run completed - no changes made")

    portfolio_conn.close()
    account_conn.close()


def update_auth_blueprint():
    """Instructions for updating auth_blueprint.py"""
    print("\n=== NEXT STEPS ===")
    print("1. Update auth_blueprint.py to use account_management_db:")
    print("   - Replace DB_CONFIG with: from registry import get_account_management_db")
    print("   - Update get_user_by_email and get_user_by_id to use the registry")
    print("   - Test login functionality")
    print("\n2. Verify file management system works with migrated users")
    print("\n3. Consider backing up portfolio_db users table before making changes live")


if __name__ == "__main__":
    print("User Migration Tool")
    print("=" * 50)

    try:
        # Step 1: Check current state
        portfolio_users, account_users = check_existing_users()

        # Step 2: Compare schemas
        compare_schemas()

        # Step 3: Add missing columns
        add_missing_columns()

        # Step 4: Dry run migration
        print("\nRunning dry run...")
        migrate_users(dry_run=True)

        # Step 5: Ask for confirmation to proceed
        response = input("\nProceed with actual migration? (y/N): ")
        if response.lower() == 'y':
            migrate_users(dry_run=False)

        # Step 6: Show next steps
        update_auth_blueprint()

    except Exception as e:
        print(f"❌ Error during migration: {e}")
        import traceback

        traceback.print_exc()