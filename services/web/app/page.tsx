import { getDashboardSignals } from "@meops/store";
import { channelLabel, formatDraft } from "@meops/content";
import { CaptureSignalForm } from "../components/capture-signal-form";

export default async function Home() {
  const signals = await getDashboardSignals();

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">meops</p>
        <h1>Turn work into signal.</h1>
        <p className="lede">
          meops watches the engineering work already happening across your repos and
          turns it into drafts, updates, and narrative that can go public with less
          friction.
        </p>
      </section>

      <CaptureSignalForm />

      <section className="panel">
        <div className="panel-header">
          <h2>Signals to review</h2>
          <span>{signals.length} queued moments</span>
        </div>
        <div className="signal-grid">
          {signals.map((signal) => {
            const previewDraft =
              signal.drafts.find((draft) => draft.channel === "blog") ?? signal.drafts[0];

            return (
              <article key={signal.description} className="signal-card">
                <div className="signal-meta">
                  <span>{signal.kind}</span>
                  <span>{signal.priority}</span>
                  <span>{signal.source ?? "manual"}</span>
                  {signal.publishable ? <span>publishable</span> : <span>watch</span>}
                </div>
                <h3>{signal.description}</h3>
                <p>{signal.summary}</p>
                <div className="draft-list">
                  {signal.drafts.map((draft) => (
                    <div key={`${signal.description}-${draft.channel}`} className="draft-chip">
                      {channelLabel(draft.channel)}
                    </div>
                  ))}
                </div>
                <div className="draft-preview">
                  <strong>
                    {previewDraft ? `${channelLabel(previewDraft.channel)} preview` : "Preview"}
                  </strong>
                  <p>{previewDraft ? formatDraft(previewDraft) : "No draft available yet."}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
