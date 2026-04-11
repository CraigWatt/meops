import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";

import {
  type DashboardSignal,
  type RepositoryCatalogEntry,
  type RepositoryProfile,
  type SignalEvent,
  type SignalInput,
  describeSignal,
  isPublishableSignal
} from "@meops/core";
import { buildDrafts } from "@meops/generation";

export interface SignalRecord extends SignalEvent {
  id: string;
  source?: SignalInput["source"];
  sourceId?: string;
  repositoryProfile?: RepositoryProfile;
}

export interface SignalStoreSnapshot {
  signals: SignalRecord[];
  repositories: RepositoryCatalogEntry[];
}

const defaultStorePath = resolve(process.cwd(), ".meops", "signals.json");

const seedSignals: SignalRecord[] = [
  {
    id: "signal-001",
    kind: "milestone",
    summary: "Finished the first meops monorepo scaffold and published the initial PR.",
    repository: "CraigWatt/meops",
    timestamp: "2026-04-03T22:22:17Z",
    priority: "high",
    source: "manual"
  },
  {
    id: "signal-002",
    kind: "pull_request",
    summary: "Added the first web dashboard shell for reviewing publishable moments.",
    repository: "CraigWatt/meops",
    timestamp: "2026-04-03T22:35:00Z",
    priority: "medium",
    source: "manual"
  },
  {
    id: "signal-003",
    kind: "commit",
    summary: "Introduced shared signal and draft primitives for future automation.",
    repository: "CraigWatt/meops",
    timestamp: "2026-04-03T22:48:00Z",
    priority: "low",
    source: "manual"
  }
];

const seedRepositories: RepositoryCatalogEntry[] = [
  {
    name: "meops",
    fullName: "CraigWatt/meops",
    url: "https://github.com/CraigWatt/meops",
    description: "meops personal operations system",
    defaultBranch: "main",
    topics: ["automation", "content", "developer-experience"],
    watched: true,
    source: "manual",
    discoveredAt: "2026-04-03T22:22:17Z",
    lastSyncedAt: "2026-04-03T22:48:00Z",
    signalCount: 3
  }
];

function resolveStorePath(storePath?: string): string {
  return resolve(storePath ?? defaultStorePath);
}

function normalizeSignal(signal: SignalRecord): DashboardSignal {
  return {
    ...signal,
    description: describeSignal(signal),
    publishable: isPublishableSignal(signal),
    drafts: buildDrafts(signal),
    source: signal.source ?? "manual",
    sourceId: signal.sourceId,
    repositoryProfile: signal.repositoryProfile
  };
}

function normalizeRepository(
  repository: RepositoryCatalogEntry
): RepositoryCatalogEntry {
  return {
    ...repository,
    signalCount: repository.signalCount ?? 0,
    watched: repository.watched ?? true,
    source: repository.source ?? "manual"
  };
}

function createSignalRecord(signal: SignalInput & Partial<Pick<SignalRecord, "id">>): SignalRecord {
  return {
    id: signal.id ?? randomUUID(),
    kind: signal.kind,
    summary: signal.summary,
    repository: signal.repository,
    timestamp: signal.timestamp,
    priority: signal.priority,
    source: signal.source ?? "manual",
    sourceId: signal.sourceId,
    repositoryProfile: signal.repositoryProfile
  };
}

function findSignalBySourceId(snapshot: SignalStoreSnapshot, sourceId: string): SignalRecord | undefined {
  return snapshot.signals.find((signal) => signal.sourceId === sourceId);
}

export async function readSignalStore(storePath?: string): Promise<SignalStoreSnapshot> {
  const resolvedPath = resolveStorePath(storePath);

  try {
    const raw = await readFile(resolvedPath, "utf8");
    return JSON.parse(raw) as SignalStoreSnapshot;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { signals: seedSignals, repositories: seedRepositories };
    }

    throw error;
  }
}

