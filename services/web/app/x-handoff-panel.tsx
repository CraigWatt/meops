"use client";

import { useEffect, useMemo, useState } from "react";
import { type SnapshotSignalSource } from "@meops/generation";

interface XHandoffPanelProps {
  draftTitle: string;
  draftBody: string;
  promptBody: string;
  workflowUrl: string;
  repositoryCount: number;
  repositoryOptions: string[];
  sourceCount: number;
  sources: SnapshotSignalSource[];
  draftCacheKey: string;
}

const storageKeyPrefix = "meops-x-handoff-draft";
const promptStorageKeyPrefix = "meops-x-handoff-prompt";
const timeRangeOptions = [
  { value: "day", label: "Last day" },
  { value: "week", label: "Last week" },
  { value: "month", label: "Last month" },
  { value: "three-months", label: "Last 3 months" },
  { value: "six-months", label: "Last 6 months" },
  { value: "year", label: "Last year" },
  { value: "all", label: "All signals" }
] as const;

function formatSourceLabel(source: SnapshotSignalSource): string {
  return `${source.repository} · ${source.kind} · ${source.priority}`;
}

export function XHandoffPanel({
  draftTitle,
  draftBody,
  promptBody,
  workflowUrl,
  repositoryCount,
  repositoryOptions,
  sourceCount,
  sources,
  draftCacheKey
}: XHandoffPanelProps) {
  const [body, setBody] = useState(draftBody);
  const [prompt, setPrompt] = useState(promptBody);
  const [copied, setCopied] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<(typeof timeRangeOptions)[number]["value"]>("all");
  const [selectedRepositories, setSelectedRepositories] = useState<string[]>(repositoryOptions);
  const storageKey = `${storageKeyPrefix}:${draftCacheKey}`;
  const promptStorageKey = `${promptStorageKeyPrefix}:${draftCacheKey}`;

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    setSelectedRepositories(repositoryOptions);
  }, [repositoryOptions]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const saved = window.localStorage.getItem(storageKey);
    setBody(saved ?? draftBody);
  }, [draftBody, hydrated, storageKey]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const saved = window.localStorage.getItem(promptStorageKey);
    setPrompt(saved ?? promptBody);
  }, [hydrated, promptBody, promptStorageKey]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(storageKey, body);
  }, [body, hydrated]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(promptStorageKey, prompt);
  }, [hydrated, prompt, promptStorageKey]);

  const trimmedBody = body.trim();
  const characterCount = useMemo(() => trimmedBody.length, [trimmedBody]);
  const overLimit = characterCount > 280;

  async function copyDraft() {
    await navigator.clipboard.writeText(trimmedBody);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt.trim());
    setPromptCopied(true);
    window.setTimeout(() => setPromptCopied(false), 1500);
  }

  function resetDraft() {
    window.localStorage.removeItem(storageKey);
    setBody(draftBody);
    setCopied(false);
  }

  function resetPrompt() {
    window.localStorage.removeItem(promptStorageKey);
    setPrompt(promptBody);
    setPromptCopied(false);
  }

  function generatePrompt() {
    setPrompt(promptBody);
    setPromptCopied(false);
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
        <h2 className="section-title">X publish handoff</h2>
        <span className="section-meta">Private GitHub Actions run · only the repository owner can execute it</span>
      </div>

      <div className="card card--featured x-handoff-card">
        <div className="card-header">
          <div>
            <h3 className="card-title">{draftTitle}</h3>
            <p className="card-description">
              Edit the aggregate snapshot text below, then copy it into the private GitHub Actions workflow before
              running the post.
            </p>
          </div>

          <div className="tags">
            <span className="tag tag--accent">{repositoryCount} repos</span>
            <span className={`tag ${overLimit ? "tag--danger" : "tag--success"}`}>
              {characterCount}/280 chars
            </span>
          </div>
        </div>

        <label className="sr-only" htmlFor="x-draft-body">
          X draft body
        </label>
        <textarea
          id="x-draft-body"
          className="draft-textarea"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          spellCheck
        />

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

        <div className="draft-actions">
          <button type="button" className="action-button action-button--secondary" onClick={copyDraft}>
            {copied ? "Copied" : "Copy draft"}
          </button>
          <button type="button" className="action-button action-button--secondary" onClick={resetDraft}>
            Reset draft
          </button>
          <a className="action-button" href={workflowUrl} target="_blank" rel="noreferrer">
            Open GitHub Actions
          </a>
        </div>

        <p className="draft-help">
          Paste the edited text into the workflow dispatch input, then run it from your GitHub account. The post
          will only publish if the workflow is started by the repository owner.
        </p>
      </div>

      <div className="card x-handoff-card__subsection">
        <div className="card-header">
          <div>
            <h3 className="card-title">AI prompt handoff</h3>
            <p className="card-description">
              Copy this prompt into an AI of your choice if you want a second pass that rewrites the X post from the
              same snapshot signals.
            </p>
          </div>
          <div className="tags">
            <span className="tag tag--accent">Prompt generator</span>
          </div>
        </div>

        <div className="prompt-controls">
          <div className="prompt-control">
            <label className="prompt-control-label" htmlFor="x-prompt-range">
              Signal window
            </label>
            <select
              id="x-prompt-range"
              className="prompt-control-select"
              value={selectedTimeRange}
              onChange={(event) =>
                setSelectedTimeRange(event.target.value as (typeof timeRangeOptions)[number]["value"])
              }
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

        <label className="sr-only" htmlFor="x-prompt-body">
          X prompt body
        </label>
        <textarea
          id="x-prompt-body"
          className="draft-textarea"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          spellCheck
        />

        <div className="draft-actions">
          <button type="button" className="action-button" onClick={generatePrompt}>
            Generate prompt
          </button>
          <button type="button" className="action-button action-button--secondary" onClick={copyPrompt}>
            {promptCopied ? "Copied" : "Copy prompt"}
          </button>
          <button type="button" className="action-button action-button--secondary" onClick={resetPrompt}>
            Reset prompt
          </button>
        </div>

        <p className="draft-help">
          This prompt is derived from the same source signals as the draft above. The time-range and repository
          controls are foundation-only for now, so prompt generation still uses the full current snapshot until the
          filtered generation path is wired up.
        </p>
      </div>
    </section>
  );
}
