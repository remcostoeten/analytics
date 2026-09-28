ALTER TABLE projects ADD COLUMN IF NOT EXISTS org_id text REFERENCES auth_organization (id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS sql_enabled boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS projects_org_idx ON projects (org_id);

ALTER TABLE auth_member ADD COLUMN IF NOT EXISTS project_ids text[];
ALTER TABLE auth_member DROP CONSTRAINT IF EXISTS auth_member_role_check;
ALTER TABLE auth_member ADD CONSTRAINT auth_member_role_check CHECK (role IN ('owner', 'admin', 'analyst', 'viewer'));

ALTER TABLE api_tokens DROP CONSTRAINT IF EXISTS api_tokens_scope_check;
ALTER TABLE api_tokens ADD CONSTRAINT api_tokens_scope_check CHECK (scope IN ('read', 'sql', 'admin'));

CREATE TABLE IF NOT EXISTS query_runs (
  id bigserial PRIMARY KEY,
  actor_kind text NOT NULL CHECK (actor_kind IN ('user', 'token')),
  actor_id text NOT NULL,
  project_ids text[] NOT NULL,
  statement text NOT NULL,
  duration_ms integer,
  row_count integer,
  blocked boolean NOT NULL DEFAULT false,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS query_runs_actor_idx ON query_runs (actor_kind, actor_id, created_at DESC);
