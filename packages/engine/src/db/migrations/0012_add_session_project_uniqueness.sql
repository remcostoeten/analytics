ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS is_bounce boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS channel text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_campaign text;

UPDATE sessions SET is_bounce = false WHERE pageviews > 1 AND is_bounce = true;

CREATE UNIQUE INDEX IF NOT EXISTS sessions_project_session_uidx ON sessions (project_id, session_id);
