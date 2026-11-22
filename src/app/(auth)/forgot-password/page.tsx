import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/AuthForms";
import { PageIntro } from "@/components/PageIntro";
import { appCopy } from "@/copy/app";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <>
      <PageIntro title={appCopy.auth.forgotTitle} intro={appCopy.auth.forgotIntro} />
      <div className="mt-8">
        <ForgotPasswordForm />
      </div>
    </>
  );
}
