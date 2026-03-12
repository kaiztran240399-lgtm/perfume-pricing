/**
 * InventoryTab — Inventory management and 6-month cashflow projection.
 *
 * Sections:
 *   Inputs:  Current state · Reorder params · Payment & collection · Operating costs
 *            · 6-month sales forecast (editable, auto-linked from Marketing)
 *   Results: Inventory KPIs · CCC waterfall · 6-month cashflow · Insights · Warnings
 */

import { useState } from 'react';
import type { InventoryInputs, InventoryOutputs, MonthlySalesForecastEntry } from '../../../types';
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
import { formatVND, monthLabel } from '../../../lib/finance';
import { calcWarningsToWarningItems } from '../../../lib/calcWarningBridge';

export interface InventoryTabProps {
  inputs:        InventoryInputs;
  outputs:       InventoryOutputs;
  /** Pre-computed auto-forecast from marketing (shown when user hasn't customised). */
  autoForecast?: MonthlySalesForecastEntry[];
  onChange:      (patch: Partial<InventoryInputs>) => void;
}

// ── Forecast row ──────────────────────────────────────────────────────────────

function ForecastRow({
  entry,
  isAuto,
  onChangeUnits,
  onChangeRevenue,
  onChangeSpend,
}: {
  entry:           MonthlySalesForecastEntry;
  isAuto:          boolean;
  onChangeUnits:   (v: number) => void;
  onChangeRevenue: (v: number) => void;
  onChangeSpend:   (v: number) => void;
}) {
  return (
    <div
      className="rounded-lg px-3 py-2 space-y-1.5"
      style={{
        background: TOKEN.bg.input,
        border:     `1px solid ${isAuto ? TOKEN.border.default : TOKEN.border.accent}`,
        opacity:    isAuto ? 0.8 : 1,
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold" style={{ color: TOKEN.text.muted }}>
          {entry.label || monthLabel(entry.monthIndex)}
        </span>
        {isAuto && (
          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: TOKEN.bg.hover, color: TOKEN.text.ghost }}>
            auto
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-[10px] mb-1" style={{ color: TOKEN.text.ghost }}>Đơn hàng</p>
          <input
            type="number" min={0}
            value={entry.forecastUnits || ''}
            onChange={(e) => onChangeUnits(parseInt(e.target.value) || 0)}
            placeholder="0"
            className="w-full px-2 py-1 rounded text-xs border focus:outline-none"
            style={inputStyle}
            onFocus={onFocusAccent} onBlur={onBlurDefault}
          />
        </div>
        <div>
          <p className="text-[10px] mb-1" style={{ color: TOKEN.text.ghost }}>Doanh thu</p>
          <PriceInput
            value={String(entry.forecastRevenue || '')}
            onChange={(raw) => onChangeRevenue(parseInt(raw || '0', 10))}
            placeholder="0"
            className="w-full px-2 py-1 rounded text-xs border focus:outline-none"
            style={inputStyle}
            onFocus={onFocusAccent} onBlur={onBlurDefault}
          />
        </div>
        <div>
          <p className="text-[10px] mb-1" style={{ color: TOKEN.text.ghost }}>Chi ads</p>
          <PriceInput
            value={String(entry.marketingSpend || '')}
            onChange={(raw) => onChangeSpend(parseInt(raw || '0', 10))}
            placeholder="0"
            className="w-full px-2 py-1 rounded text-xs border focus:outline-none"
            style={inputStyle}
            onFocus={onFocusAccent} onBlur={onBlurDefault}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function InventoryTab({ inputs, outputs, autoForecast = [], onChange }: InventoryTabProps) {
  const hasData = inputs.currentInventoryUnits > 0 || inputs.startingCashBalance > 0;
  const [forecastExpanded, setForecastExpanded] = useState(false);

  const isUsingAutoForecast = inputs.monthlySalesForecast.length === 0;

  const displayForecast: MonthlySalesForecastEntry[] =
    inputs.monthlySalesForecast.length > 0
      ? inputs.monthlySalesForecast
      : autoForecast.length > 0
        ? autoForecast
        : Array.from({ length: 6 }, (_, i) => ({
            monthIndex: i, label: monthLabel(i),
            forecastUnits: 0, forecastRevenue: 0, marketingSpend: 0,
          }));

  function patchForecastRow(monthIdx: number, patch: Partial<MonthlySalesForecastEntry>) {
    const base = isUsingAutoForecast ? displayForecast : inputs.monthlySalesForecast;
    const updated = base.map((row, i) => (i === monthIdx ? { ...row, ...patch } : row));
    onChange({ monthlySalesForecast: updated });
  }

  // ── Insights & warnings ──────────────────────────────────────────────────

  const insights: InsightItem[] = [];
  const warnings: WarningItem[] = [...calcWarningsToWarningItems(outputs.warnings)];

  if (hasData) {
    const dsi = outputs.daysOfSalesInventory;
    if (dsi > 0 && dsi < 14) {
      insights.push({ id: 'dsi-low', level: 'warning', text: `DSI chỉ ${Math.round(dsi)} ngày — nguy cơ hết hàng. Kiểm tra điểm tái đặt hàng ngay.` });
    } else if (dsi > 90) {
      insights.push({ id: 'dsi-high', level: 'warning', text: `DSI ${Math.round(dsi)} ngày — tồn kho cao, vốn bị giam nhiều. Cân nhắc giảm lô nhập.` });
    }
    if (outputs.cashConversionCycleDays < 0) {
      insights.push({ id: 'ccc-neg', level: 'success', text: `CCC âm (${Math.round(outputs.cashConversionCycleDays)} ngày) — bạn thu tiền trước khi phải trả NCC. Lợi thế dòng tiền!` });
    } else if (outputs.cashConversionCycleDays > 60) {
      insights.push({ id: 'ccc-high', level: 'info', text: `CCC ${Math.round(outputs.cashConversionCycleDays)} ngày — tiền luân chuyển chậm. Đàm phán rút ngắn thời gian thu tiền.` });
    }
    if (outputs.cashRunwayMonths >= 6) {
      insights.push({ id: 'runway-good', level: 'success', text: `Cash runway ${outputs.cashRunwayMonths} tháng — đủ đệm an toàn để vận hành.` });
    }

    if (outputs.criticalMonths.length > 0) {
      warnings.push({
        id: 'cash-critical', severity: 'critical',
        title:  `Rủi ro thiếu tiền tháng ${outputs.criticalMonths.map(m => m + 1).join(', ')}`,
        detail: `Số dư cuối tháng dự kiến dưới ${formatVND(outputs.minimumCashReserveNeeded)}. Cần bổ sung vốn hoặc giảm chi.`,
      });
    }
    if (outputs.cashRunwayMonths < 2) {
      warnings.push({ id: 'low-runway', severity: 'warning', title: 'Tiền mặt chỉ đủ < 2 tháng', detail: `Với ${formatVND(inputs.startingCashBalance)}, chỉ duy trì được ${outputs.cashRunwayMonths} tháng định phí.` });
    }
    if (inputs.currentInventoryUnits > 0 && outputs.reorderPoint > 0 && inputs.currentInventoryUnits <= outputs.reorderPoint) {
      warnings.push({ id: 'reorder-now', severity: 'warning', title: 'Tồn kho ≤ điểm tái đặt hàng', detail: `Tồn ${inputs.currentInventoryUnits} sp ≤ ROP ${outputs.reorderPoint}. Nên đặt ngay ${outputs.economicOrderQuantity} sp (EOQ).` });
    }
  }

  return (
    <TabLayout
      inputs={
        <div className="space-y-3">
          {/* ── Current state ──────────────────────────────────────────── */}
          <InputsCard title="Tình Trạng Hiện Tại" icon="📦">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Tồn kho hiện tại" unit="sản phẩm">
                <input
                  type="number" min={0}
                  value={inputs.currentInventoryUnits || ''}
                  onChange={(e) => onChange({ currentInventoryUnits: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                />
              </FormField>
              <FormField label="Số dư tiền mặt" unit="₫">
                <PriceInput
                  value={String(inputs.startingCashBalance || '')}
                  onChange={(raw) => onChange({ startingCashBalance: parseInt(raw || '0', 10) })}
                  placeholder="0"
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                />
              </FormField>
            </div>
          </InputsCard>

          {/* ── Reorder ────────────────────────────────────────────────── */}
          <InputsCard title="Thông Số Đặt Hàng" icon="🔄">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Lead time nhập hàng" unit="ngày">
                <input
                  type="number" min={0}
                  value={inputs.leadTimeDays}
                  onChange={(e) => onChange({ leadTimeDays: parseInt(e.target.value) || 0 })}
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                />
              </FormField>
              <FormField label="Hệ số buffer tồn kho" tooltip="1.5 = 50% buffer an toàn">
                <input
                  type="number" min={1} max={5} step={0.1}
                  value={inputs.safetyStockMultiplier}
                  onChange={(e) => onChange({ safetyStockMultiplier: parseFloat(e.target.value) || 1 })}
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                />
              </FormField>
              <FormField label="Chi phí mỗi lần đặt hàng" unit="₫">
                <PriceInput
                  value={String(inputs.orderingCostPerOrder || '')}
                  onChange={(raw) => onChange({ orderingCostPerOrder: parseInt(raw || '0', 10) })}
                  placeholder="500000"
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                />
              </FormField>
              <FormField label="Chi phí lưu kho / sp / tháng" unit="₫">
                <PriceInput
                  value={String(inputs.holdingCostPerUnitPerMonth || '')}
                  onChange={(raw) => onChange({ holdingCostPerUnitPerMonth: parseInt(raw || '0', 10) })}
                  placeholder="0"
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                />
              </FormField>
            </div>
          </InputsCard>

          {/* ── Payment & collection ───────────────────────────────────── */}
          <InputsCard title="Thanh Toán & Thu Tiền" icon="💳">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Thanh toán trước NCC" unit="%" tooltip="% thanh toán khi đặt hàng">
                <input
                  type="number" min={0} max={100} step={10}
                  value={inputs.supplierUpfrontPct}
                  onChange={(e) => onChange({ supplierUpfrontPct: parseFloat(e.target.value) || 0 })}
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                />
              </FormField>
              <FormField label="Hạn thanh toán NCC" unit="ngày">
                <input
                  type="number" min={0}
                  value={inputs.supplierBalanceDueDays}
                  onChange={(e) => onChange({ supplierBalanceDueDays: parseInt(e.target.value) || 0 })}
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                />
              </FormField>
              <FormField label="Thu tiền Facebook COD" unit="ngày">
                <input
                  type="number" min={0}
                  value={inputs.facebookCollectionLagDays}
                  onChange={(e) => onChange({ facebookCollectionLagDays: parseInt(e.target.value) || 0 })}
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                />
              </FormField>
              <FormField label="Thu tiền TikTok Shop" unit="ngày">
                <input
                  type="number" min={0}
                  value={inputs.tiktokCollectionLagDays}
                  onChange={(e) => onChange({ tiktokCollectionLagDays: parseInt(e.target.value) || 0 })}
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                />
              </FormField>
            </div>
          </InputsCard>

          {/* ── Operating costs ────────────────────────────────────────── */}
          <InputsCard title="Chi Phí Vận Hành" icon="🏭">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Chi phí cố định / tháng" unit="₫">
                <PriceInput
                  value={String(inputs.monthlyFixedOperatingCosts || '')}
                  onChange={(raw) => onChange({ monthlyFixedOperatingCosts: parseInt(raw || '0', 10) })}
                  placeholder="0"
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                />
              </FormField>
              <FormField label="Dự trữ thuế" unit="%" tooltip="% lợi nhuận đặt sang trả thuế">
                <input
                  type="number" min={0} max={50} step={1}
                  value={inputs.taxReserveRatePct}
                  onChange={(e) => onChange({ taxReserveRatePct: parseFloat(e.target.value) || 0 })}
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                />
              </FormField>
              <FormField label="Thu nhập khác / tháng" unit="₫">
                <PriceInput
                  value={String(inputs.otherMonthlyIncome || '')}
                  onChange={(raw) => onChange({ otherMonthlyIncome: parseInt(raw || '0', 10) })}
                  placeholder="0"
                  className={inputCls} style={inputStyle}
                  onFocus={onFocusAccent} onBlur={onBlurDefault}
                />
              </FormField>
            </div>
          </InputsCard>

          {/* ── 6-month sales forecast ─────────────────────────────────── */}
          <InputsCard
            title="Dự Báo Doanh Số 6 Tháng"
            subtitle={isUsingAutoForecast
              ? 'Tự động từ tab Marketing'
              : 'Đang dùng dữ liệu tuỳ chỉnh'}
            icon="📅"
          >
            <button
              onClick={() => setForecastExpanded(v => !v)}
              className="w-full flex items-center justify-between py-1.5 text-xs transition-colors"
              style={{ color: TOKEN.text.muted }}
            >
              <span>{forecastExpanded ? 'Ẩn chi tiết' : 'Xem / chỉnh sửa dự báo'}</span>
              <span>{forecastExpanded ? '▲' : '▼'}</span>
            </button>

            {forecastExpanded && (
              <div className="space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <SectionLabel label="Tháng · Đơn · Doanh thu · Chi ads" />
                  {!isUsingAutoForecast && (
                    <button
                      onClick={() => onChange({ monthlySalesForecast: [] })}
                      className="text-xs px-2 py-0.5 rounded transition-colors"
                      style={{ color: TOKEN.text.ghost, border: `1px solid ${TOKEN.border.muted}` }}
                    >
                      Reset auto
                    </button>
                  )}
                </div>
                {displayForecast.map((entry, idx) => (
                  <ForecastRow
                    key={entry.monthIndex}
                    entry={entry}
                    isAuto={isUsingAutoForecast}
                    onChangeUnits={(v)   => patchForecastRow(idx, { forecastUnits: v })}
                    onChangeRevenue={(v) => patchForecastRow(idx, { forecastRevenue: v })}
                    onChangeSpend={(v)   => patchForecastRow(idx, { marketingSpend: v })}
                  />
                ))}
              </div>
            )}
          </InputsCard>
        </div>
      }
      results={
        <>
          {/* ── KPIs ──────────────────────────────────────────────────── */}
          <ResultsCard
            title="Chỉ Số Tồn Kho"
            icon="📊"
            empty={!hasData}
            emptyMessage="Nhập tồn kho và số dư tiền để xem phân tích"
          >
            {hasData && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard
                    label="Điểm tái đặt hàng"
                    value={`${outputs.reorderPoint} sp`}
                    hint="Tồn kho xuống đây → đặt ngay"
                    variant={inputs.currentInventoryUnits > 0 && inputs.currentInventoryUnits <= outputs.reorderPoint ? 'danger' : 'default'}
                  />
                  <MetricCard
                    label="EOQ tối ưu"
                    value={`${outputs.economicOrderQuantity} sp`}
                    hint="Số lượng đặt mỗi lần"
                    variant="accent"
                  />
                  <MetricCard
                    label="Giá trị tồn kho"
                    value={formatVND(outputs.currentInventoryValue)}
                    hint="Vốn đang nằm trong hàng"
                  />
                  <MetricCard
                    label="DSI"
                    value={`${Math.round(outputs.daysOfSalesInventory)} ngày`}
                    hint="Ngày hàng tồn đủ bán"
                    variant={outputs.daysOfSalesInventory > 90 ? 'warning' : outputs.daysOfSalesInventory < 14 && outputs.daysOfSalesInventory > 0 ? 'danger' : 'default'}
                  />
                  <MetricCard
                    label="Vòng quay / năm"
                    value={`${outputs.inventoryTurnoverAnnual.toFixed(1)}×`}
                    variant={outputs.inventoryTurnoverAnnual >= 12 ? 'success' : 'default'}
                  />
                  <MetricCard
                    label="Cash runway"
                    value={`${outputs.cashRunwayMonths} tháng`}
                    variant={outputs.cashRunwayMonths >= 3 ? 'success' : 'danger'}
                  />
                </div>

                {/* CCC waterfall */}
                <div className="space-y-1">
                  <SectionLabel label="Cash Conversion Cycle" className="mb-2" />
                  <MetricRow label="DSI (ngày hàng tồn)" value={`${Math.round(outputs.daysOfSalesInventory)} ngày`} />
                  <MetricRow label="DSO (ngày thu tiền trung bình)" value={`${Math.round((inputs.facebookCollectionLagDays + inputs.tiktokCollectionLagDays) / 2)} ngày`} />
                  <MetricRow label="− DPO (ngày trả NCC)" value={`${inputs.supplierBalanceDueDays} ngày`} indent />
                  <div className="border-t my-1" style={{ borderColor: TOKEN.border.default }} />
                  <MetricRow
                    label="= CCC"
                    value={`${Math.round(outputs.cashConversionCycleDays)} ngày`}
                    variant={outputs.cashConversionCycleDays <= 0 ? 'success' : outputs.cashConversionCycleDays > 60 ? 'warning' : 'default'}
                  />
                </div>
              </div>
            )}
          </ResultsCard>

          {/* ── 6-month cashflow ───────────────────────────────────────── */}
          {hasData && outputs.cashflowProjection.length > 0 && (
            <ResultsCard title="Dòng Tiền 6 Tháng" icon="💰">
              <div className="space-y-2">
                {outputs.cashflowProjection.map((m) => (
                  <div
                    key={m.monthIndex}
                    className="rounded-lg px-3 py-2.5"
                    style={{
                      background: m.isCritical ? TOKEN.status.dangerBg  : TOKEN.bg.input,
                      border:     `1px solid ${m.isCritical ? TOKEN.status.dangerBorder : TOKEN.border.muted}`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold" style={{ color: m.isCritical ? TOKEN.status.danger : TOKEN.text.muted }}>
                        {m.label} {m.isCritical && '⚠️'}
                      </span>
                      <span className="text-sm font-bold" style={{ color: m.closingBalance >= 0 ? TOKEN.text.success : TOKEN.text.danger }}>
                        {formatVND(m.closingBalance)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <div>
                        <p className="text-[10px]" style={{ color: TOKEN.text.ghost }}>Thu vào</p>
                        <p className="text-xs font-medium" style={{ color: TOKEN.text.success }}>+{formatVND(m.collectedCash)}</p>
                      </div>
                      <div>
                        <p className="text-[10px]" style={{ color: TOKEN.text.ghost }}>Chi ra</p>
                        <p className="text-xs font-medium" style={{ color: TOKEN.text.danger }}>−{formatVND(m.operatingCosts + m.marketingSpend + m.inventoryPurchaseCost)}</p>
                      </div>
                      <div>
                        <p className="text-[10px]" style={{ color: TOKEN.text.ghost }}>Net</p>
                        <p className="text-xs font-medium" style={{ color: m.netCashflow >= 0 ? TOKEN.text.accent : TOKEN.text.danger }}>
                          {m.netCashflow >= 0 ? '+' : ''}{formatVND(m.netCashflow)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <MetricRow label="Mức dự trữ tiền tối thiểu cần có" value={formatVND(outputs.minimumCashReserveNeeded)} variant="warning" />
              </div>
            </ResultsCard>
          )}

          <InsightsCard title="Nhận Xét Tồn Kho & Dòng Tiền" icon="💡" items={insights} />
          <WarningsCard items={warnings} />
        </>
      }
    />
  );
}
