/**
 * types/ltv.ts
 *
 * Input/output types for Tab 4 — Customer LTV.
 */

import type { HealthStatus } from './shared';

// ─────────────────────────────────────────────────────────────────────────────
// CHART DATA
// ─────────────────────────────────────────────────────────────────────────────

/** LTV value breakdown by cohort year for charting. */
export interface CohortYearValue {
  year: number;
  /** Cumulative margin-adjusted revenue from this customer cohort by year N. */
  cumulativeLtv: number;        // ₫
  newCustomersValue: number;    // ₫
  retainedCustomersValue: number; // ₫
}

// ─────────────────────────────────────────────────────────────────────────────
// INPUTS
// ─────────────────────────────────────────────────────────────────────────────

export interface LTVInputs {
  // ── Purchase behaviour ───────────────────────────────────────────────────
  /** Auto-linked from MarketingInputs.sharedAOV. */
  averageOrderValue: number;              // ₫
  purchaseFrequencyPerYear: number;       // times/year
  customerLifespanYears: number;

  // ── Retention cohort rates ───────────────────────────────────────────────
  /** % of 1st-time buyers who make a 2nd purchase. */
  repeatRateAfterFirstPct: number;
  /** % of 2nd-time buyers who make a 3rd+ purchase. */
  repeatRateAfterSecondPct: number;

  // ── Costs ────────────────────────────────────────────────────────────────
  /** Auto-linked from PricingOutputs. */
  grossMarginPct: number;
  /** ₫ per customer per year: loyalty discounts, Zalo campaigns, gifts… */
  retentionCostPerCustomerPerYear: number;

  // ── Referral ─────────────────────────────────────────────────────────────
  /** % of customers who successfully refer at least 1 new buyer. */
  referralRatePct: number;

  // ── Finance ──────────────────────────────────────────────────────────────
  /** Auto-linked from MarketingOutputs.blended.blendedCac. */
  blendedCac: number;                     // ₫
  /** % annual discount rate for NPV calculation (e.g. 12). */
  annualDiscountRatePct: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUTS
// ─────────────────────────────────────────────────────────────────────────────

export interface LTVOutputs {
  // ── LTV tiers ─────────────────────────────────────────────────────────────
  ltvSimple: number;                      // ₫ AOV × freq × lifespan
  ltvMarginAdjusted: number;              // ₫ × grossMarginPct
  ltvNet: number;                         // ₫ after retention costs
  /** Adds the referral value bonus (blendedCac × referralRate). */
  ltvReferralAdjusted: number;            // ₫

  // ── Ratio & health ───────────────────────────────────────────────────────
  ltvCacRatio: number;
  ltvCacHealthStatus: HealthStatus;

  // ── Action numbers ───────────────────────────────────────────────────────
  paybackPeriodMonths: number;
  /** ₫ maximum CAC that keeps LTV:CAC ≥ 3. */
  maxViableCac: number;
  /**
   * ₫ room to grow (positive) or overspend (negative).
   * = maxViableCac − blendedCac
   */
  cacSurplusOrDeficit: number;

  // ── Chart data ───────────────────────────────────────────────────────────
  cohortValueByYear: CohortYearValue[];
}
