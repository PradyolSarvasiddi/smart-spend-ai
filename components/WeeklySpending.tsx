import React, { useMemo, useState } from 'react';
import { Transaction, BudgetState, TransactionCategory, CATEGORY_BUCKET_MAP } from '../types';
import { Card } from './ui/Card';
import { isSameWeek } from '../utils/date';
import { generateAnalytics } from '../utils/analytics';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

interface WeeklySpendingProps {
    transactions: Transaction[];
    budget: BudgetState;
    onUpdateBudget: (newBudget: BudgetState) => void;
    onBack: () => void;
}

const MANDATORY_CATEGORIES: TransactionCategory[] = [
    'Groceries', 'Outings', 'BodyCare', 'Orders', 'Miscellaneous', 'Petrol'
];

export const WeeklySpending: React.FC<WeeklySpendingProps> = ({ transactions, budget, onUpdateBudget, onBack }) => {
    // Local State for Inline Editing
    const [editingCategory, setEditingCategory] = useState<TransactionCategory | null>(null);
    const [editValue, setEditValue] = useState('');

    // 1. Filter for Current Week
    const weeklyTransactions = useMemo(() => {
        const now = new Date();
        return transactions.filter(t => isSameWeek(new Date(t.date), now) && CATEGORY_BUCKET_MAP[t.category] === 'Weekly');
    }, [transactions]);

    // 2. Calculate Spend per Category
    const categorySpend = useMemo(() => {
        const spend: Partial<Record<TransactionCategory, number>> = {};
        MANDATORY_CATEGORIES.forEach(cat => spend[cat] = 0); // Init 0

        weeklyTransactions.forEach(t => {
            if (MANDATORY_CATEGORIES.includes(t.category)) {
                spend[t.category] = (spend[t.category] || 0) + t.amount;
            } else {
                // Map 'Food' to 'Groceries' or 'Orders' if not migrated? 
                // For now, assume 'Miscellaneous' if unknown, or strict matching.
                // Strict matching is safer for now.
                // spend['Miscellaneous'] = (spend['Miscellaneous'] || 0) + t.amount;
            }
        });
        return spend;
    }, [weeklyTransactions]);

    // 3. Overall Stats
    const totalWeeklySpent = weeklyTransactions.reduce((acc, t) => acc + t.amount, 0);
    const weeklyLimit = budget.allocations.weeklyLimit;
    const remaining = weeklyLimit - totalWeeklySpent;
    const progress = Math.min(100, (totalWeeklySpent / weeklyLimit) * 100);

    const COLORS = ['#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#6366f1'];

    // Handlers for Editing
    const handleStartEdit = (category: TransactionCategory, currentLimit: number) => {
        setEditingCategory(category);
        setEditValue(currentLimit.toString());
    };

    const handleSaveEdit = () => {
        if (!editingCategory) return;
        const val = parseFloat(editValue);
        if (!isNaN(val) && val >= 0) {
            const newLimits = { ...budget.allocations.weeklyCategoryLimits, [editingCategory]: val };
            onUpdateBudget({
                ...budget,
                allocations: {
                    ...budget.allocations,
                    weeklyCategoryLimits: newLimits
                }
            });
        }
        setEditingCategory(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSaveEdit();
        if (e.key === 'Escape') setEditingCategory(null);
    };

    // Chart Data
    const pieData = MANDATORY_CATEGORIES.map(cat => ({
        name: cat,
        value: categorySpend[cat] || 0
    })).filter(d => d.value > 0);

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex items-center gap-4 sticky top-0 bg-[#0a0a0f]/90 backdrop-blur z-30 py-4 -mx-4 px-4 border-b border-white/5">
                <button
                    onClick={onBack}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                >
                    ← Back
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                        Weekly Breakdown
                    </h1>
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-400">Total Spent</p>
                    <p className="text-lg font-mono font-bold text-white">₹{totalWeeklySpent.toLocaleString()}</p>
                </div>
            </div>

            {/* Main Overview Card */}
            <Card className="border-violet-500/20 bg-gradient-to-br from-violet-900/10 to-transparent">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-gray-400 text-sm">Overall Weekly Budget</span>
                    <span className="text-xl font-mono text-white">₹{remaining.toLocaleString()} <span className="text-xs text-gray-500">left</span></span>
                </div>
                <div className="h-4 w-full bg-gray-800 rounded-full overflow-hidden mb-2 relative">
                    <div
                        className={`h-full transition-all duration-1000 ${progress >= 100 ? 'bg-red-500' : progress >= 80 ? 'bg-amber-500' : 'bg-violet-500'}`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-gray-500">₹0</span>
                    <span className="text-gray-500">Limit: ₹{weeklyLimit.toLocaleString()}</span>
                </div>
            </Card>

            {/* Category Grid */}
            <h2 className="text-lg font-bold text-white mt-8 mb-4">Category Budgets</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {MANDATORY_CATEGORIES.map((cat, index) => {
                    const spent = categorySpend[cat] || 0;
                    const limit = budget.allocations.weeklyCategoryLimits?.[cat] || 0;
                    const catProgress = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
                    const isOver = spent > limit && limit > 0;
                    const isNear = spent > limit * 0.8 && !isOver;

                    return (
                        <Card key={cat} className={`bg-white/5 border ${isOver ? 'border-red-500/30' : 'border-white/5'} hover:border-white/20 transition-all`}>
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                    <h3 className="font-medium text-gray-200">{cat}</h3>
                                </div>
                                {editingCategory === cat ? (
                                    <div className="flex items-center gap-2 bg-black/40 rounded px-2 py-1 border border-violet-500/50">
                                        <span className="text-xs text-gray-400">₹</span>
                                        <input
                                            autoFocus
                                            type="number"
                                            className="w-16 bg-transparent text-white text-sm focus:outline-none font-mono"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onBlur={handleSaveEdit}
                                            onKeyDown={handleKeyDown}
                                        />
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleStartEdit(cat, limit)}
                                        className="text-xs text-gray-500 hover:text-violet-300 transition-colors flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md"
                                    >
                                        Limit: ₹{limit.toLocaleString()} <span className="opacity-50">✏️</span>
                                    </button>
                                )}
                            </div>

                            <div className="flex justify-between items-baseline mb-2">
                                <span className={`text-2xl font-mono font-bold ${isOver ? 'text-red-400' : 'text-white'}`}>
                                    ₹{spent.toLocaleString()}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {limit > 0 ? `${Math.round(catProgress)}%` : 'No Limit'}
                                </span>
                            </div>

                            <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-1000 ${isOver ? 'bg-red-500' : isNear ? 'bg-amber-500' : COLORS[index % COLORS.length]}`}
                                    style={{ width: `${limit > 0 ? catProgress : 0}%` }}
                                />
                            </div>
                            {isOver && <p className="text-xs text-red-400 mt-2">Exceeded by ₹{(spent - limit).toLocaleString()}</p>}
                        </Card>
                    );
                })}
            </div>

            {/* Visualization */}
            {pieData.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-lg font-bold text-white mb-4">Visual Breakdown</h2>
                    <Card className="min-h-[300px]">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[MANDATORY_CATEGORIES.indexOf(entry.name as TransactionCategory) % COLORS.length]} stroke="rgba(0,0,0,0)" />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: '#1a1b26', border: 'none', borderRadius: '8px' }}
                                    formatter={(value: number) => `₹${value}`}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </Card>
                </div>
            )}
        </div>
    );
};
