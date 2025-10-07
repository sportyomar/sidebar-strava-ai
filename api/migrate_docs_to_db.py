#!/usr/bin/env python3
"""
Migration script to move docs.json data into the docs_db database
Run from project root directory
"""

import json
import os
import re
import sys
import psycopg2
from psycopg2.extras import RealDictCursor

# Simple registry setup - adjust these values for your setup
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database_name": "docs_db",
    "username": "sporty",
    "password": "TqKwifr5jtJ6"
}


def extract_sections_from_markdown(markdown_content):
    """Extract heading sections from markdown content"""
    lines = markdown_content.split('\n')
    sections = []

    for i, line in enumerate(lines):
        # Match h1-h6 headings
        heading_match = re.match(r'^(#{1,6})\s+(.+)$', line.strip())
        if heading_match:
            level = len(heading_match.group(1))
            title = heading_match.group(2)
            anchor = title.lower().replace(' ', '-').replace('&', 'and')
            anchor = re.sub(r'[^a-z0-9\-]', '', anchor).strip('-')

            sections.append({
                'title': title,
                'level': level,
                'anchor': anchor,
                'sort_order': len(sections) + 1
            })

    return sections


def get_db_connection():
    """Get database connection"""
    return psycopg2.connect(
        host=DB_CONFIG['host'],
        port=DB_CONFIG['port'],
        database=DB_CONFIG['database_name'],
        user=DB_CONFIG['username'],
        password=DB_CONFIG['password']
    )


def migrate_docs(docs_json_path, articles_dir):
    """Main migration function"""

    # Load docs.json
    with open(docs_json_path, 'r') as f:
        docs_data = json.load(f)

    # Connect to database
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # First, create document groups from TOC entries
        toc_groups = {}
        for doc in docs_data:
            if doc['type'] == 'toc':
                toc_groups[doc['tocId']] = {
                    'title': doc['title'],
                    'description': doc['description']
                }

        # Insert document groups
        print("Inserting document groups...")
        for toc_id, group_data in toc_groups.items():
            cursor.execute("""
                INSERT INTO document_groups (toc_id, title, description, sort_order)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (toc_id) DO UPDATE SET
                    title = EXCLUDED.title,
                    description = EXCLUDED.description,
                    updated_at = CURRENT_TIMESTAMP
            """, (toc_id, group_data['title'], group_data['description'], 0))

        conn.commit()
        print(f"✓ Inserted {len(toc_groups)} document groups")

        # Insert documents
        print("Inserting documents...")
        documents_inserted = 0

        for i, doc in enumerate(docs_data):
            cursor.execute("""
                INSERT INTO documents (
                    id, title, description, type, toc_id, 
                    body_path, code_snippet_path, sort_order
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    title = EXCLUDED.title,
                    description = EXCLUDED.description,
                    type = EXCLUDED.type,
                    toc_id = EXCLUDED.toc_id,
                    body_path = EXCLUDED.body_path,
                    code_snippet_path = EXCLUDED.code_snippet_path,
                    sort_order = EXCLUDED.sort_order,
                    updated_at = CURRENT_TIMESTAMP
            """, (
                doc['id'],
                doc['title'],
                doc['description'],
                doc['type'],
                doc['tocId'],
                doc['bodyPath'],
                doc.get('codeSnippetPath'),
                i
            ))
            documents_inserted += 1

        conn.commit()
        print(f"✓ Inserted {documents_inserted} documents")

        # Extract and insert sections from markdown files
        print("Extracting and inserting document sections...")
        sections_inserted = 0

        for doc in docs_data:
            if doc['bodyPath']:
                # Convert web path to file path
                file_path = doc['bodyPath'].replace('/docs/articles/', '')
                full_path = os.path.join(articles_dir, file_path)

                if os.path.exists(full_path):
                    try:
                        with open(full_path, 'r', encoding='utf-8') as f:
                            markdown_content = f.read()

                        sections = extract_sections_from_markdown(markdown_content)

                        # Delete existing sections for this document
                        cursor.execute(
                            "DELETE FROM document_sections WHERE document_id = %s",
                            (doc['id'],)
                        )

                        # Insert new sections
                        for section in sections:
                            cursor.execute("""
                                INSERT INTO document_sections (
                                    document_id, title, anchor, level, sort_order
                                )
                                VALUES (%s, %s, %s, %s, %s)
                            """, (
                                doc['id'],
                                section['title'],
                                section['anchor'],
                                section['level'],
                                section['sort_order']
                            ))
                            sections_inserted += 1

                        print(f"  ✓ {doc['id']}: {len(sections)} sections")

                    except Exception as e:
                        print(f"  ✗ Error processing {full_path}: {e}")
                else:
                    print(f"  ✗ File not found: {full_path}")

        conn.commit()
        print(f"✓ Inserted {sections_inserted} document sections")

    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    # Simple file detection
    possible_docs_paths = [
        "Sidebar/sidebar/public/docs/docs.json",
        "public/docs/docs.json",
        "docs/docs.json"
    ]

    possible_articles_paths = [
        "Sidebar/sidebar/public/docs/articles",
        "public/docs/articles",
        "docs/articles"
    ]

    docs_json_path = None
    articles_dir = None

    # Find docs.json
    for path in possible_docs_paths:
        if os.path.exists(path):
            docs_json_path = path
            break

    # Find articles directory
    for path in possible_articles_paths:
        if os.path.exists(path):
            articles_dir = path
            break

    if not docs_json_path:
        print("Error: docs.json not found. Searched:")
        for path in possible_docs_paths:
            print(f"  {path}")
        sys.exit(1)

    if not articles_dir:
        print("Error: articles directory not found. Searched:")
        for path in possible_articles_paths:
            print(f"  {path}")
        sys.exit(1)

    print(f"Found docs.json: {docs_json_path}")
    print(f"Found articles: {articles_dir}")
    print("Starting migration...")

    try:
        migrate_docs(docs_json_path, articles_dir)
        print("\nMigration completed successfully! 🎉")
    except Exception as e:
        print(f"\nMigration failed: {e}")
        sys.exit(1)