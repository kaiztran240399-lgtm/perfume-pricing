/**
 * utils.ts — Shared math and formatting helpers.
 *
 * Rules:
 *  - Pure functions only. No side effects, no imports from UI layers.
 *  - Every division must go through safeDivide.
 *  - All helpers are individually exportable for unit testing.
 */

// ─────────────────────────────────────────────────────────────────────────────
// MATH UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Division that never throws and never returns NaN or Infinity.
 *
 * @param numerator   - dividend
 * @param denominator - divisor
 * @param fallback    - value returned when denominator === 0 (default: 0)
 */
export function safeDivide(
  numerator: number,
  denominator: number,
  fallback = 0,
): number {
  if (denominator === 0 || !isFinite(denominator)) return fallback;
  const result = numerator / denominator;
  return isFinite(result) ? result : fallback;
}

/**
 * Clamp a value to [min, max].
 * Ensures min ≤ result ≤ max even when caller supplies inverted bounds.
 */
export function clamp(value: number, min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return Math.max(lo, Math.min(hi, value));
}

/**
 * Round value up to the nearest multiple of `nearest`.
 * e.g. roundUpToNearest(1_230_000, 10_000) → 1_240_000
 */
export function roundUpToNearest(value: number, nearest: number): number {
  if (nearest <= 0) return value;
  return Math.ceil(value / nearest) * nearest;
}

/**
 * Round value to the nearest multiple of `nearest` (standard rounding).
 * e.g. roundToNearest(1_235_000, 10_000) → 1_240_000
 */
export function roundToNearest(value: number, nearest: number): number {
  if (nearest <= 0) return value;
  return Math.round(value / nearest) * nearest;
}

/**
 * Commercial selling-price rounding rules for VND:
 *  < 100 000  → ceil to nearest   1 000
 *  100k – 1M  → ceil to nearest   5 000
 *  > 1 000 000→ ceil to nearest  10 000
 */
export function roundSellingPrice(price: number): number {
  if (price <= 0) return 0;
  if (price < 100_000)   return roundUpToNearest(price,  1_000);
  if (price < 1_000_000) return roundUpToNearest(price,  5_000);
  return                        roundUpToNearest(price, 10_000);
}

// ─────────────────────────────────────────────────────────────────────────────
// PERCENTAGE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a percentage figure to its decimal equivalent.
 * toDecimal(30) → 0.30
 */
export function toDecimal(pct: number): number {
  return pct / 100;
}

/**
 * Convert a decimal to a percentage figure.
 * toPct(0.30) → 30
 */
export function toPct(decimal: number): number {
  return decimal * 100;
}

/**
 * Apply a percentage rate to a base value.
 * applyPct(1_000_000, 10) → 100_000
 */
export function applyPct(base: number, pct: number): number {
  return base * toDecimal(pct);
}

/**
 * Compute what percentage `part` is of `whole`.
 * Returns 0 when whole === 0 instead of NaN.
 */
export function pctOf(part: number, whole: number): number {
  return safeDivide(part, whole, 0) * 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// CURRENCY & DISPLAY FORMATTERS
// ─────────────────────────────────────────────────────────────────────────────

const _vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const _numberFormatter = new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 0,
});

/**
 * Format a number as Vietnamese Dong currency.
 * formatVND(1_500_000) → "1.500.000 ₫"
 */
export function formatVND(amount: number): string {
  return _vndFormatter.format(Math.round(amount));
}

/**
 * Format a number with vi-VN thousand separators, no currency symbol.
 * formatNumber(1_500_000) → "1.500.000"
 */
export function formatNumber(n: number): string {
  return _numberFormatter.format(Math.round(n));
}

/**
 * Format a decimal as a percentage string.
 * formatPct(30.333, 1) → "30.3%"
 */
export function formatPct(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// ─────────────────────────────────────────────────────────────────────────────
// DATE / LABEL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a Vietnamese month label for cashflow projections.
 * monthLabel(0)  → e.g. "T4/2026"   (current month)
 * monthLabel(1)  → "T5/2026"
 * monthLabel(11) → "T3/2027"
 *
 * @param monthIndex - 0-based offset from baseDate's month
 * @param baseDate   - reference date, defaults to today
 */
export function monthLabel(monthIndex: number, baseDate: Date = new Date()): string {
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthIndex, 1);
  return `T${d.getMonth() + 1}/${d.getFullYear()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// GUARD HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ensure a numeric value is non-negative.
 * Returns 0 for negative inputs and NaN-safe.
 */
export function nonNegative(value: number): number {
  if (!isFinite(value) || isNaN(value)) return 0;
  return Math.max(0, value);
}

/**
 * Ensure a percentage is in the valid range [0, 100].
 */
export function clampPct(pct: number): number {
  return clamp(pct, 0, 100);
}
