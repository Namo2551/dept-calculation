import { useId } from "react";

// A named input for forms posted to Server Actions (uncontrolled by default). Same look as NumberField:
// label above, bordered input, error below with an icon and a bold prefix, not color alone.
export function TextField({
  label,
  name,
  type = "text",
  hint,
  error,
  errorPrefix = "Check:",
  defaultValue,
  autoComplete,
  required,
  inputMode,
  maxLength,
  min,
  max,
  step,
  className = "",
}: {
  label: string;
  name: string;
  type?: "text" | "email" | "password" | "date" | "number";
  hint?: string;
  error?: string | null;
  errorPrefix?: string;
  defaultValue?: string | number;
  autoComplete?: string;
  required?: boolean;
  inputMode?: "text" | "decimal" | "numeric" | "email";
  maxLength?: number;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  className?: string;
}) {
  const id = useId();
  const hintId = hint ? id + "-hint" : undefined;
  const errId = error ? id + "-err" : undefined;
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className="block text-sm font-medium mb-2">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="-mt-1 mb-2 text-sm text-muted">
          {hint}
        </p>
      )}
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        required={required}
        inputMode={inputMode}
        maxLength={maxLength}
        min={min}
        max={max}
        step={step}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={[hintId, errId].filter(Boolean).join(" ") || undefined}
        className={`w-full h-12 bg-bg border px-3 text-base font-medium text-ink ${error ? "border-2 border-bad" : "border-field"}`}
      />
      {error && (
        <p id={errId} className="mt-2 text-sm text-bad">
          <span aria-hidden="true">⚠ </span>
          <b>{errorPrefix}</b> {error}
        </p>
      )}
    </div>
  );
}

// A form-level message (success or error) announced to screen readers.
export function FormMessage({ tone, children }: { tone: "good" | "bad"; children: React.ReactNode }) {
  return (
    <p role={tone === "bad" ? "alert" : "status"} className={`border px-4 py-3 text-[15px] ${tone === "bad" ? "border-2 border-bad text-bad" : "border-hair text-good"}`}>
      {children}
    </p>
  );
}
