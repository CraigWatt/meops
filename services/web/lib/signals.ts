import type { Draft } from "../../../platform/content/src";
import type { SignalEvent } from "../../../platform/core/src";

import { channelLabel, formatDraft } from "../../../platform/content/src";
import { describeSignal, isPublishableSignal } from "../../../platform/core/src";

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
        body: formatDraft({
          channel: "update-log",
          title: signal.summary,
          body: `${describeSignal(signal)} | ${channelLabel("update-log")}`
        })
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

