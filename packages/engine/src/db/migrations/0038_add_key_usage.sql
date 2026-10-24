ALTER TABLE projects ADD COLUMN IF NOT EXISTS public_key_used_at timestamptz;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS public_key_used_origin text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS secret_key_used_at timestamptz;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS secret_key_used_origin text;
