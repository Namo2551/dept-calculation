import type { Metadata } from "next";
import { getDict } from "@/i18n";
import { RootShell } from "../RootShell";

const t = getDict("th");

export const metadata: Metadata = {
  title: t.meta.title,
  description: t.meta.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <RootShell lang="th">{children}</RootShell>;
}
