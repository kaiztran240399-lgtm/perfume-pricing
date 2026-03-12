/**
 * PricingInputsPanel — All user inputs for the Pricing tab.
 *
 * Sections:
 *   1. Product info (name, brand, type)
 *   2. Size (conditional on product type)
 *   3. Purchase price
 *   4. Cost lines
 *   5. Profit & channel
 *   6. Notes
 */

import type { CostTemplate } from '../../../types';
import type { AdHocCostEntry, PricingInputs } from '../../../types';
import { InputsCard } from '../../cards/InputsCard';
import { FormField, inputCls, inputStyle, onFocusAccent, onBlurDefault } from '../../ui/FormField';
import { SectionLabel } from '../../ui/SectionLabel';
import { TOKEN } from '../../ui/tokens';
import PriceInput from '../../PriceInput';
import { CostLinesSection } from './CostLinesSection';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface PricingInputsPanelProps {
  inputs:    PricingInputs;
  templates: CostTemplate[];
  onChange:  (patch: Partial<PricingInputs>) => void;
}

// ── Type toggle button ────────────────────────────────────────────────────────

function TypeButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
      style={{
        background: active ? TOKEN.accent.primary : TOKEN.bg.input,
        color:      active ? '#fff'                : TOKEN.text.muted,
        border:     `1px solid ${active ? TOKEN.accent.primary : TOKEN.border.muted}`,
      }}
    >
      {label}
    </button>
  );
}

// ── Channel toggle ────────────────────────────────────────────────────────────

