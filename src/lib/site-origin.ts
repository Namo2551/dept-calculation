import "server-only";
import { headers } from "next/headers";

// The site's own origin for links in emails (confirm, reset). The configured NEXT_PUBLIC_SITE_URL wins, so a
// forged Host header can't redirect an email link elsewhere; Supabase also only accepts allow-listed URLs.
export async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL;
  if (configured) return configured.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
