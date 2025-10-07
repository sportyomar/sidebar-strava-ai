import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
import logging

logger = logging.getLogger(__name__)

# Connection pool for PostgreSQL
connection_pools = {}


def get_connection_pool(connection_params):
    """Get or create a connection pool for the given parameters."""

    # Create a unique key from connection params
    pool_key = f"{connection_params.get('host')}:{connection_params.get('port')}:{connection_params.get('database')}"

    if pool_key not in connection_pools:
        try:
            connection_pools[pool_key] = psycopg2.pool.SimpleConnectionPool(
                1,  # min connections
                10,  # max connections
                host=connection_params.get('host', 'localhost'),
                port=connection_params.get('port', 5432),
                database=connection_params.get('database'),
                user=connection_params.get('user'),
                password=connection_params.get('password')
            )
            logger.info(f"Created connection pool for {pool_key}")
        except psycopg2.Error as e:
            logger.error(f"Failed to create connection pool: {str(e)}")
            raise Exception(f"Database connection failed: {str(e)}")

    return connection_pools[pool_key]


@contextmanager
def get_db_connection(connection_params):
    """Context manager for database connections."""

    pool = get_connection_pool(connection_params)
    conn = pool.getconn()

    try:
        yield conn
    finally:
        pool.putconn(conn)


def test_connection(connection_params):
    """Test if connection parameters are valid."""

    try:
        with get_db_connection(connection_params) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT version();")
                version = cur.fetchone()
                return {
                    'success': True,
                    'version': version[0] if version else 'Unknown'
                }
    except Exception as e:
        logger.error(f"Connection test failed: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }


def execute_query(sql, connection_params):
    """Execute a SQL query and return results."""

    try:
        with get_db_connection(connection_params) as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Execute query
                cur.execute(sql)

                # If it's a SELECT query, fetch results
                if cur.description:
                    rows = cur.fetchall()
                    columns = [desc[0] for desc in cur.description]

                    # Convert RealDictRow to regular dict
                    rows_list = [dict(row) for row in rows]

                    return {
                        'success': True,
                        'rows': rows_list,
                        'columns': columns,
                        'rowCount': len(rows_list)
                    }
                else:
                    # For INSERT/UPDATE/DELETE
                    conn.commit()
                    return {
                        'success': True,
                        'rowCount': cur.rowcount,
                        'message': f"Query executed successfully. {cur.rowcount} rows affected."
                    }

    except psycopg2.Error as e:
        logger.error(f"Query execution failed: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }


def list_tables(connection_params):
    """List all tables in the database."""

    sql = """
        SELECT 
            schemaname,
            tablename,
            pg_total_relation_size(schemaname||'.'||tablename) as total_size
        FROM pg_tables
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
        ORDER BY tablename;
    """

    try:
        with get_db_connection(connection_params) as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(sql)
                tables = cur.fetchall()

                # Get row counts for each table
                tables_with_counts = []
                for table in tables:
                    count_sql = f"SELECT COUNT(*) FROM {table['schemaname']}.{table['tablename']}"
                    cur.execute(count_sql)
                    count = cur.fetchone()['count']

                    tables_with_counts.append({
                        'name': f"{table['schemaname']}.{table['tablename']}" if table['schemaname'] != 'public' else
                        table['tablename'],
                        'rows': count,
                        'size': table['total_size']
                    })

                return {
                    'success': True,
                    'tables': tables_with_counts
                }

    except psycopg2.Error as e:
        logger.error(f"Failed to list tables: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }


def describe_table(table_name, connection_params):
    """Get the schema/structure of a table."""

    # Handle schema.table format
    if '.' in table_name:
        schema, table = table_name.split('.')
    else:
        schema = 'public'
        table = table_name

    sql = """
        SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default,
            character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = %s AND table_name = %s
        ORDER BY ordinal_position;
    """

    try:
        with get_db_connection(connection_params) as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(sql, (schema, table))
                columns = cur.fetchall()

                # Get row count
                count_sql = f"SELECT COUNT(*) FROM {schema}.{table}"
                cur.execute(count_sql)
                row_count = cur.fetchone()['count']

                columns_info = []
                for col in columns:
                    columns_info.append({
                        'name': col['column_name'],
                        'type': col['data_type'],
                        'nullable': col['is_nullable'] == 'YES',
                        'default': col['column_default'],
                        'maxLength': col['character_maximum_length']
                    })

                return {
                    'success': True,
                    'table': table_name,
                    'columns': columns_info,
                    'rowCount': row_count
                }

    except psycopg2.Error as e:
        logger.error(f"Failed to describe table: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }


def close_all_pools():
    """Close all connection pools (useful for cleanup)."""

    for pool_key, pool in connection_pools.items():
        pool.closeall()
        logger.info(f"Closed connection pool for {pool_key}")

    connection_pools.clear()