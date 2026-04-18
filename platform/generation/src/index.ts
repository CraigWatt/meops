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

interface RepoStory {
  label: string;
  score: number;
  themes: string[];
}

export interface SnapshotSignalSource {
  repository: string;
  kind: SignalEvent["kind"];
  priority: SignalEvent["priority"];
  summary: string;
  timestamp: string;
}

export interface SnapshotXDraft {
  draft: Draft;
  sources: SnapshotSignalSource[];
  sourceCount: number;
  prompt: string;
}

interface RepoPromptSummary {
  repository: string;
  label: string;
  signalCount: number;
  insight: string;
  strongestSignals: string[];
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

function signalStrength(signal: DashboardSignal): number {
  const priorityScore =
    signal.priority === "high" ? 30 : signal.priority === "medium" ? 20 : 10;
  const kindScore =
    signal.kind === "release" ? 20 : signal.kind === "milestone" ? 16 : signal.kind === "commit" ? 12 : 8;
  const publishableScore = signal.publishable ? 15 : 0;
  const summary = signal.summary.toLowerCase();
  const genericPenalty =
    (summary.includes("first commit") ? 12 : 0) +
    (summary.includes("env template") ? 8 : 0) +
    (summary.includes("readme") ? 6 : 0) +
    (summary.includes("template") ? 4 : 0) +
    (summary.startsWith("merge pull request") ? 2 : 0);
  const recencyScore = Math.max(
    0,
    12 - Math.min(12, Math.floor((Date.now() - new Date(signal.timestamp).getTime()) / 1000 / 60 / 60))
  );

  return priorityScore + kindScore + publishableScore + recencyScore - genericPenalty;
}

function normalizeRepoLabel(repository: RepositoryCatalogEntry): string {
  if (repository.name === "meops") {
    return "meops";
  }

  if (repository.name === "ProjectOps") {
    return "ProjectOps";
  }

  if (repository.name === "WebRefine") {
    return "WebRefine";
  }

  if (repository.name === "Butr") {
    return "Butr";
  }

  if (repository.name === "civiq") {
    return "civiq";
  }

  if (repository.name === "vfo") {
    return "vfo";
  }

  if (repository.name === "dvdnavtex") {
    return "dvdnavtex";
  }

  const label = repository.name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_/]+/g, " ")
    .trim();

  if (repository.name === "CraigWatt") {
    return "profile";
  }

  if (repository.name === "craig-watt-website") {
    return "website";
  }

  if (repository.name === "post-bazzite-install-scripts") {
    return "bazzite";
  }

  if (label.length <= 18) {
    return label;
  }

  return label.split(" ").slice(0, 2).join(" ");
}

