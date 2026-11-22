"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { appCopy } from "@/copy/app";
import { sharingCopy as S } from "@/copy/sharing";
import { requireConsent, requireUser } from "@/lib/auth";
import { newShareToken, tokenHashForDb } from "@/lib/sharing";
import { siteOrigin } from "@/lib/site-origin";
import { fieldErrors } from "@/lib/validation/auth";

export type ShareState = { errors?: Record<string, string>; message?: string; tone?: "good" | "bad"; link?: string };

const on = z.preprocess((v) => v === "on" || v === "true", z.boolean());
const createSchema = z
  .object({
    label: z.string().trim().max(80, "Use 80 characters or fewer").transform((v) => v || null),
    planId: z.union([z.literal(""), z.uuid()]).transform((v) => v || null),
    includeDebts: on,
    showAmounts: on,
    showPayments: on,
    showGoals: on,
    showNotes: on,
    expiresDays: z.enum(["", "7", "30", "90"]),
  })
  .refine((v) => v.planId !== null || v.includeDebts, { message: S.needSomething, path: ["form"] });

const get = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : "");

export async function createShare(_: ShareState | undefined, fd: FormData): Promise<ShareState> {
  const { supabase, consentMissing } = await requireConsent();
  if (consentMissing) return { message: appCopy.needConsent, tone: "bad" };
  const parsed = createSchema.safeParse({
    label: get(fd, "label"),
    planId: get(fd, "planId"),
    includeDebts: get(fd, "includeDebts"),
    showAmounts: get(fd, "showAmounts"),
    showPayments: get(fd, "showPayments"),
    showGoals: get(fd, "showGoals"),
    showNotes: get(fd, "showNotes"),
    expiresDays: get(fd, "expiresDays"),
  });
  if (!parsed.success) {
    const errors = fieldErrors(parsed);
    return errors.form ? { message: errors.form, tone: "bad", errors } : { errors };
  }
  const v = parsed.data;
  const token = newShareToken();
  const expires_at = v.expiresDays ? new Date(Date.now() + Number(v.expiresDays) * 86400000).toISOString() : null;
  // plan_id is checked by the composite foreign key (owner_id, plan_id): another user's plan id is rejected.
  const { error } = await supabase.from("shared_plans").insert({
    label: v.label,
    token_hash: tokenHashForDb(token),
    plan_id: v.planId,
    include_debts: v.includeDebts,
    show_amounts: v.showAmounts,
    show_payments: v.showPayments,
    show_goals: v.showGoals,
    show_notes: v.showNotes,
    expires_at,
  });
  if (error) return { message: appCopy.auth.genericError, tone: "bad" };
  revalidatePath("/sharing");
  return { message: S.created, tone: "good", link: `${await siteOrigin()}/s/${token}` };
}

const idSchema = z.uuid();

export async function revokeShare(fd: FormData): Promise<void> {
  const { supabase } = await requireUser("/sharing");
  const id = idSchema.safeParse(get(fd, "id"));
  if (!id.success) return;
  await supabase.from("shared_plans").update({ revoked_at: new Date().toISOString() }).eq("id", id.data).is("revoked_at", null);
  revalidatePath("/sharing");
}

export async function deleteShare(fd: FormData): Promise<void> {
  const { supabase } = await requireUser("/sharing");
  const id = idSchema.safeParse(get(fd, "id"));
  if (!id.success) return;
  await supabase.from("shared_plans").delete().eq("id", id.data);
  revalidatePath("/sharing");
}
