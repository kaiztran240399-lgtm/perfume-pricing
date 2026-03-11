/**
 * types/index.ts
 *
 * Barrel export for all domain types.
 * Import from here for clean paths: import type { X } from '../types'
 */

// ── Shared primitives + enums ────────────────────────────────────────────────
export type { ProductType, CostType, Channel, TabId } from './shared';
export type { CostTemplate, SelectedCost }            from './shared';
export { AdsMode, ScenarioType, HealthStatus, CostDriverType } from './shared';

// ── Pricing ──────────────────────────────────────────────────────────────────
export type { AdHocCostEntry, CostLineOutput, PricingInputs, PricingOutputs } from './pricing';

// ── Unit Economics ───────────────────────────────────────────────────────────
export type { UnitEconomicsInputs, UnitEconomicsOutputs } from './unit-economics';

// ── Marketing ────────────────────────────────────────────────────────────────
export type {
  FacebookChannelInputs, TikTokChannelInputs,
  MarketingInputs, MarketingOutputs,
  ChannelMetrics, BudgetScenario,
} from './marketing';

// ── LTV ──────────────────────────────────────────────────────────────────────
export type { LTVInputs, LTVOutputs, CohortYearValue } from './ltv';

// ── Inventory ────────────────────────────────────────────────────────────────
export type {
  InventoryInputs, InventoryOutputs,
  MonthlySalesForecastEntry, MonthlyProjection,
} from './inventory';

// ── Scenario ─────────────────────────────────────────────────────────────────
export type {
  ScenarioLevers, ScenarioInputs, ScenarioOutputs,
  ScenarioMetrics, ScenarioDelta, SensitivityEntry,
} from './scenario';

// ── Root aggregates ──────────────────────────────────────────────────────────
export type { BusinessCalculatorInputs, BusinessCalculatorDerived } from './calculator';

// ── Legacy interfaces (used by pages/ and lib/auth.ts) ───────────────────────
export interface Product {
  id: string;
  name: string;
  brand: string;
  type: import('./shared').ProductType;
  size_ml: number;
  purchase_price: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface PriceHistory {
  id: string;
  product_name: string;
  brand?: string;
  product_type: import('./shared').ProductType;
  size_ml?: number;
  bottle_size_ml?: number;
  decant_size_ml?: number;
  purchase_price: number;
  costs: import('./shared').SelectedCost[];
  total_cost: number;
  profit_margin: number;
  selling_price: number;
  selling_price_rounded: number;
  channel: import('./shared').Channel;
  notes?: string;
  created_at: string;
}

export interface PriceCalculation {
  purchasePrice: number;
  costsBreakdown: { name: string; amount: number; is_percentage: boolean; rate?: number }[];
  totalCostAmount: number;
  totalCostPercent: number;
  profitMargin: number;
  costBase: number;
  sellingPrice: number;
  sellingPriceRounded: number;
}
