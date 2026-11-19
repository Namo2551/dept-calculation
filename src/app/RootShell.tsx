import type { Lang } from "@/i18n/types";
import { plexMono, plexThai } from "./fonts";
import "./globals.css";

// Shared <html>/<body> for both language root layouts (each route group owns its own <html lang>).
export function RootShell({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return (
    <html lang={lang} className={`${plexThai.variable} ${plexMono.variable} antialiased`}>
      <body className="min-h-dvh bg-bg text-text">{children}</body>
    </html>
  );
}
