ALTER TABLE "pages" ADD COLUMN "words" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', "text")) STORED;--> statement-breakpoint
CREATE INDEX "pages_words_idx" ON "pages" USING gin ("words");--> statement-breakpoint
CREATE INDEX "municipalities_postal_codes_idx" ON "municipalities" USING gin ("postal_codes");