/**
 * types/validation.ts
 *
 * Cross-domain financial validation result types.
 *
 * Unlike CalcWarning (per-domain, emitted by lib/finance/*.ts),
 * ValidationResult is produced by the cross-domain engine in
 * lib/finance/validation.ts and can reference data from multiple tabs.
 */

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN TAG
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Which tab / calculator domain a validation result belongs to.
 * Used by tab components to filter relevant results.
 */
export const ValidationDomain = {
  UNIT_ECONOMICS: 'unit-economics',
  MARKETING:      'marketing',
  LTV:            'ltv',
  INVENTORY:      'inventory',
} as const;
export type ValidationDomain = typeof ValidationDomain[keyof typeof ValidationDomain];

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION RESULT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A cross-domain financial health check result.
 *
 * severity tiers:
 *   'danger'  — action required; business is losing money or at critical risk
 *   'caution' — monitor closely; metrics are below healthy thresholds
 *   'healthy' — metric is within a good range; positive signal
 */
export interface ValidationResult {
  /** Unique, stable identifier for this rule (machine-readable). */
  id:             string;
  severity:       'healthy' | 'caution' | 'danger';
  /** Which tab this result should be displayed on. */
  domain:         ValidationDomain;
  /** Vietnamese human-readable finding. */
  message:        string;
  /** Vietnamese actionable recommendation for the founder. */
  recommendation: string;
}
