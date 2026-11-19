import type { Metadata } from "next";
import { siteUrl } from "@/app/site";
import { CalcProvider } from "@/components/CalcProvider";
import { Footer } from "@/components/calculator/Footer";
import { copy } from "@/copy";
import { plexMono, plexSans } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: { default: copy.meta.title, template: "%s | Paydown" },
  description: copy.meta.description,
  openGraph: { title: copy.meta.title, description: copy.meta.description, type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable} antialiased`}>
      <body className="min-h-dvh bg-bg text-text"><CalcProvider>
          <main className="mx-auto max-w-[1040px] px-4 sm:px-6 pb-16">
            {children}
            <Footer />
          </main>
        </CalcProvider>
      </body>
    </html>
  );
}
