/**
 * Tests for lib/finance/inventory.ts
 * Inventory management: reorder, EOQ, DSI, CCC, cashflow, warnings.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateDailySales,
  calculateReorderPoint,
  calculateEOQ,
  calculateDSI,
  calculateInventoryTurnover,
  calculateCashConversionCycle,
  computeInventoryWarnings,
  calculateInventoryOutputs,
} from '../inventory';
import type { InventoryInputs } from '../../../types/inventory';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const BASE_INPUTS: InventoryInputs = {
  currentInventoryUnits:        200,
  startingCashBalance:          50_000_000,
  leadTimeDays:                 7,
  safetyStockMultiplier:        1.5,
  orderingCostPerOrder:         500_000,
  holdingCostPerUnitPerMonth:   10_000,
  supplierUpfrontPct:           50,
  supplierBalanceDueDays:       30,
  facebookCollectionLagDays:    3,
  tiktokCollectionLagDays:      7,
  monthlyFixedOperatingCosts:   10_000_000,
  taxReserveRatePct:            10,
  otherMonthlyIncome:           0,
  monthlySalesForecast: [
    { monthIndex: 0, label: 'T1', forecastUnits: 100, forecastRevenue: 50_000_000, marketingSpend: 5_000_000 },
    { monthIndex: 1, label: 'T2', forecastUnits: 120, forecastRevenue: 60_000_000, marketingSpend: 6_000_000 },
    { monthIndex: 2, label: 'T3', forecastUnits: 110, forecastRevenue: 55_000_000, marketingSpend: 5_500_000 },
    { monthIndex: 3, label: 'T4', forecastUnits: 130, forecastRevenue: 65_000_000, marketingSpend: 6_500_000 },
    { monthIndex: 4, label: 'T5', forecastUnits: 90,  forecastRevenue: 45_000_000, marketingSpend: 4_500_000 },
    { monthIndex: 5, label: 'T6', forecastUnits: 100, forecastRevenue: 50_000_000, marketingSpend: 5_000_000 },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateDailySales', () => {
  it('returns monthlyUnits / 30', () => {
    expect(calculateDailySales(300)).toBe(10);
  });

  it('returns 0 when monthly units is 0', () => {
    expect(calculateDailySales(0)).toBe(0);
  });

  it('handles fractional daily sales', () => {
    expect(calculateDailySales(15)).toBeCloseTo(0.5, 2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateReorderPoint', () => {
  it('applies safety multiplier to lead-time demand', () => {
    // dailySales=10, leadTime=7, multiplier=1.5 → 10×7×1.5 = 105
    expect(calculateReorderPoint(10, 7, 1.5)).toBe(105);
  });

  it('returns 0 when lead time is 0', () => {
    expect(calculateReorderPoint(10, 0, 1.5)).toBe(0);
  });

  it('uses minimum multiplier of 1 even if passed < 1', () => {
    // multiplier clamped to max(1, 0.5) = 1; 10×7×1 = 70
    expect(calculateReorderPoint(10, 7, 0.5)).toBe(70);
  });

  it('returns at least 1 when there are any sales and lead time', () => {
    expect(calculateReorderPoint(0.1, 1, 1)).toBeGreaterThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateEOQ', () => {
  it('computes EOQ from demand, ordering cost, holding cost', () => {
    // EOQ = ceil(√(2 × 100 × 500_000 / 10_000)) = ceil(√10_000) = 100
    expect(calculateEOQ(100, 500_000, 10_000)).toBe(100);
  });

  it('returns fallback when holdingCost is 0', () => {
    expect(calculateEOQ(100, 500_000, 0, 50)).toBe(50);
  });

  it('returns fallback when orderingCost is 0', () => {
    expect(calculateEOQ(100, 0, 10_000, 50)).toBe(50);
  });

  it('returns 0 default fallback when both costs are 0', () => {
    expect(calculateEOQ(100, 0, 0)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateDSI', () => {
  it('returns inventoryUnits / dailySales', () => {
    expect(calculateDSI(300, 10)).toBe(30);
  });

  it('returns 0 when dailySales is 0', () => {
    expect(calculateDSI(300, 0)).toBe(0);
  });

  it('returns 0 when inventory is 0', () => {
    expect(calculateDSI(0, 10)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateInventoryTurnover', () => {
  it('returns annualSales / averageInventory', () => {
    expect(calculateInventoryTurnover(1_200, 100)).toBe(12);
  });

  it('returns 0 when inventory is 0', () => {
    expect(calculateInventoryTurnover(1_200, 0)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateCashConversionCycle', () => {
  it('computes DSI + DSO - DPO', () => {
    // 30 + 5 - 30 = 5
    expect(calculateCashConversionCycle(30, 5, 30)).toBe(5);
  });

  it('can be negative (good: collect before paying supplier)', () => {
    // 10 + 3 - 45 = -32
    expect(calculateCashConversionCycle(10, 3, 45)).toBe(-32);
  });

  it('returns DSI when DSO and DPO are 0', () => {
    expect(calculateCashConversionCycle(30, 0, 0)).toBe(30);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('computeInventoryWarnings', () => {
  const makePartial = (overrides: Partial<{
    criticalMonths: number[];
    cashRunwayMonths: number;
    daysOfSalesInventory: number;
    cashConversionCycleDays: number;
  }> = {}) => ({
    reorderPoint:              50,
    economicOrderQuantity:     100,
    currentInventoryValue:     10_000_000,
    daysOfSalesInventory:      60,
    inventoryTurnoverAnnual:   6,
    cashConversionCycleDays:   30,
    cashRunwayMonths:          5,
    minimumCashReserveNeeded:  15_000_000,
    cashflowProjection:        [],
    criticalMonths:            [],
    ...overrides,
  });

  it('no warnings when all metrics are within limits', () => {
    const warnings = computeInventoryWarnings(makePartial());
    expect(warnings).toHaveLength(0);
  });

  it('emits CASHFLOW_CRITICAL when criticalMonths is non-empty', () => {
    const warnings = computeInventoryWarnings(makePartial({ criticalMonths: [1, 3] }));
    const codes = warnings.map(w => w.code);
    expect(codes).toContain('CASHFLOW_CRITICAL');
    expect(warnings.find(w => w.code === 'CASHFLOW_CRITICAL')?.level).toBe('critical');
  });

  it('emits LOW_CASH_RUNWAY when cashRunwayMonths < 2', () => {
    const warnings = computeInventoryWarnings(makePartial({ cashRunwayMonths: 1 }));
    const codes = warnings.map(w => w.code);
    expect(codes).toContain('LOW_CASH_RUNWAY');
    expect(warnings.find(w => w.code === 'LOW_CASH_RUNWAY')?.level).toBe('critical');
  });

  it('does NOT emit LOW_CASH_RUNWAY when runway is exactly 2', () => {
    const warnings = computeInventoryWarnings(makePartial({ cashRunwayMonths: 2 }));
    const codes = warnings.map(w => w.code);
    expect(codes).not.toContain('LOW_CASH_RUNWAY');
  });

  it('emits HIGH_DSI when daysOfSalesInventory > 60', () => {
    const warnings = computeInventoryWarnings(makePartial({ daysOfSalesInventory: 90 }));
    const codes = warnings.map(w => w.code);
    expect(codes).toContain('HIGH_DSI');
    expect(warnings.find(w => w.code === 'HIGH_DSI')?.level).toBe('warning');
  });

  it('does NOT emit HIGH_DSI at exactly 60 days', () => {
    const warnings = computeInventoryWarnings(makePartial({ daysOfSalesInventory: 60 }));
    const codes = warnings.map(w => w.code);
    expect(codes).not.toContain('HIGH_DSI');
  });

  it('emits SLOW_CASH_CYCLE when CCC > 45 days', () => {
    const warnings = computeInventoryWarnings(makePartial({ cashConversionCycleDays: 50 }));
    const codes = warnings.map(w => w.code);
    expect(codes).toContain('SLOW_CASH_CYCLE');
  });

  it('does NOT emit SLOW_CASH_CYCLE for negative CCC', () => {
    const warnings = computeInventoryWarnings(makePartial({ cashConversionCycleDays: -10 }));
    const codes = warnings.map(w => w.code);
    expect(codes).not.toContain('SLOW_CASH_CYCLE');
  });

  it('can emit multiple warnings simultaneously', () => {
    const warnings = computeInventoryWarnings(makePartial({
      criticalMonths: [0],
      cashRunwayMonths: 1,
      daysOfSalesInventory: 90,
      cashConversionCycleDays: 60,
    }));
    expect(warnings.length).toBeGreaterThanOrEqual(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('calculateInventoryOutputs', () => {
  it('returns all required output fields', () => {
    const out = calculateInventoryOutputs(BASE_INPUTS, 350_000);
    expect(out.reorderPoint).toBeGreaterThanOrEqual(0);
    expect(out.economicOrderQuantity).toBeGreaterThanOrEqual(0);
    expect(out.daysOfSalesInventory).toBeGreaterThanOrEqual(0);
    expect(out.cashflowProjection).toHaveLength(6);
    expect(out.warnings).toBeDefined();
  });

  it('DSI reflects current inventory vs daily sales', () => {
    const out = calculateInventoryOutputs(BASE_INPUTS, 350_000);
    // dailySales = 100/30 ≈ 3.33; DSI = 200 / 3.33 ≈ 60
    expect(out.daysOfSalesInventory).toBeCloseTo(60, 0);
  });

  it('all-zero inputs return zero outputs without crashing', () => {
    const zeroInputs: InventoryInputs = {
      currentInventoryUnits: 0, startingCashBalance: 0,
      leadTimeDays: 0, safetyStockMultiplier: 1,
      orderingCostPerOrder: 0, holdingCostPerUnitPerMonth: 0,
      supplierUpfrontPct: 0, supplierBalanceDueDays: 0,
      facebookCollectionLagDays: 0, tiktokCollectionLagDays: 0,
      monthlyFixedOperatingCosts: 0, taxReserveRatePct: 0,
      otherMonthlyIncome: 0, monthlySalesForecast: [],
    };
    const out = calculateInventoryOutputs(zeroInputs, 0);
    expect(out.daysOfSalesInventory).toBe(0);
    expect(out.reorderPoint).toBe(0);
    expect(out.cashflowProjection).toHaveLength(6);
  });
});
