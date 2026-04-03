export type SignalKind = "commit" | "pull_request" | "release" | "milestone";

export interface SignalEvent {
  kind: SignalKind;
  summary: string;
  repository: string;
  timestamp: string;
}

