// Placeholder with the shape of the calculator, shown until saved or shared numbers are loaded in the browser.
export function Skeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="grid gap-7">
      <div className="inset-card p-7 grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-bg border border-hair" />
        ))}
      </div>
      <div className="grid gap-7 md:grid-cols-2">
        <div className="inset-card h-64" />
        <div className="inset-card h-64" />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
