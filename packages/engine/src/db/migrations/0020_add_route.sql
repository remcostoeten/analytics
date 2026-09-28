ALTER TABLE events ADD COLUMN IF NOT EXISTS route text;
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS entry_route text,
  ADD COLUMN IF NOT EXISTS exit_route text;
ALTER TABLE rollup_daily ADD COLUMN IF NOT EXISTS route text;

CREATE INDEX IF NOT EXISTS events_project_route_ts_idx ON events (project_id, route, ts);
