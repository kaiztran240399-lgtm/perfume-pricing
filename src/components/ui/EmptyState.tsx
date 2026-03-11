/**
 * EmptyState — Placeholder shown in ResultsCard before inputs are provided.
 *
 * Variants:
 *   empty   — "Enter data to see results"
 *   loading — Skeleton shimmer
 *   error   — Error message with optional retry
 */

import type { ReactNode } from 'react';
import { TOKEN } from './tokens';

// ── Loading skeleton ──────────────────────────────────────────────────────────

export function SkeletonBlock({ height = 'h-8', className = '' }: { height?: string; className?: string }) {
  return (
    <div
      className={`rounded-lg animate-pulse ${height} ${className}`}
      style={{ background: TOKEN.bg.input }}
    />
  );
}

export function SkeletonMetricGrid() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <SkeletonBlock key={i} height="h-20" className="rounded-xl" />
        ))}
      </div>
      <SkeletonBlock height="h-32" className="rounded-xl" />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && (
        <div className="mb-4 opacity-30" style={{ color: TOKEN.text.ghost }}>
          {icon}
        </div>
      )}
      <p className="text-sm font-medium mb-1" style={{ color: TOKEN.text.muted }}>
        {title}
      </p>
      {description && (
        <p className="text-xs max-w-48 leading-relaxed" style={{ color: TOKEN.text.ghost }}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Quick shorthand for "awaiting input" states */
export function AwaitingInput({ message = 'Nhập dữ liệu để xem kết quả' }: { message?: string }) {
  return (
    <EmptyState
      icon={<span className="text-4xl">📊</span>}
      title={message}
      description="Điền thông tin ở phần bên trái để xem phân tích chi tiết."
    />
  );
}
