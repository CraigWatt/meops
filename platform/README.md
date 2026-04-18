# Platform

This directory contains shared platform components used by multiple services.

## Put here

- Shared libraries and internal SDKs
- Cross-cutting runtime capabilities like auth, observability, and messaging
- Reusable tooling and common integration modules
- Git-history signal extraction under `platform/extraction/`
- GitHub repo discovery and remote commit collection under `platform/discovery/`
- Channel-specific draft generation under `platform/generation/`
- Channel-specific publish adapters under `platform/publishing/`

## Tests

- Co-locate tests with each platform component, for example `platform/<component>/test/`

## Keep out

- One-off service implementations
- Environment-specific infrastructure definitions
