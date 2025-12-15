ALTER TABLE "devices" RENAME COLUMN "model" TO "device_type";--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "locale" text;