/**
 * CostLinesSection — Interactive cost selection grid for the Pricing tab.
 *
 * Renders fixed and variable costs in a 2-column grid of clickable cards.
 * Selected cards are highlighted with an accent border.
 * Each card has an editable value input below the label.
 *
 * Also renders an ad-hoc cost section for free-form entries.
 */

import { useState } from 'react';
import type { CostTemplate } from '../../../types';
import type { AdHocCostEntry } from '../../../types';
import { SectionLabel } from '../../ui/SectionLabel';
import { TOKEN } from '../../ui/tokens';
import { inputCls, inputStyle, onFocusAccent, onBlurDefault } from '../../ui/FormField';
import PriceInput from '../../PriceInput';

// ── Single cost card ──────────────────────────────────────────────────────────

interface CostCardProps {
  template:     CostTemplate;
  selected:     boolean;
  value:        number;   // custom value (or 0 to use default)
  onToggle:     () => void;
  onValueChange: (v: number) => void;
}

function CostCard({ template, selected, value, onToggle, onValueChange }: CostCardProps) {
  const displayValue = value !== 0 ? value : template.default_value;

  return (
    <div
      onClick={onToggle}
      className="rounded-xl p-2.5 cursor-pointer transition-all select-none"
      style={{
        background: selected ? 'rgba(124,58,237,0.12)' : TOKEN.bg.input,
        border:     `1px solid ${selected ? TOKEN.border.accent : TOKEN.border.muted}`,
      }}
    >
      {/* Top: checkbox + name */}
      <div className="flex items-start gap-2 mb-2">
        <div
          className="w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 mt-0.5"
          style={{
            background:   selected ? TOKEN.accent.primary : 'transparent',
            borderColor:  selected ? TOKEN.accent.primary : TOKEN.border.strong,
          }}
        >
          {selected && (
            <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
              <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <span
          className="text-xs leading-snug"
          style={{ color: selected ? TOKEN.text.primary : TOKEN.text.muted }}
        >
          {template.name}
        </span>
      </div>

      {/* Bottom: value input */}
      <div onClick={(e) => e.stopPropagation()} className="ml-5">
        {template.is_percentage ? (
          <div className="relative">
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={displayValue}
              onChange={(e) => onValueChange(parseFloat(e.target.value) || 0)}
              onFocus={onFocusAccent}
              onBlur={onBlurDefault}
              className={`${inputCls} pr-6 text-xs py-1`}
              style={{ ...inputStyle, fontSize: '11px' }}
            />
            <span
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
              style={{ color: TOKEN.text.ghost }}
            >
              %
            </span>
          </div>
        ) : (
          <PriceInput
            value={String(displayValue || '')}
            onChange={(raw) => onValueChange(parseInt(raw || '0', 10))}
            placeholder="0"
            className={`${inputCls} text-xs py-1`}
            style={inputStyle}
            onFocus={onFocusAccent}
            onBlur={onBlurDefault}
          />
        )}
      </div>
    </div>
  );
}

// ── Ad-hoc cost row ───────────────────────────────────────────────────────────

interface AdHocRowProps {
  entry:    AdHocCostEntry;
  onChange: (patch: Partial<AdHocCostEntry>) => void;
  onRemove: () => void;
}

function AdHocRow({ entry, onChange, onRemove }: AdHocRowProps) {
  return (
    <div
      className="rounded-lg p-2.5 flex gap-2 items-start"
      style={{ background: TOKEN.bg.input, border: `1px solid ${TOKEN.border.muted}` }}
    >
      {/* Name */}
      <input
        type="text"
        value={entry.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="Tên chi phí"
        className={`${inputCls} text-xs py-1 flex-1`}
        style={inputStyle}
        onFocus={onFocusAccent}
        onBlur={onBlurDefault}
      />

      {/* Type toggle */}
      <button
        onClick={() => onChange({ isPercentage: !entry.isPercentage })}
        className="shrink-0 px-2 py-1 rounded text-xs font-medium transition-colors"
        style={{
          background: entry.isPercentage ? TOKEN.accent.glow : TOKEN.bg.hover,
          color:      entry.isPercentage ? TOKEN.text.accent  : TOKEN.text.muted,
          border:     `1px solid ${entry.isPercentage ? TOKEN.border.accent : TOKEN.border.muted}`,
        }}
      >
        {entry.isPercentage ? '%' : '₫'}
      </button>

      {/* Value */}
      <div className="w-24 shrink-0">
        {entry.isPercentage ? (
          <input
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={entry.value}
            onChange={(e) => onChange({ value: parseFloat(e.target.value) || 0 })}
            placeholder="0"
            className={`${inputCls} text-xs py-1`}
            style={inputStyle}
            onFocus={onFocusAccent}
            onBlur={onBlurDefault}
          />
        ) : (
          <PriceInput
            value={String(entry.value || '')}
            onChange={(raw) => onChange({ value: parseInt(raw || '0', 10) })}
            placeholder="0"
            className={`${inputCls} text-xs py-1`}
            style={inputStyle}
            onFocus={onFocusAccent}
            onBlur={onBlurDefault}
          />
        )}
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="shrink-0 w-6 h-6 flex items-center justify-center rounded mt-0.5 text-lg leading-none transition-colors hover:text-red-400"
        style={{ color: TOKEN.text.ghost }}
      >
        ×
      </button>
    </div>
  );
}

// ── CostLinesSection ──────────────────────────────────────────────────────────

export interface CostLinesSectionProps {
  templates:      CostTemplate[];
  selectedIds:    string[];
  customValues:   Record<string, number>;
  adHocCosts:     AdHocCostEntry[];
  productType:    'full_size' | 'chiet';
  onToggle:       (id: string) => void;
  onValueChange:  (id: string, value: number) => void;
  onAdHocChange:  (costs: AdHocCostEntry[]) => void;
}

export function CostLinesSection({
  templates,
  selectedIds,
  customValues,
  adHocCosts,
  productType,
  onToggle,
  onValueChange,
  onAdHocChange,
}: CostLinesSectionProps) {
  const [nextId, setNextId] = useState(1);

  const fixedTemplates    = templates.filter((t) => t.cost_type === 'fixed');
  const variableTemplates = templates.filter((t) => t.cost_type === 'variable');

  const selectedSet = new Set(selectedIds);

  function addAdHoc() {
    onAdHocChange([
      ...adHocCosts,
      { id: `adhoc_${nextId}`, name: '', isPercentage: false, value: 0 },
    ]);
    setNextId((n) => n + 1);
  }

  function updateAdHoc(index: number, patch: Partial<AdHocCostEntry>) {
    onAdHocChange(adHocCosts.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function removeAdHoc(index: number) {
    onAdHocChange(adHocCosts.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      {/* Fixed costs */}
      {fixedTemplates.length > 0 && (
        <div>
          <SectionLabel label="Định Phí" className="mb-2" />
          <div className="grid grid-cols-2 gap-2">
            {fixedTemplates.map((t) => (
              <CostCard
                key={t.id}
                template={t}
                selected={selectedSet.has(t.id)}
                value={customValues[t.id] ?? 0}
                onToggle={() => onToggle(t.id)}
                onValueChange={(v) => onValueChange(t.id, v)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Variable costs */}
      {variableTemplates.length > 0 && (
        <div>
          <SectionLabel label="Biến Phí" className="mb-2" />
          <div className="grid grid-cols-2 gap-2">
            {variableTemplates
              .filter((t) => {
                // Hide chiết-specific costs when not relevant
                if (t.id === 'decant_bottle' && productType !== 'chiet') return false;
                return true;
              })
              .map((t) => (
                <CostCard
                  key={t.id}
                  template={t}
                  selected={selectedSet.has(t.id)}
                  value={customValues[t.id] ?? 0}
                  onToggle={() => onToggle(t.id)}
                  onValueChange={(v) => onValueChange(t.id, v)}
                />
              ))}
          </div>
        </div>
      )}

      {/* Ad-hoc costs */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <SectionLabel label="Chi Phí Khác" />
          <button
            onClick={addAdHoc}
            className="text-xs px-2 py-1 rounded-lg transition-colors"
            style={{
              background: TOKEN.accent.glow,
              color:      TOKEN.text.accent,
              border:     `1px solid ${TOKEN.border.accent}`,
            }}
          >
            + Thêm
          </button>
        </div>
        {adHocCosts.length > 0 ? (
          <div className="space-y-2">
            {adHocCosts.map((entry, i) => (
              <AdHocRow
                key={entry.id}
                entry={entry}
                onChange={(patch) => updateAdHoc(i, patch)}
                onRemove={() => removeAdHoc(i)}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs py-2" style={{ color: TOKEN.text.ghost }}>
            Nhấn "+ Thêm" để thêm chi phí tùy chỉnh
          </p>
        )}
      </div>
    </div>
  );
}
