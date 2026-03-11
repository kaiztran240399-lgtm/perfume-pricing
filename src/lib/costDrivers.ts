/**
 * lib/costDrivers.ts
 *
 * Explicit cost driver resolver.
 *
 * Replaces implicit (is_percentage + channel) flag logic with a single
 * CostDriverType value that clearly states what a cost is computed against.
 *
 * Backward compatible: if driverType is not set, callers fall back to
 * the legacy is_percentage logic in resolveTemplateCostLine().
 */

import { CostDriverType } from '../types/shared';

export { CostDriverType };

// ─────────────────────────────────────────────────────────────────────────────
// RESOLVER
// ─────────────────────────────────────────────────────────────────────────────

export interface CostDriverContext {
  purchasePrice:  number;   // ₫ effective purchase price per unit
  sellingPrice:   number;   // ₫ target selling price (may be 0 before calc)
  netRevenue:     number;   // ₫ net revenue after returns + discounts
  adSpend:        number;   // ₫ total monthly ad spend
}

/**
 * Resolve a cost driver value to a concrete ₫ amount.
 *
 * @param driver  - The explicit CostDriverType
 * @param rate    - The numeric rate (₫ for fixed, % for percent drivers)
 * @param ctx     - Financial context for percentage resolution
 * @returns       Resolved ₫ amount (always ≥ 0)
 */
export function resolveCostDriver(
  driver: CostDriverType,
  rate: number,
  ctx: CostDriverContext,
): number {
  if (rate <= 0) return 0;

  switch (driver) {
    case CostDriverType.FIXED_PER_UNIT:
      return Math.max(0, rate);

    case CostDriverType.FIXED_PER_MONTH:
      // Per-month fixed costs are expressed per unit at call-site (already divided)
      return Math.max(0, rate);

    case CostDriverType.PERCENT_OF_PURCHASE_PRICE:
      return (rate / 100) * ctx.purchasePrice;

    case CostDriverType.PERCENT_OF_SELLING_PRICE:
      return (rate / 100) * ctx.sellingPrice;

    case CostDriverType.PERCENT_OF_NET_REVENUE:
      return (rate / 100) * ctx.netRevenue;

    case CostDriverType.PERCENT_OF_AD_SPEND:
      return (rate / 100) * ctx.adSpend;

    default:
      return Math.max(0, rate);
  }
}

/**
 * Whether a given CostDriverType represents a percentage-based cost.
 * Used to set isPercentage on CostLineOutput for display purposes.
 */
export function isPercentageDriver(driver: CostDriverType): boolean {
  return (
    driver === CostDriverType.PERCENT_OF_PURCHASE_PRICE ||
    driver === CostDriverType.PERCENT_OF_SELLING_PRICE  ||
    driver === CostDriverType.PERCENT_OF_NET_REVENUE    ||
    driver === CostDriverType.PERCENT_OF_AD_SPEND
  );
}
