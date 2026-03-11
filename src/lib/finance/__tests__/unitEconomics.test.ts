/**
 * Tests for lib/finance/unitEconomics.ts
 * Per-unit profitability after real-world channel erosion.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateCAC,
  calculateEffectiveSellingPrice,
  calculateNetRevenuePerUnit,
  calculateAllocatedGiftCost,
  calculateContributionMarginPerUnit,
  calculateContributionMarginRatio,
  calculateBreakEvenUnits,
  calculateBreakEvenRevenue,
  calculateRoasPerUnit,
  calculateUnitEconomicsOutputs,
} from '../unitEconomics';
import type { UnitEconomicsInputs } from '../../../types/unit-economics';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const BASE_INPUTS: UnitEconomicsInputs = {
  sellingPrice:          500_000,
  costBase:              300_000,
  grossMarginPct:        40,
  monthlyAdSpend:        10_000_000,
  monthlyUnitsSold:      100,
  returnRatePct:         2,
  discountRatePct:       0,
  giftsPerHundredOrders: 5,
  giftCostPerUnit:       20_000,
  monthlyFixedCosts:     5_000_000,
};

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateCAC', () => {
  it('returns adSpend / unitsSold', () => {
    expect(calculateCAC(10_000_000, 100)).toBe(100_000);
  });
  it('returns 0 when unitsSold is 0', () => {
    expect(calculateCAC(5_000_000, 0)).toBe(0);
  });
  it('uses manual override when provided and > 0', () => {
    expect(calculateCAC(10_000_000, 100, 80_000)).toBe(80_000);
  });
  it('ignores manual override of 0', () => {
    // override = 0 → falls through to computed CAC
    expect(calculateCAC(10_000_000, 100, 0)).toBe(100_000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateEffectiveSellingPrice', () => {
  it('applies discount correctly', () => {
    // 500_000 × (1 - 0.10) = 450_000
    expect(calculateEffectiveSellingPrice(500_000, 10)).toBe(450_000);
  });
  it('returns full price when discount is 0', () => {
    expect(calculateEffectiveSellingPrice(500_000, 0)).toBe(500_000);
  });
  it('returns 0 for negative selling price', () => {
    expect(calculateEffectiveSellingPrice(-100, 0)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateNetRevenuePerUnit', () => {
  it('deducts return rate', () => {
    // 490_000 × (1 - 0.02) = 480_200
    expect(calculateNetRevenuePerUnit(490_000, 2)).toBeCloseTo(480_200);
  });
  it('returns full amount when returnRate is 0', () => {
    expect(calculateNetRevenuePerUnit(490_000, 0)).toBe(490_000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateAllocatedGiftCost', () => {
  it('allocates gift cost per order (5 gifts per 100 orders)', () => {
    // 20_000 × 5% = 1_000
    expect(calculateAllocatedGiftCost(20_000, 5)).toBe(1_000);
  });
  it('returns 0 when giftsPerHundred is 0', () => {
    expect(calculateAllocatedGiftCost(20_000, 0)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateContributionMarginPerUnit', () => {
  it('computes CM = net − costBase − cac − giftCost', () => {
    const cm = calculateContributionMarginPerUnit(480_000, 300_000, 100_000, 1_000);
    expect(cm).toBe(79_000);
  });
  it('returns negative when costs exceed net revenue', () => {
    const cm = calculateContributionMarginPerUnit(100_000, 300_000, 100_000, 0);
    expect(cm).toBe(-300_000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateBreakEvenUnits', () => {
  it('returns ceil(fixedCosts / CM)', () => {
    // 5_000_000 / 79_000 ≈ 63.3 → ceil = 64
    expect(calculateBreakEvenUnits(5_000_000, 79_000)).toBe(64);
  });
  it('returns MAX_SAFE_INTEGER when CM <= 0', () => {
    expect(calculateBreakEvenUnits(5_000_000, 0)).toBe(Number.MAX_SAFE_INTEGER);
    expect(calculateBreakEvenUnits(5_000_000, -1)).toBe(Number.MAX_SAFE_INTEGER);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateBreakEvenRevenue', () => {
  it('multiplies breakEvenUnits × sellingPrice', () => {
    expect(calculateBreakEvenRevenue(64, 500_000)).toBe(32_000_000);
  });
  it('returns MAX_SAFE_INTEGER when breakEvenUnits is MAX_SAFE_INTEGER', () => {
    expect(calculateBreakEvenRevenue(Number.MAX_SAFE_INTEGER, 500_000)).toBe(Number.MAX_SAFE_INTEGER);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateRoasPerUnit', () => {
  it('computes netRevenue / CAC', () => {
    expect(calculateRoasPerUnit(480_000, 100_000)).toBeCloseTo(4.8);
  });
  it('returns 0 when CAC is 0 (organic)', () => {
    expect(calculateRoasPerUnit(480_000, 0)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateUnitEconomicsOutputs — integration', () => {
  it('produces a full output with realistic inputs', () => {
    const out = calculateUnitEconomicsOutputs(BASE_INPUTS);

    // CAC = 10M / 100 = 100_000
    expect(out.cac).toBe(100_000);

    // effective SP = 500_000 (no discount)
    expect(out.effectiveSellingPrice).toBe(500_000);

    // net revenue = 500_000 × 0.98 = 490_000
    expect(out.netRevenuePerUnit).toBeCloseTo(490_000);

    // gift cost = 20_000 × 5% = 1_000
    expect(out.allocatedGiftCostPerUnit).toBe(1_000);

    // CM = 490_000 − 300_000 − 100_000 − 1_000 = 89_000
    expect(out.contributionMarginPerUnit).toBe(89_000);

    // monthly gross revenue = 500_000 × 100 = 50_000_000
    expect(out.monthlyGrossRevenue).toBe(50_000_000);
  });

  it('monthly contribution profit scales with units sold', () => {
    const out = calculateUnitEconomicsOutputs({ ...BASE_INPUTS, monthlyUnitsSold: 200 });
    const perUnit = out.contributionMarginPerUnit;
    expect(out.monthlyContributionProfit).toBeCloseTo(perUnit * 200, 0);
  });

  it('handles zero units sold without crashing', () => {
    const out = calculateUnitEconomicsOutputs({ ...BASE_INPUTS, monthlyUnitsSold: 0 });
    expect(out.cac).toBe(0);
    expect(out.monthlyGrossRevenue).toBe(0);
  });
});
