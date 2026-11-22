import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/supabase/routes";

// Email links (confirm sign-up, reset password) land here. A PKCE link carries `code`; a template link carries
// `token_hash` + `type`. Either one becomes a session cookie, then the user goes on to `next` (same-site only).
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const supabase = await createClient();

  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && (type === "signup" || type === "recovery" || type === "email" || type === "email_change")) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    ok = !error;
  }

  const to = url.clone();
  to.search = "";
  if (ok) {
    const [path, query] = next.split("?");
    to.pathname = path;
    if (query) to.search = "?" + query;
  } else {
    to.pathname = "/login";
    to.search = "?error=link";
  }
  return NextResponse.redirect(to);
}
