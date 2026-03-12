/**
 * marketing.ts — Revenue funnel & marketing efficiency engine.
 *
 * Formula chain per channel:
 *   budget → clicks (via CPC) → orders (via CVR) → revenue (via AOV)
 *   → ROAS = revenue / budget
 *   → CAC  = budget / orders
 *
 * Blended:
 *   MER = totalRevenue / totalMarketingCost
 *   (MER is wider than ROAS — it includes content, KOL, staff costs)
 *
 * Budget scenarios: project outcomes at 1×, 1.5×, 2× of current spend.
 * Reverse calc: given a target revenue, back-compute required budget.
 */

import type { CalcWarning } from '../../types/shared';
import type {
  BudgetScenario,
  ChannelMetrics,
  MarketingInputs,
  MarketingOutputs,
} from '../../types/marketing';
import { AdsMode } from '../../types/shared';
import { nonNegative, pctOf, safeDivide } from './shared';

// ─────────────────────────────────────────────────────────────────────────────
// SHARED CHANNEL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Clicks from a fixed-₫ budget and a CPC.
 * Returns 0 when CPC = 0.
 */
export function clicksFromBudget(budget: number, cpc: number): number {
  return nonNegative(safeDivide(budget, cpc, 0));
}

/**
 * Orders from clicks and conversion rate.
 * cvrPct: 0–100 (e.g. 2.5 = 2.5%)
 */
export function ordersFromClicks(clicks: number, cvrPct: number): number {
  return nonNegative(clicks * (cvrPct / 100));
}

/**
 * Gross revenue from orders and AOV.
 */
export function revenueFromOrders(orders: number, aov: number): number {
  return nonNegative(orders * aov);
}

/**
 * Net revenue after deducting return-rate erosion and a platform commission.
 *
 * netRevenue = grossRevenue × (1 − returnPct%) × (1 − commissionPct%)
 */
export function netRevenueAfterErosion(
  grossRevenue: number,
  returnRatePct: number,
  commissionRatePct = 0,
): number {
  return nonNegative(
    grossRevenue * (1 - returnRatePct / 100) * (1 - commissionRatePct / 100),
  );
}

/**
 * ROAS = revenue / adSpend.
 * Returns 0 when spend = 0 (organic only).
 */
export function calculateROAS(revenue: number, adSpend: number): number {
  return safeDivide(revenue, adSpend, 0);
}

/**
 * CAC = adSpend / orders.
 * Returns 0 when orders = 0.
 */
export function calculateChannelCAC(adSpend: number, orders: number): number {
  return safeDivide(adSpend, orders, 0);
}

/**
 * Cost per order = adSpend / orders (same formula as CAC in single-channel view,
 * but used for the blended "fully-loaded" cost per order).
 */
