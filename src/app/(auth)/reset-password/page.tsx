import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/AuthForms";
import { PageIntro } from "@/components/PageIntro";
import { FormMessage } from "@/components/ui/TextField";
import { appCopy } from "@/copy/app";
import { getUserId } from "@/lib/auth";

export const metadata: Metadata = { title: "New password", robots: { index: false } };

// Reached from the reset email (the callback signed the user in) or from Account > Change password.
export default async function ResetPasswordPage() {
  const signedIn = (await getUserId()) !== null;
  return (
    <>
      <PageIntro title={appCopy.auth.resetTitle} intro={appCopy.auth.resetIntro} />
      <div className="mt-8 grid gap-5">
        {signedIn ? (
          <ResetPasswordForm />
        ) : (
          <>
            <FormMessage tone="bad">{appCopy.auth.linkExpired}</FormMessage>
            <Link href="/forgot-password" className="underline underline-offset-4 text-sm inline-flex min-h-11 items-center">
              {appCopy.auth.forgotButton}
            </Link>
          </>
        )}
      </div>
    </>
  );
}
