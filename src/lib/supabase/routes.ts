// Pages that need a signed-in user. The proxy redirects early (a convenience); every private page and
// action also checks the user on the server, and RLS is the final guard.
export const PRIVATE_PREFIXES = ["/dashboard", "/plans", "/debts", "/strategy", "/goals", "/sharing", "/account"];

export function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// Only same-site relative paths are allowed as "come back here after login" targets (no open redirects).
export function safeNext(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
