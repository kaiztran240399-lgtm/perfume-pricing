/**
 * DeltaBadge — Shows change vs baseline (Δ₫ and/or Δ%).
 *
 * Positive Δ → green.  Negative Δ → red.  Zero → muted.
 * Used in Scenario tab comparison columns.
 */

import { TOKEN } from './tokens';

export interface DeltaBadgeProps {
  /** Absolute delta in VND (can be negative) */
  deltaVnd?: number;
  /** Relative delta as a percentage (can be negative) */
  deltaPct?: number;
  /** When true, higher value = worse (e.g. costs, return rate) */
  invertPolarity?: boolean;
  /** Display mode */
  mode?: 'vnd' | 'pct' | 'both';
  size?: 'sm' | 'md';
}

function formatDeltaVnd(v: number): string {
  const abs = Math.abs(Math.round(v));
  const formatted = new Intl.NumberFormat('vi-VN').format(abs);
  return `${v >= 0 ? '+' : '−'}${formatted}₫`;
}

function formatDeltaPct(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

export function DeltaBadge({
  deltaVnd,
  deltaPct,
  invertPolarity = false,
  mode = 'both',
  size = 'sm',
}: DeltaBadgeProps) {
  const primary = deltaVnd ?? deltaPct ?? 0;
  const isPositive = invertPolarity ? primary < 0 : primary > 0;
  const isNegative = invertPolarity ? primary > 0 : primary < 0;

  const color  = isPositive ? TOKEN.text.success  : isNegative ? TOKEN.text.danger : TOKEN.text.ghost;
  const bg     = isPositive ? TOKEN.status.successBg : isNegative ? TOKEN.status.dangerBg : 'transparent';
  const border = isPositive ? TOKEN.status.successBorder : isNegative ? TOKEN.status.dangerBorder : TOKEN.border.muted;

  const arrow  = isPositive ? '↑' : isNegative ? '↓' : '→';
  const padCls = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1';
  const textCls = size === 'sm' ? 'text-xs' : 'text-sm';

  const parts: string[] = [];
  if ((mode === 'vnd' || mode === 'both') && deltaVnd !== undefined) {
    parts.push(formatDeltaVnd(deltaVnd));
  }
  if ((mode === 'pct' || mode === 'both') && deltaPct !== undefined) {
    parts.push(formatDeltaPct(deltaPct));
  }

  if (parts.length === 0) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md ${padCls} ${textCls} font-medium`}
      style={{ color, background: bg, border: `1px solid ${border}` }}
    >
      <span>{arrow}</span>
      <span>{parts.join(' / ')}</span>
    </span>
  );
}

/** Compact text-only delta (no pill background) for table cells */
export function DeltaText({
  value,
  invertPolarity = false,
  format = 'pct',
}: {
  value: number;
  invertPolarity?: boolean;
  format?: 'pct' | 'vnd';
}) {
  const isPositive = invertPolarity ? value < 0 : value > 0;
  const isNegative = invertPolarity ? value > 0 : value < 0;
  const color = isPositive ? TOKEN.text.success : isNegative ? TOKEN.text.danger : TOKEN.text.ghost;
  const text  = format === 'pct' ? formatDeltaPct(value) : formatDeltaVnd(value);

  return (
    <span className="text-xs font-medium" style={{ color }}>
      {text}
    </span>
  );
}
