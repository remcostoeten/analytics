CREATE TABLE IF NOT EXISTS logs (
  id bigserial PRIMARY KEY,
  project text NOT NULL,
  ts timestamptz NOT NULL DEFAULT now(),
  level text NOT NULL CHECK (level IN ('info', 'ok', 'warn', 'error')),
  kind text NOT NULL CHECK (kind IN ('ingest', 'transport', 'pipeline', 'signals', 'jobs', 'auth')),
  source text NOT NULL CHECK (source IN ('api', 'sdk', 'engine', 'cron')),
  message text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  visitor text,
  session text
);

CREATE INDEX IF NOT EXISTS logs_project_ts_idx ON logs (project, ts DESC);
