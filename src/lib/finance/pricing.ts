/**
 * pricing.ts — Selling-price calculation engine.
 *
 * Core formula chain:
 *   effectivePurchasePrice
 *     → resolveCostLines   (templates + ad-hoc → CostLineOutput[])
 *     → calculateCostBase  (purchasePrice + all costs)
 *     → calculateSellingPrice (costBase / (1 − margin%))
 *     → roundSellingPrice
 *
 * All functions are pure; no UI imports.
 */

import type { CalcWarning } from '../../types/shared';
import type { CostTemplate } from '../../types';
import type {
  AdHocCostEntry,
  CostLineOutput,
  PricingInputs,
  PricingOutputs,
} from '../../types/pricing';
import {
  applyPct,
  nonNegative,
  pctOf,
  roundSellingPrice,
  safeDivide,
} from './shared';
import { resolveCostDriver, isPercentageDriver } from '../costDrivers';

// ─────────────────────────────────────────────────────────────────────────────
// EFFECTIVE PURCHASE PRICE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * For full_size: returns purchasePrice as-is.
 * For chiet:     pricePerDecant = (bottlePrice / bottleSize) × decantSize
 *
 * Returns 0 when any input required for derivation is missing or zero.
 */
export function calculateEffectivePurchasePrice(inputs: {
  productType: PricingInputs['productType'];
  purchasePrice: number;
  bottleSizeMl: number;
  decantSizeMl: number;
}): number {
  if (inputs.productType === 'full_size') {
    return nonNegative(inputs.purchasePrice);
  }
  // chiet
  const pricePerMl = safeDivide(inputs.purchasePrice, inputs.bottleSizeMl, 0);
  return nonNegative(pricePerMl * inputs.decantSizeMl);
}

// ─────────────────────────────────────────────────────────────────────────────
// COST LINE RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve a single CostTemplate into a CostLineOutput.
 *
 * If the caller has supplied a custom override value for this template,
 * it takes precedence over template.default_value.
 *
 * Percentage costs are applied on effectivePurchasePrice.
 */
export function resolveTemplateCostLine(
  template: CostTemplate,
  effectivePurchasePrice: number,
  customValue?: number,
): CostLineOutput {
  const rate = customValue !== undefined ? customValue : template.default_value;

  // If an explicit driverType is set, use the new resolver; otherwise fall back
  // to the legacy is_percentage logic for backward compatibility.
  let amount: number;
  let isPercentage: boolean;

  if (template.driverType) {
    amount = resolveCostDriver(template.driverType, rate, {
      purchasePrice: effectivePurchasePrice,
      sellingPrice:  0,   // not yet computed at cost-line resolution stage
      netRevenue:    0,
      adSpend:       0,
    });
    isPercentage = isPercentageDriver(template.driverType);
  } else {
    amount      = template.is_percentage ? applyPct(effectivePurchasePrice, rate) : nonNegative(rate);
    isPercentage = template.is_percentage;
  }

  return {
    name:         template.name,
    amount,
    isPercentage,
    rate:         isPercentage ? rate : undefined,
    costType:     template.cost_type,
  };
}

/**
 * Resolve an ad-hoc (user-typed) cost into a CostLineOutput.
 * Percentage ad-hoc costs are also applied on effectivePurchasePrice.
 */
export function resolveAdHocCostLine(
  entry: AdHocCostEntry,
  effectivePurchasePrice: number,
): CostLineOutput {
  const amount = entry.isPercentage
    ? applyPct(effectivePurchasePrice, entry.value)
    : nonNegative(entry.value);

  return {
    name:         entry.name || 'Chi phí khác',
    amount,
    isPercentage: entry.isPercentage,
    rate:         entry.isPercentage ? entry.value : undefined,
    costType:     'variable',
  };
}

/**
 * Build the full ordered list of resolved cost lines:
 *   1. Active selected templates (in template order)
 *   2. Ad-hoc entries (in insertion order)
 *
 * Only templates whose id appears in inputs.selectedCostIds are included.
 */
export function resolveCostLines(
  inputs: Pick<PricingInputs, 'selectedCostIds' | 'customCostValues' | 'adHocCosts'>,
  templates: CostTemplate[],
  effectivePurchasePrice: number,
): CostLineOutput[] {
  const selectedSet = new Set(inputs.selectedCostIds);

  const templateLines = templates
    .filter((t) => selectedSet.has(t.id) && t.is_active)
    .map((t) =>
      resolveTemplateCostLine(
        t,
        effectivePurchasePrice,
        inputs.customCostValues[t.id],
      ),
    );

  const adHocLines = inputs.adHocCosts
    .filter((ah) => ah.name.trim() !== '')
    .map((ah) => resolveAdHocCostLine(ah, effectivePurchasePrice));

  return [...templateLines, ...adHocLines];
}

