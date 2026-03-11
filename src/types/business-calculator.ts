/**
 * business-calculator.ts
 *
 * Full TypeScript data model for the 6-tab Business Calculator.
 * Imports and reuses existing primitives from ./index.ts.
 * No UI concerns — pure data shapes.
 *
 * Module order:
 *   1. Enums
 *   2. Shared sub-types
 *   3. Tab modules (Inputs + Outputs per tab)
 *   4. Scenario levers + delta types
 *   5. Global state
 */

import type { Channel, CostType, ProductType, SelectedCost } from './index';

// ─────────────────────────────────────────────────────────────────────────────
// 1. ENUMS
// ─────────────────────────────────────────────────────────────────────────────

/** How marketing/ad costs are specified by the user. */
export const AdsMode = {
  /** Fixed ₫ amount per month regardless of revenue. */
  FIXED_VND:       'fixed_vnd',
  /** Percentage of gross revenue (e.g. TikTok commission default). */
  PERCENT_REVENUE: 'pct_revenue',
} as const;
export type AdsMode = typeof AdsMode[keyof typeof AdsMode];

/** Which scenario column is being referenced. */
export const ScenarioType = {
  BASE: 'base' as const,
  A:   'a'    as const,
  B:   'b'    as const,
} as const;
export type ScenarioType = typeof ScenarioType[keyof typeof ScenarioType];

/**
 * Health classification for ratio metrics (LTV:CAC, CM ratio, etc.).
 * Thresholds defined in lib/thresholds.ts, not here.
 */
export const HealthStatus = {
  CRITICAL:  'critical',   // e.g. LTV:CAC < 1
  WARNING:   'warning',    // e.g. LTV:CAC 1–3
  HEALTHY:   'healthy',    // e.g. LTV:CAC 3–5
  EXCELLENT: 'excellent',  // e.g. LTV:CAC > 5
} as const;
export type HealthStatus = typeof HealthStatus[keyof typeof HealthStatus];

/** Navigation identifier for each of the 6 calculator tabs. */
export type TabId =
  | 'pricing'
  | 'unit-economics'
  | 'marketing'
  | 'ltv'
  | 'inventory'
  | 'scenario';

// ─────────────────────────────────────────────────────────────────────────────
// 2. SHARED SUB-TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** A single resolved cost line shown in breakdowns and waterfalls. */
export interface CostLineOutput {
  name: string;
  /** Computed ₫ amount for this line. */
  amount: number;
  isPercentage: boolean;
  /** Original % rate if isPercentage = true. */
  rate?: number;
  costType: CostType;
}

/** One month in the 6-month cashflow projection. */
export interface MonthlyProjection {
  /** 0-based index (0 = current month, 5 = 5 months out). */
  monthIndex: number;
  /** Human label, e.g. "T4/2026". */
  label: string;
  openingBalance: number;       // ₫
  grossRevenue: number;         // ₫ before collection lag
  collectedCash: number;        // ₫ after collection lag
  inventoryPurchaseCost: number;// ₫ outflow to supplier this month
  operatingCosts: number;       // ₫ fixed + variable ops
  marketingSpend: number;       // ₫ ads + content + KOL
  taxReserve: number;           // ₫ set aside for tax
  netCashflow: number;          // ₫ = collected - all outflows
  closingBalance: number;       // ₫
  /** true when closingBalance falls below minimum reserve threshold. */
  isCritical: boolean;
}

/** LTV value breakdown by cohort year for charting. */
export interface CohortYearValue {
  year: number;
  /** Cumulative margin-adjusted revenue from this customer cohort by year N. */
  cumulativeLtv: number;        // ₫
  newCustomersValue: number;    // ₫
  retainedCustomersValue: number; // ₫
}

/** Revenue + orders projected at a given ad budget multiplier. */
export interface BudgetScenario {
  /** e.g. 1, 1.5, 2 → 100% / 150% / 200% of base budget. */
  multiplier: number;
  totalAdSpend: number;         // ₫
  estimatedOrders: number;
  estimatedRevenue: number;     // ₫
  projectedRoas: number;
}

/** Per-channel computed marketing metrics. */
export interface ChannelMetrics {
  estimatedOrders: number;
  grossRevenue: number;         // ₫
  netRevenue: number;           // ₫ after return + platform commission
  roas: number;
  cac: number;                  // ₫ cost to acquire one customer
  costPerOrder: number;         // ₫
}

