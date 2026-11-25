CREATE TABLE "deliveries" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "deliveries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verifying_at" timestamp with time zone,
	"applying_at" timestamp with time zone,
	"applied_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"published_count" integer DEFAULT 0 NOT NULL,
	"replaced_count" integer DEFAULT 0 NOT NULL,
	"unchanged_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "deliveries_name_key" UNIQUE("name"),
	CONSTRAINT "deliveries_status_check" CHECK ("deliveries"."status" in ('received', 'verifying', 'applying', 'applied', 'rejected', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "lines" (
	"notebook_id" text NOT NULL,
	"page" integer NOT NULL,
	"position" integer NOT NULL,
	"kind" text NOT NULL,
	"zone" text,
	"text" text NOT NULL,
	"polygon" jsonb NOT NULL,
	CONSTRAINT "lines_pkey" PRIMARY KEY("notebook_id","page","position"),
	CONSTRAINT "lines_kind_check" CHECK ("lines"."kind" in ('handwritten', 'typed'))
);
--> statement-breakpoint
CREATE TABLE "notebook_versions" (
	"notebook_id" text NOT NULL,
	"version" integer NOT NULL,
	"delivery_id" bigint NOT NULL,
	"fingerprint" text NOT NULL,
	"schema_version" text NOT NULL,
	"page_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notebook_versions_pkey" PRIMARY KEY("notebook_id","version"),
	CONSTRAINT "notebook_versions_version_check" CHECK ("notebook_versions"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"notebook_id" text NOT NULL,
	"number" integer NOT NULL,
	"image_key" text NOT NULL,
	"image_content_type" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"text" text NOT NULL,
	"search" "tsvector" GENERATED ALWAYS AS (to_tsvector('french', "text")) STORED,
	CONSTRAINT "pages_pkey" PRIMARY KEY("notebook_id","number"),
	CONSTRAINT "pages_image_content_type_check" CHECK ("pages"."image_content_type" in ('image/jpeg', 'image/png'))
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"region_code" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "municipalities" (
	"insee_code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"department_code" text NOT NULL,
	"population" integer,
	"postal_codes" text[] DEFAULT '{}'::text[] NOT NULL,
	"search_name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "municipality_code_history" (
	"old_code" text PRIMARY KEY NOT NULL,
	"current_code" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chunks" ADD COLUMN "page" integer;--> statement-breakpoint
ALTER TABLE "notebooks" ADD COLUMN "status" text DEFAULT 'published' NOT NULL;--> statement-breakpoint
ALTER TABLE "notebooks" ADD COLUMN "online_version" integer;--> statement-breakpoint
ALTER TABLE "notebooks" ADD COLUMN "withdrawal_reason" text;--> statement-breakpoint
ALTER TABLE "notebooks" ADD COLUMN "withdrawn_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notebooks" ADD COLUMN "department_name" text;--> statement-breakpoint
ALTER TABLE "notebooks" ADD COLUMN "department_code" text;--> statement-breakpoint
ALTER TABLE "notebooks" ADD COLUMN "municipality_name" text;--> statement-breakpoint
ALTER TABLE "notebooks" ADD COLUMN "insee_code" text;--> statement-breakpoint
ALTER TABLE "notebooks" ADD COLUMN "postal_code" text;--> statement-breakpoint
ALTER TABLE "notebooks" ADD COLUMN "typed_transcription" text;--> statement-breakpoint
ALTER TABLE "notebooks" ADD COLUMN "handwritten_transcription" text;--> statement-breakpoint
ALTER TABLE "lines" ADD CONSTRAINT "lines_page_fk" FOREIGN KEY ("notebook_id","page") REFERENCES "public"."pages"("notebook_id","number") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebook_versions" ADD CONSTRAINT "notebook_versions_notebook_id_notebooks_id_fk" FOREIGN KEY ("notebook_id") REFERENCES "public"."notebooks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebook_versions" ADD CONSTRAINT "notebook_versions_delivery_id_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."deliveries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_notebook_id_notebooks_id_fk" FOREIGN KEY ("notebook_id") REFERENCES "public"."notebooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "municipality_code_history" ADD CONSTRAINT "municipality_code_history_current_code_municipalities_insee_code_fk" FOREIGN KEY ("current_code") REFERENCES "public"."municipalities"("insee_code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notebook_versions_delivery_id_idx" ON "notebook_versions" USING btree ("delivery_id");--> statement-breakpoint
CREATE INDEX "pages_search_idx" ON "pages" USING gin ("search");--> statement-breakpoint
CREATE INDEX "municipalities_search_name_idx" ON "municipalities" USING btree ("search_name" text_pattern_ops);--> statement-breakpoint
CREATE INDEX "municipalities_department_code_idx" ON "municipalities" USING btree ("department_code");--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_page_fk" FOREIGN KEY ("notebook_id","page") REFERENCES "public"."pages"("notebook_id","number") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebooks" ADD CONSTRAINT "notebooks_online_version_fk" FOREIGN KEY ("id","online_version") REFERENCES "public"."notebook_versions"("notebook_id","version") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notebooks_department_code_idx" ON "notebooks" USING btree ("department_code");--> statement-breakpoint
CREATE INDEX "notebooks_insee_code_idx" ON "notebooks" USING btree ("insee_code");--> statement-breakpoint
ALTER TABLE "notebooks" ADD CONSTRAINT "notebooks_status_check" CHECK ("notebooks"."status" in ('published', 'withdrawn'));--> statement-breakpoint
ALTER TABLE "notebooks" ADD CONSTRAINT "notebooks_withdrawal_reason_check" CHECK ("notebooks"."withdrawal_reason" in ('not_publishable', 'sensitive_content', 'source_correction', 'other'));--> statement-breakpoint
ALTER TABLE "notebooks" ADD CONSTRAINT "notebooks_withdrawal_check" CHECK (("notebooks"."status" = 'withdrawn') = ("notebooks"."withdrawal_reason" is not null) and ("notebooks"."withdrawal_reason" is null) = ("notebooks"."withdrawn_at" is null));--> statement-breakpoint
ALTER TABLE "notebooks" ADD CONSTRAINT "notebooks_typed_transcription_check" CHECK ("notebooks"."typed_transcription" in ('automatic', 'manual'));--> statement-breakpoint
ALTER TABLE "notebooks" ADD CONSTRAINT "notebooks_handwritten_transcription_check" CHECK ("notebooks"."handwritten_transcription" in ('automatic', 'manual'));