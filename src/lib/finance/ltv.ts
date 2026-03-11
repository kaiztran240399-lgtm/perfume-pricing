/**
 * ltv.ts — Customer Lifetime Value engine.
 *
 * LTV tiers (each builds on the previous):
 *   ltvSimple           = AOV × freq × lifespan
 *   ltvMarginAdjusted   = ltvSimple × grossMargin%
 *   ltvNet              = ltvMarginAdjusted − retentionCost × lifespan
 *   ltvReferralAdjusted = ltvNet + (blendedCac × referralRate%)
 *
 * Key ratios:
 *   LTV:CAC  = ltvReferralAdjusted / blendedCac
 *   payback  = cac / (monthlyMarginRevenue per customer)
 *   maxViableCAC = ltvReferralAdjusted / 3   (3:1 healthy threshold)
 */

import type {
  CohortYearValue,
  LTVInputs,
  LTVOutputs,
} from '../../types/business-calculator';
import { HealthStatus } from '../../types/business-calculator';
import { applyPct, nonNegative, safeDivide } from './shared';

// ─────────────────────────────────────────────────────────────────────────────
// LTV TIERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simple LTV — revenue only, no cost adjustment.
 *
 * ltvSimple = AOV × purchaseFrequencyPerYear × customerLifespanYears
 */
export function calculateLTVSimple(
  aov: number,
  purchaseFrequencyPerYear: number,
  customerLifespanYears: number,
): number {
  return nonNegative(aov * purchaseFrequencyPerYear * customerLifespanYears);
}

/**
 * Margin-adjusted LTV — scales simple LTV by gross margin.
 *
 * ltvMarginAdjusted = ltvSimple × (grossMarginPct / 100)
 */
export function calculateLTVMarginAdjusted(
  ltvSimple: number,
  grossMarginPct: number,
): number {
  return nonNegative(applyPct(ltvSimple, grossMarginPct));
}

/**
 * Net LTV — deducts the total retention investment over the customer lifespan.
 *
 * ltvNet = ltvMarginAdjusted − (retentionCostPerCustomerPerYear × lifespan)
 *
 * Can be negative if retention costs exceed margin — that's a valid signal.
 */
export function calculateLTVNet(
  ltvMarginAdjusted: number,
  retentionCostPerCustomerPerYear: number,
  customerLifespanYears: number,
): number {
  return ltvMarginAdjusted - retentionCostPerCustomerPerYear * customerLifespanYears;
}

/**
 * Referral-adjusted LTV — adds value of referred customers.
 *
 * referralBonus = blendedCac × (referralRatePct / 100)
 * ltvReferralAdjusted = ltvNet + referralBonus
 *
 * Rationale: if X% of customers bring in 1 new customer, each customer
 * "contributes" X% × CAC worth of saved acquisition cost.
 */
export function calculateLTVReferralAdjusted(
  ltvNet: number,
  blendedCac: number,
  referralRatePct: number,
): number {
  const referralBonus = applyPct(blendedCac, referralRatePct);
  return ltvNet + nonNegative(referralBonus);
}

// ─────────────────────────────────────────────────────────────────────────────
// LTV:CAC RATIO & HEALTH
// ─────────────────────────────────────────────────────────────────────────────

/**
 * LTV:CAC = ltvReferralAdjusted / blendedCac
 *
 * Returns 0 when CAC = 0 (fully organic — no meaningful ratio).
 */
export function calculateLTVCACRatio(ltv: number, cac: number): number {
  return safeDivide(ltv, cac, 0);
}

/**
 * Classify LTV:CAC ratio health.
 *
 * < 1    → CRITICAL  (losing money on every customer)
 * 1–3    → WARNING   (marginally viable, no room for error)
 * 3–5    → HEALTHY   (industry benchmark target)
 * > 5    → EXCELLENT (strong unit economics, can invest in growth)
 */
