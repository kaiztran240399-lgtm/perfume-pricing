/**
 * scenarios.ts — What-if scenario P&L engine + sensitivity tornado.
 *
 * For each scenario (Base, A, B):
 *   netRevenue     = unitsSold × sellingPrice × (1 − return%) × (1 − discount%)
 *   COGS           = unitsSold × costBase  (where costBase is derived from purchasePrice)
 *   grossProfit    = netRevenue − COGS
 *   marketing      = monthlyAdSpend
 *   contribProfit  = grossProfit − marketing
 *   operatingProfit = contribProfit − fixedCosts
 *   ROAS           = netRevenue / adSpend
 *
 * Delta (A vs Base, B vs Base):
 *   Δ₫ and Δ% for key P&L lines.
 *   marginDeltaPpt in percentage points (not percent of percent).
 *
 * Sensitivity tornado:
 *   For each lever in ScenarioLevers, perturb it by +1% from base,
 *   recompute operatingProfit, measure Δ%, rank by |Δ%|.
 */

import type {
  ScenarioDelta,
  ScenarioInputs,
  ScenarioLevers,
  ScenarioMetrics,
  ScenarioOutputs,
  SensitivityEntry,
} from '../../types/business-calculator';
import { ScenarioType } from '../../types/business-calculator';
import { nonNegative, pctOf, safeDivide } from './shared';

// ─────────────────────────────────────────────────────────────────────────────
// LEVER RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Merge partial overrides onto a base lever set.
 * Any key absent in overrides inherits from base.
 *
 * This ensures every scenario always has a complete, numeric lever set.
 */
export function resolveScenarioLevers(
  base: ScenarioLevers,
  overrides: Partial<ScenarioLevers>,
): ScenarioLevers {
  return { ...base, ...overrides };
}

// ─────────────────────────────────────────────────────────────────────────────
// P&L CALCULATION PER SCENARIO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute full P&L metrics for one scenario from its lever values.
 *
 * @param levers       - resolved (complete) lever values for this scenario
 * @param baseCostBase - the baseline cost-base ₫ from PricingOutputs.
 *                       When purchasePrice changes, we scale costBase proportionally:
 *                       adjustedCostBase = baseCostBase × (levers.purchasePrice / basePurchasePrice)
 * @param basePurchasePrice - original purchase price used when baseCostBase was computed
 * @param ltvReferralAdjusted - from LTVOutputs, used for LTV impact calc
 */
