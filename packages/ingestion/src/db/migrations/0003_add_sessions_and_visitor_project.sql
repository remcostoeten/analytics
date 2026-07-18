ALTER TABLE visitors ADD COLUMN IF NOT EXISTS project_id text NOT NULL DEFAULT 'default';

ALTER TABLE visitors DROP CONSTRAINT IF EXISTS visitors_fingerprint_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_visitors_project_fingerprint ON visitors (project_id, fingerprint);

CREATE TABLE IF NOT EXISTS sessions (
	id bigserial PRIMARY KEY,
	project_id text NOT NULL,
	session_id text NOT NULL,
	visitor_id text,
	started_at timestamp with time zone NOT NULL DEFAULT now(),
	last_event_at timestamp with time zone NOT NULL DEFAULT now(),
	entry_path text,
	exit_path text,
	referrer text,
	pageviews integer NOT NULL DEFAULT 0,
	events integer NOT NULL DEFAULT 0,
	duration_ms integer NOT NULL DEFAULT 0,
	country text,
	device_type text,
	is_internal boolean NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions (session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_project_started ON sessions (project_id, started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_visitor ON sessions (visitor_id);

UPDATE visitors v
SET project_id = COALESCE((
	SELECT e.project_id
	FROM events e
	WHERE e.visitor_id = v.fingerprint
	GROUP BY e.project_id
	ORDER BY COUNT(*) DESC
	LIMIT 1
), 'default');

INSERT INTO sessions (
	project_id, session_id, visitor_id, started_at, last_event_at,
	entry_path, exit_path, referrer, pageviews, events, duration_ms,
	country, device_type, is_internal
)
SELECT
	(array_agg(e.project_id ORDER BY e.ts))[1],
	e.session_id,
	(array_agg(e.visitor_id ORDER BY e.ts))[1],
	MIN(e.ts),
	MAX(e.ts),
	(array_agg(e.path ORDER BY e.ts))[1],
	(array_agg(e.path ORDER BY e.ts DESC))[1],
	(array_agg(e.referrer ORDER BY e.ts))[1],
	COUNT(*) FILTER (WHERE e.type = 'pageview'),
	COUNT(*),
	(EXTRACT(EPOCH FROM (MAX(e.ts) - MIN(e.ts))) * 1000)::integer,
	(array_agg(e.country ORDER BY e.ts))[1],
	(array_agg(e.device_type ORDER BY e.ts))[1],
	COALESCE(bool_or(e.is_internal), false)
FROM events e
WHERE e.session_id IS NOT NULL
GROUP BY e.session_id
ON CONFLICT (session_id) DO NOTHING;

UPDATE visitors v
SET visit_count = GREATEST(1, COALESCE((
	SELECT COUNT(DISTINCT e.session_id)
	FROM events e
	WHERE e.visitor_id = v.fingerprint AND e.session_id IS NOT NULL
), 0));