export function classifyHealthStatus(ltvCacRatio: number): HealthStatus {
  if (ltvCacRatio < 1) return HealthStatus.CRITICAL;
  if (ltvCacRatio < 3) return HealthStatus.WARNING;
  if (ltvCacRatio < 5) return HealthStatus.HEALTHY;
  return HealthStatus.EXCELLENT;
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION NUMBERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maximum viable CAC that still keeps LTV:CAC ≥ targetRatio.
 *
 * maxViableCAC = LTV / targetRatio
 *
 * Default targetRatio = 3 (standard healthy benchmark).
 */
export function calculateMaxViableCAC(ltv: number, targetRatio = 3): number {
  return nonNegative(safeDivide(ltv, targetRatio, 0));
}

/**
 * CAC payback period in months.
 *
 * paybackMonths = CAC / (AOV × grossMargin% × purchaseFrequencyPerYear / 12)
 *
 * Interpretation: how many months of customer purchases are needed to
 * recover the acquisition cost through margin contribution alone.
 *
 * Returns Infinity-safe MAX_SAFE_INTEGER when margin revenue → 0.
 */
export function calculatePaybackPeriodMonths(
  cac: number,
  aov: number,
  grossMarginPct: number,
  purchaseFrequencyPerYear: number,
): number {
  const monthlyMarginRevenue = applyPct(aov, grossMarginPct) * (purchaseFrequencyPerYear / 12);
  if (monthlyMarginRevenue <= 0) return Number.MAX_SAFE_INTEGER;
  return Math.ceil(safeDivide(cac, monthlyMarginRevenue, 0));
}

// ─────────────────────────────────────────────────────────────────────────────
// COHORT VALUE BY YEAR (for chart)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Model cumulative LTV over each year of customer lifespan using cohort
 * retention rates.
 *
 * Year 1:  all acquired customers purchase (prob = 1.0)
 * Year 2:  repeatRateAfterFirst% remain
 * Year 3+: repeatRateAfterSecond% remain
 *
 * Returns an array with one entry per year up to customerLifespanYears.
 */
export function calculateCohortValues(inputs: LTVInputs): CohortYearValue[] {
  const aoValue    = inputs.averageOrderValue;
  const freq       = inputs.purchaseFrequencyPerYear;
  const lifespan   = Math.max(1, Math.round(inputs.customerLifespanYears));
  const margin     = inputs.grossMarginPct;
  const rr1        = inputs.repeatRateAfterFirstPct / 100;
  const rr2        = inputs.repeatRateAfterSecondPct / 100;

  const result: CohortYearValue[] = [];
  let cumulative   = 0;
  let retainedFrac = 1; // starts at 100% of cohort

  for (let year = 1; year <= lifespan; year++) {
    // Retention fraction for this year
    if (year === 2) retainedFrac = rr1;
    else if (year > 2) retainedFrac *= rr2;

    const annualRevenuePerCustomer = aoValue * freq * retainedFrac;
    const marginValue              = applyPct(annualRevenuePerCustomer, margin);
    const newCustomersValue        = year === 1 ? marginValue : 0; // first cohort only
    const retainedCustomersValue   = year > 1 ? marginValue : 0;

    cumulative += marginValue;

    result.push({
      year,
      cumulativeLtv:            nonNegative(cumulative),
      newCustomersValue:        nonNegative(newCustomersValue),
      retainedCustomersValue:   nonNegative(retainedCustomersValue),
    });
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full LTV pipeline.
 */
export function calculateLTVOutputs(inputs: LTVInputs): LTVOutputs {
  // Step 1 — LTV tiers
  const ltvSimple = calculateLTVSimple(
    inputs.averageOrderValue,
    inputs.purchaseFrequencyPerYear,
    inputs.customerLifespanYears,
  );

  const ltvMarginAdjusted = calculateLTVMarginAdjusted(ltvSimple, inputs.grossMarginPct);

  const ltvNet = calculateLTVNet(
    ltvMarginAdjusted,
    inputs.retentionCostPerCustomerPerYear,
    inputs.customerLifespanYears,
  );

  const ltvReferralAdjusted = calculateLTVReferralAdjusted(
    ltvNet,
    inputs.blendedCac,
    inputs.referralRatePct,
  );

  // Step 2 — Ratio
  const ltvCacRatio       = calculateLTVCACRatio(ltvReferralAdjusted, inputs.blendedCac);
  const ltvCacHealthStatus = classifyHealthStatus(ltvCacRatio);

  // Step 3 — Action numbers
  const maxViableCac = calculateMaxViableCAC(ltvReferralAdjusted);
  const cacSurplusOrDeficit = maxViableCac - inputs.blendedCac;

  const paybackPeriodMonths = calculatePaybackPeriodMonths(
    inputs.blendedCac,
    inputs.averageOrderValue,
    inputs.grossMarginPct,
    inputs.purchaseFrequencyPerYear,
  );

  // Step 4 — Chart data
  const cohortValueByYear = calculateCohortValues(inputs);

  return {
    ltvSimple,
    ltvMarginAdjusted,
    ltvNet,
    ltvReferralAdjusted,
    ltvCacRatio,
    ltvCacHealthStatus,
    paybackPeriodMonths,
    maxViableCac,
    cacSurplusOrDeficit,
    cohortValueByYear,
  };
}
