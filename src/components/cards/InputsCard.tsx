/**
 * InputsCard — Container for all input form sections within a tab.
 *
 * Renders as a dark card with a title row, optional subtitle, and
 * a scrollable body for form fields.
 */

import type { ReactNode } from 'react';
import { TOKEN, CLS } from '../ui/tokens';

export interface InputsCardProps {
  title:     string;
  subtitle?: string;
  /** Optional icon placed before the title */
  icon?:     ReactNode;
  children:  ReactNode;
  className?: string;
}

export function InputsCard({ title, subtitle, icon, children, className = '' }: InputsCardProps) {
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
      <div className="p-4 space-y-4">
        {children}
      </div>
    </div>
  );
}
