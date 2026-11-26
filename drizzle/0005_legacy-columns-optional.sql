ALTER TABLE "notebooks" ALTER COLUMN "opened_on" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "notebooks" ALTER COLUMN "scan_key" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "notebooks" ALTER COLUMN "transcription_key" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "notebooks" ALTER COLUMN "transcription" DROP NOT NULL;