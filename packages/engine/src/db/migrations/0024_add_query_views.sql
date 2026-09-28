CREATE SCHEMA IF NOT EXISTS query;

CREATE TABLE IF NOT EXISTS query_secret (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  secret text NOT NULL
);
INSERT INTO query_secret (secret)
SELECT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
WHERE NOT EXISTS (SELECT 1 FROM query_secret);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'analytics_reader') THEN
    CREATE ROLE analytics_reader NOLOGIN;
  END IF;
END
$$;
GRANT analytics_reader TO CURRENT_USER;

CREATE OR REPLACE FUNCTION query.allowed_projects() RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $body$
  SELECT CASE
    WHEN current_setting('app.project_sig', true) = encode(sha256(convert_to(
      s.secret || encode(sha256(convert_to(s.secret || current_setting('app.project_ids', true), 'UTF8')), 'hex'),
      'UTF8')), 'hex')
    THEN current_setting('app.project_ids', true)::text[]
    ELSE ARRAY[]::text[]
  END
  FROM query_secret s
$body$;

CREATE OR REPLACE VIEW query.events WITH (security_barrier) AS
SELECT
  e.fingerprint AS event_id,
  e.project_id,
  COALESCE(e.name, e.meta->>'eventName', e.type) AS name,
  e.ts,
  e.received_at,
  e.visitor_id,
  e.session_id,
  e.host,
  e.path,
  e.route,
  e.referrer,
  e.referrer_domain,
  e.channel,
  e.meta->>'utmSource' AS utm_source,
  e.meta->>'utmMedium' AS utm_medium,
  e.meta->>'utmCampaign' AS utm_campaign,
  e.meta->>'utmTerm' AS utm_term,
  e.meta->>'utmContent' AS utm_content,
  e.country,
  e.region,
  e.city,
  e.continent,
  e.timezone,
  e.latitude,
  e.longitude,
  e.device_type AS device,
  e.meta->>'browser' AS browser,
  e.meta->>'browserVersion' AS browser_version,
  e.meta->>'os' AS os,
  e.meta->>'osVersion' AS os_version,
  e.meta->>'screenSize' AS screen,
  e.meta->>'viewport' AS viewport,
  e.lang AS language,
  e.meta->>'connectionType' AS connection,
  e.asn,
  e.as_org,
  COALESCE(e.meta, '{}'::jsonb) - ARRAY[
    'eventName', 'screenSize', 'viewport', 'timezone', 'connectionType', 'release', 'utmSource',
    'utmMedium', 'utmCampaign', 'utmTerm', 'utmContent', 'browser', 'browserVersion', 'os', 'osVersion'
  ] AS props,
  e.meta->>'release' AS release,
  e.bot_score,
  e.bot_reasons,
  (e.bot_score < 50 AND NOT COALESCE(e.is_internal, false) AND NOT COALESCE(e.is_localhost, false)
    AND NOT COALESCE(e.is_preview, false)) AS is_human,
  COALESCE(e.is_internal, false) AS is_internal,
  COALESCE(e.is_localhost, false) AS is_localhost,
  COALESCE(e.is_preview, false) AS is_preview,
  e.issue_id
FROM public.events e
WHERE e.project_id = ANY (query.allowed_projects());

CREATE OR REPLACE VIEW query.pageviews WITH (security_barrier) AS
SELECT
  ev.*,
  (EXTRACT(EPOCH FROM lead(ev.ts) OVER visit - ev.ts) * 1000)::bigint AS time_on_page_ms,
  (
    SELECT (max(LEAST((sd.meta->>'depth')::numeric, 100)) / 100)::real
    FROM public.events sd
    WHERE sd.project_id = ev.project_id AND sd.session_id = ev.session_id AND sd.path = ev.path
      AND COALESCE(sd.name, sd.meta->>'eventName') = 'scroll_depth'
      AND jsonb_typeof(sd.meta->'depth') = 'number'
  ) AS scroll_depth,
  lag(ev.path) OVER visit IS NULL AS is_entry,
  lead(ev.path) OVER visit IS NULL AS is_exit,
  lag(ev.path) OVER visit AS previous_path,
  lead(ev.path) OVER visit AS next_path,
  (row_number() OVER visit)::integer AS page_number
FROM query.events ev
WHERE ev.name = 'pageview'
WINDOW visit AS (PARTITION BY ev.project_id, ev.session_id ORDER BY ev.ts, ev.event_id);

CREATE OR REPLACE VIEW query.sessions WITH (security_barrier) AS
SELECT
  s.session_id,
  s.project_id,
  s.visitor_id,
  (row_number() OVER history)::integer AS visit_number,
  (EXTRACT(EPOCH FROM s.started_at - lag(s.last_event_at) OVER history) * 1000)::bigint AS since_previous_visit_ms,
  s.started_at,
  s.last_event_at AS ended_at,
  s.duration_ms::bigint AS duration_ms,
  s.pageviews,
  s.events,
  s.is_bounce,
  s.entry_path,
  s.entry_route,
  s.exit_path,
  s.exit_route,
  regexp_replace(substring(s.referrer FROM '^[A-Za-z][A-Za-z0-9+.-]*://([^/:?#]+)'), '^www\.', '') AS referrer_domain,
  s.channel,
  s.utm_source,
  s.utm_campaign,
  s.country,
  v.city,
  s.device_type AS device,
  v.browser,
  v.os,
  s.bot_score,
  (s.bot_score < 50 AND NOT s.is_internal) AS is_human,
  s.is_internal
