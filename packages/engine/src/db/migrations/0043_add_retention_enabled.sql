DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'projects'
      AND column_name = 'retention_enabled'
  ) THEN
    ALTER TABLE projects ADD COLUMN retention_enabled boolean NOT NULL DEFAULT false;
    UPDATE projects SET retention_enabled = true WHERE retention_days <> 90;
  END IF;
END $$;
