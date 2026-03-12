/**
 * Tests for lib/finance/ltv.ts
 * Customer Lifetime Value engine — tiers, ratios, cohort data, warnings.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateLTVSimple,
  calculateLTVMarginAdjusted,
  calculateLTVNet,
  calculateLTVReferralAdjusted,
  calculateLTVCACRatio,
  classifyHealthStatus,
  calculateMaxViableCAC,
  calculatePaybackPeriodMonths,
  calculateCohortValues,
  computeLTVWarnings,
  calculateLTVOutputs,
} from '../ltv';
import { HealthStatus } from '../../../types/shared';
import type { LTVInputs } from '../../../types/ltv';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const BASE_INPUTS: LTVInputs = {
  averageOrderValue:                500_000,
  purchaseFrequencyPerYear:         3,
  customerLifespanYears:            2,
  repeatRateAfterFirstPct:          60,
  repeatRateAfterSecondPct:         40,
  grossMarginPct:                   35,
  retentionCostPerCustomerPerYear:  50_000,
  referralRatePct:                  10,
  blendedCac:                       300_000,
  annualDiscountRatePct:            12,
};

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateLTVSimple', () => {
  it('returns AOV × freq × lifespan', () => {
    expect(calculateLTVSimple(500_000, 3, 2)).toBe(3_000_000);
  });

  it('returns 0 when AOV is 0', () => {
    expect(calculateLTVSimple(0, 3, 2)).toBe(0);
  });

  it('returns 0 when frequency is 0', () => {
    expect(calculateLTVSimple(500_000, 0, 2)).toBe(0);
  });

  it('returns 0 when lifespan is 0', () => {
    expect(calculateLTVSimple(500_000, 3, 0)).toBe(0);
  });

  it('never returns negative', () => {
    // nonNegative guard: negative inputs should clamp to 0
    expect(calculateLTVSimple(-500_000, 3, 2)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateLTVMarginAdjusted', () => {
  it('applies gross margin percentage', () => {
    // 3_000_000 × 35% = 1_050_000
    expect(calculateLTVMarginAdjusted(3_000_000, 35)).toBe(1_050_000);
  });

  it('returns 0 for 0% margin', () => {
    expect(calculateLTVMarginAdjusted(3_000_000, 0)).toBe(0);
  });

  it('returns full value for 100% margin', () => {
    expect(calculateLTVMarginAdjusted(1_000_000, 100)).toBe(1_000_000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateLTVNet', () => {
  it('deducts retention cost over lifespan', () => {
    // 1_050_000 − (50_000 × 2) = 950_000
    expect(calculateLTVNet(1_050_000, 50_000, 2)).toBe(950_000);
  });

  it('can return negative when retention > margin (valid signal)', () => {
    const result = calculateLTVNet(100_000, 100_000, 2);
    expect(result).toBe(-100_000);
  });

  it('returns the full value when retention cost is 0', () => {
    expect(calculateLTVNet(1_050_000, 0, 2)).toBe(1_050_000);
  });

  it('returns 0 when lifespan is 0', () => {
    expect(calculateLTVNet(1_000_000, 50_000, 0)).toBe(1_000_000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateLTVReferralAdjusted', () => {
  it('adds referral bonus', () => {
    // referralBonus = 300_000 × 10% = 30_000
    // result = 950_000 + 30_000 = 980_000
    expect(calculateLTVReferralAdjusted(950_000, 300_000, 10)).toBe(980_000);
  });

  it('no change when referralRate is 0', () => {
    expect(calculateLTVReferralAdjusted(950_000, 300_000, 0)).toBe(950_000);
  });

  it('no change when CAC is 0', () => {
    expect(calculateLTVReferralAdjusted(950_000, 0, 10)).toBe(950_000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateLTVCACRatio', () => {
  it('returns LTV / CAC', () => {
    expect(calculateLTVCACRatio(900_000, 300_000)).toBe(3);
  });

  it('returns 0 when CAC is 0 (fully organic)', () => {
    expect(calculateLTVCACRatio(900_000, 0)).toBe(0);
  });

  it('returns a fraction when LTV < CAC', () => {
    expect(calculateLTVCACRatio(100_000, 300_000)).toBeCloseTo(0.333, 2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('classifyHealthStatus', () => {
  it('returns CRITICAL when ratio < 1', () => {
    expect(classifyHealthStatus(0.9)).toBe(HealthStatus.CRITICAL);
    expect(classifyHealthStatus(0)).toBe(HealthStatus.CRITICAL);
  });

  it('returns WARNING when ratio is 1 to 2.99', () => {
    expect(classifyHealthStatus(1)).toBe(HealthStatus.WARNING);
    expect(classifyHealthStatus(2.5)).toBe(HealthStatus.WARNING);
  });

  it('returns HEALTHY when ratio is 3 to 4.99', () => {
    expect(classifyHealthStatus(3)).toBe(HealthStatus.HEALTHY);
    expect(classifyHealthStatus(4.5)).toBe(HealthStatus.HEALTHY);
  });

  it('returns EXCELLENT when ratio >= 5', () => {
    expect(classifyHealthStatus(5)).toBe(HealthStatus.EXCELLENT);
    expect(classifyHealthStatus(10)).toBe(HealthStatus.EXCELLENT);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateMaxViableCAC', () => {
  it('returns LTV / 3 by default (3:1 healthy threshold)', () => {
    expect(calculateMaxViableCAC(900_000)).toBe(300_000);
  });

  it('respects custom targetRatio', () => {
    expect(calculateMaxViableCAC(900_000, 1.5)).toBe(600_000);
  });

  it('returns 0 for LTV = 0', () => {
    expect(calculateMaxViableCAC(0)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculatePaybackPeriodMonths', () => {
  it('computes payback from CAC and monthly margin revenue', () => {
    // monthlyMarginRevenue = 500_000 × 35% × (3/12) = 43_750
    // payback = ceil(300_000 / 43_750) = 7
    const result = calculatePaybackPeriodMonths(300_000, 500_000, 35, 3);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(100);
  });

  it('returns MAX_SAFE_INTEGER when gross margin is 0', () => {
    expect(calculatePaybackPeriodMonths(300_000, 500_000, 0, 3)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('returns MAX_SAFE_INTEGER when frequency is 0', () => {
    expect(calculatePaybackPeriodMonths(300_000, 500_000, 35, 0)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('returns 0 when CAC is 0', () => {
    expect(calculatePaybackPeriodMonths(0, 500_000, 35, 3)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateCohortValues', () => {
  it('returns one entry per lifespan year', () => {
    const result = calculateCohortValues(BASE_INPUTS);
    expect(result).toHaveLength(BASE_INPUTS.customerLifespanYears);
  });

  it('year 1 cumulative LTV equals year-1 margin revenue', () => {
    const result = calculateCohortValues(BASE_INPUTS);
    // year 1: retained fraction = 1, revenue = 500_000 × 3 × 35% = 525_000
    expect(result[0].cumulativeLtv).toBeCloseTo(525_000, 0);
  });

  it('cumulative value increases each year (positive retention)', () => {
    const result = calculateCohortValues(BASE_INPUTS);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].cumulativeLtv).toBeGreaterThanOrEqual(result[i - 1].cumulativeLtv);
    }
  });

  it('handles 1-year lifespan (single cohort entry)', () => {
    const inputs = { ...BASE_INPUTS, customerLifespanYears: 1 };
    const result = calculateCohortValues(inputs);
    expect(result).toHaveLength(1);
    expect(result[0].year).toBe(1);
  });

  it('handles 5-year lifespan', () => {
    const inputs = { ...BASE_INPUTS, customerLifespanYears: 5 };
    const result = calculateCohortValues(inputs);
    expect(result).toHaveLength(5);
  });

  it('year 2 uses repeatRateAfterFirst retention', () => {
    const inputs = { ...BASE_INPUTS, customerLifespanYears: 3 };
    const result = calculateCohortValues(inputs);
    // Year 2 retained = 60% of year 1
    expect(result[1].retainedCustomersValue).toBeGreaterThan(0);
    expect(result[1].newCustomersValue).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('computeLTVWarnings', () => {
  const makePartial = (overrides: Partial<{
    ltvNet: number;
    ltvCacRatio: number;
    paybackPeriodMonths: number;
  }> = {}) => ({
    ltvSimple:            3_000_000,
    ltvMarginAdjusted:    1_050_000,
    ltvNet:               950_000,
    ltvReferralAdjusted:  980_000,
    ltvCacRatio:          3.27,
    ltvCacHealthStatus:   HealthStatus.HEALTHY,
    paybackPeriodMonths:  7,
    maxViableCac:         326_667,
    cacSurplusOrDeficit:  26_667,
    cohortValueByYear:    [],
    ...overrides,
  });

  it('no warnings when all metrics healthy', () => {
    const warnings = computeLTVWarnings(makePartial());
    expect(warnings).toHaveLength(0);
  });

  it('emits LTV_NET_NEGATIVE when ltvNet < 0', () => {
    const warnings = computeLTVWarnings(makePartial({ ltvNet: -100_000 }));
    const codes = warnings.map(w => w.code);
    expect(codes).toContain('LTV_NET_NEGATIVE');
    expect(warnings.find(w => w.code === 'LTV_NET_NEGATIVE')?.level).toBe('critical');
  });

  it('emits LTV_CAC_CRITICAL when ltvCacRatio > 0 and < 1', () => {
    const warnings = computeLTVWarnings(makePartial({ ltvCacRatio: 0.8 }));
    const codes = warnings.map(w => w.code);
    expect(codes).toContain('LTV_CAC_CRITICAL');
    expect(warnings.find(w => w.code === 'LTV_CAC_CRITICAL')?.level).toBe('critical');
  });

  it('emits LTV_CAC_LOW when ltvCacRatio is 1 to 2.99', () => {
    const warnings = computeLTVWarnings(makePartial({ ltvCacRatio: 2.0 }));
    const codes = warnings.map(w => w.code);
    expect(codes).toContain('LTV_CAC_LOW');
    expect(warnings.find(w => w.code === 'LTV_CAC_LOW')?.level).toBe('warning');
  });

  it('does NOT emit CAC warning when ltvCacRatio === 0 (organic)', () => {
    const warnings = computeLTVWarnings(makePartial({ ltvCacRatio: 0 }));
    const codes = warnings.map(w => w.code);
    expect(codes).not.toContain('LTV_CAC_CRITICAL');
    expect(codes).not.toContain('LTV_CAC_LOW');
  });

  it('emits LONG_PAYBACK when paybackPeriodMonths > 12', () => {
    const warnings = computeLTVWarnings(makePartial({ paybackPeriodMonths: 15 }));
    const codes = warnings.map(w => w.code);
    expect(codes).toContain('LONG_PAYBACK');
    expect(warnings.find(w => w.code === 'LONG_PAYBACK')?.level).toBe('warning');
  });

  it('does NOT emit LONG_PAYBACK when MAX_SAFE_INTEGER (no CAC data)', () => {
    const warnings = computeLTVWarnings(makePartial({ paybackPeriodMonths: Number.MAX_SAFE_INTEGER }));
    const codes = warnings.map(w => w.code);
    expect(codes).not.toContain('LONG_PAYBACK');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateLTVOutputs', () => {
  it('returns correct ltv chain for base inputs', () => {
    const out = calculateLTVOutputs(BASE_INPUTS);
    expect(out.ltvSimple).toBeGreaterThan(0);
    expect(out.ltvMarginAdjusted).toBeLessThanOrEqual(out.ltvSimple);
    expect(out.ltvCacRatio).toBeGreaterThan(0);
    expect(out.cohortValueByYear).toHaveLength(BASE_INPUTS.customerLifespanYears);
  });

  it('all-zero inputs return all-zero outputs without crashing', () => {
    const zeroInputs: LTVInputs = {
      averageOrderValue: 0, purchaseFrequencyPerYear: 0, customerLifespanYears: 1,
      repeatRateAfterFirstPct: 0, repeatRateAfterSecondPct: 0,
      grossMarginPct: 0, retentionCostPerCustomerPerYear: 0,
      referralRatePct: 0, blendedCac: 0, annualDiscountRatePct: 0,
    };
    const out = calculateLTVOutputs(zeroInputs);
    expect(out.ltvSimple).toBe(0);
    expect(out.ltvCacRatio).toBe(0);
    expect(out.maxViableCac).toBe(0);
    expect(out.warnings).toBeDefined();
  });
});
