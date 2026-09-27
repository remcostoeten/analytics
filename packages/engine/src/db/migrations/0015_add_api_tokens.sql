CREATE TABLE IF NOT EXISTS api_tokens (
  id text PRIMARY KEY,
  name text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  scope text NOT NULL CHECK (scope IN ('read', 'admin')),
  project_ids text[],
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
