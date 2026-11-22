import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/AuthForms";
import { PageIntro } from "@/components/PageIntro";
import { appCopy } from "@/copy/app";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default function SignUpPage() {
  return (
    <>
      <PageIntro title={appCopy.auth.signUpTitle} intro={appCopy.auth.signUpIntro} />
      <div className="mt-8">
        <SignUpForm />
      </div>
    </>
  );
}
