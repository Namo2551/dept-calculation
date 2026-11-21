"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { copy, type SectionKey } from "@/copy";
import { ChapterTag } from "./ChapterTag";

export const sectionId = (k: SectionKey) => `sec-${k}`;

// One numbered section of the calculator report: number, title, chapter tags and an optional
// "Why?" button in the header; the math it opens appears under the section's content.
// print={false}: the content is screen-only, so the whole section is left out of print (unless its math is open).
export function ReportSection({ k, why, whyTopic = "", print = true, children }: { k: SectionKey; why?: React.ReactNode; whyTopic?: string; print?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const index = copy.sections.findIndex((s) => s.key === k);
  const { title, chapters } = copy.sections[index];
  const id = sectionId(k);
  return (
    <section id={id} aria-labelledby={`${id}-h`} className={`${!print && !open ? "no-print " : ""}report-section scroll-mt-40 lg:scroll-mt-8 min-w-0 [&+&]:border-t [&+&]:border-hair [&+&]:mt-12 [&+&]:pt-12`}>
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6">
        <span aria-hidden="true" className="font-mono text-sm text-muted w-6">{index + 1}</span>
        <h2 id={`${id}-h`} className="font-display font-medium text-[28px] sm:text-[32px] leading-tight tracking-[-0.015em]">
          {title}
        </h2>
        <span className="flex flex-wrap gap-2">
          {chapters.map((c) => (
            <ChapterTag key={c} ch={c} />
          ))}
        </span>
        {why !== undefined && (
          <Button
            size="sm"
            className="ml-auto no-print"
            aria-expanded={open}
            aria-controls={`${id}-why`}
            aria-label={open ? `${copy.why.hide}: ${whyTopic}` : `${copy.why.show} ${whyTopic}`}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? copy.why.hide : copy.why.show}
          </Button>
        )}
      </header>
      {children}
      {why !== undefined && (
        <div id={`${id}-why`} hidden={!open} className="mt-6">
          {open && why}
        </div>
      )}
    </section>
  );
}
