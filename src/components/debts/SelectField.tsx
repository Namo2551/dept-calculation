import { useId } from "react";

// A labelled <select> with the same look and error style as TextField.
export function SelectField({
  label,
  name,
  options,
  defaultValue,
  error,
  hint,
  className = "",
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  error?: string | null;
  hint?: string;
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
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={[hintId, errId].filter(Boolean).join(" ") || undefined}
        className={`w-full h-12 bg-bg border px-3 text-base ${error ? "border-2 border-bad" : "border-field"}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errId} className="mt-2 text-sm text-bad">
          <span aria-hidden="true">⚠ </span>
          <b>Check:</b> {error}
        </p>
      )}
    </div>
  );
}
