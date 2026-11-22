// Plain (server-safe) helpers for the debt form. Kept out of the "use client" DebtForm module so server
// pages can call them: Next.js can't call a client module's function on the server.
export type DebtFormValues = {
  id?: string;
  name: string;
  kind: string;
  start_balance: string;
  start_date: string;
  apr: string;
  min_pct: string;
  min_amount: string;
  due_day: string;
  currency: string;
};

// New debts start as a credit card from today with the common Thai minimum (5% or 500 baht).
export function newDebtDefaults(today: string): DebtFormValues {
  return { name: "", kind: "credit_card", start_balance: "", start_date: today, apr: "16", min_pct: "5", min_amount: "500", due_day: "", currency: "THB" };
}

