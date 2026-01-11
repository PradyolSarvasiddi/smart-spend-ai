import { BudgetState, Transaction } from '../types';

const STORAGE_KEYS = {
  BUDGET: 'smartspend_budget',
  TRANSACTIONS: 'smartspend_transactions',
};

export const loadBudget = (): BudgetState => {
  const stored = localStorage.getItem(STORAGE_KEYS.BUDGET);
  if (stored) {
    const parsed = JSON.parse(stored);

    // Schema check & Migration
    if (parsed.monthlyIncome !== undefined) {
      // Migrate Daily -> Weekly if missing
      if (parsed.allocations.weeklyLimit === undefined) {
        const daily = parsed.allocations.dailyLimit || 0;
        parsed.allocations.weeklyLimit = daily * 7;
        // Optional: delete parsed.allocations.dailyLimit; 
        // but keeping it doesn't hurt, TS cast will ignore it.
      }
      return parsed;
    }
  }
  // Default / Reset
  return {
    monthlyIncome: 0,
    allocations: { weeklyLimit: 0, monthlyLimit: 0, savingsTarget: 0 },
    isSet: false,
  };
};

export const saveBudget = (budget: BudgetState) => {
  localStorage.setItem(STORAGE_KEYS.BUDGET, JSON.stringify(budget));
};

export const loadTransactions = (): Transaction[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  if (stored) {
    return JSON.parse(stored);
  }
  return [];
};

export const saveTransactions = (transactions: Transaction[]) => {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
};
