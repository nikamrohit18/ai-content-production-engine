import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

// ---------- Enums ----------

export const nicheEnum = pgEnum("niche", [
  "history",
  "lifestyle",
  "personal_finance",
  "health_relationships",
  "tech_business",
]);

export const videoFormatEnum = pgEnum("video_format", ["longform", "short"]);

export const topicStatusEnum = pgEnum("topic_status", [
  "backlog",
  "researching",
  "scripting",
  "factchecking",
  "awaiting_review",
  "approved",
  "rejected",
  "in_production",
  "published",
  "archived",
]);

export const topicSourceEnum = pgEnum("topic_source", [
  "manual",
  "ai_suggested",
  "trend_signal",
]);

export const scriptStatusEnum = pgEnum("script_status", [
  "draft",
  "submitted_for_review",
  "approved",
  "rejected",
]);

export const factCheckVerdictEnum = pgEnum("fact_check_verdict", [
  "supported",
  "unsupported",
  "disputed",
  "needs_human_judgment",
]);

export const assetTypeEnum = pgEnum("asset_type", [
  "image_archival",
  "image_ai_generated",
  "audio_voiceover",
  "audio_music",
  "caption_track",
]);

export const assetSourceEnum = pgEnum("asset_source", [
  "wikimedia",
  "internet_archive",
  "loc",
  "openai_image",
  "elevenlabs",
  "manual_upload",
]);

export const blobAccessEnum = pgEnum("blob_access", ["private", "public"]);

export const videoStatusEnum = pgEnum("video_status", [
  "assembling",
  "render_queued",
  "rendering",
  "render_failed",
  "rendered",
  "awaiting_final_review",
  "approved_for_publish",
]);

export const renderTargetEnum = pgEnum("render_target", [
  "vercel_sandbox",
  "remotion_lambda",
]);

export const renderJobStatusEnum = pgEnum("render_job_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
  "timed_out",
]);

export const publishJobStatusEnum = pgEnum("publish_job_status", [
  "pending_review",
  "approved",
  "queued",
  "uploading",
  "published",
  "failed",
]);

export const costProviderEnum = pgEnum("cost_provider", [
  "anthropic",
  "openai_text",
  "openai_image",
  "elevenlabs",
  "remotion_render",
  "youtube_quota",
  "vercel_blob",
  "vercel_workflow",
  "other",
]);

export const costCategoryEnum = pgEnum("cost_category", [
  "llm_tokens",
  "image_generation",
  "tts_characters",
  "video_render_compute",
  "api_quota_units",
  "storage",
]);

// ---------- Core tables ----------

export const channels = pgTable("channels", {
  id: id(),
  slug: varchar("slug", { length: 64 }).notNull(),
  displayName: varchar("display_name", { length: 128 }).notNull(),
  niche: nicheEnum("niche").notNull(),
  youtubeChannelId: varchar("youtube_channel_id", { length: 64 }),
  elevenlabsVoiceId: varchar("elevenlabs_voice_id", { length: 64 }),
  brandVoiceConfig: jsonb("brand_voice_config").$type<Record<string, unknown>>().default({}),
  visualStyleGuide: jsonb("visual_style_guide").$type<Record<string, unknown>>().default({}),
  postingCadence: jsonb("posting_cadence")
    .$type<{ longformPerWeek: number; shortsPerDay: number }>()
    .default({ longformPerWeek: 2, shortsPerDay: 2 }),
  seoKeywordStrategy: jsonb("seo_keyword_strategy").$type<Record<string, unknown>>().default({}),
  monetizationLinks: jsonb("monetization_links").$type<Record<string, string>>().default({}),
  isActive: boolean("is_active").notNull().default(true),
  monthlyBudgetCapUsd: numeric("monthly_budget_cap_usd", { precision: 10, scale: 2 }).notNull().default("150.00"),
  ...timestamps,
}, (t) => [uniqueIndex("channels_slug_idx").on(t.slug)]);

export const nicheTemplates = pgTable("niche_templates", {
  id: id(),
  niche: nicheEnum("niche").notNull(),
  scriptFormula: jsonb("script_formula").$type<Array<{ beat: string; guidance: string }>>().notNull(),
  researchPromptTemplate: text("research_prompt_template").notNull(),
  scriptPromptTemplate: text("script_prompt_template").notNull(),
  factcheckPromptTemplate: text("factcheck_prompt_template").notNull(),
  visualBeatGuidance: jsonb("visual_beat_guidance").$type<Record<string, unknown>>().default({}),
  defaultLongformLengthSec: integer("default_longform_length_sec").notNull().default(720),
  defaultShortLengthSec: integer("default_short_length_sec").notNull().default(40),
  ...timestamps,
}, (t) => [uniqueIndex("niche_templates_niche_idx").on(t.niche)]);

