export type SignalKind = "commit" | "pull_request" | "release" | "milestone";
export type SignalPriority = "low" | "medium" | "high";

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
