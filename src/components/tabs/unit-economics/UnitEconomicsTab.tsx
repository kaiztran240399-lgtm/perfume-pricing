/**
 * UnitEconomicsTab — Per-unit profitability analysis.
 *
 * Shows how gross margin erodes through discounts, returns, CAC, and gifts
 * to reveal the true contribution margin per sold unit.
 */

import type { UnitEconomicsInputs, UnitEconomicsOutputs } from '../../../types';
import { TabLayout } from '../../layout/TabLayout';
import { InputsCard } from '../../cards/InputsCard';
import { ResultsCard } from '../../cards/ResultsCard';
import { InsightsCard } from '../../cards/InsightsCard';
import type { InsightItem } from '../../cards/InsightsCard';
import { WarningsCard } from '../../cards/WarningsCard';
import type { WarningItem } from '../../cards/WarningsCard';
import { MetricCard, MetricRow } from '../../ui/MetricCard';
import { FormField, inputCls, inputStyle, onFocusAccent, onBlurDefault } from '../../ui/FormField';
import { SectionLabel } from '../../ui/SectionLabel';
import { TOKEN } from '../../ui/tokens';
import PriceInput from '../../PriceInput';
import { formatVND, formatPct } from '../../../lib/finance';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface UnitEconomicsTabProps {
  inputs:    UnitEconomicsInputs;
  outputs:   UnitEconomicsOutputs;
  onChange:  (patch: Partial<UnitEconomicsInputs>) => void;
}

// ── Tab component ─────────────────────────────────────────────────────────────

