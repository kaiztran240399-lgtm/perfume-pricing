/**
 * InsightsCard — Surfaces key analytical takeaways for a tab.
 *
 * Used to highlight business insights derived from the computed outputs,
 * e.g. "Your real margin after returns and ads is 18%, not 30%."
 *
 * Supports a list of `InsightItem` props for structured rendering,
 * OR freeform children for custom layouts.
 */

import type { ReactNode } from 'react';
import { TOKEN, CLS } from '../ui/tokens';

// ── Insight item shape ────────────────────────────────────────────────────────

export type InsightLevel = 'info' | 'success' | 'warning' | 'tip';

export interface InsightItem {
  id:      string;
  level:   InsightLevel;
  text:    ReactNode;
}

const LEVEL_STYLES: Record<InsightLevel, { icon: string; color: string; bg: string; border: string }> = {
  info:    { icon: 'ℹ️',  color: TOKEN.status.info,    bg: TOKEN.status.infoBg,    border: TOKEN.status.infoBorder    },
  success: { icon: '✅',  color: TOKEN.status.success,  bg: TOKEN.status.successBg, border: TOKEN.status.successBorder },
  warning: { icon: '⚠️',  color: TOKEN.status.warning,  bg: TOKEN.status.warningBg, border: TOKEN.status.warningBorder },
  tip:     { icon: '💡',  color: TOKEN.text.accent,      bg: TOKEN.accent.glow,      border: TOKEN.accent.border        },
};

// ── InsightRow ────────────────────────────────────────────────────────────────

export function InsightRow({ item }: { item: InsightItem }) {
  const s = LEVEL_STYLES[item.level];
  return (
    <div
      className="flex gap-2.5 rounded-lg p-3 text-sm"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
    >
      <span className="text-base leading-none shrink-0 mt-0.5">{s.icon}</span>
      <span style={{ color: s.color }}>{item.text}</span>
    </div>
  );
}

// ── InsightsCard ──────────────────────────────────────────────────────────────

export interface InsightsCardProps {
  title?:    string;
  icon?:     ReactNode;
  items?:    InsightItem[];
  children?: ReactNode;
  hidden?:   boolean;
  className?: string;
}

export function InsightsCard({
  title     = 'Nhận Xét',
  icon,
  items,
  children,
  hidden    = false,
  className = '',
}: InsightsCardProps) {
  if (hidden || (items !== undefined && items.length === 0 && !children)) return null;

  return (
    <div
      className={`${CLS.card} ${className}`}
      style={{
        background:  TOKEN.bg.card,
        borderColor: TOKEN.border.default,
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center gap-2"
        style={{ borderColor: TOKEN.border.default }}
      >
        {icon && <span className="text-base leading-none">{icon}</span>}
        <h3 className="text-sm font-semibold" style={{ color: TOKEN.text.primary }}>
          {title}
        </h3>
        {items && (
          <span
            className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ background: TOKEN.accent.glow, color: TOKEN.text.accent }}
          >
            {items.length}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-2">
        {items?.map((item) => <InsightRow key={item.id} item={item} />)}
        {children}
      </div>
    </div>
  );
}
