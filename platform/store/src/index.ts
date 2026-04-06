import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";

import {
  type DashboardSignal,
  type Draft,
  type SignalEvent,
  describeSignal,
  isPublishableSignal
} from "@meops/core";
import { channelLabel } from "@meops/content";

export interface SignalRecord extends SignalEvent {
  id: string;
}

export interface SignalStoreSnapshot {
  signals: SignalRecord[];
}

const defaultStorePath = resolve(process.cwd(), ".meops", "signals.json");

const seedSignals: SignalRecord[] = [
  {
    id: "signal-001",
    kind: "milestone",
    summary: "Finished the first meops monorepo scaffold and published the initial PR.",
    repository: "CraigWatt/meops",
    timestamp: "2026-04-03T22:22:17Z",
    priority: "high"
  },
  {
    id: "signal-002",
    kind: "pull_request",
    summary: "Added the first web dashboard shell for reviewing publishable moments.",
    repository: "CraigWatt/meops",
    timestamp: "2026-04-03T22:35:00Z",
    priority: "medium"
  },
  {
    id: "signal-003",
    kind: "commit",
    summary: "Introduced shared signal and draft primitives for future automation.",
    repository: "CraigWatt/meops",
    timestamp: "2026-04-03T22:48:00Z",
    priority: "low"
  }
];

function resolveStorePath(storePath?: string): string {
  return resolve(storePath ?? defaultStorePath);
}

function normalizeSignal(signal: SignalRecord): DashboardSignal {
  const drafts: Draft[] = [
    {
      channel: "x",
      title: `meops update for ${signal.repository}`,
      body: signal.summary
    },
    {
      channel: "linkedin",
      title: `meops signal: ${signal.kind}`,
      body: `${describeSignal(signal)}\n\n${signal.summary}`
    },
    {
      channel: "update-log",
      title: `Audit entry for ${signal.repository}`,
      body: `${describeSignal(signal)} | ${channelLabel("update-log")}`
    }
  ];

  return {
    ...signal,
    description: describeSignal(signal),
    publishable: isPublishableSignal(signal),
    drafts
  };
}

function createSignalRecord(signal: Omit<SignalRecord, "id"> & Partial<Pick<SignalRecord, "id">>): SignalRecord {
  return {
    id: signal.id ?? randomUUID(),
    kind: signal.kind,
    summary: signal.summary,
    repository: signal.repository,
    timestamp: signal.timestamp,
    priority: signal.priority
  };
}

export async function readSignalStore(storePath?: string): Promise<SignalStoreSnapshot> {
  const resolvedPath = resolveStorePath(storePath);

  try {
    const raw = await readFile(resolvedPath, "utf8");
    return JSON.parse(raw) as SignalStoreSnapshot;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { signals: seedSignals };
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

export async function appendSignal(
  signal: Omit<SignalRecord, "id"> & Partial<Pick<SignalRecord, "id">>,
  storePath?: string
): Promise<DashboardSignal> {
  const resolvedPath = resolveStorePath(storePath);
  const snapshot = await ensureSignalStore(resolvedPath);
  const record = createSignalRecord(signal);
  const nextSnapshot: SignalStoreSnapshot = {
    signals: [...snapshot.signals, record]
  };

  await writeSignalStore(nextSnapshot, resolvedPath);
  return normalizeSignal(record);
}
