import { describe, expect, test } from "vitest";
import { hashToken, newShareToken, parseSharedView, sharedDebtRows, shareStatus, tokenHashForDb } from "./sharing";

describe("share tokens", () => {
  test("are 43-character URL-safe strings from 32 random bytes, different every time", () => {
    const a = newShareToken();
    const b = newShareToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });
  test("are stored only as a SHA-256 hash in Postgres bytea hex form", () => {
    expect(hashToken("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(tokenHashForDb("abc")).toBe("\\xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("shareStatus", () => {
  test("revoked beats expired; no expiry means active", () => {
    const now = Date.parse("2026-11-22T00:00:00Z");
    expect(shareStatus({ revoked_at: null, expires_at: null }, now)).toBe("active");
    expect(shareStatus({ revoked_at: null, expires_at: "2026-11-21T00:00:00Z" }, now)).toBe("expired");
    expect(shareStatus({ revoked_at: "2026-11-01T00:00:00Z", expires_at: "2026-11-21T00:00:00Z" }, now)).toBe("revoked");
    expect(shareStatus({ revoked_at: null, expires_at: "2026-12-01T00:00:00Z" }, now)).toBe("active");
  });
});

describe("parseSharedView", () => {
  const raw = {
    label: "For my partner",
    created_at: "2026-11-22T00:00:00Z",
    expires_at: null,
    show_amounts: false,
    show_payments: true,
    show_goals: false,
    show_notes: false,
    include_debts: true,
    plan: null,
    debts: [
      {
        id: "x1", name: "Card A", kind: "credit_card", start_balance: 100, start_date: "2026-01-15", apr: 16, min_pct: 5,
        min_amount: 1.6667, due_day: 20, currency: "THB", status: "active",
        payments: [{ paid_on: "2026-01-20", amount: 5, note: null }],
        schedule: { balance: 100, apr: 16, monthly_payment: 5, start_date: "2026-01-15" },
      },
    ],
    goals: [],
  };
  test("accepts the function's JSON and rejects anything else", () => {
    expect(parseSharedView(raw)?.debts).toHaveLength(1);
    expect(parseSharedView(null)).toBeNull();
    expect(parseSharedView({ nope: true })).toBeNull();
  });
  test("without payment history, monthly totals stand in for payments", () => {
    const hidden = { ...raw, show_payments: false, debts: [{ ...raw.debts[0], payments: null, monthly_paid: [{ paid_on: "2026-01-15", amount: 5 }] }] };
    const [row] = sharedDebtRows(parseSharedView(hidden)!);
    expect(row.payments).toHaveLength(1);
    expect(row.payments[0]).toMatchObject({ paid_on: "2026-01-15", amount: 5, note: null });
  });

  test("turns shared debts into rows the ledger can read", () => {
    const v = parseSharedView(raw)!;
    const [row] = sharedDebtRows(v);
    expect(row.debt.start_balance).toBe(100);
    expect(row.payments[0].amount).toBe(5);
    expect(row.schedule?.monthly_payment).toBe(5);
  });
});
