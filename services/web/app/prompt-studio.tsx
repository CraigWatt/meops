"use client";

import { useEffect, useMemo, useState } from "react";
import { type SnapshotSignalSource } from "@meops/generation";

interface PromptStudioProps {
  xPromptBody: string;
  linkedinPromptBody: string;
  repositoryCount: number;
  repositoryOptions: string[];
  sourceCount: number;
  sources: SnapshotSignalSource[];
  promptWorkflowUrl: string;
  promptCacheKey: string;
}

const storageKeyPrefix = "meops-prompt-studio";
const promptStorageKeyPrefix = "meops-prompt-studio-prompt";
const timeRangeOptions = [
  { value: "day", label: "Last day" },
  { value: "week", label: "Last week" },
  { value: "month", label: "Last month" },
  { value: "three-months", label: "Last 3 months" },
  { value: "six-months", label: "Last 6 months" },
  { value: "year", label: "Last year" },
  { value: "all", label: "All time" }
] as const;

type TimeRange = (typeof timeRangeOptions)[number]["value"];

function formatSourceLabel(source: SnapshotSignalSource): string {
  return `${source.repository} · ${source.kind} · ${source.priority}`;
}

function normalizeLineBreaks(value: string): string {
  return value
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

function buildRepositorySelectionLabel(selectedRepositories: string[], repositoryOptions: string[]): string {
  if (selectedRepositories.length === 0) {
    return "No repositories selected in the UI";
  }

  if (selectedRepositories.length === repositoryOptions.length) {
    return "All watched repositories";
  }

  if (selectedRepositories.length <= 4) {
    return selectedRepositories.join(", ");
  }

  return `${selectedRepositories.slice(0, 3).join(", ")}, +${selectedRepositories.length - 3} more`;
}

function buildScopedPrompt(
  basePrompt: string,
  selectedTimeRange: TimeRange,
  selectedRepositories: string[],
  repositoryOptions: string[]
): string {
  const selectedTimeRangeLabel =
    timeRangeOptions.find((option) => option.value === selectedTimeRange)?.label ?? "All time";
  const selectedRepositoryLabel = buildRepositorySelectionLabel(selectedRepositories, repositoryOptions);

  return normalizeLineBreaks(`
Prompt scope:
- Time window selected in the UI: ${selectedTimeRangeLabel}
- Repository selection: ${selectedRepositoryLabel}
- Note: these controls are foundation-only for now; the prompt still starts from the full current snapshot below.

${basePrompt}
  `);
}

interface PromptCardProps {
  id: string;
  title: string;
  description: string;
  prompt: string;
  copied: boolean;
  onPromptChange: (value: string) => void;
  onCopy: () => Promise<void>;
  onReset: () => void;
}

function PromptCard({
  id,
  title,
  description,
  prompt,
  copied,
  onPromptChange,
  onCopy,
  onReset
}: PromptCardProps) {
  const characterCount = prompt.trim().length;

  return (
    <div className="card prompt-card">
      <div className="card-header">
        <div>
          <h3 className="card-title">{title}</h3>
          <p className="card-description">{description}</p>
        </div>
        <div className="tags">
          <span className="tag tag--accent">{characterCount} chars</span>
        </div>
      </div>

      <label className="sr-only" htmlFor={id}>
        {title} body
      </label>
      <textarea
        id={id}
        className="draft-textarea"
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        spellCheck
      />

      <div className="draft-actions">
        <button type="button" className="action-button action-button--secondary" onClick={onCopy}>
          {copied ? "Copied" : "Copy prompt"}
        </button>
        <button type="button" className="action-button action-button--secondary" onClick={onReset}>
          Reset prompt
        </button>
      </div>
    </div>
  );
}

export function PromptStudio({
  xPromptBody,
  linkedinPromptBody,
  repositoryCount,
  repositoryOptions,
  sourceCount,
  sources,
  promptWorkflowUrl,
  promptCacheKey
}: PromptStudioProps) {
  const [xPrompt, setXPrompt] = useState(xPromptBody);
  const [linkedinPrompt, setLinkedInPrompt] = useState(linkedinPromptBody);
  const [copiedPrompt, setCopiedPrompt] = useState<"x" | "linkedin" | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>("all");
  const [selectedRepositories, setSelectedRepositories] = useState<string[]>(repositoryOptions);
  const promptStorageKey = `${promptStorageKeyPrefix}:${promptCacheKey}`;
  const selectionStorageKey = `${storageKeyPrefix}:${promptCacheKey}:selection`;

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const saved = window.localStorage.getItem(promptStorageKey);
    if (!saved) {
      setXPrompt(xPromptBody);
      setLinkedInPrompt(linkedinPromptBody);
      return;
    }

    try {
      const parsed = JSON.parse(saved) as { x?: string; linkedin?: string };
      setXPrompt(parsed.x ?? xPromptBody);
      setLinkedInPrompt(parsed.linkedin ?? linkedinPromptBody);
    } catch {
      setXPrompt(xPromptBody);
      setLinkedInPrompt(linkedinPromptBody);
    }
  }, [hydrated, linkedinPromptBody, promptStorageKey, xPromptBody]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const saved = window.localStorage.getItem(selectionStorageKey);
    if (!saved) {
      setSelectedTimeRange("all");
      setSelectedRepositories(repositoryOptions);
      return;
    }

    try {
      const parsed = JSON.parse(saved) as { timeRange?: TimeRange; repositories?: string[] };
      setSelectedTimeRange(
        timeRangeOptions.some((option) => option.value === parsed.timeRange) ? (parsed.timeRange as TimeRange) : "all"
      );
      if (Array.isArray(parsed.repositories)) {
        setSelectedRepositories(parsed.repositories.filter((repository) => repositoryOptions.includes(repository)));
      } else {
        setSelectedRepositories(repositoryOptions);
      }
    } catch {
      setSelectedTimeRange("all");
      setSelectedRepositories(repositoryOptions);
    }
  }, [hydrated, repositoryOptions, selectionStorageKey]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(
      selectionStorageKey,
      JSON.stringify({ timeRange: selectedTimeRange, repositories: selectedRepositories })
    );
  }, [hydrated, selectedRepositories, selectedTimeRange, selectionStorageKey]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(
      promptStorageKey,
      JSON.stringify({
        x: xPrompt,
        linkedin: linkedinPrompt
      })
    );
  }, [hydrated, linkedinPrompt, promptStorageKey, xPrompt]);

  useEffect(() => {
    setSelectedRepositories((current) => current.filter((repository) => repositoryOptions.includes(repository)));
  }, [repositoryOptions]);

  const promptContext = useMemo(
    () => ({
      timeRange:
        timeRangeOptions.find((option) => option.value === selectedTimeRange)?.label ?? "All time",
      repositories: buildRepositorySelectionLabel(selectedRepositories, repositoryOptions)
    }),
    [repositoryOptions, selectedRepositories, selectedTimeRange]
  );

  const selectedTimeRangeLabel =
    timeRangeOptions.find((option) => option.value === selectedTimeRange)?.label ?? "All time";

  function resetPrompts() {
    window.localStorage.removeItem(promptStorageKey);
    setXPrompt(xPromptBody);
    setLinkedInPrompt(linkedinPromptBody);
    setCopiedPrompt(null);
  }

  async function copyPrompt(channel: "x" | "linkedin", prompt: string) {
    await navigator.clipboard.writeText(prompt.trim());
    setCopiedPrompt(channel);
    window.setTimeout(() => setCopiedPrompt((current) => (current === channel ? null : current)), 1500);
  }

  function toggleRepository(repository: string) {
    setSelectedRepositories((current) =>
      current.includes(repository)
        ? current.filter((candidate) => candidate !== repository)
        : [...current, repository]
    );
  }

  function selectAllRepositories() {
    setSelectedRepositories(repositoryOptions);
  }

  function clearRepositories() {
    setSelectedRepositories([]);
  }

  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">Prompt studio</h2>
        <span className="section-meta">GitHub Pages first · workflow-backed prompt generation</span>
      </div>

      <div className="card card--featured prompt-studio-card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Snapshot prompt controls</h3>
            <p className="card-description">
              Choose a signal window and repository scope, then open the prompt workflow in GitHub. The controls are
              foundation-only for now, but the selected scope is carried into the prompt text as editorial guidance.
            </p>
          </div>
          <div className="tags">
            <span className="tag tag--accent">{repositoryCount} repos</span>
            <span className="tag tag--accent">{sourceCount} signals</span>
          </div>
        </div>

        <div className="prompt-controls">
          <div className="prompt-control">
            <label className="prompt-control-label" htmlFor="prompt-range">
              Signal window
            </label>
            <select
              id="prompt-range"
              className="prompt-control-select"
              value={selectedTimeRange}
              onChange={(event) => setSelectedTimeRange(event.target.value as TimeRange)}
            >
              {timeRangeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="prompt-control prompt-control--wide">
            <div className="prompt-control-header">
              <span className="prompt-control-label">Repositories</span>
              <div className="prompt-control-actions">
                <button type="button" className="action-button action-button--secondary" onClick={selectAllRepositories}>
                  Select all
                </button>
                <button type="button" className="action-button action-button--secondary" onClick={clearRepositories}>
                  Clear
                </button>
              </div>
            </div>
            <div className="prompt-repo-grid">
              {repositoryOptions.map((repository) => {
                const checked = selectedRepositories.includes(repository);
                return (
                  <label key={repository} className={`prompt-repo-option ${checked ? "prompt-repo-option--active" : ""}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRepository(repository)}
                    />
                    <span>{repository}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="draft-actions">
          <a className="action-button" href={promptWorkflowUrl} target="_blank" rel="noreferrer">
            Generate prompts in GitHub ({selectedTimeRangeLabel})
          </a>
          <button type="button" className="action-button action-button--secondary" onClick={resetPrompts}>
            Reset prompts
          </button>
        </div>

        <p className="draft-help">
          Current scope: {promptContext.timeRange} · {promptContext.repositories}. The workflow button opens
          <code>generate-prompts.yml</code> in GitHub Actions, where you can run the same prompt job manually for
          now.
        </p>

        <p className="draft-help">
          Workflow scope shown on the page: {selectedTimeRangeLabel} · {promptContext.repositories}
        </p>

        <div className="draft-provenance">
          <div className="draft-provenance-header">
            <span className="draft-help">
              Derived from {sourceCount} signals across {repositoryCount} repos
            </span>
            {sourceCount > sources.length && (
              <span className="draft-help">+{sourceCount - sources.length} more signals</span>
            )}
          </div>
          <div className="draft-provenance-list">
            {sources.map((source) => (
              <div key={`${source.repository}-${source.timestamp}-${source.summary}`} className="draft-provenance-item">
                <span className="tag tag--accent">{formatSourceLabel(source)}</span>
                <span className="draft-provenance-summary" title={source.summary}>
                  {source.summary}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="cards-grid cards-grid--two prompt-channel-grid">
        <PromptCard
          id="x-prompt-generator"
          title="X prompt generator"
          description="Copy this prompt into an AI if you want a concise X draft grounded in the current snapshot."
          prompt={xPrompt}
          copied={copiedPrompt === "x"}
          onPromptChange={setXPrompt}
          onCopy={() => copyPrompt("x", xPrompt)}
          onReset={() => {
            setXPrompt(xPromptBody);
            setCopiedPrompt(null);
          }}
        />

        <PromptCard
          id="linkedin-prompt-generator"
          title="LinkedIn prompt generator"
          description="Copy this prompt into an AI if you want a longer, more explanatory LinkedIn post from the same snapshot."
          prompt={linkedinPrompt}
          copied={copiedPrompt === "linkedin"}
          onPromptChange={setLinkedInPrompt}
          onCopy={() => copyPrompt("linkedin", linkedinPrompt)}
          onReset={() => {
            setLinkedInPrompt(linkedinPromptBody);
            setCopiedPrompt(null);
          }}
        />
      </div>
    </section>
  );
}
