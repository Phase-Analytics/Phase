ALTER TABLE "apps" ALTER COLUMN "member_ids" SET DEFAULT '{}'::text[];--> statement-breakpoint
CREATE INDEX "apps_member_ids_idx" ON "apps" USING gin ("member_ids");