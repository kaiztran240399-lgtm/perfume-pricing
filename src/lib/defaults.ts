/**
 * lib/defaults.ts
 *
 * Default values for all BusinessCalculator inputs.
 * Extracted here so they can be shared between:
 *   - useBusinessCalculator (state initialisation)
 *   - useBusinessCalculatorPersistence (fallback on load)
 *   - unit tests (fixtures)
 *
 * Rules: pure data only — no React, no side effects.
 */

import type {
  BusinessCalculatorInputs,
  InventoryInputs,
  LTVInputs,
  MarketingInputs,
  PricingInputs,
  ScenarioInputs,
  ScenarioLevers,
  UnitEconomicsInputs,
} from '../types';
import type { CostTemplate } from '../types';
import { AdsMode, CostDriverType } from '../types/shared';

// ─────────────────────────────────────────────────────────────────────────────
// COST TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_COST_TEMPLATES: CostTemplate[] = [
  // ── Fixed costs (allocated per unit from monthly fixed) ──────────────────
  { id: 'rent',              name: 'Tiền thuê kho / mặt bằng',     cost_type: 'fixed',    is_percentage: false, default_value: 0,  channel: 'all',      is_active: true, driverType: CostDriverType.FIXED_PER_UNIT },
  { id: 'salary',            name: 'Lương nhân viên (phân bổ)',     cost_type: 'fixed',    is_percentage: false, default_value: 0,  channel: 'all',      is_active: true, driverType: CostDriverType.FIXED_PER_UNIT },
  { id: 'tools',             name: 'Phí phần mềm / công cụ',        cost_type: 'fixed',    is_percentage: false, default_value: 0,  channel: 'all',      is_active: true, driverType: CostDriverType.FIXED_PER_UNIT },
  // ── Variable costs — fixed ₫ per unit ────────────────────────────────────
  { id: 'ship_import',       name: 'Phí vận chuyển nhập hàng',      cost_type: 'variable', is_percentage: false, default_value: 0,  channel: 'all',      is_active: true, driverType: CostDriverType.FIXED_PER_UNIT },
  { id: 'ship_intl',         name: 'Phí ship quốc tế',              cost_type: 'variable', is_percentage: false, default_value: 0,  channel: 'all',      is_active: true, driverType: CostDriverType.FIXED_PER_UNIT },
  { id: 'customs',           name: 'Phí hải quan / khai báo',       cost_type: 'variable', is_percentage: false, default_value: 0,  channel: 'all',      is_active: true, driverType: CostDriverType.FIXED_PER_UNIT },
  { id: 'packaging',         name: 'Phí đóng gói',                  cost_type: 'variable', is_percentage: false, default_value: 0,  channel: 'all',      is_active: true, driverType: CostDriverType.FIXED_PER_UNIT },
  { id: 'ship_out',          name: 'Phí ship giao khách',           cost_type: 'variable', is_percentage: false, default_value: 0,  channel: 'all',      is_active: true, driverType: CostDriverType.FIXED_PER_UNIT },
  { id: 'decant_bottle',     name: 'Chi phí lọ chiết + nắp',        cost_type: 'variable', is_percentage: false, default_value: 0,  channel: 'all',      is_active: true, driverType: CostDriverType.FIXED_PER_UNIT },
  { id: 'tester',            name: 'Mẫu thử / tester',              cost_type: 'variable', is_percentage: false, default_value: 0,  channel: 'all',      is_active: true, driverType: CostDriverType.FIXED_PER_UNIT },
  // ── Variable costs — % based ──────────────────────────────────────────────
  { id: 'import_tax',        name: 'Thuế nhập khẩu',                cost_type: 'variable', is_percentage: true,  default_value: 0,  channel: 'all',      is_active: true, driverType: CostDriverType.PERCENT_OF_PURCHASE_PRICE },
  { id: 'tiktok_commission', name: 'Hoa hồng TikTok Shop',          cost_type: 'variable', is_percentage: true,  default_value: 3,  channel: 'tiktok',   is_active: true, driverType: CostDriverType.PERCENT_OF_SELLING_PRICE },
  { id: 'fb_ads',            name: 'Phí quảng cáo Facebook Ads',    cost_type: 'variable', is_percentage: true,  default_value: 0,  channel: 'facebook', is_active: true, driverType: CostDriverType.PERCENT_OF_NET_REVENUE },
  { id: 'tiktok_ads',        name: 'Phí quảng cáo TikTok Ads',      cost_type: 'variable', is_percentage: true,  default_value: 0,  channel: 'tiktok',   is_active: true, driverType: CostDriverType.PERCENT_OF_NET_REVENUE },
  { id: 'return_reserve',    name: 'Dự phòng hoàn hàng',            cost_type: 'variable', is_percentage: true,  default_value: 2,  channel: 'all',      is_active: true, driverType: CostDriverType.PERCENT_OF_SELLING_PRICE },
  { id: 'payment_fee',       name: 'Phí thanh toán điện tử',        cost_type: 'variable', is_percentage: true,  default_value: 1,  channel: 'all',      is_active: true, driverType: CostDriverType.PERCENT_OF_NET_REVENUE },
];

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO LEVERS
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_SCENARIO_LEVERS: ScenarioLevers = {
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

// ─────────────────────────────────────────────────────────────────────────────
// FULL INPUTS OBJECT
// ─────────────────────────────────────────────────────────────────────────────

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
      monthlyBudget:         0,
      cpc:                   2000,
      landingPageCvrPct:     1.5,
      averageOrderValue:     0,
      adsMode:               AdsMode.FIXED_VND,
    },
    tiktok: {
      monthlyAdBudget:       0,
      monthlyOrganicGmv:     0,
      platformVoucherBudget: 0,
      commissionRatePct:     3,
      productPageCvrPct:     2,
      averageOrderValue:     0,
      adsMode:               AdsMode.FIXED_VND,
    },
    sharedAverageOrderValue:    0,
    contentCostPerMonth:        0,
    kolCostPerMonth:            0,
    marketingStaffCostPerMonth: 0,
    returnRatePct:              2,
  } as MarketingInputs,

  ltv: {
    averageOrderValue:               0,
    purchaseFrequencyPerYear:        2,
    customerLifespanYears:           3,
    repeatRateAfterFirstPct:         40,
    repeatRateAfterSecondPct:        60,
    grossMarginPct:                  0,
    retentionCostPerCustomerPerYear: 0,
    referralRatePct:                 10,
    blendedCac:                      0,
    annualDiscountRatePct:           12,
  } as LTVInputs,

  inventory: {
    currentInventoryUnits:      0,
    startingCashBalance:        0,
    leadTimeDays:               30,
    safetyStockMultiplier:      1.5,
    orderingCostPerOrder:       500000,
    holdingCostPerUnitPerMonth: 0,
    supplierUpfrontPct:         50,
    supplierBalanceDueDays:     30,
    facebookCollectionLagDays:  7,
    tiktokCollectionLagDays:    14,
    monthlyFixedOperatingCosts: 0,
    taxReserveRatePct:          20,
    otherMonthlyIncome:         0,
    monthlySalesForecast:       [],
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
