/**
 * unitEconomics.ts — Per-unit profitability after real-world erosion.
 *
 * Formula chain:
 *   sellingPrice
 *     → effectiveSellingPrice   (after discount)
 *     → netRevenuePerUnit       (after returns)
 *     → contributionMargin      (netRevenue − costBase − CAC − giftCost)
 *     → breakEvenUnits          (fixedCosts / CM)
 *
 * Key metric: contributionMargin reveals real unit profitability
 * once marketing spend and refunds are accounted for — always lower
 * than grossMargin.
 */

import type { CalcWarning } from '../../types/shared';
import type {
  UnitEconomicsInputs,
  UnitEconomicsOutputs,
} from '../../types/unit-economics';
import { applyPct, nonNegative, pctOf, safeDivide } from './shared';

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER ACQUISITION COST
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CAC = monthlyAdSpend / monthlyUnitsSold
 *
 * If manualOverride is provided and > 0, it takes precedence.
 * Returns 0 when unitsSold === 0 to avoid Infinity.
 */
export function calculateCAC(
  monthlyAdSpend: number,
  monthlyUnitsSold: number,
  manualOverride?: number,
): number {
  if (manualOverride !== undefined && manualOverride > 0) return manualOverride;
  return nonNegative(safeDivide(monthlyAdSpend, monthlyUnitsSold, 0));
}

// ─────────────────────────────────────────────────────────────────────────────
// REVENUE PER UNIT (net of channel erosion)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Effective selling price after applying average discount/promo rate.
 *
 * effectiveSP = sellingPrice × (1 − discountPct%)
 */
export function calculateEffectiveSellingPrice(
  sellingPrice: number,
  discountPct: number,
): number {
  return nonNegative(sellingPrice * (1 - discountPct / 100));
}

/**
 * Net revenue per unit after deducting the return/refund erosion.
 *
 * netRevenue = effectiveSP × (1 − returnRatePct%)
 *
 * Interpretation: on average, every unit "sold" earns this much because
 * some fraction of orders are returned and the revenue is reversed.
 */
export function calculateNetRevenuePerUnit(
  effectiveSellingPrice: number,
  returnRatePct: number,
): number {
  return nonNegative(effectiveSellingPrice * (1 - returnRatePct / 100));
}

/**
 * Allocated gift/sample cost per order.
 *
 * giftCostPerOrder = giftCostPerUnit × giftsPerHundredOrders / 100
 */
