/**
 * LTVTab — Customer Lifetime Value analysis.
 *
 * Shows 4 LTV tiers, LTV:CAC ratio with health status, payback period,
 * max viable CAC, and year-by-year cohort value.
 */

import type { LTVInputs, LTVOutputs } from '../../../types/business-calculator';
import { HealthStatus } from '../../../types/business-calculator';
import { TabLayout } from '../../layout/TabLayout';
import { InputsCard } from '../../cards/InputsCard';
import { ResultsCard } from '../../cards/ResultsCard';
import { InsightsCard } from '../../cards/InsightsCard';
import type { InsightItem } from '../../cards/InsightsCard';
import { WarningsCard } from '../../cards/WarningsCard';
import type { WarningItem } from '../../cards/WarningsCard';
import { MetricCard, MetricRow } from '../../ui/MetricCard';
import { HealthBadge } from '../../ui/HealthBadge';
import { SectionLabel } from '../../ui/SectionLabel';
import { FormField, inputCls, inputStyle, onFocusAccent, onBlurDefault } from '../../ui/FormField';
import { TOKEN } from '../../ui/tokens';
import PriceInput from '../../PriceInput';
import { formatVND } from '../../../lib/calc';

export interface LTVTabProps {
  inputs:   LTVInputs;
  outputs:  LTVOutputs;
  onChange: (patch: Partial<LTVInputs>) => void;
}

