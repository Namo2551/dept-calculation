// [Ch 13 Modeling computation] A deterministic finite-state machine for a (simplified) card account.
// Input alphabet {P = pay, M = miss}. Default is a trap state: it is reached exactly when the input
// contains three misses in a row, i.e. the regular language (P|M)*MMM(P|M)*.

export type AccountState = "current" | "late" | "delinquent" | "default";
export type Move = "P" | "M";

export const START: AccountState = "current";
export const MAX_MOVES = 60;

const ON_MISS: Record<AccountState, AccountState> = { current: "late", late: "delinquent", delinquent: "default", default: "default" };

export function step(s: AccountState, m: Move): AccountState {
  if (s === "default") return "default";
  return m === "P" ? "current" : ON_MISS[s];
}

export function runMachine(moves: string): AccountState[] {
  const path: AccountState[] = [START];
  for (const m of moves) path.push(step(path[path.length - 1], m as Move));
  return path;
}

// Upper-cases and drops whitespace; null when anything other than P/M remains or it is too long.
export function parseMoves(raw: string): string | null {
  const s = raw.replace(/\s+/g, "").toUpperCase();
  return /^[PM]*$/.test(s) && s.length <= MAX_MOVES ? s : null;
}

export function endsInDefault(moves: string): boolean {
  return /MMM/.test(moves);
}