export function UnitEconomicsTab({ inputs, outputs, onChange }: UnitEconomicsTabProps) {
  const hasData = inputs.sellingPrice > 0 || inputs.costBase > 0;

  // ── Insights ──────────────────────────────────────────────────────────────

  const insights: InsightItem[] = [];

  if (hasData) {
    // Real margin vs gross margin
    const realMarginDiff = outputs.effectiveMarginPct - inputs.grossMarginPct;
    if (Math.abs(realMarginDiff) > 1) {
      insights.push({
        id:    'margin-erosion',
        level: realMarginDiff < -5 ? 'warning' : 'info',
        text:  `Biên lợi nhuận thực tế là ${formatPct(outputs.effectiveMarginPct)} — thấp hơn biên gộp ${formatPct(inputs.grossMarginPct)} do chiết khấu, hoàn hàng và chi phí ads.`,
      });
    }
    // Break-even
    if (outputs.breakEvenUnitsPerMonth !== Number.MAX_SAFE_INTEGER && inputs.monthlyUnitsSold > 0) {
      const coveragePct = (inputs.monthlyUnitsSold / outputs.breakEvenUnitsPerMonth) * 100;
      insights.push({
        id:    'breakeven',
        level: coveragePct >= 100 ? 'success' : 'warning',
        text:  `Bạn ${coveragePct >= 100 ? 'đã vượt' : 'chưa đạt'} điểm hòa vốn (${outputs.breakEvenUnitsPerMonth} đơn/tháng). Hiện tại đang bán ${inputs.monthlyUnitsSold} đơn — ${formatPct(coveragePct)} mức cần thiết.`,
      });
    }
    // CAC efficiency
    if (outputs.cac > 0 && outputs.roasPerUnit > 0) {
      insights.push({
        id:    'cac-roas',
        level: outputs.roasPerUnit >= 3 ? 'success' : outputs.roasPerUnit >= 1.5 ? 'info' : 'warning',
        text:  `ROAS per unit: ${outputs.roasPerUnit.toFixed(1)}× — mỗi đồng ads thu về ${formatVND(outputs.netRevenuePerUnit / outputs.cac)} doanh thu ròng.`,
      });
    }
  }

  // ── Warnings ──────────────────────────────────────────────────────────────

  const warnings: WarningItem[] = [];

  if (hasData) {
    if (outputs.contributionMarginPerUnit <= 0) {
      warnings.push({
        id:       'negative-cm',
        severity: 'critical',
        title:    'Contribution margin âm',
        detail:   `Mỗi đơn bán ra đang lỗ ${formatVND(Math.abs(outputs.contributionMarginPerUnit))} sau khi trừ ads và chi phí biến đổi. Dừng quảng cáo và rà soát chi phí ngay.`,
      });
    }
    if (outputs.breakEvenUnitsPerMonth === Number.MAX_SAFE_INTEGER) {
      warnings.push({
        id:       'break-even-impossible',
        severity: 'critical',
        title:    'Không thể hòa vốn',
        detail:   'Contribution margin ≤ 0 nên không có số đơn nào có thể bù đắp chi phí cố định.',
      });
    }
  }

  return (
    <TabLayout
      inputs={
        <div className="space-y-3">
          {/* Linked from Pricing */}
          <InputsCard
            title="Dữ Liệu Liên Kết"
            subtitle="Tự động từ tab Tính Giá — có thể ghi đè"
            icon="🔗"
          >
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Giá bán" unit="₫">
                <PriceInput
                  value={String(inputs.sellingPrice || '')}
                  onChange={(raw) => onChange({ sellingPrice: parseInt(raw || '0', 10) })}
                  placeholder="0"
                  className={inputCls}
                  style={inputStyle}
                  onFocus={onFocusAccent}
                  onBlur={onBlurDefault}
                />
              </FormField>
              <FormField label="Giá vốn" unit="₫">
                <PriceInput
                  value={String(inputs.costBase || '')}
                  onChange={(raw) => onChange({ costBase: parseInt(raw || '0', 10) })}
                  placeholder="0"
                  className={inputCls}
                  style={inputStyle}
                  onFocus={onFocusAccent}
                  onBlur={onBlurDefault}
                />
              </FormField>
            </div>
            <FormField label="Biên lợi nhuận gộp" unit="%">
              <input
                type="number" min={0} max={99} step={0.5}
                value={inputs.grossMarginPct}
                onChange={(e) => onChange({ grossMarginPct: parseFloat(e.target.value) || 0 })}
                className={inputCls}
                style={inputStyle}
                onFocus={onFocusAccent}
                onBlur={onBlurDefault}
              />
            </FormField>
          </InputsCard>

          {/* Performance */}
          <InputsCard title="Hiệu Suất Thực Tế" icon="📊">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Chi phí ads / tháng" unit="₫">
                <PriceInput
                  value={String(inputs.monthlyAdSpend || '')}
                  onChange={(raw) => onChange({ monthlyAdSpend: parseInt(raw || '0', 10) })}
                  placeholder="0"
                  className={inputCls}
                  style={inputStyle}
                  onFocus={onFocusAccent}
                  onBlur={onBlurDefault}
                />
              </FormField>
              <FormField label="Số đơn / tháng">
                <input
                  type="number" min={0} value={inputs.monthlyUnitsSold || ''}
                  onChange={(e) => onChange({ monthlyUnitsSold: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  className={inputCls}
                  style={inputStyle}
                  onFocus={onFocusAccent}
                  onBlur={onBlurDefault}
                />
              </FormField>
              <FormField label="Tỉ lệ hoàn hàng" unit="%">
                <input
                  type="number" min={0} max={100} step={0.5}
                  value={inputs.returnRatePct}
                  onChange={(e) => onChange({ returnRatePct: parseFloat(e.target.value) || 0 })}
                  className={inputCls}
                  style={inputStyle}
                  onFocus={onFocusAccent}
                  onBlur={onBlurDefault}
                />
              </FormField>
              <FormField label="Tỉ lệ chiết khấu" unit="%">
                <input
                  type="number" min={0} max={100} step={0.5}
                  value={inputs.discountRatePct}
                  onChange={(e) => onChange({ discountRatePct: parseFloat(e.target.value) || 0 })}
                  className={inputCls}
                  style={inputStyle}
                  onFocus={onFocusAccent}
                  onBlur={onBlurDefault}
                />
              </FormField>
            </div>
          </InputsCard>

          {/* Gifts & Fixed */}
          <InputsCard title="Quà & Chi Phí Cố Định" icon="🎁">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Quà / 100 đơn" tooltip="Số lượng quà tặng trên 100 đơn hàng">
                <input
                  type="number" min={0} value={inputs.giftsPerHundredOrders}
                  onChange={(e) => onChange({ giftsPerHundredOrders: parseFloat(e.target.value) || 0 })}
                  className={inputCls}
                  style={inputStyle}
                  onFocus={onFocusAccent}
                  onBlur={onBlurDefault}
                />
              </FormField>
              <FormField label="Giá trị quà / món" unit="₫">
                <PriceInput
                  value={String(inputs.giftCostPerUnit || '')}
                  onChange={(raw) => onChange({ giftCostPerUnit: parseInt(raw || '0', 10) })}
                  placeholder="0"
                  className={inputCls}
                  style={inputStyle}
                  onFocus={onFocusAccent}
                  onBlur={onBlurDefault}
                />
              </FormField>
            </div>
            <FormField label="Chi phí cố định / tháng" unit="₫" tooltip="Thuê mặt bằng, lương, công cụ...">
              <PriceInput
                value={String(inputs.monthlyFixedCosts || '')}
                onChange={(raw) => onChange({ monthlyFixedCosts: parseInt(raw || '0', 10) })}
                placeholder="0"
                className={inputCls}
                style={inputStyle}
                onFocus={onFocusAccent}
                onBlur={onBlurDefault}
              />
            </FormField>
          </InputsCard>
        </div>
      }
      results={
        <>
          <ResultsCard title="Margin Waterfall" icon="📉" empty={!hasData} emptyMessage="Nhập giá bán và giá vốn để xem phân tích">
            {hasData && (
              <div className="space-y-3">
                {/* Hero CM */}
                <MetricCard
                  label="Contribution Margin / đơn"
                  value={formatVND(outputs.contributionMarginPerUnit)}
                  subValue={`CM ratio: ${formatPct(outputs.contributionMarginRatioPct)}`}
                  variant={outputs.contributionMarginPerUnit > 0 ? 'success' : 'danger'}
                  hero
                />

                {/* Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard label="Giá bán hiệu dụng" value={formatVND(outputs.effectiveSellingPrice)} hint="Sau chiết khấu" />
                  <MetricCard label="Doanh thu ròng / đơn" value={formatVND(outputs.netRevenuePerUnit)} hint="Sau hoàn hàng" />
                  <MetricCard label="CAC" value={formatVND(outputs.cac)} hint="Chi phí mỗi đơn" variant={outputs.cac > 0 ? 'warning' : 'default'} />
                  <MetricCard label="ROAS / đơn" value={`${outputs.roasPerUnit.toFixed(2)}×`} variant={outputs.roasPerUnit >= 3 ? 'success' : outputs.roasPerUnit >= 1.5 ? 'default' : 'danger'} />
                </div>

                {/* Waterfall rows */}
                <div className="space-y-1.5">
                  <SectionLabel label="Waterfall Chi Tiết" className="mb-2" />
                  <MetricRow label="Giá bán" value={formatVND(inputs.sellingPrice)} />
                  <MetricRow label="− Chiết khấu" value={formatVND(inputs.sellingPrice - outputs.effectiveSellingPrice)} indent />
                  <MetricRow label="= Giá bán hiệu dụng" value={formatVND(outputs.effectiveSellingPrice)} />
                  <MetricRow label="− Hoàn hàng" value={formatVND(outputs.effectiveSellingPrice - outputs.netRevenuePerUnit)} indent />
                  <MetricRow label="= Doanh thu ròng" value={formatVND(outputs.netRevenuePerUnit)} />
                  <MetricRow label="− Giá vốn" value={formatVND(inputs.costBase)} indent />
                  <MetricRow label="− CAC (ads)" value={formatVND(outputs.cac)} indent />
                  <MetricRow label="− Chi phí quà tặng" value={formatVND(outputs.allocatedGiftCostPerUnit)} indent />
                  <div className="border-t my-1" style={{ borderColor: TOKEN.border.default }} />
                  <MetricRow label="= Contribution Margin" value={formatVND(outputs.contributionMarginPerUnit)} variant={outputs.contributionMarginPerUnit > 0 ? 'success' : 'danger'} />
                </div>
              </div>
            )}
          </ResultsCard>

          <ResultsCard title="Hòa Vốn & Tháng" icon="⚖️" empty={!hasData}>
            {hasData && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard
                    label="Điểm hòa vốn"
                    value={outputs.breakEvenUnitsPerMonth === Number.MAX_SAFE_INTEGER ? 'N/A' : `${outputs.breakEvenUnitsPerMonth} đơn`}
                    hint="Đơn/tháng cần để bù định phí"
                    variant={outputs.breakEvenUnitsPerMonth === Number.MAX_SAFE_INTEGER ? 'danger' : 'default'}
                  />
                  <MetricCard
                    label="Doanh thu hòa vốn"
                    value={outputs.breakEvenRevenue === Number.MAX_SAFE_INTEGER ? 'N/A' : formatVND(outputs.breakEvenRevenue)}
                    hint="₫/tháng"
                  />
                  <MetricCard label="Doanh thu gộp / tháng" value={formatVND(outputs.monthlyGrossRevenue)} />
                  <MetricCard label="Lợi nhuận CM / tháng" value={formatVND(outputs.monthlyContributionProfit)} variant={outputs.monthlyContributionProfit > 0 ? 'success' : 'danger'} />
                </div>
              </div>
            )}
          </ResultsCard>

          <InsightsCard title="Nhận Xét" icon="💡" items={insights} />
          <WarningsCard items={warnings} />
        </>
      }
    />
  );
}
