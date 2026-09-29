CREATE TABLE IF NOT EXISTS alert_targets (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  name text NOT NULL,
  channel text NOT NULL,
  events text[] NOT NULL,
  settings jsonb NOT NULL,
  webhook_secret text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, name)
);

CREATE TABLE IF NOT EXISTS alert_deliveries (
  id bigserial PRIMARY KEY,
  target_id text NOT NULL REFERENCES alert_targets (id) ON DELETE CASCADE,
  event_name text NOT NULL,
  subject_id text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (target_id, event_name, subject_id)
);

CREATE INDEX IF NOT EXISTS alert_deliveries_due_idx ON alert_deliveries (next_attempt_at) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS alert_deliveries_target_idx ON alert_deliveries (target_id, created_at DESC);
