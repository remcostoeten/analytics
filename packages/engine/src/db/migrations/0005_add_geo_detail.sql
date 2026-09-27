ALTER TABLE events ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE events ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE events ADD COLUMN IF NOT EXISTS timezone text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS postal_code text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS continent text;
