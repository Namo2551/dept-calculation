import type { Metadata } from "next";
import { MathExplainer } from "@/components/math/MathExplainer";
import { PageIntro } from "@/components/PageIntro";
import { Ready } from "@/components/Ready";

export const metadata: Metadata = { title: "Why it happens" };

export default function WhyPage() {
  return (
    <>
      <PageIntro title="Why it happens" intro="The recurrence relation and the induction proofs behind every number on this site." />
      <Ready>
        <div className="mt-8">
          <MathExplainer />
        </div>
      </Ready>
    </>
  );
}
