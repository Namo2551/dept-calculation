import { copy, type ChapterKey } from "@/copy";

// The CPE111 chapter a feature uses: "Ch 8 · Recurrence relations", or just "8" in the menu.
export function ChapterTag({ ch, compact = false }: { ch: ChapterKey; compact?: boolean }) {
  const { label, name } = copy.chapters[ch];
  const full = `CPE111 ${label.replace("Ch", "Chapter")}, ${name}`;
  return (
    <span
      title={full}
      aria-label={full}
      className={`inline-flex items-center whitespace-nowrap border border-accent text-accent font-mono leading-none ${compact ? "text-[11px] px-1.5 py-1" : "text-xs px-2 py-1"}`}
    >
      {compact ? ch.replace("-", "·") : `${label} · ${name}`}
    </span>
  );
}
