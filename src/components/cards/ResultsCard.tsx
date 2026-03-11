/**
 * ResultsCard — Container for computed outputs within a tab.
 *
 * States:
 *   normal   — shows children
 *   loading  — shows SkeletonMetricGrid
 *   empty    — shows AwaitingInput placeholder
 *
 * Wraps children in a styled card consistent with InputsCard.
 */

import type { ReactNode } from 'react';
import { AwaitingInput, SkeletonMetricGrid } from '../ui/EmptyState';
import { TOKEN, CLS } from '../ui/tokens';

export interface ResultsCardProps {
  title:     string;
  subtitle?: string;
  icon?:     ReactNode;
  children?: ReactNode;
  /** When true, show skeleton shimmer instead of content */
  loading?:  boolean;
  /** When true, show AwaitingInput placeholder */
  empty?:    boolean;
  /** Override the default awaiting message */
  emptyMessage?: string;
  className?: string;
}

export function ResultsCard({
  title,
  subtitle,
  icon,
  children,
  loading   = false,
  empty     = false,
  emptyMessage,
  className = '',
}: ResultsCardProps) {
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
        className="px-4 py-3 border-b flex items-start gap-2"
        style={{ borderColor: TOKEN.border.default }}
      >
        {icon && (
          <span className="text-lg leading-none mt-0.5 shrink-0">{icon}</span>
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold" style={{ color: TOKEN.text.primary }}>
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs mt-0.5" style={{ color: TOKEN.text.ghost }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {loading ? (
          <SkeletonMetricGrid />
        ) : empty ? (
          <AwaitingInput message={emptyMessage} />
        ) : (
          children
        )}
      </div>
    </div>
  );
}
