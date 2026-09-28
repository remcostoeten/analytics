CREATE TABLE IF NOT EXISTS ingest_counts (
  hour_start timestamptz PRIMARY KEY,
  requests integer NOT NULL DEFAULT 0,
  accepted integer NOT NULL DEFAULT 0,
  duplicates integer NOT NULL DEFAULT 0,
  rejected integer NOT NULL DEFAULT 0,
  rate_limited integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS job_runs (
  id bigserial PRIMARY KEY,
  job text NOT NULL,
  started_at timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('ok', 'failed')),
  duration_ms integer NOT NULL,
  rows_written integer,
  rows_deleted integer,
  message text
);

CREATE INDEX IF NOT EXISTS job_runs_job_idx ON job_runs (job, started_at DESC);

CREATE TABLE IF NOT EXISTS speed_checks (
  project_id text NOT NULL,
  metric text NOT NULL,
  checked_at timestamptz NOT NULL,
  ours double precision,
  crux double precision,
  gap double precision,
  flagged boolean NOT NULL DEFAULT false,
  PRIMARY KEY (project_id, metric)
);
