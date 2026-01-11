import { BudgetState, Transaction } from '../types';
import { db } from '../utils/firebase';
import {
    doc,
    getDoc,
    setDoc,
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    query,
    orderBy
} from 'firebase/firestore';

// Interface for Data Persistence
export interface IStorageService {
    loadBudget(userId: string): Promise<BudgetState>;
    saveBudget(userId: string, budget: BudgetState): Promise<void>;
    loadTransactions(userId: string): Promise<Transaction[]>;
    // New atomic methods for cloud optimization
    addTransaction(userId: string, transaction: Transaction): Promise<void>;
    deleteTransaction(userId: string, transactionId: string): Promise<void>;

    // Legacy support (to be deprecated or mapped to batch in future)
    saveTransactions(userId: string, transactions: Transaction[]): Promise<void>;
    migrateLegacyData(newUserId: string): void;
}

class FirebaseStorageService implements IStorageService {

    async loadBudget(userId: string): Promise<BudgetState> {
        try {
            const docRef = doc(db, 'users', userId, 'settings', 'budget');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data() as BudgetState;
                // Schema migration checks (Daily -> Weekly)
                if (data.allocations.weeklyLimit === undefined && (data.allocations as any).dailyLimit) {
                    const daily = (data.allocations as any).dailyLimit || 0;
                    data.allocations.weeklyLimit = daily * 7;
                }

                // Ensure weeklyCategoryLimits exists
                if (!data.allocations.weeklyCategoryLimits) {
                    data.allocations.weeklyCategoryLimits = {
                        Groceries: 0,
                        Outings: 0,
                        BodyCare: 0,
                        Orders: 0,
                        Miscellaneous: 0,
                        Petrol: 0
                    };
                }
                return data;
            }
        } catch (error) {
            console.error("Error loading budget:", error);
        }

        return {
            monthlyIncome: 0,
            allocations: {
                weeklyLimit: 0,
                monthlyLimit: 0,
                savingsTarget: 0,
                weeklyCategoryLimits: {
                    Groceries: 0,
                    Outings: 0,
                    BodyCare: 0,
                    Orders: 0,
                    Miscellaneous: 0,
                    Petrol: 0
                }
            },
            isSet: false,
        };
    }

    async saveBudget(userId: string, budget: BudgetState): Promise<void> {
        try {
            const docRef = doc(db, 'users', userId, 'settings', 'budget');
            await setDoc(docRef, budget);
        } catch (error) {
            console.error("Error saving budget:", error);
        }
    }

    async loadTransactions(userId: string): Promise<Transaction[]> {
        try {
            const q = query(collection(db, 'users', userId, 'transactions'), orderBy('timestamp', 'desc'));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        } catch (error) {
            console.error("Error loading transactions:", error);
            return [];
        }
    }

    // Optimized: Add single transaction
    async addTransaction(userId: string, transaction: Transaction): Promise<void> {
        try {
            // Use transaction.id as document ID to ensure idempotency if needed, 
            // or let Firestore generate one. 
            // Since we generate IDs in frontend (Date.now()), let's use that as doc ID
            const docRef = doc(db, 'users', userId, 'transactions', transaction.id);
            await setDoc(docRef, transaction);
        } catch (error) {
            console.error("Error adding transaction:", error);
        }
    }

    // Optimized: Delete single transaction
    async deleteTransaction(userId: string, transactionId: string): Promise<void> {
        try {
            await deleteDoc(doc(db, 'users', userId, 'transactions', transactionId));
        } catch (error) {
            console.error("Error deleting transaction:", error);
        }
    }

    async saveTransactions(userId: string, transactions: Transaction[]): Promise<void> {
        // Deprecated for full array save in Cloud
        // For migration or safety, we could implement batch write here, 
        // but strictly we should use add/delete.
        // We will leave this empty or log warning, assuming App.tsx is updated to use atomic methods.
        console.warn("saveTransactions (bulk) is deprecated for Firebase. Use addTransaction/deleteTransaction.");
    }

    migrateLegacyData(newUserId: string): void {
        const legacyBudget = localStorage.getItem('smartspend_budget');
        const legacyTx = localStorage.getItem('smartspend_transactions');

        if (legacyBudget) {
            const budget = JSON.parse(legacyBudget);
            this.saveBudget(newUserId, budget);
            // localStorage.removeItem('smartspend_budget'); // Optional cleanup
        }
        if (legacyTx) {
            const transactions = JSON.parse(legacyTx) as Transaction[];
            // Batch upload legacy transactions
            transactions.forEach(tx => this.addTransaction(newUserId, tx));
            // localStorage.removeItem('smartspend_transactions');
        }
    }
}

export const storageService = new FirebaseStorageService();
