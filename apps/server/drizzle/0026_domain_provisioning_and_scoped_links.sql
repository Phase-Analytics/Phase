ALTER TABLE "link_domains" ADD COLUMN "provider_id" text;--> statement-breakpoint
ALTER TABLE "link_domains" ADD COLUMN "provider_status" text;--> statement-breakpoint
ALTER TABLE "link_domains" ADD COLUMN "verification_status" text;--> statement-breakpoint
ALTER TABLE "link_domains" ADD COLUMN "certificate_status" text;--> statement-breakpoint
ALTER TABLE "link_domains" ADD COLUMN "ownership_token" text;--> statement-breakpoint
ALTER TABLE "link_domains" ADD COLUMN "ownership_verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "link_domains" ADD COLUMN "legacy_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "link_domains" ADD COLUMN "dns_records" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "link_domains"
SET
  "status" = 'verified',
  "ownership_verified_at" = now(),
  "legacy_verified" = true,
  "last_check_at" = COALESCE("last_check_at", now()),
  "last_error" = NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "link_domains_id_app_id_unique" ON "link_domains" USING btree ("id", "app_id");--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "domain_id" text;--> statement-breakpoint
UPDATE "links" AS "link"
SET "domain_id" = "binding"."domain_id"
FROM (
  SELECT "binding"."link_id", MIN("binding"."domain_id") AS "domain_id"
  FROM "link_domain_bindings" AS "binding"
  INNER JOIN "links" AS "bound_link" ON "bound_link"."id" = "binding"."link_id"
  INNER JOIN "link_domains" AS "domain"
    ON "domain"."id" = "binding"."domain_id"
    AND "domain"."app_id" = "bound_link"."app_id"
  GROUP BY "binding"."link_id"
) AS "binding"
WHERE "link"."id" = "binding"."link_id";--> statement-breakpoint
DROP TABLE "link_domain_bindings";--> statement-breakpoint
ALTER TABLE "links" DROP CONSTRAINT "links_slug_unique";--> statement-breakpoint
DROP INDEX "links_slug_idx";--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_domain_id_app_id_link_domains_fk" FOREIGN KEY ("domain_id", "app_id") REFERENCES "public"."link_domains"("id", "app_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "links_default_slug_unique" ON "links" USING btree ("slug") WHERE "domain_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "links_domain_slug_unique" ON "links" USING btree ("domain_id", "slug") WHERE "domain_id" IS NOT NULL;