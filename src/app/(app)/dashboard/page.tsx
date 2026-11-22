import type { Metadata } from "next";
import { PageIntro } from "@/components/PageIntro";
import { appCopy } from "@/copy/app";
import { requireProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

// Placeholder until the dashboard feature lands (Feature 3).
export default async function DashboardPage() {
  const { profile, email } = await requireProfile("/dashboard");
  return (
    <>
      <PageIntro title={appCopy.dashboard.title} intro={appCopy.dashboard.intro} />
      <p className="mt-6 text-muted" data-testid="dashboard-user">
        {profile.display_name || email}
      </p>
    </>
  );
}
