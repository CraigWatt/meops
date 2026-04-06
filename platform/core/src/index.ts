export type SignalKind = "commit" | "pull_request" | "release" | "milestone";
export type SignalPriority = "low" | "medium" | "high";
export type DraftChannel = "x" | "linkedin" | "blog" | "update-log";

export interface SignalEvent {
  kind: SignalKind;
  summary: string;
  repository: string;
  timestamp: string;
  priority: SignalPriority;
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
}

export interface DashboardSignal extends SignalEvent {
  description: string;
  publishable: boolean;
  drafts: Draft[];
}