function normalizeThemeFragment(value: string): string {
  return value
    .replace(/^codex[/-]/i, "")
    .replace(/^feat[/-]/i, "")
    .replace(/^fix[/-]/i, "")
    .replace(/^docs[/-]/i, "")
    .replace(/^ci[/-]/i, "")
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function summarizeSignalTheme(signal: DashboardSignal): string {
  const summary = signal.summary.trim();
  const lowered = summary.toLowerCase();

  if (lowered.startsWith("merge pull request")) {
    const branchMatch = summary.match(/from\s+[^/]+\/(.+)$/i);
    const branch = branchMatch?.[1] ?? "";
    const branchTheme = normalizeThemeFragment(branch);

    if (branchTheme) {
      return truncate(branchTheme, 28);
    }

    if (lowered.includes("pages")) {
      return "pages";
    }

    return "merged pr";
  }

  if (/^bump /.test(lowered)) {
    return "deps";
  }

  if (/cve/.test(lowered)) {
    return "CVE fix";
  }

  if (/sign in|magic link/.test(lowered)) {
    return "sign-in";
  }

  if (/device family packs/.test(lowered)) {
    return "device packs";
  }

  if (/hdr/.test(lowered) && /fallback/.test(lowered)) {
    return "hdr fallback";
  }

  if (/pages workflow/.test(lowered)) {
    return "pages";
  }

  if (/github pages/.test(lowered)) {
    return "pages";
  }

  if (/integration foundation/.test(lowered)) {
    return "foundation";
  }

  if (/readme/.test(lowered)) {
    return "README";
  }

  if (/logo|favicon|butter|theme/.test(lowered)) {
    return "brand";
  }

  if (/repo discovery/.test(lowered)) {
    return "discovery";
  }

  if (/signal extraction/.test(lowered)) {
    return "signals";
  }

  if (/draft generation/.test(lowered)) {
    return "drafts";
  }

  if (/local env template/.test(lowered)) {
    return "env";
  }

  if (/setup scripts|bazzite|xone|grub/.test(lowered)) {
    return "setup";
  }

  if (/ci\.yml/.test(lowered) || /^ci\b/.test(lowered)) {
    return "CI";
  }

  if (/monorepo scaffold/.test(lowered)) {
    return "scaffold";
  }

  const words = normalizeThemeFragment(summary)
    .split(" ")
    .filter(Boolean)
    .filter(
      (word) =>
        !/^(add|update|fix|remove|create|make|merge|pull|request|from|the|and|of|for|to|with|main|into|first|new|an|a|on|by|in)$/i.test(
          word
        )
    );

  return truncate(words.slice(0, 3).join(" "), 24) || "work";
}

function buildRepoStories(signals: DashboardSignal[], repositories: RepositoryCatalogEntry[]): RepoStory[] {
  const signalsByRepo = new Map<string, DashboardSignal[]>();

  for (const signal of signals) {
    const current = signalsByRepo.get(signal.repository) ?? [];
    current.push(signal);
    signalsByRepo.set(signal.repository, current);
  }

  return repositories
    .filter((repository) => repository.watched)
    .map((repository) => {
      const repoSignals = (signalsByRepo.get(repository.fullName) ?? signalsByRepo.get(repository.name) ?? [])
        .slice()
        .sort((left, right) => signalStrength(right) - signalStrength(left));
      const strongest = repoSignals[0];
      const runnerUp = repoSignals[1];
      const themes = [strongest, runnerUp]
        .filter(Boolean)
        .map((signal) => summarizeSignalTheme(signal as DashboardSignal))
        .filter((theme, index, list) => theme && list.indexOf(theme) === index)
        .slice(0, 2);

      if (repository.name === "post-bazzite-install-scripts" && (!themes[0] || themes[0] === "commit" || themes[0] === "work")) {
        themes.splice(0, themes.length, "setup");
      }

      if (repository.name === "CraigWatt" && themes[0] === "commit") {
        themes.splice(0, themes.length, "README");
      }

      return {
        label: normalizeRepoLabel(repository),
        score: strongest ? signalStrength(strongest) : 0,
        themes: themes.length > 0 ? themes : [repository.description?.trim() || "work"]
      };
    })
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label));
}

function buildSnapshotSources(signals: DashboardSignal[], limit: number): SnapshotSignalSource[] {
  return [...signals]
    .slice()
    .sort((left, right) => signalStrength(right) - signalStrength(left))
    .slice(0, limit)
    .map((signal) => ({
      repository: signal.repository,
      kind: signal.kind,
      priority: signal.priority,
      summary: signal.summary,
      timestamp: signal.timestamp
    }));
}

function buildRepoPromptSummaries(
  signals: DashboardSignal[],
  repositories: RepositoryCatalogEntry[]
): RepoPromptSummary[] {
  const signalsByRepo = new Map<string, DashboardSignal[]>();

  for (const signal of signals) {
    const current = signalsByRepo.get(signal.repository) ?? [];
    current.push(signal);
    signalsByRepo.set(signal.repository, current);
  }

  return repositories
    .filter((repository) => repository.watched)
    .map((repository) => {
      const repoSignals = (signalsByRepo.get(repository.fullName) ?? signalsByRepo.get(repository.name) ?? [])
        .slice()
        .sort((left, right) => signalStrength(right) - signalStrength(left));
      const themes = repoSignals
        .slice(0, 3)
        .map((signal) => summarizeSignalTheme(signal))
        .filter((theme, index, list) => theme && list.indexOf(theme) === index)
        .slice(0, 3);
      const strongestSignals = repoSignals
        .slice(0, 3)
        .map((signal) => `${signal.kind}/${signal.priority}: ${signal.summary}`);
      const label = normalizeRepoLabel(repository);

      let insight = `${repoSignals.length} signals in scope`;
      if (themes.length > 0) {
        insight = `${insight}; main themes: ${themes.join(", ")}`;
      }

      if (repoSignals.every((signal) => /^bump /i.test(signal.summary))) {
        insight = `${insight}. Most visible pattern: dependency/release churn.`;
      } else if (repoSignals.some((signal) => /pages/i.test(signal.summary))) {
        insight = `${insight}. Pages/deployment work is part of the current story.`;
      } else if (repoSignals.some((signal) => /scaffold|foundation|integration/i.test(signal.summary))) {
        insight = `${insight}. Foundational product or platform work is a key theme.`;
      } else {
        insight = `${insight}.`;
      }

      return {
        repository: repository.fullName,
        label,
        signalCount: repoSignals.length,
        insight,
        strongestSignals
      };
    })
    .sort((left, right) => right.signalCount - left.signalCount || left.label.localeCompare(right.label));
}

