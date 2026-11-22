import Link from "next/link";
import { AppNav } from "@/components/app/AppNav";
import { appCopy } from "@/copy/app";
import { requireProfile } from "@/lib/auth";

// Every page in this group is private: the user is verified on the server here (the proxy's redirect is only
// a shortcut), and RLS keeps each query to their own rows.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile();
  return (
    <>
      <AppNav name={profile.display_name ?? ""} />
      {!profile.privacy_consent_at && (
        <p role="status" className="mt-6 border border-accent text-accent px-4 py-3 text-[15px]">
          {appCopy.needConsent}{" "}
          <Link href="/account#privacy" className="underline underline-offset-4">
            {appCopy.account.title}
          </Link>
        </p>
      )}
      {children}
    </>
  );
}
