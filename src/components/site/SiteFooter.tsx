import Link from "next/link";
import { siGithub } from "simple-icons";
import { copy as t } from "@/copy";
import { Wordmark } from "./Wordmark";

const repo = "https://github.com/Namo2551/dept-calculation";

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const cls = "inline-flex items-center min-h-11 text-sm text-ink underline-offset-4 hover:underline";
  return href.startsWith("http") ? (
    <a href={href} className={cls}>
      {children}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="no-print">
      <div className="container-page band grid gap-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-[36ch]">
            <Wordmark />
            <p className="mt-3 text-sm text-muted">{t.footer.blurb}</p>
            <a href={repo} aria-label={t.footer.github} className="mt-4 inline-flex items-center justify-center size-11 border border-btn">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="var(--btn)">
                <path d={siGithub.path} />
              </svg>
            </a>
          </div>
          {t.footer.columns.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <h2 className="font-mono text-sm font-semibold text-muted">{c.title}</h2>
              <ul className="mt-2">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <FooterLink href={l.href}>{l.label}</FooterLink>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="grid gap-2 text-sm text-muted">
          <p className="max-w-[90ch]">{t.footer.limits}</p>
          <p>{t.footer.legal}</p>
        </div>
      </div>
    </footer>
  );
}
