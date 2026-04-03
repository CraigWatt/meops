const signals = [
  {
    title: "Architecture shift detected",
    summary: "A service boundary changed in a way that is worth narrating."
  },
  {
    title: "Meaningful bug fix",
    summary: "A hard issue was resolved and the lesson can be reused."
  },
  {
    title: "Publishable moment",
    summary: "This looks like a strong candidate for X, LinkedIn, or a blog update."
  }
];

export default function Home() {
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

      <section className="panel">
        <div className="panel-header">
          <h2>Signals to review</h2>
          <span>early dashboard shell</span>
        </div>
        <div className="signal-grid">
          {signals.map((signal) => (
            <article key={signal.title} className="signal-card">
              <h3>{signal.title}</h3>
              <p>{signal.summary}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

