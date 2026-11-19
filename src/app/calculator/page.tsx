import type { Metadata } from "next";
import { CompareBars } from "@/components/calculator/CompareBars";
import { ExtraPayment } from "@/components/calculator/ExtraPayment";
import { RequiredPayment } from "@/components/calculator/RequiredPayment";
import { ResultCards } from "@/components/calculator/ResultCards";
import { SingleCardForm } from "@/components/calculator/SingleCardForm";
import { PageIntro } from "@/components/PageIntro";
import { Ready } from "@/components/Ready";

export const metadata: Metadata = { title: "Calculator" };

export default function CalculatorPage() {
  return (
    <>
      <PageIntro title="Calculator" intro="Enter one card and compare paying the minimum with paying a fixed amount." />
      <Ready>
        <div className="mt-8 grid gap-8">
          <SingleCardForm />
          <section id="results-sec" className="grid gap-8">
            <ResultCards />
            <CompareBars />
          </section>
          <div className="grid gap-8 md:grid-cols-2">
            <RequiredPayment />
            <ExtraPayment />
          </div>
        </div>
      </Ready>
    </>
  );
}
