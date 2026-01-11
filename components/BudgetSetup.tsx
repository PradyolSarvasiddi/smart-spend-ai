import React, { useState, useEffect } from 'react';
import { BudgetState } from '../types';
import { Card } from './ui/Card';

interface BudgetSetupProps {
  onComplete: (budget: BudgetState) => void;
}

export const BudgetSetup: React.FC<BudgetSetupProps> = ({ onComplete }) => {
  const [income, setIncome] = useState<string>('');
  const [allocations, setAllocations] = useState({
    weeklyLimit: 0,
    monthlyLimit: 0,
    savingsTarget: 0,
  });

  // Smart Defaults: 50% Monthly, 30% Weekly, 20% Savings
  // Only apply when income changes and user hasn't heavily customized yet
  const handleIncomeChange = (val: string) => {
    setIncome(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setAllocations({
        monthlyLimit: Math.floor(num * 0.5), // 50% Needs/Bills
        weeklyLimit: Math.floor((num * 0.3) / 4), // 30% Wants / 4 weeks
        savingsTarget: Math.floor(num * 0.2), // 20% Savings
      });
    }
  };

  const handleAllocationChange = (key: keyof typeof allocations, val: string) => {
    const num = parseFloat(val);
    setAllocations(prev => ({
      ...prev,
      [key]: isNaN(num) ? 0 : num
    }));
  };

  const totalAllocated = (allocations.weeklyLimit * 4) + allocations.monthlyLimit + allocations.savingsTarget;
  const incomeNum = parseFloat(income) || 0;
  const remaining = incomeNum - totalAllocated;
  const isValid = incomeNum > 0 && allocations.weeklyLimit > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      onComplete({
        monthlyIncome: incomeNum,
        allocations,
        isSet: true,
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#0a0a0f]">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/20 rounded-full blur-[100px]" />
      </div>

      <Card className="w-full max-w-lg relative z-10 animate-fade-in-up">
        <h1 className="text-3xl font-bold text-center mb-2 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-violet-500">
          SmartSpend AI
        </h1>
        <p className="text-gray-400 text-center mb-8">Set your financial controls.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Income Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Monthly Income</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">₹</span>
              <input
                type="number"
                value={income}
                onChange={(e) => handleIncomeChange(e.target.value)}
                placeholder="50000"
                className="w-full bg-black/20 border border-white/10 rounded-xl py-4 pl-10 pr-4 text-2xl font-mono text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Distribution</span>
              <span className={remaining < 0 ? 'text-red-400' : 'text-emerald-400'}>
                {remaining >= 0 ? 'Remaining: ' : 'Over Budget: '}
                ₹{Math.abs(remaining).toLocaleString()}
              </span>
            </div>

            {/* Weekly Limit Input */}
            <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center gap-4">
              <div className="bg-violet-500/20 p-3 rounded-lg text-2xl">📅</div>
              <div className="flex-1">
                <label className="block text-xs text-violet-300 uppercase font-bold tracking-wider mb-1">Weekly Limit</label>
                <input
                  type="number"
                  value={allocations.weeklyLimit || ''}
                  onChange={(e) => handleAllocationChange('weeklyLimit', e.target.value)}
                  placeholder="2500"
                  className="w-full bg-transparent border-none text-white text-xl font-mono p-0 focus:ring-0 placeholder-gray-600"
                />
              </div>
            </div>

            {/* Monthly Expenses Input */}
            <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center gap-4">
              <div className="bg-blue-500/20 p-3 rounded-lg text-2xl">🧾</div>
              <div className="flex-1">
                <label className="block text-xs text-blue-300 uppercase font-bold tracking-wider mb-1">Monthly Expenses</label>
                <input
                  type="number"
                  value={allocations.monthlyLimit || ''}
                  onChange={(e) => handleAllocationChange('monthlyLimit', e.target.value)}
                  placeholder="25000"
                  className="w-full bg-transparent border-none text-white text-xl font-mono p-0 focus:ring-0 placeholder-gray-600"
                />
              </div>
            </div>

            {/* Savings Input */}
            <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center gap-4">
              <div className="bg-emerald-500/20 p-3 rounded-lg text-2xl">🏦</div>
              <div className="flex-1">
                <label className="block text-xs text-emerald-300 uppercase font-bold tracking-wider mb-1">Savings Goal</label>
                <input
                  type="number"
                  value={allocations.savingsTarget || ''}
                  onChange={(e) => handleAllocationChange('savingsTarget', e.target.value)}
                  placeholder="10000"
                  className="w-full bg-transparent border-none text-white text-xl font-mono p-0 focus:ring-0 placeholder-gray-600"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={!isValid}
            className={`w-full py-4 rounded-xl text-lg font-semibold transition-all duration-300 ${isValid
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transform hover:-translate-y-1'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
          >
            Start Tracking
          </button>
        </form>
      </Card>
    </div>
  );
};
