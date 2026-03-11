/**
 * SectionLabel — Styled section header with optional count badge and divider.
 *
 * Used above groups of form fields or metric groups within cards.
 */

import type { ReactNode } from 'react';
import { TOKEN } from './tokens';

export interface SectionLabelProps {
  children?: ReactNode;
  /** Shorthand for children — plain string label */
  label?: string;
  /** Small badge shown to the right (e.g. count, status) */
  badge?: ReactNode;
  /** Render a top border/divider before this section */
  divider?: boolean;
  /** Accent color dot before the label */
  dot?: boolean;
  /** Tab accent color for the dot */
  dotColor?: string;
  className?: string;
}

export function SectionLabel({
  children,
  label,
  badge,
  divider = false,
  dot = false,
  dotColor = TOKEN.accent.primary,
  className = '',
}: SectionLabelProps) {
  const content = children ?? label;
  return (
    <div className={`${divider ? 'border-t pt-4' : ''} ${className}`}
      style={{ borderColor: TOKEN.border.muted }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {dot && (
            <div
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: dotColor }}
            />
          )}
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: TOKEN.text.ghost }}
          >
            {content}
          </span>
        </div>
        {badge && <div className="ml-auto">{badge}</div>}
      </div>
    </div>
  );
}

/** Small count badge used with SectionLabel */
export function CountBadge({ count, color = TOKEN.accent.light }: { count: number; color?: string }) {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{
        background: `${color}1a`,
        color,
        border: `1px solid ${color}33`,
      }}
    >
      {count}
    </span>
  );
}
