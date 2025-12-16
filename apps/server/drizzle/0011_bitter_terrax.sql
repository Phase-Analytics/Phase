ALTER TABLE "verification" ADD COLUMN "identifier" text NOT NULL;--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");