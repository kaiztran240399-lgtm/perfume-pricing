/**
 * Tests for lib/finance/validation.ts
 * Cross-domain financial validation engine — all 12 rules.
 */

import { describe, it, expect } from 'vitest';
import { runFinancialValidation } from '../validation';
import { ValidationDomain } from '../../../types/validation';
import type { ValidationResult } from '../../../types/validation';
import type { BusinessCalculatorDerived } from '../../../types/calculator';
import { ScenarioType } from '../../../types/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Minimal Fixture Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a minimal BusinessCalculatorDerived stub for validation tests.
 * Only the fields actually read by runFinancialValidation are required.
 * All others use safe zero/empty defaults.
 */
function makeDerived(overrides: {
  // UE fields
  contributionMarginPerUnit?:  number;
  contributionMarginRatioPct?: number;
  breakEvenUnitsPerMonth?:     number;
  // Marketing fields
  blendedRoas?:  number;
  blendedCac?:   number;
  maxViableCac?: number;
  // LTV field
  ltvCacRatio?: number;
  // Inventory field
  dsi?: number;
  // Pricing field
  grossMarginPct?: number;
} = {}): BusinessCalculatorDerived {
  return {
    pricing: {
      effectivePurchasePrice: 0,
      variableCostFixedAmount: 0,
      variableCostPctAmount: 0,
      totalCostPerUnit: 0,
      costBase: 0,
      sellingPriceExact: 0,
      sellingPriceRounded: 0,
      grossProfitPerUnit: 0,
      grossMarginPct: overrides.grossMarginPct ?? 35,
      costsBreakdown: [],
      warnings: [],
    },
    unitEconomics: {
      effectiveSellingPrice: 0,
      netRevenuePerUnit: 0,
      allocatedGiftCostPerUnit: 0,
      cac: 0,
      contributionMarginPerUnit:  overrides.contributionMarginPerUnit  ?? 100_000,
      contributionMarginRatioPct: overrides.contributionMarginRatioPct ?? 30,
      effectiveMarginPct: 0,
      breakEvenUnitsPerMonth: overrides.breakEvenUnitsPerMonth ?? 50,
      breakEvenRevenue: 0,
      roasPerUnit: 0,
      monthlyGrossRevenue: 0,
      monthlyNetRevenue: 0,
      monthlyContributionProfit: 0,
      warnings: [],
    },
    marketing: {
      facebook: { estimatedOrders: 0, grossRevenue: 0, netRevenue: 0, roas: 0, cac: 0, costPerOrder: 0 },
      tiktok:   { estimatedOrders: 0, grossRevenue: 0, netRevenue: 0, roas: 0, cac: 0, costPerOrder: 0 },
      blended: {
        totalOrders: 0,
        totalGrossRevenue: 0,
        totalNetRevenue: 0,
        totalAdSpend: 0,
        totalMarketingCost: 0,
        blendedRoas: overrides.blendedRoas ?? 5,
        blendedCac:  overrides.blendedCac  ?? 0,
        mer: 0,
        revenueShareFacebookPct: 0,
        revenueShareTiktokPct:   0,
      },
      budgetScenarios: [],
      revenueTargetBudgetMap: [],
      warnings: [],
    },
    ltv: {
      ltvSimple: 0,
      ltvMarginAdjusted: 0,
      ltvNet: 0,
      ltvReferralAdjusted: 0,
      ltvCacRatio:  overrides.ltvCacRatio  ?? 0,
      ltvCacHealthStatus: 'healthy',
      paybackPeriodMonths: 6,
      maxViableCac: overrides.maxViableCac ?? 500_000,
      cacSurplusOrDeficit: 0,
      cohortValueByYear: [],
      warnings: [],
    },
    inventory: {
      reorderPoint: 0,
      economicOrderQuantity: 0,
      currentInventoryValue: 0,
      daysOfSalesInventory: overrides.dsi ?? 30,
      inventoryTurnoverAnnual: 0,
      cashConversionCycleDays: 0,
      cashRunwayMonths: 6,
      minimumCashReserveNeeded: 0,
      cashflowProjection: [],
      criticalMonths: [],
      warnings: [],
    },
    scenario: {
      base: {
        grossRevenue: 0, netRevenue: 0, cogs: 0, grossProfit: 0, grossMarginPct: 0,
        marketingSpend: 0, contributionProfit: 0, fixedCosts: 0, operatingProfit: 0,
        operatingMarginPct: 0, breakEvenUnits: 0, roas: 0, ltvCacImpact: 0, capitalRequired: 0,
      },
      scenarioA: {
        grossRevenue: 0, netRevenue: 0, cogs: 0, grossProfit: 0, grossMarginPct: 0,
        marketingSpend: 0, contributionProfit: 0, fixedCosts: 0, operatingProfit: 0,
        operatingMarginPct: 0, breakEvenUnits: 0, roas: 0, ltvCacImpact: 0, capitalRequired: 0,
      },
      scenarioB: {
        grossRevenue: 0, netRevenue: 0, cogs: 0, grossProfit: 0, grossMarginPct: 0,
        marketingSpend: 0, contributionProfit: 0, fixedCosts: 0, operatingProfit: 0,
        operatingMarginPct: 0, breakEvenUnits: 0, roas: 0, ltvCacImpact: 0, capitalRequired: 0,
      },
      deltaAVsBase: {
        grossRevenueDelta: 0, grossRevenueDeltaPct: 0, operatingProfitDelta: 0,
        operatingProfitDeltaPct: 0, marginDeltaPpt: 0, breakEvenUnitsDelta: 0, isImprovement: false,
      },
      deltaBVsBase: {
        grossRevenueDelta: 0, grossRevenueDeltaPct: 0, operatingProfitDelta: 0,
        operatingProfitDeltaPct: 0, marginDeltaPpt: 0, breakEvenUnitsDelta: 0, isImprovement: false,
      },
      sensitivityRanking: [],
      recommendedScenario: ScenarioType.BASE,
      recommendationReason: '',
      warnings: [],
    },
    validation: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const ids = (results: ValidationResult[]) => results.map(r => r.id);

// ─────────────────────────────────────────────────────────────────────────────
// Rule 1 — UE: CM per unit negative (danger)
// ─────────────────────────────────────────────────────────────────────────────

describe('Rule 1 — ue-cm-negative', () => {
  it('fires when contributionMarginPerUnit < 0', () => {
    const result = runFinancialValidation(makeDerived({ contributionMarginPerUnit: -10_000 }));
    expect(ids(result)).toContain('ue-cm-negative');
    const r = result.find(x => x.id === 'ue-cm-negative')!;
    expect(r.severity).toBe('danger');
    expect(r.domain).toBe(ValidationDomain.UNIT_ECONOMICS);
  });

  it('does NOT fire when CM per unit is positive', () => {
    const result = runFinancialValidation(makeDerived({ contributionMarginPerUnit: 50_000 }));
    expect(ids(result)).not.toContain('ue-cm-negative');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rule 2 — UE: CM ratio low (caution)
// ─────────────────────────────────────────────────────────────────────────────

describe('Rule 2 — ue-cm-low', () => {
  it('fires when CM ratio is between 0 and 15 (exclusive)', () => {
    const result = runFinancialValidation(makeDerived({ contributionMarginRatioPct: 10, contributionMarginPerUnit: 50_000 }));
    expect(ids(result)).toContain('ue-cm-low');
    const r = result.find(x => x.id === 'ue-cm-low')!;
    expect(r.severity).toBe('caution');
  });

  it('does NOT fire when CM ratio >= 15', () => {
    const result = runFinancialValidation(makeDerived({ contributionMarginRatioPct: 20, contributionMarginPerUnit: 50_000 }));
    expect(ids(result)).not.toContain('ue-cm-low');
  });

  it('does NOT fire when CM ratio is 0 or negative (rule 1 fires instead)', () => {
    const result = runFinancialValidation(makeDerived({ contributionMarginRatioPct: 0, contributionMarginPerUnit: -1 }));
    expect(ids(result)).not.toContain('ue-cm-low');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rule 3 — UE: Cannot break even (danger)
// ─────────────────────────────────────────────────────────────────────────────

describe('Rule 3 — ue-no-break-even', () => {
  it('fires when breakEvenUnitsPerMonth === MAX_SAFE_INTEGER', () => {
    const result = runFinancialValidation(makeDerived({ breakEvenUnitsPerMonth: Number.MAX_SAFE_INTEGER }));
    expect(ids(result)).toContain('ue-no-break-even');
    expect(result.find(x => x.id === 'ue-no-break-even')!.severity).toBe('danger');
  });

  it('does NOT fire when break-even is a finite number', () => {
    const result = runFinancialValidation(makeDerived({ breakEvenUnitsPerMonth: 50 }));
    expect(ids(result)).not.toContain('ue-no-break-even');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rule 4 — UE: CM ratio healthy (healthy)
// ─────────────────────────────────────────────────────────────────────────────

describe('Rule 4 — ue-cm-healthy', () => {
  it('fires when CM ratio >= 25 and CM per unit > 0', () => {
    const result = runFinancialValidation(makeDerived({ contributionMarginRatioPct: 30, contributionMarginPerUnit: 100_000 }));
    expect(ids(result)).toContain('ue-cm-healthy');
    expect(result.find(x => x.id === 'ue-cm-healthy')!.severity).toBe('healthy');
  });

  it('does NOT fire when CM ratio is between 15 and 24', () => {
    const result = runFinancialValidation(makeDerived({ contributionMarginRatioPct: 20, contributionMarginPerUnit: 50_000 }));
    expect(ids(result)).not.toContain('ue-cm-healthy');
  });

  it('does NOT fire when CM ratio < 0', () => {
    const result = runFinancialValidation(makeDerived({ contributionMarginRatioPct: -5, contributionMarginPerUnit: -1 }));
    expect(ids(result)).not.toContain('ue-cm-healthy');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rule 5 — Marketing: ROAS below break-even (danger)
// ─────────────────────────────────────────────────────────────────────────────

describe('Rule 5 — mkt-roas-below-breakeven', () => {
  it('fires when blendedRoas < breakEvenRoas (1/margin)', () => {
    // grossMarginPct=50 → breakEvenRoas = 100/50 = 2; blendedRoas=1.5 < 2 → danger
    const result = runFinancialValidation(makeDerived({ blendedRoas: 1.5, grossMarginPct: 50 }));
    expect(ids(result)).toContain('mkt-roas-below-breakeven');
    expect(result.find(x => x.id === 'mkt-roas-below-breakeven')!.severity).toBe('danger');
    expect(result.find(x => x.id === 'mkt-roas-below-breakeven')!.domain).toBe(ValidationDomain.MARKETING);
  });

  it('does NOT fire when blendedRoas >= breakEvenRoas', () => {
    // grossMarginPct=33 → breakEvenRoas ≈ 3.03; blendedRoas=4 → no fire
    const result = runFinancialValidation(makeDerived({ blendedRoas: 4, grossMarginPct: 33 }));
    expect(ids(result)).not.toContain('mkt-roas-below-breakeven');
  });

  it('does NOT fire when blendedRoas is 0 (no ads)', () => {
    const result = runFinancialValidation(makeDerived({ blendedRoas: 0, grossMarginPct: 35 }));
    expect(ids(result)).not.toContain('mkt-roas-below-breakeven');
  });

  it('does NOT fire when grossMarginPct is 0', () => {
    const result = runFinancialValidation(makeDerived({ blendedRoas: 1, grossMarginPct: 0 }));
    expect(ids(result)).not.toContain('mkt-roas-below-breakeven');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rule 6 — Marketing: CAC exceeds maxViableCAC (danger)
// ─────────────────────────────────────────────────────────────────────────────

describe('Rule 6 — mkt-cac-over-max', () => {
  it('fires when blendedCac > maxViableCac', () => {
    const result = runFinancialValidation(makeDerived({ blendedCac: 600_000, maxViableCac: 400_000 }));
    expect(ids(result)).toContain('mkt-cac-over-max');
    expect(result.find(x => x.id === 'mkt-cac-over-max')!.severity).toBe('danger');
  });

  it('does NOT fire when blendedCac <= maxViableCac', () => {
    const result = runFinancialValidation(makeDerived({ blendedCac: 300_000, maxViableCac: 400_000 }));
    expect(ids(result)).not.toContain('mkt-cac-over-max');
  });

  it('does NOT fire when maxViableCac is 0 (organic only)', () => {
    const result = runFinancialValidation(makeDerived({ blendedCac: 100_000, maxViableCac: 0 }));
    expect(ids(result)).not.toContain('mkt-cac-over-max');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rule 7 — Marketing: ROAS healthy (healthy)
// ─────────────────────────────────────────────────────────────────────────────

describe('Rule 7 — mkt-roas-healthy', () => {
  it('fires when blendedRoas >= 3', () => {
    const result = runFinancialValidation(makeDerived({ blendedRoas: 5 }));
    expect(ids(result)).toContain('mkt-roas-healthy');
    expect(result.find(x => x.id === 'mkt-roas-healthy')!.severity).toBe('healthy');
  });

  it('fires exactly at blendedRoas = 3', () => {
    const result = runFinancialValidation(makeDerived({ blendedRoas: 3 }));
    expect(ids(result)).toContain('mkt-roas-healthy');
  });

  it('does NOT fire when blendedRoas < 3', () => {
    const result = runFinancialValidation(makeDerived({ blendedRoas: 2.5 }));
    expect(ids(result)).not.toContain('mkt-roas-healthy');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rule 8 — LTV: CAC ratio critical (danger)
// ─────────────────────────────────────────────────────────────────────────────

describe('Rule 8 — ltv-cac-danger', () => {
  it('fires when ltvCacRatio > 0 and < 1.5', () => {
    const result = runFinancialValidation(makeDerived({ ltvCacRatio: 1.0 }));
    expect(ids(result)).toContain('ltv-cac-danger');
    expect(result.find(x => x.id === 'ltv-cac-danger')!.severity).toBe('danger');
    expect(result.find(x => x.id === 'ltv-cac-danger')!.domain).toBe(ValidationDomain.LTV);
  });

  it('does NOT fire when ltvCacRatio is 0 (organic — no meaningful ratio)', () => {
    const result = runFinancialValidation(makeDerived({ ltvCacRatio: 0 }));
    expect(ids(result)).not.toContain('ltv-cac-danger');
  });

  it('does NOT fire when ltvCacRatio >= 1.5 (boundary)', () => {
    const result = runFinancialValidation(makeDerived({ ltvCacRatio: 1.5 }));
    expect(ids(result)).not.toContain('ltv-cac-danger');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rule 9 — LTV: CAC ratio caution (caution)
// ─────────────────────────────────────────────────────────────────────────────

describe('Rule 9 — ltv-cac-caution', () => {
  it('fires when ltvCacRatio is 1.5 to 2.99', () => {
    const result = runFinancialValidation(makeDerived({ ltvCacRatio: 2.0 }));
    expect(ids(result)).toContain('ltv-cac-caution');
    expect(result.find(x => x.id === 'ltv-cac-caution')!.severity).toBe('caution');
  });

  it('fires at exactly 1.5 (boundary — caution not danger)', () => {
    const result = runFinancialValidation(makeDerived({ ltvCacRatio: 1.5 }));
    expect(ids(result)).toContain('ltv-cac-caution');
    expect(ids(result)).not.toContain('ltv-cac-danger');
  });

  it('does NOT fire at 3 (healthy threshold)', () => {
    const result = runFinancialValidation(makeDerived({ ltvCacRatio: 3 }));
    expect(ids(result)).not.toContain('ltv-cac-caution');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rule 10 — LTV: CAC ratio healthy (healthy)
// ─────────────────────────────────────────────────────────────────────────────

describe('Rule 10 — ltv-cac-healthy', () => {
  it('fires when ltvCacRatio >= 3', () => {
    const result = runFinancialValidation(makeDerived({ ltvCacRatio: 4 }));
    expect(ids(result)).toContain('ltv-cac-healthy');
    expect(result.find(x => x.id === 'ltv-cac-healthy')!.severity).toBe('healthy');
  });

  it('fires at exactly 3', () => {
    const result = runFinancialValidation(makeDerived({ ltvCacRatio: 3 }));
    expect(ids(result)).toContain('ltv-cac-healthy');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rule 11 — Inventory: high DSI (caution)
// ─────────────────────────────────────────────────────────────────────────────

describe('Rule 11 — inv-high-dsi', () => {
  it('fires when DSI is between 120 and 180 (exclusive)', () => {
    const result = runFinancialValidation(makeDerived({ dsi: 150 }));
    expect(ids(result)).toContain('inv-high-dsi');
    expect(result.find(x => x.id === 'inv-high-dsi')!.severity).toBe('caution');
    expect(result.find(x => x.id === 'inv-high-dsi')!.domain).toBe(ValidationDomain.INVENTORY);
  });

  it('fires at exactly 121', () => {
    const result = runFinancialValidation(makeDerived({ dsi: 121 }));
    expect(ids(result)).toContain('inv-high-dsi');
    expect(ids(result)).not.toContain('inv-dead-stock');
  });

  it('does NOT fire when DSI <= 120', () => {
    const result = runFinancialValidation(makeDerived({ dsi: 120 }));
    expect(ids(result)).not.toContain('inv-high-dsi');
  });

  it('does NOT fire when DSI > 180 (dead-stock rule fires instead)', () => {
    const result = runFinancialValidation(makeDerived({ dsi: 200 }));
    expect(ids(result)).not.toContain('inv-high-dsi');
    expect(ids(result)).toContain('inv-dead-stock');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rule 12 — Inventory: dead stock (danger)
// ─────────────────────────────────────────────────────────────────────────────

describe('Rule 12 — inv-dead-stock', () => {
  it('fires when DSI > 180', () => {
    const result = runFinancialValidation(makeDerived({ dsi: 200 }));
    expect(ids(result)).toContain('inv-dead-stock');
    expect(result.find(x => x.id === 'inv-dead-stock')!.severity).toBe('danger');
  });

  it('fires at exactly 181', () => {
    const result = runFinancialValidation(makeDerived({ dsi: 181 }));
    expect(ids(result)).toContain('inv-dead-stock');
  });

  it('does NOT fire when DSI <= 180', () => {
    const result = runFinancialValidation(makeDerived({ dsi: 180 }));
    expect(ids(result)).not.toContain('inv-dead-stock');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Sort order
// ─────────────────────────────────────────────────────────────────────────────

describe('Sort order: danger → caution → healthy', () => {
  it('results are sorted danger first, then caution, then healthy', () => {
    // Trigger: ue-cm-low (caution) + mkt-roas-healthy (healthy) + ltv-cac-danger (danger)
    const result = runFinancialValidation(makeDerived({
      contributionMarginRatioPct: 10, // caution
      contributionMarginPerUnit: 50_000,
      blendedRoas: 5,                 // healthy (mkt-roas-healthy)
      ltvCacRatio: 1.0,               // danger
    }));

    const order: Record<string, number> = { danger: 0, caution: 1, healthy: 2 };
    for (let i = 0; i < result.length - 1; i++) {
      expect(order[result[i].severity]).toBeLessThanOrEqual(order[result[i + 1].severity]);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Full healthy derived — only healthy results
// ─────────────────────────────────────────────────────────────────────────────

describe('Fully healthy state', () => {
  it('returns only healthy results when all metrics are in good ranges', () => {
    const result = runFinancialValidation(makeDerived({
      contributionMarginPerUnit:  100_000,
      contributionMarginRatioPct: 30,   // ≥ 25 → ue-cm-healthy
      breakEvenUnitsPerMonth:     40,
      blendedRoas:                5,    // ≥ 3 → mkt-roas-healthy
      blendedCac:                 100_000,
      maxViableCac:               300_000,
      ltvCacRatio:                4,    // ≥ 3 → ltv-cac-healthy
      dsi:                        30,   // ≤ 120 → no inv warning
      grossMarginPct:             35,
    }));

    expect(result.length).toBeGreaterThan(0);
    expect(result.every(r => r.severity === 'healthy')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Mixed state
// ─────────────────────────────────────────────────────────────────────────────

describe('Mixed state: danger + caution + healthy present', () => {
  it('can contain all three severity levels simultaneously', () => {
    const result = runFinancialValidation(makeDerived({
      contributionMarginPerUnit:  -5_000,     // danger: ue-cm-negative
      contributionMarginRatioPct: -1,
      blendedRoas:                5,           // healthy: mkt-roas-healthy
      ltvCacRatio:                2.0,         // caution: ltv-cac-caution
      dsi:                        30,
      grossMarginPct:             35,
    }));

    const severities = new Set(result.map(r => r.severity));
    expect(severities.has('danger')).toBe(true);
    expect(severities.has('healthy')).toBe(true);
    expect(severities.has('caution')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Edge: all-zero derived → should not crash
// ─────────────────────────────────────────────────────────────────────────────

describe('Edge: all-zero derived', () => {
  it('does not throw and returns an array', () => {
    const result = runFinancialValidation(makeDerived({
      contributionMarginPerUnit: 0,
      contributionMarginRatioPct: 0,
      breakEvenUnitsPerMonth: 0,
      blendedRoas: 0,
      blendedCac: 0,
      maxViableCac: 0,
      ltvCacRatio: 0,
      dsi: 0,
      grossMarginPct: 0,
    }));
    expect(Array.isArray(result)).toBe(true);
  });
});
