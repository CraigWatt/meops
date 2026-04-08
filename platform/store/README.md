# Store

File-backed signal persistence and normalized store helpers live here.

The store deduplicates extracted git signals by `sourceId`, so the worker can
rescan commits without creating duplicate records.