FROM public.sessions s
LEFT JOIN public.visitors v ON v.project_id = s.project_id AND v.fingerprint = s.visitor_id
WHERE s.project_id = ANY (query.allowed_projects())
WINDOW history AS (PARTITION BY s.project_id, s.visitor_id ORDER BY s.started_at, s.session_id);

CREATE OR REPLACE VIEW query.visitors WITH (security_barrier) AS
SELECT
  v.fingerprint AS visitor_id,
  v.project_id,
  v.first_seen,
  v.last_seen,
  COALESCE(totals.visits, 0) AS visits,
  COALESCE(totals.pageviews, 0) AS pageviews,
  COALESCE(totals.events, 0) AS events,
  COALESCE(totals.duration_ms, 0) AS total_duration_ms,
  COALESCE(totals.visits, 0) > 1 AS is_returning,
  v.meta->'identity'->>'userId' AS user_id,
  CASE WHEN v.meta ? 'identity' THEN (v.meta->'identity') - 'userId' END AS traits,
  v.meta->'experiments' AS experiments,
  regexp_replace(substring(first_visit.referrer FROM '^[A-Za-z][A-Za-z0-9+.-]*://([^/:?#]+)'), '^www\.', '') AS first_referrer_domain,
  first_visit.channel AS first_channel,
  first_visit.utm_campaign AS first_utm_campaign,
  v.country,
  v.city,
  v.device_type AS device,
  v.browser,
  v.os,
  v.is_internal
FROM public.visitors v
LEFT JOIN LATERAL (
  SELECT count(*)::integer AS visits, sum(s.pageviews)::integer AS pageviews,
    sum(s.events)::integer AS events, sum(s.duration_ms)::bigint AS duration_ms
  FROM public.sessions s
  WHERE s.project_id = v.project_id AND s.visitor_id = v.fingerprint
) totals ON true
LEFT JOIN LATERAL (
  SELECT s.referrer, s.channel, s.utm_campaign
  FROM public.sessions s
  WHERE s.project_id = v.project_id AND s.visitor_id = v.fingerprint
  ORDER BY s.started_at
  LIMIT 1
) first_visit ON true
WHERE v.project_id = ANY (query.allowed_projects());

CREATE OR REPLACE VIEW query.people WITH (security_barrier) AS
SELECT
  vi.user_id,
  min(vi.first_seen) AS first_seen,
  max(vi.last_seen) AS last_seen,
  (array_agg(vi.project_id ORDER BY vi.first_seen, vi.project_id))[1] AS first_project,
  array_agg(DISTINCT vi.project_id) AS projects,
  sum(vi.visits)::integer AS visits,
  (array_agg(vi.traits ORDER BY vi.last_seen DESC))[1] AS traits
FROM query.visitors vi
WHERE vi.user_id IS NOT NULL
GROUP BY vi.user_id;

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
  w.is_internal
FROM public.web_vitals w
WHERE w.project_id = ANY (query.allowed_projects());

CREATE OR REPLACE VIEW query.issues WITH (security_barrier) AS
SELECT
  i.id AS issue_id,
  i.project_id,
  i.fingerprint,
  i.title,
  i.culprit,
  i.level,
  i.status,
  i.count,
  i.visitors,
  i.first_seen,
  i.last_seen,
  i.first_release,
  i.last_release,
  i.resolved_at
FROM public.issues i
WHERE i.project_id = ANY (query.allowed_projects());

CREATE OR REPLACE VIEW query.daily WITH (security_barrier) AS
SELECT
  r.project_id,
  r.day,
  r.dimension,
  r.dim_value AS value,
  r.visitors,
  r.sessions,
  r.pageviews,
  r.events
FROM public.rollup_daily r
WHERE r.project_id = ANY (query.allowed_projects());

CREATE OR REPLACE VIEW query.daily_vitals WITH (security_barrier) AS
SELECT
  r.project_id,
  r.day,
  NULLIF(r.route, '') AS route,
  r.device,
  r.metric,
  r.samples,
  r.p50,
  r.p75,
  r.p90,
  r.p95,
  r.p99,
  r.good,
  r.needs_improvement,
  r.poor
FROM public.rollup_vitals r
WHERE r.project_id = ANY (query.allowed_projects());

REVOKE ALL ON SCHEMA query FROM PUBLIC;
GRANT USAGE ON SCHEMA query TO analytics_reader;
GRANT EXECUTE ON FUNCTION query.allowed_projects() TO analytics_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA query TO analytics_reader;
