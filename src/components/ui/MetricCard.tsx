/**
 * MetricCard — Single KPI display block.
 *
 * Used inside ResultsCard grids to show one labelled metric value.
 * Supports an optional trend indicator and sub-label.
 *
 * Variants:
 *   default  — neutral white value
 *   accent   — purple value (primary result)
 *   success  — green (positive metric)
 *   warning  — amber (watch metric)
 *   danger   — red (alert metric)
 */

import type { ReactNode } from 'react';
import { TOKEN } from './tokens';

export type MetricVariant = 'default' | 'accent' | 'success' | 'warning' | 'danger';

export interface MetricCardProps {
  label: string;
  value: string | number;
  /** Optional second line under value (e.g. "exact: 1.234.500 ₫") */
  subValue?: string;
  /** Optional supporting context text */
  hint?: string;
  variant?: MetricVariant;
  /** Optional icon or badge rendered at top-right */
  badge?: ReactNode;
  /** Make the value font larger — for hero metrics */
  hero?: boolean;
  className?: string;
}

const VALUE_COLORS: Record<MetricVariant, string> = {
  default: TOKEN.text.primary,
  accent:  TOKEN.text.accent,
  success: TOKEN.text.success,
  warning: TOKEN.text.warning,
  danger:  TOKEN.text.danger,
};

const CARD_BG: Record<MetricVariant, string> = {
  default: TOKEN.bg.card,
  accent:  TOKEN.gradient.heroCard,
  success: TOKEN.status.successBg,
  warning: TOKEN.status.warningBg,
  danger:  TOKEN.status.dangerBg,
};

const CARD_BORDER: Record<MetricVariant, string> = {
  default: TOKEN.border.default,
  accent:  TOKEN.border.accent,
  success: TOKEN.status.successBorder,
  warning: TOKEN.status.warningBorder,
  danger:  TOKEN.status.dangerBorder,
};

export function MetricCard({
  label,
  value,
  subValue,
  hint,
  variant = 'default',
  badge,
  hero = false,
  className = '',
}: MetricCardProps) {
  return (
    <div
      className={`rounded-xl p-4 relative ${className}`}
      style={{
        background:  CARD_BG[variant],
        border:      `1px solid ${CARD_BORDER[variant]}`,
      }}
    >
      {/* Top row: label + optional badge */}
      <div className="flex items-start justify-between mb-2">
        <span
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: TOKEN.text.muted }}
        >
          {label}
        </span>
        {badge && <div className="shrink-0 ml-2">{badge}</div>}
      </div>

      {/* Value */}
      <p
        className={`font-bold leading-none ${hero ? 'text-3xl' : 'text-xl'}`}
        style={{ color: VALUE_COLORS[variant] }}
      >
        {value}
      </p>

      {/* Sub-value */}
      {subValue && (
        <p className="text-xs mt-1" style={{ color: TOKEN.text.muted }}>
          {subValue}
        </p>
      )}

      {/* Hint */}
      {hint && (
        <p className="text-xs mt-2 leading-snug" style={{ color: TOKEN.text.ghost }}>
          {hint}
        </p>
      )}
    </div>
  );
}

/** Compact inline metric (label: value on one line) used in breakdowns */
export function MetricRow({
  label,
  value,
  variant = 'default',
  indent = false,
}: {
  label: string;
  value: string;
  variant?: MetricVariant;
  indent?: boolean;
}) {
  return (
    <div className={`flex justify-between items-center ${indent ? 'pl-3' : ''}`}>
      <span className="text-xs" style={{ color: TOKEN.text.muted }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: VALUE_COLORS[variant] }}>
        {value}
      </span>
    </div>
  );
}
