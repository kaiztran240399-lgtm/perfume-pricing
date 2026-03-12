/**
 * types/unit-economics.ts
 *
 * Input/output types for Tab 2 — Unit Economics.
 */

import type { CalcWarning } from './shared';

// ─────────────────────────────────────────────────────────────────────────────
// INPUTS
// ─────────────────────────────────────────────────────────────────────────────

export interface UnitEconomicsInputs {
  // ── Auto-linked from PricingOutputs (editable override) ──────────────────
  sellingPrice: number;             // ₫
  costBase: number;                 // ₫
  grossMarginPct: number;           // %

  // ── Real-world performance ───────────────────────────────────────────────
  /** Total ₫ ad spend attributed to this product per month. */
  monthlyAdSpend: number;
  monthlyUnitsSold: number;
  /** Actual realised return/refund rate, %. */
  returnRatePct: number;
  /** Average promo/discount applied at checkout, %. */
  discountRatePct: number;

  // ── Gifting / samples ────────────────────────────────────────────────────
  giftsPerHundredOrders: number;
  giftCostPerUnit: number;          // ₫

  // ── Fixed cost allocation ────────────────────────────────────────────────
  /** Monthly ₫ total of all fixed operating costs (rent, salaries, tools…). */
  monthlyFixedCosts: number;

  // ── Optional overrides ───────────────────────────────────────────────────
  /** If set, overrides computed CAC = adSpend / units. */
  manualCacOverride?: number;       // ₫
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUTS
// ─────────────────────────────────────────────────────────────────────────────

export interface UnitEconomicsOutputs {
  // ── Per-unit metrics ─────────────────────────────────────────────────────
  effectiveSellingPrice: number;          // ₫ after discount
  netRevenuePerUnit: number;              // ₫ after discount + returns
  allocatedGiftCostPerUnit: number;       // ₫
  cac: number;                            // ₫
  contributionMarginPerUnit: number;      // ₫
  contributionMarginRatioPct: number;     // %
  effectiveMarginPct: number;             // % post all real-world erosion

  // ── Break-even ───────────────────────────────────────────────────────────
  breakEvenUnitsPerMonth: number;
  breakEvenRevenue: number;               // ₫

  // ── Efficiency ratios ────────────────────────────────────────────────────
  /** unitRevenue / CAC — revenue generated per ₫ spent acquiring the order. */
  roasPerUnit: number;

  // ── Monthly aggregates (for display context) ─────────────────────────────
  monthlyGrossRevenue: number;            // ₫
  monthlyNetRevenue: number;              // ₫
  monthlyContributionProfit: number;      // ₫

  // ── Domain warnings ──────────────────────────────────────────────────────
  warnings: CalcWarning[];
}
