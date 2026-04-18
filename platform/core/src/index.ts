export type SignalKind = "commit" | "pull_request" | "release" | "milestone";
export type SignalPriority = "low" | "medium" | "high";
export type SignalSource = "manual" | "git_commit";
export type DraftChannel = "x" | "linkedin" | "blog" | "update-log";
export type DraftStatus = "prepared" | "needs_review" | "approved" | "published";

export interface RepositoryProfile {
  name: string;
  fullName: string;
  url: string;
  description?: string;
  defaultBranch?: string;
  language?: string;
  topics?: string[];
  isPrivate?: boolean;
  isArchived?: boolean;
  pushedAt?: string;
  updatedAt?: string;
}

export interface RepositoryCatalogEntry extends RepositoryProfile {
  watched: boolean;
  source: "manual" | "github_discovery";
  discoveredAt?: string;
  lastSyncedAt?: string;
  lastSignalAt?: string;
  signalCount: number;
}

export interface SignalEvent {
  kind: SignalKind;
  summary: string;
  repository: string;
  timestamp: string;
  priority: SignalPriority;
  repositoryProfile?: RepositoryProfile;
}

export interface SignalInput extends SignalEvent {
  source?: SignalSource;
  sourceId?: string;
}

export function isPublishableSignal(signal: SignalEvent): boolean {
  return signal.priority === "high" || signal.kind === "release" || signal.kind === "milestone";
}

export function describeSignal(signal: SignalEvent): string {
  return `${signal.repository} • ${signal.kind} • ${signal.priority}`;
}

export interface Draft {
  channel: DraftChannel;
  title: string;
  body: string;
  status: DraftStatus;
}

export interface DraftPublicationRecord {
  signalId: string;
  channel: DraftChannel;
  status: DraftStatus;
  updatedAt: string;
  actor?: string;
  externalId?: string;
}

export interface DashboardSignal extends SignalEvent {
  id: string;
  description: string;
  publishable: boolean;
  drafts: Draft[];
  source?: SignalSource;
  sourceId?: string;
}
