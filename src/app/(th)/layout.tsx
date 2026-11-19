import type { Metadata } from "next";
import { siteUrl } from "@/app/site";
import { getDict } from "@/i18n";
import { RootShell } from "../RootShell";

const t = getDict("th");

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: t.meta.title,
  description: t.meta.description,
  openGraph: { title: t.meta.title, description: t.meta.description, type: "website" },
  alternates: { languages: { th: "/", en: "/en" } },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <RootShell lang="th">{children}</RootShell>;
}
