ALTER TABLE web_vitals ADD COLUMN IF NOT EXISTS is_preview boolean NOT NULL DEFAULT false;

CREATE OR REPLACE VIEW query.web_vitals WITH (security_barrier) AS
SELECT
  w.id AS vital_id,
  w.project_id,
  w.session_id,
  w.ts,
  w.metric,
  w.value,
  w.rating,
  w.route,
  w.path,
  w.device,
  w.country,
  w.connection,
  w.selector,
  w.sample_rate,
  w.navigation_type,
  w.bot_score,
  (w.bot_score < 50 AND NOT w.is_internal) AS is_human,
  w.is_internal,
  w.is_preview
FROM public.web_vitals w
WHERE w.project_id = ANY (query.allowed_projects());
