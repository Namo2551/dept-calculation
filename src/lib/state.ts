// Calculator input state: defaults, parsing, validation, and load/save/share.
// The stored shape and the URL hash format match the original single-file site, so old links keep working.
import { decodeState, encodeState } from "./debt";

// lim = most interest the user wants to pay (baht), used by "Keep interest under a limit".
export type SingleRaw = { bal: string; apr: string; m: string; floor: string; p: string; n: string; lim: string };
export type CardRaw = { name: string; balance: string; apr: string; m: string; floor: string };
export type AppState = { single: SingleRaw; multi: { budget: string; cards: CardRaw[] } };

export const STORAGE_KEY = "debtcalc.v1";

const cardName = (letter: string) => "Card " + letter;

export function defaultState(): AppState {
  return {
    single: { bal: "30,000", apr: "16", m: "5", floor: "0", p: "1,500", n: "24", lim: "3,000" },
    multi: {
      budget: "3,000",
      cards: [
        { name: cardName("A"), balance: "20,000", apr: "24", m: "5", floor: "200" },
        { name: cardName("B"), balance: "8,000", apr: "18", m: "5", floor: "200" },
        { name: cardName("C"), balance: "3,000", apr: "12", m: "5", floor: "200" },
      ],
    },
  };
}

export const EXAMPLES: Record<"ex1" | "ex2" | "ex400", Omit<SingleRaw, "n" | "lim">> = {
  ex1: { bal: "30,000", apr: "16", m: "5", floor: "0", p: "1,500" },
  ex2: { bal: "30,000", apr: "16", m: "5", floor: "500", p: "1,500" },
  ex400: { bal: "30,000", apr: "16", m: "5", floor: "0", p: "400" },
};

export function newCard(index: number): CardRaw {
  return { name: cardName("ABCDE".charAt(index)), balance: "5,000", apr: "16", m: "5", floor: "200" };
}

export function parseNumber(s: string): number {
  const t = String(s).replace(/[,\s฿]/g, "");
  return t === "" || isNaN(Number(t)) ? NaN : Number(t);
}

export type RuleKey = "bal" | "balance" | "apr" | "m" | "floor" | "p" | "budget" | "n" | "lim";

const RULES: Record<RuleKey, (v: number) => boolean> = {
  bal: (v) => v > 0,
  balance: (v) => v > 0,
  apr: (v) => v >= 0 && v <= 100,
  m: (v) => v >= 0.1 && v <= 100,
  floor: (v) => v >= 0,
  p: (v) => v >= 0,
  budget: (v) => v >= 0,
  n: (v) => v >= 1 && v <= 1200 && Math.floor(v) === v,
  lim: (v) => v >= 0,
};

// The parsed number when valid, otherwise null (NaN fails every rule).
export function validate(key: RuleKey, raw: string): number | null {
  const v = parseNumber(raw);
  return RULES[key](v) ? v : null;
}

const SINGLE_KEYS: (keyof SingleRaw)[] = ["bal", "apr", "m", "floor", "p", "n", "lim"];
const CARD_KEYS: (keyof CardRaw)[] = ["name", "balance", "apr", "m", "floor"];

type Loose = { single?: Record<string, unknown>; multi?: { budget?: unknown; cards?: unknown } };

export function isValidState(s: unknown): s is AppState {
  if (!s || typeof s !== "object") return false;
  const o = s as Loose;
  return !!o.single && typeof o.single === "object" && !!o.multi && Array.isArray(o.multi.cards) &&
    o.multi.cards.length >= 2 && o.multi.cards.length <= 5;
}

// Old links may hold numbers instead of strings, or miss a field: coerce to the current shape.
function normalize(s: AppState): AppState {
  const def = defaultState().single;
  const single = {} as SingleRaw;
  SINGLE_KEYS.forEach((k) => {
    const v = (s.single as Record<string, unknown>)[k];
    single[k] = v === undefined || v === null ? def[k] : String(v);
  });
  const cards = (s.multi.cards as unknown[]).map((c) => {
    const card = {} as CardRaw;
    CARD_KEYS.forEach((k) => {
      const v = c && typeof c === "object" ? (c as Record<string, unknown>)[k] : undefined;
      card[k] = v === undefined || v === null ? "" : String(v);
    });
    return card;
  });
  return { single, multi: { budget: String(s.multi.budget ?? ""), cards } };
}

// Order: URL hash, then localStorage, then defaults.
export function loadState(opts: { hash: string; storage: Pick<Storage, "getItem"> | null }): {
  state: AppState;
  source: "link" | "saved" | "default";
} {
  if (opts.hash.length > 1) {
    const h = decodeState(opts.hash.slice(1));
    if (isValidState(h)) return { state: normalize(h), source: "link" };
  }
  try {
    const raw = opts.storage?.getItem(STORAGE_KEY);
    const t = raw ? JSON.parse(raw) : null;
    if (isValidState(t)) return { state: normalize(t), source: "saved" };
  } catch {
    // storage blocked or corrupt: fall back to defaults
  }
  return { state: defaultState(), source: "default" };
}

export function saveState(storage: Pick<Storage, "setItem"> | null, state: AppState): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable (private mode, quota): saving is a convenience, skip it
  }
}

export function shareUrl(href: string, state: AppState): string {
  return href.split("#")[0] + "#" + encodeState(state);
}
