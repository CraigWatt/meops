# Discovery

GitHub repository discovery and remote commit collection live here.

This package lists accessible repositories from GitHub, fetches recent commits
for each tracked repository, and converts them into meops signal candidates.

Discovery is driven by:

- `GITHUB_TOKEN` or `MEOPS_GITHUB_TOKEN`
- optional `MEOPS_REPO_ALLOWLIST`
- optional `MEOPS_REPO_DISCOVERY_LIMIT`
- optional `MEOPS_GITHUB_COMMIT_LIMIT`
