/**
 * Tests for lib/finance/pricing.ts
 * Core formula: costBase → sellingPrice = costBase / (1 - margin%)
 */

import { describe, it, expect } from 'vitest';
import {
  calculateEffectivePurchasePrice,
  resolveTemplateCostLine,
  resolveAdHocCostLine,
  resolveCostLines,
  calculateCostBase,
  calculateSellingPrice,
  sumCostLines,
  calculatePricingOutputs,
} from '../pricing';
import type { CostTemplate } from '../../../types';
import { CostDriverType } from '../../../types/shared';
import type { PricingInputs } from '../../../types/pricing';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const FIXED_TEMPLATE: CostTemplate = {
  id: 'ship',
  name: 'Phí ship',
  cost_type: 'variable',
  is_percentage: false,
  default_value: 30_000,
  channel: 'all',
  is_active: true,
  driverType: CostDriverType.FIXED_PER_UNIT,
};

const PCT_TEMPLATE: CostTemplate = {
  id: 'import_tax',
  name: 'Thuế nhập khẩu',
  cost_type: 'variable',
  is_percentage: true,
  default_value: 10,
  channel: 'all',
  is_active: true,
  driverType: CostDriverType.PERCENT_OF_PURCHASE_PRICE,
};

const BASE_PRICING_INPUTS: PricingInputs = {
  productName:       'Test Perfume',
  brand:             'Brand A',
  productType:       'full_size',
  sizeMl:            100,
  bottleSizeMl:      100,
  decantSizeMl:      10,
  purchasePrice:     1_000_000,
  selectedCostIds:   [],
  customCostValues:  {},
  adHocCosts:        [],
  targetMarginPct:   30,
  channel:           'facebook',
  notes:             '',
};

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateEffectivePurchasePrice', () => {
  it('returns purchase price for full_size', () => {
    expect(calculateEffectivePurchasePrice({
      productType:    'full_size',
      purchasePrice:  1_000_000,
      bottleSizeMl:   100,
      decantSizeMl:   10,
    })).toBe(1_000_000);
  });

  it('derives per-decant price for chiet', () => {
    // 1_000_000 ₫ for 100ml bottle, 10ml decant → 100_000 ₫
    expect(calculateEffectivePurchasePrice({
      productType:    'chiet',
      purchasePrice:  1_000_000,
      bottleSizeMl:   100,
      decantSizeMl:   10,
    })).toBe(100_000);
  });

  it('returns 0 when bottleSizeMl is 0 (avoids division by zero)', () => {
    expect(calculateEffectivePurchasePrice({
      productType:    'chiet',
      purchasePrice:  1_000_000,
      bottleSizeMl:   0,
      decantSizeMl:   10,
    })).toBe(0);
  });

  it('returns 0 for negative purchasePrice', () => {
    expect(calculateEffectivePurchasePrice({
      productType:    'full_size',
      purchasePrice:  -500_000,
      bottleSizeMl:   100,
      decantSizeMl:   10,
    })).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('resolveTemplateCostLine', () => {
  it('resolves fixed-₫ template correctly', () => {
    const line = resolveTemplateCostLine(FIXED_TEMPLATE, 1_000_000);
    expect(line.amount).toBe(30_000);
    expect(line.isPercentage).toBe(false);
    expect(line.rate).toBeUndefined();
    expect(line.costType).toBe('variable');
  });

  it('resolves %-of-purchase-price template correctly', () => {
    const line = resolveTemplateCostLine(PCT_TEMPLATE, 1_000_000);
    expect(line.amount).toBe(100_000);   // 10% of 1M
    expect(line.isPercentage).toBe(true);
    expect(line.rate).toBe(10);
  });

  it('uses customValue when provided', () => {
    const line = resolveTemplateCostLine(FIXED_TEMPLATE, 1_000_000, 50_000);
    expect(line.amount).toBe(50_000);
  });

  it('custom value of 0 overrides default', () => {
    const line = resolveTemplateCostLine(FIXED_TEMPLATE, 1_000_000, 0);
    expect(line.amount).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('resolveAdHocCostLine', () => {
  it('resolves fixed ad-hoc cost', () => {
    const line = resolveAdHocCostLine(
      { id: '1', name: 'Sticker', isPercentage: false, value: 5_000 },
      1_000_000,
    );
    expect(line.amount).toBe(5_000);
    expect(line.isPercentage).toBe(false);
  });

  it('resolves percentage ad-hoc cost', () => {
    const line = resolveAdHocCostLine(
      { id: '2', name: 'Insurance', isPercentage: true, value: 2 },
      1_000_000,
    );
    expect(line.amount).toBe(20_000);   // 2% of 1M
    expect(line.isPercentage).toBe(true);
    expect(line.rate).toBe(2);
  });

  it('uses fallback name when name is empty', () => {
    const line = resolveAdHocCostLine(
      { id: '3', name: '', isPercentage: false, value: 1_000 },
      1_000_000,
    );
    expect(line.name).toBe('Chi phí khác');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('resolveCostLines', () => {
  const templates: CostTemplate[] = [FIXED_TEMPLATE, PCT_TEMPLATE];

  it('returns only selected active templates', () => {
    const lines = resolveCostLines(
      { selectedCostIds: ['ship'], customCostValues: {}, adHocCosts: [] },
      templates,
      1_000_000,
    );
    expect(lines).toHaveLength(1);
    expect(lines[0].name).toBe('Phí ship');
  });

  it('includes ad-hoc lines after templates', () => {
    const lines = resolveCostLines(
      {
        selectedCostIds: ['ship'],
        customCostValues: {},
        adHocCosts: [{ id: 'ah1', name: 'Extra', isPercentage: false, value: 10_000 }],
      },
      templates,
      1_000_000,
    );
    expect(lines).toHaveLength(2);
    expect(lines[1].name).toBe('Extra');
  });

  it('excludes ad-hoc entries with empty names', () => {
    const lines = resolveCostLines(
      {
        selectedCostIds: [],
        customCostValues: {},
        adHocCosts: [{ id: 'ah2', name: '   ', isPercentage: false, value: 5_000 }],
      },
      templates,
      1_000_000,
    );
    expect(lines).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateSellingPrice', () => {
  it('applies markup formula: costBase / (1 - margin/100)', () => {
    // 700_000 / (1 - 0.30) = 1_000_000
    expect(calculateSellingPrice(700_000, 30)).toBeCloseTo(1_000_000);
  });

  it('returns 0 when costBase is 0', () => {
    expect(calculateSellingPrice(0, 30)).toBe(0);
  });

  it('falls back to costBase × 2 when margin >= 100', () => {
    expect(calculateSellingPrice(500_000, 100)).toBe(1_000_000);
    expect(calculateSellingPrice(500_000, 120)).toBe(1_000_000);
  });

  it('treats negative margin as 0', () => {
    // 500_000 / (1 - 0) = 500_000
    expect(calculateSellingPrice(500_000, -10)).toBe(500_000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculatePricingOutputs — integration', () => {
  it('full pipeline: no costs, 30% margin', () => {
    const out = calculatePricingOutputs(BASE_PRICING_INPUTS, []);
    expect(out.effectivePurchasePrice).toBe(1_000_000);
    expect(out.costBase).toBe(1_000_000);
    // 1_000_000 / 0.70 ≈ 1_428_571
    expect(out.sellingPriceExact).toBeCloseTo(1_428_571, -3);
    expect(out.grossMarginPct).toBeCloseTo(30, 0);
  });

  it('includes selected cost templates in costBase', () => {
    const inputs: PricingInputs = {
      ...BASE_PRICING_INPUTS,
      selectedCostIds: ['ship'],
      customCostValues: {},
    };
    const out = calculatePricingOutputs(inputs, [FIXED_TEMPLATE, PCT_TEMPLATE]);
    // costBase = 1_000_000 + 30_000 = 1_030_000
    expect(out.costBase).toBe(1_030_000);
  });

  it('chiet product: derives per-decant costBase', () => {
    const inputs: PricingInputs = {
      ...BASE_PRICING_INPUTS,
      productType:  'chiet',
      bottleSizeMl: 100,
      decantSizeMl: 10,
      purchasePrice: 1_000_000,
    };
    const out = calculatePricingOutputs(inputs, []);
    expect(out.effectivePurchasePrice).toBe(100_000);
    expect(out.costBase).toBe(100_000);
  });

  it('sellingPriceRounded obeys VND rounding rules (>1M → nearest 10k)', () => {
    const inputs: PricingInputs = {
      ...BASE_PRICING_INPUTS,
      purchasePrice: 1_000_000,
      targetMarginPct: 30,
    };
    const out = calculatePricingOutputs(inputs, []);
    // Should round up to nearest 10_000
    expect(out.sellingPriceRounded % 10_000).toBe(0);
    expect(out.sellingPriceRounded).toBeGreaterThanOrEqual(out.sellingPriceExact);
  });
});
