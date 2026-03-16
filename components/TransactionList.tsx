import React from 'react';
import { Transaction } from '../types';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete }) => {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        <p className="text-4xl mb-2">🍃</p>
        <p>No transactions yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-24">
      {transactions.map((t) => {
        const isIncome = t.type === 'income' || t.category === 'Income';
        return (
          <div 
            key={t.id} 
            className={`group flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
              isIncome 
                ? 'bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/10' 
                : 'bg-white/5 hover:bg-white/10 border-white/5'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl bg-gradient-to-br ${getCategoryColor(t.category)}`}>
                {getCategoryEmoji(t.category)}
              </div>
              <div>
                <p className="font-semibold text-white">{t.description}</p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{new Date(t.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  <span>•</span>
                  <span>{new Date(t.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>•</span>
                  <span className="bg-white/5 px-2 py-0.5 rounded">{t.category}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-lg font-mono font-medium ${isIncome ? 'text-emerald-400' : 'text-white'}`}>
                {isIncome ? '+' : '-'}₹{t.amount.toLocaleString()}
              </span>
              <button 
                onClick={() => onDelete(t.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-red-400 transition-opacity"
                aria-label="Delete"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

function getCategoryEmoji(category: string): string {
    const map: Record<string, string> = {
      Groceries: '🥦',
      Outings: '🎉',
      BodyCare: '🧴',
      Orders: '📦',
      Petrol: '⛽',
      Miscellaneous: '🧩',
      Bills: '⚡',
      Savings: '🏦',
      Income: '💰',
      Other: '📝'
    };
    return map[category] || '📝';
}

function getCategoryColor(category: string): string {
    const map: Record<string, string> = {
        Groceries: 'from-green-500/20 to-emerald-500/20 text-green-400',
        Outings: 'from-pink-500/20 to-rose-500/20 text-pink-400',
        BodyCare: 'from-purple-500/20 to-fuchsia-500/20 text-purple-400',
        Orders: 'from-orange-500/20 to-amber-500/20 text-orange-400',
        Petrol: 'from-yellow-500/20 to-orange-500/20 text-yellow-400',
        Miscellaneous: 'from-indigo-500/20 to-violet-500/20 text-indigo-400',
        Bills: 'from-blue-500/20 to-cyan-500/20 text-blue-400',
        Savings: 'from-teal-500/20 to-cyan-500/20 text-teal-400',
        Income: 'from-emerald-500/20 to-green-500/20 text-emerald-400',
        Other: 'from-gray-500/20 to-gray-400/20 text-gray-400'
    };
    return map[category] || map['Other'];
}
