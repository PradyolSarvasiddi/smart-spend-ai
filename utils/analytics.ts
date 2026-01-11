import { Transaction, TransactionCategory } from '../types';

export interface CategoryBreakdown {
    name: string;
    amount: number;
    percentage: number;
    count: number;
}

export interface SpendingAnalytics {
    totalSpent: number;
    breakdown: CategoryBreakdown[];
    topCategories: CategoryBreakdown[];
    personalPurchases: Transaction[];
    insights: string[];
}

const KEYWORD_MAP: Record<string, string> = {
    'zomato': 'Food Delivery',
    'swiggy': 'Food Delivery',
    'uber eats': 'Food Delivery',
    'blinkit': 'Groceries',
    'zepto': 'Groceries',
    'bigbasket': 'Groceries',
    'instamart': 'Groceries',
    'dmart': 'Groceries',
    'grocery': 'Groceries',
    'petrol': 'Petrol / Transport',
    'fuel': 'Petrol / Transport',
    'uber': 'Petrol / Transport',
    'ola': 'Petrol / Transport',
    'rapido': 'Petrol / Transport',
    'netflix': 'Subscriptions',
    'spotify': 'Subscriptions',
    'prime': 'Subscriptions',
    'youtube': 'Subscriptions',
};

const getGranularCategory = (t: Transaction): string => {
    // 1. Personal is a top-level override
    if (t.category === 'Personal') return 'Personal Purchases';

    // 2. Keyword matching for sub-categories
    const desc = t.description.toLowerCase();
    for (const [keyword, subCat] of Object.entries(KEYWORD_MAP)) {
        if (desc.includes(keyword)) return subCat;
    }

    // 3. Fallback to main category with nicer formatting
    if (t.category === 'Food') return 'Food & Dining';
    if (t.category === 'Transport') return 'Petrol / Transport';
    if (t.category === 'Bills') return 'Bills & Utilities';

    return t.category;
};

export const generateAnalytics = (transactions: Transaction[]): SpendingAnalytics => {
    const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
    const categoryMap: Record<string, { amount: number; count: number }> = {};
    const personalPurchases: Transaction[] = [];

    transactions.forEach(t => {
        // Collect personal purchases separately for the specific section
        if (t.category === 'Personal') {
            personalPurchases.push(t);
        }

        const categoryName = getGranularCategory(t);
        if (!categoryMap[categoryName]) {
            categoryMap[categoryName] = { amount: 0, count: 0 };
        }
        categoryMap[categoryName].amount += t.amount;
        categoryMap[categoryName].count += 1;
    });

    // Convert map to array and sort
    const breakdown: CategoryBreakdown[] = Object.entries(categoryMap)
        .map(([name, data]) => ({
            name,
            amount: data.amount,
            percentage: totalSpent > 0 ? Math.round((data.amount / totalSpent) * 100) : 0,
            count: data.count
        }))
        .sort((a, b) => b.amount - a.amount);

    const topCategories = breakdown.slice(0, 3);

    // Generate Smart Insights
    const insights: string[] = [];
    if (breakdown.length > 0) {
        const top = breakdown[0];
        insights.push(`Most of your money was spent on ${top.name} this month (₹${top.amount.toLocaleString()}).`);

        const foodDelivery = breakdown.find(b => b.name === 'Food Delivery');
        if (foodDelivery && foodDelivery.percentage > 20) {
            insights.push(`You've spent ${foodDelivery.percentage}% of your budget on Food Delivery. Cooking at home could save you money!`);
        }

        const personal = breakdown.find(b => b.name === 'Personal Purchases');
        if (personal && personal.amount > totalSpent * 0.15) {
            insights.push(`Personal purchases are higher than average (${personal.percentage}% of total).`);
        }
    }

    return {
        totalSpent,
        breakdown,
        topCategories,
        personalPurchases,
        insights
    };
};
