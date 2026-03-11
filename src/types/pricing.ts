/**
 * types/pricing.ts
 *
 * Input/output types for Tab 1 — Pricing Calculator.
 */

import type { Channel, CostType, ProductType } from './shared';

// ─────────────────────────────────────────────────────────────────────────────
// SHARED OUTPUT SUB-TYPE
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

// ─────────────────────────────────────────────────────────────────────────────
// INPUTS
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

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUTS
// ─────────────────────────────────────────────────────────────────────────────

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
