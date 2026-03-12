/**
 * Tests for lib/finance/marketing.ts
 * Revenue funnel, channel metrics, blended aggregates, and warnings.
 */

import { describe, it, expect } from 'vitest';
import {
  clicksFromBudget,
  ordersFromClicks,
  revenueFromOrders,
  netRevenueAfterErosion,
  calculateROAS,
  calculateChannelCAC,
  calculateFacebookMetrics,
  calculateTikTokMetrics,
  calculateBlendedMetrics,
  calculateBudgetScenarios,
  computeMarketingWarnings,
  calculateMarketingOutputs,
} from '../marketing';
import { AdsMode } from '../../../types/shared';
import type { MarketingInputs } from '../../../types/marketing';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const FB_INPUTS: MarketingInputs['facebook'] = {
  monthlyBudget:        10_000_000,
  cpc:                  2_000,
  landingPageCvrPct:    2,
  averageOrderValue:    500_000,
  adsMode:              AdsMode.FIXED_VND,
};

const TT_INPUTS: MarketingInputs['tiktok'] = {
  monthlyAdBudget:      5_000_000,
  monthlyOrganicGmv:    10_000_000,
  platformVoucherBudget: 0,
  commissionRatePct:    3,
  productPageCvrPct:    4,
  averageOrderValue:    500_000,
  adsMode:              AdsMode.FIXED_VND,
};

const BASE_INPUTS: MarketingInputs = {
  facebook:                       FB_INPUTS,
  tiktok:                         TT_INPUTS,
  sharedAverageOrderValue:        500_000,
  contentCostPerMonth:            2_000_000,
  kolCostPerMonth:                1_000_000,
  marketingStaffCostPerMonth:     3_000_000,
  returnRatePct:                  5,
};

// ─────────────────────────────────────────────────────────────────────────────

