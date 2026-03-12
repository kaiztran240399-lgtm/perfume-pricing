/**
 * HealthBadge — Visual health status indicator for ratio metrics.
 *
 * Maps HealthStatus enum → color + icon + label.
 * Used for LTV:CAC, CM%, and cashflow critical months.
 */

import { HealthStatus } from '../../types';
import { TOKEN } from './tokens';

interface HealthConfig {
  label:   string;
  emoji:   string;
  color:   string;
  bg:      string;
  border:  string;
}

const HEALTH_CONFIG: Record<HealthStatus, HealthConfig> = {
  [HealthStatus.CRITICAL]: {
    label:  'Nguy hiểm',
    emoji:  '🔴',
    color:  TOKEN.text.danger,
    bg:     TOKEN.status.dangerBg,
    border: TOKEN.status.dangerBorder,
  },
  [HealthStatus.WARNING]: {
    label:  'Cần theo dõi',
    emoji:  '🟡',
    color:  TOKEN.text.warning,
    bg:     TOKEN.status.warningBg,
    border: TOKEN.status.warningBorder,
  },
  [HealthStatus.HEALTHY]: {
    label:  'Lành mạnh',
    emoji:  '🟢',
    color:  TOKEN.text.success,
    bg:     TOKEN.status.successBg,
    border: TOKEN.status.successBorder,
  },
  [HealthStatus.EXCELLENT]: {
    label:  'Xuất sắc',
    emoji:  '🚀',
    color:  TOKEN.text.accent,
    bg:     TOKEN.accent.glow,
    border: TOKEN.accent.border,
  },
};

export interface HealthBadgeProps {
  status: HealthStatus;
  /** Show full label alongside emoji (default: true) */
  showLabel?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
}

export function HealthBadge({ status, showLabel = true, size = 'md' }: HealthBadgeProps) {
  const cfg = HEALTH_CONFIG[status];
  const padCls = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1';
  const textCls = size === 'sm' ? 'text-xs' : 'text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${padCls} ${textCls}`}
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
    >
      <span>{cfg.emoji}</span>
      {showLabel && <span>{cfg.label}</span>}
    </span>
  );
}

/** Thin horizontal bar version for compact displays */
export function HealthBar({ status }: { status: HealthStatus }) {
  const cfg = HEALTH_CONFIG[status];
  const widths: Record<HealthStatus, string> = {
    [HealthStatus.CRITICAL]:  'w-1/4',
    [HealthStatus.WARNING]:   'w-1/2',
    [HealthStatus.HEALTHY]:   'w-3/4',
    [HealthStatus.EXCELLENT]: 'w-full',
  };

  return (
    <div className="w-full h-1.5 rounded-full" style={{ background: TOKEN.bg.input }}>
      <div
        className={`h-full rounded-full transition-all ${widths[status]}`}
        style={{ background: cfg.color }}
      />
    </div>
  );
}
