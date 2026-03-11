/**
 * WarningsCard — Surfaces business risk alerts for a tab.
 *
 * Unlike InsightsCard (which is informational), WarningsCard items
 * represent actionable problems the founder should address, e.g.
 * "CAC exceeds max viable CAC — you're losing money on every order."
 *
 * Hidden automatically when there are no warnings.
 */

import type { ReactNode } from 'react';
import { TOKEN, CLS } from '../ui/tokens';

// ── Warning item shape ────────────────────────────────────────────────────────

export type WarningSeverity = 'critical' | 'warning' | 'notice';

export interface WarningItem {
  id:       string;
  severity: WarningSeverity;
  title:    string;
  detail?:  string;
}

const SEVERITY_STYLES: Record<WarningSeverity, {
  icon:   string;
  color:  string;
  bg:     string;
  border: string;
  label:  string;
}> = {
  critical: {
    icon:   '🚨',
    color:  TOKEN.status.danger,
    bg:     TOKEN.status.dangerBg,
    border: TOKEN.status.dangerBorder,
    label:  'NGHIÊM TRỌNG',
  },
  warning: {
    icon:   '⚠️',
    color:  TOKEN.status.warning,
    bg:     TOKEN.status.warningBg,
    border: TOKEN.status.warningBorder,
    label:  'CẢNH BÁO',
  },
  notice: {
    icon:   'ℹ️',
    color:  TOKEN.status.info,
    bg:     TOKEN.status.infoBg,
    border: TOKEN.status.infoBorder,
    label:  'LƯU Ý',
  },
};

// ── WarningRow ────────────────────────────────────────────────────────────────

export function WarningRow({ item }: { item: WarningItem }) {
  const s = SEVERITY_STYLES[item.severity];
  return (
    <div
      className="rounded-lg p-3"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
    >
      <div className="flex items-start gap-2">
        <span className="text-base leading-none shrink-0 mt-0.5">{s.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-xs font-bold tracking-wide uppercase"
              style={{ color: s.color }}
            >
              {s.label}
            </span>
            <span className="text-sm font-medium" style={{ color: TOKEN.text.primary }}>
              {item.title}
            </span>
          </div>
          {item.detail && (
            <p className="text-xs mt-1 leading-relaxed" style={{ color: TOKEN.text.muted }}>
              {item.detail}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── WarningsCard ──────────────────────────────────────────────────────────────

export interface WarningsCardProps {
  items:     WarningItem[];
  title?:    string;
  icon?:     ReactNode;
  className?: string;
}

export function WarningsCard({
  items,
  title     = 'Cảnh Báo',
  icon,
  className = '',
}: WarningsCardProps) {
  // Hide entirely when there are no warnings
  if (items.length === 0) return null;

  const criticalCount = items.filter((i) => i.severity === 'critical').length;
  const headerBorder  = criticalCount > 0 ? TOKEN.status.dangerBorder : TOKEN.status.warningBorder;
  const headerBg      = criticalCount > 0 ? TOKEN.status.dangerBg     : TOKEN.status.warningBg;

  return (
    <div
      className={`${CLS.card} ${className}`}
      style={{
        background:  TOKEN.bg.card,
        borderColor: criticalCount > 0 ? TOKEN.status.dangerBorder : TOKEN.status.warningBorder,
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center gap-2"
        style={{ borderColor: headerBorder, background: headerBg }}
      >
        {icon && <span className="text-base leading-none">{icon}</span>}
        <h3 className="text-sm font-semibold" style={{ color: criticalCount > 0 ? TOKEN.status.danger : TOKEN.status.warning }}>
          {title}
        </h3>
        <span
          className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
          style={{
            background: criticalCount > 0 ? TOKEN.status.dangerBorder : TOKEN.status.warningBorder,
            color:      criticalCount > 0 ? TOKEN.status.danger       : TOKEN.status.warning,
          }}
        >
          {items.length}
        </span>
      </div>

      {/* Body */}
      <div className="p-4 space-y-2">
        {items.map((item) => <WarningRow key={item.id} item={item} />)}
      </div>
    </div>
  );
}
