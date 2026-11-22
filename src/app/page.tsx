import Link from "next/link";
import { ChapterTag } from "@/components/report/ChapterTag";
import { Button } from "@/components/ui/Button";
import { copy } from "@/copy";
import { appCopy } from "@/copy/app";

// Home: what the site does, a way in, and where each CPE111 chapter is used.
export default function HomePage() {
  const H = copy.home;
  const L = appCopy.landing;
  return (
    <div className="pt-12 min-[900px]:pt-20">
      <h1 className="font-display font-medium text-[50px] leading-[1.04] min-[900px]:text-[67px] min-[900px]:leading-[1.02] tracking-[-0.025em] text-balance max-w-[16ch]">
        {H.title}
      </h1>
      <p className="mt-6 max-w-[60ch] text-muted">{H.lede}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button href="/calculator" variant="primary">{H.cta}</Button>
        <Button href="/multi">{H.multi}</Button>
      </div>

      <section aria-labelledby="app-h" className="mt-16 min-[900px]:mt-24">
        <h2 id="app-h" className="font-display font-medium text-[28px] sm:text-[32px] leading-tight tracking-[-0.015em]">{L.title}</h2>
        <p className="mt-3 max-w-[60ch] text-muted">{L.intro}</p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {L.features.map((f) => (
            <li key={f.title} className="inset-card p-5 sm:p-6">
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-[15px] text-muted">{f.text}</p>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button href="/signup" variant="primary">{appCopy.nav.signUp}</Button>
          <Button href="/login">{appCopy.nav.signIn}</Button>
        </div>
        <p className="mt-4 text-sm text-muted max-w-[60ch]">
          {L.privacy}{" "}
          <Link href="/privacy" className="underline underline-offset-4">{appCopy.auth.privacyLink}</Link>
        </p>
      </section>

      <section aria-labelledby="chapters-h" className="mt-16 min-[900px]:mt-24">
        <h2 id="chapters-h" className="font-display font-medium text-[28px] sm:text-[32px] leading-tight tracking-[-0.015em] mb-6">{H.tableTitle}</h2>
        <div className="inset-card min-w-0">
          <table aria-label={H.tableTitle} className="block sm:table w-full text-sm">
            <thead className="hidden sm:table-header-group">
              <tr className="text-left text-muted">
                {H.cols.map((c) => (
                  <th key={c} className="px-4 sm:px-6 py-3 font-medium">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody className="block sm:table-row-group">
              {H.rows.map((r) => (
                <tr key={r.ch} className="block sm:table-row border-t border-hair align-top py-3 sm:py-0">
                  <td className="block sm:table-cell px-4 sm:px-6 py-1 sm:py-4"><ChapterTag ch={r.ch} /></td>
                  <td className="block sm:table-cell px-4 sm:px-6 py-1 sm:py-4">{r.what}</td>
                  <td className="block sm:table-cell px-4 sm:px-6 py-0 sm:py-4 sm:whitespace-nowrap">
                    <Link href={r.href} className="inline-flex items-center min-h-11 underline underline-offset-4 hover:decoration-2">
                      {r.where}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
