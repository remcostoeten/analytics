CREATE TABLE IF NOT EXISTS issues (
  id bigserial PRIMARY KEY,
  project_id text NOT NULL,
  fingerprint text NOT NULL,
  title text NOT NULL,
  culprit text,
  level text NOT NULL DEFAULT 'error' CHECK (level IN ('error', 'warning')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'ignored')),
  count integer NOT NULL DEFAULT 0,
  visitors integer NOT NULL DEFAULT 0,
  first_seen timestamptz NOT NULL,
  last_seen timestamptz NOT NULL,
  first_release text,
  last_release text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, fingerprint)
);
CREATE INDEX IF NOT EXISTS issues_project_status_last_seen_idx ON issues (project_id, status, last_seen);
