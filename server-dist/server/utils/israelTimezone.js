/**
 * Israel Timezone Utilities - TypeScript Version
 * Handles automatic detection of DST (Daylight Saving Time) for Israel
 * Summer (IDT): UTC+3 (end of March to end of October)
 * Winter (IST): UTC+2 (end of October to end of March)
 */
/**
 * Check if a given date is during Israel's Daylight Saving Time (summer)
 * DST starts: Last Friday before April 1st
 * DST ends: Last Sunday of October
 */
export function isIsraelDST(date) {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-based (0 = January, 8 = September, 9 = October)
    const day = date.getDate();
    // DST is roughly from end of March to end of October
    if (month < 2 || month > 9) {
        // January, February, November, December - definitely winter
        return false;
    }
    if (month > 2 && month < 9) {
        // April through September - definitely summer (months 3-8)
        return true;
    }
    // March (month = 2) - check if after last Friday before April 1st
    if (month === 2) {
        // Find last Friday before April 1st
        let lastFridayMarch = 31;
        // Work backwards from March 31st to find last Friday
        for (let d = 31; d >= 25; d--) {
            const testDate = new Date(year, 2, d);
            if (testDate.getDay() === 5) { // Friday
                lastFridayMarch = d;
                break;
            }
        }
        return day >= lastFridayMarch;
    }
    // October (month = 9) - check if before last Sunday
    if (month === 9) {
        // Find last Sunday of October
        let lastSundayOct = 31;
        // Work backwards from October 31st to find last Sunday
        for (let d = 31; d >= 25; d--) {
            const testDate = new Date(year, 9, d);
            if (testDate.getDay() === 0) { // Sunday
                lastSundayOct = d;
                break;
            }
        }
        return day < lastSundayOct;
    }
    return false;
}
/**
 * Get Israel timezone offset in hours for a given date
 * Returns +2 for winter (IST) or +3 for summer (IDT)
 */
export function getIsraelTimezoneOffset(date) {
    return isIsraelDST(date) ? 3 : 2;
}
/**
 * Convert UTC time to Israel local time
 */
export function utcToIsraelTime(utcDate) {
    const offset = getIsraelTimezoneOffset(utcDate);
    return new Date(utcDate.getTime() + (offset * 60 * 60 * 1000));
}
/**
 * Convert Israel local time to UTC
 */
export function israelTimeToUtc(israelDate) {
    const offset = getIsraelTimezoneOffset(israelDate);
    return new Date(israelDate.getTime() - (offset * 60 * 60 * 1000));
}
/**
 * Format Israel time for display
 */
export function formatIsraelTime(date) {
    const israelTime = utcToIsraelTime(date);
    return israelTime.toLocaleString('he-IL');
}
/**
 * Get current Israel time
 */
export function getCurrentIsraelTime() {
    return utcToIsraelTime(new Date());
}
/**
 * Debug function to log timezone information
 */
export function logTimezoneInfo(label, utcTime) {
    const israelTime = utcToIsraelTime(utcTime);
    const offset = getIsraelTimezoneOffset(utcTime);
    const isDST = isIsraelDST(utcTime);
    console.log(`🕐 ${label}:`, {
        UTC: utcTime.toISOString(),
        Israel: israelTime.toLocaleString('he-IL'),
        Offset: `UTC+${offset}`,
        DST: isDST ? 'Summer (IDT)' : 'Winter (IST)'
    });
}
