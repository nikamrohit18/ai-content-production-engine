CREATE TABLE "research_briefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"content" text NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"disputed_claims" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model_used" varchar(128) NOT NULL,
	"generation_cost_usd" numeric(10, 4) DEFAULT '0',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "research_briefs" ADD CONSTRAINT "research_briefs_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "research_briefs_topic_idx" ON "research_briefs" USING btree ("topic_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scripts_topic_version_idx" ON "scripts" USING btree ("topic_id","version");