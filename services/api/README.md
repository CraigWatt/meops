# API

This service exposes meops signal data and will grow into the primary backend for
signal ingestion, review, and publish workflows.

Current routes:

- `GET /health`
- `GET /signals`
- `POST /signals`
- `POST /drafts/approve`
- `POST /drafts/publish`

Publishing routes require `MEOPS_PUBLISH_TOKEN` and a `Bearer` token in the
`Authorization` header.
