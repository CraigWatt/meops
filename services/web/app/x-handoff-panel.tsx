"use client";

import { useEffect, useMemo, useState } from "react";

interface XHandoffPanelProps {
  draftTitle: string;
  draftBody: string;
  workflowUrl: string;
  repositoryCount: number;
}

const storageKey = "meops-x-handoff-draft";

export function XHandoffPanel({
  draftTitle,
  draftBody,
  workflowUrl,
  repositoryCount
}: XHandoffPanelProps) {
  const [body, setBody] = useState(draftBody);
  const [copied, setCopied] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);

    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      setBody(saved);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(storageKey, body);
  }, [body, hydrated]);

  const trimmedBody = body.trim();
  const characterCount = useMemo(() => trimmedBody.length, [trimmedBody]);
  const overLimit = characterCount > 280;

  async function copyDraft() {
    await navigator.clipboard.writeText(trimmedBody);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
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

        <div className="draft-actions">
          <button type="button" className="action-button action-button--secondary" onClick={copyDraft}>
            {copied ? "Copied" : "Copy draft"}
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
    </section>
  );
}
