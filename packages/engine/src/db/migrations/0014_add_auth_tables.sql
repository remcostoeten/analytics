CREATE TABLE IF NOT EXISTS auth_user (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  email_verified boolean NOT NULL DEFAULT false,
  image text,
  github_login text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth_organization (
  id text PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo text,
  metadata text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth_session (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES auth_user (id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  ip_address text,
  user_agent text,
  active_organization_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_session_user_idx ON auth_session (user_id);

CREATE TABLE IF NOT EXISTS auth_account (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES auth_user (id) ON DELETE CASCADE,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_account_user_idx ON auth_account (user_id);

CREATE TABLE IF NOT EXISTS auth_verification (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth_member (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES auth_organization (id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES auth_user (id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS auth_member_org_user_uidx ON auth_member (organization_id, user_id);

CREATE TABLE IF NOT EXISTS auth_invitation (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES auth_organization (id) ON DELETE CASCADE,
  inviter_id text NOT NULL REFERENCES auth_user (id) ON DELETE CASCADE,
  email text NOT NULL,
  role text,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
