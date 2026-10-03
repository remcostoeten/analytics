ALTER TABLE projects ADD COLUMN IF NOT EXISTS widget_reports boolean NOT NULL DEFAULT false;

ALTER TABLE api_tokens ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'api' CHECK (kind IN ('api', 'widget'));

CREATE INDEX IF NOT EXISTS api_tokens_kind_expires_idx ON api_tokens (kind, expires_at);
