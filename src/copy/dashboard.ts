// Copy for the personal dashboard (Feature 3). No em or en dashes in visible text.
import { monthsToText } from "@/lib/format";

export const dashboardCopy = {
  title: "Dashboard",
  intro: "Your debts at a glance: what is left, what you have paid and when you will be debt-free.",
  headline: {
    date: (months: number, monthYear: string) => (months === 0 ? `Debt-free this month, ${monthYear}` : `Debt-free in ${monthsToText(months)}, ${monthYear}`),
    paidOff: "Everything is paid off. You are debt-free.",
    never: (names: string[]) =>
      `At the current payments, ${names.join(", ")} ${names.length === 1 ? "never gets" : "never get"} paid off: the monthly payment does not cover the interest. Raise the payment or set a plan.`,
  },
  progress: {
    label: "Share of starting balances repaid",
    text: (pct: string) => `${pct}% of your starting balances repaid`,
  },
  cards: {
    title: "Summary",
    outstanding: "Total outstanding",
    paid: "Total paid so far",
    interestPaid: "Interest charged so far",
    remainingInterest: "Estimated interest still to pay",
    remainingNever: "Not available: a debt never pays off",
    debtFree: "Estimated debt-free date",
    debtFreeNever: "Not reached at current payments",
    thisMonth: "Paid this month",
    thisMonthOf: (planned: string) => `of ${planned} planned or minimum`,
  },
  charts: {
    totalTitle: "Total debt over time",
    totalNote: (from: string, today: string, to: string) => `Solid line: actual month-end balances from ${from} to ${today}. Dashed line: the projection from today to ${to} at your current payments.`,
    totalCut: "One or more debts never pay off at the current payments, so the projection stops after 10 years.",
    totalAria: (from: string, to: string, now: string, end: string) => `Total debt by month from ${from} to ${to}. Now ${now}, projected ${end} at the end.`,
    actual: "Actual",
    projected: "Projected",
    planned: "Planned",
    today: "Today",
    planTitle: "Planned vs actual balance",
    planNote: "For debts with a repayment plan: the balance your plans expect each month against the real balance.",
    planEmpty: "No repayment plans yet. Set a plan on a debt to compare it with your real payments.",
    planAria: (from: string, to: string) => `Planned and actual total balance of debts with a plan, from ${from} to ${to}.`,
    paymentsTitle: "Monthly payments",
    paymentsNote: "Total paid in each of the last 12 months, against the planned payment (or the minimum due when a debt has no plan).",
    paymentsAria: (from: string, to: string) => `Bar chart of total payments per month from ${from} to ${to}, with the planned payment marked on each bar.`,
    paid: "Paid",
    range: (from: string, to: string) => `${from} to ${to}`,
    showTable: "Show the numbers as a table",
    month: "Month",
  },
  debts: {
    title: "Your debts",
    balance: "Balance",
    open: (name: string) => `Open ${name}`,
    status: {
      paid_off: "Paid off",
      ahead: "Ahead of plan",
      on_track: "On track",
      behind: "Behind plan",
      no_plan: "No plan",
    },
    manage: "Manage debts",
  },
  empty: {
    title: "Start by adding a debt",
    body: "Add a credit card or loan with its balance and interest rate. Then record payments and this page shows your progress and debt-free date.",
    addDebt: "Add your first debt",
    calculator: "Try the calculator first",
  },
} as const;
