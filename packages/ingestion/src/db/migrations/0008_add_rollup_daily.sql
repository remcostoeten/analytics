CREATE TABLE IF NOT EXISTS rollup_daily (
	id bigserial PRIMARY KEY,
	project_id text NOT NULL,
	day date NOT NULL,
	dimension text NOT NULL,
	dim_value text NOT NULL DEFAULT '',
	pageviews integer NOT NULL DEFAULT 0,
	events integer NOT NULL DEFAULT 0,
	visitors integer NOT NULL DEFAULT 0,
	sessions integer NOT NULL DEFAULT 0,
	updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS rollup_daily_uidx ON rollup_daily(project_id, day, dimension, dim_value);
CREATE INDEX IF NOT EXISTS rollup_daily_project_day_idx ON rollup_daily(project_id, day);
