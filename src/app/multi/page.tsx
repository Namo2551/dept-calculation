import type { Metadata } from "next";
import { MultiCard } from "@/components/calculator/MultiCard";
import { PageIntro } from "@/components/PageIntro";
import { Ready } from "@/components/Ready";
import { copy } from "@/copy";

export const metadata: Metadata = { title: "Several cards" };

export default function MultiPage() {
  return (
    <>
      <PageIntro title="Several cards" intro={copy.multi.intro} />
      <Ready>
        <div className="mt-8">
          <MultiCard />
        </div>
      </Ready>
    </>
  );
}
