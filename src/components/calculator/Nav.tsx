"use client";
import { encodeState } from "@/lib/debt";
import { useCalc } from "./CalcContext";

// Sticky section links on one line (scrolls sideways on small screens), plus the language switch,
// which carries the last valid numbers to the other language in the URL hash (before loading, the other page
// simply reads the same saved numbers from localStorage).
export function Nav() {
  const { t, lang, ready, validState } = useCalc();
  const other = lang === "th" ? "/en" : "/";
  const links: [string, string][] = [
    ["#tool", t.nav.tool],
    ["#results-sec", t.nav.results],
    ["#chart-sec", t.nav.chart],
    ["#multi", t.nav.multi],
    ["#why", t.nav.why],
  ];
  return (
    <nav aria-label={t.nav.label} className="sticky top-0 z-10 bg-bg/90 backdrop-blur-sm no-print">
      <div className="mx-auto max-w-[1040px] px-4 sm:px-6 py-3">
        <div className="raised-sm rounded-full flex items-center gap-1 px-2 py-1.5 overflow-x-auto whitespace-nowrap">
          {links.map(([href, label]) => (
            <a key={href} href={href} className="inline-flex items-center min-h-11 px-4 rounded-full text-[0.93rem] font-medium hover:text-accent active:pressed-sm transition-colors">
              {label}
            </a>
          ))}
          <a
            href={ready ? other + "#" + encodeState(validState) : other}
            hrefLang={t.nav.otherLangCode}
            lang={t.nav.otherLangCode}
            className="ml-auto inline-flex items-center min-h-11 px-4 rounded-full text-[0.93rem] font-semibold text-accent pressed-sm"
          >
            {t.nav.otherLang}
          </a>
        </div>
      </div>
    </nav>
  );
}
