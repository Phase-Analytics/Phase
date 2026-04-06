CREATE TABLE "public_api_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"name" text NOT NULL,
	"token_hash" text NOT NULL,
	"token_prefix" text NOT NULL,
	"scopes" text[] DEFAULT '{}'::text[] NOT NULL,
	"expires_at" timestamp,
	"last_used_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "public_api_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "public_api_tokens" ADD CONSTRAINT "public_api_tokens_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_api_tokens" ADD CONSTRAINT "public_api_tokens_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "public_api_tokens_app_id_idx" ON "public_api_tokens" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "public_api_tokens_created_by_user_id_idx" ON "public_api_tokens" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "public_api_tokens_created_at_idx" ON "public_api_tokens" USING btree ("created_at" DESC NULLS LAST);