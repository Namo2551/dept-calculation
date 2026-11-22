"use server";
import { redirect } from "next/navigation";
import { appCopy } from "@/copy/app";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/supabase/routes";
import { siteOrigin } from "@/lib/site-origin";
import { fieldErrors, isExistingAccount, newPasswordSchema, resetRequestSchema, signInSchema, signUpSchema } from "@/lib/validation/auth";

export type AuthState = {
  errors?: Record<string, string>;
  message?: string;
  tone?: "good" | "bad";
  values?: { email?: string; displayName?: string };
  emailTaken?: boolean;
};

const A = appCopy.auth;
const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : undefined;
};

function authErrorMessage(status?: number): string {
  if (status === 429) return A.tooMany;
  return A.genericError;
}

export async function signUp(_: AuthState | undefined, fd: FormData): Promise<AuthState> {
  const input = { email: str(fd, "email") ?? "", password: str(fd, "password") ?? "", displayName: str(fd, "displayName"), consent: str(fd, "consent") };
  const values = { email: input.email, displayName: input.displayName };
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return { errors: fieldErrors(parsed), values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${await siteOrigin()}/auth/callback?next=/dashboard`,
      data: { display_name: parsed.data.displayName ?? "", privacy_consent: "true" },
    },
  });
  if (error) return { message: authErrorMessage(error.status), tone: "bad", values };
  // The owner chose to tell people when an email is already registered (it makes "does X have an account?"
  // answerable, a trade-off accepted for a clearer sign-up).
  if (isExistingAccount(data.user)) return { errors: { email: A.emailTaken }, values, emailTaken: true };
  if (data.session) redirect("/dashboard"); // email confirmation switched off in Supabase
  return { message: A.checkEmail, tone: "good" };
}

export async function signIn(_: AuthState | undefined, fd: FormData): Promise<AuthState> {
  const input = { email: str(fd, "email") ?? "", password: str(fd, "password") ?? "" };
  const values = { email: input.email };
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return { errors: fieldErrors(parsed), values };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { message: error.status === 429 ? A.tooMany : A.badLogin, tone: "bad", values };
  redirect(safeNext(str(fd, "next")));
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(_: AuthState | undefined, fd: FormData): Promise<AuthState> {
  const input = { email: str(fd, "email") ?? "" };
  const parsed = resetRequestSchema.safeParse(input);
  if (!parsed.success) return { errors: fieldErrors(parsed), values: input };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await siteOrigin()}/auth/callback?next=/reset-password`,
  });
  if (error?.status === 429) return { message: A.tooMany, tone: "bad", values: input };
  // Same answer for known and unknown emails.
  return { message: A.forgotSent, tone: "good" };
}

export async function updatePassword(_: AuthState | undefined, fd: FormData): Promise<AuthState> {
  const parsed = newPasswordSchema.safeParse({ password: str(fd, "password") ?? "", confirm: str(fd, "confirm") ?? "" });
  if (!parsed.success) return { errors: fieldErrors(parsed) };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return { message: A.linkExpired, tone: "bad" };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { message: authErrorMessage(error.status), tone: "bad" };
  return { message: A.resetDone, tone: "good" };
}
