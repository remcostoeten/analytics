ALTER TABLE events ADD COLUMN IF NOT EXISTS region_id integer;
ALTER TABLE events ADD COLUMN IF NOT EXISTS city_id integer;
ALTER TABLE events ADD COLUMN IF NOT EXISTS accuracy_km integer;

CREATE TABLE IF NOT EXISTS geo_places (
  id integer PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('country', 'region', 'city')),
  country text NOT NULL,
  names jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS geo_places_country_uidx ON geo_places (country) WHERE kind = 'country';

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
  e.issue_id,
  e.region_id,
  e.city_id,
  e.accuracy_km
FROM public.events e
WHERE e.project_id = ANY (query.allowed_projects());

DROP VIEW IF EXISTS query.pageviews;

CREATE VIEW query.pageviews WITH (security_barrier) AS
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

GRANT SELECT ON query.pageviews TO analytics_reader;
