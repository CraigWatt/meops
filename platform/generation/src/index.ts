import type { Draft, DraftChannel, SignalEvent } from "@meops/core";

export interface DraftGenerationOptions {
  blogBaseUrl?: string;
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
  return `A real engineering signal from ${signal.repository}.`;
}

function buildXDraft(signal: SignalEvent): Draft {
  const body = normalizeLineBreaks(`
${signal.summary}

${signal.repository} ${signal.kind} progress worth sharing.
  `);

  return {
    channel: "x",
    title: `${headlineCase(signal.kind)} update`,
    body
  };
}

function buildLinkedInDraft(signal: SignalEvent): Draft {
  const body = normalizeLineBreaks(`
${signal.summary}

${signalAngle(signal)}

What changed:
- ${signal.kind} work moved forward in a way that matters
- the underlying code is now easier to explain, reuse, or build on

Why it matters:
This is the kind of progress that compounds over time and shapes the larger product story.
  `);

  return {
    channel: "linkedin",
    title: `${headlineCase(signal.repository)} signal`,
    body
  };
}

function buildBlogDraft(signal: SignalEvent, blogBaseUrl: string): Draft {
  const body = normalizeLineBreaks(`
# ${headlineCase(signal.summary)}

This update is a good example of how a small engineering change can become a
clear public story.

## What changed

${signal.summary}

## Why it matters

${signalAngle(signal)}
That kind of work is what tends to build momentum in a product over time.

## Signal notes

- Repository: ${signal.repository}
- Kind: ${signal.kind}
- Priority: ${signal.priority}

Published for [${blogBaseUrl}](${blogBaseUrl}).
  `);

  return {
    channel: "blog",
    title: headlineCase(signal.summary),
    body
  };
}

function buildUpdateLogDraft(signal: SignalEvent): Draft {
  const body = normalizeLineBreaks(`
${signal.summary}

Repository: ${signal.repository}
Kind: ${signal.kind}
Priority: ${signal.priority}
  `);

  return {
    channel: "update-log",
    title: `Update log: ${headlineCase(signal.kind)}`,
    body
  };
}

export function buildDrafts(
  signal: SignalEvent,
  options: DraftGenerationOptions = {}
): Draft[] {
  const blogBaseUrl = options.blogBaseUrl ?? "https://craigwatt.co.uk";

  return [
    buildXDraft(signal),
    buildLinkedInDraft(signal),
    buildBlogDraft(signal, blogBaseUrl),
    buildUpdateLogDraft(signal)
  ];
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
