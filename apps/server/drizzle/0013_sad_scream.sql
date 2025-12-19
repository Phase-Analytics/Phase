ALTER TABLE "devices" ADD COLUMN "properties" jsonb;--> statement-breakpoint
CREATE INDEX "devices_properties_idx" ON "devices" USING gin ("properties");