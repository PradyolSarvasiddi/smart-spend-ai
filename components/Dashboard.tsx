import React, { useMemo, useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { BudgetState, Transaction, CATEGORY_BUCKET_MAP, TransactionCategory } from '../types';
import { Card } from './ui/Card';
import { generateAlerts, AlertItem } from '../utils/alerts';
import { Alert } from './ui/Alert';
import { isSameWeek } from '../utils/date';

interface DashboardProps {
    budget: BudgetState;
    transactions: Transaction[];
    onUpdateBudget: (newBudget: BudgetState) => void;
    onResetBudget: () => void;
    onViewSummary: () => void;
    onViewWeekly: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ budget, transactions, onUpdateBudget, onResetBudget, onViewSummary, onViewWeekly }) => {
    // Local state for inline editing
    const [editing, setEditing] = useState<'Weekly' | 'Monthly' | 'Savings' | null>(null);
    const [editValue, setEditValue] = useState('');

    // Alert System
    const [activeAlerts, setActiveAlerts] = useState<AlertItem[]>([]);
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const generated = generateAlerts(budget, transactions);
        // Filter out alerts that have been dismissed
        const visible = generated.filter(a => !dismissedIds.has(a.id));
        setActiveAlerts(visible);
    }, [budget, transactions, dismissedIds]);

    const handleDismiss = (id: string) => {
        setDismissedIds(prev => {
            const next = new Set(prev);
            next.add(id);
            return next;
        });
    };

    // Calculate totals
    const totalSpent = transactions.reduce((acc, t) => acc + t.amount, 0);
    const remainingTotal = budget.monthlyIncome - totalSpent;

    // Calculate Weekly Spending Logic
    const weeklySpent = transactions
        .filter(t => isSameWeek(new Date(t.date), new Date()) && CATEGORY_BUCKET_MAP[t.category] === 'Weekly')
        .reduce((sum, t) => sum + t.amount, 0);

    // Calculate Monthly Bucket Spending
    const monthlyBucketSpent = transactions
        .filter(t => CATEGORY_BUCKET_MAP[t.category] === 'Monthly')
        .reduce((sum, t) => sum + t.amount, 0);

    const spentByBucket = {
        Weekly: weeklySpent,
        Monthly: monthlyBucketSpent,
        Savings: 0 // Calculated differently
    };

    // Limits
    const limits = {
        Weekly: budget.allocations.weeklyLimit,
        Monthly: budget.allocations.monthlyLimit,
        Savings: budget.allocations.savingsTarget,
    };

    const handleStartEdit = (key: 'Weekly' | 'Monthly' | 'Savings', currentVal: number) => {
        setEditing(key);
        setEditValue(currentVal.toString());
    };

    const handleSaveEdit = () => {
        if (!editing) return;
        const val = parseFloat(editValue);
        if (!isNaN(val) && val >= 0) {
            // Validation: Savings Goal cannot exceed total income
            if (editing === 'Savings' && val > budget.monthlyIncome) {
                alert(`Savings goal cannot exceed monthly income (₹${budget.monthlyIncome})`);
                setEditValue(budget.allocations.savingsTarget.toString()); // Revert
                setEditing(null);
                return;
            }

            const newAllocations = { ...budget.allocations };
            if (editing === 'Weekly') newAllocations.weeklyLimit = val;
            if (editing === 'Monthly') newAllocations.monthlyLimit = val;
            if (editing === 'Savings') newAllocations.savingsTarget = val;

            onUpdateBudget({
                ...budget,
                allocations: newAllocations
            });
        }
        setEditing(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSaveEdit();
        if (e.key === 'Escape') setEditing(null);
    };

    // Pie Chart Data
    const pieData = useMemo(() => {
        const catMap = transactions.reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);

        return Object.keys(catMap).map(key => ({
            name: key,
            value: catMap[key]
        }));
    }, [transactions]);

    const COLORS = ['#10b981', '#8b5cf6', '#f59e0b', '#3b82f6', '#ec4899', '#6366f1'];

    return (
        <div className="space-y-6">
            {/* Alert Section */}
            {activeAlerts.length > 0 && (
                <div className="space-y-2">
                    {activeAlerts.map(alert => (
                        <Alert key={alert.id} alert={alert} onDismiss={handleDismiss} />
                    ))}
                </div>
            )}

            {/* Header Total */}
            <div className="sticky top-0 bg-[#0a0a0f]/80 backdrop-blur-xl z-40 py-4 -mx-4 px-4 border-b border-white/5">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Total Balance</h2>
                        <div className="text-4xl font-mono font-bold text-white flex items-baseline">
                            ₹{remainingTotal.toLocaleString()}
                            <span className="text-sm text-gray-500 font-sans font-normal ml-2">/ ₹{budget.monthlyIncome.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onViewWeekly}
                            className="p-2 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 hover:text-violet-300 rounded-lg transition-colors flex items-center gap-2 text-xs border border-violet-500/20"
                            title="View Weekly Analysis"
                        >
                            <span>📅 Weekly</span>
                        </button>
                        <button
                            onClick={onViewSummary}
                            className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 rounded-lg transition-colors flex items-center gap-2 text-xs border border-indigo-500/20"
                            title="View Spendings Summary"
                        >
                            <span>📊 Summary</span>
                        </button>
                        <button
                            onClick={onResetBudget}
                            className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors flex items-center gap-2 text-xs"
                            title="Reset Budget Configuration"
                        >
                            <span>⚙️ Setup</span>
                        </button>
                    </div>
                </div>

                {/* Total Progress Bar */}
                <div className="mt-4 h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 transition-all duration-1000"
                        style={{ width: `${Math.min(100, (remainingTotal / budget.monthlyIncome) * 100)}%` }}
                    />
                </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Weekly Spending Card */}
                <Card glowColor="violet">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-gray-400 text-sm">Weekly Spending</h3>
                            <p className="text-2xl font-mono font-bold mt-1 text-white">₹{spentByBucket['Weekly'].toLocaleString()}</p>
                        </div>
                        {editing === 'Weekly' ? (
                            <div className="flex items-center gap-2 bg-white/10 rounded p-1">
                                <span className="text-xs text-gray-400">₹</span>
                                <input
                                    autoFocus
                                    type="number"
                                    className="w-20 bg-transparent text-white text-sm focus:outline-none"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={handleSaveEdit}
                                    onKeyDown={handleKeyDown}
                                />
                            </div>
                        ) : (
                            <span
                                onClick={() => handleStartEdit('Weekly', limits['Weekly'])}
                                className="text-xs bg-violet-500/20 text-violet-300 px-2 py-1 rounded cursor-pointer hover:bg-violet-500/30 transition-colors border border-transparent hover:border-violet-500/50"
                                title="Click to edit limit"
                            >
                                Limit: ₹{limits['Weekly'].toLocaleString()} ✏️
                            </span>
                        )}
                    </div>
                    <ProgressBar current={spentByBucket['Weekly']} total={limits['Weekly']} color="bg-violet-500" />
                    <p className="text-xs text-gray-500 mt-2 text-right">
                        {Math.round((spentByBucket['Weekly'] / limits['Weekly']) * 100) || 0}% Used
                    </p>
                </Card>

                {/* Monthly Expenses Card */}
                <Card glowColor="blue">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-gray-400 text-sm">Monthly Expenses</h3>
                            <p className="text-2xl font-mono font-bold mt-1 text-white">₹{spentByBucket['Monthly'].toLocaleString()}</p>
                        </div>
                        {editing === 'Monthly' ? (
                            <div className="flex items-center gap-2 bg-white/10 rounded p-1">
                                <span className="text-xs text-gray-400">₹</span>
                                <input
                                    autoFocus
                                    type="number"
                                    className="w-20 bg-transparent text-white text-sm focus:outline-none"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={handleSaveEdit}
                                    onKeyDown={handleKeyDown}
                                />
                            </div>
                        ) : (
                            <span
                                onClick={() => handleStartEdit('Monthly', limits['Monthly'])}
                                className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded cursor-pointer hover:bg-blue-500/30 transition-colors border border-transparent hover:border-blue-500/50"
                                title="Click to edit limit"
                            >
                                Limit: ₹{limits['Monthly'].toLocaleString()} ✏️
                            </span>
                        )}
                    </div>
                    <ProgressBar current={spentByBucket['Monthly']} total={limits['Monthly']} color="bg-blue-500" />
                    <p className="text-xs text-gray-500 mt-2 text-right">
                        {Math.round((spentByBucket['Monthly'] / limits['Monthly']) * 100) || 0}% Used
                    </p>
                </Card>

                {/* Savings Card */}
                <Card glowColor="emerald">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-gray-400 text-sm">Monthly Savings Goal</h3>
                            <div className="text-2xl font-mono font-bold mt-1 text-emerald-400">
                                {editing === 'Savings' ? (
                                    <div className="flex items-center gap-2 bg-white/10 rounded p-1">
                                        <span className="text-xs text-gray-400">₹</span>
                                        <input
                                            autoFocus
                                            type="number"
                                            className="w-32 bg-transparent text-white text-sm focus:outline-none"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onBlur={handleSaveEdit}
                                            onKeyDown={handleKeyDown}
                                        />
                                    </div>
                                ) : (
                                    <div className="flex items-baseline gap-2">
                                        <span>₹{remainingTotal.toLocaleString()}</span>
                                        <span
                                            className="text-xs text-gray-500 font-normal cursor-pointer hover:text-emerald-300 transition-colors"
                                            onClick={() => handleStartEdit('Savings', limits['Savings'])}
                                            title="Click to edit goal"
                                        >
                                            / ₹{limits['Savings'].toLocaleString()} Goal ✏️
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <span className="text-2xl">🏦</span>
                    </div>
                    {/* Progress Bar for Savings: Goal / Current */}
                    <ProgressBar current={remainingTotal} total={limits['Savings']} color="bg-emerald-500" />
                    <p className="text-xs text-gray-500 mt-2 text-right">
                        {Math.min(100, Math.round((remainingTotal / limits['Savings']) * 100))}% of Goal Reached
                    </p>
                </Card>
            </div>

            {/* Analytics Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <Card className="min-h-[300px] flex flex-col">
                    <h3 className="text-lg font-semibold mb-4 text-white">Expense Distribution</h3>
                    {pieData.length > 0 ? (
                        <div className="flex-1 w-full min-h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#1a1b26', borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-wrap gap-2 justify-center mt-4">
                                {pieData.map((entry, index) => (
                                    <div key={entry.name} className="flex items-center gap-1 text-xs text-gray-400">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                        {entry.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500">
                            No data to display
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

const ProgressBar = ({ current, total, color }: { current: number, total: number, color: string }) => {
    const percentage = Math.min(100, (current / total) * 100);
    return (
        <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
            <div
                className={`h-full ${color} transition-all duration-500 ease-out`}
                style={{ width: `${percentage}%` }}
            />
        </div>
    );
};
