"use client";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCalculator } from "@/hooks/useCalculator";
import { BalanceChart } from "./BalanceChart";
import { MathExplainer } from "@/components/math/MathExplainer";
import { CalcContext } from "./CalcContext";
import { CompareBars } from "./CompareBars";
import { ExtraPayment } from "./ExtraPayment";
import { Footer } from "./Footer";
import { Hero } from "./Hero";
import { MonthlyTable } from "./MonthlyTable";
import { MultiCard } from "./MultiCard";
import { RequiredPayment } from "./RequiredPayment";
import { ResultCards } from "./ResultCards";
import { SingleCardForm } from "./SingleCardForm";
import { YearlyChart } from "./YearlyChart";

export function Calculator() {
  const calc = useCalculator();
  return (
    <CalcContext.Provider value={calc}>
      <main className="mx-auto max-w-[1040px] px-4 sm:px-6 pb-16">
        <Hero />
        {!calc.ready ? (
          <div className="mt-8">
            <Skeleton label={calc.t.loading} />
          </div>
        ) : (
          <div className="mt-8 grid gap-8">
            <SingleCardForm />
            <section id="results-sec" className="grid gap-8">
              <ResultCards />
              <CompareBars />
            </section>
            <BalanceChart />
            <YearlyChart />
            <div className="grid gap-8 md:grid-cols-2">
              <RequiredPayment />
              <ExtraPayment />
            </div>
            <MonthlyTable />
            <MultiCard />
            <MathExplainer />
          </div>
        )}
        <Footer />
      </main>
    </CalcContext.Provider>
  );
}
