/**
 * Tests for lib/finance/scenarios.ts
 * Scenario P&L engine, delta analysis, sensitivity, recommendation, warnings.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveScenarioLevers,
  calculateScenarioMetrics,
  calculateScenarioDelta,
  recommendScenario,
  computeScenarioWarnings,
  calculateScenarioOutputs,
  calculateAllSensitivities,
} from '../scenarios';
import { ScenarioType } from '../../../types/shared';
import type { ScenarioLevers, ScenarioMetrics } from '../../../types/scenario';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const BASE_LEVERS: ScenarioLevers = {
  sellingPrice:           500_000,
  monthlyUnitsSold:       100,
  purchasePrice:          300_000,
  monthlyAdSpend:         5_000_000,
  adsConversionRatePct:   2,
  returnRatePct:          5,
  discountRatePct:        0,
  monthlyFixedCosts:      10_000_000,
  grossMarginTargetPct:   40,
};

const BASE_COST_BASE     = 320_000; // purchase price + direct costs
const BASE_PURCHASE_PRICE = 300_000;

// ─────────────────────────────────────────────────────────────────────────────

describe('resolveScenarioLevers', () => {
  it('inherits all fields from base when overrides is empty', () => {
    const result = resolveScenarioLevers(BASE_LEVERS, {});
    expect(result).toEqual(BASE_LEVERS);
  });

  it('applies partial overrides while preserving unmodified fields', () => {
    const result = resolveScenarioLevers(BASE_LEVERS, { sellingPrice: 600_000 });
    expect(result.sellingPrice).toBe(600_000);
    expect(result.monthlyUnitsSold).toBe(BASE_LEVERS.monthlyUnitsSold);
    expect(result.returnRatePct).toBe(BASE_LEVERS.returnRatePct);
  });

  it('full override replaces all fields', () => {
    const fullOverride: ScenarioLevers = {
      ...BASE_LEVERS,
      sellingPrice:     700_000,
      monthlyUnitsSold: 150,
    };
    const result = resolveScenarioLevers(BASE_LEVERS, fullOverride);
    expect(result.sellingPrice).toBe(700_000);
    expect(result.monthlyUnitsSold).toBe(150);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateScenarioMetrics', () => {
  it('computes P&L correctly for base levers', () => {
    const m = calculateScenarioMetrics(BASE_LEVERS, BASE_COST_BASE, BASE_PURCHASE_PRICE);

    // grossRevenue = 100 × 500_000 = 50_000_000
    expect(m.grossRevenue).toBe(50_000_000);

    // netRevenue = 50M × (1-0.05) × (1-0) = 47_500_000
    expect(m.netRevenue).toBeCloseTo(47_500_000, 0);

    // cogs = 100 × 320_000 = 32_000_000
    expect(m.cogs).toBe(32_000_000);
  });

  it('grossProfit = netRevenue - COGS', () => {
    const m = calculateScenarioMetrics(BASE_LEVERS, BASE_COST_BASE, BASE_PURCHASE_PRICE);
    expect(m.grossProfit).toBeCloseTo(m.netRevenue - m.cogs, 0);
  });

  it('operatingProfit = contributionProfit - fixedCosts', () => {
    const m = calculateScenarioMetrics(BASE_LEVERS, BASE_COST_BASE, BASE_PURCHASE_PRICE);
    expect(m.operatingProfit).toBeCloseTo(m.contributionProfit - m.fixedCosts, 0);
  });

  it('all-zero levers return zero metrics without crashing', () => {
    const zeroLevers: ScenarioLevers = {
      sellingPrice: 0, monthlyUnitsSold: 0, purchasePrice: 0,
      monthlyAdSpend: 0, adsConversionRatePct: 0, returnRatePct: 0,
      discountRatePct: 0, monthlyFixedCosts: 0, grossMarginTargetPct: 0,
    };
    const m = calculateScenarioMetrics(zeroLevers, 0, 0);
    expect(m.grossRevenue).toBe(0);
    expect(m.netRevenue).toBe(0);
    expect(m.operatingProfit).toBe(0);
  });

  it('scales costBase proportionally to purchasePrice change', () => {
    // If purchasePrice increases 50%, costBase should also increase ~50%
    const leversWithHigherPrice = { ...BASE_LEVERS, purchasePrice: BASE_PURCHASE_PRICE * 1.5 };
    const m = calculateScenarioMetrics(leversWithHigherPrice, BASE_COST_BASE, BASE_PURCHASE_PRICE);
    expect(m.cogs).toBeCloseTo(BASE_LEVERS.monthlyUnitsSold * BASE_COST_BASE * 1.5, 0);
  });

  it('operatingProfit is negative when fixed costs exceed contribution', () => {
    const leversHighFixed = { ...BASE_LEVERS, monthlyFixedCosts: 100_000_000 };
    const m = calculateScenarioMetrics(leversHighFixed, BASE_COST_BASE, BASE_PURCHASE_PRICE);
    expect(m.operatingProfit).toBeLessThan(0);
  });

  it('breakEvenUnits is MAX_SAFE_INTEGER when CM per unit is 0', () => {
    // Setting selling price equal to cost base means no contribution margin
    const zeroMarginLevers = { ...BASE_LEVERS, sellingPrice: BASE_COST_BASE, monthlyAdSpend: 0, discountRatePct: 0, returnRatePct: 0 };
    const m = calculateScenarioMetrics(zeroMarginLevers, BASE_COST_BASE, BASE_PURCHASE_PRICE);
    // CM = 0, so break-even should be MAX_SAFE_INTEGER
    expect(m.breakEvenUnits).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('ROAS is 0 when adSpend is 0', () => {
    const noAdsLevers = { ...BASE_LEVERS, monthlyAdSpend: 0 };
    const m = calculateScenarioMetrics(noAdsLevers, BASE_COST_BASE, BASE_PURCHASE_PRICE);
    expect(m.roas).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateScenarioDelta', () => {
  it('returns zero delta when scenario equals base', () => {
    const m = calculateScenarioMetrics(BASE_LEVERS, BASE_COST_BASE, BASE_PURCHASE_PRICE);
    const delta = calculateScenarioDelta(m, m);
    expect(delta.grossRevenueDelta).toBe(0);
    expect(delta.operatingProfitDelta).toBe(0);
    expect(delta.marginDeltaPpt).toBe(0);
  });

  it('positive delta when scenario improves on base', () => {
    const base = calculateScenarioMetrics(BASE_LEVERS, BASE_COST_BASE, BASE_PURCHASE_PRICE);
    const betterLevers = { ...BASE_LEVERS, sellingPrice: 600_000 };
    const improved = calculateScenarioMetrics(betterLevers, BASE_COST_BASE, BASE_PURCHASE_PRICE);
    const delta = calculateScenarioDelta(improved, base);
    expect(delta.grossRevenueDelta).toBeGreaterThan(0);
    expect(delta.isImprovement).toBe(true);
  });

  it('negative delta when scenario is worse than base', () => {
    const base = calculateScenarioMetrics(BASE_LEVERS, BASE_COST_BASE, BASE_PURCHASE_PRICE);
    const worseLevers = { ...BASE_LEVERS, monthlyAdSpend: 20_000_000 };
    const worse = calculateScenarioMetrics(worseLevers, BASE_COST_BASE, BASE_PURCHASE_PRICE);
    const delta = calculateScenarioDelta(worse, base);
    expect(delta.operatingProfitDelta).toBeLessThan(0);
    expect(delta.isImprovement).toBe(false);
  });

  it('marginDeltaPpt is in percentage points, not relative percent', () => {
    const base = calculateScenarioMetrics(BASE_LEVERS, BASE_COST_BASE, BASE_PURCHASE_PRICE);
    const betterLevers = { ...BASE_LEVERS, sellingPrice: 600_000 };
    const improved = calculateScenarioMetrics(betterLevers, BASE_COST_BASE, BASE_PURCHASE_PRICE);
    const delta = calculateScenarioDelta(improved, base);
    // delta should be a small number of ppt, not 50+ %
    expect(Math.abs(delta.marginDeltaPpt)).toBeLessThan(50);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('recommendScenario', () => {
  const makeMetrics = (operatingProfit: number): ScenarioMetrics => ({
    grossRevenue: 50_000_000, netRevenue: 47_500_000,
    cogs: 32_000_000, grossProfit: 15_500_000, grossMarginPct: 32.6,
    marketingSpend: 5_000_000, contributionProfit: 10_500_000,
    fixedCosts: 10_000_000, operatingProfit,
    operatingMarginPct: 0, breakEvenUnits: 100,
    roas: 5, ltvCacImpact: 0, capitalRequired: 0,
  });

  it('recommends BASE when base has highest operating profit', () => {
    const result = recommendScenario(
      makeMetrics(5_000_000),
      makeMetrics(3_000_000),
      makeMetrics(2_000_000),
    );
    expect(result.type).toBe(ScenarioType.BASE);
  });

  it('recommends A when scenario A has highest operating profit', () => {
    const result = recommendScenario(
      makeMetrics(2_000_000),
      makeMetrics(8_000_000),
      makeMetrics(4_000_000),
    );
    expect(result.type).toBe(ScenarioType.A);
  });

  it('recommends B when scenario B has highest operating profit', () => {
    const result = recommendScenario(
      makeMetrics(2_000_000),
      makeMetrics(4_000_000),
      makeMetrics(10_000_000),
    );
    expect(result.type).toBe(ScenarioType.B);
  });

  it('returns a non-empty reason string', () => {
    const result = recommendScenario(
      makeMetrics(5_000_000),
      makeMetrics(3_000_000),
      makeMetrics(2_000_000),
    );
    expect(result.reason.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('computeScenarioWarnings', () => {
  const makePartial = (overrides: Partial<{
    operatingProfit: number;
    grossMarginPct: number;
    roas: number;
    netRevenue: number;
  }> = {}) => {
    const defaults = {
      grossRevenue: 50_000_000, netRevenue: 47_500_000,
      cogs: 32_000_000, grossProfit: 15_500_000, grossMarginPct: 32.6,
      marketingSpend: 5_000_000, contributionProfit: 10_500_000,
      fixedCosts: 10_000_000, operatingProfit: 500_000,
      operatingMarginPct: 1.1, breakEvenUnits: 97,
      roas: 9.5, ltvCacImpact: 0, capitalRequired: 0,
    };
    const base = { ...defaults, ...overrides };
    return {
      base,
      scenarioA: defaults,
      scenarioB: defaults,
      deltaAVsBase: { grossRevenueDelta: 0, grossRevenueDeltaPct: 0, operatingProfitDelta: 0, operatingProfitDeltaPct: 0, marginDeltaPpt: 0, breakEvenUnitsDelta: 0, isImprovement: false },
      deltaBVsBase: { grossRevenueDelta: 0, grossRevenueDeltaPct: 0, operatingProfitDelta: 0, operatingProfitDeltaPct: 0, marginDeltaPpt: 0, breakEvenUnitsDelta: 0, isImprovement: false },
      sensitivityRanking: [],
      recommendedScenario: ScenarioType.BASE,
      recommendationReason: '',
    };
  };

  it('no warnings when all metrics are healthy', () => {
    const warnings = computeScenarioWarnings(makePartial());
    expect(warnings).toHaveLength(0);
  });

  it('emits BASE_OPERATING_LOSS when base.operatingProfit < 0', () => {
    const warnings = computeScenarioWarnings(makePartial({ operatingProfit: -1_000_000 }));
    const codes = warnings.map(w => w.code);
    expect(codes).toContain('BASE_OPERATING_LOSS');
    expect(warnings.find(w => w.code === 'BASE_OPERATING_LOSS')?.level).toBe('critical');
  });

  it('emits LOW_GROSS_MARGIN when grossMarginPct < 15 and netRevenue > 0', () => {
    const warnings = computeScenarioWarnings(makePartial({ grossMarginPct: 10, netRevenue: 47_500_000 }));
    const codes = warnings.map(w => w.code);
    expect(codes).toContain('LOW_GROSS_MARGIN');
    expect(warnings.find(w => w.code === 'LOW_GROSS_MARGIN')?.level).toBe('warning');
  });

  it('does NOT emit LOW_GROSS_MARGIN when netRevenue is 0', () => {
    const warnings = computeScenarioWarnings(makePartial({ grossMarginPct: 5, netRevenue: 0 }));
    const codes = warnings.map(w => w.code);
    expect(codes).not.toContain('LOW_GROSS_MARGIN');
  });

  it('emits LOW_BASE_ROAS when roas > 0 and < 2', () => {
    const warnings = computeScenarioWarnings(makePartial({ roas: 1.5 }));
    const codes = warnings.map(w => w.code);
    expect(codes).toContain('LOW_BASE_ROAS');
    expect(warnings.find(w => w.code === 'LOW_BASE_ROAS')?.level).toBe('warning');
  });

  it('does NOT emit LOW_BASE_ROAS when roas is 0 (no ads)', () => {
    const warnings = computeScenarioWarnings(makePartial({ roas: 0 }));
    const codes = warnings.map(w => w.code);
    expect(codes).not.toContain('LOW_BASE_ROAS');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateAllSensitivities', () => {
  it('returns one entry per lever key', () => {
    const result = calculateAllSensitivities(BASE_LEVERS, BASE_COST_BASE, BASE_PURCHASE_PRICE);
    const leverKeys = Object.keys(BASE_LEVERS);
    expect(result).toHaveLength(leverKeys.length);
  });

  it('ranks are unique and sequential starting from 1', () => {
    const result = calculateAllSensitivities(BASE_LEVERS, BASE_COST_BASE, BASE_PURCHASE_PRICE);
    const ranks = result.map(e => e.rank).sort((a, b) => a - b);
    expect(ranks[0]).toBe(1);
    expect(ranks[ranks.length - 1]).toBe(result.length);
  });

  it('sellingPrice has positive direction (higher price → more profit)', () => {
    const result = calculateAllSensitivities(BASE_LEVERS, BASE_COST_BASE, BASE_PURCHASE_PRICE);
    const spEntry = result.find(e => e.lever === 'sellingPrice');
    expect(spEntry?.direction).toBe('positive');
  });

  it('returnRatePct has negative direction (more returns → less profit)', () => {
    const result = calculateAllSensitivities(BASE_LEVERS, BASE_COST_BASE, BASE_PURCHASE_PRICE);
    const rrEntry = result.find(e => e.lever === 'returnRatePct');
    expect(rrEntry?.direction).toBe('negative');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateScenarioOutputs', () => {
  it('returns all required output fields', () => {
    const inputs = {
      base:      BASE_LEVERS,
      scenarioA: { sellingPrice: 600_000 },
      scenarioB: { monthlyAdSpend: 3_000_000 },
    };
    const out = calculateScenarioOutputs(inputs, BASE_COST_BASE, BASE_PURCHASE_PRICE);
    expect(out.base).toBeDefined();
    expect(out.scenarioA).toBeDefined();
    expect(out.scenarioB).toBeDefined();
    expect(out.deltaAVsBase).toBeDefined();
    expect(out.deltaBVsBase).toBeDefined();
    expect(out.sensitivityRanking.length).toBeGreaterThan(0);
    expect(out.recommendedScenario).toBeDefined();
    expect(out.warnings).toBeDefined();
  });

  it('recommendation is A when higher sell price wins', () => {
    const inputs = {
      base:      BASE_LEVERS,
      scenarioA: { sellingPrice: 800_000 }, // significantly higher
      scenarioB: { sellingPrice: 400_000 }, // lower
    };
    const out = calculateScenarioOutputs(inputs, BASE_COST_BASE, BASE_PURCHASE_PRICE);
    expect(out.recommendedScenario).toBe(ScenarioType.A);
  });
});
