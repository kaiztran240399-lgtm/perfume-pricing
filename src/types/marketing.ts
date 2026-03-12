/**
 * types/marketing.ts
 *
 * Input/output types for Tab 3 — Marketing Model.
 */

import type { AdsMode, CalcWarning } from './shared';

// ─────────────────────────────────────────────────────────────────────────────
// CHANNEL SUB-TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Revenue + orders projected at a given ad budget multiplier. */
export interface BudgetScenario {
  /** e.g. 1, 1.5, 2 → 100% / 150% / 200% of base budget. */
  multiplier: number;
  totalAdSpend: number;         // ₫
  estimatedOrders: number;
  estimatedRevenue: number;     // ₫
  projectedRoas: number;
}

/** Per-channel computed marketing metrics. */
export interface ChannelMetrics {
  estimatedOrders: number;
  grossRevenue: number;         // ₫
  netRevenue: number;           // ₫ after return + platform commission
  roas: number;
  cac: number;                  // ₫ cost to acquire one customer
  costPerOrder: number;         // ₫
}

// ─────────────────────────────────────────────────────────────────────────────
// INPUTS
// ─────────────────────────────────────────────────────────────────────────────

export interface FacebookChannelInputs {
  monthlyBudget: number;            // ₫
  /** ₫ cost per click — or estimated from benchmark. */
  cpc: number;
  /** % of clicks that convert to paid orders. */
  landingPageCvrPct: number;
  /** AOV for this channel. Falls back to shared AOV if 0. */
  averageOrderValue: number;        // ₫
  adsMode: AdsMode;
}

export interface TikTokChannelInputs {
  monthlyAdBudget: number;          // ₫
  /** ₫ monthly GMV from organic TikTok traffic (no ads). */
  monthlyOrganicGmv: number;
  /** ₫ platform voucher budget funded by seller. */
  platformVoucherBudget: number;
  /** % TikTok Shop commission (typically 3–5%). */
  commissionRatePct: number;
  /** % product page visitors who complete purchase. */
  productPageCvrPct: number;
  averageOrderValue: number;        // ₫
  adsMode: AdsMode;
}

export interface MarketingInputs {
  facebook: FacebookChannelInputs;
  tiktok: TikTokChannelInputs;

  // ── Shared AOV fallback ───────────────────────────────────────────────────
  /** Used when channel-specific AOV is 0. Auto-linked from PricingOutputs. */
  sharedAverageOrderValue: number;  // ₫

  // ── Supporting marketing costs ───────────────────────────────────────────
  contentCostPerMonth: number;      // ₫ photography, video, copywriting
  kolCostPerMonth: number;          // ₫ influencer / KOL fees
  marketingStaffCostPerMonth: number; // ₫ salaries allocated to marketing

  // ── Shared assumptions ───────────────────────────────────────────────────
  /** Linked from UnitEconomicsInputs. */
  returnRatePct: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUTS
// ─────────────────────────────────────────────────────────────────────────────

export interface MarketingOutputs {
  facebook: ChannelMetrics;
  tiktok: ChannelMetrics;

  blended: {
    totalOrders: number;
    totalGrossRevenue: number;      // ₫
    totalNetRevenue: number;        // ₫
    totalAdSpend: number;           // ₫
    /** Includes ad spend + content + KOL + staff. */
    totalMarketingCost: number;     // ₫
    blendedRoas: number;
    blendedCac: number;             // ₫
    /** Revenue / totalMarketingCost — broader than ROAS. */
    mer: number;
    revenueShareFacebookPct: number;
    revenueShareTiktokPct: number;
  };

  /** Budget projections at 1×, 1.5×, 2× of current spend. */
  budgetScenarios: BudgetScenario[];

  /**
   * Minimum monthly ad budget required to hit a specific revenue target.
   * Stored as a lookup table (target ₫ → required budget ₫).
   */
  revenueTargetBudgetMap: Array<{ targetRevenue: number; requiredBudget: number }>;

  // ── Domain warnings ──────────────────────────────────────────────────────
  warnings: CalcWarning[];
}
