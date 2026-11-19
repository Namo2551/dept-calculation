import Link from "next/link";
import type { ButtonHTMLAttributes, MouseEventHandler } from "react";

type Variant = "primary" | "secondary" | "quiet";
type Size = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 font-mono font-medium text-center leading-tight cursor-pointer border transition-colors duration-150 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";
const sizes: Record<Size, string> = {
  md: "min-h-12 px-[22px] py-2 text-[15px]",
  sm: "h-11 px-4 text-sm",
};
const looks: Record<Variant, string> = {
  primary: "bg-btn text-on-btn border-btn hover:bg-ink hover:border-ink",
  secondary: "bg-transparent text-ink border-btn hover:bg-surface",
  quiet: "bg-transparent text-ink border-transparent underline underline-offset-4 hover:decoration-2",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; href?: string };

// Square button: primary is filled dark brown, secondary is outlined, quiet is an underlined text action.
// Height 48px (`md`) or 44px (`sm`, compact). Renders a next/link when `href` is set.
export function Button({ variant = "secondary", size = "md", className = "", href, ...rest }: Props) {
  const cls = `${base} ${sizes[size]} ${looks[variant]} ${className}`;
  if (href !== undefined) {
    return (
      <Link href={href} className={cls} onClick={rest.onClick as unknown as MouseEventHandler<HTMLAnchorElement> | undefined}>
        {rest.children}
      </Link>
    );
  }
  return <button type="button" className={cls} {...rest} />;
}
