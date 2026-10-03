CREATE TABLE IF NOT EXISTS invites (
  id text PRIMARY KEY,
  token_hash text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('admin', 'analyst', 'viewer')),
  project_ids text[],
  email text,
  accepted_by text REFERENCES auth_user (id) ON DELETE SET NULL,
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invites_email_idx ON invites (lower(email)) WHERE accepted_by IS NULL;
