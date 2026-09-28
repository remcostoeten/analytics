CREATE TABLE IF NOT EXISTS rate_limits (
  key text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);
CREATE INDEX IF NOT EXISTS rate_limits_window_idx ON rate_limits (window_start);
