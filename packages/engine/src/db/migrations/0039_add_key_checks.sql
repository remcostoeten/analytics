ALTER TABLE projects ADD COLUMN IF NOT EXISTS public_key_created_at timestamptz;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS secret_key_created_at timestamptz;
UPDATE projects SET public_key_created_at = created_at WHERE public_key_created_at IS NULL;
UPDATE projects SET secret_key_created_at = created_at WHERE secret_key_created_at IS NULL;
ALTER TABLE projects ALTER COLUMN public_key_created_at SET DEFAULT now();
ALTER TABLE projects ALTER COLUMN public_key_created_at SET NOT NULL;
ALTER TABLE projects ALTER COLUMN secret_key_created_at SET DEFAULT now();
ALTER TABLE projects ALTER COLUMN secret_key_created_at SET NOT NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS key_check jsonb;
