CREATE TABLE IF NOT EXISTS projects (
  id text PRIMARY KEY,
  name text NOT NULL,
  domain text NOT NULL,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  public_visitor_data boolean NOT NULL DEFAULT false,
  allowed_origins text[] NOT NULL DEFAULT '{}',
  public_key text NOT NULL UNIQUE,
  secret_key_hash text NOT NULL,
  retention_days integer NOT NULL DEFAULT 90 CHECK (retention_days > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO projects (id, name, domain, public_key, secret_key_hash)
SELECT
  seen.project_id,
  seen.project_id,
  COALESCE(
    (
      SELECT e.host
      FROM events e
      WHERE e.project_id = seen.project_id AND e.host IS NOT NULL AND e.host <> ''
      GROUP BY e.host
      ORDER BY count(*) DESC
      LIMIT 1
    ),
    seen.project_id
  ),
  'pk_live_' || substr(md5(gen_random_uuid()::text), 1, 16),
  encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex')
FROM (SELECT DISTINCT project_id FROM events WHERE project_id <> '') AS seen
ON CONFLICT (id) DO NOTHING;
