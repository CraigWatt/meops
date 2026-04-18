# meops

Turn work into signal.

`meops` is a personal operations system that watches real engineering activity across your GitHub repos and turns it into reviewable public output.

What it does today:

- discovers public GitHub repos from a single token
- tracks repo visibility in a central catalog
- extracts meaningful commits and pull requests into signals
- generates X and LinkedIn drafts for those signals
- marks publishable material as `needs_review`
- shows the current state in a static GitHub Pages dashboard

What is intentionally out of scope for now:

- direct posting to X or LinkedIn
- blog generation and publishing
- automated scheduling beyond the visibility refresh workflow

The goal is simple:

> If I’m doing real work, that work should be able to market itself.

## Why this exists

Engineering work is often invisible by default. You can spend days improving architecture, fixing hard bugs, shipping infrastructure, or refining developer experience and still have very little public proof of that work.

`meops` exists to bridge that gap by:

- detecting meaningful engineering progress
- understanding why it matters
- framing it for different audiences
- producing clean, reusable narrative from technical output

## Current shape

The repo is organized as a small monorepo:

- `services/` for runtime surfaces
- `platform/` for shared capabilities and reusable building blocks
- `infra/` for deployment and automation
- `tests/` for cross-cutting checks

Current implemented surfaces:

- `services/web/` for the static review dashboard on GitHub Pages
- `services/worker/` for GitHub discovery and signal refresh
- `platform/store/` for file-backed signals and repository catalog data
- `platform/discovery/` for GitHub repo discovery and remote commit collection
- `platform/extraction/` for turning git history into signal candidates
- `platform/generation/` for X and LinkedIn draft generation

## Current workflow

1. GitHub Actions runs the Pages refresh workflow.
2. The worker discovers repos and refreshes the signal snapshot with `MEOPS_GITHUB_TOKEN`.
3. The static web build reads that refreshed snapshot.
4. The Pages site shows watched repos, signals, and draft review status.

## Local setup

Use [`.env.example`](./.env.example) as the local template for discovery.

Recommended local setup:

1. Copy `.env.example` to `.env.local`
2. Fill in `MEOPS_GITHUB_TOKEN`
3. Optionally set `MEOPS_REPO_ALLOWLIST` to narrow discovery

The token stays out of git because `.env` and `.env.*` are ignored.

## Next step

The next likely slice is adding an explicit review/publish state for X and LinkedIn drafts, then wiring posting adapters only after that review flow is solid.