export const topics = pgTable("topics", {
  id: id(),
  channelId: uuid("channel_id").notNull().references(() => channels.id, { onDelete: "cascade" }),
  nicheTemplateId: uuid("niche_template_id").notNull().references(() => nicheTemplates.id),
  titleWorking: varchar("title_working", { length: 256 }).notNull(),
  format: videoFormatEnum("format").notNull(),
  status: topicStatusEnum("status").notNull().default("backlog"),
  priorityScore: numeric("priority_score", { precision: 6, scale: 2 }).default("0"),
  source: topicSourceEnum("source").notNull().default("manual"),
  targetPublishDate: timestamp("target_publish_date", { withTimezone: true }),
  notes: text("notes"),
  ...timestamps,
}, (t) => [
  index("topics_channel_status_idx").on(t.channelId, t.status),
]);

export const scripts = pgTable("scripts", {
  id: id(),
  topicId: uuid("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(1),
  beatStructure: jsonb("beat_structure")
    .$type<
      Array<{
        beatName: string;
        narrationText: string;
        visualCue: string;
        estDurationSec: number;
        /** Absent on scripts generated before this field was added. */
        imageSearchQuery?: string;
        /** Absent on scripts generated before the production-package pivot. */
        imageGenPrompt?: string;
        /** Absent on scripts generated before the production-package pivot; optional even on new ones. */
        videoGenPrompt?: string;
      }>
    >()
    .notNull(),
  fullNarrationText: text("full_narration_text").notNull(),
  wordCount: integer("word_count").notNull(),
  /** Absent on scripts generated before the production-package pivot (2026-06-25). */
  thumbnailPrompts: jsonb("thumbnail_prompts").$type<Array<{ concept: string; textOverlay: string }>>(),
  /** Hidden YouTube Studio "Tags" field — 8-12 phrases, never shown to viewers. Absent on older scripts. */
  seoTags: text("seo_tags").array(),
  /** Visible #hashtags for the description, 3-5, each starting with "#" with no spaces. Absent on older scripts. */
  hashtags: text("hashtags").array(),
  /** A real 2-3 sentence YouTube description (hashtags/sources appended separately, not included here). */
  seoDescription: text("seo_description"),
  modelUsed: varchar("model_used", { length: 128 }).notNull(),
  generationCostUsd: numeric("generation_cost_usd", { precision: 10, scale: 4 }).default("0"),
  isHumanEdited: boolean("is_human_edited").notNull().default(false),
  status: scriptStatusEnum("status").notNull().default("draft"),
  ...timestamps,
}, (t) => [
  index("scripts_topic_idx").on(t.topicId),
  uniqueIndex("scripts_topic_version_idx").on(t.topicId, t.version),
]);

export const factChecks = pgTable("fact_checks", {
  id: id(),
  scriptId: uuid("script_id").notNull().references(() => scripts.id, { onDelete: "cascade" }),
  claimText: text("claim_text").notNull(),
  verdict: factCheckVerdictEnum("verdict").notNull(),
  confidence: numeric("confidence", { precision: 4, scale: 3 }),
  citations: jsonb("citations")
    .$type<Array<{ sourceUrl: string; sourceName: string; excerpt: string }>>()
    .default([]),
  modelUsed: varchar("model_used", { length: 128 }).notNull(),
  reviewerOverride: jsonb("reviewer_override").$type<{ verdict: string; justification: string } | null>(),
  ...timestamps,
}, (t) => [index("fact_checks_script_idx").on(t.scriptId)]);

export const researchBriefs = pgTable("research_briefs", {
  id: id(),
  topicId: uuid("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  sources: jsonb("sources")
    .$type<Array<{ sourceUrl: string; sourceName: string; excerpt: string }>>()
    .notNull()
    .default([]),
  disputedClaims: jsonb("disputed_claims").$type<string[]>().notNull().default([]),
  modelUsed: varchar("model_used", { length: 128 }).notNull(),
  generationCostUsd: numeric("generation_cost_usd", { precision: 10, scale: 4 }).default("0"),
  ...timestamps,
}, (t) => [index("research_briefs_topic_idx").on(t.topicId)]);

export const assets = pgTable("assets", {
  id: id(),
  topicId: uuid("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
  scriptId: uuid("script_id").references(() => scripts.id),
  assetType: assetTypeEnum("asset_type").notNull(),
  source: assetSourceEnum("source").notNull(),
  sourceUrl: text("source_url"),
  license: varchar("license", { length: 64 }).notNull(),
  blobUrl: text("blob_url"),
  blobAccess: blobAccessEnum("blob_access").notNull().default("private"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  isSyntheticMedia: boolean("is_synthetic_media").notNull().default(false),
  generationCostUsd: numeric("generation_cost_usd", { precision: 10, scale: 4 }).default("0"),
  generationProviderRequestId: varchar("generation_provider_request_id", { length: 128 }),
  ...timestamps,
}, (t) => [index("assets_topic_idx").on(t.topicId)]);

export const videos = pgTable("videos", {
  id: id(),
  topicId: uuid("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
  format: videoFormatEnum("format").notNull(),
  remotionCompositionId: varchar("remotion_composition_id", { length: 128 }).notNull(),
  durationSec: integer("duration_sec"),
  status: videoStatusEnum("status").notNull().default("assembling"),
  finalBlobUrl: text("final_blob_url"),
  thumbnailAssetId: uuid("thumbnail_asset_id").references(() => assets.id),
  seoTitle: varchar("seo_title", { length: 256 }),
  seoDescription: text("seo_description"),
  seoTags: text("seo_tags").array(),
  containsSyntheticMedia: boolean("contains_synthetic_media").notNull().default(false),
  syntheticMediaDisclosureRequired: boolean("synthetic_media_disclosure_required").notNull().default(false),
  ...timestamps,
}, (t) => [uniqueIndex("videos_topic_idx").on(t.topicId)]);

export const renderJobs = pgTable("render_jobs", {
  id: id(),
  videoId: uuid("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  renderTarget: renderTargetEnum("render_target").notNull(),
  externalJobId: varchar("external_job_id", { length: 256 }),
  status: renderJobStatusEnum("status").notNull().default("queued"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  errorMessage: text("error_message"),
  computeCostUsd: numeric("compute_cost_usd", { precision: 10, scale: 4 }),
  webhookToken: varchar("webhook_token", { length: 256 }),
  ...timestamps,
}, (t) => [index("render_jobs_video_idx").on(t.videoId)]);

export const publishJobs = pgTable("publish_jobs", {
  id: id(),
  videoId: uuid("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  channelId: uuid("channel_id").notNull().references(() => channels.id, { onDelete: "cascade" }),
  scheduledPublishAt: timestamp("scheduled_publish_at", { withTimezone: true }),
  status: publishJobStatusEnum("status").notNull().default("pending_review"),
  youtubeVideoId: varchar("youtube_video_id", { length: 64 }),
  youtubeUploadQuotaUnitsUsed: integer("youtube_upload_quota_units_used").default(0),
  disclosureApplied: boolean("disclosure_applied").notNull().default(false),
  reviewerId: varchar("reviewer_id", { length: 128 }),
  reviewerNotes: text("reviewer_notes"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  ...timestamps,
}, (t) => [index("publish_jobs_channel_idx").on(t.channelId)]);

export const analyticsSnapshots = pgTable("analytics_snapshots", {
  id: id(),
  publishJobId: uuid("publish_job_id").notNull().references(() => publishJobs.id, { onDelete: "cascade" }),
  youtubeVideoId: varchar("youtube_video_id", { length: 64 }).notNull(),
  snapshotAt: timestamp("snapshot_at", { withTimezone: true }).notNull().defaultNow(),
  views: integer("views").default(0),
  watchTimeMinutes: numeric("watch_time_minutes", { precision: 12, scale: 2 }).default("0"),
  avgViewDurationSec: numeric("avg_view_duration_sec", { precision: 8, scale: 2 }),
  ctr: numeric("ctr", { precision: 5, scale: 4 }),
  subscribersGained: integer("subscribers_gained").default(0),
  estimatedRevenueUsd: numeric("estimated_revenue_usd", { precision: 10, scale: 2 }),
  rawResponse: jsonb("raw_response").$type<Record<string, unknown>>(),
}, (t) => [index("analytics_snapshots_publish_job_idx").on(t.publishJobId)]);

export const costLedger = pgTable("cost_ledger", {
  id: id(),
  channelId: uuid("channel_id").references(() => channels.id, { onDelete: "set null" }),
  topicId: uuid("topic_id").references(() => topics.id, { onDelete: "set null" }),
  provider: costProviderEnum("provider").notNull(),
  category: costCategoryEnum("category").notNull(),
  quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
  unitCostUsd: numeric("unit_cost_usd", { precision: 10, scale: 6 }),
  totalCostUsd: numeric("total_cost_usd", { precision: 10, scale: 4 }).notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
}, (t) => [
  index("cost_ledger_channel_occurred_idx").on(t.channelId, t.occurredAt),
  index("cost_ledger_provider_occurred_idx").on(t.provider, t.occurredAt),
]);

export const trendSignals = pgTable("trend_signals", {
  id: id(),
  channelId: uuid("channel_id").notNull().references(() => channels.id, { onDelete: "cascade" }),
  query: varchar("query", { length: 256 }).notNull(),
  videoId: varchar("video_id", { length: 32 }).notNull(),
  videoTitle: varchar("video_title", { length: 512 }).notNull(),
  videoChannelTitle: varchar("video_channel_title", { length: 256 }),
  viewCount: integer("view_count"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  promotedTopicId: uuid("promoted_topic_id").references(() => topics.id, { onDelete: "set null" }),
  rawMetadata: jsonb("raw_metadata").$type<Record<string, unknown>>().default({}),
  ...timestamps,
}, (t) => [
  uniqueIndex("trend_signals_channel_video_idx").on(t.channelId, t.videoId),
  index("trend_signals_channel_idx").on(t.channelId),
]);

export const youtubeCredentials = pgTable("youtube_credentials", {
  id: id(),
  channelId: uuid("channel_id").notNull().references(() => channels.id, { onDelete: "cascade" }),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  scope: text("scope").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  lastRefreshedAt: timestamp("last_refreshed_at", { withTimezone: true }),
  ...timestamps,
}, (t) => [uniqueIndex("youtube_credentials_channel_idx").on(t.channelId)]);
