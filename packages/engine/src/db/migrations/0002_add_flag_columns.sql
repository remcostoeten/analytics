ALTER TABLE events
  ADD COLUMN IF NOT EXISTS is_preview  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bot_detected boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_internal  boolean NOT NULL DEFAULT false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS events_is_preview_idx  ON events (is_preview);
CREATE INDEX CONCURRENTLY IF NOT EXISTS events_bot_detected_idx ON events (bot_detected);

UPDATE events
SET
  is_preview  = COALESCE((meta->>'isPreview')::boolean, false),
  bot_detected = COALESCE((meta->>'botDetected')::boolean, false),
  is_internal  = COALESCE((meta->>'isInternal')::boolean, false)
WHERE
  meta IS NOT NULL
  AND (
    meta ? 'isPreview'
    OR meta ? 'botDetected'
    OR meta ? 'isInternal'
  );
