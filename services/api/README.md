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

To actually publish approved drafts, configure:

- `MEOPS_X_ACCESS_TOKEN` for X posting
- `MEOPS_X_API_BASE` if you need to override the X API host
- `MEOPS_LINKEDIN_ACCESS_TOKEN` for LinkedIn posting
- `MEOPS_LINKEDIN_AUTHOR_URN` for the member or organization author
- `MEOPS_LINKEDIN_API_BASE` if you need to override the LinkedIn API host
- `MEOPS_LINKEDIN_VERSION` if you need to pin a LinkedIn API version

Flow:

- `POST /drafts/approve` moves a draft to `approved`
- `POST /drafts/publish` only publishes an approved draft
- successful publish requests store the returned external post ID