/** Sales forecast for one month (input to inventory/cashflow). */
export interface MonthlySalesForecastEntry {
  monthIndex: number;
  label: string;                // "T4/2026"
  forecastUnits: number;
  forecastRevenue: number;      // ₫
  /** Auto-linked from MarketingOutputs or manually overridden. */
  marketingSpend: number;       // ₫
}

// ─────────────────────────────────────────────────────────────────────────────
// 3A. TAB 1 — PRICING CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────

/** One ad-hoc cost row added by the user on the fly (not from template). */
export interface AdHocCostEntry {
  id: string;
  name: string;
  isPercentage: boolean;
  value: number;
}

export interface PricingInputs {
  // ── Product identity ─────────────────────────────────────────────────────
  productName: string;
  brand: string;
  productType: ProductType;

  // ── Full-size fields ─────────────────────────────────────────────────────
  /** ml of the bottle (full_size only). */
  sizeMl: number;

  // ── Chiết (decant) fields ─────────────────────────────────────────────────
  /** ml of the original bottle (chiet only). */
  bottleSizeMl: number;
  /** ml of each decant bottle (chiet only). */
  decantSizeMl: number;

  // ── Purchase price ───────────────────────────────────────────────────────
  /** ₫ per full bottle (both types — decant price is derived). */
  purchasePrice: number;

  // ── Costs ────────────────────────────────────────────────────────────────
  /** IDs of active CostTemplate rows the user has toggled on. */
  selectedCostIds: string[];
  /** Overridden values keyed by templateId. Missing = use template default. */
  customCostValues: Record<string, number>;
  /** Free-form cost rows added ad-hoc. */
  adHocCosts: AdHocCostEntry[];

  // ── Profit & channel ─────────────────────────────────────────────────────
  /** Target gross margin %, e.g. 30 = 30%. */
  targetMarginPct: number;
  channel: Channel;
  notes: string;
}

export interface PricingOutputs {
  // ── Per-unit basis ───────────────────────────────────────────────────────
  /** ₫ per unit. Equals purchasePrice for full_size; derived for chiet. */
  effectivePurchasePrice: number;
  variableCostFixedAmount: number;  // ₫ sum of all fixed-₫ variable costs
  variableCostPctAmount: number;    // ₫ sum of all %-based variable costs
  totalCostPerUnit: number;         // ₫ = above two combined
  /** ₫ total cost base (costBase = effectivePurchasePrice + all costs). */
  costBase: number;

  // ── Selling price ────────────────────────────────────────────────────────
  sellingPriceExact: number;        // ₫ exact
  sellingPriceRounded: number;      // ₫ rounded per commercial rules

  // ── Margin ───────────────────────────────────────────────────────────────
  grossProfitPerUnit: number;       // ₫
  grossMarginPct: number;           // % = grossProfit / sellingPrice × 100

  // ── Breakdown for waterfall display ──────────────────────────────────────
  costsBreakdown: CostLineOutput[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 3B. TAB 2 — UNIT ECONOMICS
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
}

// ─────────────────────────────────────────────────────────────────────────────
// 3C. TAB 3 — MARKETING MODEL
// ─────────────────────────────────────────────────────────────────────────────

export interface FacebookChannelInputs {
  monthlyBudget: number;            // ₫
  /** ₫ cost per click — or estimated from benchmark. */
  cpc: number;
  /** % of clicks that convert to paid orders. */
  landingPageCvrPct: number;
  /** AOV for this channel. Falls back to shared AOV if 0. */
  averageOrderValue: number;        // ₫
  adsMode: AdsMode;
}

export interface TikTokChannelInputs {
  monthlyAdBudget: number;          // ₫
  /** ₫ monthly GMV from organic TikTok traffic (no ads). */
  monthlyOrganicGmv: number;
  /** ₫ platform voucher budget funded by seller. */
  platformVoucherBudget: number;
  /** % TikTok Shop commission (typically 3–5%). */
  commissionRatePct: number;
  /** % product page visitors who complete purchase. */
  productPageCvrPct: number;
  averageOrderValue: number;        // ₫
  adsMode: AdsMode;
}

export interface MarketingInputs {
  facebook: FacebookChannelInputs;
  tiktok: TikTokChannelInputs;

  // ── Shared AOV fallback ───────────────────────────────────────────────────
  /** Used when channel-specific AOV is 0. Auto-linked from PricingOutputs. */
  sharedAverageOrderValue: number;  // ₫

