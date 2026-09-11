export default function PageLoader({ label = "Loading workspace..." }: { label?: string }) {
  return (
    <div className="page-loader" role="status" aria-live="polite" aria-busy="true">
      <div className="page-loader-panel">
        <div className="page-loader-grid" aria-hidden>
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="page-loader-cell" style={{ animationDelay: `${i * 90}ms` }} />
          ))}
        </div>
        <p className="page-loader-label">{label}</p>
      </div>
    </div>
  );
}
