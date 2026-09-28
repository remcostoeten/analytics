ALTER TABLE events ADD COLUMN IF NOT EXISTS fingerprint text;
CREATE UNIQUE INDEX IF NOT EXISTS events_fingerprint_uidx ON events(fingerprint);
