"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";
import { appCopy } from "@/copy/app";

const N = appCopy.nav;

// The signed-in app's section bar, under the site header. Scrolls sideways on narrow screens.
export function AppNav({ name }: { name: string }) {
  const pathname = usePathname();
  const link = (href: string, label: string) => {
    const current = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        key={href}
        href={href}
        aria-current={current ? "page" : undefined}
        className={`inline-flex items-center min-h-11 px-3 font-mono text-sm whitespace-nowrap border-b-2 ${current ? "border-ink font-semibold" : "border-transparent hover:border-hair"}`}
      >
        {label}
      </Link>
    );
  };
  return (
    <div className="no-print border-y border-hair">
      <div className="flex items-center justify-between gap-4">
        <nav aria-label={N.label} className="flex overflow-x-auto -mx-3">
          {N.links.map((l) => link(l.href, l.label))}
        </nav>
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {link("/account", name ? `${N.account} · ${name}` : N.account)}
          <form action={signOut}>
            <button type="submit" className="inline-flex items-center min-h-11 px-3 font-mono text-sm underline-offset-4 hover:underline cursor-pointer">
              {N.signOut}
            </button>
          </form>
        </div>
      </div>
      <div className="md:hidden flex items-center justify-between border-t border-hair">
        {link("/account", N.account)}
        <form action={signOut}>
          <button type="submit" className="inline-flex items-center min-h-11 px-3 font-mono text-sm underline-offset-4 hover:underline cursor-pointer">
            {N.signOut}
          </button>
        </form>
      </div>
    </div>
  );
}
