CREATE TYPE "public"."asset_source" AS ENUM('wikimedia', 'internet_archive', 'loc', 'openai_image', 'elevenlabs', 'manual_upload');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('image_archival', 'image_ai_generated', 'audio_voiceover', 'audio_music', 'caption_track');--> statement-breakpoint
CREATE TYPE "public"."blob_access" AS ENUM('private', 'public');--> statement-breakpoint
CREATE TYPE "public"."cost_category" AS ENUM('llm_tokens', 'image_generation', 'tts_characters', 'video_render_compute', 'api_quota_units', 'storage');--> statement-breakpoint
CREATE TYPE "public"."cost_provider" AS ENUM('anthropic', 'openai_text', 'openai_image', 'elevenlabs', 'remotion_render', 'youtube_quota', 'vercel_blob', 'vercel_workflow', 'other');--> statement-breakpoint
CREATE TYPE "public"."fact_check_verdict" AS ENUM('supported', 'unsupported', 'disputed', 'needs_human_judgment');--> statement-breakpoint
CREATE TYPE "public"."niche" AS ENUM('history', 'lifestyle', 'personal_finance', 'health_relationships', 'tech_business');--> statement-breakpoint
CREATE TYPE "public"."publish_job_status" AS ENUM('pending_review', 'approved', 'queued', 'uploading', 'published', 'failed');--> statement-breakpoint
CREATE TYPE "public"."render_job_status" AS ENUM('queued', 'running', 'succeeded', 'failed', 'timed_out');--> statement-breakpoint
CREATE TYPE "public"."render_target" AS ENUM('vercel_sandbox', 'remotion_lambda');--> statement-breakpoint
CREATE TYPE "public"."script_status" AS ENUM('draft', 'submitted_for_review', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."topic_source" AS ENUM('manual', 'ai_suggested', 'trend_signal');--> statement-breakpoint
CREATE TYPE "public"."topic_status" AS ENUM('backlog', 'researching', 'scripting', 'factchecking', 'awaiting_review', 'approved', 'rejected', 'in_production', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."video_format" AS ENUM('longform', 'short');--> statement-breakpoint
CREATE TYPE "public"."video_status" AS ENUM('assembling', 'render_queued', 'rendering', 'render_failed', 'rendered', 'awaiting_final_review', 'approved_for_publish');--> statement-breakpoint
CREATE TABLE "analytics_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publish_job_id" uuid NOT NULL,
	"youtube_video_id" varchar(64) NOT NULL,
	"snapshot_at" timestamp with time zone DEFAULT now() NOT NULL,
	"views" integer DEFAULT 0,
	"watch_time_minutes" numeric(12, 2) DEFAULT '0',
	"avg_view_duration_sec" numeric(8, 2),
	"ctr" numeric(5, 4),
	"subscribers_gained" integer DEFAULT 0,
	"estimated_revenue_usd" numeric(10, 2),
	"raw_response" jsonb
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"script_id" uuid,
	"asset_type" "asset_type" NOT NULL,
	"source" "asset_source" NOT NULL,
	"source_url" text,
	"license" varchar(64) NOT NULL,
	"blob_url" text,
	"blob_access" "blob_access" DEFAULT 'private' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"is_synthetic_media" boolean DEFAULT false NOT NULL,
	"generation_cost_usd" numeric(10, 4) DEFAULT '0',
	"generation_provider_request_id" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"display_name" varchar(128) NOT NULL,
	"niche" "niche" NOT NULL,
	"youtube_channel_id" varchar(64),
	"elevenlabs_voice_id" varchar(64),
	"brand_voice_config" jsonb DEFAULT '{}'::jsonb,
	"visual_style_guide" jsonb DEFAULT '{}'::jsonb,
	"posting_cadence" jsonb DEFAULT '{"longformPerWeek":2,"shortsPerDay":2}'::jsonb,
	"seo_keyword_strategy" jsonb DEFAULT '{}'::jsonb,
	"monetization_links" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"monthly_budget_cap_usd" numeric(10, 2) DEFAULT '150.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid,
	"topic_id" uuid,
	"provider" "cost_provider" NOT NULL,
	"category" "cost_category" NOT NULL,
	"quantity" numeric(14, 4) NOT NULL,
	"unit_cost_usd" numeric(10, 6),
	"total_cost_usd" numeric(10, 4) NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "fact_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"script_id" uuid NOT NULL,
	"claim_text" text NOT NULL,
	"verdict" "fact_check_verdict" NOT NULL,
	"confidence" numeric(4, 3),
	"citations" jsonb DEFAULT '[]'::jsonb,
	"model_used" varchar(128) NOT NULL,
	"reviewer_override" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "niche_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"niche" "niche" NOT NULL,
	"script_formula" jsonb NOT NULL,
	"research_prompt_template" text NOT NULL,
	"script_prompt_template" text NOT NULL,
	"factcheck_prompt_template" text NOT NULL,
	"visual_beat_guidance" jsonb DEFAULT '{}'::jsonb,
	"default_longform_length_sec" integer DEFAULT 720 NOT NULL,
	"default_short_length_sec" integer DEFAULT 40 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publish_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"scheduled_publish_at" timestamp with time zone,
	"status" "publish_job_status" DEFAULT 'pending_review' NOT NULL,
	"youtube_video_id" varchar(64),
	"youtube_upload_quota_units_used" integer DEFAULT 0,
	"disclosure_applied" boolean DEFAULT false NOT NULL,
	"reviewer_id" varchar(128),
	"reviewer_notes" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "render_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"render_target" "render_target" NOT NULL,
	"external_job_id" varchar(256),
	"status" "render_job_status" DEFAULT 'queued' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"error_message" text,
	"compute_cost_usd" numeric(10, 4),
	"webhook_token" varchar(256),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scripts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"beat_structure" jsonb NOT NULL,
	"full_narration_text" text NOT NULL,
	"word_count" integer NOT NULL,
	"model_used" varchar(128) NOT NULL,
	"generation_cost_usd" numeric(10, 4) DEFAULT '0',
	"is_human_edited" boolean DEFAULT false NOT NULL,
	"status" "script_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"niche_template_id" uuid NOT NULL,
	"title_working" varchar(256) NOT NULL,
	"format" "video_format" NOT NULL,
	"status" "topic_status" DEFAULT 'backlog' NOT NULL,
	"priority_score" numeric(6, 2) DEFAULT '0',
	"source" "topic_source" DEFAULT 'manual' NOT NULL,
	"target_publish_date" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"format" "video_format" NOT NULL,
	"remotion_composition_id" varchar(128) NOT NULL,
	"duration_sec" integer,
	"status" "video_status" DEFAULT 'assembling' NOT NULL,
	"final_blob_url" text,
	"thumbnail_asset_id" uuid,
	"seo_title" varchar(256),
	"seo_description" text,
	"seo_tags" text[],
	"contains_synthetic_media" boolean DEFAULT false NOT NULL,
	"synthetic_media_disclosure_required" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "youtube_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"scope" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_refreshed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analytics_snapshots" ADD CONSTRAINT "analytics_snapshots_publish_job_id_publish_jobs_id_fk" FOREIGN KEY ("publish_job_id") REFERENCES "public"."publish_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_ledger" ADD CONSTRAINT "cost_ledger_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_ledger" ADD CONSTRAINT "cost_ledger_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fact_checks" ADD CONSTRAINT "fact_checks_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publish_jobs" ADD CONSTRAINT "publish_jobs_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publish_jobs" ADD CONSTRAINT "publish_jobs_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "render_jobs" ADD CONSTRAINT "render_jobs_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scripts" ADD CONSTRAINT "scripts_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_niche_template_id_niche_templates_id_fk" FOREIGN KEY ("niche_template_id") REFERENCES "public"."niche_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_thumbnail_asset_id_assets_id_fk" FOREIGN KEY ("thumbnail_asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "youtube_credentials" ADD CONSTRAINT "youtube_credentials_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_snapshots_publish_job_idx" ON "analytics_snapshots" USING btree ("publish_job_id");--> statement-breakpoint
CREATE INDEX "assets_topic_idx" ON "assets" USING btree ("topic_id");--> statement-breakpoint
CREATE UNIQUE INDEX "channels_slug_idx" ON "channels" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "cost_ledger_channel_occurred_idx" ON "cost_ledger" USING btree ("channel_id","occurred_at");--> statement-breakpoint
CREATE INDEX "cost_ledger_provider_occurred_idx" ON "cost_ledger" USING btree ("provider","occurred_at");--> statement-breakpoint
CREATE INDEX "fact_checks_script_idx" ON "fact_checks" USING btree ("script_id");--> statement-breakpoint
CREATE UNIQUE INDEX "niche_templates_niche_idx" ON "niche_templates" USING btree ("niche");--> statement-breakpoint
CREATE INDEX "publish_jobs_channel_idx" ON "publish_jobs" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "render_jobs_video_idx" ON "render_jobs" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "scripts_topic_idx" ON "scripts" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "topics_channel_status_idx" ON "topics" USING btree ("channel_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "videos_topic_idx" ON "videos" USING btree ("topic_id");--> statement-breakpoint
CREATE UNIQUE INDEX "youtube_credentials_channel_idx" ON "youtube_credentials" USING btree ("channel_id");