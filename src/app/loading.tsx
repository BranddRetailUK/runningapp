export default function Loading() {
  return (
    <main className="page-shell">
      <div className="loading-card" aria-label="Loading dashboard">
        <span className="loading-pulse" />
        <span className="loading-pulse short" />
      </div>
    </main>
  );
}