describe('clicksFromBudget', () => {
  it('returns budget / CPC', () => {
    expect(clicksFromBudget(10_000_000, 2_000)).toBe(5_000);
  });

  it('returns 0 when CPC is 0', () => {
    expect(clicksFromBudget(10_000_000, 0)).toBe(0);
  });

  it('returns 0 when budget is 0', () => {
    expect(clicksFromBudget(0, 2_000)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('ordersFromClicks', () => {
  it('applies CVR percentage', () => {
    expect(ordersFromClicks(5_000, 2)).toBe(100);
  });

  it('returns 0 when CVR is 0', () => {
    expect(ordersFromClicks(5_000, 0)).toBe(0);
  });

  it('returns 0 when clicks is 0', () => {
    expect(ordersFromClicks(0, 2)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('revenueFromOrders', () => {
  it('returns orders × AOV', () => {
    expect(revenueFromOrders(100, 500_000)).toBe(50_000_000);
  });

  it('returns 0 when orders is 0', () => {
    expect(revenueFromOrders(0, 500_000)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('netRevenueAfterErosion', () => {
  it('applies return rate only', () => {
    // 100 × (1 - 0.05) = 95
    expect(netRevenueAfterErosion(100, 5)).toBeCloseTo(95);
  });

  it('applies commission rate only', () => {
    // 100 × (1 - 0.03) = 97
    expect(netRevenueAfterErosion(100, 0, 3)).toBeCloseTo(97);
  });

  it('applies both return and commission', () => {
    // 100 × 0.95 × 0.97 = 92.15
    expect(netRevenueAfterErosion(100, 5, 3)).toBeCloseTo(92.15, 1);
  });

  it('returns 0 when 100% return rate', () => {
    expect(netRevenueAfterErosion(100_000, 100)).toBe(0);
  });

  it('never returns negative', () => {
    expect(netRevenueAfterErosion(100, 120)).toBe(0); // returnRatePct > 100 clamped
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateROAS', () => {
  it('returns revenue / adSpend', () => {
    expect(calculateROAS(50_000_000, 10_000_000)).toBe(5);
  });

  it('returns 0 when adSpend is 0 (organic-only)', () => {
    expect(calculateROAS(50_000_000, 0)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateChannelCAC', () => {
  it('returns adSpend / orders', () => {
    expect(calculateChannelCAC(10_000_000, 100)).toBe(100_000);
  });

  it('returns 0 when orders is 0', () => {
    expect(calculateChannelCAC(10_000_000, 0)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateFacebookMetrics — FIXED_VND mode', () => {
  it('computes orders from budget/CPC and CVR', () => {
    const metrics = calculateFacebookMetrics(FB_INPUTS, 5, 500_000);
    // clicks = 10M / 2_000 = 5_000; orders = 5_000 × 2% = 100
    expect(metrics.estimatedOrders).toBe(100);
  });

  it('computes gross revenue as orders × AOV', () => {
    const metrics = calculateFacebookMetrics(FB_INPUTS, 5, 500_000);
    expect(metrics.grossRevenue).toBe(100 * 500_000);
  });

  it('net revenue deducts return rate', () => {
    const metrics = calculateFacebookMetrics(FB_INPUTS, 5, 500_000);
    // 50_000_000 × (1 - 0.05) = 47_500_000
    expect(metrics.netRevenue).toBeCloseTo(47_500_000, 0);
  });

  it('ROAS = netRevenue / budget', () => {
    const metrics = calculateFacebookMetrics(FB_INPUTS, 5, 500_000);
    expect(metrics.roas).toBeCloseTo(47_500_000 / 10_000_000, 2);
  });

  it('all-zero inputs return zero metrics without crashing', () => {
    const zeroFb: MarketingInputs['facebook'] = {
      monthlyBudget: 0, cpc: 0, landingPageCvrPct: 0,
      averageOrderValue: 0, adsMode: AdsMode.FIXED_VND,
    };
    const metrics = calculateFacebookMetrics(zeroFb, 0, 0);
    expect(metrics.estimatedOrders).toBe(0);
    expect(metrics.roas).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateTikTokMetrics', () => {
  it('includes organic orders from GMV', () => {
    const metrics = calculateTikTokMetrics(TT_INPUTS, 5, 500_000);
    // organicOrders = 10_000_000 / 500_000 = 20
    expect(metrics.estimatedOrders).toBeGreaterThan(0);
  });

  it('deducts TikTok commission and return rate', () => {
    const pureOrganic = { ...TT_INPUTS, monthlyAdBudget: 0 };
    const metrics = calculateTikTokMetrics(pureOrganic, 5, 500_000);
    // grossRevenue = 20 × 500_000 = 10_000_000
    // netRevenue = 10_000_000 × 0.95 × 0.97
    expect(metrics.netRevenue).toBeLessThan(metrics.grossRevenue);
  });

  it('organic-only: adSpend=0 → CAC is 0', () => {
    const pureOrganic = { ...TT_INPUTS, monthlyAdBudget: 0 };
    const metrics = calculateTikTokMetrics(pureOrganic, 5, 500_000);
    expect(metrics.cac).toBe(0);
  });

  it('all-zero inputs return zero metrics without crashing', () => {
    const zeroTt: MarketingInputs['tiktok'] = {
      monthlyAdBudget: 0, monthlyOrganicGmv: 0, platformVoucherBudget: 0,
      commissionRatePct: 0, productPageCvrPct: 0, averageOrderValue: 0,
      adsMode: AdsMode.FIXED_VND,
    };
    const metrics = calculateTikTokMetrics(zeroTt, 0, 0);
    expect(metrics.estimatedOrders).toBe(0);
    expect(metrics.grossRevenue).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateBlendedMetrics', () => {
  it('sums orders from both channels', () => {
    const fb = calculateFacebookMetrics(FB_INPUTS, 5, 500_000);
    const tt = calculateTikTokMetrics(TT_INPUTS, 5, 500_000);
    const blended = calculateBlendedMetrics(fb, tt, BASE_INPUTS);
    expect(blended.totalOrders).toBe(fb.estimatedOrders + tt.estimatedOrders);
  });

  it('totalMarketingCost includes content + KOL + staff', () => {
    const fb = calculateFacebookMetrics(FB_INPUTS, 5, 500_000);
    const tt = calculateTikTokMetrics(TT_INPUTS, 5, 500_000);
    const blended = calculateBlendedMetrics(fb, tt, BASE_INPUTS);
    // totalAdSpend = 10M + 5M = 15M; total = 15M + 2M + 1M + 3M = 21M
    expect(blended.totalMarketingCost).toBe(blended.totalAdSpend + 6_000_000);
  });

  it('all-zero channels return zero blended metrics', () => {
    const zeroMetrics = { estimatedOrders: 0, grossRevenue: 0, netRevenue: 0, roas: 0, cac: 0, costPerOrder: 0 };
    const zeroInputs: MarketingInputs = {
      ...BASE_INPUTS,
      facebook:   { ...FB_INPUTS, monthlyBudget: 0 },
      tiktok:     { ...TT_INPUTS, monthlyAdBudget: 0, monthlyOrganicGmv: 0 },
      contentCostPerMonth: 0, kolCostPerMonth: 0, marketingStaffCostPerMonth: 0,
    };
    const blended = calculateBlendedMetrics(zeroMetrics, zeroMetrics, zeroInputs);
    expect(blended.totalOrders).toBe(0);
    expect(blended.blendedRoas).toBe(0);
    expect(blended.blendedCac).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateBudgetScenarios', () => {
  it('returns 3 scenarios at 1×, 1.5×, 2×', () => {
    const fb = calculateFacebookMetrics(FB_INPUTS, 5, 500_000);
    const tt = calculateTikTokMetrics(TT_INPUTS, 5, 500_000);
    const blended = calculateBlendedMetrics(fb, tt, BASE_INPUTS);
    const scenarios = calculateBudgetScenarios(blended, blended.totalAdSpend);
    expect(scenarios).toHaveLength(3);
    expect(scenarios.map(s => s.multiplier)).toEqual([1, 1.5, 2]);
  });

  it('1× scenario has same adSpend as base', () => {
    const fb = calculateFacebookMetrics(FB_INPUTS, 5, 500_000);
    const tt = calculateTikTokMetrics(TT_INPUTS, 5, 500_000);
    const blended = calculateBlendedMetrics(fb, tt, BASE_INPUTS);
    const scenarios = calculateBudgetScenarios(blended, blended.totalAdSpend);
    expect(scenarios[0].totalAdSpend).toBe(blended.totalAdSpend);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('computeMarketingWarnings', () => {
  const makePartial = (overrides: Partial<{
    totalOrders: number;
    totalAdSpend: number;
    blendedRoas: number;
    blendedCac: number;
  }> = {}) => {
    const defaults = {
      totalOrders:       100,
      totalGrossRevenue: 50_000_000,
      totalNetRevenue:   47_500_000,
      totalAdSpend:      10_000_000,
      totalMarketingCost: 16_000_000,
      blendedRoas:       4.75,
      blendedCac:        100_000,
      mer:               2.97,
      revenueShareFacebookPct: 70,
      revenueShareTiktokPct:   30,
    };
    return {
      facebook: { estimatedOrders: 0, grossRevenue: 0, netRevenue: 0, roas: 0, cac: 0, costPerOrder: 0 },
      tiktok: { estimatedOrders: 0, grossRevenue: 0, netRevenue: 0, roas: 0, cac: 0, costPerOrder: 0 },
      blended: { ...defaults, ...overrides },
      budgetScenarios: [],
      revenueTargetBudgetMap: [],
    };
  };

  it('no warnings when all metrics healthy', () => {
    const warnings = computeMarketingWarnings(makePartial(), 500_000);
    expect(warnings.every(w => w.code !== 'LOW_BLENDED_ROAS' && w.code !== 'HIGH_CAC')).toBe(true);
  });

  it('emits NO_ORDERS when totalOrders is 0', () => {
    const warnings = computeMarketingWarnings(makePartial({ totalOrders: 0, totalAdSpend: 0 }), 500_000);
    const codes = warnings.map(w => w.code);
    expect(codes).toContain('NO_ORDERS');
    expect(warnings.find(w => w.code === 'NO_ORDERS')?.level).toBe('info');
  });

  it('emits LOW_BLENDED_ROAS when ROAS < 2 and adSpend > 0', () => {
    const warnings = computeMarketingWarnings(makePartial({ blendedRoas: 1.5, totalAdSpend: 10_000_000 }), 500_000);
    const codes = warnings.map(w => w.code);
    expect(codes).toContain('LOW_BLENDED_ROAS');
    expect(warnings.find(w => w.code === 'LOW_BLENDED_ROAS')?.level).toBe('warning');
  });

  it('does NOT emit LOW_BLENDED_ROAS when adSpend is 0', () => {
    const warnings = computeMarketingWarnings(makePartial({ blendedRoas: 0, totalAdSpend: 0 }), 500_000);
    const codes = warnings.map(w => w.code);
    expect(codes).not.toContain('LOW_BLENDED_ROAS');
  });

  it('emits HIGH_CAC when CAC > 30% of AOV', () => {
    // AOV = 500_000, 30% = 150_000; CAC = 200_000 → HIGH_CAC
    const warnings = computeMarketingWarnings(makePartial({ blendedCac: 200_000 }), 500_000);
    const codes = warnings.map(w => w.code);
    expect(codes).toContain('HIGH_CAC');
  });

  it('does NOT emit HIGH_CAC when AOV is 0', () => {
    const warnings = computeMarketingWarnings(makePartial({ blendedCac: 200_000 }), 0);
    const codes = warnings.map(w => w.code);
    expect(codes).not.toContain('HIGH_CAC');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateMarketingOutputs', () => {
  it('returns all required output fields', () => {
    const out = calculateMarketingOutputs(BASE_INPUTS);
    expect(out.facebook).toBeDefined();
    expect(out.tiktok).toBeDefined();
    expect(out.blended).toBeDefined();
    expect(out.budgetScenarios).toHaveLength(3);
    expect(out.revenueTargetBudgetMap).toHaveLength(5);
    expect(out.warnings).toBeDefined();
  });

  it('all-zero inputs return zero outputs without crashing', () => {
    const zeroInputs: MarketingInputs = {
      facebook:   { ...FB_INPUTS, monthlyBudget: 0, cpc: 0, landingPageCvrPct: 0, averageOrderValue: 0 },
      tiktok:     { ...TT_INPUTS, monthlyAdBudget: 0, monthlyOrganicGmv: 0, averageOrderValue: 0 },
      sharedAverageOrderValue: 0,
      contentCostPerMonth:     0,
      kolCostPerMonth:         0,
      marketingStaffCostPerMonth: 0,
      returnRatePct:           0,
    };
    const out = calculateMarketingOutputs(zeroInputs);
    expect(out.blended.totalOrders).toBe(0);
    expect(out.blended.blendedRoas).toBe(0);
  });
});
