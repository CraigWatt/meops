# Store

File-backed signal persistence, repository catalog state, and normalized store helpers live here.

The store deduplicates extracted git signals by `sourceId`, so the worker can
rescan commits without creating duplicate records.

It also keeps a repository catalog so discovery runs can persist the repos
meops is actually watching.
