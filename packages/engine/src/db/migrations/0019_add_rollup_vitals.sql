CREATE TABLE IF NOT EXISTS rollup_vitals (
  project_id text NOT NULL,
  day date NOT NULL,
  route text NOT NULL DEFAULT '',
  device text NOT NULL,
  metric text NOT NULL,
  samples integer NOT NULL,
  p50 double precision,
  p75 double precision,
  p90 double precision,
  p95 double precision,
  p99 double precision,
  good integer NOT NULL,
  needs_improvement integer NOT NULL,
  poor integer NOT NULL,
  PRIMARY KEY (project_id, day, route, device, metric)
);
