import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/AuthForms";
import { PageIntro } from "@/components/PageIntro";
import { appCopy } from "@/copy/app";
import { safeNext } from "@/lib/supabase/routes";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <>
      <PageIntro title={appCopy.auth.signInTitle} intro={appCopy.auth.signInIntro} />
      <div className="mt-8">
        <SignInForm next={next ? safeNext(next) : undefined} linkError={error === "link"} />
      </div>
    </>
  );
}
