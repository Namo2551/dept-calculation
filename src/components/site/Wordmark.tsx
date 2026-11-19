import Link from "next/link";
import { copy as t } from "@/copy";

// 22px dark-brown square with a 6px rust base strip, then "Paydown". Links home.
export function Wordmark({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/"
      aria-label={t.nav.home}
      onClick={onClick}
      className="inline-flex items-center gap-2.5 min-h-11 font-display font-semibold text-[21px] leading-none tracking-[-0.01em] text-ink"
    >
      <span aria-hidden="true" className="relative block size-[22px] shrink-0 bg-btn">
        <span className="absolute inset-x-0 bottom-0 h-1.5 bg-accent" />
      </span>
      Paydown
    </Link>
  );
}
