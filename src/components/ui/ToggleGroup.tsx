import { Button } from "./Button";

// A set of mutually exclusive options (range, speed, method). Announced as radio buttons.
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
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-3">
      {options.map((o) => (
        <Button key={o.value} role="radio" aria-checked={o.value === value} selected={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </Button>
      ))}
    </div>
  );
}
