// Generated from the paydown Supabase project (Supabase MCP generate_typescript_types), then trimmed to
// the parts the app uses. Regenerate after every migration. Numeric columns arrive as JS numbers.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Timestamps = { created_at: string; updated_at: string };

export type ProfileRow = {
  id: string;
  display_name: string | null;
  currency: string;
  privacy_consent_at: string | null;
} & Timestamps;

export type DebtRow = {
  id: string;
  user_id: string;
  name: string;
  kind: string; // 'credit_card' | 'personal_loan' | 'other'
  start_balance: number;
  start_date: string;
  apr: number;
  min_pct: number | null;
  min_amount: number;
  due_day: number | null;
  currency: string;
  status: string; // 'active' | 'paid_off' | 'archived'
} & Timestamps;

export type DebtPlanRow = {
  id: string;
  user_id: string;
  debt_id: string | null;
  name: string;
  balance: number;
  apr: number;
  min_pct: number;
  min_floor: number;
  fixed_payment: number;
  target_months: number;
  interest_limit: number;
  bonus_amount: number | null;
  bonus_month: number | null;
  start_date: string;
  currency: string;
  notes: string | null;
} & Timestamps;

export type RepaymentScheduleRow = {
  id: string;
  user_id: string;
  debt_id: string;
  source_plan_id: string | null;
  balance: number;
  apr: number;
  monthly_payment: number;
  start_date: string;
  is_active: boolean;
} & Timestamps;

export type PaymentRecordRow = {
  id: string;
  user_id: string;
  debt_id: string;
  paid_on: string;
  amount: number;
  note: string | null;
} & Timestamps;

export type FinancialGoalRow = {
  id: string;
  user_id: string;
  title: string;
  kind: string; // 'debt_free_by' | 'debt_paid_by' | 'reduce_total_pct' | 'reduce_total_to'
  debt_id: string | null;
  target_date: string | null;
  target_amount: number | null;
  target_pct: number | null;
  achieved_at: string | null;
} & Timestamps;

export type SharedPlanRow = {
  id: string;
  owner_id: string;
  label: string | null;
  token_hash: string;
  plan_id: string | null;
  include_debts: boolean;
  show_amounts: boolean;
  show_payments: boolean;
  show_goals: boolean;
  show_notes: boolean;
  expires_at: string | null;
  revoked_at: string | null;
  last_viewed_at: string | null;
  created_at: string;
};

// Insert: server-filled columns (id, user_id via auth.uid(), timestamps) and columns with defaults are optional.
type Ins<Row, Required extends keyof Row> = Pick<Row, Required> & Partial<Omit<Row, Required>>;

type Table<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Ins<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" };
  public: {
    Tables: {
      profiles: Table<ProfileRow, "id">;
      debts: Table<DebtRow, "name" | "start_balance" | "apr">;
      debt_plans: Table<DebtPlanRow, "name" | "balance" | "apr" | "fixed_payment">;
      repayment_schedules: Table<RepaymentScheduleRow, "debt_id" | "balance" | "apr" | "monthly_payment" | "start_date">;
      payment_records: Table<PaymentRecordRow, "debt_id" | "paid_on" | "amount">;
      financial_goals: Table<FinancialGoalRow, "title" | "kind">;
      shared_plans: Table<SharedPlanRow, "token_hash">;
    };
    Views: { [_ in never]: never };
    Functions: {
      delete_my_account: { Args: never; Returns: undefined };
      get_shared_view: { Args: { p_token: string }; Returns: Json };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
