import type { Metadata } from "next";
import { giveConsent } from "@/app/(app)/account/actions";
import { AccountSection } from "@/components/app/AccountSection";
import { DeleteAccountForm, ProfileForm } from "@/components/app/AccountForms";
import { PageIntro } from "@/components/PageIntro";
import { Button } from "@/components/ui/Button";
import { appCopy } from "@/copy/app";
import { requireProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

const C = appCopy.account;

export default async function AccountPage() {
  const { profile, email } = await requireProfile("/account");
  const consentDate = profile.privacy_consent_at ? new Date(profile.privacy_consent_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null;
  return (
    <>
      <PageIntro title={C.title} intro={C.intro} />
      <div className="mt-10 grid gap-12 max-w-[720px]">
        <AccountSection title={C.profileTitle}>
          <p className="mb-5 text-sm">
            <span className="text-muted">{C.email}: </span>
            <b>{email}</b>
          </p>
          <ProfileForm displayName={profile.display_name ?? ""} currency={profile.currency} />
        </AccountSection>

        <AccountSection title={C.passwordTitle}>
          <Button href="/reset-password">{C.changePassword}</Button>
        </AccountSection>

        <AccountSection title={appCopy.privacy.title} id="privacy">
          {consentDate ? (
            <p>{C.consentOn(consentDate)}</p>
          ) : (
            <form action={giveConsent} className="grid gap-4">
              <p className="text-bad">{C.consentMissing}</p>
              <div>
                <Button type="submit" variant="primary">
                  {C.consentButton}
                </Button>
              </div>
            </form>
          )}
          <p className="mt-3">
            <a href="/privacy" className="underline underline-offset-4 inline-flex min-h-11 items-center">
              {appCopy.auth.privacyLink}
            </a>
          </p>
        </AccountSection>

        <AccountSection title={C.dataTitle}>
          <p className="mb-4">{C.dataIntro}</p>
          <a href="/account/export" download className="inline-flex items-center justify-center min-h-12 px-[22px] font-mono font-medium text-[15px] border border-btn hover:bg-surface">
            {C.export}
          </a>
        </AccountSection>

        <AccountSection title={C.deleteTitle}>
          <p className="mb-5 text-bad">{C.deleteIntro}</p>
          <DeleteAccountForm />
        </AccountSection>
      </div>
    </>
  );
}
