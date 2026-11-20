CREATE INDEX CONCURRENTLY IF NOT EXISTS events_project_ts_type_idx ON events (project_id, ts, type);

DROP INDEX CONCURRENTLY IF EXISTS events_project_ts_idx;
DROP INDEX CONCURRENTLY IF EXISTS events_project_type_idx;
DROP INDEX CONCURRENTLY IF EXISTS events_path_idx;
DROP INDEX CONCURRENTLY IF EXISTS events_is_preview_idx;
DROP INDEX CONCURRENTLY IF EXISTS events_props_gin;

CREATE INDEX CONCURRENTLY IF NOT EXISTS logs_project_id_idx ON logs (project, id);