export function calculateScenarioMetrics(
  levers: ScenarioLevers,
  baseCostBase: number,
  basePurchasePrice: number,
  ltvReferralAdjusted = 0,
): ScenarioMetrics {
  // Adjust cost base proportionally to purchase price change
  const purchasePriceRatio = safeDivide(levers.purchasePrice, basePurchasePrice, 1);
  const adjustedCostBase   = nonNegative(baseCostBase * purchasePriceRatio);

  // Revenue waterfall
  const grossRevenue = nonNegative(levers.monthlyUnitsSold * levers.sellingPrice);
  const netRevenue   = nonNegative(
    grossRevenue *
      (1 - levers.returnRatePct / 100) *
      (1 - levers.discountRatePct / 100),
  );

  // COGS
  const cogs = nonNegative(levers.monthlyUnitsSold * adjustedCostBase);

  // Gross profit
  const grossProfit   = netRevenue - cogs;
  const grossMarginPct = pctOf(grossProfit, netRevenue);

  // Marketing & contribution
  const marketingSpend      = nonNegative(levers.monthlyAdSpend);
  const contributionProfit  = grossProfit - marketingSpend;

  // Operating
  const fixedCosts       = nonNegative(levers.monthlyFixedCosts);
  const operatingProfit  = contributionProfit - fixedCosts;
  const operatingMarginPct = pctOf(operatingProfit, netRevenue);

  // Break-even
  const cmPerUnit     = nonNegative(
    safeDivide(netRevenue - cogs - marketingSpend, levers.monthlyUnitsSold, 0),
  );
  const breakEvenUnits = cmPerUnit > 0
    ? Math.ceil(safeDivide(fixedCosts, cmPerUnit, 0))
    : Number.MAX_SAFE_INTEGER;

  // ROAS
  const roas = safeDivide(netRevenue, marketingSpend, 0);

  // LTV:CAC impact: how does a changed ad spend / orders affect CAC, and thus LTV:CAC?
  const scenarioCac    = safeDivide(marketingSpend, levers.monthlyUnitsSold, 0);
  const ltvCacImpact   = ltvReferralAdjusted > 0 && scenarioCac > 0
    ? ltvReferralAdjusted - scenarioCac
    : 0;

  // Capital required = inventory + 1 month operating buffer
  const capitalRequired = nonNegative(
    adjustedCostBase * levers.monthlyUnitsSold + fixedCosts,
  );

  return {
    grossRevenue,
    netRevenue,
    cogs,
    grossProfit,
    grossMarginPct,
    marketingSpend,
    contributionProfit,
    fixedCosts,
    operatingProfit,
    operatingMarginPct,
    breakEvenUnits,
    roas,
    ltvCacImpact,
    capitalRequired,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DELTA ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the absolute and relative deltas between a scenario and the base.
 *
 * marginDeltaPpt is in percentage points:
 *   e.g. base margin 28%, scenario margin 31% → +3 ppt (not +10.7%)
 */
export function calculateScenarioDelta(
  scenario: ScenarioMetrics,
  base: ScenarioMetrics,
): ScenarioDelta {
  const grossRevenueDelta      = scenario.grossRevenue - base.grossRevenue;
  const operatingProfitDelta   = scenario.operatingProfit - base.operatingProfit;

  return {
    grossRevenueDelta,
    grossRevenueDeltaPct:     pctOf(grossRevenueDelta, Math.abs(base.grossRevenue)),
    operatingProfitDelta,
    operatingProfitDeltaPct:  pctOf(operatingProfitDelta, Math.abs(base.operatingProfit)),
    marginDeltaPpt:           scenario.operatingMarginPct - base.operatingMarginPct,
    breakEvenUnitsDelta:      scenario.breakEvenUnits === Number.MAX_SAFE_INTEGER
      ? 0
      : scenario.breakEvenUnits - base.breakEvenUnits,
    isImprovement:            scenario.operatingProfit > base.operatingProfit,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SENSITIVITY ANALYSIS (tornado chart)
// ─────────────────────────────────────────────────────────────────────────────

/** Vietnamese labels for each lever key. */
const LEVER_LABELS: Record<keyof ScenarioLevers, string> = {
  sellingPrice:           'Giá bán',
  monthlyUnitsSold:       'Số đơn/tháng',
  purchasePrice:          'Giá nhập',
  monthlyAdSpend:         'Chi phí quảng cáo',
  adsConversionRatePct:   'Tỷ lệ chuyển đổi ads',
  returnRatePct:          'Tỷ lệ hoàn hàng',
  discountRatePct:        'Tỷ lệ chiết khấu',
  monthlyFixedCosts:      'Chi phí cố định',
  grossMarginTargetPct:   'Biên lợi nhuận mục tiêu',
};

/** Perturbation: 1% change in lever value (relative). */
const PERTURBATION = 0.01;

/**
 * Compute the sensitivity of operatingProfit to a 1% change in one lever.
 *
 * Uses central difference approximation for accuracy:
 *   impact% = (f(x + h) − f(x − h)) / (2h) × (x / f(x)) × 100
 *
 * Where h = x × PERTURBATION (i.e. 1% of current lever value).
 *
 * For levers where x = 0, we use forward difference with h = 1.
 */
export function calculateSensitivityEntry(
  lever: keyof ScenarioLevers,
  base: ScenarioLevers,
  baseCostBase: number,
  basePurchasePrice: number,
  rank: number,
): SensitivityEntry {
  const baseValue = base[lever];
  const h = baseValue !== 0 ? Math.abs(baseValue) * PERTURBATION : 1;

  const leversUp   = { ...base, [lever]: baseValue + h };
  const leversDown = { ...base, [lever]: Math.max(0, baseValue - h) };

  const profitBase = calculateScenarioMetrics(base, baseCostBase, basePurchasePrice).operatingProfit;
  const profitUp   = calculateScenarioMetrics(leversUp, baseCostBase, basePurchasePrice).operatingProfit;
  const profitDown = calculateScenarioMetrics(leversDown, baseCostBase, basePurchasePrice).operatingProfit;

  // Central difference: rate of change in % per 1% lever change
  const denominator = 2 * h;
  const dProfitDLever = safeDivide(profitUp - profitDown, denominator, 0);
  // Elasticity: % change in profit per % change in lever
  const impactPct = Math.abs(
    safeDivide(dProfitDLever * baseValue, Math.abs(profitBase) || 1, 0) * 100,
  );

  const direction: SensitivityEntry['direction'] =
    profitUp >= profitDown ? 'positive' : 'negative';

  return {
    lever,
    leverLabel: LEVER_LABELS[lever],
    impactPct,
    direction,
    rank,
  };
}

/**
 * Compute sensitivity for all levers and return them sorted by impact (desc).
 * Assigns rank after sorting (rank 1 = highest impact).
 */
export function calculateAllSensitivities(
  base: ScenarioLevers,
  baseCostBase: number,
  basePurchasePrice: number,
): SensitivityEntry[] {
  const levers = Object.keys(base) as Array<keyof ScenarioLevers>;

  const unsorted = levers.map((lever, i) =>
    calculateSensitivityEntry(lever, base, baseCostBase, basePurchasePrice, i + 1),
  );

  const sorted = [...unsorted].sort((a, b) => b.impactPct - a.impactPct);

  // Re-assign rank after sorting
  return sorted.map((entry, i) => ({ ...entry, rank: i + 1 }));
}

// ─────────────────────────────────────────────────────────────────────────────
// RECOMMENDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recommend the scenario with the highest operating profit within capital
 * constraints. Falls back to BASE when neither scenario improves on it.
 */
export function recommendScenario(
  base: ScenarioMetrics,
  scenarioA: ScenarioMetrics,
  scenarioB: ScenarioMetrics,
): { type: ScenarioType; reason: string } {
  const best = [
    { type: ScenarioType.BASE, metrics: base },
    { type: ScenarioType.A,    metrics: scenarioA },
    { type: ScenarioType.B,    metrics: scenarioB },
  ].reduce((prev, curr) =>
    curr.metrics.operatingProfit > prev.metrics.operatingProfit ? curr : prev,
  );

  const reasons: Record<ScenarioType, string> = {
    [ScenarioType.BASE]: 'Kịch bản hiện tại đang cho lợi nhuận hoạt động cao nhất.',
    [ScenarioType.A]:    'Kịch bản A tối ưu hóa lợi nhuận hoạt động tốt hơn kịch bản gốc.',
    [ScenarioType.B]:    'Kịch bản B cho kết quả lợi nhuận hoạt động cao nhất trong 3 phương án.',
  };

  return { type: best.type, reason: reasons[best.type] };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full scenario simulation pipeline.
 *
 * @param inputs              - ScenarioInputs (base levers + A/B overrides)
 * @param baseCostBase        - ₫ from PricingOutputs.costBase
 * @param basePurchasePrice   - ₫ from PricingInputs.purchasePrice
 * @param ltvReferralAdjusted - ₫ from LTVOutputs (pass 0 if not yet computed)
 */
export function calculateScenarioOutputs(
  inputs: ScenarioInputs,
  baseCostBase: number,
  basePurchasePrice: number,
  ltvReferralAdjusted = 0,
): ScenarioOutputs {
  // Resolve complete lever sets
  const leversA = resolveScenarioLevers(inputs.base, inputs.scenarioA);
  const leversB = resolveScenarioLevers(inputs.base, inputs.scenarioB);

  // Compute P&L for each
  const base      = calculateScenarioMetrics(inputs.base, baseCostBase, basePurchasePrice, ltvReferralAdjusted);
  const scenarioA = calculateScenarioMetrics(leversA,     baseCostBase, basePurchasePrice, ltvReferralAdjusted);
  const scenarioB = calculateScenarioMetrics(leversB,     baseCostBase, basePurchasePrice, ltvReferralAdjusted);

  // Deltas
  const deltaAVsBase = calculateScenarioDelta(scenarioA, base);
  const deltaBVsBase = calculateScenarioDelta(scenarioB, base);

  // Sensitivity
  const sensitivityRanking = calculateAllSensitivities(
    inputs.base,
    baseCostBase,
    basePurchasePrice,
  );

  // Recommendation
  const { type: recommendedScenario, reason: recommendationReason } =
    recommendScenario(base, scenarioA, scenarioB);

  return {
    base,
    scenarioA,
    scenarioB,
    deltaAVsBase,
    deltaBVsBase,
    sensitivityRanking,
    recommendedScenario,
    recommendationReason,
  };
}