export function LTVTab({ inputs, outputs, onChange }: LTVTabProps) {
  const hasData = inputs.averageOrderValue > 0 && inputs.blendedCac > 0;

  const insights: InsightItem[] = [];
  const warnings: WarningItem[] = [];

  if (hasData) {
    // Payback period
    if (outputs.paybackPeriodMonths > 0 && outputs.paybackPeriodMonths < 120) {
      insights.push({
        id:    'payback',
        level: outputs.paybackPeriodMonths <= 6 ? 'success' : outputs.paybackPeriodMonths <= 12 ? 'info' : 'warning',
        text:  `Thời gian hoàn vốn CAC: ${outputs.paybackPeriodMonths.toFixed(1)} tháng${outputs.paybackPeriodMonths <= 6 ? ' — xuất sắc!' : outputs.paybackPeriodMonths <= 12 ? ' — tốt.' : ' — cần cải thiện.'}`,
      });
    }
    // CAC room
    if (outputs.cacSurplusOrDeficit > 0) {
      insights.push({ id: 'cac-room', level: 'success', text: `Còn ${formatVND(outputs.cacSurplusOrDeficit)} dư địa tăng CAC trước khi LTV:CAC < 3.` });
    }
    // Health status
    if (outputs.ltvCacHealthStatus === HealthStatus.CRITICAL) {
      warnings.push({ id: 'ltv-cac-critical', severity: 'critical', title: 'LTV:CAC < 1 — mỗi khách đang lỗ tiền', detail: `LTV ${formatVND(outputs.ltvReferralAdjusted)} < CAC ${formatVND(inputs.blendedCac)}. Giảm CAC hoặc tăng retention ngay.` });
    } else if (outputs.ltvCacHealthStatus === HealthStatus.WARNING) {
      warnings.push({ id: 'ltv-cac-warning', severity: 'warning', title: 'LTV:CAC < 3 — biên an toàn thấp', detail: `Nên đạt LTV:CAC ≥ 3. Hiện tại ${outputs.ltvCacRatio.toFixed(2)}×.` });
    }
    if (outputs.cacSurplusOrDeficit < 0) {
      warnings.push({ id: 'cac-overspend', severity: 'warning', title: 'CAC vượt ngưỡng an toàn', detail: `CAC hiện tại cao hơn max viable CAC ${formatVND(outputs.maxViableCac)} — ${formatVND(Math.abs(outputs.cacSurplusOrDeficit))}.` });
    }
  }

  return (
    <TabLayout
      inputs={
        <div className="space-y-3">
          <InputsCard title="Hành Vi Mua Hàng" icon="🛍️">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="AOV trung bình" unit="₫">
                <PriceInput
                  value={String(inputs.averageOrderValue || '')}
                  onChange={(raw) => onChange({ averageOrderValue: parseInt(raw || '0', 10) })}
                  placeholder="0"
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                />
              </FormField>
              <FormField label="Tần suất mua / năm">
                <input
                  type="number" min={0.1} step={0.1}
                  value={inputs.purchaseFrequencyPerYear}
                  onChange={(e) => onChange({ purchaseFrequencyPerYear: parseFloat(e.target.value) || 0 })}
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                />
              </FormField>
              <FormField label="Vòng đời khách hàng" unit="năm">
                <input
                  type="number" min={0.5} step={0.5}
                  value={inputs.customerLifespanYears}
                  onChange={(e) => onChange({ customerLifespanYears: parseFloat(e.target.value) || 0 })}
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                />
              </FormField>
              <FormField label="Biên lợi nhuận gộp" unit="%">
                <input
                  type="number" min={0} max={99} step={0.5}
                  value={inputs.grossMarginPct}
                  onChange={(e) => onChange({ grossMarginPct: parseFloat(e.target.value) || 0 })}
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                />
              </FormField>
            </div>
          </InputsCard>

          <InputsCard title="Tỉ Lệ Giữ Chân" icon="🔄">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Mua lần 2" unit="%" tooltip="% khách mua lần đầu quay lại">
                <input
                  type="number" min={0} max={100} step={1}
                  value={inputs.repeatRateAfterFirstPct}
                  onChange={(e) => onChange({ repeatRateAfterFirstPct: parseFloat(e.target.value) || 0 })}
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                />
              </FormField>
              <FormField label="Mua lần 3+" unit="%" tooltip="% khách mua lần 2 tiếp tục mua">
                <input
                  type="number" min={0} max={100} step={1}
                  value={inputs.repeatRateAfterSecondPct}
                  onChange={(e) => onChange({ repeatRateAfterSecondPct: parseFloat(e.target.value) || 0 })}
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                />
              </FormField>
              <FormField label="Tỉ lệ giới thiệu bạn" unit="%">
                <input
                  type="number" min={0} max={100} step={1}
                  value={inputs.referralRatePct}
                  onChange={(e) => onChange({ referralRatePct: parseFloat(e.target.value) || 0 })}
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                />
              </FormField>
              <FormField label="Chi phí giữ chân / KH / năm" unit="₫">
                <PriceInput
                  value={String(inputs.retentionCostPerCustomerPerYear || '')}
                  onChange={(raw) => onChange({ retentionCostPerCustomerPerYear: parseInt(raw || '0', 10) })}
                  placeholder="0"
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                />
              </FormField>
            </div>
          </InputsCard>

          <InputsCard title="Tài Chính" icon="💰">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Blended CAC" unit="₫" tooltip="Tự động từ tab Marketing">
                <PriceInput
                  value={String(inputs.blendedCac || '')}
                  onChange={(raw) => onChange({ blendedCac: parseInt(raw || '0', 10) })}
                  placeholder="0"
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                />
              </FormField>
              <FormField label="Lãi suất chiết khấu" unit="%" tooltip="Dùng cho tính NPV">
                <input
                  type="number" min={0} max={100} step={1}
                  value={inputs.annualDiscountRatePct}
                  onChange={(e) => onChange({ annualDiscountRatePct: parseFloat(e.target.value) || 0 })}
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                />
              </FormField>
            </div>
          </InputsCard>
        </div>
      }
      results={
        <>
          <ResultsCard title="LTV:CAC Health" icon="💚" empty={!hasData} emptyMessage="Nhập AOV và CAC để xem phân tích">
            {hasData && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 mb-2">
                  <MetricCard
                    label="LTV:CAC Ratio"
                    value={`${outputs.ltvCacRatio.toFixed(2)}×`}
                    badge={<HealthBadge status={outputs.ltvCacHealthStatus} />}
                    variant={
                      outputs.ltvCacHealthStatus === HealthStatus.EXCELLENT ? 'success' :
                      outputs.ltvCacHealthStatus === HealthStatus.HEALTHY   ? 'success' :
                      outputs.ltvCacHealthStatus === HealthStatus.WARNING   ? 'warning' : 'danger'
                    }
                    hero
                    className="flex-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard label="Max viable CAC" value={formatVND(outputs.maxViableCac)} hint="Giữ LTV:CAC ≥ 3" variant="default" />
                  <MetricCard label="Dư địa CAC" value={formatVND(outputs.cacSurplusOrDeficit)} variant={outputs.cacSurplusOrDeficit >= 0 ? 'success' : 'danger'} />
                  <MetricCard label="Payback period" value={`${outputs.paybackPeriodMonths.toFixed(1)} tháng`} variant={outputs.paybackPeriodMonths <= 6 ? 'success' : outputs.paybackPeriodMonths <= 12 ? 'default' : 'warning'} />
                </div>
              </div>
            )}
          </ResultsCard>

          <ResultsCard title="LTV Breakdown" icon="📊" empty={!hasData}>
            {hasData && (
              <div className="space-y-1.5">
                <SectionLabel label="4 Cấp Độ LTV" className="mb-2" />
                <MetricRow label="LTV Simple (AOV × freq × lifespan)" value={formatVND(outputs.ltvSimple)} />
                <MetricRow label="LTV × Biên lợi nhuận gộp" value={formatVND(outputs.ltvMarginAdjusted)} indent />
                <MetricRow label="LTV − Chi phí giữ chân" value={formatVND(outputs.ltvNet)} indent />
                <MetricRow label="LTV + Giá trị giới thiệu" value={formatVND(outputs.ltvReferralAdjusted)} indent variant="accent" />
                <div className="border-t my-1.5" style={{ borderColor: TOKEN.border.default }} />
                <MetricRow label="Blended CAC" value={formatVND(inputs.blendedCac)} variant="warning" />
                <MetricRow label="LTV:CAC" value={`${outputs.ltvCacRatio.toFixed(2)}×`} variant={outputs.ltvCacRatio >= 3 ? 'success' : 'danger'} />
              </div>
            )}
          </ResultsCard>

          {/* Cohort by year */}
          {hasData && outputs.cohortValueByYear.length > 0 && (
            <ResultsCard title="Giá Trị Theo Năm" icon="📅">
              <div className="space-y-1.5">
                {outputs.cohortValueByYear.map((y) => (
                  <div key={y.year} className="flex items-center justify-between rounded px-3 py-2" style={{ background: TOKEN.bg.input, border: `1px solid ${TOKEN.border.muted}` }}>
                    <span className="text-xs font-medium" style={{ color: TOKEN.text.muted }}>Năm {y.year}</span>
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: TOKEN.text.accent }}>{formatVND(y.cumulativeLtv)}</p>
                      <p className="text-xs" style={{ color: TOKEN.text.ghost }}>Mới: {formatVND(y.newCustomersValue)} · Giữ lại: {formatVND(y.retainedCustomersValue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ResultsCard>
          )}

          <InsightsCard title="Nhận Xét LTV" icon="💡" items={insights} />
          <WarningsCard items={warnings} />
        </>
      }
    />
  );
}