export function calculateAllocatedGiftCost(
  giftCostPerUnit: number,
  giftsPerHundredOrders: number,
): number {
  return nonNegative(applyPct(giftCostPerUnit, giftsPerHundredOrders));
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTRIBUTION MARGIN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Contribution margin per unit (₫).
 *
 * CM = netRevenuePerUnit − costBase − CAC − allocatedGiftCost
 *
 * This is the amount each sold unit contributes toward covering fixed costs
 * and generating profit, AFTER all variable costs including marketing.
 */
export function calculateContributionMarginPerUnit(
  netRevenuePerUnit: number,
  costBase: number,
  cac: number,
  allocatedGiftCost: number,
): number {
  return netRevenuePerUnit - costBase - cac - allocatedGiftCost;
}

/**
 * Contribution margin ratio (%).
 *
 * CM% = CM / netRevenuePerUnit × 100
 *
 * Returns 0 when netRevenue is 0 to avoid division by zero.
 */
export function calculateContributionMarginRatio(
  contributionMarginPerUnit: number,
  netRevenuePerUnit: number,
): number {
  return pctOf(contributionMarginPerUnit, netRevenuePerUnit);
}

/**
 * Effective margin % as seen by the business owner.
 *
 * effectiveMargin% = CM / effectiveSellingPrice × 100
 *
 * Uses effectiveSP (pre-return) to match how founders mentally model margins.
 */
export function calculateEffectiveMarginPct(
  contributionMarginPerUnit: number,
  effectiveSellingPrice: number,
): number {
  return pctOf(contributionMarginPerUnit, effectiveSellingPrice);
}

// ─────────────────────────────────────────────────────────────────────────────
// BREAK-EVEN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Break-even units per month.
 *
 * breakEven = monthlyFixedCosts / CM_per_unit
 *
 * Returns Infinity-safe value: when CM ≤ 0 the business can never break even
 * on fixed costs alone, so we return Number.MAX_SAFE_INTEGER as a sentinel.
 */
export function calculateBreakEvenUnits(
  monthlyFixedCosts: number,
  contributionMarginPerUnit: number,
): number {
  if (contributionMarginPerUnit <= 0) return Number.MAX_SAFE_INTEGER;
  return Math.ceil(safeDivide(monthlyFixedCosts, contributionMarginPerUnit, 0));
}

/**
 * Revenue required per month to break even.
 *
 * breakEvenRevenue = breakEvenUnits × sellingPrice
 */
export function calculateBreakEvenRevenue(
  breakEvenUnits: number,
  sellingPrice: number,
): number {
  if (breakEvenUnits === Number.MAX_SAFE_INTEGER) return Number.MAX_SAFE_INTEGER;
  return breakEvenUnits * sellingPrice;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROAS (unit-level)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ROAS per unit = netRevenuePerUnit / CAC
 *
 * Answers: "For each ₫ spent acquiring this order, how much net revenue
 * did I receive?"
 * Returns 0 when CAC = 0 (organic / no ad spend).
 */
export function calculateRoasPerUnit(
  netRevenuePerUnit: number,
  cac: number,
): number {
  return safeDivide(netRevenuePerUnit, cac, 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// WARNING CONDITIONS
// ─────────────────────────────────────────────────────────────────────────────

export function computeUnitEconomicsWarnings(
  out: Omit<UnitEconomicsOutputs, 'warnings'>,
): CalcWarning[] {
  const w: CalcWarning[] = [];

  if (out.contributionMarginPerUnit < 0) {
    w.push({ level: 'critical', code: 'NEGATIVE_CM', message: 'Contribution margin âm — mỗi đơn bán đang lỗ tiền mặt.', field: 'monthlyAdSpend' });
  } else if (out.contributionMarginRatioPct < 15 && out.effectiveSellingPrice > 0) {
    w.push({ level: 'warning', code: 'LOW_CM_RATIO', message: `CM ratio ${out.contributionMarginRatioPct.toFixed(1)}% thấp — dưới ngưỡng an toàn 15%.` });
  }

  if (out.cac > 0 && out.roasPerUnit < 1) {
    w.push({ level: 'warning', code: 'LOW_ROAS', message: `ROAS ${out.roasPerUnit.toFixed(2)}× — chi phí ads đang vượt doanh thu ròng mỗi đơn.`, field: 'monthlyAdSpend' });
  }

  if (out.breakEvenUnitsPerMonth === Number.MAX_SAFE_INTEGER) {
    w.push({ level: 'critical', code: 'NO_BREAK_EVEN', message: 'Không thể hoà vốn với chi phí cố định hiện tại — CM âm hoặc bằng 0.' });
  }

  return w;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full unit economics pipeline.
 *
 * All intermediate values are exposed in the output so the UI can render
 * a full margin waterfall without recomputing anything.
 */
export function calculateUnitEconomicsOutputs(
  inputs: UnitEconomicsInputs,
): UnitEconomicsOutputs {
  // Step 1 — CAC
  const cac = calculateCAC(
    inputs.monthlyAdSpend,
    inputs.monthlyUnitsSold,
    inputs.manualCacOverride,
  );

  // Step 2 — Revenue per unit (after channel erosion)
  const effectiveSellingPrice = calculateEffectiveSellingPrice(
    inputs.sellingPrice,
    inputs.discountRatePct,
  );
  const netRevenuePerUnit = calculateNetRevenuePerUnit(
    effectiveSellingPrice,
    inputs.returnRatePct,
  );

  // Step 3 — Gift cost allocation
  const allocatedGiftCostPerUnit = calculateAllocatedGiftCost(
    inputs.giftCostPerUnit,
    inputs.giftsPerHundredOrders,
  );

  // Step 4 — Contribution margin
  const contributionMarginPerUnit = calculateContributionMarginPerUnit(
    netRevenuePerUnit,
    inputs.costBase,
    cac,
    allocatedGiftCostPerUnit,
  );
  const contributionMarginRatioPct = calculateContributionMarginRatio(
    contributionMarginPerUnit,
    netRevenuePerUnit,
  );
  const effectiveMarginPct = calculateEffectiveMarginPct(
    contributionMarginPerUnit,
    effectiveSellingPrice,
  );

  // Step 5 — Break-even
  const breakEvenUnitsPerMonth = calculateBreakEvenUnits(
    inputs.monthlyFixedCosts,
    contributionMarginPerUnit,
  );
  const breakEvenRevenue = calculateBreakEvenRevenue(
    breakEvenUnitsPerMonth,
    inputs.sellingPrice,
  );

  // Step 6 — ROAS
  const roasPerUnit = calculateRoasPerUnit(netRevenuePerUnit, cac);

  // Step 7 — Monthly aggregates
  const monthlyGrossRevenue      = inputs.sellingPrice * inputs.monthlyUnitsSold;
  const monthlyNetRevenue        = netRevenuePerUnit * inputs.monthlyUnitsSold;
  const monthlyContributionProfit = contributionMarginPerUnit * inputs.monthlyUnitsSold;

  const partial = {
    effectiveSellingPrice,
    netRevenuePerUnit,
    allocatedGiftCostPerUnit,
    cac,
    contributionMarginPerUnit,
    contributionMarginRatioPct,
    effectiveMarginPct,
    breakEvenUnitsPerMonth,
    breakEvenRevenue,
    roasPerUnit,
    monthlyGrossRevenue,
    monthlyNetRevenue,
    monthlyContributionProfit,
  };

  return { ...partial, warnings: computeUnitEconomicsWarnings(partial) };
}
