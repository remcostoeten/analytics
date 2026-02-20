CREATE TABLE "resume" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"event" text NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"path" text,
	"referrer" text,
	"origin" text,
	"host" text,
	"is_localhost" boolean,
	"ua" text,
	"lang" text,
	"ip_hash" text,
	"visitor_id" text,
	"country" text,
	"region" text,
	"city" text,
	"device_type" text,
	"resume_version" text,
	"meta" jsonb
);
--> statement-breakpoint
CREATE TABLE "visitor_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"visitor_id" bigint NOT NULL,
	"event_type" text NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"path" text,
	"referrer" text,
	"session_id" text,
	"duration_ms" integer,
	"meta" jsonb
);
--> statement-breakpoint
CREATE TABLE "visitors" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"fingerprint" text NOT NULL,
	"first_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"visit_count" integer DEFAULT 1 NOT NULL,
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
ALTER TABLE "visitor_events" ADD CONSTRAINT "visitor_events_visitor_id_visitors_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_visitor_events_visitor_id" ON "visitor_events" USING btree ("visitor_id");--> statement-breakpoint
CREATE INDEX "idx_visitor_events_event_type" ON "visitor_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_visitor_events_session_id" ON "visitor_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_visitor_events_ts" ON "visitor_events" USING btree ("ts");--> statement-breakpoint
CREATE INDEX "idx_visitors_last_seen" ON "visitors" USING btree ("last_seen");