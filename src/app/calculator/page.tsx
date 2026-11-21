import type { Metadata } from "next";
import { BalanceChart } from "@/components/calculator/BalanceChart";
import { CompareBars } from "@/components/calculator/CompareBars";
import { ExtraPayment } from "@/components/calculator/ExtraPayment";
import { MonthlyTable } from "@/components/calculator/MonthlyTable";
import { RequiredPayment } from "@/components/calculator/RequiredPayment";
import { ResultCards } from "@/components/calculator/ResultCards";
import { ShowTarget } from "@/components/calculator/ShowTarget";
import { SingleCardForm } from "@/components/calculator/SingleCardForm";
import { SummaryBar } from "@/components/calculator/SummaryBar";
import { YearlyChart } from "@/components/calculator/YearlyChart";
import { FullMath } from "@/components/math/FullMath";
import { ChartWhy, PlanWhy, ResultsWhy } from "@/components/math/pieces";
import { PageIntro } from "@/components/PageIntro";
import { Ready } from "@/components/Ready";
import { Why } from "@/components/ui/Why";
import { copy } from "@/copy";

export const metadata: Metadata = { title: "Calculator" };

// One page for one card: inputs stay in a sticky column on wide screens, every result scrolls beside them,
// and the math opens only on request.
export default function CalculatorPage() {
  const W = copy.why;
  return (
    <>
      <PageIntro title={copy.calcPage.title} intro={copy.calcPage.intro} />
      <Ready>
        <SummaryBar />
        <div className="calc-grid mt-8 grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-10 lg:items-start">
          <aside className="calc-aside min-w-0 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto">
            <SingleCardForm />
          </aside>
          <div className="grid gap-8 min-w-0">
            <section id="results-sec" className="grid gap-8">
              <ResultCards />
              <CompareBars />
              <Why id="why-results" topic={W.results}><ResultsWhy /></Why>
            </section>
            <BalanceChart />
            <Why id="why-chart" topic={W.chart}><ChartWhy /></Why>
            <YearlyChart />
            <div className="grid gap-8 xl:grid-cols-2">
              <RequiredPayment />
              <ExtraPayment />
            </div>
            <Why id="why-plan" topic={W.plan}><PlanWhy /></Why>
            <MonthlyTable />
            <FullMath />
          </div>
        </div>
        <ShowTarget />
      </Ready>
    </>
  );
}