  // ── Supporting marketing costs ───────────────────────────────────────────
  contentCostPerMonth: number;      // ₫ photography, video, copywriting
  kolCostPerMonth: number;          // ₫ influencer / KOL fees
  marketingStaffCostPerMonth: number; // ₫ salaries allocated to marketing

  // ── Shared assumptions ───────────────────────────────────────────────────
  /** Linked from UnitEconomicsInputs. */
  returnRatePct: number;
}

export interface MarketingOutputs {
  facebook: ChannelMetrics;
  tiktok: ChannelMetrics;

  blended: {
    totalOrders: number;
    totalGrossRevenue: number;      // ₫
    totalNetRevenue: number;        // ₫
    totalAdSpend: number;           // ₫
    /** Includes ad spend + content + KOL + staff. */
    totalMarketingCost: number;     // ₫
    blendedRoas: number;
    blendedCac: number;             // ₫
    /** Revenue / totalMarketingCost — broader than ROAS. */
    mer: number;
    revenueShareFacebookPct: number;
    revenueShareTiktokPct: number;
  };

  /** Budget projections at 1×, 1.5×, 2× of current spend. */
  budgetScenarios: BudgetScenario[];

  /**
   * Minimum monthly ad budget required to hit a specific revenue target.
   * Stored as a lookup table (target ₫ → required budget ₫).
   */
  revenueTargetBudgetMap: Array<{ targetRevenue: number; requiredBudget: number }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3D. TAB 4 — CUSTOMER LTV
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

// ─────────────────────────────────────────────────────────────────────────────
// 3E. TAB 5 — INVENTORY & CASHFLOW
// ─────────────────────────────────────────────────────────────────────────────

export interface InventoryInputs {
  // ── Current state ─────────────────────────────────────────────────────────
  currentInventoryUnits: number;
  startingCashBalance: number;            // ₫

  // ── Reorder parameters ───────────────────────────────────────────────────
  leadTimeDays: number;
  /** e.g. 1.5 = 50% safety buffer on top of lead-time demand. */
  safetyStockMultiplier: number;
  /** ₫ admin/logistics cost per purchase order placed. */
  orderingCostPerOrder: number;
  /** ₫ per unit per month for storage, insurance, spoilage. */
  holdingCostPerUnitPerMonth: number;

  // ── Supplier payment terms ────────────────────────────────────────────────
  /** % of invoice paid when placing the order (0–100). */
  supplierUpfrontPct: number;
  /** Days after delivery to pay the remaining balance. */
  supplierBalanceDueDays: number;

  // ── Revenue collection lag ────────────────────────────────────────────────
  /** Days to receive COD cash after order fulfilment. */
  facebookCollectionLagDays: number;
  /** Days for TikTok Shop to remit payment after order completion. */
  tiktokCollectionLagDays: number;

  // ── Monthly operating costs ───────────────────────────────────────────────
  /** ₫ fixed costs: rent, salaries, subscriptions, utilities. */
  monthlyFixedOperatingCosts: number;
  /** % of net profit to reserve for tax each month. */
  taxReserveRatePct: number;
  /** ₫ any non-sales income (investment, side revenue). */
  otherMonthlyIncome: number;

  // ── 6-month sales forecast ───────────────────────────────────────────────
  /** Auto-populated from MarketingOutputs.blended; user can override. */
  monthlySalesForecast: MonthlySalesForecastEntry[];
}

export interface InventoryOutputs {
  // ── Reorder metrics ───────────────────────────────────────────────────────
  reorderPoint: number;                   // units
  economicOrderQuantity: number;          // units (EOQ formula)
  currentInventoryValue: number;          // ₫

  // ── Turnover ─────────────────────────────────────────────────────────────
  /** Days of sales remaining in current inventory. */
  daysOfSalesInventory: number;
  /** Annual inventory turnover ratio. */
  inventoryTurnoverAnnual: number;

  // ── Cash metrics ─────────────────────────────────────────────────────────
  /** Days: DSI + DSO − DPO. */
  cashConversionCycleDays: number;
  /** Months of fixed operating costs covered by current cash balance. */
  cashRunwayMonths: number;
  /** ₫ minimum cash reserve the business should maintain. */
  minimumCashReserveNeeded: number;

