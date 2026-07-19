CREATE TABLE IF NOT EXISTS dashboard_users (
	github_login text PRIMARY KEY,
	added_at timestamp with time zone NOT NULL DEFAULT now()
);
