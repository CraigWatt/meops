# Web

This is the read-only dashboard surface for reviewing the latest synced
snapshot of system status, active sources, prepared drafts, and publishable
moments.

For now, the web app is configured as a static export so it can be served from
GitHub Pages during early development and testing.

Pages rebuilds can now be refreshed on a schedule by GitHub Actions using the
repo discovery token.

If the dashboard looks stale, it usually means the latest GitHub Actions
refresh has not landed yet.
