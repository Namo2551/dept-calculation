import Link from "next/link";
import { ChapterTag } from "@/components/report/ChapterTag";
import { Button } from "@/components/ui/Button";
import { copy } from "@/copy";

// Home: what the site does, a way in, and where each CPE111 chapter is used.
export default function HomePage() {
  const H = copy.home;
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
