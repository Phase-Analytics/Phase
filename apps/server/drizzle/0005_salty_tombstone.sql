DROP INDEX "apps_user_id_idx";--> statement-breakpoint
DROP INDEX "apps_key_idx";--> statement-breakpoint
DROP INDEX "devices_platform_idx";--> statement-breakpoint
DROP INDEX "sessions_analytics_last_activity_at_idx";--> statement-breakpoint
CREATE INDEX "apps_user_id_created_at_idx" ON "apps" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "devices_app_id_first_seen_idx" ON "devices" USING btree ("app_id","first_seen" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "sessions_started_at_idx" ON "sessions_analytics" USING btree ("started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "sessions_device_last_activity_idx" ON "sessions_analytics" USING btree ("device_id","last_activity_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "sessions_analytics_last_activity_at_idx" ON "sessions_analytics" USING btree ("last_activity_at" DESC NULLS LAST);