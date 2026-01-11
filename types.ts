export type TransactionCategory = 'Groceries' | 'Outings' | 'BodyCare' | 'Orders' | 'Miscellaneous' | 'Petrol' | 'Bills' | 'Savings' | 'Other';

export interface Transaction {
  id: string;
  amount: number;
  category: TransactionCategory;
  description: string;
  date: string; // ISO string
  timestamp: number;
}

export interface BudgetAllocations {
  weeklyLimit: number; // explicit amount
  monthlyLimit: number; // explicit amount
  savingsTarget: number; // explicit amount
  weeklyCategoryLimits: Partial<Record<TransactionCategory, number>>;
}

export interface BudgetState {
  monthlyIncome: number;
  allocations: BudgetAllocations;
  isSet: boolean;
}

export interface ParsedExpense {
  amount: number | null;
  category: TransactionCategory | null;
  description: string;
  date: Date;
}

// Mapping specific transaction categories to high-level budget buckets
export type BudgetBucket = 'Weekly' | 'Monthly' | 'Savings';

export const CATEGORY_BUCKET_MAP: Record<TransactionCategory, BudgetBucket> = {
  Groceries: 'Weekly',
  Outings: 'Weekly',
  BodyCare: 'Weekly',
  Orders: 'Weekly',
  Miscellaneous: 'Weekly',
  Petrol: 'Weekly',
  Other: 'Weekly',
  Bills: 'Monthly',
  Savings: 'Savings',
};

// --- History Types ---

export interface WeeklyStats {
  weekId: string; // ISO Week "2024-W25"
  startDate: string;
  endDate: string;
  totalSpent: number;
  totalSaved: number;
  categoryBreakdown: Partial<Record<TransactionCategory, number>>;
  status: 'active' | 'completed';
}

export interface MonthlyStats {
  monthId: string; // "2024-06"
  monthName: string; // "June 2024"
  totalSpent: number;
  totalSaved: number;
  categoryBreakdown: Partial<Record<TransactionCategory, number>>;
  weeks: WeeklyStats[]; // Archive of weeks that ended in this month
  isFinalized: boolean; // true if month is over
}

export interface HistoryMeta {
  lastActiveWeek: string; // "2024-W25"
  lastActiveMonth: string; // "2024-06"
}
