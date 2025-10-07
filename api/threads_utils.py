# threads_utils.py
from datetime import datetime
from decimal import Decimal
import psycopg2
from psycopg2.extras import RealDictCursor

# Database connection
DB_CONFIG = {
    'host': 'localhost',
    'database': 'threads_db',
    'user': 'sporty',
    'password': 'TqKwifr5jtJ6'
}

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)

def now():
    return datetime.utcnow().isoformat() + 'Z'

def convert_decimals(obj):
    """Recursively convert Decimal objects to float"""
    if isinstance(obj, dict):
        return {k: convert_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_decimals(item) for item in obj]
    elif isinstance(obj, Decimal):
        return float(obj)
    return obj