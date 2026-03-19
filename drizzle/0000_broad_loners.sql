CREATE TABLE "graphs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text DEFAULT 'Untitled graph' NOT NULL,
	"mermaid_code" text NOT NULL,
	"theme" text DEFAULT 'github-dark' NOT NULL,
	"code_font_size" smallint DEFAULT 16 NOT NULL,
	"transparent" boolean DEFAULT false NOT NULL,
	"source_preset_id" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "graphs_user_updated_idx" ON "graphs" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "graphs_user_title_idx" ON "graphs" USING btree ("user_id","title");