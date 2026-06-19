# AI Content Production Engine

[![CI/CD](https://github.com/nikamrohit18/ai-content-production-engine/actions/workflows/ci.yml/badge.svg)](https://github.com/nikamrohit18/ai-content-production-engine/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![License](https://img.shields.io/badge/license-proprietary-lightgrey)

A production-grade, AI-driven pipeline for running faceless YouTube channels at scale. It takes a topic from idea to published video — research, scripting, fact-checking, asset generation, rendering, and publishing — with cost tracking and human review gates built in, across multiple channels and niches.

The first channel built on this engine is **[Time Excavated](https://www.youtube.com/channel/UCSJSdi3FmUJXF0C1ie_VWaA)** (forgotten history, ancient civilizations, historical mysteries).

## Pipeline

```mermaid
flowchart LR
    A[Topic Backlog] --> B[Research Agent]
    B --> C[Script Agent]
    C --> D[Fact-Check Agent]
    D --> E["Asset Sourcing & Generation"]
    E --> F["Video Assembly (Remotion)"]
    F --> G[Render Job]
    G --> H[Human Review]
    H --> I["Publish Job (YouTube)"]
    I --> J[Analytics Snapshot]
    J -. informs .-> A
```

Every stage writes to Postgres (see [`src/db/schema.ts`](src/db/schema.ts)), so the whole production history of a video — sources cited, fact-check verdicts, render costs, reviewer decisions — is queryable and auditable, not just a log line in a workflow tool.

## Tech stack

| Concern | Choice |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) on [Vercel](https://vercel.com) |
| Database | [Neon](https://neon.tech) Postgres via [Drizzle ORM](https://orm.drizzle.team) |
| Orchestration | [Vercel Workflow DevKit](https://vercel.com/docs/workflow) — durable, resumable pipeline steps |
| LLM access | [AI SDK v6](https://sdk.vercel.ai) + [AI Gateway](https://vercel.com/docs/ai-gateway) (multi-provider, no vendor lock-in) |
| Video rendering | [Remotion](https://www.remotion.dev) |
| Voiceover | [ElevenLabs](https://elevenlabs.io) |
| Object storage | [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) |
| Publishing | YouTube Data API |
| CI/CD | GitHub Actions → Vercel CLI |

## Project structure

```
src/
├── app/
│   ├── (dashboard)/        # Internal UI: backlog, review, channels, costs, analytics
│   └── api/
│       ├── cron/           # Scheduled jobs (trend refill, analytics polling)
│       ├── webhooks/       # Render-complete, YouTube OAuth callback
│       └── workflows/      # Workflow DevKit entrypoints (start pipeline, resume review)
├── config/
│   ├── channels/           # Per-channel config
│   └── niches/             # Per-niche config
├── db/
│   ├── schema.ts           # Drizzle schema — the source of truth for the data model
│   ├── seed.ts             # Idempotent seed: channels, niche templates, starter backlog
│   └── migrations/
├── engine/
│   ├── ai/                 # Research, scripting, fact-checking
│   ├── compliance/         # Synthetic-media disclosure, licensing checks
│   ├── cost/                # Cost ledger + budget guardrails
│   ├── render/              # Render-target dispatch (Vercel Sandbox / Remotion Lambda)
│   ├── sourcing/             # Trend signal ingestion, asset sourcing
│   ├── voice/                # TTS generation
│   └── youtube/              # Upload, OAuth, quota management
├── remotion/
│   ├── components/
│   └── compositions/        # Video templates rendered per format (short/longform)
└── workflows/
    └── steps/                # Individual durable workflow steps
```

> Not every directory above has code yet — this mirrors the planned architecture. Check `src/db/schema.ts` for what's structurally finalized, and the directories under `src/engine` for what's actually implemented.

## Getting started

### Prerequisites

- Node.js 24+
- [Vercel CLI](https://vercel.com/docs/cli) (`npm i -g vercel`), authenticated and linked to this project
- Access to the project's Neon database (provisioned via Vercel Marketplace)

### Setup

```bash
npm install
vercel link              # if not already linked
vercel env pull .env.local
npm run db:migrate        # apply schema to the database
npm run db:seed           # seed channels, niche templates, starter topic backlog
npm run dev
```

### Available scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the local dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run db:generate` | Generate a new Drizzle migration from schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:studio` | Open Drizzle Studio against the linked database |
| `npm run db:seed` | Idempotently seed channels, niche templates, and the starter topic backlog |

## CI/CD

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push and pull request to `master`:

1. **`checks`** — install, lint, typecheck, build. Runs for all pushes and PRs, no secrets required.
2. **`deploy-preview`** — on pull requests, builds and deploys a Vercel preview, then comments the URL on the PR.
3. **`deploy-production`** — on push to `master`, builds and deploys to production.

Deploys use the Vercel CLI (`vercel pull` → `vercel build` → `vercel deploy --prebuilt`) rather than Vercel's automatic Git integration, so the entire pipeline — checks and deploys — is visible in the **Actions** tab.

Required repository secrets:

| Secret | Description |
|---|---|
| `VERCEL_TOKEN` | Personal/team access token — [create one](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | From `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | From `.vercel/project.json` |

## Channels

| Channel | Niche | Status |
|---|---|---|
| [Time Excavated](https://www.youtube.com/channel/UCSJSdi3FmUJXF0C1ie_VWaA) | History / ancient civilizations | Live |
| — | Lifestyle | Planned |
| — | Personal finance | Planned |
| — | Health & relationships | Planned |
| — | Tech & business | Planned |

## Roadmap

- [x] Data model for the full topic → publish pipeline
- [x] Database provisioned, migrated, seeded
- [x] CI/CD pipeline
- [ ] Research-brief persistence + research agent
- [ ] Script generation agent
- [ ] Fact-checking agent
- [ ] Trend-signal sourcing
- [ ] Asset sourcing & generation
- [ ] Remotion render pipeline
- [ ] YouTube publish + OAuth
- [ ] Dashboard UI (backlog, review, costs, analytics)
- [ ] Second channel (niche TBD)

## License

Proprietary — all rights reserved. Source is public for portfolio/transparency purposes; no license is granted for reuse, modification, or redistribution.
