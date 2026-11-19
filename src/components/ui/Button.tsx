import type { ButtonHTMLAttributes } from "react";

type Variant = "raised" | "primary";

// Raised pill that presses in on click. "primary" is the single accent action; `selected` shows a pressed toggle.
export function Button({
  variant = "raised",
  selected = false,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; selected?: boolean }) {
  const base =
    "inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-full text-[0.93rem] font-medium cursor-pointer " +
    "transition-[box-shadow,transform,color] duration-200 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0";
  const look = selected
    ? "pressed-sm text-accent font-semibold"
    : variant === "primary"
      ? "bg-accent text-on-accent shadow-[5px_5px_11px_var(--shadow-dark),-5px_-5px_11px_var(--shadow-light)] active:shadow-[inset_3px_3px_6px_rgb(0_0_0/0.25)]"
      : "raised-sm hover:text-accent active:pressed-sm";
  return <button type="button" className={`${base} ${look} ${className}`} {...rest} />;
}
