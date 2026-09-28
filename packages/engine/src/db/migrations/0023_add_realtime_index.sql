CREATE INDEX IF NOT EXISTS events_project_received_idx ON events (project_id, received_at, id);
