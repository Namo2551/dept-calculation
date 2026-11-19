// A label with its value underneath. `big` marks the headline number of a card.
export function Stat({ label, children, big = false }: { label: string; children: React.ReactNode; big?: boolean }) {
  return (
    <div className="my-2">
      <span className="block text-sm text-muted">{label}</span>
      <span className={`num block ${big ? "text-3xl sm:text-4xl font-bold tracking-tight leading-tight" : "text-lg font-semibold"}`}>{children}</span>
    </div>
  );
}

export function Note({ tone = "warn", strong = false, children }: { tone?: "warn" | "bad" | "good"; strong?: boolean; children: React.ReactNode }) {
  const color = tone === "bad" ? "text-bad" : tone === "good" ? "text-good" : "text-warn";
  return <div className={`pressed rounded-well px-4 py-3 mt-3 text-[0.93rem] ${color} ${strong ? "font-semibold ring-2 ring-bad" : ""}`}>{children}</div>;
}
