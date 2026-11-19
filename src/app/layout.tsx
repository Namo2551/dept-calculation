import type { Metadata } from "next";
import { siteUrl } from "@/app/site";
import { CalcProvider } from "@/components/CalcProvider";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { copy } from "@/copy";
import { hostGrotesk, plexMono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: { default: copy.meta.title, template: "%s | Paydown" },
  description: copy.meta.description,
  openGraph: { title: copy.meta.title, description: copy.meta.description, type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${hostGrotesk.variable} ${plexMono.variable} antialiased`}>
      <body className="min-h-dvh bg-bg text-ink">
        <CalcProvider>
          <SiteHeader />
          <main className="container-page pb-16">{children}</main>
          <SiteFooter />
        </CalcProvider>
      </body>
    </html>
  );
}
