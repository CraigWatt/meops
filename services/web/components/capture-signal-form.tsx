"use client";

import type { FormEvent } from "react";
import { useState } from "react";

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

const apiBase = process.env.NEXT_PUBLIC_MEOPS_API_URL ?? "";

export function CaptureSignalForm() {
  const [state, setState] = useState<SubmitState>({ kind: "idle" });

  function renderStatusText(currentState: SubmitState): string {
    if (currentState.kind === "idle") {
      return apiBase
        ? "Submits to the local API store."
        : "Set NEXT_PUBLIC_MEOPS_API_URL to enable capture.";
    }

    if (currentState.kind === "submitting") {
      return "Capturing...";
    }

    return currentState.message;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!apiBase) {
      setState({
        kind: "error",
        message: "Set NEXT_PUBLIC_MEOPS_API_URL to enable local signal capture."
      });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = {
      kind: formData.get("kind"),
      summary: formData.get("summary"),
      repository: formData.get("repository"),
      priority: formData.get("priority")
    };

    setState({ kind: "submitting" });

    try {
      const response = await fetch(`${apiBase.replace(/\/$/, "")}/signals`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = (await response.json()) as
        | { signal: { description: string } }
        | { error?: string; message?: string };

      if (!response.ok) {
        const errorResult = result as { error?: string; message?: string };
        throw new Error(errorResult.message ?? errorResult.error ?? "Failed to capture signal");
      }

      if (!("signal" in result)) {
        throw new Error("Failed to capture signal");
      }

      setState({
        kind: "success",
        message: `Captured ${result.signal.description}`
      });
      event.currentTarget.reset();
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  return (
    <section className="panel capture-panel">
      <div className="panel-header">
        <h2>Capture a signal</h2>
        <span>{apiBase ? "connected" : "local only"}</span>
      </div>

      <form className="capture-form" onSubmit={onSubmit}>
        <label>
          Repository
          <input defaultValue="CraigWatt/meops" name="repository" required />
        </label>
        <label>
          Kind
          <select name="kind" defaultValue="commit">
            <option value="commit">Commit</option>
            <option value="pull_request">Pull request</option>
            <option value="release">Release</option>
            <option value="milestone">Milestone</option>
          </select>
        </label>
        <label>
          Priority
          <select name="priority" defaultValue="medium">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="capture-span">
          Summary
          <textarea
            defaultValue="A new engineering signal worth turning into public output."
            name="summary"
            required
            rows={4}
          />
        </label>
        <button type="submit" disabled={state.kind === "submitting"}>
          {state.kind === "submitting" ? "Capturing..." : "Capture signal"}
        </button>
      </form>

      <p className={`capture-status capture-status-${state.kind}`}>
        {renderStatusText(state)}
      </p>
    </section>
  );
}
