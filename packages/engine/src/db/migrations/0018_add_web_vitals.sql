CREATE TABLE IF NOT EXISTS web_vitals (
  id text PRIMARY KEY,
  project_id text NOT NULL,
  session_id text,
  ts timestamptz NOT NULL,
  metric text NOT NULL CHECK (metric IN ('lcp', 'inp', 'cls', 'fcp', 'ttfb')),
  value double precision NOT NULL,
  rating text NOT NULL CHECK (rating IN ('good', 'needs-improvement', 'poor')),
  route text,
  path text NOT NULL,
  device text NOT NULL,
  country text,
  connection text,
  selector text,
  sample_rate real NOT NULL DEFAULT 1,
  navigation_type text,
  bot_score smallint NOT NULL DEFAULT 0,
  is_internal boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS web_vitals_project_metric_ts_idx ON web_vitals (project_id, metric, ts);
