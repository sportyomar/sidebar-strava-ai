# api/projects_api.py
from flask import Blueprint, request, jsonify
import psycopg2
from psycopg2.extras import RealDictCursor
from registry import get_db_instance

projects_api = Blueprint('projects_api', __name__)


def get_connection(instance_info):
    return psycopg2.connect(
        host=instance_info['host'],
        port=instance_info['port'],
        database=instance_info['database_name'],
        user=instance_info['username'],
        password=instance_info['password']
    )


@projects_api.route('/api/projects/init', methods=['POST'])
def init_projects_schema():
    """Initialize the projects database schema"""
    try:
        instance_name = request.json.get("instance_name")
        instance_info = get_db_instance(instance_name)
        if not instance_info:
            return jsonify({"error": "Instance not found"}), 404

        conn = get_connection(instance_info)
        cursor = conn.cursor()

        # Create projects table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS projects (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                type VARCHAR(50) NOT NULL DEFAULT 'Document',
                description TEXT,

                -- Organization
                module VARCHAR(50) NOT NULL,
                workflow VARCHAR(100),
                stage VARCHAR(100),
                folder_path VARCHAR(500),

                -- Visual
                icon VARCHAR(10) DEFAULT '📄',
                color VARCHAR(7) DEFAULT '#4285f4',

                -- Ownership
                owner_id UUID,
                owner_name VARCHAR(255),
                owner_email VARCHAR(255),
                owner_avatar VARCHAR(500),

                -- Metadata
                status VARCHAR(20) DEFAULT 'active',
                priority VARCHAR(10) DEFAULT 'medium',
                tags TEXT[], -- PostgreSQL array

                -- File info
                file_size BIGINT DEFAULT 0,
                file_extension VARCHAR(10),
                mime_type VARCHAR(100),

                -- Timestamps
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                last_accessed_at TIMESTAMP DEFAULT NOW(),

                -- Permissions
                visibility VARCHAR(20) DEFAULT 'private',
                can_edit BOOLEAN DEFAULT true,
                can_share BOOLEAN DEFAULT true,
                can_delete BOOLEAN DEFAULT true,
                can_comment BOOLEAN DEFAULT true
            );

            -- Create collaborators table
            CREATE TABLE IF NOT EXISTS project_collaborators (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
                user_name VARCHAR(255) NOT NULL,
                user_email VARCHAR(255) NOT NULL,
                user_avatar VARCHAR(500),
                role VARCHAR(20) DEFAULT 'viewer', -- owner, editor, viewer, commenter
                added_at TIMESTAMP DEFAULT NOW()
            );

            -- Create user preferences table
            CREATE TABLE IF NOT EXISTS user_project_preferences (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_email VARCHAR(255) NOT NULL,
                project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
                is_starred BOOLEAN DEFAULT false,
                last_viewed_at TIMESTAMP,
                UNIQUE(user_email, project_id)
            );

            -- Create indexes for better performance
            CREATE INDEX IF NOT EXISTS idx_projects_module ON projects(module);
            CREATE INDEX IF NOT EXISTS idx_projects_owner_email ON projects(owner_email);
            CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
            CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);
            CREATE INDEX IF NOT EXISTS idx_collaborators_project_id ON project_collaborators(project_id);
            CREATE INDEX IF NOT EXISTS idx_preferences_user_email ON user_project_preferences(user_email);

            -- Update trigger for updated_at
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ language 'plpgsql';

            DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
            CREATE TRIGGER update_projects_updated_at
                BEFORE UPDATE ON projects
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        """)

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"success": True, "message": "Projects schema initialized"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@projects_api.route('/api/projects', methods=['POST'])
def create_project():
    """Create a new project"""
    try:
        instance_name = request.json.get("instance_name")
        instance_info = get_db_instance(instance_name)
        if not instance_info:
            return jsonify({"error": "Instance not found"}), 404

        project_data = request.json.get("project")
        if not project_data:
            return jsonify({"error": "Project data required"}), 400

        conn = get_connection(instance_info)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Insert project
        cursor.execute("""
            INSERT INTO projects (
                name, type, description, module, workflow, stage, folder_path,
                icon, color, owner_name, owner_email, owner_avatar,
                status, priority, tags, visibility
            ) VALUES (
                %(name)s, %(type)s, %(description)s, %(module)s, %(workflow)s, %(stage)s, %(folder_path)s,
                %(icon)s, %(color)s, %(owner_name)s, %(owner_email)s, %(owner_avatar)s,
                %(status)s, %(priority)s, %(tags)s, %(visibility)s
            ) RETURNING *
        """, project_data)

        new_project = cursor.fetchone()
        project_id = new_project['id']

        # Add collaborators if provided
        collaborators = request.json.get("collaborators", [])
        for collab in collaborators:
            cursor.execute("""
                INSERT INTO project_collaborators (project_id, user_name, user_email, user_avatar, role)
                VALUES (%s, %s, %s, %s, %s)
            """, (project_id, collab['name'], collab['email'], collab.get('avatar'), collab.get('role', 'viewer')))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"success": True, "project": dict(new_project)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@projects_api.route('/api/projects', methods=['GET'])
def get_projects():
    """Get projects with filtering and user preferences"""
    try:
        instance_name = request.args.get("instance_name")
        user_email = request.args.get("user_email")
        module_filter = request.args.get("module")
        status_filter = request.args.get("status", "active")
        search_term = request.args.get("search", "")
        limit = int(request.args.get("limit", 50))
        offset = int(request.args.get("offset", 0))

        instance_info = get_db_instance(instance_name)
        if not instance_info:
            return jsonify({"error": "Instance not found"}), 404

        conn = get_connection(instance_info)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Build query with filters
        where_conditions = ["p.status = %s"]
        params = [status_filter]

        if module_filter:
            where_conditions.append("p.module = %s")
            params.append(module_filter)

        if search_term:
            where_conditions.append("(p.name ILIKE %s OR p.description ILIKE %s)")
            search_pattern = f"%{search_term}%"
            params.extend([search_pattern, search_pattern])

        where_clause = " AND ".join(where_conditions)

        # Main query with user preferences
        query = f"""
            SELECT 
                p.*,
                up.is_starred,
                up.last_viewed_at,
                COUNT(pc.id) as collaborator_count
            FROM projects p
            LEFT JOIN user_project_preferences up ON p.id = up.project_id AND up.user_email = %s
            LEFT JOIN project_collaborators pc ON p.id = pc.project_id
            WHERE {where_clause}
            GROUP BY p.id, up.is_starred, up.last_viewed_at
            ORDER BY p.updated_at DESC
            LIMIT %s OFFSET %s
        """

        params = [user_email] + params + [limit, offset]
        cursor.execute(query, params)
        projects = cursor.fetchall()

        # Get total count
        count_query = f"SELECT COUNT(*) FROM projects p WHERE {where_clause}"
        cursor.execute(count_query, params[1:-2])  # Skip user_email, limit, offset
        total_count = cursor.fetchone()['count']

        cursor.close()
        conn.close()

        return jsonify({
            "projects": [dict(p) for p in projects],
            "total_count": total_count,
            "count": len(projects)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@projects_api.route('/api/projects/<project_id>/star', methods=['POST'])
def toggle_star_project(project_id):
    """Toggle star status for a project"""
    try:
        instance_name = request.json.get("instance_name")
        user_email = request.json.get("user_email")
        is_starred = request.json.get("is_starred", False)

        instance_info = get_db_instance(instance_name)
        if not instance_info:
            return jsonify({"error": "Instance not found"}), 404

        conn = get_connection(instance_info)
        cursor = conn.cursor()

        # Upsert user preference
        cursor.execute("""
            INSERT INTO user_project_preferences (user_email, project_id, is_starred, last_viewed_at)
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT (user_email, project_id)
            DO UPDATE SET is_starred = %s, last_viewed_at = NOW()
        """, (user_email, project_id, is_starred, is_starred))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@projects_api.route('/api/projects/<project_id>/access', methods=['POST'])
def update_last_accessed(project_id):
    """Update last accessed timestamp"""
    try:
        instance_name = request.json.get("instance_name")
        user_email = request.json.get("user_email")

        instance_info = get_db_instance(instance_name)
        if not instance_info:
            return jsonify({"error": "Instance not found"}), 404

        conn = get_connection(instance_info)
        cursor = conn.cursor()

        # Update project last_accessed_at
        cursor.execute("""
            UPDATE projects SET last_accessed_at = NOW() WHERE id = %s
        """, (project_id,))

        # Update user preference
        cursor.execute("""
            INSERT INTO user_project_preferences (user_email, project_id, last_viewed_at)
            VALUES (%s, %s, NOW())
            ON CONFLICT (user_email, project_id)
            DO UPDATE SET last_viewed_at = NOW()
        """, (user_email, project_id))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@projects_api.route('/api/projects/modules', methods=['GET'])
def get_module_options():
    """Get available modules and their workflows/stages"""
    modules = {
        "manifest": {"label": "Manifest", "workflows": ["Template Engine"]},
        "marketingCollateral": {"label": "Marketing Collateral",
                                "workflows": ["Brand & Creative Assets", "Sales Enablement", "Campaign Materials"]},
        "connectors": {"label": "Connectors", "workflows": ["Data Source Connectors", "Database Operations"]},
        "metrics": {"label": "Metrics", "workflows": ["Portfolio Reporting"]},
        "memoEditor": {"label": "Memo Editor", "workflows": ["Insights & Data", "CFO Services", "Due Diligence"]},
        "utilities": {"label": "Utilities",
                      "workflows": ["Library Discovery & Analysis", "Presentation Tools", "Workflow Mastery Tools"]},
        "dealIntake": {"label": "Deal Intake", "workflows": ["Deal Intake"]},
    }

    return jsonify({"modules": modules})