/**
 * Parse a "yyyy-MM-dd" date string as local time instead of UTC.
 *
 * `new Date("2026-01-15")` is interpreted as UTC midnight, which shifts
 * to the previous day in timezones behind UTC.  This helper avoids the
 * issue by using the (year, month, day) Date constructor which always
 * creates a date in the browser's local timezone.
 */
export function parseLocalDate(dateStr: string): Date {
	const [y, m, d] = dateStr.split("-").map(Number);
	return new Date(y, m - 1, d);
}

/** Format a Date as "yyyy-MM-dd" in local time. */
export function formatDateString(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}
