# Worker

This service is the background execution lane for meops. It now scans recent git
commits, turns them into signal candidates, writes new records into the shared
store, and prints publishable signals.

If `GITHUB_TOKEN` or `MEOPS_GITHUB_TOKEN` is present, the worker discovers
tracked repositories from GitHub and pulls remote commit history. This lane
is token-only now; there is no local checkout fallback.

Useful env vars:

- `.env.example` at the repo root is the local template for these values
- `MEOPS_REPO_ALLOWLIST` to limit discovery to a comma-separated set of repo names or full names
- `MEOPS_REPO_DISCOVERY_LIMIT` to cap how many repositories are scanned from GitHub
- `MEOPS_GITHUB_COMMIT_LIMIT` to cap commits collected per repository

Repository discovery updates the store's repository catalog so the dashboard can
show which repos are in view, when they were synced, and how many signals have
come out of them.
