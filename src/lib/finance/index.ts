/**
 * lib/finance/index.ts
 *
 * Barrel export for the financial calculation engine.
 * Import from this path for clean imports in hooks/components.
 *
 * Usage:
 *   import { calculatePricingOutputs, formatVND } from '../lib/finance'
 */

// ── Shared utilities ──────────────────────────────────────────────────────────
export {
  applyPct,
  autoLink,
  clamp,
  clampPct,
  formatNumber,
  formatPct,
  formatVND,
  monthLabel,
  nonNegative,
  pctOf,
  roundSellingPrice,
  roundToNearest,
  roundUpToNearest,
  safeDivide,
  toDecimal,
  toPct,
} from './shared';

// ── Tab 1 — Pricing ──────────────────────────────────────────────────────────
export {
  calculateCostBase,
  calculateEffectivePurchasePrice,
  calculatePricingOutputs,
  calculateSellingPrice,
  resolveAdHocCostLine,
  resolveCostLines,
  resolveTemplateCostLine,
  sumCostLines,
} from './pricing';

// ── Tab 2 — Unit Economics ───────────────────────────────────────────────────
export {
  calculateAllocatedGiftCost,
  calculateBreakEvenRevenue,
  calculateBreakEvenUnits,
  calculateCAC,
  calculateContributionMarginPerUnit,
  calculateContributionMarginRatio,
  calculateEffectiveMarginPct,
  calculateEffectiveSellingPrice,
  calculateNetRevenuePerUnit,
  calculateRoasPerUnit,
  calculateUnitEconomicsOutputs,
} from './unitEconomics';

// ── Tab 3 — Marketing ────────────────────────────────────────────────────────
export {
  calculateBlendedMetrics,
  calculateBudgetScenarios,
  calculateChannelCAC,
  calculateFacebookMetrics,
  calculateMarketingOutputs,
  calculateMER,
  calculateRevenueTargetBudgetMap,
  calculateROAS,
  calculateTikTokMetrics,
  clicksFromBudget,
  netRevenueAfterErosion,
  ordersFromClicks,
  revenueFromOrders,
} from './marketing';

// ── Tab 4 — LTV ──────────────────────────────────────────────────────────────
export {
  calculateCohortValues,
  calculateLTVCACRatio,
  calculateLTVMarginAdjusted,
  calculateLTVNet,
  calculateLTVOutputs,
  calculateLTVReferralAdjusted,
  calculateLTVSimple,
  calculateMaxViableCAC,
  calculatePaybackPeriodMonths,
  classifyHealthStatus,
} from './ltv';

// ── Tab 5 — Inventory & Cashflow ─────────────────────────────────────────────
export {
  buildCashflowProjection,
  calculateCashConversionCycle,
  calculateDailySales,
  calculateDSI,
  calculateEOQ,
  calculateInventoryOutputs,
  calculateInventoryTurnover,
  calculateReorderPoint,
} from './inventory';

// ── Tab 6 — Scenarios ────────────────────────────────────────────────────────
export {
  calculateAllSensitivities,
  calculateScenarioDelta,
  calculateScenarioMetrics,
  calculateScenarioOutputs,
  calculateSensitivityEntry,
  recommendScenario,
  resolveScenarioLevers,
} from './scenarios';
