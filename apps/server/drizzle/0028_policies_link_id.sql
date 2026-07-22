DELETE FROM "policies";
--> statement-breakpoint
DROP INDEX IF EXISTS "policies_slug_unique";
--> statement-breakpoint
ALTER TABLE "policies" DROP COLUMN IF EXISTS "slug";
--> statement-breakpoint
ALTER TABLE "policies" ADD COLUMN "link_id" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "policies_link_id_unique" ON "policies" USING btree ("link_id");
