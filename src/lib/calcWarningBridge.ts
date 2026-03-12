/**
 * lib/calcWarningBridge.ts
 *
 * Adapters between the finance-layer types (CalcWarning, ValidationResult)
 * and the UI-layer types (WarningItem, InsightItem).
 *
 * Why this exists:
 *   Finance modules produce CalcWarning[] (pure, no imports from UI).
 *   Cross-domain engine produces ValidationResult[].
 *   Tab components display WarningItem[] via WarningsCard and
 *   InsightItem[] via InsightsCard.
 *
 *   This file is the only place that knows about both layers.
 */

import type { CalcWarning }       from '../types/shared';
import type { ValidationResult }  from '../types/validation';
import type { WarningItem }       from '../components/cards/WarningsCard';
import type { InsightItem }       from '../components/cards/InsightsCard';

// ─────────────────────────────────────────────────────────────────────────────
// CalcWarning → WarningItem
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a single CalcWarning (finance layer) to a WarningItem (UI layer).
 *
 * Mapping:
 *   level 'critical' → severity 'critical'
 *   level 'warning'  → severity 'warning'
 *   level 'info'     → severity 'notice'
 */
export function calcWarningToWarningItem(w: CalcWarning): WarningItem {
  return {
    id:       w.code,
    severity: w.level === 'critical' ? 'critical' : w.level === 'warning' ? 'warning' : 'notice',
    title:    w.message,
  };
}

/**
 * Convert an array of CalcWarning to WarningItem[].
 * Preserves order; empty input returns empty array.
 */
export function calcWarningsToWarningItems(warnings: CalcWarning[]): WarningItem[] {
  return warnings.map(calcWarningToWarningItem);
}

// ─────────────────────────────────────────────────────────────────────────────
// ValidationResult → WarningItem  (danger + caution only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a ValidationResult to a WarningItem.
 * Returns null for 'healthy' results (shown in InsightsCard instead).
 *
 * Mapping:
 *   severity 'danger'  → severity 'critical'
 *   severity 'caution' → severity 'warning'
 *   severity 'healthy' → null (skip)
 */
export function validationToWarningItem(v: ValidationResult): WarningItem | null {
  if (v.severity === 'healthy') return null;
  return {
    id:       v.id,
    severity: v.severity === 'danger' ? 'critical' : 'warning',
    title:    v.message,
    detail:   v.recommendation,
  };
}

/**
 * Filter and convert ValidationResult[] to WarningItem[] for a specific domain.
 * Skips 'healthy' results.
 */
export function domainValidationToWarningItems(
  validation: ValidationResult[],
  domain: ValidationResult['domain'],
): WarningItem[] {
  return validation
    .filter((v) => v.domain === domain)
    .map(validationToWarningItem)
    .filter((w): w is WarningItem => w !== null);
}

// ─────────────────────────────────────────────────────────────────────────────
// ValidationResult → InsightItem  (healthy only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a 'healthy' ValidationResult to an InsightItem (success level).
 * Returns null for 'danger' or 'caution' results.
 */
export function validationToInsightItem(v: ValidationResult): InsightItem | null {
  if (v.severity !== 'healthy') return null;
  return {
    id:    v.id,
    level: 'success',
    text:  v.message,
  };
}

/**
 * Filter and convert ValidationResult[] to healthy InsightItem[] for a domain.
 */
export function domainValidationToInsightItems(
  validation: ValidationResult[],
  domain: ValidationResult['domain'],
): InsightItem[] {
  return validation
    .filter((v) => v.domain === domain)
    .map(validationToInsightItem)
    .filter((i): i is InsightItem => i !== null);
}
