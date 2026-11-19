"use client";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCalculator } from "@/hooks/useCalculator";
import type { Lang } from "@/i18n/types";
import { BalanceChart } from "./BalanceChart";
import { CalcContext } from "./CalcContext";
import { CompareBars } from "./CompareBars";
import { ExtraPayment } from "./ExtraPayment";
import { Hero } from "./Hero";
import { MonthlyTable } from "./MonthlyTable";
import { MultiCard } from "./MultiCard";
import { RequiredPayment } from "./RequiredPayment";
import { ResultCards } from "./ResultCards";
import { SingleCardForm } from "./SingleCardForm";
import { YearlyChart } from "./YearlyChart";

export function Calculator({ lang }: { lang: Lang }) {
  const calc = useCalculator(lang);
  return (
    <CalcContext.Provider value={calc}>
      <main className="mx-auto max-w-[1040px] px-4 sm:px-6 pb-16">
        <Hero lang={lang} />
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
          </div>
        )}
      </main>
    </CalcContext.Provider>
  );
}
