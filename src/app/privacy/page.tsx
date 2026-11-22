import type { Metadata } from "next";
import { PageIntro } from "@/components/PageIntro";
import { privacyCopy as P } from "@/copy/privacy";

export const metadata: Metadata = { title: "Privacy notice" };

export default function PrivacyPage() {
  return (
    <>
      <PageIntro title={P.title} intro={P.intro} />
      <p className="mt-4 text-sm text-muted">{P.updated}</p>
      <div className="mt-10 grid gap-10 max-w-[72ch]">
        {P.sections.map((s) => (
          <section key={s.title} className="border-t border-hair pt-6">
            <h2 className="font-display font-medium text-[24px] leading-tight mb-3">{s.title}</h2>
            <ul className="list-disc pl-5 grid gap-2">
              {s.body.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
