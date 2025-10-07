from flask import Blueprint, request, jsonify
import psycopg2
from psycopg2.extras import RealDictCursor
import pandas as pd
import os
from registry import get_db_instance

database_api = Blueprint('database_api', __name__)

def get_connection(instance_info):
    return psycopg2.connect(
        host=instance_info['host'],
        port=instance_info['port'],
        database=instance_info['database_name'],
        user=instance_info['username'],
        password=instance_info['password']
    )

@database_api.route('/api/db/tables', methods=['GET'])
def list_tables():
    try:
        instance_info = request.args.to_dict()

        conn = get_connection(instance_info)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' ORDER BY table_name;
        """)
        tables = cursor.fetchall()

        result = []
        for table in tables:
            name = table['table_name']
            cursor.execute(f'SELECT COUNT(*) FROM "{name}"')
            count = cursor.fetchone()['count']
            result.append({"name": name, "row_count": count})

        cursor.close()
        conn.close()

        return jsonify({"tables": result, "count": len(result)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@database_api.route('/api/db/tables', methods=['POST'])
def create_table():
    try:
        instance_info = request.json.get('instance')
        table_name = request.json.get('table_name')
        columns = request.json.get('columns', [])

        if not instance_info or not table_name or not columns:
            return jsonify({"error": "Missing required fields"}), 400

        conn = get_connection(instance_info)
        cursor = conn.cursor()

        column_defs = []
        for col in columns:
            col_def = f'"{col["name"]}" {col.get("type", "VARCHAR(255)")}'
            if not col.get("nullable", True):
                col_def += " NOT NULL"
            if col.get("primary_key"):
                col_def += " PRIMARY KEY"
            column_defs.append(col_def)

        create_sql = f'CREATE TABLE "{table_name}" ({", ".join(column_defs)});'
        cursor.execute(create_sql)
        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({"success": True, "sql": create_sql})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@database_api.route('/api/db/data', methods=['GET'])
def get_data():
    try:
        instance_info = request.args.to_dict()
        table = instance_info.pop("table")
        limit = int(instance_info.pop("limit", 100))
        offset = int(instance_info.pop("offset", 0))

        conn = get_connection(instance_info)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute(f'SELECT * FROM "{table}" LIMIT %s OFFSET %s', (limit, offset))
        rows = cursor.fetchall()

        cursor.execute(f'SELECT COUNT(*) FROM "{table}"')
        count = cursor.fetchone()['count']

        cursor.close()
        conn.close()

        return jsonify({"data": rows, "total_count": count})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@database_api.route('/api/db/data', methods=['POST'])
def insert_data():
    try:
        instance_info = request.json.get('instance')
        table = request.json.get('table')
        rows = request.json.get('data')

        if not all([instance_info, table, rows]):
            return jsonify({"error": "Missing required fields"}), 400

        conn = get_connection(instance_info)
        cursor = conn.cursor()

        if isinstance(rows, dict):
            rows = [rows]

        for row in rows:
            cols = list(row.keys())
            vals = list(row.values())
            placeholders = ', '.join(['%s'] * len(vals))
            quoted_cols = ', '.join([f'"{c}"' for c in cols])
            sql = f'INSERT INTO "{table}" ({quoted_cols}) VALUES ({placeholders})'
            cursor.execute(sql, vals)

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"success": True, "rows_inserted": len(rows)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@database_api.route('/api/db/query', methods=['POST'])
def run_query():
    try:
        instance_info = request.json.get('instance')
        query = request.json.get('query')

        if not instance_info or not query:
            return jsonify({"error": "Missing instance or query"}), 400

        conn = get_connection(instance_info)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute(query)

        if query.strip().lower().startswith("select"):
            results = cursor.fetchall()
            return jsonify({"results": results, "success": True})
        else:
            conn.commit()
            return jsonify({"success": True, "rows_affected": cursor.rowcount})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@database_api.route('/api/db/auth/init', methods=['POST'])
def init_auth_schema():
    try:
        instance_name = request.json.get("instance_name")
        instance_info = get_db_instance(instance_name)
        if not instance_info:
            return jsonify({"error": "Instance not found"}), 404

        conn = get_connection(instance_info)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE EXTENSION IF NOT EXISTS "pgcrypto";

            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                username VARCHAR(100) UNIQUE NOT NULL,
                display_name VARCHAR(255),
                avatar_url VARCHAR(500),
                created_at TIMESTAMP DEFAULT NOW(),
                is_active BOOLEAN DEFAULT true
            );
        """)
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"success": True, "message": "Auth schema created"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


