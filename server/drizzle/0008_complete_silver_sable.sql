DROP INDEX "verification_identifier_idx";--> statement-breakpoint
ALTER TABLE "devices" DROP COLUMN "identifier";--> statement-breakpoint
ALTER TABLE "verification" DROP COLUMN "identifier";