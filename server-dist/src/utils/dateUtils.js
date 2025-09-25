/**
 * Date utility functions for handling timezone issues
 * These functions ensure consistent date/time handling across the application
 * All times are handled as Jerusalem time (UTC+2/UTC+3)
 */
/**
 * Normalizes time string to HH:MM format
 * Removes seconds if present and ensures consistent format
 *
 * @param timeString - Time string in various formats (HH:MM, HH:MM:SS, etc.)
 * @returns Normalized time string in HH:MM format
 */
export function normalizeTimeString(timeString) {
    if (!timeString)
        return '00:00';
    // Split by colon and take only hours and minutes
    const timeParts = timeString.split(':');
    if (timeParts.length >= 2) {
        const hours = timeParts[0].padStart(2, '0');
        const minutes = timeParts[1].padStart(2, '0');
        return `${hours}:${minutes}`;
    }
    return '00:00';
}
/**
 * Gets the current Jerusalem time offset in minutes
 * Jerusalem is UTC+2 in winter and UTC+3 in summer
 *
 * @returns Timezone offset in minutes
 */
export function getJerusalemTimezoneOffset() {
    // Jerusalem timezone is UTC+2 (winter) or UTC+3 (summer)
    // We'll use a simple approach: assume UTC+3 (summer time)
    // In a production app, you'd want to use a proper timezone library
    return -180; // UTC+3 = -180 minutes offset from UTC
}
/**
 * Converts a local time to Jerusalem time for display
 * This ensures all times are displayed consistently in Jerusalem timezone
 *
 * @param date - Date object to convert
 * @returns Date object adjusted to Jerusalem time
 */
export function toJerusalemTime(date) {
    const jerusalemOffset = getJerusalemTimezoneOffset();
    const localOffset = date.getTimezoneOffset();
    const offsetDiff = jerusalemOffset - localOffset;
    return new Date(date.getTime() + (offsetDiff * 60000));
}
/**
 * Converts a Jerusalem time to local time for storage
 * This ensures the time is stored correctly in the database
 *
 * @param date - Date object in Jerusalem time
 * @returns Date object adjusted to local time
 */
export function fromJerusalemTime(date) {
    const jerusalemOffset = getJerusalemTimezoneOffset();
    const localOffset = date.getTimezoneOffset();
    const offsetDiff = localOffset - jerusalemOffset;
    return new Date(date.getTime() + (offsetDiff * 60000));
}
/**
 * Creates a Date object from date and time strings, treating them as Jerusalem time
 * This ensures consistent time handling across the application
 *
 * @param dateString - Date in YYYY-MM-DD format
 * @param timeString - Time in HH:MM format
 * @returns Date object representing the Jerusalem date and time
 */
export function createJerusalemDateTime(dateString, timeString) {
    // Validate inputs
    if (!dateString || !timeString) {
        console.warn('Invalid date or time string provided to createJerusalemDateTime:', { dateString, timeString });
        return new Date(); // Return current date as fallback
    }
    // Normalize time string - remove seconds if present
    const normalizedTimeString = normalizeTimeString(timeString);
    // Handle standard YYYY-MM-DD format
    if (dateString.includes('-')) {
        const dateParts = dateString.split('-').map(Number);
        const timeParts = normalizedTimeString.split(':').map(Number);
        // Validate that we have valid components
        if (dateParts.length === 3 && timeParts.length >= 2) {
            const [year, month, day] = dateParts;
            const [hours, minutes] = timeParts;
            // Validate numeric values
            if (!isNaN(year) && !isNaN(month) && !isNaN(day) && !isNaN(hours) && !isNaN(minutes)) {
                // Create date object using Jerusalem timezone (month is 0-indexed)
                const jerusalemOffset = getJerusalemTimezoneOffset();
                const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
                // Adjust for Jerusalem timezone
                const adjustedDate = new Date(date.getTime() - (jerusalemOffset * 60000));
                // Validate the created date
                if (!isNaN(adjustedDate.getTime())) {
                    return adjustedDate;
                }
            }
        }
    }
    console.warn('Invalid date or time format provided to createJerusalemDateTime:', { dateString, timeString });
    return new Date(); // Return current date as fallback
}
/**
 * Creates a Date object from date and time strings, treating them as local time
 * This prevents timezone offset issues when parsing reminder dates
 *
 * @param dateString - Date in YYYY-MM-DD format
 * @param timeString - Time in HH:MM format
 * @returns Date object representing the local date and time
 */
