"use client";
import { LineChart } from "@/components/charts/LineChart";
import { Button } from "@/components/ui/Button";
import { CountUp } from "@/components/ui/CountUp";
import { NumberField } from "@/components/ui/NumberField";
import { Panel, PanelTitle } from "@/components/ui/Panel";
import { STRATEGIES } from "@/lib/calc";
import type { MultiStrategy } from "@/lib/debt";
import { formatBaht, monthsToText } from "@/lib/format";
import type { CardRaw } from "@/lib/state";
import { useCalc } from "./CalcContext";
import { Note, Stat } from "./Stat";

// Each strategy keeps its own line style, so the chart never relies on color alone.
const LOOK: Record<MultiStrategy, { color: string; dash?: string }> = {
  minonly: { color: "var(--muted)", dash: "2 5" },
  avalanche: { color: "var(--series-a)" },
  snowball: { color: "var(--series-b)", dash: "9 6" },
};

function LineSample({ s }: { s: MultiStrategy }) {
  return (
    <svg width="34" height="10" aria-hidden="true" className="shrink-0">
      <line x1="0" x2="34" y1="5" y2="5" stroke={LOOK[s].color} strokeWidth="3" strokeDasharray={LOOK[s].dash} strokeLinecap="round" />
    </svg>
  );
}

export function MultiCard() {
  const { t, state, errors, multi, setCard, setBudget, addCard, removeCard } = useCalc();
  const cards = state.multi.cards;
  const { results, best, minSum, cards: parsed } = multi;
  const baht = (v: number) => t.unit.baht(formatBaht(v));
  const B0 = parsed.reduce((s, c) => s + c.balance, 0);

  const len = Math.min(480, Math.max(...STRATEGIES.map((s) => results[s].months || results[s].totals.length)));
  const series = STRATEGIES.map((s, i) => {
    const r = results[s];
    const data = [B0, ...r.totals.slice(0, len).map((x) => x.balance)];
    while (data.length <= len && r.months !== null) data.push(0);
    const end = r.months || len;
    return { data, ...LOOK[s], label: t.multi.labels[s], at: [len * 0.45, end * 0.25, end * 0.6][i], dy: [-10, 22, -12][i] };
  });

  const field = (i: number, f: keyof CardRaw, label: string, mode: "decimal" | "text" = "decimal") => (
    <NumberField
      label={label}
      inputMode={mode}
      value={cards[i][f]}
      onChange={(v) => setCard(i, f, v)}
      error={f !== "name" && errors[`card.${i}.${f}`] ? t.errors[f === "balance" ? "balance" : f] : null}
      errorPrefix={t.errors.prefix}
    />
  );

  return (
    <Panel id="multi" className="no-print">
      <PanelTitle>{t.multi.heading}</PanelTitle>
      <p className="text-muted -mt-2 mb-5">{t.multi.hint}</p>
      <div className="grid gap-5">
        {cards.map((_, i) => (
          <div key={i} className="bg-bg border border-hair p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <b>{t.multi.cardN(i + 1)}</b>
              <Button disabled={cards.length <= 2} onClick={() => removeCard(i)}>
                {t.multi.remove}
              </Button>
            </div>
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-[1.4fr_1fr_0.8fr_0.8fr_0.9fr]">
              <div className="col-span-2 lg:col-span-1">{field(i, "name", t.multi.name, "text")}</div>
              {field(i, "balance", t.multi.balance)}
              {field(i, "apr", t.multi.apr)}
              {field(i, "m", t.multi.m)}
              {field(i, "floor", t.multi.floor)}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-end gap-6">
        <Button disabled={cards.length >= 5} onClick={addCard}>
          {t.multi.add}
        </Button>
        <div className="w-full max-w-[340px]">
          <NumberField label={t.multi.budget} value={state.multi.budget} onChange={setBudget} error={errors.budget ? t.errors.budget : null} errorPrefix={t.errors.prefix} />
        </div>
      </div>
      {results.avalanche.budgetTooLow && (
        <Note tone="bad" strong>
          {t.multi.budgetLow(formatBaht(minSum))}
        </Note>
      )}

      <div id="multiRes" className="mt-7 grid gap-6 md:grid-cols-3">
        {STRATEGIES.map((s) => {
          const r = results[s];
          const order = parsed
            .map((c, i) => ({ name: c.name!, mo: r.paidOffMonth[i] }))
            .sort((a, b) => (a.mo === null ? 1e9 : a.mo) - (b.mo === null ? 1e9 : b.mo));
          return (
            <section key={s} data-testid={`strat-${s}`} className={`p-5 bg-bg border ${best === s ? "border-2 border-good" : "border-hair"}`}>
              <h3 className="flex items-center gap-2 font-semibold leading-snug">
                <LineSample s={s} />
                {t.multi.titles[s]}
              </h3>
              {best === s && <p className="mt-2 text-sm font-semibold text-good">{t.multi.best}</p>}
              <Stat label={t.multi.allPaidIn} big>
                {r.months === null ? t.multi.over100 : <CountUp value={r.months} format={(v) => monthsToText(Math.round(v))} />}
              </Stat>
              <Stat label={t.results.totalInterest}>{r.totalInterest === null ? t.unit.none : <CountUp value={r.totalInterest} format={baht} />}</Stat>
              {s === "minonly" && <p className="text-sm text-muted">{t.multi.noBudget(formatBaht(minSum))}</p>}
              <p className="mt-3 text-sm text-muted">{t.multi.order}</p>
              <ol className="list-decimal pl-5 text-[0.93rem]">
                {order.map((x, i) => (
                  <li key={i}>{t.multi.paidMonth(x.name, x.mo)}</li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[0.93rem] mt-7 mb-2">
        {STRATEGIES.map((s) => (
          <span key={s} className="inline-flex items-center gap-2">
            <LineSample s={s} />
            {t.multi.legend[s]}
          </span>
        ))}
      </div>
      <div className="bg-bg border border-hair p-3 sm:p-4">
        <LineChart len={len} ymax={Math.max(...series.map((s) => Math.max(...s.data)))} series={series} aria={t.multi.aria} />
      </div>
      <ul className="mt-5 grid gap-2 text-sm text-muted list-disc pl-5 max-w-[75ch]">
        {t.multi.notes.map(([b, rest], i) => (
          <li key={i}>
            {b && <b className="text-ink">{b}</b>}
            {rest}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
