"use client";
import { useCalc } from "@/components/calculator/CalcContext";
import { copy } from "@/copy";
import { useActiveSection } from "@/hooks/useActiveSection";
import { scrollToId } from "@/hooks/useCalculator";
import { formatBahtShort } from "@/lib/format";
import { ChapterTag } from "./ChapterTag";
import { sectionId } from "./ReportSection";

const ids = copy.sections.map((s) => sectionId(s.key));

// The input summary with an Edit button that jumps back to section 1.
function InputSummary() {
  const { t, single } = useCalc();
  const { v } = single;
  const edit = () => {
    scrollToId(sectionId("inputs"));
    document.querySelector<HTMLInputElement>("#tool input")?.focus({ preventScroll: true });
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <span className="num text-sm min-w-0">{t.summary.line(formatBahtShort(v.bal), String(v.apr), String(v.m), v.floor ? formatBahtShort(v.floor) : null, formatBahtShort(v.p))}</span>
      <button type="button" onClick={edit} className="shrink-0 h-11 px-4 border border-btn font-mono text-sm cursor-pointer hover:bg-surface">
        {t.summary.edit}
      </button>
    </div>
  );
}

// Section links keep the address hash free for share links: a click scrolls instead of navigating.
function go(e: React.MouseEvent, id: string) {
  e.preventDefault();
  scrollToId(id);
}

// The report's table of contents: a sticky column on wide screens, a sticky chip bar on narrow ones.
export function ReportMenu() {
  const active = useActiveSection(ids);
  const M = copy.menu;
  return (
    <div className="no-print">
      <nav aria-label={M.title} className="hidden lg:block sticky top-6">
        <p className="text-xs uppercase tracking-[0.08em] text-muted mb-3">{M.title}</p>
        <InputSummary />
        <ol className="mt-5 border-t border-hair pt-3 grid gap-0.5">
          {copy.sections.map((s, i) => {
            const id = sectionId(s.key);
            const on = active === id;
            return (
              <li key={s.key}>
                <a
                  href={`#${id}`}
                  onClick={(e) => go(e, id)}
                  aria-current={on ? "true" : undefined}
                  className={`flex items-center gap-2 min-h-11 pl-3 pr-2 border-l-2 text-sm ${on ? "border-ink bg-surface font-semibold" : "border-transparent hover:border-hair"}`}
                >
                  <span className="font-mono text-muted w-4">{i + 1}</span>
                  <span className="flex-1">{s.title}</span>
                  {s.chapters.map((c) => (
                    <ChapterTag key={c} ch={c} compact />
                  ))}
                </a>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 border-t border-hair pt-3 text-xs text-muted">{M.used}</p>
      </nav>

      <nav aria-label={M.narrow} className="lg:hidden sticky top-0 z-10 -mx-6 px-6 py-2 bg-bg border-b border-hair">
        <InputSummary />
        <ol className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {copy.sections.map((s, i) => {
            const id = sectionId(s.key);
            const on = active === id;
            return (
              <li key={s.key} className="shrink-0">
                <a
                  href={`#${id}`}
                  onClick={(e) => go(e, id)}
                  aria-current={on ? "true" : undefined}
                  className={`inline-flex items-center gap-2 min-h-11 px-3 border text-sm whitespace-nowrap ${on ? "bg-btn text-on-btn border-btn" : "border-hair"}`}
                >
                  {i + 1} {s.title}
                </a>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