function ChannelButton({
  label,
  active,
  onClick,
}: {
  label: string;
  value: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
      style={{
        background: active ? TOKEN.accent.glow : TOKEN.bg.input,
        color:      active ? TOKEN.text.accent  : TOKEN.text.muted,
        border:     `1px solid ${active ? TOKEN.border.accent : TOKEN.border.muted}`,
      }}
    >
      {label}
    </button>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PricingInputsPanel({ inputs, templates, onChange }: PricingInputsPanelProps) {
  const isChiet = inputs.productType === 'chiet';

  // ── Cost line handlers ──────────────────────────────────────────────────────

  function handleToggleCost(id: string) {
    const current = new Set(inputs.selectedCostIds);
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    onChange({ selectedCostIds: Array.from(current) });
  }

  function handleCostValueChange(id: string, value: number) {
    onChange({ customCostValues: { ...inputs.customCostValues, [id]: value } });
  }

  function handleAdHocChange(costs: AdHocCostEntry[]) {
    onChange({ adHocCosts: costs });
  }

  return (
    <div className="space-y-3">
      {/* ── Product info ────────────────────────────────────────────────────── */}
      <InputsCard title="Thông tin sản phẩm" icon="🧴">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Tên sản phẩm" required>
            <input
              type="text"
              value={inputs.productName}
              onChange={(e) => onChange({ productName: e.target.value })}
              placeholder="Ví dụ: Chanel N°5"
              className={inputCls}
              style={inputStyle}
              onFocus={onFocusAccent}
              onBlur={onBlurDefault}
            />
          </FormField>

          <FormField label="Thương hiệu">
            <input
              type="text"
              value={inputs.brand}
              onChange={(e) => onChange({ brand: e.target.value })}
              placeholder="Ví dụ: Chanel"
              className={inputCls}
              style={inputStyle}
              onFocus={onFocusAccent}
              onBlur={onBlurDefault}
            />
          </FormField>
        </div>

        {/* Type toggle */}
        <FormField label="Loại sản phẩm">
          <div className="flex gap-2">
            <TypeButton
              label="Full Size"
              active={!isChiet}
              onClick={() => onChange({ productType: 'full_size' })}
            />
            <TypeButton
              label="Hàng Chiết"
              active={isChiet}
              onClick={() => onChange({ productType: 'chiet' })}
            />
          </div>
        </FormField>
      </InputsCard>

      {/* ── Size & price ────────────────────────────────────────────────────── */}
      <InputsCard title="Kích thước & Giá nhập" icon="💰">
        {!isChiet ? (
          /* Full size */
          <FormField label="Dung tích (ml)" unit="ml">
            <input
              type="number"
              min={1}
              value={inputs.sizeMl || ''}
              onChange={(e) => onChange({ sizeMl: parseInt(e.target.value) || 0 })}
              placeholder="100"
              className={inputCls}
              style={inputStyle}
              onFocus={onFocusAccent}
              onBlur={onBlurDefault}
            />
          </FormField>
        ) : (
          /* Decant */
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Chai gốc (ml)" unit="ml" tooltip="Dung tích chai chính hãng">
              <input
                type="number"
                min={1}
                value={inputs.bottleSizeMl || ''}
                onChange={(e) => onChange({ bottleSizeMl: parseInt(e.target.value) || 0 })}
                placeholder="100"
                className={inputCls}
                style={inputStyle}
                onFocus={onFocusAccent}
                onBlur={onBlurDefault}
              />
            </FormField>
            <FormField label="Lọ chiết (ml)" unit="ml" tooltip="Dung tích mỗi lọ chiết bán ra">
              <input
                type="number"
                min={1}
                value={inputs.decantSizeMl || ''}
                onChange={(e) => onChange({ decantSizeMl: parseInt(e.target.value) || 0 })}
                placeholder="10"
                className={inputCls}
                style={inputStyle}
                onFocus={onFocusAccent}
                onBlur={onBlurDefault}
              />
            </FormField>
          </div>
        )}

        <FormField
          label="Giá nhập"
          unit="₫"
          required
          hint={
            isChiet && inputs.bottleSizeMl > 0 && inputs.decantSizeMl > 0
              ? `Giá nhập mỗi chai gốc — giá lọ chiết sẽ được tính tự động`
              : undefined
          }
        >
          <PriceInput
            value={String(inputs.purchasePrice || '')}
            onChange={(raw) => onChange({ purchasePrice: parseInt(raw || '0', 10) })}
            placeholder="0"
            className={inputCls}
            style={inputStyle}
            onFocus={onFocusAccent}
            onBlur={onBlurDefault}
          />
        </FormField>
      </InputsCard>

      {/* ── Cost lines ──────────────────────────────────────────────────────── */}
      <InputsCard title="Chi phí" icon="📋" subtitle="Chọn và điền chi phí áp dụng">
        <CostLinesSection
          templates={templates}
          selectedIds={inputs.selectedCostIds}
          customValues={inputs.customCostValues}
          adHocCosts={inputs.adHocCosts}
          productType={inputs.productType}
          onToggle={handleToggleCost}
          onValueChange={handleCostValueChange}
          onAdHocChange={handleAdHocChange}
        />
      </InputsCard>

      {/* ── Profit & channel ────────────────────────────────────────────────── */}
      <InputsCard title="Lợi nhuận & Kênh bán" icon="📈">
        <FormField
          label="Tỉ lệ lợi nhuận mục tiêu"
          unit="%"
          tooltip="Giá bán = Giá vốn ÷ (1 − lợi nhuận%)"
          hint={inputs.targetMarginPct >= 100 ? undefined : `Giá bán ≈ Giá vốn × ${(1 / (1 - inputs.targetMarginPct / 100)).toFixed(2)}`}
          error={inputs.targetMarginPct >= 100 ? 'Tỉ lệ lợi nhuận phải < 100%' : undefined}
        >
          <input
            type="number"
            min={0}
            max={99}
            step={1}
            value={inputs.targetMarginPct}
            onChange={(e) => onChange({ targetMarginPct: parseFloat(e.target.value) || 0 })}
            className={inputCls}
            style={inputStyle}
            onFocus={onFocusAccent}
            onBlur={onBlurDefault}
          />
        </FormField>

        <FormField label="Kênh bán">
          <div className="flex gap-2">
            {(['facebook', 'tiktok', 'all'] as const).map((ch) => (
              <ChannelButton
                key={ch}
                label={ch === 'facebook' ? 'Facebook' : ch === 'tiktok' ? 'TikTok' : 'Tất cả'}
                value={ch}
                active={inputs.channel === ch}
                onClick={() => onChange({ channel: ch })}
              />
            ))}
          </div>
        </FormField>
      </InputsCard>

      {/* ── Notes ───────────────────────────────────────────────────────────── */}
      <InputsCard title="Ghi chú" icon="📝">
        <SectionLabel label="" />
        <textarea
          value={inputs.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Ghi chú thêm về sản phẩm hoặc cách tính giá..."
          rows={3}
          className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none transition-colors resize-none"
          style={{
            background:  TOKEN.bg.input,
            borderColor: TOKEN.border.muted,
            color:       TOKEN.text.primary,
          }}
        />
      </InputsCard>
    </div>
  );
}
