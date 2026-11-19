import type { Metadata } from "next";
import { siteUrl } from "@/app/site";
import { copy } from "@/copy";
import { plexMono, plexSans } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: { default: "Paydown: when does your card debt end?", template: "%s | Paydown" },
  description: copy.meta.description,
  openGraph: { title: "Paydown: when does your card debt end?", description: copy.meta.description, type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable} antialiased`}>
      <body className="min-h-dvh bg-bg text-text">{children}</body>
    </html>
  );
}
