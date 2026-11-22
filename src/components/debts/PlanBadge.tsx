import { debtsCopy } from "@/copy/debts";
import type { Badge } from "@/lib/debts-view";

const tone: Record<Badge, string> = {
  ahead: "border-good text-good",
  on_track: "border-good text-good",
  behind: "border-bad text-bad",
  none: "border-hair text-muted",
};
const icon: Record<Badge, string> = { ahead: "▲", on_track: "●", behind: "▼", none: "○" };

// Plan status as text plus an icon, never color alone.
export function PlanBadge({ badge }: { badge: Badge }) {
  return (
    <span className={`inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-xs leading-none whitespace-nowrap ${tone[badge]}`}>
      <span aria-hidden="true">{icon[badge]}</span>
      {debtsCopy.badge[badge]}
    </span>
  );
}
