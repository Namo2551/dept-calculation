"use client";
import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, signIn, signUp, updatePassword, type AuthState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";
import { FormMessage, TextField } from "@/components/ui/TextField";
import { appCopy } from "@/copy/app";

const A = appCopy.auth;

function Message({ state }: { state: AuthState | undefined }) {
  return state?.message ? <FormMessage tone={state.tone ?? "bad"}>{state.message}</FormMessage> : null;
}

export function SignInForm({ next, linkError }: { next?: string; linkError?: boolean }) {
  const [state, action, pending] = useActionState(signIn, undefined);
  return (
    <form action={action} className="grid gap-5" noValidate>
      {linkError && !state && <FormMessage tone="bad">{A.linkExpired}</FormMessage>}
      <Message state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <TextField label={A.email} name="email" type="email" autoComplete="email" required defaultValue={state?.values?.email} error={state?.errors?.email} />
      <TextField label={A.password} name="password" type="password" autoComplete="current-password" required error={state?.errors?.password} />
      <Button type="submit" variant="primary" disabled={pending}>
        {A.signInButton}
      </Button>
      <p className="text-sm">
        <Link href="/forgot-password" className="underline underline-offset-4 inline-flex min-h-11 items-center">
          {A.forgot}
        </Link>
      </p>
      <p className="text-sm text-muted">
        {A.noAccount}{" "}
        <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"} className="text-ink underline underline-offset-4">
          {appCopy.nav.signUp}
        </Link>
      </p>
    </form>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, undefined);
  if (state?.tone === "good") {
    return (
      <div className="grid gap-5">
        <FormMessage tone="good">{state.message}</FormMessage>
        <Link href="/login" className="underline underline-offset-4 text-sm inline-flex min-h-11 items-center">
          {A.backToSignIn}
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="grid gap-5" noValidate>
      <Message state={state} />
      <TextField label={A.displayName} name="displayName" autoComplete="name" maxLength={80} defaultValue={state?.values?.displayName} error={state?.errors?.displayName} />
      <TextField label={A.email} name="email" type="email" autoComplete="email" required defaultValue={state?.values?.email} error={state?.errors?.email} />
      <TextField label={A.password} name="password" type="password" autoComplete="new-password" hint={A.passwordHint} required error={state?.errors?.password} />
      <div>
        <label className="flex items-start gap-3 text-sm leading-relaxed min-h-11 cursor-pointer">
          <input type="checkbox" name="consent" className="mt-1 h-5 w-5 shrink-0 accent-[var(--btn)]" aria-invalid={state?.errors?.consent ? "true" : "false"} />
          <span>
            {A.consent}{" "}
            <Link href="/privacy" target="_blank" className="underline underline-offset-4">
              {A.privacyLink}
            </Link>
          </span>
        </label>
        {state?.errors?.consent && (
          <p className="mt-2 text-sm text-bad">
            <span aria-hidden="true">⚠ </span>
            <b>Check:</b> {state.errors.consent}
          </p>
        )}
      </div>
      <Button type="submit" variant="primary" disabled={pending}>
        {A.signUpButton}
      </Button>
      <p className="text-sm text-muted">
        {A.haveAccount}{" "}
        <Link href="/login" className="text-ink underline underline-offset-4">
          {appCopy.nav.signIn}
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  return (
    <form action={action} className="grid gap-5" noValidate>
      <Message state={state} />
      <TextField label={A.email} name="email" type="email" autoComplete="email" required defaultValue={state?.values?.email} error={state?.errors?.email} />
      <Button type="submit" variant="primary" disabled={pending}>
        {A.forgotButton}
      </Button>
      <Link href="/login" className="underline underline-offset-4 text-sm inline-flex min-h-11 items-center">
        {A.backToSignIn}
      </Link>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, undefined);
  if (state?.tone === "good") {
    return (
      <div className="grid gap-5">
        <FormMessage tone="good">{state.message}</FormMessage>
        <Button href="/dashboard" variant="primary">
          {appCopy.dashboard.title}
        </Button>
      </div>
    );
  }
  return (
    <form action={action} className="grid gap-5" noValidate>
      <Message state={state} />
      <TextField label={A.newPassword} name="password" type="password" autoComplete="new-password" hint={A.passwordHint} required error={state?.errors?.password} />
      <TextField label={A.confirmPassword} name="confirm" type="password" autoComplete="new-password" required error={state?.errors?.confirm} />
      <Button type="submit" variant="primary" disabled={pending}>
        {A.resetButton}
      </Button>
    </form>
  );
}
