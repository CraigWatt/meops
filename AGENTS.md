# meops agent memory

This repository is being scaffolded as a monorepo with the same broad shape used in `vfo`:

- `services/` for domain services
- `platform/` for shared modules and reusable capabilities
- `infra/` for operational and deployment concerns
- `tests/` for end-to-end and cross-cutting verification

Working style:

- prefer the smallest useful scaffold first
- keep product logic out of `infra/`
- keep shared primitives out of individual services
- capture stack choices in `README.md` before making them concrete in code

Initial product direction:

- watch repo activity
- detect meaningful engineering progress
- transform that signal into drafts for public channels

