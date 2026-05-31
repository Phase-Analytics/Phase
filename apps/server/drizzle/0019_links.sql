CREATE TABLE "link_domain_bindings" (
	"link_id" text NOT NULL,
	"domain_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "link_domains" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"hostname" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"last_check_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "link_domains_hostname_unique" UNIQUE("hostname")
);
--> statement-breakpoint
CREATE TABLE "links" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"slug" text NOT NULL,
	"destination_url" text NOT NULL,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"utm_term" text,
	"utm_content" text,
	"device_ios_url" text,
	"device_android_url" text,
	"device_others_url" text,
	"expires_at" timestamp,
	"disabled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "links_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "link_domain_bindings" ADD CONSTRAINT "link_domain_bindings_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_domain_bindings" ADD CONSTRAINT "link_domain_bindings_domain_id_link_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."link_domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_domains" ADD CONSTRAINT "link_domains_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "link_domain_bindings_pk" ON "link_domain_bindings" USING btree ("link_id","domain_id");--> statement-breakpoint
CREATE INDEX "link_domains_app_id_idx" ON "link_domains" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "link_domains_hostname_idx" ON "link_domains" USING btree ("hostname");--> statement-breakpoint
CREATE INDEX "links_app_id_created_at_idx" ON "links" USING btree ("app_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "links_slug_idx" ON "links" USING btree ("slug");