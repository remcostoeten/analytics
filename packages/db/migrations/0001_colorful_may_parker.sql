DROP INDEX "events_project_ts_idx";--> statement-breakpoint
DROP INDEX "events_project_ts_type_idx";--> statement-breakpoint
CREATE INDEX "events_project_ts_idx" ON "events" USING btree ("project_id","ts");--> statement-breakpoint
CREATE INDEX "events_project_ts_type_idx" ON "events" USING btree ("project_id","ts","type");