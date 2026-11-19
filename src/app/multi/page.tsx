import type { Metadata } from "next";
import { MultiCard } from "@/components/calculator/MultiCard";
import { PageIntro } from "@/components/PageIntro";
import { Ready } from "@/components/Ready";

export const metadata: Metadata = { title: "Several cards" };

export default function MultiPage() {
  return (
    <>
      <PageIntro title="Several cards" intro="Split one monthly budget across up to five cards and compare payoff strategies." />
      <Ready>
        <div className="mt-8">
          <MultiCard />
        </div>
      </Ready>
    </>
  );
}
