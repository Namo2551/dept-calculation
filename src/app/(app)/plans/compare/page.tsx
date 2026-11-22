import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/PageIntro";
import { LineChart } from "@/components/charts/LineChart";
import { ComparePicker } from "@/components/plans/ComparePicker";
import { FormMessage } from "@/components/ui/TextField";
import { plansCopy } from "@/copy/plans";
import { requireUser } from "@/lib/auth";
import { monthsToText } from "@/lib/format";
import { formatMoney, monthYear } from "@/lib/money";
import { balanceCurve, comparePlans, monthsLabel, summarizePlan } from "@/lib/plans-summary";
import { isPlanId } from "@/lib/plans-validation";
import type { DebtPlanRow } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Compare plans", robots: { index: false } };

const C = plansCopy.compare;
const F = plansCopy.fields;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ a?: string | string[]; b?: string | string[] }> }) {
  const sp = await searchParams;
  const a = one(sp.a);
  const b = one(sp.b);
  const { supabase } = await requireUser(`/plans/compare${a && b ? `?a=${a}&b=${b}` : ""}`);
  const { data } = await supabase.from("debt_plans").select("*").order("updated_at", { ascending: false });
  const plans = data ?? [];
  const pa = isPlanId(a) ? plans.find((p) => p.id === a) : undefined;
  const pb = isPlanId(b) ? plans.find((p) => p.id === b) : undefined;

  const problem = !a || !b ? C.pick : !pa || !pb ? C.missing : pa.id === pb.id ? C.same : null;

  return (
    <>
      <p className="pt-8">
        <Link href="/plans" className="inline-flex items-center min-h-11 underline underline-offset-4">
          {C.back}
        </Link>
      </p>
      <PageIntro title={C.title} intro={C.intro} />
      <div className="mt-10 grid gap-10">
        {problem || !pa || !pb ? (
          <>
            {problem && <FormMessage tone={problem === C.pick ? "good" : "bad"}>{problem}</FormMessage>}
            <ComparePicker plans={plans.map((p) => ({ id: p.id, name: p.name }))} a={pa?.id} b={pb?.id} />
          </>
        ) : (
          <Comparison a={pa} b={pb} plans={plans} />
        )}
      </div>
    </>
  );
}

function Comparison({ a, b, plans }: { a: DebtPlanRow; b: DebtPlanRow; plans: DebtPlanRow[] }) {
  const sa = summarizePlan(a);
  const sb = summarizePlan(b);
  const cmp = comparePlans(sa, sb);
  const m = (p: DebtPlanRow, v: number) => formatMoney(v, p.currency);
  const name = (k: "a" | "b") => (k === "a" ? a.name : b.name);
  const interest = (s: typeof sa, p: DebtPlanRow) => (s.B.totalInterest === null ? plansCopy.months.never : m(p, s.B.totalInterest));
  const payoff = (s: typeof sa) => (s.payoffB ? monthYear(s.payoffB) : monthsLabel(s.B));

  const rows: [string, string, string][] = [
    [F.balance, m(a, a.balance), m(b, b.balance)],
    [F.apr, `${a.apr}%`, `${b.apr}%`],
    [F.fixed_payment, m(a, a.fixed_payment), m(b, b.fixed_payment)],
    [C.months, monthsLabel(sa.B), monthsLabel(sb.B)],
    [C.interest, interest(sa, a), interest(sb, b)],
    [C.payoff, payoff(sa), payoff(sb)],
  ];

  const diff: string[] =
    cmp.cheaper === null
      ? [C.cannotCompare]
      : [
          cmp.cheaper === "same" ? C.sameCost : C.cheaper(name(cmp.cheaper), formatMoney(cmp.interestDiff, a.currency)),
          cmp.faster === "same" || cmp.faster === null ? C.sameTime : C.faster(name(cmp.faster), monthsToText(cmp.monthsDiff)),
        ];

  const curveA = balanceCurve(a.balance, sa.B);
  const curveB = balanceCurve(b.balance, sb.B);
  const len = Math.max(curveA.length, curveB.length) - 1;

  return (
    <>
      <div className="overflow-x-auto border-y border-hair">
        <table className="w-full text-[15px]">
          <caption className="sr-only">{C.title}</caption>
          <thead>
            <tr className="text-left text-sm text-muted">
              <th scope="col" className="py-3 pr-4 font-medium">{C.row}</th>
              <th scope="col" className="py-3 pr-4 font-semibold text-ink">{a.name}</th>
              <th scope="col" className="py-3 font-semibold text-ink">{b.name}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([k, va, vb]) => (
              <tr key={k} className="border-t border-hair">
                <th scope="row" className="py-3 pr-4 text-left font-medium">{k}</th>
                <td className="py-3 pr-4 num whitespace-nowrap">{va}</td>
                <td className="py-3 num whitespace-nowrap">{vb}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-ink" data-testid="compare-diff">
              <th scope="row" className="py-3 pr-4 text-left font-semibold">{C.difference}</th>
              <td colSpan={2} className="py-3 font-semibold">
                {diff.map((d) => (
                  <span key={d} className="block">{d}</span>
                ))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <section aria-labelledby="compare-chart-h">
        <h2 id="compare-chart-h" className="font-display font-medium text-[26px] mb-5">
          {C.chartTitle}
        </h2>
        <LineChart
          len={len}
          ymax={Math.max(a.balance, b.balance, ...curveA, ...curveB)}
          aria={C.chartAria(a.name, b.name)}
          series={[
            { data: curveA, color: "var(--series-a)", label: a.name, at: curveA.length * 0.25, dy: -10 },
            { data: curveB, color: "var(--series-b)", dash: "9 6", label: b.name, at: curveB.length * 0.55, dy: 22 },
          ]}
        />
      </section>

      <section aria-labelledby="compare-again-h">
        <h2 id="compare-again-h" className="font-display font-medium text-[26px] mb-5">
          {plansCopy.list.compareTitle}
        </h2>
        <ComparePicker plans={plans.map((p) => ({ id: p.id, name: p.name }))} a={a.id} b={b.id} />
      </section>
    </>
  );
}