// ─────────────────────────────────────────────────────────────────────────────
// COST BASE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sum all resolved cost amounts into the total cost add-on.
 */
export function sumCostLines(lines: CostLineOutput[]): number {
  return lines.reduce((acc, line) => acc + line.amount, 0);
}

/**
 * Giá vốn = Giá nhập + Σ chi phí
 *
 * costBase is the denominator basis for the selling price formula.
 */
export function calculateCostBase(
  effectivePurchasePrice: number,
  costLines: CostLineOutput[],
): number {
  return nonNegative(effectivePurchasePrice) + sumCostLines(costLines);
}

// ─────────────────────────────────────────────────────────────────────────────
// SELLING PRICE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Giá bán = Giá vốn ÷ (1 − margin%)
 *
 * Edge cases:
 *  - margin ≥ 100%: formula breaks (denominator ≤ 0); fall back to costBase × 2
 *  - margin < 0:    treated as 0 (no margin)
 *  - costBase ≤ 0:  returns 0
 */
export function calculateSellingPrice(costBase: number, marginPct: number): number {
  if (costBase <= 0) return 0;
  const safeMargin = Math.max(0, marginPct);
  if (safeMargin >= 100) return costBase * 2;
  return safeDivide(costBase, 1 - toDecimal(safeMargin), costBase);
}

/** Local helper — avoids circular dep on utils re-export. */
function toDecimal(pct: number): number {
  return pct / 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// WARNING CONDITIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derive actionable warnings from a completed pricing calculation.
 * Pure function — no side effects.
 */
export function computePricingWarnings(
  out: Omit<PricingOutputs, 'warnings'>,
): CalcWarning[] {
  const w: CalcWarning[] = [];

  if (out.costBase === 0) {
    w.push({ level: 'info', code: 'NO_COST_BASE', message: 'Chưa nhập giá nhập hàng — nhập purchasePrice để tính giá bán tự động.' });
  }
  if (out.grossMarginPct < 0) {
    w.push({ level: 'critical', code: 'NEGATIVE_MARGIN', message: 'Biên lợi nhuận âm — đang bán dưới giá vốn.', field: 'targetMarginPct' });
  } else if (out.costBase > 0 && out.grossMarginPct < 15) {
    w.push({ level: 'warning', code: 'LOW_MARGIN', message: `Biên lợi nhuận ${out.grossMarginPct.toFixed(1)}% thấp — khuyến nghị tối thiểu 15%.`, field: 'targetMarginPct' });
  }

  return w;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full pricing calculation pipeline.
 *
 * @param inputs    - PricingInputs from the form
 * @param templates - active CostTemplate rows from DB/localStorage
 * @returns         PricingOutputs with all intermediate values exposed
 */
export function calculatePricingOutputs(
  inputs: PricingInputs,
  templates: CostTemplate[],
): PricingOutputs {
  // Step 1 — resolve effective purchase price
  const effectivePurchasePrice = calculateEffectivePurchasePrice(inputs);

  // Step 2 — resolve cost lines
  const costsBreakdown = resolveCostLines(inputs, templates, effectivePurchasePrice);

  // Step 3 — split cost totals for display
  const variableCostFixedAmount = costsBreakdown
    .filter((l) => !l.isPercentage)
    .reduce((s, l) => s + l.amount, 0);

  const variableCostPctAmount = costsBreakdown
    .filter((l) => l.isPercentage)
    .reduce((s, l) => s + l.amount, 0);

  const totalCostPerUnit = variableCostFixedAmount + variableCostPctAmount;

  // Step 4 — cost base
  const costBase = calculateCostBase(effectivePurchasePrice, costsBreakdown);

  // Step 5 — selling price
  const sellingPriceExact   = calculateSellingPrice(costBase, inputs.targetMarginPct);
  const sellingPriceRounded = roundSellingPrice(sellingPriceExact);

  // Step 6 — margin metrics
  const grossProfitPerUnit = sellingPriceExact - costBase;
  const grossMarginPct     = pctOf(grossProfitPerUnit, sellingPriceExact);

  const partial = {
    effectivePurchasePrice,
    variableCostFixedAmount,
    variableCostPctAmount,
    totalCostPerUnit,
    costBase,
    sellingPriceExact,
    sellingPriceRounded,
    grossProfitPerUnit,
    grossMarginPct,
    costsBreakdown,
  };

  return { ...partial, warnings: computePricingWarnings(partial) };
}
