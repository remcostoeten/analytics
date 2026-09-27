CREATE TABLE "events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"type" text DEFAULT 'pageview' NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"path" text,
	"referrer" text,
	"origin" text,
	"host" text,
	"is_localhost" boolean DEFAULT false,
	"is_preview" boolean DEFAULT false,
	"bot_detected" boolean DEFAULT false,
	"is_internal" boolean DEFAULT false,
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
CREATE TABLE "visitors" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"fingerprint" text NOT NULL,
	"first_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"visit_count" integer DEFAULT 1 NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"device_type" text,
	"os" text,
	"os_version" text,
	"browser" text,
	"browser_version" text,
	"screen_resolution" text,
	"timezone" text,
	"language" text,
	"country" text,
	"region" text,
	"city" text,
	"ip_hash" text,
	"ua" text,
	"meta" jsonb,
	CONSTRAINT "visitors_fingerprint_unique" UNIQUE("fingerprint")
);
--> statement-breakpoint
CREATE INDEX "events_project_ts_idx" ON "events" USING btree ("project_id","ts");--> statement-breakpoint
CREATE INDEX "events_project_type_idx" ON "events" USING btree ("project_id","type");--> statement-breakpoint
CREATE INDEX "events_visitor_idx" ON "events" USING btree ("visitor_id");--> statement-breakpoint
CREATE INDEX "events_session_idx" ON "events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "events_path_idx" ON "events" USING btree ("path");--> statement-breakpoint
CREATE INDEX "events_host_idx" ON "events" USING btree ("host");--> statement-breakpoint
CREATE INDEX "events_country_idx" ON "events" USING btree ("country");--> statement-breakpoint
CREATE INDEX "events_project_ts_type_idx" ON "events" USING btree ("project_id","ts","type");--> statement-breakpoint
CREATE INDEX "events_is_preview_idx" ON "events" USING btree ("is_preview");--> statement-breakpoint
CREATE INDEX "events_bot_detected_idx" ON "events" USING btree ("bot_detected");--> statement-breakpoint
CREATE INDEX "idx_visitors_last_seen" ON "visitors" USING btree ("last_seen");--> statement-breakpoint
CREATE INDEX "idx_visitors_fingerprint" ON "visitors" USING btree ("fingerprint");