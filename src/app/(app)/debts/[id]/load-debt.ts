import "server-only";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { loadOverview } from "@/lib/data/load";
import { idSchema } from "@/lib/debts-validation";
import { historyRows } from "@/lib/debts-view";
import { todayISO } from "@/lib/ledger";

// The signed-in user's debt for /debts/[id] pages; 404 for a malformed id or a debt that isn't theirs (RLS
// returns no row).
export async function loadDebtPage(id: string, path: string) {
  const ctx = await requireProfile(path);
  if (!idSchema.safeParse(id).success) notFound();
  const today = todayISO();
  const o = await loadOverview(ctx.supabase, id, today);
  if (!o) notFound();
  return { ...ctx, o, today, history: historyRows(o.payments, o.ledger) };
}
