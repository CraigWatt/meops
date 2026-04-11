# Worker

This service is the background execution lane for meops. It now scans recent git
commits, turns them into signal candidates, writes new records into the shared
store, and prints publishable signals.

If `GITHUB_TOKEN` or `MEOPS_GITHUB_TOKEN` is present, the worker can discover
tracked repositories from GitHub and pull remote commit history instead of
only scanning the current local checkout.

Useful env vars:

- `MEOPS_REPO_ALLOWLIST` to limit discovery to a comma-separated set of repo names or full names
- `MEOPS_REPO_DISCOVERY_LIMIT` to cap how many repositories are scanned from GitHub
- `MEOPS_GITHUB_COMMIT_LIMIT` to cap commits collected per repository