  // ── 6-month projection ───────────────────────────────────────────────────
  cashflowProjection: MonthlyProjection[];
  /** monthIndex values where closingBalance turns negative. */
  criticalMonths: number[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SCENARIO SIMULATOR TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All adjustable business levers. Scenario A/B each override a subset.
 * Every field is a required number so downstream P&L maths are always safe.
 */
export interface ScenarioLevers {
  sellingPrice: number;             // ₫ per unit
  monthlyUnitsSold: number;
  purchasePrice: number;            // ₫ per unit (simulates supplier negotiation)
  monthlyAdSpend: number;           // ₫
  adsConversionRatePct: number;     // %
  returnRatePct: number;            // %
  discountRatePct: number;          // %
  monthlyFixedCosts: number;        // ₫
  grossMarginTargetPct: number;     // %
}

export interface ScenarioInputs {
  /** Auto-populated from current global state — read-only in UI. */
  base: ScenarioLevers;
  /** User-defined overrides; unset keys inherit from base. */
  scenarioA: Partial<ScenarioLevers>;
  scenarioB: Partial<ScenarioLevers>;
}

/** Full computed P&L for one scenario column. */
export interface ScenarioMetrics {
  grossRevenue: number;             // ₫
  netRevenue: number;               // ₫ after returns + discounts
  cogs: number;                     // ₫ total cost of goods sold
  grossProfit: number;              // ₫
  grossMarginPct: number;           // %
  marketingSpend: number;           // ₫
  contributionProfit: number;       // ₫ = grossProfit − marketing
  fixedCosts: number;               // ₫
  operatingProfit: number;          // ₫
  operatingMarginPct: number;       // %
  breakEvenUnits: number;
  roas: number;
  /** ₫ delta to LTV_Net caused by changed CAC in this scenario. */
  ltvCacImpact: number;
  /** ₫ estimated capital needed for this scenario's inventory + working capital. */
  capitalRequired: number;
}

/** Absolute and relative difference between one scenario and base. */
export interface ScenarioDelta {
  grossRevenueDelta: number;            // ₫
  grossRevenueDeltaPct: number;         // %
  operatingProfitDelta: number;         // ₫
  operatingProfitDeltaPct: number;      // %
  /** Difference in margin percentage points (e.g. 28% → 31% = +3 ppt). */
  marginDeltaPpt: number;
  breakEvenUnitsDelta: number;
  /** true if this scenario improves operating profit vs base. */
  isImprovement: boolean;
}

/**
 * Sensitivity of operating profit to a 1% change in one lever.
 * Used to build the tornado chart.
 */
export interface SensitivityEntry {
  lever: keyof ScenarioLevers;
  /** Vietnamese label for display in the chart. */
  leverLabel: string;
  /** % change in operating profit per 1% change in this lever. */
  impactPct: number;
  /** Whether increasing this lever improves (positive) or hurts profit. */
  direction: 'positive' | 'negative';
  /** 1 = highest impact lever. */
  rank: number;
}

export interface ScenarioOutputs {
  base: ScenarioMetrics;
  scenarioA: ScenarioMetrics;
  scenarioB: ScenarioMetrics;

  deltaAVsBase: ScenarioDelta;
  deltaBVsBase: ScenarioDelta;

  /** Levers ranked by impact magnitude, descending. */
  sensitivityRanking: SensitivityEntry[];

  /** Which scenario yields the highest operating profit within capital constraints. */
  recommendedScenario: ScenarioType;
  recommendationReason: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. GLOBAL STATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All user inputs across all 6 tabs.
 * This is the ONLY slice persisted to localStorage / Supabase.
 * Serialisation-safe: no functions, no class instances.
 */
export interface BusinessCalculatorInputs {
  pricing:        PricingInputs;
  unitEconomics:  UnitEconomicsInputs;
  marketing:      MarketingInputs;
  ltv:            LTVInputs;
  inventory:      InventoryInputs;
  scenario:       ScenarioInputs;

  meta: {
    /** Semver string for migration guards, e.g. "2.0.0". */
    appVersion: string;
    /** ISO timestamp of last user-triggered save. */
    lastSavedAt: string;
    activeTab: TabId;
  };
}

/**
 * All computed outputs across all 6 tabs.
 * This slice is NEVER persisted — always derived from BusinessCalculatorInputs
 * via pure functions in lib/calculations/.
 */
export interface BusinessCalculatorDerived {
  pricing:        PricingOutputs;
  unitEconomics:  UnitEconomicsOutputs;
  marketing:      MarketingOutputs;
  ltv:            LTVOutputs;
  inventory:      InventoryOutputs;
  scenario:       ScenarioOutputs;
}

// Re-export primitives consumed by this module so callers have one import path.
export type { Channel, CostType, ProductType, SelectedCost };
