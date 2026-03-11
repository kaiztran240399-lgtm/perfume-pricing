/**
 * Tests for lib/finance/shared.ts
 * Pure math + formatting helpers — no side effects, deterministic.
 */

import { describe, it, expect } from 'vitest';
import {
  safeDivide,
  clamp,
  roundUpToNearest,
  roundToNearest,
  roundSellingPrice,
  toDecimal,
  toPct,
  applyPct,
  pctOf,
  formatVND,
  formatNumber,
  formatPct,
  nonNegative,
  clampPct,
} from '../shared';

// ─────────────────────────────────────────────────────────────────────────────
describe('safeDivide', () => {
  it('returns numerator/denominator for normal inputs', () => {
    expect(safeDivide(10, 4)).toBeCloseTo(2.5);
  });
  it('returns fallback (0) when denominator is 0', () => {
    expect(safeDivide(100, 0)).toBe(0);
  });
  it('accepts custom fallback', () => {
    expect(safeDivide(1, 0, -1)).toBe(-1);
  });
  it('returns fallback when denominator is Infinity', () => {
    expect(safeDivide(1, Infinity)).toBe(0);
  });
  it('returns 0 for 0/0', () => {
    expect(safeDivide(0, 0)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('clamp', () => {
  it('clamps below minimum', () => {
    expect(clamp(-5, 0, 100)).toBe(0);
  });
  it('clamps above maximum', () => {
    expect(clamp(150, 0, 100)).toBe(100);
  });
  it('passes through in-range value', () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });
  it('handles inverted bounds gracefully', () => {
    // min=100, max=0 → lo=0, hi=100
    expect(clamp(50, 100, 0)).toBe(50);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('roundUpToNearest', () => {
  it('rounds up to nearest 10_000', () => {
    expect(roundUpToNearest(1_231_000, 10_000)).toBe(1_240_000);
  });
  it('does not change an already-aligned value', () => {
    expect(roundUpToNearest(1_230_000, 10_000)).toBe(1_230_000);
  });
  it('handles nearest <= 0 by returning original', () => {
    expect(roundUpToNearest(500, 0)).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('roundToNearest', () => {
  it('rounds down when remainder < half', () => {
    expect(roundToNearest(1_234_000, 10_000)).toBe(1_230_000);
  });
  it('rounds up when remainder >= half', () => {
    expect(roundToNearest(1_235_000, 10_000)).toBe(1_240_000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('roundSellingPrice', () => {
  it('returns 0 for zero or negative input', () => {
    expect(roundSellingPrice(0)).toBe(0);
    expect(roundSellingPrice(-100)).toBe(0);
  });
  it('rounds < 100k to nearest 1_000', () => {
    expect(roundSellingPrice(54_500)).toBe(55_000);
    expect(roundSellingPrice(50_000)).toBe(50_000);
  });
  it('rounds 100k–1M to nearest 5_000', () => {
    expect(roundSellingPrice(102_000)).toBe(105_000);
    expect(roundSellingPrice(200_000)).toBe(200_000);
  });
  it('rounds > 1M to nearest 10_000', () => {
    expect(roundSellingPrice(1_003_000)).toBe(1_010_000);
    expect(roundSellingPrice(2_000_000)).toBe(2_000_000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('percentage helpers', () => {
  it('toDecimal converts pct to decimal', () => {
    expect(toDecimal(30)).toBeCloseTo(0.3);
  });
  it('toPct converts decimal to pct', () => {
    expect(toPct(0.3)).toBeCloseTo(30);
  });
  it('applyPct applies percentage to base', () => {
    expect(applyPct(1_000_000, 10)).toBeCloseTo(100_000);
  });
  it('pctOf computes percentage of whole', () => {
    expect(pctOf(300, 1000)).toBeCloseTo(30);
  });
  it('pctOf returns 0 when whole is 0', () => {
    expect(pctOf(100, 0)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('formatVND', () => {
  it('formats with ₫ suffix (vi-VN locale)', () => {
    const result = formatVND(1_500_000);
    expect(result).toContain('1');
    expect(result).toContain('500');
    expect(result).toContain('₫');
  });
});

describe('formatNumber', () => {
  it('formats with vi-VN thousand separators', () => {
    const result = formatNumber(1_500_000);
    expect(result).toContain('1');
    expect(result).toContain('500');
    // Should NOT contain ₫
    expect(result).not.toContain('₫');
  });
});

describe('formatPct', () => {
  it('appends % and rounds to decimals', () => {
    expect(formatPct(30.333, 1)).toBe('30.3%');
    expect(formatPct(100, 0)).toBe('100%');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('guard helpers', () => {
  describe('nonNegative', () => {
    it('passes positive value through', () => {
      expect(nonNegative(5)).toBe(5);
    });
    it('returns 0 for negative', () => {
      expect(nonNegative(-1)).toBe(0);
    });
    it('returns 0 for NaN', () => {
      expect(nonNegative(NaN)).toBe(0);
    });
    it('returns 0 for Infinity', () => {
      expect(nonNegative(Infinity)).toBe(0);
    });
  });

  describe('clampPct', () => {
    it('clamps 0–100', () => {
      expect(clampPct(50)).toBe(50);
      expect(clampPct(-10)).toBe(0);
      expect(clampPct(110)).toBe(100);
    });
  });
});
