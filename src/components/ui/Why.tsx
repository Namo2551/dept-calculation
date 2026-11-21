"use client";
import { useState } from "react";
import { copy } from "@/copy";
import { Button } from "./Button";

// A "Why?" button that opens the math behind one section, right under it. Closed on every visit.
export function Why({ id, topic, children }: { id: string; topic: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="why min-w-0">
      <Button
        size="sm"
        aria-expanded={open}
        aria-controls={id}
        aria-label={open ? `${copy.why.hide}: ${topic}` : `${copy.why.show} ${topic}`}
        onClick={() => setOpen((o) => !o)}
        className="no-print"
      >
        {open ? copy.why.hide : copy.why.show}
      </Button>
      <div id={id} hidden={!open} className="mt-4">
        {open && children}
      </div>
    </div>
  );
}