export function costPerOrder(adSpend: number, orders: number): number {
  return safeDivide(adSpend, orders, 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// FACEBOOK CHANNEL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute ChannelMetrics for Facebook.
 *
 * AdsMode.FIXED_VND:        budget is a fixed ₫ monthly spend.
 * AdsMode.PERCENT_REVENUE:  budget = targetRevenue × pct — requires a seed
 *                           revenue estimate; we derive it iteratively below.
 *
 * For PERCENT_REVENUE we solve:
 *   revenue = clicks × CVR × AOV  where  clicks = (revenue × pct) / CPC
 *   → revenue = (revenue × pct / CPC) × CVR × AOV
 *   → 1 = (pct / CPC) × CVR × AOV
 *   This is a self-referential system; we set an effective budget = seed × pct
 *   where seed comes from the monthly gross revenue passed by the caller.
 */
export function calculateFacebookMetrics(
  fb: MarketingInputs['facebook'],
  returnRatePct: number,
  effectiveAov: number,
  /** Required only when adsMode = PERCENT_REVENUE. Gross revenue seed (₫). */
  revenueSeeds = 0,
): ChannelMetrics {
  const budget =
    fb.adsMode === AdsMode.PERCENT_REVENUE
      ? nonNegative(revenueSeeds * (fb.monthlyBudget / 100))
      : nonNegative(fb.monthlyBudget);

  const aov    = effectiveAov > 0 ? effectiveAov : fb.averageOrderValue;
  const clicks = clicksFromBudget(budget, fb.cpc);
  const estimatedOrders  = ordersFromClicks(clicks, fb.landingPageCvrPct);
  const grossRevenue     = revenueFromOrders(estimatedOrders, aov);
  const netRevenue       = netRevenueAfterErosion(grossRevenue, returnRatePct, 0);

  return {
    estimatedOrders,
    grossRevenue,
    netRevenue,
    roas:         calculateROAS(netRevenue, budget),
    cac:          calculateChannelCAC(budget, estimatedOrders),
    costPerOrder: costPerOrder(budget, estimatedOrders),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TIKTOK SHOP CHANNEL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute ChannelMetrics for TikTok Shop.
 *
 * TikTok has two revenue streams:
 *   1. Paid ads funnel:  adBudget → clicks → orders
 *   2. Organic GMV:      direct sales with no ads
 *
 * Net revenue deducts TikTok commission AND return erosion.
 * CAC is only computed on the paid-ads portion.
 */
export function calculateTikTokMetrics(
  tt: MarketingInputs['tiktok'],
  returnRatePct: number,
  effectiveAov: number,
  revenueSeeds = 0,
): ChannelMetrics {
  const adBudget =
    tt.adsMode === AdsMode.PERCENT_REVENUE
      ? nonNegative(revenueSeeds * (tt.monthlyAdBudget / 100))
      : nonNegative(tt.monthlyAdBudget);

  const aov = effectiveAov > 0 ? effectiveAov : tt.averageOrderValue;

  // Paid ads orders
  // For TikTok we model CPC implicitly via CVR on ad impressions.
  // When CPC data is unavailable, callers often set cpc = aov × CVR% which
  // approximates cost-per-click from known ROAS targets.
  // Here we derive from the conversion rate directly using budget ÷ AOV as an
  // order cap, then apply CVR.
  const adsOrders = nonNegative(
    safeDivide(adBudget, aov, 0) * (tt.productPageCvrPct / 100),
  );

  // Organic orders
  const organicOrders = nonNegative(safeDivide(tt.monthlyOrganicGmv, aov, 0));

  const estimatedOrders = adsOrders + organicOrders;
  const grossRevenue    = revenueFromOrders(estimatedOrders, aov);

  // TikTok commission is deducted from gross before returns
  const netRevenue = netRevenueAfterErosion(
    grossRevenue,
    returnRatePct,
    tt.commissionRatePct,
  );

  // CAC only on paid-ads spend (organic is "free")
  const cac = calculateChannelCAC(adBudget, adsOrders);

  return {
    estimatedOrders,
    grossRevenue,
    netRevenue,
    roas:         calculateROAS(netRevenue, adBudget),
    cac,
    costPerOrder: costPerOrder(adBudget, estimatedOrders),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BLENDED / TOTAL METRICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * MER — Marketing Efficiency Ratio.
 *
 * MER = totalRevenue / totalMarketingCost
 *
 * Unlike ROAS (which only divides by ad spend), MER includes ALL marketing
 * costs: ads + content + KOL + staff. It is therefore always ≤ blended ROAS.
 */
export function calculateMER(
  totalRevenue: number,
  totalMarketingCost: number,
): number {
  return safeDivide(totalRevenue, totalMarketingCost, 0);
}

export function calculateBlendedMetrics(
  fb: ChannelMetrics,
  tt: ChannelMetrics,
  inputs: Pick<
    MarketingInputs,
    'facebook' | 'tiktok' | 'contentCostPerMonth' | 'kolCostPerMonth' | 'marketingStaffCostPerMonth'
  >,
): MarketingOutputs['blended'] {
  const totalOrders       = fb.estimatedOrders + tt.estimatedOrders;
  const totalGrossRevenue = fb.grossRevenue + tt.grossRevenue;
  const totalNetRevenue   = fb.netRevenue + tt.netRevenue;

  const fbAdSpend = nonNegative(inputs.facebook.monthlyBudget);
  const ttAdSpend = nonNegative(inputs.tiktok.monthlyAdBudget);
  const totalAdSpend = fbAdSpend + ttAdSpend;

  const totalMarketingCost =
    totalAdSpend +
    nonNegative(inputs.contentCostPerMonth) +
    nonNegative(inputs.kolCostPerMonth) +
    nonNegative(inputs.marketingStaffCostPerMonth);

  const blendedRoas = calculateROAS(totalNetRevenue, totalAdSpend);
  const blendedCac  = safeDivide(totalAdSpend, totalOrders, 0);
  const mer         = calculateMER(totalNetRevenue, totalMarketingCost);

  return {
    totalOrders,
    totalGrossRevenue,
    totalNetRevenue,
    totalAdSpend,
    totalMarketingCost,
    blendedRoas,
    blendedCac,
    mer,
    revenueShareFacebookPct: pctOf(fb.grossRevenue, totalGrossRevenue),
    revenueShareTiktokPct:   pctOf(tt.grossRevenue, totalGrossRevenue),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BUDGET SCENARIOS (1×, 1.5×, 2×)
// ─────────────────────────────────────────────────────────────────────────────

const BUDGET_MULTIPLIERS = [1, 1.5, 2] as const;

/**
 * Project revenue/orders at different budget multiples.
 *
 * Assumes revenue scales linearly with budget (constant ROAS).
 * This is a simplification — in reality ROAS curves as budgets scale,
 * but it provides a useful directional estimate.
 */
export function calculateBudgetScenarios(
  baseBlended: MarketingOutputs['blended'],
  baseTotalAdSpend: number,
): BudgetScenario[] {
  return BUDGET_MULTIPLIERS.map((multiplier) => {
    const totalAdSpend      = baseTotalAdSpend * multiplier;
    const estimatedRevenue  = nonNegative(totalAdSpend * baseBlended.blendedRoas);
    const estimatedOrders   = nonNegative(
      safeDivide(estimatedRevenue, safeDivide(
        baseBlended.totalGrossRevenue,
        baseBlended.totalOrders,
        0,
      ), 0),
    );

    return {
      multiplier,
      totalAdSpend,
      estimatedOrders: Math.round(estimatedOrders),
      estimatedRevenue,
      projectedRoas: baseBlended.blendedRoas,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// REVERSE CALCULATION — required budget for revenue target
// ─────────────────────────────────────────────────────────────────────────────

/**
 * requiredBudget = targetRevenue / ROAS
 *
 * Provides a lookup table for common revenue targets (×0.5, ×1, ×1.5, ×2, ×3
 * of current revenue).
 */
export function calculateRevenueTargetBudgetMap(
  currentRevenue: number,
  currentAdSpend: number,
): MarketingOutputs['revenueTargetBudgetMap'] {
  const roas = calculateROAS(currentRevenue, currentAdSpend);
  const targets = [0.5, 1, 1.5, 2, 3].map((m) => currentRevenue * m);

  return targets.map((targetRevenue) => ({
    targetRevenue,
    requiredBudget: nonNegative(safeDivide(targetRevenue, roas, 0)),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// WARNING CONDITIONS
// ─────────────────────────────────────────────────────────────────────────────

export function computeMarketingWarnings(
  out: Omit<MarketingOutputs, 'warnings'>,
  aov: number,
): CalcWarning[] {
  const w: CalcWarning[] = [];

  if (out.blended.totalOrders === 0) {
    w.push({ level: 'info', code: 'NO_ORDERS', message: 'Chưa có đơn hàng — nhập ngân sách quảng cáo để xem ước tính hiệu quả.' });
  }

  if (out.blended.totalAdSpend > 0 && out.blended.blendedRoas < 2) {
    w.push({ level: 'warning', code: 'LOW_BLENDED_ROAS', message: `ROAS pha trộn ${out.blended.blendedRoas.toFixed(1)}× — dưới ngưỡng hiệu quả 2×.` });
  }

  if (aov > 0 && out.blended.blendedCac > 0 && out.blended.blendedCac > aov * 0.3) {
    w.push({ level: 'warning', code: 'HIGH_CAC', message: `CAC chiếm >${(out.blended.blendedCac / aov * 100).toFixed(0)}% AOV — chi phí thu hút khách cao.` });
  }

  return w;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full marketing model pipeline.
 */
export function calculateMarketingOutputs(
  inputs: MarketingInputs,
): MarketingOutputs {
  const aov = inputs.sharedAverageOrderValue;

  // Channel metrics
  const facebook = calculateFacebookMetrics(
    inputs.facebook,
    inputs.returnRatePct,
    aov,
  );
  const tiktok = calculateTikTokMetrics(
    inputs.tiktok,
    inputs.returnRatePct,
    aov,
  );

  // Blended
  const blended = calculateBlendedMetrics(facebook, tiktok, inputs);

  // Budget scenarios
  const budgetScenarios = calculateBudgetScenarios(blended, blended.totalAdSpend);

  // Reverse calc map
  const revenueTargetBudgetMap = calculateRevenueTargetBudgetMap(
    blended.totalNetRevenue,
    blended.totalAdSpend,
  );

  const partial = { facebook, tiktok, blended, budgetScenarios, revenueTargetBudgetMap };
  return { ...partial, warnings: computeMarketingWarnings(partial, aov) };
}
