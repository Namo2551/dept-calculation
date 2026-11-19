// A segmented control of mutually exclusive options (range, speed, method). Announced as radio buttons.
export function ToggleGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-grid grid-flow-col auto-cols-fr max-w-full border border-btn">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`min-h-11 min-w-0 px-4 py-2 text-sm leading-tight text-center cursor-pointer transition-colors duration-150 ${
              on ? "bg-btn text-on-btn font-medium" : "bg-transparent text-ink hover:bg-surface"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