function renderRepoStories(stories: RepoStory[], themeCount: number): string {
  return stories
    .map((story) => `${story.label}: ${story.themes.slice(0, themeCount).join(" + ")}`)
    .join("; ");
}

function composeSnapshotBody(
  brandName: string,
  repositoryCount: number,
  signalCount: number,
  publishableCount: number,
  stories: RepoStory[],
  maxLength: number
): string {
  const introFull = `${brandName} snapshot: ${repositoryCount} repos watched, ${signalCount} signals tracked, ${publishableCount} ready to review.`;
  const introCompact = `${brandName}: ${repositoryCount} repos, ${signalCount} signals, ${publishableCount} ready.`;

  const candidates = [
    `${introFull}\n\n${renderRepoStories(stories, 2)}`,
    `${introCompact}\n\n${renderRepoStories(stories, 2)}`,
    `${introCompact}\n\n${renderRepoStories(stories, 1)}`
  ];

  for (const candidate of candidates) {
    const normalized = normalizeLineBreaks(candidate);
    if (normalized.length <= maxLength) {
      return normalized;
    }
  }

  let remaining = [...stories];
  while (remaining.length > 1) {
    const next = `${introCompact}\n\n${renderRepoStories(remaining, 1)}`;
    const normalized = normalizeLineBreaks(next);
    if (normalized.length <= maxLength) {
      return normalized;
    }

    remaining = remaining.slice(0, -1);
  }

  return truncate(normalizeLineBreaks(`${introCompact}\n\n${renderRepoStories(remaining, 1)}`), maxLength);
}

function composeSnapshotPrompt(
  brandName: string,
  repositoryCount: number,
  signalCount: number,
  publishableCount: number,
  sources: SnapshotSignalSource[],
  repoSummaries: RepoPromptSummary[]
): string {
  const sourceLines = sources
    .map(
      (source) =>
        `- ${source.repository} · ${source.kind} · ${source.priority}: ${source.summary}`
    )
    .join("\n");
  const repoLines = repoSummaries
    .map(
      (summary) =>
        `- ${summary.repository}: ${summary.insight}\n  Strongest examples: ${summary.strongestSignals.join(" | ")}`
    )
    .join("\n");

  return normalizeLineBreaks(`
You are writing an X post for ${brandName} based on a fresh meops snapshot.

Goal:
- Write one concise, human-sounding X post that summarizes the overall repo activity.
- Keep it under 280 characters.
- Make it feel specific, useful, and not like a raw list.
- Mention the strongest signals, but avoid naming every repository unless it helps the narrative.

Snapshot context:
- ${repositoryCount} repos watched
- ${signalCount} signals tracked
- ${publishableCount} ready to review

Repository-by-repository view:
${repoLines || "- No repository summaries available."}

Strongest source signals:
${sourceLines || "- No source signals available."}

Instructions:
- Include the actual insight, not just the event names. Explain what the work means in aggregate.
- Call out the dominant repo or theme if one area clearly outweighs the others.
- Use the repository summaries to understand the shape of the work, not just the raw events.
- Lead with the most important change or pattern.
- Prefer a clean summary over a pile of repo names.
- Keep the tone factual, confident, and compact.
- Return only the final X post text.
  `);
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
}

export function buildSnapshotXDraft(
  signals: DashboardSignal[],
  repositories: RepositoryCatalogEntry[],
  options: SnapshotDraftOptions = {}
): SnapshotXDraft {
  const brandName = options.brandName ?? "meops";
  const maxLength = options.maxLength ?? 280;
  const publishableSignals = [...signals]
    .filter((signal) => signal.publishable)
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
  const stories = buildRepoStories(signals, repositories);
  const body = composeSnapshotBody(
    brandName,
    stories.length,
    signals.length,
    publishableSignals.length,
    stories,
    maxLength
  );
  const sortedSignals = [...signals].slice().sort((left, right) => signalStrength(right) - signalStrength(left));
  const sources = buildSnapshotSources(sortedSignals, 5);
  const repoSummaries = buildRepoPromptSummaries(signals, repositories);
  const prompt = composeSnapshotPrompt(
    brandName,
    stories.length,
    signals.length,
    publishableSignals.length,
    sources,
    repoSummaries
  );

  return {
    draft: {
      channel: "x",
      title: `${headlineCase(brandName)} snapshot`,
      body,
      status: publishableSignals.length > 0 ? "needs_review" : "prepared"
    },
    sources,
    sourceCount: signals.length,
    prompt
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
