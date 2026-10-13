ALTER TABLE dashboard_users ADD COLUMN IF NOT EXISTS github_id text;
ALTER TABLE dashboard_users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'viewer';
ALTER TABLE dashboard_users ADD COLUMN IF NOT EXISTS project_ids text[] DEFAULT '{}';
ALTER TABLE auth_user ADD COLUMN IF NOT EXISTS github_id text;
CREATE UNIQUE INDEX IF NOT EXISTS dashboard_users_login_lower ON dashboard_users (lower(github_login));
