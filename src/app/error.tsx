"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="page-shell centered-shell">
      <section className="error-card">
        <p className="eyebrow">Something went off pace</p>
        <h1>The dashboard could not be loaded.</h1>
        <p>Check the service configuration, then try again.</p>
        <button className="primary-button" onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}
