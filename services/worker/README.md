# Worker

This service is the background execution lane for meops. It now scans recent git
commits, turns them into signal candidates, writes new records into the shared
store, and prints publishable signals.
