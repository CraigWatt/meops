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

function formatTimestamp(timestamp?: string): string {
  if (!timestamp) {
    return "not yet";
  }

  const value = new Date(timestamp);
  if (Number.isNaN(value.getTime())) {
    return "not yet";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

function formatRecency(timestamp?: string): string {
  if (!timestamp) {
    return "not yet";
  }

  const value = new Date(timestamp);
  const delta = Date.now() - value.getTime();

  if (Number.isNaN(delta) || delta < 0) {
    return "just now";
  }

  const minutes = Math.floor(delta / 1000 / 60);
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatPreview(text: string, length: number): string {
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

export default async function Home() {
  const signals = await getDashboardSignals();
  const repositories = await getRepositoryCatalog();
  const orderedSignals = [...signals].sort(
    (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
  );
  const orderedRepositories = [...repositories].sort((left, right) => {
    if (left.watched !== right.watched) {
      return left.watched ? -1 : 1;
    }

    const leftTime = left.lastSyncedAt ? new Date(left.lastSyncedAt).getTime() : 0;
    const rightTime = right.lastSyncedAt ? new Date(right.lastSyncedAt).getTime() : 0;

    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }

    return left.fullName.localeCompare(right.fullName);
  });
  const activeRepositories = orderedRepositories.filter((repository) => repository.watched);
  const pausedRepositories = orderedRepositories.filter((repository) => !repository.watched);
  const githubDiscoveredRepositories = repositories.filter(
    (repository) => repository.source === "github_discovery"
  );
  const publishedSignals = orderedSignals.filter((signal) => signal.publishable);
  const draftCounts = signals.reduce<Record<string, number>>((accumulator, signal) => {
    for (const draft of signal.drafts) {
      accumulator[draft.channel] = (accumulator[draft.channel] ?? 0) + 1;
    }

    return accumulator;
  }, {});
  const draftStatuses: Array<"prepared" | "needs_review" | "approved" | "published"> = [
    "prepared",
    "needs_review",
    "approved",
    "published"
  ];
  const draftStatusCounts = signals.reduce<Record<string, number>>((accumulator, signal) => {
    for (const draft of signal.drafts) {
      accumulator[draft.status] = (accumulator[draft.status] ?? 0) + 1;
    }

    return accumulator;
  }, {});
  const preparedChannels: Array<"x" | "linkedin"> = ["x", "linkedin"];
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
  const latestSignal = orderedSignals[0];
  const syncingRepositories = orderedRepositories.filter((repository) => repository.lastSyncedAt);
  const freshRepositories = orderedRepositories.filter((repository) => {
    if (!repository.lastSyncedAt) {
      return false;
    }

    const age = Date.now() - new Date(repository.lastSyncedAt).getTime();
    return age >= 0 && age < 1000 * 60 * 60 * 24;
  });
  const preparedChannelCount = preparedDraftsByChannel.filter(({ count }) => count > 0).length;
  const preparedStatusCards = draftStatuses.map((status) => ({
    status,
    count: draftStatusCounts[status] ?? 0
  }));

  const repositoryGroups = [
    {
      label: "Watching now",
      count: activeRepositories.length,
      repositories: activeRepositories
    },
    {
      label: "Paused",
      count: pausedRepositories.length,
      repositories: pausedRepositories
    }
  ].filter((group) => group.repositories.length > 0);

  return (
    <main className="page">
      <section className="hero-shell">
        <div className="hero-copy">
          <p className="eyebrow">meops</p>
          <h1>Turn work into signal.</h1>
          <p className="lede">
            meops watches repository activity, turns the important moments into publishable
            drafts, and keeps the stack visible without asking for constant attention.
          </p>
          <div className="pill-row" aria-label="Current operating mode">
            <span className="status-pill status-pill--positive">GitHub-aware</span>
            <span className="status-pill status-pill--neutral">Static dashboard</span>
            <span className="status-pill status-pill--accent">Drafts prepared</span>
          </div>
        </div>

        <aside className="hero-panel">
          <div className="hero-panel-head">
            <span className="pulse-dot pulse-dot--active" />
            <span>Live operations</span>
          </div>
          <strong>{repositories.length > 0 ? "Operational" : "Warming up"}</strong>
          <p>
            {repositories.length > 0
              ? `${activeRepositories.length} repositories are being watched, and ${publishedSignals.length} signals are ready to publish.`
              : "meops is waiting for the first repository sync to light up the panel."}
          </p>
          <div className="hero-stat-grid">
            <div className="hero-stat">
              <span>Sources</span>
              <strong>{repositories.length}</strong>
              <small>{githubDiscoveredRepositories.length} GitHub discovered</small>
            </div>
            <div className="hero-stat">
              <span>Queue</span>
              <strong>{signals.length}</strong>
              <small>{publishedSignals.length} publishable</small>
            </div>
            <div className="hero-stat">
              <span>Fresh syncs</span>
              <strong>{freshRepositories.length}</strong>
              <small>{syncingRepositories.length} synced at least once</small>
            </div>
          </div>
          {latestSignal ? (
            <div className="hero-focus">
              <span className="hero-focus-label">Latest signal</span>
              <strong>{latestSignal.description}</strong>
              <p>{latestSignal.summary}</p>
            </div>
          ) : null}
        </aside>
      </section>

      <section className="metric-strip" aria-label="Status summary">
        <article className="metric-card">
          <span className="metric-label">Watched sources</span>
          <strong>{activeRepositories.length}</strong>
          <small>{pausedRepositories.length} paused</small>
        </article>
        <article className="metric-card">
          <span className="metric-label">Prepared posts</span>
          <strong>{preparedChannelCount}</strong>
          <small>{preparedDraftsByChannel.length} channels tracked</small>
        </article>
        <article className="metric-card">
          <span className="metric-label">Signals to review</span>
          <strong>{signals.length}</strong>
          <small>{publishedSignals.length} ready to ship</small>
        </article>
        <article className="metric-card">
          <span className="metric-label">Last sync</span>
          <strong>
            {orderedRepositories.length > 0
              ? formatRecency(orderedRepositories[0]?.lastSyncedAt)
              : "—"}
          </strong>
          <small>
            {orderedRepositories.length > 0
              ? formatTimestamp(orderedRepositories[0]?.lastSyncedAt)
              : "not yet"}
          </small>
        </article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="section-kicker">Awareness</p>
            <h2>System status</h2>
          </div>
          <span>{repositories.length > 0 ? "operational" : "warming up"}</span>
        </div>
        <div className="signal-grid signal-grid--feature">
          <article className="signal-card signal-card--feature">
            <div className="signal-meta">
              <span className="status-pill status-pill--positive">{activeRepositories.length} active sources</span>
              <span className="status-pill status-pill--neutral">{publishedSignals.length} publishable signals</span>
            </div>
            <h3>Overall state</h3>
            <p>
              {repositories.length > 0
                ? "meops has repository awareness, a live signal pipeline, and visible draft output."
                : "meops is waiting for the first repository sync to populate the awareness view."}
            </p>
            <div className="draft-list">
              <div className="draft-chip">{repositories.length} tracked repos</div>
              <div className="draft-chip">{githubDiscoveredRepositories.length} GitHub discovered</div>
              <div className="draft-chip">{publishedSignals.length} publishable</div>
              <div className="draft-chip">{pausedRepositories.length} paused</div>
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
          <div>
            <p className="section-kicker">Sources</p>
            <h2>Active sources</h2>
          </div>
          <span>
            {activeRepositories.length} watching now · {pausedRepositories.length} paused
          </span>
        </div>
        <div className="repository-groups">
          {repositoryGroups.map((group) => (
            <section key={group.label} className="repository-group">
              <div className="group-header">
                <h3>{group.label}</h3>
                <span>{group.count}</span>
              </div>
              <div className="signal-grid">
                {group.repositories.map((repository) => (
                  <article key={repository.fullName} className="signal-card">
                    <div className="signal-meta">
                      <span className={`status-pill ${repository.watched ? "status-pill--positive" : "status-pill--neutral"}`}>
                        {repository.watched ? "watching" : "paused"}
                      </span>
                      <span className="status-pill status-pill--neutral">{repository.source}</span>
                      <span className="status-pill status-pill--accent">{repository.signalCount} signals</span>
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
                          ? `Last synced ${formatTimestamp(repository.lastSyncedAt)} · ${formatRecency(repository.lastSyncedAt)}`
                          : "Not synced yet."}
                      </p>
                      {repository.lastSignalAt ? (
                        <p className="draft-preview-note">
                          Latest signal: {formatRecency(repository.lastSignalAt)} ·{" "}
                          {formatTimestamp(repository.lastSignalAt)}
                        </p>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="section-kicker">Publishing</p>
            <h2>X and LinkedIn drafts</h2>
          </div>
          <span>{preparedDraftsByChannel.length} channels tracked</span>
        </div>
        <div className="draft-list">
          {preparedStatusCards.map(({ status, count }) => (
            <div key={status} className="draft-chip">
              {status} · {count}
            </div>
          ))}
        </div>
        <div className="signal-grid">
          {preparedDraftsByChannel.map(({ channel, draft, count }) => (
            <article key={channel} className="signal-card">
              <div className="signal-meta">
                <span className="status-pill status-pill--neutral">{channelLabel(channel)}</span>
                <span className={`status-pill ${count > 0 ? "status-pill--positive" : "status-pill--muted"}`}>
                  {count > 0 ? "ready" : "waiting"}
                </span>
                <span className="status-pill status-pill--accent">{count} total</span>
              </div>
              <h3>{draft ? draft.title : `No ${channelLabel(channel)} draft yet`}</h3>
              <p>
                {draft
                  ? formatPreview(draft.body, 180)
                  : "This channel has no prepared draft yet."}
              </p>
              {draft ? (
                <div className="draft-preview">
                  <strong>{channelLabel(channel)} draft</strong>
                  <p>{formatDraft(draft)}</p>
                </div>
              ) : (
                <div className="draft-preview">
                  <strong>Channel status</strong>
                  <p>Awaiting the next meaningful signal for this output lane.</p>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="section-kicker">Review</p>
            <h2>Signals to review</h2>
          </div>
          <span>{signals.length} queued moments</span>
        </div>
        <div className="signal-grid">
          {orderedSignals.map((signal) => {
            const previewDraft = signal.drafts.find((draft) => draft.channel === "blog") ?? signal.drafts[0];

            return (
              <article
                key={`${signal.repository}-${signal.timestamp}-${signal.summary}`}
                className={`signal-card ${signal.publishable ? "signal-card--featured" : ""}`}
              >
                <div className="signal-meta">
                  <span className="status-pill status-pill--neutral">{signal.kind}</span>
                  <span
                    className={`status-pill ${
                      signal.priority === "high"
                        ? "status-pill--danger"
                        : signal.priority === "medium"
                          ? "status-pill--warning"
                          : "status-pill--muted"
                    }`}
                  >
                    {signal.priority}
                  </span>
                  <span className="status-pill status-pill--neutral">{signal.source ?? "manual"}</span>
                  <span
                    className={`status-pill ${
                      signal.publishable ? "status-pill--positive" : "status-pill--muted"
                    }`}
                  >
                    {signal.publishable ? "publishable" : "watch"}
                  </span>
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
                  <p>
                    {previewDraft
                      ? formatPreview(formatDraft(previewDraft), 260)
                      : "No draft available yet."}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="section-kicker">Stack</p>
            <h2>Tech stack visibility</h2>
          </div>
          <span>{techStack.length} building blocks</span>
        </div>
        <div className="signal-grid">
          <article className="signal-card signal-card--stack">
            <div className="signal-meta">
              <span className="status-pill status-pill--neutral">current stack</span>
              <span className="status-pill status-pill--accent">observed</span>
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
                The dashboard stays static on GitHub Pages while discovery, extraction, and
                generation happen in the worker pipeline.
              </p>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
