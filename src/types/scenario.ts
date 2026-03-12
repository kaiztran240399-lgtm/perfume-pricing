/**
 * types/scenario.ts
 *
 * Input/output types for Tab 6 — Scenario Simulator.
 */

import type { CalcWarning, ScenarioType } from './shared';

// ─────────────────────────────────────────────────────────────────────────────
// LEVERS & INPUTS
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

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUTS
// ─────────────────────────────────────────────────────────────────────────────

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

  // ── Domain warnings ──────────────────────────────────────────────────────
  warnings: CalcWarning[];
}
