import { getDashboardSignals, getRepositoryCatalog } from "@meops/store";
import { channelLabel, formatDraft } from "@meops/content";

const techStack = [
  "GitHub repo discovery",
  "Local git fallback",
  "File-backed store",
  "TypeScript workspace",
  "Next.js Pages export",
  "Node worker pipeline"
];

export default async function Home() {
  const signals = await getDashboardSignals();
  const repositories = await getRepositoryCatalog();
  const activeRepositories = repositories.filter((repository) => repository.watched);
  const githubDiscoveredRepositories = repositories.filter(
    (repository) => repository.source === "github_discovery"
  );
  const publishedSignals = signals.filter((signal) => signal.publishable);
  const draftCounts = signals.reduce<Record<string, number>>((accumulator, signal) => {
    for (const draft of signal.drafts) {
      accumulator[draft.channel] = (accumulator[draft.channel] ?? 0) + 1;
    }

    return accumulator;
  }, {});
  const preparedChannels: Array<"x" | "linkedin" | "blog" | "update-log"> = [
    "x",
    "linkedin",
    "blog",
    "update-log"
  ];
  const preparedDraftsByChannel = preparedChannels.map((channel) => {
    const draft =
      signals
        .flatMap((signal) => signal.drafts)
        .find((candidate) => candidate.channel === channel) ?? null;

    return {
      channel,
      draft,
      count: draftCounts[channel] ?? 0
    };
  });
  const latestPublishable = publishedSignals[0];

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">meops</p>
        <h1>Turn work into signal.</h1>
        <p className="lede">
          meops keeps an eye on repo activity, turns it into public-ready output, and
          surfaces what is currently being prepared across the stack.
        </p>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>System status</h2>
          <span>{repositories.length > 0 ? "operational" : "warming up"}</span>
        </div>
        <div className="signal-grid">
          <article className="signal-card">
            <div className="signal-meta">
              <span>{activeRepositories.length} active sources</span>
              <span>{publishedSignals.length} publishable signals</span>
            </div>
            <h3>Overall state</h3>
            <p>
              {repositories.length > 0
                ? "meops has repository awareness and an active signal pipeline."
                : "meops is waiting for the first repository sync."}
            </p>
            <div className="draft-list">
              <div className="draft-chip">{repositories.length} tracked repos</div>
              <div className="draft-chip">{githubDiscoveredRepositories.length} GitHub discovered</div>
              <div className="draft-chip">{publishedSignals.length} publishable</div>
            </div>
            {latestPublishable ? (
              <div className="draft-preview">
                <strong>Latest publishable</strong>
                <p>{latestPublishable.description}</p>
              </div>
            ) : null}
          </article>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Active sources</h2>
          <span>{activeRepositories.length} watching now</span>
        </div>
        <div className="signal-grid">
          {activeRepositories.map((repository) => (
            <article key={repository.fullName} className="signal-card">
              <div className="signal-meta">
                <span>{repository.watched ? "watching" : "paused"}</span>
                <span>{repository.source}</span>
                <span>{repository.signalCount} signals</span>
              </div>
              <h3>{repository.fullName}</h3>
              <p>{repository.description ?? "No repository description available yet."}</p>
              <div className="draft-list">
                <div className="draft-chip">{repository.defaultBranch ?? "main"}</div>
                {repository.language ? <div className="draft-chip">{repository.language}</div> : null}
                {repository.topics?.slice(0, 3).map((topic) => (
                  <div key={`${repository.fullName}-${topic}`} className="draft-chip">
                    {topic}
                  </div>
                ))}
              </div>
              <div className="draft-preview">
                <strong>Sync state</strong>
                <p>
                  {repository.lastSyncedAt
                    ? `Last synced ${repository.lastSyncedAt}`
                    : "Not synced yet."}
                </p>
                </div>
              </article>
            ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Prepared posts</h2>
          <span>{preparedDraftsByChannel.length} channels prepared</span>
        </div>
        <div className="signal-grid">
          {preparedDraftsByChannel.map(({ channel, draft, count }) => (
            <article key={channel} className="signal-card">
              <div className="signal-meta">
                <span>{channelLabel(channel)}</span>
                <span>{count} total</span>
                <span>ready</span>
              </div>
              <h3>{draft ? draft.title : `No ${channelLabel(channel)} draft yet`}</h3>
              <p>
                {draft
                  ? `${draft.body.slice(0, 180)}${draft.body.length > 180 ? "…" : ""}`
                  : "This channel has no prepared draft yet."}
              </p>
              {draft ? (
                <div className="draft-preview">
                  <strong>{channelLabel(channel)} draft</strong>
                  <p>{formatDraft(draft)}</p>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

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

      <section className="panel">
        <div className="panel-header">
          <h2>Tech stack visibility</h2>
          <span>{techStack.length} building blocks</span>
        </div>
        <div className="signal-grid">
          <article className="signal-card">
            <div className="signal-meta">
              <span>current stack</span>
              <span>observed</span>
            </div>
            <h3>What meops runs on</h3>
            <div className="draft-list">
              {techStack.map((item) => (
                <div key={item} className="draft-chip">
                  {item}
                </div>
              ))}
            </div>
            <div className="draft-preview">
              <strong>Stack note</strong>
              <p>
                The dashboard is static on GitHub Pages, while discovery, extraction,
                and generation happen in the worker pipeline.
              </p>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
