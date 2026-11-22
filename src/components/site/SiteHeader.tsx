"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { copy as t } from "@/copy";
import { appCopy } from "@/copy/app";
import { useSignedIn } from "@/hooks/useSignedIn";
import { Wordmark } from "./Wordmark";

const MENU_ID = "site-menu";

// The four page links; the current page gets a 1px underline and aria-current="page".
function NavLinks({ pathname, onClick, className = "" }: { pathname: string; onClick?: () => void; className?: string }) {
  return t.nav.links.map((l) => {
    const current = pathname === l.href;
    return (
      <Link
        key={l.href}
        href={l.href}
        onClick={onClick}
        aria-current={current ? "page" : undefined}
        className={`inline-flex items-center min-h-11 font-mono font-medium text-sm leading-none text-ink border-b ${
          current ? "border-ink" : "border-transparent hover:border-ink"
        } ${className}`}
      >
        {l.label}
      </Link>
    );
  });
}

// 76px header: wordmark, four page links and the compact primary button. Below 900px the links and
// button move into a full-width panel opened by a 44px menu button.
export function SiteHeader() {
  const pathname = usePathname();
  const onCalculator = pathname === "/calculator";
  const signedIn = useSignedIn(); // null until known; only used to choose which buttons to show
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  const close = () => {
    setOpen(false);
    menuButton.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      menuButton.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="no-print relative bg-bg">
      <div className="container-page h-[76px] flex items-center justify-between gap-6">
        <Wordmark onClick={open ? close : undefined} />
        <nav aria-label={t.nav.label} className="hidden min-[900px]:flex items-center gap-9">
          <NavLinks pathname={pathname} />
        </nav>
        {/* signed in: Dashboard; signed out: Sign in + "Open the calculator" (not on the calculator itself) */}
        <div className="hidden min-[900px]:flex items-center justify-end gap-5 min-w-[180px]">
          {signedIn ? (
            <Button href="/dashboard" variant="primary" size="sm">
              {appCopy.dashboard.title}
            </Button>
          ) : (
            <>
              {signedIn === false && (
                <Link href="/login" className="inline-flex items-center min-h-11 font-mono font-medium text-sm text-ink underline-offset-4 hover:underline">
                  {appCopy.nav.signIn}
                </Link>
              )}
              {!onCalculator && (
                <Button href="/calculator" variant="primary" size="sm">
                  {t.nav.cta}
                </Button>
              )}
            </>
          )}
        </div>
        <button
          ref={menuButton}
          type="button"
          aria-label={t.nav.menu}
          aria-expanded={open}
          aria-controls={MENU_ID}
          onClick={() => setOpen((o) => !o)}
          className="min-[900px]:hidden inline-flex items-center justify-center h-11 w-11 border border-btn cursor-pointer"
        >
          <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden="true">
            {open ? (
              <path d="M2 1l14 12M16 1L2 13" stroke="var(--btn)" strokeWidth="2" />
            ) : (
              <path d="M0 1h18M0 7h18M0 13h18" stroke="var(--btn)" strokeWidth="2" />
            )}
          </svg>
        </button>
      </div>
      {open && (
        <nav id={MENU_ID} aria-label={t.nav.menu} className="min-[900px]:hidden absolute inset-x-0 top-full z-20 bg-bg border-y border-hair">
          <div className="container-page flex flex-col py-4">
            <NavLinks pathname={pathname} onClick={close} className="w-full text-base" />
            {signedIn ? (
              <Button href="/dashboard" variant="primary" size="sm" className="mt-4 w-full" onClick={close}>
                {appCopy.dashboard.title}
              </Button>
            ) : (
              <>
                {signedIn === false && (
                  <Button href="/login" size="sm" className="mt-4 w-full" onClick={close}>
                    {appCopy.nav.signIn}
                  </Button>
                )}
                {!onCalculator && (
                  <Button href="/calculator" variant="primary" size="sm" className="mt-4 w-full" onClick={close}>
                    {t.nav.cta}
                  </Button>
                )}
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
