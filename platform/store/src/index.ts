import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";

import {
  type DraftChannel,
  type DraftPublicationRecord,
  type DraftStatus,
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
  draftPublications: DraftPublicationRecord[];
}

const defaultStorePath = resolve(process.cwd(), ".meops", "signals.json");

function emptySnapshot(): SignalStoreSnapshot {
  return { signals: [], repositories: [] };
}

function resolveStorePath(storePath?: string): string {
  const configuredStorePath = process.env.MEOPS_STORE_PATH;

  return resolve(storePath ?? configuredStorePath ?? defaultStorePath);
}

function publicationKey(signalId: string, channel: DraftChannel): string {
  return `${signalId}:${channel}`;
}

function normalizeSnapshot(snapshot: Partial<SignalStoreSnapshot>): SignalStoreSnapshot {
  return {
    signals: snapshot.signals ?? [],
    repositories: snapshot.repositories ?? [],
    draftPublications: snapshot.draftPublications ?? []
  };
}

function normalizeSignal(
  signal: SignalRecord,
  publications: Map<string, DraftPublicationRecord>
): DashboardSignal {
  const drafts = buildDrafts(signal).map((draft) => {
    const publication = publications.get(publicationKey(signal.id, draft.channel));

    return {
      ...draft,
      status: publication?.status ?? draft.status
    };
  });

  return {
    ...signal,
    description: describeSignal(signal),
    publishable: isPublishableSignal(signal),
    drafts,
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

function findDraftPublication(
  snapshot: SignalStoreSnapshot,
  signalId: string,
  channel: DraftChannel
): DraftPublicationRecord | undefined {
  return snapshot.draftPublications.find(
    (publication) => publication.signalId === signalId && publication.channel === channel
  );
}

export async function getDraftPublication(
  signalId: string,
  channel: DraftChannel,
  storePath?: string
): Promise<DraftPublicationRecord | undefined> {
  const snapshot = await ensureSignalStore(storePath);
  return findDraftPublication(snapshot, signalId, channel);
}

export async function getDashboardSignalById(
  signalId: string,
  storePath?: string
): Promise<DashboardSignal | undefined> {
  const snapshot = await ensureSignalStore(storePath);
  const publications = new Map<string, DraftPublicationRecord>();

  for (const publication of snapshot.draftPublications) {
    publications.set(publicationKey(publication.signalId, publication.channel), publication);
  }

  const signal = snapshot.signals.find((candidate) => candidate.id === signalId);
  return signal ? normalizeSignal(signal, publications) : undefined;
}

export async function readSignalStore(storePath?: string): Promise<SignalStoreSnapshot> {
  const resolvedPath = resolveStorePath(storePath);

  try {
    const raw = await readFile(resolvedPath, "utf8");
    return normalizeSnapshot(JSON.parse(raw) as Partial<SignalStoreSnapshot>);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return emptySnapshot();
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
  const publications = new Map<string, DraftPublicationRecord>();

  for (const publication of snapshot.draftPublications) {
    publications.set(publicationKey(publication.signalId, publication.channel), publication);
  }

  return snapshot.signals.map((signal) => normalizeSignal(signal, publications));
}

export async function getRepositoryCatalog(storePath?: string): Promise<RepositoryCatalogEntry[]> {
  const snapshot = await ensureSignalStore(storePath);
  return (snapshot.repositories ?? []).map(normalizeRepository);
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
      repositories: nextRepositories,
      draftPublications: snapshot.draftPublications ?? []
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
    repositories: snapshot.repositories ?? []
  };

  await writeSignalStore(nextSnapshot, resolvedPath);
  return normalizeSignal(record, new Map<string, DraftPublicationRecord>());
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
        signal: normalizeSignal(existing, new Map<string, DraftPublicationRecord>()),
        created: false
      };
    }
  }

  const record = createSignalRecord(signal);
  const nextSnapshot: SignalStoreSnapshot = {
    signals: [...snapshot.signals, record],
    repositories: snapshot.repositories ?? []
  };

  await writeSignalStore(nextSnapshot, resolvedPath);
  return {
    signal: normalizeSignal(record, new Map<string, DraftPublicationRecord>()),
    created: true
  };
}

export async function upsertDraftPublication(
  signalId: string,
  channel: DraftChannel,
  status: DraftStatus,
  storePath?: string,
  options: {
    actor?: string;
    externalId?: string;
  } = {}
): Promise<DraftPublicationRecord> {
  const resolvedPath = resolveStorePath(storePath);
  const snapshot = await ensureSignalStore(resolvedPath);
  const now = new Date().toISOString();
  const existing = findDraftPublication(snapshot, signalId, channel);
  const nextPublication: DraftPublicationRecord = {
    signalId,
    channel,
    status,
    updatedAt: now,
    actor: options.actor ?? existing?.actor,
    externalId: options.externalId ?? existing?.externalId
  };

  const nextPublications = existing
    ? snapshot.draftPublications.map((publication) =>
        publication.signalId === signalId && publication.channel === channel ? nextPublication : publication
      )
    : [...snapshot.draftPublications, nextPublication];

  await writeSignalStore(
    {
      signals: snapshot.signals,
      repositories: snapshot.repositories ?? [],
      draftPublications: nextPublications
    },
    resolvedPath
  );

  return nextPublication;
}
