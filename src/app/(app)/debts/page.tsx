import type { Metadata } from "next";
import { AccountSection } from "@/components/app/AccountSection";
import { DebtCard } from "@/components/debts/DebtCard";
import { DebtForm } from "@/components/debts/DebtForm";
import { newDebtDefaults } from "@/lib/debts-form";
import { PageIntro } from "@/components/PageIntro";
import { debtsCopy } from "@/copy/debts";
import { requireProfile } from "@/lib/auth";
import { loadOverviews } from "@/lib/data/load";
import { sortDebts } from "@/lib/debts-view";
import { todayISO } from "@/lib/ledger";
import { formatMoney } from "@/lib/money";
import { totalsOf } from "@/lib/overview";

export const metadata: Metadata = { title: "Debts", robots: { index: false } };

const L = debtsCopy.list;

export default async function DebtsPage() {
  const { supabase, profile } = await requireProfile("/debts");
  const today = todayISO();
  const items = sortDebts(await loadOverviews(supabase, today));
  const totals = totalsOf(items);
  const current = items.filter((i) => i.debt.status !== "archived");
  const archived = items.filter((i) => i.debt.status === "archived");
  const activeCount = items.filter((i) => i.debt.status === "active").length;
  return (
    <>
      <PageIntro title={L.title} intro={L.intro} />

      <section aria-label={L.totalOutstanding} className="mt-8 inset-card p-5 sm:p-7">
        <p className="text-sm text-muted">{L.totalOutstanding}</p>
        <p className="num font-display text-[40px] leading-tight" data-testid="debts-total">
          {formatMoney(totals.outstanding, profile.currency)}
        </p>
        <p className="text-sm text-muted">{L.activeCount(activeCount)}</p>
      </section>

      <div className="mt-10 grid gap-12">
        {items.length === 0 ? (
          <p className="text-muted">{L.empty}</p>
        ) : (
          <ul className="grid gap-5 lg:grid-cols-2" role="list">
            {current.map((o) => (
              <li key={o.debt.id} className="min-w-0">
                <DebtCard o={o} />
              </li>
            ))}
          </ul>
        )}

        {archived.length > 0 && (
          <AccountSection title={L.archivedTitle} id="archived">
            <ul className="grid gap-5 lg:grid-cols-2" role="list">
              {archived.map((o) => (
                <li key={o.debt.id} className="min-w-0">
                  <DebtCard o={o} />
                </li>
              ))}
            </ul>
          </AccountSection>
        )}

        <AccountSection title={L.addTitle} id="add">
          <p className="mb-5 text-muted max-w-[60ch]">{L.addIntro}</p>
          <div className="max-w-[760px]">
            <DebtForm mode="add" initial={newDebtDefaults(today)} />
          </div>
        </AccountSection>
      </div>
    </>
  );
}
