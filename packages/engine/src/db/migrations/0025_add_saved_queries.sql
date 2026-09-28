CREATE TABLE IF NOT EXISTS saved_queries (
  id text PRIMARY KEY,
  name text NOT NULL,
  sql text NOT NULL,
  description text,
  chart text CHECK (chart IN ('table', 'line', 'bar')),
  created_by_kind text NOT NULL CHECK (created_by_kind IN ('user', 'token')),
  created_by_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS saved_queries_name_idx ON saved_queries (lower(name), id);
