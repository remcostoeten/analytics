CREATE TABLE IF NOT EXISTS "events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"type" text DEFAULT 'pageview' NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"path" text,
	"referrer" text,
	"origin" text,
	"host" text,
	"is_localhost" boolean DEFAULT false,
	"ua" text,
	"lang" text,
	"device_type" text,
	"ip_hash" text,
	"visitor_id" text,
	"session_id" text,
	"country" text,
	"region" text,
	"city" text,
	"meta" jsonb
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_project_ts_idx" ON "events" ("project_id",""events"."ts" desc");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_project_type_idx" ON "events" ("project_id","type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_visitor_idx" ON "events" ("visitor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_session_idx" ON "events" ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_path_idx" ON "events" ("path");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_host_idx" ON "events" ("host");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_country_idx" ON "events" ("country");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_project_ts_type_idx" ON "events" ("project_id",""events"."ts" desc","type");