export async function writeSignalStore(snapshot: SignalStoreSnapshot, storePath?: string): Promise<void> {
  const resolvedPath = resolveStorePath(storePath);
  await mkdir(dirname(resolvedPath), { recursive: true });
  await writeFile(resolvedPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
}

export async function ensureSignalStore(storePath?: string): Promise<SignalStoreSnapshot> {
  const resolvedPath = resolveStorePath(storePath);

  try {
    await readFile(resolvedPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      const snapshot = await readSignalStore(resolvedPath);
      await writeSignalStore(snapshot, resolvedPath);
      return snapshot;
    }

    throw error;
  }

  return readSignalStore(resolvedPath);
}

export async function getDashboardSignals(storePath?: string): Promise<DashboardSignal[]> {
  const snapshot = await ensureSignalStore(storePath);
  return snapshot.signals.map(normalizeSignal);
}

export async function getRepositoryCatalog(storePath?: string): Promise<RepositoryCatalogEntry[]> {
  const snapshot = await ensureSignalStore(storePath);
  return (snapshot.repositories ?? seedRepositories).map(normalizeRepository);
}

export async function upsertRepository(
  repository: RepositoryProfile,
  storePath?: string,
  options: {
    source?: RepositoryCatalogEntry["source"];
    watched?: boolean;
    signalCountDelta?: number;
    discoveredAt?: string;
    lastSyncedAt?: string;
    lastSignalAt?: string;
  } = {}
): Promise<RepositoryCatalogEntry> {
  const resolvedPath = resolveStorePath(storePath);
  const snapshot = await ensureSignalStore(resolvedPath);
  const repositories = snapshot.repositories ?? [];
  const now = new Date().toISOString();
  const existing = repositories.find((candidate) => candidate.fullName === repository.fullName);
  const nextRepository: RepositoryCatalogEntry = normalizeRepository({
    name: repository.name,
    fullName: repository.fullName,
    url: repository.url,
    description: repository.description,
    defaultBranch: repository.defaultBranch,
    language: repository.language,
    topics: repository.topics,
    isPrivate: repository.isPrivate,
    isArchived: repository.isArchived,
    pushedAt: repository.pushedAt,
    updatedAt: repository.updatedAt,
    watched: options.watched ?? existing?.watched ?? true,
    source: options.source ?? existing?.source ?? "manual",
    discoveredAt: options.discoveredAt ?? existing?.discoveredAt ?? now,
    lastSyncedAt: options.lastSyncedAt ?? existing?.lastSyncedAt,
    lastSignalAt: options.lastSignalAt ?? existing?.lastSignalAt,
    signalCount: (existing?.signalCount ?? 0) + (options.signalCountDelta ?? 0)
  });

  const nextRepositories = existing
    ? repositories.map((candidate) =>
        candidate.fullName === repository.fullName ? nextRepository : candidate
      )
    : [...repositories, nextRepository];

  await writeSignalStore(
    {
      signals: snapshot.signals,
      repositories: nextRepositories
    },
    resolvedPath
  );

  return nextRepository;
}

export async function appendSignal(
  signal: SignalInput & Partial<Pick<SignalRecord, "id">>,
  storePath?: string
): Promise<DashboardSignal> {
  const resolvedPath = resolveStorePath(storePath);
  const snapshot = await ensureSignalStore(resolvedPath);
  const record = createSignalRecord(signal);
  const nextSnapshot: SignalStoreSnapshot = {
    signals: [...snapshot.signals, record],
    repositories: snapshot.repositories ?? seedRepositories
  };

  await writeSignalStore(nextSnapshot, resolvedPath);
  return normalizeSignal(record);
}

export async function appendSignalIfMissing(
  signal: SignalInput & Partial<Pick<SignalRecord, "id">>,
  storePath?: string
): Promise<{ signal: DashboardSignal; created: boolean }> {
  const resolvedPath = resolveStorePath(storePath);
  const snapshot = await ensureSignalStore(resolvedPath);

  if (signal.sourceId) {
    const existing = findSignalBySourceId(snapshot, signal.sourceId);
    if (existing) {
      return {
        signal: normalizeSignal(existing),
        created: false
      };
    }
  }

  const record = createSignalRecord(signal);
  const nextSnapshot: SignalStoreSnapshot = {
    signals: [...snapshot.signals, record],
    repositories: snapshot.repositories ?? seedRepositories
  };

  await writeSignalStore(nextSnapshot, resolvedPath);
  return {
    signal: normalizeSignal(record),
    created: true
  };
}
