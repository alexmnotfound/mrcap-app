export type CashMovementType = "deposit" | "withdrawal" | "fee";
export type FundShareMovementType = "subscription" | "redemption";
export type AppUserStatus =
  | "invited"
  | "active"
  | "suspended"
  | "disabled";

export interface AppUser {
  id: number;
  firebase_uid: string;
  email: string;
  full_name: string;
  is_admin: boolean;
  status: AppUserStatus;
  created_at: string;
}

export interface FundPosition {
  fund_id: number;
  fund_name: string;
  currency: string;
  total_shares: string;
  latest_share_value?: string | null;
  market_value?: string | null;
}

export interface AccountSummary {
  account_id: number;
  account_number: string;
  commission_rate: string;
  total_deposits: string;
  total_withdrawals: string;
  total_fees: string;
  net_invested: string;
  positions: FundPosition[];
  user_full_name?: string | null;
  user_email?: string | null;
}

export interface UserMovement {
  id: number;
  type: "cash" | "fund_share";
  account_id: number;
  effective_date: string;
  created_at: string;
  cash_type?: CashMovementType;
  amount?: string | null;
  currency?: string | null;
  fund_id?: number | null;
  fund_name?: string | null;
  shares_change?: string | null;
  share_price?: string | null;
  total_amount?: string | null;
  share_movement_type?: FundShareMovementType | null;
}

export interface MovementReportRow {
  user_id: number;
  user_full_name: string;
  account_id: number;
  account_number: string;
  cash_movement_id: number;
  cash_movement_type: CashMovementType;
  effective_date: string;
  amount: string;
  fund_share_movement_id?: number | null;
  shares_change?: string | null;
  share_price?: string | null;
}

export interface Fund {
  id: number;
  name: string;
  currency: string;
  created_at: string;
}

export interface FundNavPoint {
  as_of_date: string;
  fund_accumulated: string;
  shares_amount: string;
  share_value: string;
  delta_previous?: string | null;
  delta_since_origin?: string | null;
}

export interface FundPerformance {
  fund_id: number;
  fund_name: string;
  currency: string;
  latest_share_value?: string | null;
  navs: FundNavPoint[];
}

export interface ApiError {
  detail: string;
}

