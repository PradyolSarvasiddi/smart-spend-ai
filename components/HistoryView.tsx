import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../context/AuthContext';
import { MonthlyStats, TransactionCategory } from '../types';
import { Card } from './ui/Card';

export const HistoryView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { user } = useAuth();
    const [months, setMonths] = useState<MonthlyStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState<MonthlyStats | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!user) return;
            try {
                // Fetch archived months
                const q = query(
                    collection(db, 'users', user.id, 'history_months'),
                    orderBy('monthId', 'desc')
                );
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => doc.data() as MonthlyStats);
                setMonths(data);
            } catch (error) {
                console.error("Error fetching history:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [user]);

    if (loading) {
        return <div className="p-8 text-center text-gray-400">Loading history...</div>;
    }

    // Detail View of a specific month
    if (selectedMonth) {
        return (
            <div className="space-y-6 animate-fade-in-up">
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => setSelectedMonth(null)}
                        className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
                    >
                        ← Back
                    </button>
                    <h2 className="text-2xl font-bold">{selectedMonth.monthName}</h2>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-emerald-500/10 border-emerald-500/20">
                        <p className="text-sm text-gray-400">Total Spent</p>
                        <p className="text-2xl font-bold text-emerald-400">₹{selectedMonth.totalSpent.toLocaleString()}</p>
                    </Card>
                    <Card className="bg-violet-500/10 border-violet-500/20">
                        <p className="text-sm text-gray-400">Total Saved</p>
                        <p className="text-2xl font-bold text-violet-400">₹{selectedMonth.totalSaved.toLocaleString()}</p>
                    </Card>
                </div>

                {/* Category Breakdown */}
                <h3 className="text-lg font-bold mt-8 mb-4">Category Breakdown</h3>
                <div className="grid gap-3">
                    {Object.entries(selectedMonth.categoryBreakdown).map(([cat, amount]) => (
                        <div key={cat} className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
                            <span className="text-gray-300">{cat}</span>
                            <span className="font-mono font-medium">₹{amount.toLocaleString()}</span>
                        </div>
                    ))}
                </div>

                {/* Weeks Breakdown (if available) */}
                {selectedMonth.weeks && selectedMonth.weeks.length > 0 && (
                    <>
                        <h3 className="text-lg font-bold mt-8 mb-4">Weekly Summary</h3>
                        <div className="space-y-3">
                            {selectedMonth.weeks.map(week => (
                                <Card key={week.weekId} className="bg-white/5 border-white/5 flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-white">Week {week.weekId.split('-W')[1]}</p>
                                        <p className="text-xs text-gray-500">{week.startDate ? `${week.startDate} - ${week.endDate}` : 'Dates n/a'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-emerald-400">₹{week.totalSpent.toLocaleString()}</p>
                                        <p className="text-xs text-violet-400">Saved ₹{week.totalSaved}</p>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
                >
                    ← Dashboard
                </button>
                <h2 className="text-2xl font-bold">Financial History</h2>
            </div>

            {months.length === 0 ? (
                <div className="text-center py-20 text-gray-500 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                    <p>No history records found yet.</p>
                    <p className="text-sm mt-2">Monthly records will appear here after the first month ends.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {months.map(month => (
                        <div
                            key={month.monthId}
                            onClick={() => setSelectedMonth(month)}
                            className="bg-white/5 border border-white/10 p-5 rounded-2xl hover:bg-white/10 transition-all cursor-pointer group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                                        {month.monthName}
                                    </h3>
                                    <span className="text-xs text-gray-500 uppercase tracking-wider">{month.monthId}</span>
                                </div>
                                <div className="p-2 bg-white/5 rounded-full group-hover:bg-emerald-500/20 transition-colors">
                                    <span className="text-xl">➔</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-xs text-gray-400 mb-1">Total Spent</p>
                                    <p className="text-lg font-mono text-emerald-400">₹{month.totalSpent.toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-400 mb-1">Saved</p>
                                    <p className="text-lg font-mono text-violet-400">₹{month.totalSaved.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
