/**
 * types/business-calculator.ts
 *
 * BACKWARD-COMPATIBILITY SHIM.
 *
 * All type definitions have been split into domain files:
 *   shared.ts, pricing.ts, unit-economics.ts, marketing.ts,
 *   ltv.ts, inventory.ts, scenario.ts, calculator.ts
 *
 * This file re-exports everything so existing imports continue to work
 * without any changes to consumers.
 */

// ── Shared primitives + enums ────────────────────────────────────────────────
export type { ProductType, CostType, Channel, TabId } from './shared';
export type { CostTemplate, SelectedCost }            from './shared';
// CostDriverType, AdsMode, ScenarioType, HealthStatus are const+type —
// export { X } covers both value and type, no export type { X } needed
export { AdsMode, ScenarioType, HealthStatus, CostDriverType } from './shared';

// ── Pricing (Tab 1) ──────────────────────────────────────────────────────────
export type {
  AdHocCostEntry,
  CostLineOutput,
  PricingInputs,
  PricingOutputs,
} from './pricing';

// ── Unit Economics (Tab 2) ───────────────────────────────────────────────────
export type {
  UnitEconomicsInputs,
  UnitEconomicsOutputs,
} from './unit-economics';

// ── Marketing (Tab 3) ────────────────────────────────────────────────────────
export type {
  FacebookChannelInputs,
  TikTokChannelInputs,
  MarketingInputs,
  MarketingOutputs,
  ChannelMetrics,
  BudgetScenario,
} from './marketing';

// ── LTV (Tab 4) ──────────────────────────────────────────────────────────────
export type {
  LTVInputs,
  LTVOutputs,
  CohortYearValue,
} from './ltv';

// ── Inventory (Tab 5) ────────────────────────────────────────────────────────
export type {
  InventoryInputs,
  InventoryOutputs,
  MonthlySalesForecastEntry,
  MonthlyProjection,
} from './inventory';

// ── Scenarios (Tab 6) ────────────────────────────────────────────────────────
export type {
  ScenarioLevers,
  ScenarioInputs,
  ScenarioOutputs,
  ScenarioMetrics,
  ScenarioDelta,
  SensitivityEntry,
} from './scenario';

// ── Root aggregates ──────────────────────────────────────────────────────────
export type {
  BusinessCalculatorInputs,
  BusinessCalculatorDerived,
} from './calculator';
