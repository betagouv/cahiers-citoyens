ALTER TABLE "deliveries" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "failure" text;