/**
 * types/shared.ts
 *
 * Domain-agnostic primitives shared across all calculator modules.
 * No imports from other local files — this is the dependency root.
 */

// ─────────────────────────────────────────────────────────────────────────────
// PRIMITIVE UNIONS
// ─────────────────────────────────────────────────────────────────────────────

export type ProductType = 'full_size' | 'chiet';
export type CostType    = 'fixed' | 'variable';
export type Channel     = 'facebook' | 'tiktok' | 'all';

// ─────────────────────────────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────────────────────────────

/** Navigation identifier for each of the 6 calculator tabs. */
export type TabId =
  | 'pricing'
  | 'unit-economics'
  | 'marketing'
  | 'ltv'
  | 'inventory'
  | 'scenario';

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS (const + type pattern — erasableSyntaxOnly compatible)
// ─────────────────────────────────────────────────────────────────────────────

/** How marketing/ad costs are specified by the user. */
export const AdsMode = {
  /** Fixed ₫ amount per month regardless of revenue. */
  FIXED_VND:       'fixed_vnd',
  /** Percentage of gross revenue (e.g. TikTok commission default). */
  PERCENT_REVENUE: 'pct_revenue',
} as const;
export type AdsMode = typeof AdsMode[keyof typeof AdsMode];

/** Which scenario column is being referenced. */
export const ScenarioType = {
  BASE: 'base' as const,
  A:   'a'    as const,
  B:   'b'    as const,
} as const;
export type ScenarioType = typeof ScenarioType[keyof typeof ScenarioType];

/**
 * Health classification for ratio metrics (LTV:CAC, CM ratio, etc.).
 * Thresholds defined in lib/finance/ltv.ts.
 */
export const HealthStatus = {
  CRITICAL:  'critical',
  WARNING:   'warning',
  HEALTHY:   'healthy',
  EXCELLENT: 'excellent',
} as const;
export type HealthStatus = typeof HealthStatus[keyof typeof HealthStatus];

// ─────────────────────────────────────────────────────────────────────────────
// COST TEMPLATE (shared across Pricing tab + defaults)
// ─────────────────────────────────────────────────────────────────────────────

export interface CostTemplate {
  id: string;
  name: string;
  cost_type: CostType;
  is_percentage: boolean;
  default_value: number;
  channel: Channel;
  is_active: boolean;
  created_at?: string;
  /** Explicit cost driver type. When set, takes precedence over is_percentage. */
  driverType?: CostDriverType;
}

export interface SelectedCost {
  template_id: string;
  name: string;
  is_percentage: boolean;
  value: number;
  cost_type: CostType;
}

// ─────────────────────────────────────────────────────────────────────────────
// COST DRIVER TYPE (explicit, replaces implicit is_percentage + channel flags)
// ─────────────────────────────────────────────────────────────────────────────

export const CostDriverType = {
  FIXED_PER_UNIT:            'fixed_per_unit',
  PERCENT_OF_PURCHASE_PRICE: 'percent_of_purchase_price',
  PERCENT_OF_SELLING_PRICE:  'percent_of_selling_price',
  PERCENT_OF_NET_REVENUE:    'percent_of_net_revenue',
  PERCENT_OF_AD_SPEND:       'percent_of_ad_spend',
  FIXED_PER_MONTH:           'fixed_per_month',
} as const;
export type CostDriverType = typeof CostDriverType[keyof typeof CostDriverType];