export function createLocalDateTime(dateString, timeString) {
    // Validate inputs
    if (!dateString || !timeString) {
        console.warn('Invalid date or time string provided to createLocalDateTime:', { dateString, timeString });
        return new Date(); // Return current date as fallback
    }
    // Normalize time string - remove seconds if present
    const normalizedTimeString = normalizeTimeString(timeString);
    // Handle standard YYYY-MM-DD format
    if (dateString.includes('-')) {
        const dateParts = dateString.split('-').map(Number);
        const timeParts = normalizedTimeString.split(':').map(Number);
        // Validate that we have valid components
        if (dateParts.length === 3 && timeParts.length >= 2) {
            const [year, month, day] = dateParts;
            const [hours, minutes] = timeParts;
            // Validate numeric values
            if (!isNaN(year) && !isNaN(month) && !isNaN(day) && !isNaN(hours) && !isNaN(minutes)) {
                // Create date object using local timezone (month is 0-indexed)
                const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
                // Validate the created date
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
        }
    }
    console.warn('Invalid date or time format provided to createLocalDateTime:', { dateString, timeString });
    return new Date(); // Return current date as fallback
}
/**
 * Formats a date for display in Hebrew locale
 *
 * @param date - Date object to format
 * @returns Formatted date string
 */
export function formatDateForDisplay(date) {
    return date.toLocaleDateString('he-IL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}
/**
 * Formats a time for display
 *
 * @param date - Date object to format
 * @returns Formatted time string in HH:MM format
 */
export function formatTimeForDisplay(date) {
    return date.toLocaleTimeString('he-IL', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}
/**
 * Checks if a date is today
 *
 * @param date - Date to check
 * @returns True if the date is today
 */
export function isToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
}
/**
 * Checks if a date is tomorrow
 *
 * @param date - Date to check
 * @returns True if the date is tomorrow
 */
export function isTomorrow(date) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
}
/**
 * Checks if a date is in the past
 *
 * @param date - Date to check
 * @returns True if the date is in the past
 */
export function isPast(date) {
    return date < new Date();
}
/**
 * Checks if a date is in the future
 *
 * @param date - Date to check
 * @returns True if the date is in the future
 */
export function isFuture(date) {
    return date > new Date();
}
/**
 * Extracts time from database timestamp without timezone conversion
 * Database stores timestamps like "2025-09-12 16:04:00" (without timezone)
 * This function extracts the time part directly without parsing as Date
 *
 * @param timestamp - Database timestamp string
 * @returns Time string in HH:MM format
 */
export function extractTimeFromTimestamp(timestamp) {
    if (!timestamp)
        return '00:00';
    // Handle both "2025-09-12 16:04:00" and "2025-09-12T16:04:00" formats
    const timePart = timestamp.includes('T')
        ? timestamp.split('T')[1]
        : timestamp.split(' ')[1];
    if (!timePart)
        return '00:00';
    // Return only HH:MM part, ensuring we don't include seconds
    const timeComponents = timePart.split(':');
    if (timeComponents.length >= 2) {
        return `${timeComponents[0]}:${timeComponents[1]}`;
    }
    return '00:00';
}
/**
 * Extracts date from database timestamp without timezone conversion
 *
 * @param timestamp - Database timestamp string
 * @returns Date string in YYYY-MM-DD format
 */
export function extractDateFromTimestamp(timestamp) {
    if (!timestamp)
        return new Date().toISOString().split('T')[0];
    // Handle both "2025-09-12 16:04:00" and "2025-09-12T16:04:00" formats
    const datePart = timestamp.includes('T')
        ? timestamp.split('T')[0]
        : timestamp.split(' ')[0];
    return datePart || new Date().toISOString().split('T')[0];
}
/**
 * Creates a database timestamp string from date and time without timezone conversion
 * This ensures the exact time entered by the user is saved to the database
 *
 * @param dateString - Date in YYYY-MM-DD format
 * @param timeString - Time in HH:MM format
 * @returns Database timestamp string in YYYY-MM-DD HH:MM:SS format
 */
export function createDatabaseTimestamp(dateString, timeString) {
    return `${dateString} ${timeString}:00`;
}
/**
 * Creates a database timestamp string from date and time for end time
 * Adds 1 hour to the start time by default
 *
 * @param dateString - Date in YYYY-MM-DD format
 * @param timeString - Time in HH:MM format
 * @returns Database timestamp string in YYYY-MM-DD HH:MM:SS format
 */
export function createEndTimeTimestamp(dateString, timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    const endHours = (hours + 1) % 24;
    const endTimeString = `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    return `${dateString} ${endTimeString}:00`;
}
/**
 * Parses a full date string from the server and extracts date and time components
 * Handles formats like "Fri Sep 12 2025 16:08:00 GM" and timezone offsets like "+0300"
 *
 * @param fullDateString - Full date string from server
 * @param timezoneString - Timezone offset string (optional)
 * @returns Object with dateString (YYYY-MM-DD) and timeString (HH:MM)
 */
export function parseServerDateTime(fullDateString, _timezoneString) {
    if (!fullDateString) {
        const now = new Date();
        return {
            dateString: now.toISOString().split('T')[0],
            timeString: now.toTimeString().split(' ')[0].substring(0, 5)
        };
    }
    try {
        // Handle database timestamp format directly without timezone conversion
        // Format: "2025-09-12 16:04:00" or "2025-09-12T16:04:00"
        if (fullDateString.includes('-') && (fullDateString.includes(' ') || fullDateString.includes('T'))) {
            const datePart = fullDateString.includes('T')
                ? fullDateString.split('T')[0]
                : fullDateString.split(' ')[0];
            const timePart = fullDateString.includes('T')
                ? fullDateString.split('T')[1]
                : fullDateString.split(' ')[1];
            if (datePart && timePart) {
                return {
                    dateString: datePart,
                    timeString: timePart.substring(0, 5) // HH:MM
                };
            }
        }
        // Fallback to Date parsing for other formats
        const date = new Date(fullDateString);
        // Check if the date is valid
        if (isNaN(date.getTime())) {
            console.warn('Invalid date string provided to parseServerDateTime:', fullDateString);
            const now = new Date();
            return {
                dateString: now.toISOString().split('T')[0],
                timeString: now.toTimeString().split(' ')[0].substring(0, 5)
            };
        }
        // Extract date and time components
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return {
            dateString: `${year}-${month}-${day}`,
            timeString: `${hours}:${minutes}`
        };
    }
    catch (error) {
        console.warn('Error parsing server date/time:', error, fullDateString);
        const now = new Date();
        return {
            dateString: now.toISOString().split('T')[0],
            timeString: now.toTimeString().split(' ')[0].substring(0, 5)
        };
    }
}
/**
 * Creates a simple ISO string for server communication
 * This ensures the server receives the exact Jerusalem time without timezone conversion
 *
 * @param dateString - Date in YYYY-MM-DD format
 * @param timeString - Time in HH:MM format
 * @returns ISO string that represents the Jerusalem time
 */
export function createJerusalemISOString(dateString, timeString) {
    if (!dateString || !timeString) {
        return new Date().toISOString();
    }
    // Create a simple ISO string without timezone conversion
    // The server will treat this as Jerusalem time
    return `${dateString}T${timeString}:00.000Z`;
}
/**
 * Creates a simple ISO string for server communication
 * This ensures the server receives the exact local time without timezone conversion
 *
 * @param dateString - Date in YYYY-MM-DD format
 * @param timeString - Time in HH:MM format
 * @returns ISO string that represents the local time
 */
export function createSimpleISOString(dateString, timeString) {
    if (!dateString || !timeString) {
        return new Date().toISOString();
    }
    // Create a simple ISO string without timezone conversion
    return `${dateString}T${timeString}:00.000Z`;
}
/**
 * Parses a Jerusalem time ISO string from server
 * This handles the case where the server sends back the time as Jerusalem time
 *
 * @param isoString - ISO string from server
 * @returns Date object representing the correct Jerusalem time
 */
export function parseJerusalemISOString(isoString) {
    if (!isoString) {
        return new Date();
    }
    try {
        // Handle format like "2025-09-20T14:00:00.000Z"
        const match = isoString.match(/(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}):\d{2}\.\d{3}Z/);
        if (match) {
            const [, datePart, timePart] = match;
            // Parse as Jerusalem time (treat as local time)
            const jerusalemDate = new Date(`${datePart}T${timePart}:00`);
            return jerusalemDate;
        }
        // Fallback to direct parsing
        const date = new Date(isoString);
        if (!isNaN(date.getTime())) {
            return date;
        }
        return new Date();
    }
    catch (error) {
        console.warn('Error parsing Jerusalem ISO string:', error, isoString);
        return new Date();
    }
}
/**
 * Parses a simple ISO string from server
 * This handles the case where the server sends back the time as a simple string
 *
 * @param isoString - ISO string from server
 * @returns Date object representing the correct local time
 */
export function parseSimpleISOString(isoString) {
    if (!isoString) {
        return new Date();
    }
    try {
        // Handle format like "2025-09-20T14:00:00.000Z"
        const match = isoString.match(/(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}):\d{2}\.\d{3}Z/);
        if (match) {
            // Parse as UTC and then adjust to local time
            const utcDate = new Date(isoString);
            // Get timezone offset and adjust
            const timezoneOffset = utcDate.getTimezoneOffset();
            const localDate = new Date(utcDate.getTime() + (timezoneOffset * 60000));
            return localDate;
        }
        // Fallback to direct parsing
        const date = new Date(isoString);
        if (!isNaN(date.getTime())) {
            return date;
        }
        return new Date();
    }
    catch (error) {
        console.warn('Error parsing simple ISO string:', error, isoString);
        return new Date();
    }
}
/**
 * Formats a date for display without timezone conversion
 * This ensures the displayed time matches what the user entered
 *
 * @param dateString - Date string from server
 * @param timeString - Time string from server
 * @returns Formatted date and time for display
 */
export function formatDateTimeForDisplay(dateString, timeString) {
    if (!dateString || !timeString) {
        const now = new Date();
        return {
            date: now.toISOString().split('T')[0],
            time: now.toTimeString().split(' ')[0].substring(0, 5)
        };
    }
    // Extract date and time components directly without timezone conversion
    const datePart = dateString.includes('T') ? dateString.split('T')[0] : dateString;
    const timePart = timeString.includes('T') ? timeString.split('T')[1] : timeString;
    return {
        date: datePart,
        time: timePart ? timePart.substring(0, 5) : '00:00'
    };
}
