/**
 * useBusinessCalculator.ts
 *
 * Central state manager for the 6-tab Business Calculator.
 *
 * Responsibilities:
 *   - Hold all user inputs in a single `inputs` state object
 *   - Expose per-tab updaters (updatePricing, updateUnitEconomics, …)
 *   - Derive all outputs via useMemo with auto-linking between tabs
 *   - Manage the active tab + cost templates
 *   - Persist inputs to localStorage under KEY_INPUTS
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { CostTemplate } from '../types';
import type {
  BusinessCalculatorDerived,
  BusinessCalculatorInputs,
  InventoryInputs,
  LTVInputs,
  MarketingInputs,
  MonthlySalesForecastEntry,
  PricingInputs,
  ScenarioInputs,
  ScenarioLevers,
  UnitEconomicsInputs,
  TabId,
} from '../types/business-calculator';
import { AdsMode } from '../types/business-calculator';
import {
  calculateInventoryOutputs,
  calculateLTVOutputs,
  calculateMarketingOutputs,
  calculatePricingOutputs,
  calculateScenarioOutputs,
  calculateUnitEconomicsOutputs,
  monthLabel,
} from '../lib/calc';

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT COST TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_COST_TEMPLATES: CostTemplate[] = [
  // ── Fixed costs ──────────────────────────────────────────────────────────
  { id: 'rent',              name: 'Tiền thuê kho / mặt bằng',     cost_type: 'fixed',    is_percentage: false, default_value: 0,  channel: 'all',      is_active: true },
  { id: 'salary',            name: 'Lương nhân viên (phân bổ)',     cost_type: 'fixed',    is_percentage: false, default_value: 0,  channel: 'all',      is_active: true },
  { id: 'tools',             name: 'Phí phần mềm / công cụ',        cost_type: 'fixed',    is_percentage: false, default_value: 0,  channel: 'all',      is_active: true },
  // ── Variable costs — fixed ₫ ─────────────────────────────────────────────
  { id: 'ship_import',       name: 'Phí vận chuyển nhập hàng',      cost_type: 'variable', is_percentage: false, default_value: 0,  channel: 'all',      is_active: true },
  { id: 'ship_intl',         name: 'Phí ship quốc tế',              cost_type: 'variable', is_percentage: false, default_value: 0,  channel: 'all',      is_active: true },
  { id: 'customs',           name: 'Phí hải quan / khai báo',       cost_type: 'variable', is_percentage: false, default_value: 0,  channel: 'all',      is_active: true },
  { id: 'packaging',         name: 'Phí đóng gói',                  cost_type: 'variable', is_percentage: false, default_value: 0,  channel: 'all',      is_active: true },
  { id: 'ship_out',          name: 'Phí ship giao khách',           cost_type: 'variable', is_percentage: false, default_value: 0,  channel: 'all',      is_active: true },
  { id: 'decant_bottle',     name: 'Chi phí lọ chiết + nắp',        cost_type: 'variable', is_percentage: false, default_value: 0,  channel: 'all',      is_active: true },
  { id: 'tester',            name: 'Mẫu thử / tester',              cost_type: 'variable', is_percentage: false, default_value: 0,  channel: 'all',      is_active: true },
  // ── Variable costs — percentage ───────────────────────────────────────────
  { id: 'import_tax',        name: 'Thuế nhập khẩu',                cost_type: 'variable', is_percentage: true,  default_value: 0,  channel: 'all',      is_active: true },
  { id: 'tiktok_commission', name: 'Hoa hồng TikTok Shop',          cost_type: 'variable', is_percentage: true,  default_value: 3,  channel: 'tiktok',   is_active: true },
  { id: 'fb_ads',            name: 'Phí quảng cáo Facebook Ads',    cost_type: 'variable', is_percentage: true,  default_value: 0,  channel: 'facebook', is_active: true },
  { id: 'tiktok_ads',        name: 'Phí quảng cáo TikTok Ads',      cost_type: 'variable', is_percentage: true,  default_value: 0,  channel: 'tiktok',   is_active: true },
  { id: 'return_reserve',    name: 'Dự phòng hoàn hàng',            cost_type: 'variable', is_percentage: true,  default_value: 2,  channel: 'all',      is_active: true },
  { id: 'payment_fee',       name: 'Phí thanh toán điện tử',        cost_type: 'variable', is_percentage: true,  default_value: 1,  channel: 'all',      is_active: true },
];

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT INPUTS
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_SCENARIO_LEVERS: ScenarioLevers = {
  sellingPrice:          0,
  monthlyUnitsSold:      0,
  purchasePrice:         0,
  monthlyAdSpend:        0,
  adsConversionRatePct:  2,
  returnRatePct:         2,
  discountRatePct:       0,
  monthlyFixedCosts:     0,
  grossMarginTargetPct:  30,
};

export const DEFAULT_INPUTS: BusinessCalculatorInputs = {
  pricing: {
    productName:       '',
    brand:             '',
    productType:       'full_size',
    sizeMl:            100,
    bottleSizeMl:      100,
    decantSizeMl:      10,
    purchasePrice:     0,
    selectedCostIds:   [],
    customCostValues:  {},
    adHocCosts:        [],
    targetMarginPct:   30,
    channel:           'facebook',
    notes:             '',
  } as PricingInputs,

  unitEconomics: {
    sellingPrice:           0,
    costBase:               0,
    grossMarginPct:         0,
    monthlyAdSpend:         0,
    monthlyUnitsSold:       0,
    returnRatePct:          2,
    discountRatePct:        0,
    giftsPerHundredOrders:  5,
    giftCostPerUnit:        0,
    monthlyFixedCosts:      0,
  } as UnitEconomicsInputs,

  marketing: {
    facebook: {
      monthlyBudget:       0,
      cpc:                 2000,
      landingPageCvrPct:   1.5,
      averageOrderValue:   0,
      adsMode:             AdsMode.FIXED_VND,
    },
    tiktok: {
      monthlyAdBudget:     0,
      monthlyOrganicGmv:   0,
      platformVoucherBudget: 0,
      commissionRatePct:   3,
      productPageCvrPct:   2,
      averageOrderValue:   0,
      adsMode:             AdsMode.FIXED_VND,
    },
    sharedAverageOrderValue:    0,
    contentCostPerMonth:        0,
    kolCostPerMonth:            0,
    marketingStaffCostPerMonth: 0,
    returnRatePct:              2,
  } as MarketingInputs,

  ltv: {
    averageOrderValue:                  0,
    purchaseFrequencyPerYear:           2,
    customerLifespanYears:              3,
    repeatRateAfterFirstPct:            40,
    repeatRateAfterSecondPct:           60,
    grossMarginPct:                     0,
    retentionCostPerCustomerPerYear:    0,
    referralRatePct:                    10,
    blendedCac:                         0,
    annualDiscountRatePct:              12,
  } as LTVInputs,

  inventory: {
    currentInventoryUnits:       0,
    startingCashBalance:         0,
    leadTimeDays:                30,
    safetyStockMultiplier:       1.5,
    orderingCostPerOrder:        500000,
    holdingCostPerUnitPerMonth:  0,
    supplierUpfrontPct:          50,
    supplierBalanceDueDays:      30,
    facebookCollectionLagDays:   7,
    tiktokCollectionLagDays:     14,
    monthlyFixedOperatingCosts:  0,
    taxReserveRatePct:           20,
    otherMonthlyIncome:          0,
    monthlySalesForecast:        [],
  } as InventoryInputs,

  scenario: {
    base:      DEFAULT_SCENARIO_LEVERS,
    scenarioA: {},
    scenarioB: {},
  } as ScenarioInputs,

  meta: {
    appVersion:  '2.0.0',
    lastSavedAt: new Date().toISOString(),
    activeTab:   'pricing',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE KEY
// ─────────────────────────────────────────────────────────────────────────────

const LS_KEY = 'business_calculator_inputs_v2';

function loadFromStorage(): BusinessCalculatorInputs {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_INPUTS;
    return { ...DEFAULT_INPUTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_INPUTS;
  }
}

function saveToStorage(inputs: BusinessCalculatorInputs): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(inputs));
  } catch {
    // ignore quota errors
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function useBusinessCalculator() {
  const [inputs, setInputs] = useState<BusinessCalculatorInputs>(loadFromStorage);
  const [costTemplates] = useState<CostTemplate[]>(DEFAULT_COST_TEMPLATES);

  // Persist inputs on change (debounce-free for simplicity; data is small)
  useEffect(() => {
    saveToStorage(inputs);
  }, [inputs]);

  // ── Derived values ─────────────────────────────────────────────────────────

  const derived = useMemo<BusinessCalculatorDerived>(() => {
    // 1. Pricing — needs costTemplates
    const pricing = calculatePricingOutputs(inputs.pricing, costTemplates);

    // 2. Unit Economics — auto-link from pricing when values are 0
    const ueIn: UnitEconomicsInputs = {
      ...inputs.unitEconomics,
      sellingPrice:  inputs.unitEconomics.sellingPrice  || pricing.sellingPriceRounded,
      costBase:      inputs.unitEconomics.costBase       || pricing.costBase,
      grossMarginPct: inputs.unitEconomics.grossMarginPct || pricing.grossMarginPct,
    };
    const unitEconomics = calculateUnitEconomicsOutputs(ueIn);

    // 3. Marketing — auto-link shared AOV from pricing
    const mktIn: MarketingInputs = {
      ...inputs.marketing,
      sharedAverageOrderValue:
        inputs.marketing.sharedAverageOrderValue || pricing.sellingPriceRounded,
    };
    const marketing = calculateMarketingOutputs(mktIn);

    // 4. LTV — auto-link AOV, margin, and CAC
    const ltvIn: LTVInputs = {
      ...inputs.ltv,
      averageOrderValue: inputs.ltv.averageOrderValue || pricing.sellingPriceRounded,
      grossMarginPct:    inputs.ltv.grossMarginPct     || pricing.grossMarginPct,
      blendedCac:        inputs.ltv.blendedCac         || marketing.blended.blendedCac,
    };
    const ltv = calculateLTVOutputs(ltvIn);

    // 5. Inventory — auto-link monthly sales forecast from marketing when empty
    const autoForecast: MonthlySalesForecastEntry[] = Array.from({ length: 6 }, (_, i) => ({
      monthIndex:     i,
      label:          monthLabel(i),
      forecastUnits:  Math.round(marketing.blended.totalOrders),
      forecastRevenue: marketing.blended.totalNetRevenue,
      marketingSpend:  marketing.blended.totalAdSpend,
    }));
    const invIn: InventoryInputs = {
      ...inputs.inventory,
      // Only use auto-forecast if user hasn't provided any override
      monthlySalesForecast:
        inputs.inventory.monthlySalesForecast.length > 0
          ? inputs.inventory.monthlySalesForecast
          : autoForecast,
    };
    const inventory = calculateInventoryOutputs(
      invIn,
      pricing.effectivePurchasePrice || inputs.pricing.purchasePrice,
    );

    // 6. Scenario — auto-populate base levers from other tabs when 0
    const baseLevers: ScenarioLevers = {
      sellingPrice:         inputs.scenario.base.sellingPrice    || pricing.sellingPriceRounded,
      monthlyUnitsSold:     inputs.scenario.base.monthlyUnitsSold || ueIn.monthlyUnitsSold,
      purchasePrice:        inputs.scenario.base.purchasePrice   || inputs.pricing.purchasePrice,
      monthlyAdSpend:       inputs.scenario.base.monthlyAdSpend  || ueIn.monthlyAdSpend,
      adsConversionRatePct: inputs.scenario.base.adsConversionRatePct,
      returnRatePct:        inputs.scenario.base.returnRatePct   || ueIn.returnRatePct,
      discountRatePct:      inputs.scenario.base.discountRatePct || ueIn.discountRatePct,
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

  // ── Active tab ─────────────────────────────────────────────────────────────

  const activeTab = inputs.meta.activeTab;

  const setActiveTab = useCallback((tab: TabId) => {
    setInputs(prev => ({ ...prev, meta: { ...prev.meta, activeTab: tab } }));
  }, []);

  // ── Per-tab updaters ───────────────────────────────────────────────────────

  const updatePricing = useCallback((patch: Partial<PricingInputs>) => {
    setInputs(prev => ({ ...prev, pricing: { ...prev.pricing, ...patch } }));
  }, []);

  const updateUnitEconomics = useCallback((patch: Partial<UnitEconomicsInputs>) => {
    setInputs(prev => ({ ...prev, unitEconomics: { ...prev.unitEconomics, ...patch } }));
  }, []);

  const updateMarketing = useCallback((patch: Partial<MarketingInputs>) => {
    setInputs(prev => ({ ...prev, marketing: { ...prev.marketing, ...patch } }));
  }, []);

  const updateLTV = useCallback((patch: Partial<LTVInputs>) => {
    setInputs(prev => ({ ...prev, ltv: { ...prev.ltv, ...patch } }));
  }, []);

  const updateInventory = useCallback((patch: Partial<InventoryInputs>) => {
    setInputs(prev => ({ ...prev, inventory: { ...prev.inventory, ...patch } }));
  }, []);

  const updateScenario = useCallback((patch: Partial<ScenarioInputs>) => {
    setInputs(prev => ({ ...prev, scenario: { ...prev.scenario, ...patch } }));
  }, []);

  const resetAll = useCallback(() => {
    setInputs(DEFAULT_INPUTS);
    localStorage.removeItem(LS_KEY);
  }, []);

  /** Load a full saved scenario snapshot, replacing all current inputs. */
  const loadScenario = useCallback((savedInputs: BusinessCalculatorInputs) => {
    setInputs({
      ...savedInputs,
      meta: {
        ...savedInputs.meta,
        activeTab: activeTab, // keep current tab so user doesn't lose context
      },
    });
  }, [activeTab]);

  return {
    inputs,
    derived,
    costTemplates,
    activeTab,
    setActiveTab,
    updatePricing,
    updateUnitEconomics,
    updateMarketing,
    updateLTV,
    updateInventory,
    updateScenario,
    resetAll,
    loadScenario,
  };
}
