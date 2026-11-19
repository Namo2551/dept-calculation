import { copy as t } from "@/copy";
import { simulate, type SimResult } from "@/lib/debt";
import { monthsToText } from "@/lib/format";
import { defaultState, parseNumber } from "@/lib/state";

// Static: rendered at build time, so the page has real content before any script runs.
// "5% minimum vs fixed 1,500: 34 years vs 2 years", simulated from the defaults (never hard-coded).
export function heroLine(): string {
  const d = defaultState().single;
  const balance = parseNumber(d.bal);
  const apr = parseNumber(d.apr);
  const A = simulate({ balance, apr, strategy: "pct", m: parseNumber(d.m) / 100, floor: parseNumber(d.floor) });
  const B = simulate({ balance, apr, strategy: "fixed", p: parseNumber(d.p) });
  const years = (s: SimResult) =>
    s.months === null ? t.hero.over100 : s.months >= 12 ? t.unit.years(Math.floor(s.months / 12)) : monthsToText(s.months);
  return t.hero.line(d.m, d.p, years(A), years(B));
}

export function Hero() {
  return (
    <header className="pt-10 pb-4 sm:pt-16">
      <h1 className="text-3xl sm:text-5xl font-bold tracking-tight max-w-[22ch] leading-[1.3]">{t.hero.title}</h1>
      <p className="mt-5 text-xl sm:text-2xl font-semibold text-accent">{heroLine()}</p>
      <p className="mt-4 max-w-[65ch] text-muted">{t.hero.banner}</p>
      <p className="print-only">{t.hero.printOnly}</p>
      <div className="mt-7 flex flex-wrap gap-4 no-print">
        <a href="#tool" className="inline-flex items-center min-h-11 px-6 rounded-full bg-accent text-on-accent font-semibold shadow-[5px_5px_11px_var(--shadow-dark),-5px_-5px_11px_var(--shadow-light)] active:translate-y-px transition-transform">
          {t.hero.toTool}
        </a>
        <a href="#why" data-open-why className="inline-flex items-center min-h-11 px-6 rounded-full raised-sm font-medium hover:text-accent transition-colors">
          {t.hero.toWhy}
        </a>
      </div>
    </header>
  );
}
