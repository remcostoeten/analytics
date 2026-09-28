ALTER TABLE events
  ADD COLUMN IF NOT EXISTS bot_score smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bot_reasons text[] NOT NULL DEFAULT '{}';

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS bot_score smallint NOT NULL DEFAULT 0;

UPDATE events SET bot_score = 100 WHERE bot_detected = true AND bot_score = 0;

CREATE INDEX IF NOT EXISTS events_human_idx ON events (project_id, ts)
  WHERE bot_score < 50 AND is_internal = false AND is_localhost = false AND is_preview = false;
