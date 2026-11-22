"use client";
import { useState } from "react";

const danger =
  "inline-flex items-center justify-center min-h-11 px-4 font-mono font-medium text-sm border-2 border-bad text-bad bg-transparent hover:bg-surface cursor-pointer disabled:opacity-50";
const plain = "inline-flex items-center justify-center min-h-11 px-4 font-mono text-sm border border-btn bg-transparent hover:bg-surface cursor-pointer";

// A delete button that needs a second click: the first shows the warning, a confirm submit and a cancel.
// Place it inside the <form> it submits; it adds a hidden confirm=yes once armed.
export function ConfirmSubmit({
  label,
  confirmLabel,
  cancelLabel,
  warning,
  pending,
}: {
  label: string;
  confirmLabel: string;
  cancelLabel: string;
  warning?: string;
  pending?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <button type="button" className={danger} onClick={() => setArmed(true)}>
        {label}
      </button>
    );
  }
  return (
    <div className="grid gap-3" role="group" aria-label={label}>
      {warning && (
        <p role="alert" className="text-bad text-sm">
          {warning}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <input type="hidden" name="confirm" value="yes" />
        <button type="submit" className={danger} disabled={pending} autoFocus>
          {confirmLabel}
        </button>
        <button type="button" className={plain} onClick={() => setArmed(false)}>
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}
