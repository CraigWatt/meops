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

const seedSignals: SignalEvent[] = [
  {
    kind: "milestone",
    summary: "Finished the first meops monorepo scaffold and published the initial PR.",
    repository: "CraigWatt/meops",
    timestamp: "2026-04-03T22:22:17Z",
    priority: "high"
  },
  {
    kind: "pull_request",
    summary: "Added the first web dashboard shell for reviewing publishable moments.",
    repository: "CraigWatt/meops",
    timestamp: "2026-04-03T22:35:00Z",
    priority: "medium"
  },
  {
    kind: "commit",
    summary: "Introduced shared signal and draft primitives for future automation.",
    repository: "CraigWatt/meops",
    timestamp: "2026-04-03T22:48:00Z",
    priority: "low"
  }
];

export function getDashboardSignals(): DashboardSignal[] {
  return seedSignals.map((signal) => {
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
        body: `${describeSignal(signal)} | update-log`
      }
    ];

    return {
      ...signal,
      description: describeSignal(signal),
      publishable: isPublishableSignal(signal),
      drafts
    };
  });
}
