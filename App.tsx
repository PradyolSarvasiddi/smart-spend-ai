import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/auth/Login';
import { Signup } from './components/auth/Signup';
import { BudgetSetup } from './components/BudgetSetup';
import { Dashboard } from './components/Dashboard';
import { TransactionInput } from './components/TransactionInput';
import { TransactionList } from './components/TransactionList';
import { SpendingsSummary } from './components/SpendingsSummary';
import { WeeklySpending } from './components/WeeklySpending';
import { BudgetState, Transaction, ParsedExpense, TransactionCategory } from './types';
import { storageService } from './services/storage';
import { timeService } from './services/time';
import { HistoryView } from './components/HistoryView';
import ErrorBoundary from './components/ErrorBoundary';

const AuthenticatedApp: React.FC = () => {
  const { user, logout } = useAuth();
  const [budget, setBudget] = useState<BudgetState | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [view, setView] = useState<'dashboard' | 'history' | 'summary' | 'weekly'>('dashboard');
  const [filter, setFilter] = useState<TransactionCategory | 'All'>('All');
  const [loadingData, setLoadingData] = useState(true);

  // Load Data on Mount
  useEffect(() => {
    if (user?.id) {
      const initData = async () => {
        // Initialize Time Service (Check for Week/Month resets)
        await timeService.init(user.id);

        const loadedBudget = await storageService.loadBudget(user.id);
        const loadedTx = await storageService.loadTransactions(user.id);

        // Legacy migration check
        if (!loadedBudget.isSet && localStorage.getItem('smartspend_budget')) {
          storageService.migrateLegacyData(user.id);
          const reLoadedBudget = await storageService.loadBudget(user.id);
          const reLoadedTx = await storageService.loadTransactions(user.id);
          setBudget(reLoadedBudget);
          setTransactions(reLoadedTx);
        } else {
          setBudget(loadedBudget);
          setTransactions(loadedTx);
        }
        setLoadingData(false);
      };
      initData();
    }
  }, [user?.id]);

  // Persist Data on Change
  useEffect(() => {
    if (user?.id && budget) {
      storageService.saveBudget(user.id, budget);
    }
  }, [budget, user?.id]);

  // Transaction persistence is now handled atomically via add/delete handlers


  const handleBudgetComplete = (newBudget: BudgetState) => {
    setBudget(newBudget);
  };

  const handleAddTransaction = async (parsed: ParsedExpense) => {
    if (!parsed.amount || !parsed.category || !user?.id) return;
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      amount: parsed.amount,
      category: parsed.category,
      description: parsed.description,
      date: parsed.date.toISOString(),
      timestamp: Date.now(),
    };

    // Add to Cloud (Optimistic UI: update local first, or wait? Let's add then update)
    // Actually for speed, let's just trigger it.
    await storageService.addTransaction(user.id, newTransaction);

    setTransactions(prev => {
      const updated = [newTransaction, ...prev];
      // Trigger notification check
      import('./utils/alerts').then(({ generateAlerts, checkAndSendNotifications }) => {
        if (budget) {
          const alerts = generateAlerts(budget, updated);
          checkAndSendNotifications(alerts);
        }
      });
      return updated;
    });
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!user?.id) return;
    await storageService.deleteTransaction(user.id, id);
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const filteredTransactions = transactions.filter(t =>
    filter === 'All' ? true : t.category === filter
  );

  if (loadingData || !budget) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // If budget not set, show setup
  if (!budget.isSet) {
    return <BudgetSetup onComplete={handleBudgetComplete} />;
  }

  if (view === 'summary') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <div className="max-w-4xl mx-auto px-4 pt-6">
          <SpendingsSummary transactions={transactions} onBack={() => setView('dashboard')} />
        </div>
      </div>
    );
  }

  if (view === 'history') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <div className="max-w-4xl mx-auto px-4 pt-6">
          <HistoryView onBack={() => setView('dashboard')} />
        </div>
      </div>
    );
  }

  if (view === 'weekly') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <div className="max-w-4xl mx-auto px-4 pt-6">
          <WeeklySpending
            transactions={transactions}
            budget={budget}
            onUpdateBudget={handleBudgetComplete}
            onBack={() => setView('dashboard')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-32">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-violet-900/10 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[-20%] w-[50%] h-[50%] bg-emerald-900/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-6 relative z-10">
        {/* Top Bar */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-violet-500">
            SmartSpend AI
          </h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => import('./services/notifications').then(({ notificationService }) => notificationService.requestPermission())}
              className="p-2 text-gray-400 hover:text-emerald-400 transition-colors"
              title="Enable Notifications"
            >
              🔔
            </button>
            <div className="text-sm text-gray-400">
              Hello, <span className="text-white">{user?.name}</span>
            </div>
            <button
              onClick={logout}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-6 sticky top-0 bg-[#0a0a0f]/90 backdrop-blur-md z-30 py-4 -mx-4 px-4 border-b border-white/5">
          <button
            onClick={() => setView('dashboard')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${view === 'dashboard' ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setView('history')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${view === 'history' ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
          >
            Monthly History
          </button>
        </div>

        {view === 'dashboard' ? (
          <>
            <Dashboard
              budget={budget}
              transactions={transactions}
              onUpdateBudget={handleBudgetComplete}
              onResetBudget={() => setBudget({ ...budget, isSet: false })}
              onViewSummary={() => setView('summary')}
              onViewWeekly={() => setView('weekly')}
            />

            <div className="mt-8">
              <h3 className="text-xl font-bold mb-4">Add Transaction</h3>
              <TransactionInput onAddTransaction={handleAddTransaction} />
            </div>

            <div className="mt-8">
              <h3 className="text-xl font-bold mb-4">Recent Activity</h3>
              <TransactionList
                transactions={transactions.slice(0, 5)}
                onDelete={handleDeleteTransaction}
              />
            </div>
          </>
        ) : (
          <div className="min-h-screen">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Transaction History</h3>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as TransactionCategory | 'All')}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="All">All Categories</option>
                <option value="Food">Food</option>
                <option value="Shopping">Shopping</option>
                <option value="Bills">Bills</option>
                <option value="Transport">Transport</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <TransactionList
              transactions={filteredTransactions}
              onDelete={handleDeleteTransaction}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const AppRoutes: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  if (!user) {
    return authView === 'login'
      ? <Login onSwitchToSignup={() => setAuthView('signup')} />
      : <Signup onSwitchToLogin={() => setAuthView('login')} />;
  }

  return <AuthenticatedApp />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AuthProvider>
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
      </AuthProvider>
    </AuthProvider>
  );
};

export default App;
