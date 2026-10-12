-- devices_app_id_idx is a strict prefix of devices_app_id_first_seen_idx.
DROP INDEX IF EXISTS "devices_app_id_idx";
--> statement-breakpoint
-- Leave room on each heap page so updates that touch no indexed column stay HOT.
ALTER TABLE "sessions_analytics" SET (fillfactor = 85);
--> statement-breakpoint
ALTER TABLE "devices" SET (fillfactor = 85);
--> statement-breakpoint
ALTER TABLE "sessions_analytics" SET (autovacuum_vacuum_scale_factor = 0.05, autovacuum_analyze_scale_factor = 0.05);
--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN IF NOT EXISTS "banned" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "link_slug_tombstones" (
  "slug" text PRIMARY KEY NOT NULL,
  "app_id" text NOT NULL,
  "deleted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "link_slug_tombstones_deleted_at_idx" ON "link_slug_tombstones" USING btree ("deleted_at");
--> statement-breakpoint
-- Hostnames were globally unique, so every verified row can be marked claimed
-- without conflicting on the partial unique index below.
UPDATE "link_domains"
SET "ownership_verified_at" = COALESCE("last_check_at", "created_at")
WHERE "status" = 'verified' AND "ownership_verified_at" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "link_domains_app_id_hostname_unique" ON "link_domains" USING btree ("app_id", "hostname");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "link_domains_verified_hostname_unique" ON "link_domains" USING btree ("hostname") WHERE "ownership_verified_at" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "link_domains" DROP CONSTRAINT IF EXISTS "link_domains_hostname_unique";
