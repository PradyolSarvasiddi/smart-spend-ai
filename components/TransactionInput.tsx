import React, { useState, useRef, useEffect } from 'react';
import { parseExpenseInput, parseMultipleExpenses } from '../utils/parser';
import { parseExpenseWithAI } from '../utils/groq';
import { ParsedExpense } from '../types';

interface TransactionInputProps {
  onAddTransaction: (expense: ParsedExpense) => void;
}

export const TransactionInput: React.FC<TransactionInputProps> = ({ onAddTransaction }) => {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [preview, setPreview] = useState<ParsedExpense[] | null>(null); // Changed type to array
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Actually, let's rewrite the effect to be cleaner and correct with cleanup
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;

    if (input.trim().length > 3) {
      // 1. Instant Sync
      const syncParsed = parseMultipleExpenses(input);
      setPreview(syncParsed.length > 0 ? syncParsed : null);

      // 2. AI Upgrade
      debounceTimer = setTimeout(async () => {
        try {
          const aiParsed = await parseExpenseWithAI(input);
          if (aiParsed && aiParsed.length > 0) {
            setPreview(aiParsed);
          }
        } catch (e) {
          // Silent fail
        }
      }, 800);
    } else {
      setPreview(null);
    }

    return () => clearTimeout(debounceTimer);
  }, [input]);


  const handleSubmit = async () => {
    if (preview && preview.length > 0) {
      preview.forEach(item => onAddTransaction(item));
      setInput('');
      setPreview(null);
    } else {
      // Fallback immediate parse if user types fast and hits enter
      const syncParsed = parseMultipleExpenses(input);
      if (syncParsed.length > 0) {
        syncParsed.forEach(item => onAddTransaction(item));
        setInput('');
        setPreview(null);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={`fixed bottom-0 left-0 w-full p-4 z-50 transition-all duration-300 ${isFocused ? 'pb-4' : 'pb-4'}`}>
      <div className="max-w-4xl mx-auto relative">
        {/* Preview Bubble */}
        {preview && isFocused && (
          <div className="absolute bottom-full left-0 mb-4 w-full animate-bounce-slight max-h-60 overflow-y-auto custom-scrollbar">
            <div className="bg-[#1a1b26]/90 backdrop-blur-md border border-emerald-500/30 text-white p-4 rounded-xl shadow-lg">
              <div className="flex justify-between items-center mb-2 border-b border-white/10 pb-2">
                <span className="text-xs text-emerald-400 font-medium tracking-wide">DETECTED {preview.length} ITEMS</span>
                <span className="text-xs text-gray-400">Total: ₹{preview.reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString()}</span>
              </div>
              <div className="space-y-3">
                {preview.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-lg">
                        {getCategoryEmoji(item.category || 'Other')}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-emerald-300">
                          {item.description}
                        </p>
                        <p className="text-xs text-gray-500">{item.category}</p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-white">₹{item.amount?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-center">
                <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded uppercase">Press Enter to Add All</span>
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className={`glass-input rounded-2xl p-2 flex items-end gap-2 transition-all duration-300 ${isFocused ? 'shadow-[0_0_30px_rgba(139,92,246,0.2)]' : ''}`}>
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              onKeyDown={handleKeyDown}
              placeholder="Type naturally... 'Spent 200 on burgers, 500 on taxi'"
              className="w-full bg-transparent border-none text-white placeholder-gray-500 text-lg p-3 resize-none focus:ring-0 max-h-24 font-medium"
              rows={1}
              style={{ minHeight: '3rem' }}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!preview || preview.length === 0}
            className={`p-4 rounded-xl transition-all duration-200 ${preview && preview.length > 0
              ? 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg'
              : 'bg-white/10 text-gray-500 cursor-not-allowed'
              }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>
        </div>
      </div>
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
    Other: '📝'
  };
  return map[category] || '📝';
}
