/**
 * Currency utilities for COP (Colombian Peso).
 *
 * Colombian locale (es-CO) formatting:
 * - Thousands separator: "." (dot)
 * - Decimal separator: "," (comma)
 * - Display format: "$ 1.234.567,89"
 */

const COP_FORMATTER = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const COP_PLAIN_FORMATTER = new Intl.NumberFormat("es-CO", {
  style: "decimal",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

// Used by CurrencyInput on blur — always shows exactly 2 decimal places.
const COP_INPUT_FORMATTER = new Intl.NumberFormat("es-CO", {
  style: "decimal",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format a number as a COP currency string with symbol.
 * e.g. 1234567.89 → "$ 1.234.567,89"
 */
export function formatCOPWithSymbol(value: number): string {
  return COP_FORMATTER.format(value);
}

/**
 * Format a number as a COP number string without currency symbol.
 * Useful for axis labels and compact reads.
 * e.g. 1234567 → "1.234.567"
 */
export function formatCOP(value: number): string {
  return COP_PLAIN_FORMATTER.format(value);
}

/**
 * Format a number for display inside a currency input field.
 * Always shows exactly 2 decimal places.
 * e.g. 1000000.5 → "1.000.000,50"
 */
export function formatCOPForInput(value: number): string {
  return COP_INPUT_FORMATTER.format(value);
}

/**
 * Parse a user-typed COP string into a raw JavaScript number.
 * Handles Colombian locale where "." is thousands separator and "," is decimal.
 * e.g. "1.234.567,89" → 1234567.89
 * Returns NaN if the string cannot be parsed.
 */
export function parseCOPInput(value: string): number {
  const cleaned = value
    .replace(/\./g, "") // remove thousands-separator dots
    .replace(",", ".") // convert decimal comma → JS period
    .replace(/\s/g, "")
    .trim();
  if (cleaned === "" || cleaned === "-") return Number.NaN;
  return Number.parseFloat(cleaned);
}
