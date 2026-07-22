CREATE TABLE "policies" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"date" date NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "policies_slug_unique" ON "policies" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "policies_app_id_created_at_idx" ON "policies" USING btree ("app_id","created_at" DESC);
