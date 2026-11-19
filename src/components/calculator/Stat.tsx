import { keepFigures } from "@/lib/format";

// A label with its value underneath. `big` marks the headline number of a card.
export function Stat({ label, children, big = false }: { label: string; children: React.ReactNode; big?: boolean }) {
  return (
    <div className="my-2">
      <span className="block text-xs text-muted">{label}</span>
      <span className={`num block ${big ? "sm:whitespace-nowrap " : "whitespace-nowrap "}${big ? "font-display text-[32px] font-medium tracking-[-0.015em] leading-[1.1] mt-1" : "text-base font-medium"}`}>{typeof children === "string" ? keepFigures(children) : children}</span>
    </div>
  );
}

export function Note({ tone = "warn", strong = false, children }: { tone?: "warn" | "bad" | "good"; strong?: boolean; children: React.ReactNode }) {
  // Warnings use the accent colour.
  const color = tone === "bad" ? "text-bad" : tone === "good" ? "text-good" : "text-accent";
  return <div className={`bg-bg border px-4 py-3 mt-3 text-[15px] ${color} ${strong ? "font-semibold border-2 border-bad" : "border-hair"}`}>{children}</div>;
}
