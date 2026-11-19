import type { Metadata } from "next";
import { BalanceChart } from "@/components/calculator/BalanceChart";
import { MonthlyTable } from "@/components/calculator/MonthlyTable";
import { YearlyChart } from "@/components/calculator/YearlyChart";
import { PageIntro } from "@/components/PageIntro";
import { Ready } from "@/components/Ready";

export const metadata: Metadata = { title: "Charts" };

export default function ChartsPage() {
  return (
    <>
      <PageIntro title="Charts" intro="See how the balance falls month by month, and what each year of payments is made of." />
      <Ready>
        <div className="mt-8 grid gap-8">
          <BalanceChart />
          <YearlyChart />
          <MonthlyTable />
        </div>
      </Ready>
    </>
  );
}
