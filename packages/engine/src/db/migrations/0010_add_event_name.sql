ALTER TABLE events
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS received_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS channel text,
  ADD COLUMN IF NOT EXISTS referrer_domain text;

DO $$
DECLARE
  updated integer;
BEGIN
  LOOP
    UPDATE events
    SET name = COALESCE(meta->>'eventName', type)
    WHERE id IN (SELECT id FROM events WHERE name IS NULL LIMIT 10000);
    GET DIAGNOSTICS updated = ROW_COUNT;
    EXIT WHEN updated = 0;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS events_project_name_ts_idx ON events (project_id, name, ts);
CREATE INDEX IF NOT EXISTS events_props_gin ON events USING gin (meta jsonb_path_ops);
