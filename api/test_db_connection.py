# Create a test script: test_db_connection.py
import psycopg2
import json


def test_connection():
    try:
        conn = psycopg2.connect("dbname=portfolio_db user=postgres password=TqKwifr5jtJ6 host=localhost port=60616")
        print("✅ Database connection successful")

        cur = conn.cursor()
        cur.execute("SELECT version()")
        version = cur.fetchone()
        print(f"PostgreSQL version: {version[0]}")

        # Test the specific query Step 2 uses
        cur.execute("SELECT step_data FROM step_01_progress WHERE user_id = %s", ('default',))
        row = cur.fetchone()
        if row:
            print("✅ Step 1 data found")
            data = json.loads(row[0])
            print(f"Data keys: {list(data.keys())}")
        else:
            print("❌ No Step 1 data found for user 'default'")

        cur.close()
        conn.close()

    except Exception as e:
        print(f"❌ Database connection failed: {e}")


if __name__ == "__main__":
    test_connection()