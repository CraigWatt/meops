import {
  isPublishableSignal,
  type DashboardSignal,
  type Draft,
  type DraftChannel,
  type RepositoryCatalogEntry,
  type SignalEvent
} from "@meops/core";

export interface DraftGenerationOptions {
  brandName?: string;
}

function normalizeLineBreaks(value: string): string {
  return value
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

function headlineCase(value: string): string {
  return value
    .replace(/\//g, " ")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function signalAngle(signal: SignalEvent): string {
  const description = signal.repositoryProfile?.description?.trim();

  if (description) {
    return description;
  }

  const language = signal.repositoryProfile?.language;
  if (language) {
    return `A real engineering signal from ${signal.repository}, written in ${language}.`;
  }

  return `A real engineering signal from ${signal.repository}.`;
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function compactSignalSummary(signal: DashboardSignal): string {
  const summary = signal.summary.replace(/\s+/g, " ").trim();
  const preview = truncate(summary, 56);

  return `${signal.repository} · ${signal.kind} · ${preview}`;
}

function buildXDraft(signal: SignalEvent, brandName: string): Draft {
  const body = normalizeLineBreaks(`
${signal.summary}

${signal.repository} ${signal.kind} progress worth sharing.

${signal.repositoryProfile?.language ? `${signal.repositoryProfile.language} work, real momentum.` : ""}

Built for ${brandName}.
  `);

  return {
    channel: "x",
    title: `${headlineCase(signal.kind)} update`,
    body,
    status: isPublishableSignal(signal) ? "needs_review" : "prepared"
  };
}

function buildLinkedInDraft(signal: SignalEvent, brandName: string): Draft {
  const body = normalizeLineBreaks(`
${signal.summary}

${signalAngle(signal)}

What changed:
- ${signal.kind} work moved forward in a way that matters
- the underlying code is now easier to explain, reuse, or build on

Why it matters:
This is the kind of progress that compounds over time and shapes the larger product story.

${signal.repositoryProfile?.description ? `Repository context: ${signal.repositoryProfile.description}` : ""}

Prepared by ${brandName}.
  `);

  return {
    channel: "linkedin",
    title: `${headlineCase(signal.repository)} signal`,
    body,
    status: isPublishableSignal(signal) ? "needs_review" : "prepared"
  };
}

export function buildDrafts(
  signal: SignalEvent,
  options: DraftGenerationOptions = {}
): Draft[] {
  const brandName = options.brandName ?? "meops";

  return [buildXDraft(signal, brandName), buildLinkedInDraft(signal, brandName)];
}

export interface SnapshotDraftOptions {
  brandName?: string;
  maxLength?: number;
  highlightCount?: number;
}

export function buildSnapshotXDraft(
  signals: DashboardSignal[],
  repositories: RepositoryCatalogEntry[],
  options: SnapshotDraftOptions = {}
): Draft {
  const brandName = options.brandName ?? "meops";
  const maxLength = options.maxLength ?? 280;
  const highlightCount = options.highlightCount ?? 3;
  const watchedRepositories = repositories.filter((repository) => repository.watched);
  const publishableSignals = [...signals]
    .filter((signal) => signal.publishable)
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
  const highlights = publishableSignals.slice(0, highlightCount).map(compactSignalSummary);
  const body = normalizeLineBreaks(`
${brandName} snapshot: ${watchedRepositories.length} repos watched, ${signals.length} signals tracked, ${publishableSignals.length} ready to review.

${highlights.length > 0 ? `Latest signals: ${highlights.join(" | ")}` : "Latest signals: no publishable moments in this snapshot yet."}
  `);

  return {
    channel: "x",
    title: `${headlineCase(brandName)} snapshot`,
    body: truncate(body, maxLength),
    status: publishableSignals.length > 0 ? "needs_review" : "prepared"
  };
}

export function buildDraftForChannel(
  signal: SignalEvent,
  channel: DraftChannel,
  options: DraftGenerationOptions = {}
): Draft {
  const drafts = buildDrafts(signal, options);
  const draft = drafts.find((candidate) => candidate.channel === channel);

  if (!draft) {
    throw new Error(`Unsupported channel: ${channel}`);
  }

  return draft;
}
