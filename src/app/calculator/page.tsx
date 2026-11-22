import type { Metadata } from "next";
import { Suspense } from "react";
import { BalanceChart } from "@/components/calculator/BalanceChart";
import { BonusPayment } from "@/components/calculator/BonusPayment";
import { CompareBars } from "@/components/calculator/CompareBars";
import { ExtraPayment } from "@/components/calculator/ExtraPayment";
import { InterestLimit } from "@/components/calculator/InterestLimit";
import { MonthlyTable } from "@/components/calculator/MonthlyTable";
import { RequiredPayment } from "@/components/calculator/RequiredPayment";
import { ResultCards } from "@/components/calculator/ResultCards";
import { ShowTarget } from "@/components/calculator/ShowTarget";
import { SingleCardForm } from "@/components/calculator/SingleCardForm";
import { YearlyChart } from "@/components/calculator/YearlyChart";
import { FullMath } from "@/components/math/FullMath";
import { ChartWhy, PlanWhy, ResultsWhy } from "@/components/math/pieces";
import { PageIntro } from "@/components/PageIntro";
import { Ready } from "@/components/Ready";
import { ReportMenu } from "@/components/report/ReportMenu";
import { ReportSection } from "@/components/report/ReportSection";
import { copy } from "@/copy";

export const metadata: Metadata = { title: "Calculator" };

// The calculator as a numbered report: a sticky chapter menu beside seven sections, each tagged with the
// CPE111 chapter it uses. The math behind a section opens from the "Why?" button in its header.
export default function CalculatorPage() {
  const W = copy.why;
  return (
    <>
      <PageIntro title={copy.calcPage.title} intro={copy.calcPage.intro} />
      <Ready>
        <div className="report-grid mt-10 grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12 lg:items-start">
          <aside className="report-aside min-w-0 sticky top-0 z-10 lg:top-6">
            <ReportMenu />
          </aside>
          <div className="report-main min-w-0">
            <ReportSection k="inputs">
              <SingleCardForm />
            </ReportSection>
            <ReportSection k="results" why={<ResultsWhy />} whyTopic={W.results}>
              <div className="grid gap-6">
                <ResultCards />
                <CompareBars />
              </div>
            </ReportSection>
            <ReportSection k="chart" why={<ChartWhy />} whyTopic={W.chart}>
              <BalanceChart />
            </ReportSection>
            <ReportSection k="yearly" print={false}>
              <YearlyChart />
            </ReportSection>
            <ReportSection k="plan" print={false} why={<PlanWhy />} whyTopic={W.plan}>
              <div className="grid gap-6">
                <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
                  <RequiredPayment />
                  <InterestLimit />
                </div>
                <ExtraPayment />
                <BonusPayment />
              </div>
            </ReportSection>
            <ReportSection k="table" print={false}>
              <MonthlyTable />
            </ReportSection>
            <ReportSection k="math">
              <FullMath />
            </ReportSection>
          </div>
        </div>
        <Suspense fallback={null}>
          <ShowTarget />
        </Suspense>
      </Ready>
    </>
  );
}
