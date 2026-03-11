/**
 * hooks/useBusinessCalculatorDerived.ts
 *
 * Derives all tab outputs from the current inputs via useMemo.
 * Also handles the auto-linking chain:
 *   Pricing → UE → Marketing → LTV → Inventory → Scenarios
 *
 * Rules:
 *  - Pure useMemo — no state, no side effects.
 *  - Auto-linking uses `|| value` pattern: only substitutes when field is 0.
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
  calculateInventoryOutputs,
  calculateLTVOutputs,
  calculateMarketingOutputs,
  calculatePricingOutputs,
  calculateScenarioOutputs,
  calculateUnitEconomicsOutputs,
  monthLabel,
} from '../lib/finance';

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
      sellingPrice:   inputs.unitEconomics.sellingPrice   || pricing.sellingPriceRounded,
      costBase:       inputs.unitEconomics.costBase        || pricing.costBase,
      grossMarginPct: inputs.unitEconomics.grossMarginPct  || pricing.grossMarginPct,
    };
    const unitEconomics = calculateUnitEconomicsOutputs(ueIn);

    // ── 3. Marketing — auto-link shared AOV from Pricing ─────────────────────
    const mktIn: MarketingInputs = {
      ...inputs.marketing,
      sharedAverageOrderValue:
        inputs.marketing.sharedAverageOrderValue || pricing.sellingPriceRounded,
    };
    const marketing = calculateMarketingOutputs(mktIn);

    // ── 4. LTV — auto-link AOV, margin, CAC ──────────────────────────────────
    const ltvIn: LTVInputs = {
      ...inputs.ltv,
      averageOrderValue: inputs.ltv.averageOrderValue || pricing.sellingPriceRounded,
      grossMarginPct:    inputs.ltv.grossMarginPct     || pricing.grossMarginPct,
      blendedCac:        inputs.ltv.blendedCac         || marketing.blended.blendedCac,
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
      pricing.effectivePurchasePrice || inputs.pricing.purchasePrice,
    );

    // ── 6. Scenarios — auto-populate base levers when 0 ──────────────────────
    const baseLevers: ScenarioLevers = {
      sellingPrice:         inputs.scenario.base.sellingPrice     || pricing.sellingPriceRounded,
      monthlyUnitsSold:     inputs.scenario.base.monthlyUnitsSold || ueIn.monthlyUnitsSold,
      purchasePrice:        inputs.scenario.base.purchasePrice    || inputs.pricing.purchasePrice,
      monthlyAdSpend:       inputs.scenario.base.monthlyAdSpend   || ueIn.monthlyAdSpend,
      adsConversionRatePct: inputs.scenario.base.adsConversionRatePct,
      returnRatePct:        inputs.scenario.base.returnRatePct    || ueIn.returnRatePct,
      discountRatePct:      inputs.scenario.base.discountRatePct  || ueIn.discountRatePct,
      monthlyFixedCosts:    inputs.scenario.base.monthlyFixedCosts || ueIn.monthlyFixedCosts,
      grossMarginTargetPct: inputs.scenario.base.grossMarginTargetPct || inputs.pricing.targetMarginPct,
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

    return { pricing, unitEconomics, marketing, ltv, inventory, scenario };
  }, [inputs, costTemplates]);
}
