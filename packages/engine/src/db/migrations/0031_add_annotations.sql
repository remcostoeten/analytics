CREATE TABLE IF NOT EXISTS annotations (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  date timestamptz NOT NULL,
  end_date timestamptz,
  kind text NOT NULL DEFAULT 'other' CHECK (kind IN ('release', 'post', 'content', 'incident', 'other')),
  note text CHECK (char_length(note) <= 2000),
  url text CHECK (char_length(url) <= 2048),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date IS NULL OR end_date >= date)
);

CREATE INDEX IF NOT EXISTS annotations_project_date_idx ON annotations (project_id, date, id);
