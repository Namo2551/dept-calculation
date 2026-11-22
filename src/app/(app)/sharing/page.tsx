import type { Metadata } from "next";
import { AccountSection } from "@/components/app/AccountSection";
import { PageIntro } from "@/components/PageIntro";
import { CreateShareForm, ShareActions } from "@/components/sharing/ShareForms";
import { sharingCopy as S } from "@/copy/sharing";
import { requireUser } from "@/lib/auth";
import { shareStatus } from "@/lib/sharing";

export const metadata: Metadata = { title: "Sharing", robots: { index: false } };

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function SharingPage() {
  const { supabase } = await requireUser("/sharing");
  const [plans, shares] = await Promise.all([
    supabase.from("debt_plans").select("id,name").order("name"),
    supabase
      .from("shared_plans")
      .select("id,label,plan_id,include_debts,show_amounts,show_payments,show_goals,show_notes,expires_at,revoked_at,last_viewed_at,created_at")
      .order("created_at", { ascending: false }),
  ]);
  const planName = new Map((plans.data ?? []).map((p) => [p.id, p.name]));

  return (
    <>
      <PageIntro title={S.title} intro={S.intro} />
      <div className="mt-10 grid gap-12 max-w-[820px]">
        <AccountSection title={S.createTitle}>
          <CreateShareForm plans={plans.data ?? []} />
        </AccountSection>

        <AccountSection title={S.listTitle}>
          {(shares.data ?? []).length === 0 ? (
            <p className="text-muted">{S.none}</p>
          ) : (
            <ul className="grid gap-4">
              {(shares.data ?? []).map((s) => {
                const status = shareStatus(s);
                const what = [
                  s.plan_id ? S.what.plan(planName.get(s.plan_id) ?? "") : null,
                  s.include_debts ? S.what.debts : null,
                  s.show_amounts ? S.what.amounts : S.what.percentages,
                  s.show_payments ? S.what.payments : null,
                  s.show_goals ? S.what.goals : null,
                  s.show_notes ? S.what.notes : null,
                ].filter((x): x is string => Boolean(x));
                return (
                  <li key={s.id} className="inset-card p-5 grid gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <b>{s.label || S.viewTitle}</b>
                      <span className={`text-sm font-semibold ${status === "active" ? "text-good" : "text-muted"}`}>{S.status[status]}</span>
                    </div>
                    <p className="text-sm">{S.shares(what)}</p>
                    <p className="text-sm text-muted">
                      {S.createdOn(day(s.created_at))}, {s.last_viewed_at ? S.viewedOn(day(s.last_viewed_at)) : S.neverViewed}
                      {s.expires_at ? `, ${S.expiresOn(day(s.expires_at))}` : ""}
                    </p>
                    <ShareActions id={s.id} active={status === "active"} />
                  </li>
                );
              })}
            </ul>
          )}
        </AccountSection>
      </div>
    </>
  );
}
