import React, { useMemo, useState } from 'react';
import { Transaction } from '../types';
import { generateAnalytics } from '../utils/analytics';
import { Card } from './ui/Card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

interface SpendingsSummaryProps {
    transactions: Transaction[];
    onBack: () => void;
}

export const SpendingsSummary: React.FC<SpendingsSummaryProps> = ({ transactions, onBack }) => {
    const { totalSpent, breakdown, topCategories, personalPurchases, insights } = useMemo(
        () => generateAnalytics(transactions),
        [transactions]
    );

    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const categoryTransactions = selectedCategory
        ? transactions.filter(t => t.category === selectedCategory)
        : [];

    const COLORS = ['#10b981', '#8b5cf6', '#f59e0b', '#3b82f6', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e'];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                >
                    ← Back
                </button>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                    Spendings Summary
                </h1>
            </div>

            {/* Smart Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-gradient-to-br from-[#1a1b26] to-[#13141c] border-indigo-500/20">
                    <h3 className="text-indigo-400 font-medium mb-3 flex items-center gap-2">
                        <span>✨</span> Smart Insights
                    </h3>
                    {insights.length > 0 ? (
                        <ul className="space-y-3">
                            {insights.map((insight, i) => (
                                <li key={i} className="text-sm text-gray-300 flex gap-2">
                                    <span className="text-indigo-500">•</span>
                                    {insight}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-gray-500">Add more transactions to generate insights.</p>
                    )}
                </Card>
                <Card>
                    <h3 className="text-gray-400 font-medium mb-1">Total Spending</h3>
                    <p className="text-4xl font-mono font-bold text-white mb-2">₹{totalSpent.toLocaleString()}</p>
                    <div className="text-sm text-gray-500">
                        Across {transactions.length} transactions
                    </div>
                </Card>
            </div>

            {/* Category Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Chart */}
                <Card className="min-h-[400px]">
                    <h3 className="text-lg font-semibold mb-6 text-white">Expense Distribution</h3>
                    <div className="w-full h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={breakdown}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={110}
                                    paddingAngle={5}
                                    dataKey="amount"
                                    nameKey="name"
                                >
                                    {breakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: '#1a1b26', borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value: number) => `₹${value.toLocaleString()}`}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    formatter={(value, entry: any) => <span className="text-gray-400 text-xs ml-1">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Detailed List */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Category Details</h3>
                    <p className="text-xs text-gray-500">Click a category to see all transactions</p>
                    {breakdown.map((item, index) => (
                        <div 
                            key={item.name} 
                            className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                            onClick={() => setSelectedCategory(item.name)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                <div>
                                    <p className="text-sm font-medium text-gray-200">{item.name}</p>
                                    <p className="text-xs text-gray-500">{item.count} transactions</p>
                                </div>
                            </div>
                            <div className="text-right flex items-center gap-3">
                                <div>
                                    <p className="text-sm font-mono font-bold text-gray-200">₹{item.amount.toLocaleString()}</p>
                                    <p className="text-xs text-gray-500">{item.percentage}%</p>
                                </div>
                                <span className="text-gray-500 text-xs">▶</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Personal Purchases Section */}
            {personalPurchases.length > 0 && (
                <div className="mt-8">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <span>🛍️</span> Personal Purchases
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {personalPurchases.map(t => (
                            <Card key={t.id} className="hover:border-indigo-500/30 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs text-gray-500">{new Date(t.date).toLocaleDateString()}</span>
                                    <span className="text-indigo-400 font-mono">₹{t.amount.toLocaleString()}</span>
                                </div>
                                <p className="text-gray-200 font-medium truncate" title={t.description}>
                                    {t.description}
                                </p>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Category Drill-Down Modal */}
            {selectedCategory && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedCategory(null)}>
                    <div className="bg-[#1a1b26] border border-white/10 rounded-2xl w-full max-w-lg max-h-[70vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-white/10">
                            <div>
                                <h3 className="text-lg font-bold text-white">{selectedCategory}</h3>
                                <p className="text-xs text-gray-400">{categoryTransactions.length} transactions • ₹{categoryTransactions.reduce((s, t) => s + t.amount, 0).toLocaleString()}</p>
                            </div>
                            <button onClick={() => setSelectedCategory(null)} className="p-2 text-gray-400 hover:text-white transition-colors hover:bg-white/10 rounded-lg">
                                ✕
                            </button>
                        </div>
                        <div className="overflow-y-auto max-h-[55vh] p-4 space-y-2">
                            {categoryTransactions.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">No transactions in this category</p>
                            ) : (
                                categoryTransactions.map(t => (
                                    <div key={t.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                                        <div>
                                            <p className="text-sm font-medium text-white">{t.description}</p>
                                            <p className="text-xs text-gray-500">
                                                {new Date(t.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                                {' • '}
                                                {new Date(t.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <span className="font-mono font-bold text-white">₹{t.amount.toLocaleString()}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
