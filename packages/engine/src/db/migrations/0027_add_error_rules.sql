CREATE TABLE IF NOT EXISTS error_rules (
  id text PRIMARY KEY,
  project_id text NOT NULL,
  field text NOT NULL CHECK (field IN ('message', 'stack')),
  pattern text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS error_rules_project_idx ON error_rules (project_id);

ALTER TABLE issues ADD COLUMN IF NOT EXISTS muted_until timestamptz;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS mute_remaining integer;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS regressed_at timestamptz;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS alerted_at timestamptz;
CREATE INDEX IF NOT EXISTS issues_alert_idx ON issues (alerted_at) WHERE status = 'open';
