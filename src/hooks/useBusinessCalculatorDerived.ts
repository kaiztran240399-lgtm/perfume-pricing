/**
 * hooks/useBusinessCalculatorDerived.ts
 *
 * Derives all tab outputs from the current inputs via useMemo.
 * Also handles the auto-linking chain:
 *   Pricing → UE → Marketing → LTV → Inventory → Scenarios
 *
 * Rules:
 *  - Pure useMemo — no state, no side effects.
 *  - Auto-linking uses autoLink(userValue, linkedValue): only substitutes when
 *    userValue === 0 (i.e., field has not been explicitly set by the user).
 *  - Re-exported types stay in types/calculator.ts; this file is logic only.
 */

import { useMemo } from 'react';
import type {
  BusinessCalculatorDerived,
  BusinessCalculatorInputs,
  InventoryInputs,
  LTVInputs,
  MarketingInputs,
  MonthlySalesForecastEntry,
  ScenarioInputs,
  ScenarioLevers,
  UnitEconomicsInputs,
} from '../types';
import type { CostTemplate } from '../types';
import {
  autoLink,
  calculateInventoryOutputs,
  calculateLTVOutputs,
  calculateMarketingOutputs,
  calculatePricingOutputs,
  calculateScenarioOutputs,
  calculateUnitEconomicsOutputs,
  monthLabel,
} from '../lib/finance';
import { runFinancialValidation } from '../lib/finance/validation';

export function useBusinessCalculatorDerived(
  inputs: BusinessCalculatorInputs,
  costTemplates: CostTemplate[],
): BusinessCalculatorDerived {
  return useMemo<BusinessCalculatorDerived>(() => {
    // ── 1. Pricing ───────────────────────────────────────────────────────────
    const pricing = calculatePricingOutputs(inputs.pricing, costTemplates);

    // ── 2. Unit Economics — auto-link from Pricing when values are 0 ─────────
    const ueIn: UnitEconomicsInputs = {
      ...inputs.unitEconomics,
      sellingPrice:   autoLink(inputs.unitEconomics.sellingPrice,   pricing.sellingPriceRounded),
      costBase:       autoLink(inputs.unitEconomics.costBase,        pricing.costBase),
      grossMarginPct: autoLink(inputs.unitEconomics.grossMarginPct,  pricing.grossMarginPct),
    };
    const unitEconomics = calculateUnitEconomicsOutputs(ueIn);

    // ── 3. Marketing — auto-link shared AOV from Pricing ─────────────────────
    const mktIn: MarketingInputs = {
      ...inputs.marketing,
      sharedAverageOrderValue:
        autoLink(inputs.marketing.sharedAverageOrderValue, pricing.sellingPriceRounded),
    };
    const marketing = calculateMarketingOutputs(mktIn);

    // ── 4. LTV — auto-link AOV, margin, CAC ──────────────────────────────────
    const ltvIn: LTVInputs = {
      ...inputs.ltv,
      averageOrderValue: autoLink(inputs.ltv.averageOrderValue, pricing.sellingPriceRounded),
      grossMarginPct:    autoLink(inputs.ltv.grossMarginPct,    pricing.grossMarginPct),
      blendedCac:        autoLink(inputs.ltv.blendedCac,        marketing.blended.blendedCac),
    };
    const ltv = calculateLTVOutputs(ltvIn);

    // ── 5. Inventory — auto-populate forecast from Marketing when empty ───────
    const autoForecast: MonthlySalesForecastEntry[] = Array.from({ length: 6 }, (_, i) => ({
      monthIndex:      i,
      label:           monthLabel(i),
      forecastUnits:   Math.round(marketing.blended.totalOrders),
      forecastRevenue: marketing.blended.totalNetRevenue,
      marketingSpend:  marketing.blended.totalAdSpend,
    }));
    const invIn: InventoryInputs = {
      ...inputs.inventory,
      monthlySalesForecast:
        inputs.inventory.monthlySalesForecast.length > 0
          ? inputs.inventory.monthlySalesForecast
          : autoForecast,
    };
    const inventory = calculateInventoryOutputs(
      invIn,
      autoLink(pricing.effectivePurchasePrice, inputs.pricing.purchasePrice),
    );

    // ── 6. Scenarios — auto-populate base levers when 0 ──────────────────────
    const baseLevers: ScenarioLevers = {
      sellingPrice:         autoLink(inputs.scenario.base.sellingPrice,          pricing.sellingPriceRounded),
      monthlyUnitsSold:     autoLink(inputs.scenario.base.monthlyUnitsSold,      ueIn.monthlyUnitsSold),
      purchasePrice:        autoLink(inputs.scenario.base.purchasePrice,         inputs.pricing.purchasePrice),
      monthlyAdSpend:       autoLink(inputs.scenario.base.monthlyAdSpend,        ueIn.monthlyAdSpend),
      adsConversionRatePct: inputs.scenario.base.adsConversionRatePct,
      returnRatePct:        autoLink(inputs.scenario.base.returnRatePct,         ueIn.returnRatePct),
      discountRatePct:      autoLink(inputs.scenario.base.discountRatePct,       ueIn.discountRatePct),
      monthlyFixedCosts:    autoLink(inputs.scenario.base.monthlyFixedCosts,     ueIn.monthlyFixedCosts),
      grossMarginTargetPct: autoLink(inputs.scenario.base.grossMarginTargetPct,  inputs.pricing.targetMarginPct),
    };
    const scenarioIn: ScenarioInputs = {
      ...inputs.scenario,
      base: baseLevers,
    };
    const scenario = calculateScenarioOutputs(
      scenarioIn,
      pricing.costBase,
      inputs.pricing.purchasePrice,
      ltv.ltvReferralAdjusted,
    );

    // ── 7. Cross-domain validation ────────────────────────────────────────────
    const partialDerived = { pricing, unitEconomics, marketing, ltv, inventory, scenario };
    const validation = runFinancialValidation(partialDerived);

    return { ...partialDerived, validation };
  }, [inputs, costTemplates]);
}
