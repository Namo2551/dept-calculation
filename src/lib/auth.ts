import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/supabase/database.types";

// The server-side gate for every private page and action. getClaims() verifies the session JWT; the client it
// returns acts as that user, and RLS limits every query to their own rows.
export async function requireUser(nextPath?: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) {
    redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  }
  return { supabase, userId: claims.sub as string, email: (claims.email as string | undefined) ?? "" };
}

// requireUser plus the user's profile (name, currency, privacy consent).
export async function requireProfile(nextPath?: string) {
  const ctx = await requireUser(nextPath);
  const { data } = await ctx.supabase.from("profiles").select("*").eq("id", ctx.userId).maybeSingle();
  const profile: ProfileRow = data ?? {
    id: ctx.userId,
    display_name: null,
    currency: "THB",
    privacy_consent_at: null,
    created_at: "",
    updated_at: "",
  };
  return { ...ctx, profile };
}

// For Server Actions that write data: signed in AND agreed to the privacy notice (PDPA consent).
// Returns an error message for the form instead of throwing.
export async function requireConsent() {
  const ctx = await requireProfile();
  return { ...ctx, consentMissing: !ctx.profile.privacy_consent_at };
}

// For pages that work for everyone but show more when signed in.
export async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
}
