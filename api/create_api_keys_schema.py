#!/usr/bin/env python3
"""
Database schema creation script for API Keys management.
Run this script to create the necessary tables for user API key storage.
"""

import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration (same as your auth_blueprint.py)
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "portfolio_db",
    "user": "sporty",
    "password": os.getenv("POSTGRES_PASSWORD", "TqKwifr5jtJ6")
}

# SQL schema creation
SCHEMA_SQL = """
-- API Keys Management Schema
-- Extension for UUID generation (if not already exists)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Main API keys table
CREATE TABLE IF NOT EXISTS user_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'openai', 'anthropic', 'azure_openai'
    api_key_encrypted TEXT NOT NULL, -- Encrypted API key

    -- Provider-specific fields
    endpoint_url TEXT, -- For Azure OpenAI endpoint
    api_version VARCHAR(20), -- For Azure OpenAI version
    organization_id VARCHAR(100), -- For OpenAI org ID
    deployment_names TEXT, -- For Azure deployments (comma-separated)

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_tested_at TIMESTAMP,
    last_test_status VARCHAR(20) DEFAULT 'unknown', -- 'connected', 'failed', 'testing', 'unknown'
    test_error_message TEXT,

    -- Constraints
    UNIQUE(user_id, provider),
    CHECK (provider IN ('openai', 'anthropic', 'azure_openai'))
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_provider 
    ON user_api_keys(user_id, provider);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_status 
    ON user_api_keys(last_test_status);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_api_key_timestamp()
    RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update timestamp trigger
DROP TRIGGER IF EXISTS trigger_update_api_key_timestamp ON user_api_keys;
CREATE TRIGGER trigger_update_api_key_timestamp
    BEFORE UPDATE ON user_api_keys
    FOR EACH ROW EXECUTE FUNCTION update_api_key_timestamp();

-- Optional: API key usage tracking table
CREATE TABLE IF NOT EXISTS api_key_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    model_id VARCHAR(100) NOT NULL,

    -- Usage metrics
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    cost_usd DECIMAL(10, 6) DEFAULT 0,
    latency_ms INTEGER DEFAULT 0,

    -- Request metadata
    request_timestamp TIMESTAMP DEFAULT NOW(),
    success BOOLEAN DEFAULT true,
    error_message TEXT,

    FOREIGN KEY (user_id, provider) REFERENCES user_api_keys(user_id, provider)
);

-- Index for usage analytics
CREATE INDEX IF NOT EXISTS idx_api_usage_user_date 
    ON api_key_usage(user_id, request_timestamp);

CREATE INDEX IF NOT EXISTS idx_api_usage_provider_model 
    ON api_key_usage(provider, model_id);
"""


def create_schema():
    """Create the API keys schema in the database."""
    print("🚀 Creating API Keys management schema...")
    print(f"📊 Connecting to database: {DB_CONFIG['database']} on {DB_CONFIG['host']}")

    try:
        # Connect to database
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        print("✅ Connected to database successfully")

        # Execute schema creation
        print("📝 Executing schema creation SQL...")
        cursor.execute(SCHEMA_SQL)
        conn.commit()

        print("✅ Schema created successfully!")

        # Verify tables were created
        cursor.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('user_api_keys', 'api_key_usage')
            ORDER BY table_name;
        """)

        tables = cursor.fetchall()
        print(f"📋 Created tables: {[table[0] for table in tables]}")

        # Check if users table exists (prerequisite)
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'users'
            );
        """)

        users_exists = cursor.fetchone()[0]
        if not users_exists:
            print("⚠️  WARNING: 'users' table does not exist. Run auth schema creation first.")
        else:
            print("✅ Users table exists - foreign key constraints are valid")

        cursor.close()
        conn.close()

        print("\n🎉 API Keys schema setup completed successfully!")
        print("\nNext steps:")
        print("1. Install cryptography: pip install cryptography")
        print("2. Set encryption key: export API_KEY_ENCRYPTION_KEY=<your-key>")
        print("3. Register api_keys_blueprint in your Flask app")
        print("4. Update frontend to use new API endpoints")

    except psycopg2.Error as e:
        print(f"❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

    return True


def check_prerequisites():
    """Check if required environment variables and dependencies are set."""
    print("🔍 Checking prerequisites...")

    # Check database password
    if not DB_CONFIG['password'] or DB_CONFIG['password'] == 'your-db-password':
        print("❌ POSTGRES_PASSWORD environment variable not set")
        print("   Set it with: export POSTGRES_PASSWORD=your_actual_password")
        return False

    # Check if we can import psycopg2
    try:
        import psycopg2
        print("✅ psycopg2 is available")
    except ImportError:
        print("❌ psycopg2 not installed. Install with: pip install psycopg2-binary")
        return False

    # Test database connection
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.close()
        print("✅ Database connection successful")
    except Exception as e:
        print(f"❌ Cannot connect to database: {e}")
        return False

    return True


def main():
    """Main function to run the schema creation."""
    print("🔧 API Keys Database Schema Setup")
    print("=" * 40)

    if not check_prerequisites():
        print("\n❌ Prerequisites not met. Please fix the issues above and try again.")
        return

    print("\n" + "=" * 40)
    if create_schema():
        print("\n🎊 Setup completed successfully!")
    else:
        print("\n💥 Setup failed. Check the error messages above.")


if __name__ == "__main__":
    main()