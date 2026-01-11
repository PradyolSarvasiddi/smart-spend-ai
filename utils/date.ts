export const isSameWeek = (date1: Date, date2: Date): boolean => {
    // Clone dates to avoid mutating original
    const d1 = new Date(date1);
    const d2 = new Date(date2);

    // Set to start of day to avoid time issues
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);

    // Get day of week (0 is Sunday, 1 is Monday...)
    // Let's assume week starts on Monday as per ISO 8601 common usage or User request "Handle different start-of-week"
    // We will stick to Monday start for now.

    const day1 = d1.getDay() || 7; // Make Sunday 7
    const day2 = d2.getDay() || 7;

    // Set to nearest Monday
    if (day1 !== 1) d1.setHours(-24 * (day1 - 1));
    if (day2 !== 1) d2.setHours(-24 * (day2 - 1));

    // Check if same Monday
    // Actually, setting hours with negative works, but clearer:
    // d.setDate(d.getDate() - (day - 1));

    const getMonday = (d: Date) => {
        const date = new Date(d);
        const day = date.getDay() || 7;
        if (day !== 1) date.setHours(-24 * (day - 1));
        return date.toDateString(); // Compare string representation of the Monday
    };

    return getMonday(date1) === getMonday(date2);
};

export const getWeekRange = (date: Date): { start: Date, end: Date } => {
    const start = new Date(date);
    const day = start.getDay() || 7; // Make Sunday 7
    start.setDate(start.getDate() - (day - 1));
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
};
