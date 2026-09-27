ALTER TABLE events ADD COLUMN IF NOT EXISTS issue_id bigint;
CREATE INDEX IF NOT EXISTS events_issue_ts_idx ON events (issue_id, ts) WHERE issue_id IS NOT NULL;
