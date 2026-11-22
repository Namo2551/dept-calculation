"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { appCopy } from "@/copy/app";
import { requireUser } from "@/lib/auth";
import { fieldErrors, profileSchema } from "@/lib/validation/auth";

export type AccountState = { errors?: Record<string, string>; message?: string; tone?: "good" | "bad" };

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};

export async function updateProfile(_: AccountState | undefined, fd: FormData): Promise<AccountState> {
  const { supabase, userId } = await requireUser("/account");
  const parsed = profileSchema.safeParse({ displayName: str(fd, "displayName"), currency: str(fd, "currency") || "THB" });
  if (!parsed.success) return { errors: fieldErrors(parsed) };
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data.displayName || null, currency: parsed.data.currency })
    .eq("id", userId);
  if (error) return { message: appCopy.auth.genericError, tone: "bad" };
  revalidatePath("/", "layout");
  return { message: appCopy.account.saved, tone: "good" };
}

// Records PDPA consent for accounts that don't have it yet (e.g. created before the consent checkbox).
export async function giveConsent(): Promise<void> {
  const { supabase, userId } = await requireUser("/account");
  await supabase.from("profiles").update({ privacy_consent_at: new Date().toISOString() }).eq("id", userId).is("privacy_consent_at", null);
  revalidatePath("/", "layout");
}

// Deletes the signed-in user's own account and, through cascading foreign keys, all of their data.
export async function deleteAccount(_: AccountState | undefined, fd: FormData): Promise<AccountState> {
  const { supabase } = await requireUser("/account");
  if (str(fd, "confirm") !== "DELETE") return { errors: { confirm: appCopy.account.deleteMismatch } };
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { message: appCopy.auth.genericError, tone: "bad" };
  await supabase.auth.signOut();
  redirect("/?deleted=1");
}
