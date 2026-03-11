/**
 * FormField — Labelled input wrapper with optional hint and error state.
 *
 * Wraps any input child (text, number, select, PriceInput, etc.) with a
 * consistent label, hint text, and error message pattern.
 */

import type { ReactNode } from 'react';
import { TOKEN } from './tokens';

export interface FormFieldProps {
  label: string;
  children: ReactNode;
  /** Helper text shown below the input */
  hint?: string;
  /** Validation error — turns hint red and adds error styling */
  error?: string;
  /** Required field indicator */
  required?: boolean;
  /** Tooltip content (string or node) — shown as ⓘ next to label */
  tooltip?: ReactNode;
  /** Optional unit label on the right side of the label row */
  unit?: string;
  className?: string;
}

export function FormField({
  label,
  children,
  hint,
  error,
  required = false,
  tooltip,
  unit,
  className = '',
}: FormFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Label row */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5">
          <span
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: TOKEN.text.muted }}
          >
            {label}
            {required && (
              <span className="ml-0.5" style={{ color: TOKEN.text.danger }}>*</span>
            )}
          </span>
          {tooltip && (
            <span
              className="text-xs cursor-help"
              style={{ color: TOKEN.text.ghost }}
              title={typeof tooltip === 'string' ? tooltip : undefined}
            >
              ⓘ
            </span>
          )}
        </label>
        {unit && (
          <span className="text-xs" style={{ color: TOKEN.text.ghost }}>{unit}</span>
        )}
      </div>

      {/* Input */}
      <div>{children}</div>

      {/* Hint / Error */}
      {(hint || error) && (
        <p
          className="text-xs leading-snug"
          style={{ color: error ? TOKEN.text.danger : TOKEN.text.ghost }}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

// ── Shared input style helpers ──────────────────────────────────────────────

/** Base className for all text/number inputs in this design system. */
export const inputCls =
  'w-full px-3 py-2 rounded-lg text-sm border focus:outline-none transition-colors text-white placeholder-zinc-600';

/** Base inline style for inputs (apply as style prop). */
export const inputStyle = {
  background:   TOKEN.bg.input,
  borderColor:  TOKEN.border.muted,
};

/** onFocus handler — highlights border with accent color. */
export function onFocusAccent(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = TOKEN.accent.primary;
}

/** onBlur handler — restores default border. */
export function onBlurDefault(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = TOKEN.border.muted;
}
