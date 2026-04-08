# meops

Turn work into signal.

`meops` is a personal operations system that watches real engineering activity across your repos and turns it into public output:

- X posts
- LinkedIn posts
- blog posts
- project updates
- portfolio and website content

The goal is simple:

> If I’m doing real work, that work should be able to market itself.

## Why this exists

Technical progress is often invisible by default. You can spend days improving architecture, fixing hard bugs, shipping infrastructure, or refining developer experience and still have very little public proof of that work.

`meops` exists to bridge that gap by:

- detecting meaningful engineering progress
- understanding why it matters
- framing it for different audiences
- producing clean, reusable narrative from technical output

## Monorepo shape

This repo follows the same high-level layout used in `vfo`:

- `services/` for product and domain services
- `platform/` for shared capabilities and reusable building blocks
- `infra/` for operational code, deployment, and automation
- `tests/` for cross-cutting end-to-end checks

Current service surfaces:

- `services/api/` for the backend API
- `services/worker/` for ingestion and generation jobs
- `services/web/` for the review dashboard, statically exported to GitHub Pages
- `platform/store/` for file-backed signal state
- `platform/extraction/` for turning git history into signal candidates
- `platform/generation/` for channel-specific drafts, including the blog output for `craigwatt.co.uk`

### Suggested starting layout

```text
infra/
platform/
services/
tests/
```

## Initial system sketch

The first pass of `meops` should probably split into these responsibilities:

1. Ingest
2. Interpret
3. Generate
4. Review
5. Publish

That maps nicely to a service-oriented monorepo:

- a repo-watcher or event collector
- a signal extraction pipeline
- content generation helpers
- a review/editing surface
- publishing adapters for each outlet

## Tech stack options

### Option 1: Lean MVP

Best if you want to move fast and keep the first version simple.

- `pnpm` workspaces
- TypeScript everywhere
- `Turborepo` for task orchestration
- Node.js worker services
- SQLite for local state
- PostgreSQL later if the data model grows
- a small React or Next.js UI only when needed

Why this works:

- low setup overhead
- easy local development
- keeps the repo flexible while the product shape is still forming

### Option 2: Productive default

Best if you expect a dashboard, background workers, and integrations fairly early.

- `pnpm` workspaces
- TypeScript + React
- Next.js for the web app
- Fastify or Hono for APIs
- BullMQ or a similar queue for async content jobs
- PostgreSQL + Prisma or Drizzle
- Redis for job coordination and caching

Why this works:

- clean separation between UI, API, and workers
- good fit for an app that needs review queues and publishing workflows
- scales well as the number of integrations grows

### Option 3: More opinionated

Best if you want a stronger product shell from day one.

- `pnpm` workspaces
- Next.js app router
- a dedicated worker service
- Postgres + Drizzle
- object storage for artifacts and generated drafts
- optional OpenAI-based content generation helpers

Why this works:

- easiest path to a polished front-end experience
- good if the dashboard is part of the core product, not just an internal tool

## Recommended direction

For `meops`, I’d start with **Option 2**:

- a web dashboard for reviewing signals and drafts
- a worker pipeline for ingestion and generation
- a shared library layer for content heuristics and formatting
- PostgreSQL as the durable store once the shape hardens

That gives us a real product foundation without overcommitting to infrastructure too early.

## Product ideas

Some useful first features:

- commit and PR digesting into short “what changed / why it matters” summaries
- repo milestone detection for meaningful releases or architecture shifts
- audience-specific draft generation for X, LinkedIn, and blog posts
- a reusable content memory of prior announcements and phrasing
- a queue of “publishable moments” that can be reviewed before going public

## Next step

The scaffold in this repo is intentionally minimal for now. The next good move is to choose the first stack and then generate the actual app, service, and shared package structure around it.
