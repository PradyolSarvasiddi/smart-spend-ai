import { db } from '../utils/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { Transaction, MonthlyStats, WeeklyStats, HistoryMeta, TransactionCategory } from '../types';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, getISOWeek, getYear } from 'date-fns';

const HISTORY_COLLECTION = 'history_months';
const SETTINGS_DOC = 'settings/meta';

class TimeService {

    // Generates IDs like "2025-W12"
    getCurrentWeekId(date = new Date()): string {
        return `${getYear(date)}-W${getISOWeek(date)}`;
    }

    // Generates IDs like "2025-03"
    getCurrentMonthId(date = new Date()): string {
        return format(date, 'yyyy-MM');
    }

    async init(userId: string) {
        if (!userId) return;

        console.log("TimeService: Initializing...");
        const metaRef = doc(db, 'users', userId, 'settings', 'meta');
        const metaSnap = await getDoc(metaRef);

        const now = new Date();
        const currentWeekId = this.getCurrentWeekId(now);
        const currentMonthId = this.getCurrentMonthId(now);

        if (!metaSnap.exists()) {
            // First run, initialize meta
            await setDoc(metaRef, {
                lastActiveWeek: currentWeekId,
                lastActiveMonth: currentMonthId
            });
            return;
        }

        const meta = metaSnap.data() as HistoryMeta;

        // Check for Week Change
        if (meta.lastActiveWeek !== currentWeekId) {
            console.log("TimeService: Week changed!", meta.lastActiveWeek, "->", currentWeekId);
            await this.archiveWeek(userId, meta.lastActiveWeek);
            await updateDoc(metaRef, { lastActiveWeek: currentWeekId });
        }

        // Check for Month Change
        if (meta.lastActiveMonth !== currentMonthId) {
            console.log("TimeService: Month changed!", meta.lastActiveMonth, "->", currentMonthId);
            await this.archiveMonth(userId, meta.lastActiveMonth);
            await updateDoc(metaRef, { lastActiveMonth: currentMonthId });
        }
    }

    private async archiveWeek(userId: string, weekId: string) {
        // 1. Fetch transactions for that week
        // Note: For simplicity, we are fetching ALL transactions and filtering. 
        // In production with huge data, we should query by date range.
        const txRef = collection(db, 'users', userId, 'transactions');
        const snap = await getDocs(txRef);
        const allTx = snap.docs.map(d => d.data() as Transaction);

        // Filter for this weekId (Need to reverse engineer date range or store weekId on tx)
        // Simplified: We assume 'archive' happens right after the week ends, so we look at 'last week' relative to now?
        // Actually, safer to filter by date.
        // weekId format: YYYY-WWW
        // This is tricky without exact dates stored. 
        // Strategy: We will calculate "Last Week" range dynamically.

        // BETTER STRATEGY: 
        // Just snapshot the *Current State* of weekly counters if we were storing them? 
        // No, user wants data derived from transactions.
        // So we calculate stats from transactions that fall into that week.

        // Parsing weekId back to date is hard. usage of 'date-fns' parseISO or similar needed?
        // Let's rely on transactions having 'date' field.

        const weekStats = this.calculateStatsForWeekId(allTx, weekId);

        // 2. Store in the Month Document
        // We find which month this week belongs to (mostly).
        const weekMonthId = weekId.substring(0, 4) + "-" + "01"; // Placeholder, actually need strict month
        // Actually, a week might span 2 months. 
        // Rule: A week belongs to the month its Start Date is in.

        // For MVP, let's just add it to the 'Current Month' of that time?
        // Let's store it in a dedicated 'history_weeks' subcollection for easier querying?
        // OR inside the month doc as requested.

        // Let's write to users/{uid}/history_weeks/{weekId} for safety first.
        await setDoc(doc(db, 'users', userId, 'history_weeks', weekId), weekStats);
    }

    private async archiveMonth(userId: string, monthId: string) {
        // Similar logic: Calculate stats for that month
        const txRef = collection(db, 'users', userId, 'transactions');
        const snap = await getDocs(txRef);
        const allTx = snap.docs.map(d => d.data() as Transaction);

        const monthStats = this.calculateStatsForMonthId(allTx, monthId);

        // Save to users/{uid}/history_months/{monthId}
        await setDoc(doc(db, 'users', userId, 'history_months', monthId), {
            ...monthStats,
            isFinalized: true
        });
    }

    // Helper: Calculate Stats
    private calculateStatsForWeekId(transactions: Transaction[], weekId: string): WeeklyStats {
        // This requires determining if a tx.date belongs to weekId.
        // We can use getISOWeek(tx.date) and getYear(tx.date)
        const relevantTx = transactions.filter(tx => {
            const d = new Date(tx.date);
            return `${getYear(d)}-W${getISOWeek(d)}` === weekId;
        });

        const stats: WeeklyStats = {
            weekId,
            startDate: '', // We could calculate this 
            endDate: '',
            totalSpent: 0,
            totalSaved: 0, // Logic for savings needed?
            categoryBreakdown: {},
            status: 'completed'
        };

        relevantTx.forEach(tx => {
            if (tx.category === 'Savings') {
                stats.totalSaved += tx.amount;
            } else {
                stats.totalSpent += tx.amount;
                stats.categoryBreakdown[tx.category] = (stats.categoryBreakdown[tx.category] || 0) + tx.amount;
            }
        });

        return stats;
    }

    private calculateStatsForMonthId(transactions: Transaction[], monthId: string): MonthlyStats {
        const relevantTx = transactions.filter(tx => {
            const d = new Date(tx.date);
            return format(d, 'yyyy-MM') === monthId;
        });

        const stats: MonthlyStats = {
            monthId,
            monthName: format(new Date(monthId + "-01"), 'MMMM yyyy'),
            totalSpent: 0,
            totalSaved: 0,
            categoryBreakdown: {},
            weeks: [], // populated differently if we link weeks
            isFinalized: true
        };

        relevantTx.forEach(tx => {
            if (tx.category === 'Savings') {
                stats.totalSaved += tx.amount;
            } else {
                stats.totalSpent += tx.amount;
                stats.categoryBreakdown[tx.category] = (stats.categoryBreakdown[tx.category] || 0) + tx.amount;
            }
        });

        return stats;
    }
}

export const timeService = new TimeService();
