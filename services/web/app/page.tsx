import { getDashboardSignals, getRepositoryCatalog } from "@meops/store";
import { channelLabel, formatDraft } from "@meops/content";

function formatTimestamp(timestamp?: string): string {
  if (!timestamp) {
    return "—";
  }

  const value = new Date(timestamp);
  if (Number.isNaN(value.getTime())) {
    return "—";
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
    return "never";
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

function formatSnapshotState(latestSyncTime?: string, repositoryCount?: number): string {
  if (!repositoryCount) {
    return "no synced snapshot yet";
  }

  if (!latestSyncTime) {
    return "snapshot not yet refreshed";
  }

  return `synced ${formatRecency(latestSyncTime)} · ${formatTimestamp(latestSyncTime)}`;
}

function formatPreview(text: string, length: number): string {
  return text.length > length ? `${text.slice(0, length)}...` : text;
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

  const activeRepositories = orderedRepositories.filter((r) => r.watched);
  const publishableSignals = orderedSignals.filter((s) => s.publishable);

  const draftCounts = signals.reduce<Record<string, number>>((acc, signal) => {
    for (const draft of signal.drafts) {
      acc[draft.channel] = (acc[draft.channel] ?? 0) + 1;
    }
    return acc;
  }, {});

  const channels: Array<{ key: "x" | "linkedin" | "blog" | "update-log"; icon: string }> = [
    { key: "x", icon: "𝕏" },
    { key: "linkedin", icon: "in" },
    { key: "blog", icon: "✎" },
    { key: "update-log", icon: "◉" }
  ];

  const latestSyncTime = orderedRepositories[0]?.lastSyncedAt;
  const hasSyncedData = repositories.some((repo) => repo.lastSyncedAt || repo.source === "github_discovery");
  const snapshotState = formatSnapshotState(latestSyncTime, repositories.length);

  return (
    <main className="page">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">meops</div>
          <h1>Turn work into signal</h1>
          <p className="tagline">
            Static snapshot of repository activity, refreshed by GitHub Actions when
            the worker runs. It prepares publishable drafts for X and LinkedIn
            without pretending to be a live control panel.
          </p>
        </div>
        <div className="status-badge">
          <span className={`status-dot ${hasSyncedData ? "" : "status-dot--inactive"}`} />
          <span>{hasSyncedData ? "Static snapshot" : "Waiting for sync"}</span>
        </div>
      </header>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-label">Sources</span>
          <span className="stat-value">{activeRepositories.length}</span>
          <span className="stat-detail">repositories watched</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Signals</span>
          <span className="stat-value">{signals.length}</span>
          <span className="stat-detail">{publishableSignals.length} ready to review</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Drafts</span>
          <span className="stat-value">{Object.values(draftCounts).reduce((a, b) => a + b, 0)}</span>
          <span className="stat-detail">across {channels.length} channels</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Snapshot</span>
          <span className="stat-value">{formatRecency(latestSyncTime)}</span>
          <span className="stat-detail">{snapshotState}</span>
        </div>
      </div>

      {/* Publishing channels */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Publishing Channels</h2>
          <span className="section-meta">{channels.length} channels configured</span>
        </div>
        <div className="cards-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          {channels.map(({ key, icon }) => {
            const count = draftCounts[key] ?? 0;
            return (
              <div key={key} className="card channel-card">
                <div className="channel-icon">{icon}</div>
                <span className="channel-count">{count}</span>
                <span className="channel-label">{channelLabel(key)} drafts</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Signals to review */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Signals to Review</h2>
          <span className="section-meta">{signals.length} queued in the current snapshot</span>
        </div>
        {orderedSignals.length > 0 ? (
          <div className="signal-list">
            {orderedSignals.slice(0, 8).map((signal) => (
              <article
                key={`${signal.repository}-${signal.timestamp}-${signal.summary}`}
                className={`signal-item ${signal.publishable ? "signal-item--featured" : ""}`}
              >
                <div className="signal-content">
                  <h3 className="signal-title">{signal.description}</h3>
                  <p className="signal-meta">
                    {signal.repository} · {signal.kind} · {formatRecency(signal.timestamp)}
                  </p>
                </div>
                <div className="tags">
                  <span
                    className={`tag ${
                      signal.priority === "high"
                        ? "tag--danger"
                        : signal.priority === "medium"
                          ? "tag--warning"
                          : ""
                    }`}
                  >
                    {signal.priority}
                  </span>
                  {signal.publishable && <span className="tag tag--success">ready</span>}
                </div>
                <div className="signal-channels">
                  {signal.drafts.slice(0, 3).map((draft) => (
                    <span key={draft.channel} className="tag tag--accent">
                      {channelLabel(draft.channel)}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p className="empty-state-title">No synced signals yet</p>
            <p>Waiting for the next GitHub Actions refresh to build a real snapshot.</p>
          </div>
        )}
      </section>

      {/* Repositories */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Watched Repositories</h2>
          <span className="section-meta">{activeRepositories.length} active in snapshot</span>
        </div>
        {activeRepositories.length > 0 ? (
          <div className="cards-grid">
            {activeRepositories.slice(0, 6).map((repo) => (
              <article key={repo.fullName} className="card">
                <div className="card-header">
                  <h3 className="card-title">{repo.fullName}</h3>
                  <div className="tags">
                    <span className="tag tag--success">watching</span>
                  </div>
                </div>
                <p className="card-description">
                  {repo.description
                    ? formatPreview(repo.description, 100)
                    : "No description available."}
                </p>
                <div className="tags">
                  {repo.language && <span className="tag">{repo.language}</span>}
                  {repo.topics?.slice(0, 2).map((topic) => (
                    <span key={topic} className="tag">
                      {topic}
                    </span>
                  ))}
                </div>
                <div className="repo-meta">
                  <span className="repo-meta-item">
                    <span
                      className="repo-meta-dot"
                      style={{ background: repo.lastSyncedAt ? "#4ade80" : "#71717a" }}
                    />
                    {formatRecency(repo.lastSyncedAt)}
                  </span>
                  <span className="repo-meta-item">{repo.signalCount} signals</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p className="empty-state-title">No repositories in snapshot</p>
            <p>The dashboard will populate after the next discovery refresh.</p>
          </div>
        )}
      </section>

      {/* Draft previews */}
      {publishableSignals.length > 0 && (
        <section className="section">
        <div className="section-header">
          <h2 className="section-title">Latest Drafts</h2>
          <span className="section-meta">{publishableSignals.length} publishable in snapshot</span>
        </div>
          <div className="cards-grid cards-grid--two">
            {publishableSignals.slice(0, 2).map((signal) => {
              const xDraft = signal.drafts.find((d) => d.channel === "x");
              const linkedinDraft = signal.drafts.find((d) => d.channel === "linkedin");

              return (
                <article key={`draft-${signal.description}`} className="card card--featured">
                  <div className="card-header">
                    <h3 className="card-title">{signal.description}</h3>
                    <div className="tags">
                      <span className="tag tag--accent">{signal.kind}</span>
                    </div>
                  </div>

                  {xDraft && (
                    <div className="draft-preview">
                      <span className="draft-preview-label">X Draft</span>
                      <p className="draft-preview-text">
                        {formatPreview(formatDraft(xDraft), 180)}
                      </p>
                    </div>
                  )}

                  {linkedinDraft && (
                    <div className="draft-preview">
                      <span className="draft-preview-label">LinkedIn Draft</span>
                      <p className="draft-preview-text">
                        {formatPreview(formatDraft(linkedinDraft), 200)}
                      </p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Stack */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Stack</h2>
        </div>
        <div className="stack-grid">
          {[
            "GitHub Discovery",
            "TypeScript",
            "Next.js",
            "File Store",
            "Static Export",
            "GitHub Pages"
        ].map((item) => (
            <span key={item} className="stack-item">
              {item}
            </span>
          ))}
        </div>
        <p className="stack-note">
          This dashboard is a static Pages build. Freshness depends on the latest
          GitHub Actions refresh, not a live browser session.
        </p>
      </section>
    </main>
  );
}
