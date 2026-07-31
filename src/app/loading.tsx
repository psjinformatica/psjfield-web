export default function Loading() {
  return (
    <main className="page-shell" aria-label="Carregando">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-filter" />
      <div className="card-grid">
        {[1, 2, 3, 4].map((item) => <div className="skeleton skeleton-card" key={item} />)}
      </div>
    </main>
  );
}
