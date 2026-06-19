CREATE TABLE "trend_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"query" varchar(256) NOT NULL,
	"video_id" varchar(32) NOT NULL,
	"video_title" varchar(512) NOT NULL,
	"video_channel_title" varchar(256),
	"view_count" integer,
	"published_at" timestamp with time zone,
	"claimed_at" timestamp with time zone,
	"promoted_topic_id" uuid,
	"raw_metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trend_signals" ADD CONSTRAINT "trend_signals_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_signals" ADD CONSTRAINT "trend_signals_promoted_topic_id_topics_id_fk" FOREIGN KEY ("promoted_topic_id") REFERENCES "public"."topics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "trend_signals_channel_video_idx" ON "trend_signals" USING btree ("channel_id","video_id");--> statement-breakpoint
CREATE INDEX "trend_signals_channel_idx" ON "trend_signals" USING btree ("channel_id");