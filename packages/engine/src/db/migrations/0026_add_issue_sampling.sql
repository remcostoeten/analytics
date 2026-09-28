ALTER TABLE issues ADD COLUMN IF NOT EXISTS is_regression boolean NOT NULL DEFAULT false;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS minute_start timestamptz;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS minute_count integer NOT NULL DEFAULT 0;
