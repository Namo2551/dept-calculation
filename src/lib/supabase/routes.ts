// Pages that need a signed-in user. The proxy redirects early (a convenience); every private page and
// action also checks the user on the server, and RLS is the final guard.
export const PRIVATE_PREFIXES = ["/dashboard", "/plans", "/debts", "/strategy", "/goals", "/sharing", "/account"];

export function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// Only same-site relative paths are allowed as "come back here after login" targets (no open redirects).
// Control characters, spaces and backslashes are refused outright (browsers strip tabs/newlines, so "/\t/x" would
// become "//x"); then the path must resolve to this same origin.
export function safeNext(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || /[\u0000- \u007f\\]/.test(next)) return fallback;
  try {
    const base = "http://same.invalid";
    const u = new URL(next, base);
    if (u.origin !== base) return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}
