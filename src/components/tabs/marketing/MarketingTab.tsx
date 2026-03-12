/**
 * MarketingTab — Revenue funnel & channel efficiency model.
 *
 * Models Facebook and TikTok revenue funnels, blended metrics,
 * budget projection scenarios, and reverse revenue planning.
 */

import type { MarketingInputs, MarketingOutputs } from '../../../types';
import { AdsMode } from '../../../types';
import { TabLayout } from '../../layout/TabLayout';
import { InputsCard } from '../../cards/InputsCard';
import { ResultsCard } from '../../cards/ResultsCard';
import { InsightsCard } from '../../cards/InsightsCard';
import type { InsightItem } from '../../cards/InsightsCard';
import { WarningsCard } from '../../cards/WarningsCard';
import type { WarningItem } from '../../cards/WarningsCard';
import { MetricCard, MetricRow } from '../../ui/MetricCard';
import { SectionLabel } from '../../ui/SectionLabel';
import { FormField, inputCls, inputStyle, onFocusAccent, onBlurDefault } from '../../ui/FormField';
import { TOKEN } from '../../ui/tokens';
import PriceInput from '../../PriceInput';
import { formatVND, formatPct } from '../../../lib/finance';

export interface MarketingTabProps {
  inputs:   MarketingInputs;
  outputs:  MarketingOutputs;
  onChange: (patch: Partial<MarketingInputs>) => void;
}

