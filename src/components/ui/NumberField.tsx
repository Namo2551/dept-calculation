import { useId } from "react";

// Label above, pressed input, error below. Errors use an icon and a bold "Check:" prefix, not color alone.
export function NumberField({
  label,
  hint,
  value,
  onChange,
  error,
  errorPrefix,
  inputMode = "decimal",
  className = "",
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  errorPrefix: string;
  inputMode?: "decimal" | "numeric" | "text";
  className?: string;
}) {
  const id = useId();
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className="block font-medium mb-2">
        {label}
        {hint && <span className="block text-sm font-normal text-muted">{hint}</span>}
      </label>
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? id + "-err" : undefined}
        className={`pressed num w-full min-h-12 rounded-well px-4 text-lg font-medium text-text outline-none ${error ? "ring-2 ring-bad" : ""}`}
      />
      {error && (
        <p id={id + "-err"} className="mt-2 text-sm text-bad">
          <span aria-hidden="true">⚠ </span>
          <b>{errorPrefix}</b> {error}
        </p>
      )}
    </div>
  );
}
