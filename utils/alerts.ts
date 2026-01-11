import { BudgetState, Transaction, CATEGORY_BUCKET_MAP } from '../types';
import { isSameWeek } from './date';

export type AlertType = 'success' | 'warning' | 'critical';

export interface AlertItem {
    id: string; // unique ID to track dismissal (e.g., "daily-warning-2023-10-27")
    type: AlertType;
    title: string;
    message: string;
}

export const generateAlerts = (budget: BudgetState, transactions: Transaction[]): AlertItem[] => {
    const alerts: AlertItem[] = [];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM

    // 1. Calculate Spending Metrics
    let weeklySpent = 0;
    let monthlySpent = 0;

    const weeklyBucketTotal = transactions
        .filter(t => {
            const tDate = new Date(t.date);
            // Check if transaction is in current week
            return isSameWeek(tDate, now) && CATEGORY_BUCKET_MAP[t.category] === 'Weekly';
        })
        .reduce((sum, t) => sum + t.amount, 0);

    // For monthly bucket, we sum ALL transactions in that bucket for this month
    const monthlyBucketTotal = transactions
        .filter(t => {
            const isThisMonth = t.date.startsWith(currentMonthStr);
            return isThisMonth && CATEGORY_BUCKET_MAP[t.category] === 'Monthly';
        })
        .reduce((sum, t) => sum + t.amount, 0);

    // Savings: We look at the 'remaining' global balance as "Current Savings" 
    // (as per Dashboard logic: remainingTotal = Income - TotalSpent)
    const totalSpentAll = transactions.reduce((sum, t) => sum + t.amount, 0);
    const currentSavings = budget.monthlyIncome - totalSpentAll;

    // 2. Evaluate Triggers

    // --- Weekly Spending Limit ---
    const { weeklyLimit } = budget.allocations;
    if (weeklyLimit > 0) {
        if (weeklyBucketTotal > weeklyLimit) {
            alerts.push({
                id: `weekly-critical-${todayStr}`, // We regenerate alerts daily, so ID can be date-based or week-based. Using todayStr ensures if user dismisses today, it might reappear tmrw if still critical? Or should be week-based? Let's use todayStr to allow re-alerting daily if still critical.
                type: 'critical',
                title: 'Weekly Limit Exceeded',
                message: `You've spent ₹${weeklyBucketTotal} / ₹${weeklyLimit} this week.`
            });
        } else if (weeklyBucketTotal >= weeklyLimit * 0.8) {
            alerts.push({
                id: `weekly-warning-${todayStr}`,
                type: 'warning',
                title: 'Approaching Weekly Limit',
                message: `You've used ${Math.round((weeklyBucketTotal / weeklyLimit) * 100)}% of your weekly limit (₹${weeklyBucketTotal} / ₹${weeklyLimit}).`
            });
        }
    }

    // --- Category-Specific Weekly Limits ---
    const categoryLimits = budget.allocations.weeklyCategoryLimits || {};
    (Object.keys(categoryLimits) as (keyof typeof categoryLimits)[]).forEach(cat => {
        const limit = categoryLimits[cat] || 0;
        if (limit <= 0) return;

        const catSpent = transactions
            .filter(t => isSameWeek(new Date(t.date), now) && t.category === cat)
            .reduce((sum, t) => sum + t.amount, 0);

        if (catSpent > limit) {
            alerts.push({
                id: `weekly-cat-critical-${cat}-${todayStr}`,
                type: 'critical',
                title: `${cat} Limit Exceeded`,
                message: `You've spent ₹${catSpent} on ${cat}, exceeding your ₹${limit} limit.`
            });
        } else if (catSpent >= limit * 0.8) {
            alerts.push({
                id: `weekly-cat-warning-${cat}-${todayStr}`,
                type: 'warning',
                title: `${cat} Budget Low`,
                message: `You've used ${Math.round((catSpent / limit) * 100)}% of your ${cat} budget.`
            });
        }
    });

    // --- Monthly Expense Limit ---
    const { monthlyLimit } = budget.allocations;
    if (monthlyLimit > 0) {
        if (monthlyBucketTotal > monthlyLimit) {
            alerts.push({
                id: `monthly-critical-${currentMonthStr}`,
                type: 'critical',
                title: 'Monthly Expense Limit Exceeded',
                message: `Monthly bills/expenses are ₹${monthlyBucketTotal}, exceeding the ₹${monthlyLimit} limit.`
            });
        } else if (monthlyBucketTotal >= monthlyLimit * 0.8) {
            alerts.push({
                id: `monthly-warning-${currentMonthStr}`,
                type: 'warning',
                title: 'Approaching Monthly Expense Limit',
                message: `You've used ${Math.round((monthlyBucketTotal / monthlyLimit) * 100)}% of your monthly expense limit.`
            });
        }
    }

    // --- Savings Goal ---
    const { savingsTarget } = budget.allocations;
    if (savingsTarget > 0) {
        if (currentSavings >= savingsTarget) {
            alerts.push({
                id: `savings-success-${currentMonthStr}`,
                type: 'success',
                title: 'Savings Goal Reached! 🎉',
                message: `You have ₹${currentSavings} saved, meeting your ₹${savingsTarget} goal.`
            });
        } else {
            // "Behind schedule" warning
            // Heuristic: If (Income - Total Spent so far) < Savings Target, it's IMPOSSIBLE to hit goal (Critical)
            // Or: if we are late in the month and savings are low?
            // Let's implement the "Impossible" check first as it's definitive.
            // Actually, currentSavings IS (Income - TotalSpent). 
            // So if currentSavings < savingsTarget, we haven't met it.
            // But can we? 
            // We can only LOSE savings (by spending more). We can't gain them (unless income increases).
            // So if currentSavings < savingsTarget, we have ALREADY failed if we consider income fixed.
            // Wait, usually people start with 0 spending. 
            // Income 50k. Spent 0. Savings 50k. Goal 10k. Success!
            // Spent 45k. Savings 5k. Goal 10k. Fail!

            // So: IF (currentSavings < savingsTarget), it means we have dipped below the reserve.
            // This is a CRITICAL warning for savings.
            // "Warning alert if the user is behind schedule" -> In this model (Income - Expense), 
            // dropping below the target IS falling behind.

            // Let's add that warning.
            alerts.push({
                id: `savings-warning-${currentMonthStr}`,
                type: 'warning',
                title: 'Savings Below Goal',
                message: `Current savings (₹${currentSavings}) are below your target (₹${savingsTarget}). Reduce spending to recover.`
            });
        }
    }

    // --- Send Notifications for Low/Critical Alerts ---
    // In a real app, we'd track "sent" state to avoid spam. 
    // Here, we rely on the fact that this is called after a change, 
    // and OS handles simple deduping by tag if we provide it.

    // Lazy load or import outside? Import at top.

    return alerts;
};

// Helper to push notifications for fresh alerts
export const checkAndSendNotifications = (alerts: AlertItem[]) => {
    import('../services/notifications').then(({ notificationService }) => {
        if (!notificationService.hasPermission) return;

        alerts.forEach(alert => {
            // Only notify for warnings and critical
            if (alert.type === 'critical' || alert.type === 'warning' || alert.type === 'success') {
                notificationService.send(alert.title, alert.message, alert.id);
            }
        });
    });
};