export function MarketingTab({ inputs, outputs, onChange }: MarketingTabProps) {
  const hasData = inputs.facebook.monthlyBudget > 0 || inputs.tiktok.monthlyAdBudget > 0 || inputs.tiktok.monthlyOrganicGmv > 0;

  // ── Insights ──────────────────────────────────────────────────────────────

  const insights: InsightItem[] = [];

  if (hasData) {
    if (outputs.blended.mer >= 3) {
      insights.push({ id: 'mer-good', level: 'success', text: `MER ${outputs.blended.mer.toFixed(2)}× — marketing đang hoạt động hiệu quả cao.` });
    } else if (outputs.blended.mer < 1.5) {
      insights.push({ id: 'mer-low', level: 'warning', text: `MER chỉ ${outputs.blended.mer.toFixed(2)}× — mỗi đồng chi marketing chỉ thu về ${formatVND(outputs.blended.totalNetRevenue / outputs.blended.totalMarketingCost)} doanh thu ròng.` });
    }
    // Channel mix
    if (outputs.blended.revenueShareFacebookPct > 0 && outputs.blended.revenueShareTiktokPct > 0) {
      insights.push({
        id:    'channel-mix',
        level: 'info',
        text:  `Phân bổ doanh thu: Facebook ${formatPct(outputs.blended.revenueShareFacebookPct)} — TikTok ${formatPct(outputs.blended.revenueShareTiktokPct)}.`,
      });
    }
  }

  // ── Warnings ──────────────────────────────────────────────────────────────

  const warnings: WarningItem[] = [];

  if (hasData && outputs.blended.blendedRoas < 1) {
    warnings.push({
      id:       'roas-below-1',
      severity: 'critical',
      title:    'ROAS < 1 — đang lỗ trên ads',
      detail:   `Doanh thu ${formatVND(outputs.blended.totalGrossRevenue)} < Chi phí ads ${formatVND(outputs.blended.totalAdSpend)}. Dừng hoặc tối ưu ngay.`,
    });
  }

  return (
    <TabLayout
      inputs={
        <div className="space-y-3">
          {/* Shared */}
          <InputsCard title="Thông Số Chung" icon="⚙️">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="AOV trung bình" unit="₫" tooltip="Giá trị đơn trung bình, tự động từ tab Tính Giá">
                <PriceInput
                  value={String(inputs.sharedAverageOrderValue || '')}
                  onChange={(raw) => onChange({ sharedAverageOrderValue: parseInt(raw || '0', 10) })}
                  placeholder="0"
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                />
              </FormField>
              <FormField label="Tỉ lệ hoàn hàng" unit="%">
                <input
                  type="number" min={0} max={100} step={0.5}
                  value={inputs.returnRatePct}
                  onChange={(e) => onChange({ returnRatePct: parseFloat(e.target.value) || 0 })}
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                />
              </FormField>
              <FormField label="Chi phí nội dung" unit="₫">
                <PriceInput
                  value={String(inputs.contentCostPerMonth || '')}
                  onChange={(raw) => onChange({ contentCostPerMonth: parseInt(raw || '0', 10) })}
                  placeholder="0"
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                />
              </FormField>
              <FormField label="Chi phí KOL" unit="₫">
                <PriceInput
                  value={String(inputs.kolCostPerMonth || '')}
                  onChange={(raw) => onChange({ kolCostPerMonth: parseInt(raw || '0', 10) })}
                  placeholder="0"
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                />
              </FormField>
            </div>
          </InputsCard>

          {/* Facebook */}
          <InputsCard title="Facebook Ads" icon="📘">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Ngân sách / tháng" unit="₫">
                <PriceInput
                  value={String(inputs.facebook.monthlyBudget || '')}
                  onChange={(raw) => onChange({ facebook: { ...inputs.facebook, monthlyBudget: parseInt(raw || '0', 10) } })}
                  placeholder="0"
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                />
              </FormField>
              <FormField label="CPC trung bình" unit="₫">
                <PriceInput
                  value={String(inputs.facebook.cpc || '')}
                  onChange={(raw) => onChange({ facebook: { ...inputs.facebook, cpc: parseInt(raw || '0', 10) } })}
                  placeholder="2000"
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                />
              </FormField>
              <FormField label="CVR landing page" unit="%">
                <input
                  type="number" min={0} max={100} step={0.1}
                  value={inputs.facebook.landingPageCvrPct}
                  onChange={(e) => onChange({ facebook: { ...inputs.facebook, landingPageCvrPct: parseFloat(e.target.value) || 0 } })}
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                />
              </FormField>
              <FormField label="Chế độ ngân sách">
                <select
                  value={inputs.facebook.adsMode}
                  onChange={(e) => onChange({ facebook: { ...inputs.facebook, adsMode: e.target.value as AdsMode } })}
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                >
                  <option value={AdsMode.FIXED_VND}>Cố định (₫)</option>
                  <option value={AdsMode.PERCENT_REVENUE}>% Doanh thu</option>
                </select>
              </FormField>
            </div>
          </InputsCard>

          {/* TikTok */}
          <InputsCard title="TikTok Shop" icon="🎵">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Ngân sách ads / tháng" unit="₫">
                <PriceInput
                  value={String(inputs.tiktok.monthlyAdBudget || '')}
                  onChange={(raw) => onChange({ tiktok: { ...inputs.tiktok, monthlyAdBudget: parseInt(raw || '0', 10) } })}
                  placeholder="0"
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                />
              </FormField>
              <FormField label="GMV organic / tháng" unit="₫" tooltip="Doanh thu từ traffic tự nhiên TikTok">
                <PriceInput
                  value={String(inputs.tiktok.monthlyOrganicGmv || '')}
                  onChange={(raw) => onChange({ tiktok: { ...inputs.tiktok, monthlyOrganicGmv: parseInt(raw || '0', 10) } })}
                  placeholder="0"
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                />
              </FormField>
              <FormField label="Hoa hồng TikTok" unit="%">
                <input
                  type="number" min={0} max={100} step={0.5}
                  value={inputs.tiktok.commissionRatePct}
                  onChange={(e) => onChange({ tiktok: { ...inputs.tiktok, commissionRatePct: parseFloat(e.target.value) || 0 } })}
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                />
              </FormField>
              <FormField label="CVR trang sản phẩm" unit="%">
                <input
                  type="number" min={0} max={100} step={0.1}
                  value={inputs.tiktok.productPageCvrPct}
                  onChange={(e) => onChange({ tiktok: { ...inputs.tiktok, productPageCvrPct: parseFloat(e.target.value) || 0 } })}
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
          {/* Blended summary */}
          <ResultsCard title="Tổng Hợp Marketing" icon="📊" empty={!hasData} emptyMessage="Nhập ngân sách để xem kết quả">
            {hasData && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard label="Tổng đơn hàng" value={Math.round(outputs.blended.totalOrders).toLocaleString('vi-VN')} variant="accent" />
                  <MetricCard label="Doanh thu ròng" value={formatVND(outputs.blended.totalNetRevenue)} variant="success" />
                  <MetricCard label="Blended ROAS" value={`${outputs.blended.blendedRoas.toFixed(2)}×`} variant={outputs.blended.blendedRoas >= 3 ? 'success' : outputs.blended.blendedRoas >= 1.5 ? 'warning' : 'danger'} />
                  <MetricCard label="MER" value={`${outputs.blended.mer.toFixed(2)}×`} hint="Revenue / tổng chi marketing" variant={outputs.blended.mer >= 3 ? 'success' : 'default'} />
                  <MetricCard label="Blended CAC" value={formatVND(outputs.blended.blendedCac)} />
                  <MetricCard label="Tổng chi marketing" value={formatVND(outputs.blended.totalMarketingCost)} variant="warning" />
                </div>
              </div>
            )}
          </ResultsCard>

          {/* Channel comparison */}
          <ResultsCard title="So Sánh Kênh" icon="⚖️" empty={!hasData}>
            {hasData && (
              <div className="space-y-3">
                <SectionLabel label="Facebook" className="mb-1.5" />
                <div className="space-y-1">
                  <MetricRow label="Đơn hàng" value={Math.round(outputs.facebook.estimatedOrders).toLocaleString()} />
                  <MetricRow label="Doanh thu ròng" value={formatVND(outputs.facebook.netRevenue)} />
                  <MetricRow label="ROAS" value={`${outputs.facebook.roas.toFixed(2)}×`} variant={outputs.facebook.roas >= 3 ? 'success' : 'default'} />
                  <MetricRow label="CAC" value={formatVND(outputs.facebook.cac)} />
                </div>
                <div className="border-t my-2" style={{ borderColor: TOKEN.border.default }} />
                <SectionLabel label="TikTok Shop" className="mb-1.5" />
                <div className="space-y-1">
                  <MetricRow label="Đơn hàng" value={Math.round(outputs.tiktok.estimatedOrders).toLocaleString()} />
                  <MetricRow label="Doanh thu ròng" value={formatVND(outputs.tiktok.netRevenue)} />
                  <MetricRow label="ROAS" value={`${outputs.tiktok.roas.toFixed(2)}×`} variant={outputs.tiktok.roas >= 3 ? 'success' : 'default'} />
                  <MetricRow label="CAC" value={formatVND(outputs.tiktok.cac)} />
                </div>
              </div>
            )}
          </ResultsCard>

          {/* Budget scenarios */}
          {hasData && outputs.budgetScenarios.length > 0 && (
            <ResultsCard title="Kịch Bản Ngân Sách" icon="🔮">
              <div className="space-y-2">
                {outputs.budgetScenarios.map((s) => (
                  <div
                    key={s.multiplier}
                    className="flex items-center justify-between rounded-lg px-3 py-2"
                    style={{ background: TOKEN.bg.input, border: `1px solid ${TOKEN.border.muted}` }}
                  >
                    <span className="text-xs font-medium" style={{ color: TOKEN.text.muted }}>
                      {s.multiplier}× ({formatVND(s.totalAdSpend)})
                    </span>
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: TOKEN.text.accent }}>{formatVND(s.estimatedRevenue)}</p>
                      <p className="text-xs" style={{ color: TOKEN.text.ghost }}>{Math.round(s.estimatedOrders)} đơn · ROAS {s.projectedRoas.toFixed(1)}×</p>
                    </div>
                  </div>
                ))}
              </div>
            </ResultsCard>
          )}

          <InsightsCard title="Nhận Xét Marketing" icon="💡" items={insights} />
          <WarningsCard items={warnings} />
        </>
      }
    />
  );
}
