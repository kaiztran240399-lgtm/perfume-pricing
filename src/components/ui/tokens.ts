/**
 * tokens.ts — Design system tokens for the dark luxury UI.
 *
 * Single source of truth for all colors, spacing, and shadow values.
 * Use these instead of raw hex strings in components.
 */

export const TOKEN = {
  // ── Backgrounds ────────────────────────────────────────────────────────────
  bg: {
    app:     '#080808',   // page background
    card:    '#111111',   // card surface
    input:   '#1a1a1a',   // form inputs
    hover:   '#161616',   // interactive hover
    overlay: 'rgba(0,0,0,0.85)',
  },

  // ── Borders ────────────────────────────────────────────────────────────────
  border: {
    default: '#1f1f1f',
    muted:   '#2a2a2a',
    strong:  '#3f3f46',
    accent:  'rgba(124,58,237,0.45)',
    success: 'rgba(74,222,128,0.3)',
    warning: 'rgba(251,191,36,0.3)',
    danger:  'rgba(248,113,113,0.3)',
  },

  // ── Text ───────────────────────────────────────────────────────────────────
  text: {
    primary:   '#f0f0f0',
    secondary: '#a1a1aa',
    muted:     '#71717a',
    ghost:     '#3f3f46',
    accent:    '#a78bfa',
    success:   '#4ade80',
    warning:   '#fbbf24',
    danger:    '#f87171',
    info:      '#60a5fa',
  },

  // ── Accent (purple brand) ──────────────────────────────────────────────────
  accent: {
    primary: '#7c3aed',
    light:   '#a78bfa',
    glow:    'rgba(124,58,237,0.15)',
    glow2:   'rgba(124,58,237,0.25)',
    border:  'rgba(124,58,237,0.45)',
  },

  // ── Status ─────────────────────────────────────────────────────────────────
  status: {
    success:        '#4ade80',
    successBg:      'rgba(74,222,128,0.08)',
    successBorder:  'rgba(74,222,128,0.25)',
    warning:        '#fbbf24',
    warningBg:      'rgba(251,191,36,0.08)',
    warningBorder:  'rgba(251,191,36,0.25)',
    danger:         '#f87171',
    dangerBg:       'rgba(248,113,113,0.08)',
    dangerBorder:   'rgba(248,113,113,0.25)',
    info:           '#60a5fa',
    infoBg:         'rgba(96,165,250,0.08)',
    infoBorder:     'rgba(96,165,250,0.25)',
  },

  // ── Gradients ──────────────────────────────────────────────────────────────
  gradient: {
    heroCard:   'linear-gradient(135deg, rgba(124,58,237,0.18), rgba(168,85,247,0.08))',
    accentLine: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
    subtle:     'linear-gradient(180deg, rgba(255,255,255,0.03), transparent)',
  },

  // ── Radius ─────────────────────────────────────────────────────────────────
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
  },

  // ── Tab icon colors (one per tab) ──────────────────────────────────────────
  tabs: {
    pricing:       '#a78bfa',  // purple
    unitEconomics: '#60a5fa',  // blue
    marketing:     '#f472b6',  // pink
    ltv:           '#4ade80',  // green
    inventory:     '#fbbf24',  // amber
    scenarios:     '#fb923c',  // orange
  },
} as const;

// ── Shared className fragments (Tailwind) ─────────────────────────────────────
export const CLS = {
  card:      'rounded-xl border',
  input:     'w-full rounded-lg border text-sm focus:outline-none transition-colors',
  label:     'block text-xs font-medium uppercase tracking-wide',
  sectionHd: 'text-xs font-semibold uppercase tracking-widest',
} as const;
