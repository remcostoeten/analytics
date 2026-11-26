ALTER TABLE projects ADD COLUMN IF NOT EXISTS replay_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS llm_enabled boolean NOT NULL DEFAULT false;
