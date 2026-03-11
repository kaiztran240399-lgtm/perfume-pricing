/**
 * ScenariosTab — What-if scenario P&L comparison + sensitivity tornado.
 *
 * Shows 3 columns (Base / A / B) with full P&L and delta analysis.
 * Renders a sensitivity ranking to identify the highest-impact levers.
 */

import type { ScenarioInputs, ScenarioOutputs, ScenarioLevers } from '../../../types/business-calculator';
import { ScenarioType } from '../../../types/business-calculator';
import { TabLayout } from '../../layout/TabLayout';
import { InputsCard } from '../../cards/InputsCard';
import { ResultsCard } from '../../cards/ResultsCard';
import { InsightsCard } from '../../cards/InsightsCard';
import type { InsightItem } from '../../cards/InsightsCard';
import { MetricRow } from '../../ui/MetricCard';
import { DeltaBadge } from '../../ui/DeltaBadge';
import { SectionLabel } from '../../ui/SectionLabel';
import { inputStyle, onFocusAccent, onBlurDefault } from '../../ui/FormField';
import { TOKEN } from '../../ui/tokens';
import PriceInput from '../../PriceInput';
import { formatVND, formatPct } from '../../../lib/finance';

export interface ScenariosTabProps {
  inputs:   ScenarioInputs;
  outputs:  ScenarioOutputs;
  onChange: (patch: Partial<ScenarioInputs>) => void;
}

// ── Lever row: editable field for scenario A/B ────────────────────────────────

interface LeverRowProps {
  label:       string;
  leverKey:    keyof ScenarioLevers;
  baseValue:   number;
  scenarioAValue?: number;
  scenarioBValue?: number;
  isVND?:      boolean;
  isPct?:      boolean;
  onChangeA:   (v: number) => void;
  onChangeB:   (v: number) => void;
}

function LeverRow({ label, leverKey: _leverKey, baseValue, scenarioAValue, scenarioBValue, isVND, isPct, onChangeA, onChangeB }: LeverRowProps) {
  const formatVal = (v: number | undefined) => {
    if (v === undefined) return '';
    if (isVND) return String(v);
    return String(v);
  };

  return (
    <div className="grid grid-cols-4 gap-2 items-center py-1.5 border-b" style={{ borderColor: TOKEN.border.default }}>
      <span className="text-xs col-span-1" style={{ color: TOKEN.text.muted }}>{label}</span>
      {/* Base */}
      <div className="text-xs text-right" style={{ color: TOKEN.text.primary }}>
        {isVND ? formatVND(baseValue) : isPct ? `${baseValue}%` : baseValue}
      </div>
      {/* Scenario A input */}
      <div>
        {isVND ? (
          <PriceInput
            value={formatVal(scenarioAValue)}
            onChange={(raw) => onChangeA(parseInt(raw || '0', 10))}
            placeholder={String(baseValue)}
            className="w-full px-2 py-1 rounded text-xs border focus:outline-none"
            style={inputStyle}
            onFocus={onFocusAccent}
            onBlur={onBlurDefault}
          />
        ) : (
          <input
            type="number" step={isPct ? 0.5 : 1}
            value={scenarioAValue ?? ''}
            onChange={(e) => onChangeA(parseFloat(e.target.value) || 0)}
            placeholder={String(baseValue)}
            className="w-full px-2 py-1 rounded text-xs border focus:outline-none"
            style={inputStyle}
            onFocus={onFocusAccent}
            onBlur={onBlurDefault}
          />
        )}
      </div>
      {/* Scenario B input */}
      <div>
        {isVND ? (
          <PriceInput
            value={formatVal(scenarioBValue)}
            onChange={(raw) => onChangeB(parseInt(raw || '0', 10))}
            placeholder={String(baseValue)}
            className="w-full px-2 py-1 rounded text-xs border focus:outline-none"
            style={inputStyle}
            onFocus={onFocusAccent}
            onBlur={onBlurDefault}
          />
        ) : (
          <input
            type="number" step={isPct ? 0.5 : 1}
            value={scenarioBValue ?? ''}
            onChange={(e) => onChangeB(parseFloat(e.target.value) || 0)}
            placeholder={String(baseValue)}
            className="w-full px-2 py-1 rounded text-xs border focus:outline-none"
            style={inputStyle}
            onFocus={onFocusAccent}
            onBlur={onBlurDefault}
          />
        )}
      </div>
    </div>
  );
}

// helper to patch scenario overrides
function patchA(inputs: ScenarioInputs, patch: Partial<ScenarioLevers>, onChange: (p: Partial<ScenarioInputs>) => void) {
  onChange({ scenarioA: { ...inputs.scenarioA, ...patch } });
}
function patchB(inputs: ScenarioInputs, patch: Partial<ScenarioLevers>, onChange: (p: Partial<ScenarioInputs>) => void) {
  onChange({ scenarioB: { ...inputs.scenarioB, ...patch } });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ScenariosTab({ inputs, outputs, onChange }: ScenariosTabProps) {
  const hasData = inputs.base.sellingPrice > 0;

  const base = inputs.base;
  const sA   = inputs.scenarioA;
  const sB   = inputs.scenarioB;

  const insights: InsightItem[] = [];

  if (hasData) {
    insights.push({
      id:    'recommendation',
      level: 'tip',
      text:  `Khuyến nghị: ${outputs.recommendationReason}`,
    });

    const topLever = outputs.sensitivityRanking[0];
    if (topLever) {
      insights.push({
        id:    'top-lever',
        level: 'info',
        text:  `Đòn bẩy nhạy cảm nhất: "${topLever.leverLabel}" — 1% thay đổi làm lợi nhuận biến động ${topLever.impactPct.toFixed(1)}%.`,
      });
    }
  }

  // Recommended scenario color
  const recColor: Record<ScenarioType, string> = {
    [ScenarioType.BASE]: TOKEN.text.primary,
    [ScenarioType.A]:    TOKEN.tabs.marketing,
    [ScenarioType.B]:    TOKEN.tabs.ltv,
  };

  return (
    <TabLayout
      inputs={
        <div className="space-y-3">
          <InputsCard
            title="Thông Số Kịch Bản"
            subtitle="Cột Base tự động từ các tab khác. Điền A và B để so sánh."
            icon="🔮"
          >
            {/* Header */}
            <div className="grid grid-cols-4 gap-2 mb-1">
              <span className="text-xs font-bold col-span-1" style={{ color: TOKEN.text.ghost }}>Chỉ số</span>
              <span className="text-xs font-bold text-center" style={{ color: TOKEN.text.muted }}>Base</span>
              <span className="text-xs font-bold text-center" style={{ color: TOKEN.tabs.marketing }}>Kịch bản A</span>
              <span className="text-xs font-bold text-center" style={{ color: TOKEN.tabs.ltv }}>Kịch bản B</span>
            </div>

            <LeverRow
              label="Giá bán" leverKey="sellingPrice" baseValue={base.sellingPrice}
              scenarioAValue={sA.sellingPrice} scenarioBValue={sB.sellingPrice}
              isVND
              onChangeA={(v) => patchA(inputs, { sellingPrice: v }, onChange)}
              onChangeB={(v) => patchB(inputs, { sellingPrice: v }, onChange)}
            />
            <LeverRow
              label="Số đơn/tháng" leverKey="monthlyUnitsSold" baseValue={base.monthlyUnitsSold}
              scenarioAValue={sA.monthlyUnitsSold} scenarioBValue={sB.monthlyUnitsSold}
              onChangeA={(v) => patchA(inputs, { monthlyUnitsSold: v }, onChange)}
              onChangeB={(v) => patchB(inputs, { monthlyUnitsSold: v }, onChange)}
            />
            <LeverRow
              label="Giá nhập" leverKey="purchasePrice" baseValue={base.purchasePrice}
              scenarioAValue={sA.purchasePrice} scenarioBValue={sB.purchasePrice}
              isVND
              onChangeA={(v) => patchA(inputs, { purchasePrice: v }, onChange)}
              onChangeB={(v) => patchB(inputs, { purchasePrice: v }, onChange)}
            />
            <LeverRow
              label="Chi phí ads" leverKey="monthlyAdSpend" baseValue={base.monthlyAdSpend}
              scenarioAValue={sA.monthlyAdSpend} scenarioBValue={sB.monthlyAdSpend}
              isVND
              onChangeA={(v) => patchA(inputs, { monthlyAdSpend: v }, onChange)}
              onChangeB={(v) => patchB(inputs, { monthlyAdSpend: v }, onChange)}
            />
            <LeverRow
              label="Tỉ lệ hoàn hàng %" leverKey="returnRatePct" baseValue={base.returnRatePct}
              scenarioAValue={sA.returnRatePct} scenarioBValue={sB.returnRatePct}
              isPct
              onChangeA={(v) => patchA(inputs, { returnRatePct: v }, onChange)}
              onChangeB={(v) => patchB(inputs, { returnRatePct: v }, onChange)}
            />
            <LeverRow
              label="Chi phí cố định" leverKey="monthlyFixedCosts" baseValue={base.monthlyFixedCosts}
              scenarioAValue={sA.monthlyFixedCosts} scenarioBValue={sB.monthlyFixedCosts}
              isVND
              onChangeA={(v) => patchA(inputs, { monthlyFixedCosts: v }, onChange)}
              onChangeB={(v) => patchB(inputs, { monthlyFixedCosts: v }, onChange)}
            />

            {/* Reset buttons */}
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => onChange({ scenarioA: {} })}
                className="flex-1 py-1.5 rounded-lg text-xs transition-colors"
                style={{ background: TOKEN.accent.glow, color: TOKEN.text.accent, border: `1px solid ${TOKEN.border.accent}` }}
              >
                Reset A
              </button>
              <button
                onClick={() => onChange({ scenarioB: {} })}
                className="flex-1 py-1.5 rounded-lg text-xs transition-colors"
                style={{ background: TOKEN.status.infoBg, color: TOKEN.status.info, border: `1px solid ${TOKEN.status.infoBorder}` }}
              >
                Reset B
              </button>
            </div>
          </InputsCard>
        </div>
      }
      results={
        <>
          {/* P&L comparison */}
          <ResultsCard title="So Sánh P&L" icon="📊" empty={!hasData} emptyMessage="Tab này tự động lấy dữ liệu từ các tab khác">
            {hasData && (
              <div className="space-y-3">
                {/* Recommended banner */}
                <div
                  className="rounded-lg px-3 py-2 text-xs font-medium"
                  style={{ background: TOKEN.accent.glow, color: recColor[outputs.recommendedScenario], border: `1px solid ${TOKEN.border.accent}` }}
                >
                  🏆 Khuyến nghị: Kịch bản {outputs.recommendedScenario === ScenarioType.BASE ? 'Base' : outputs.recommendedScenario.toUpperCase()}
                </div>

                {/* Column headers */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Base',       metrics: outputs.base,      delta: null,                   color: TOKEN.text.primary  },
                    { label: 'Kịch bản A', metrics: outputs.scenarioA,  delta: outputs.deltaAVsBase,  color: TOKEN.tabs.marketing },
                    { label: 'Kịch bản B', metrics: outputs.scenarioB,  delta: outputs.deltaBVsBase,  color: TOKEN.tabs.ltv      },
                  ].map(({ label, metrics, delta, color }) => (
                    <div
                      key={label}
                      className="rounded-xl p-3 space-y-2"
                      style={{ background: TOKEN.bg.input, border: `1px solid ${TOKEN.border.muted}` }}
                    >
                      <p className="text-xs font-bold" style={{ color }}>{label}</p>

                      <div>
                        <p className="text-xs" style={{ color: TOKEN.text.ghost }}>Doanh thu ròng</p>
                        <p className="text-sm font-bold" style={{ color: TOKEN.text.primary }}>{formatVND(metrics.netRevenue)}</p>
                        {delta && <DeltaBadge deltaVnd={delta.grossRevenueDelta} deltaPct={delta.grossRevenueDeltaPct} size="sm" />}
                      </div>

                      <div>
                        <p className="text-xs" style={{ color: TOKEN.text.ghost }}>Lợi nhuận hoạt động</p>
                        <p className="text-sm font-bold" style={{ color: metrics.operatingProfit >= 0 ? TOKEN.text.success : TOKEN.text.danger }}>
                          {formatVND(metrics.operatingProfit)}
                        </p>
                        {delta && <DeltaBadge deltaVnd={delta.operatingProfitDelta} deltaPct={delta.operatingProfitDeltaPct} size="sm" />}
                      </div>

                      <div>
                        <p className="text-xs" style={{ color: TOKEN.text.ghost }}>Biên OP</p>
                        <p className="text-sm font-bold" style={{ color: TOKEN.text.accent }}>
                          {formatPct(metrics.operatingMarginPct)}
                          {delta && delta.marginDeltaPpt !== 0 && (
                            <span className="ml-1 text-xs" style={{ color: delta.marginDeltaPpt > 0 ? TOKEN.text.success : TOKEN.text.danger }}>
                              {delta.marginDeltaPpt > 0 ? '+' : ''}{delta.marginDeltaPpt.toFixed(1)} ppt
                            </span>
                          )}
                        </p>
                      </div>

                      <MetricRow label="ROAS" value={`${metrics.roas.toFixed(1)}×`} />
                      <MetricRow label="Break-even" value={metrics.breakEvenUnits === Number.MAX_SAFE_INTEGER ? 'N/A' : `${metrics.breakEvenUnits} đơn`} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ResultsCard>

          {/* Tornado chart */}
          {hasData && outputs.sensitivityRanking.length > 0 && (
            <ResultsCard title="Đòn Bẩy Nhạy Cảm Nhất" icon="🌪️">
              <div className="space-y-2">
                <SectionLabel label="% Thay Đổi Lợi Nhuận Khi Lever +1%" className="mb-2" />
                {outputs.sensitivityRanking.slice(0, 7).map((entry) => {
                  const maxPct = outputs.sensitivityRanking[0]?.impactPct || 1;
                  const barWidth = Math.min(100, (entry.impactPct / maxPct) * 100);
                  const barColor = entry.direction === 'positive' ? TOKEN.status.success : TOKEN.status.danger;

                  return (
                    <div key={entry.lever} className="space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: TOKEN.text.muted }}>
                          <span className="mr-1 text-zinc-500">#{entry.rank}</span>
                          {entry.leverLabel}
                        </span>
                        <span className="text-xs font-medium" style={{ color: barColor }}>
                          {entry.direction === 'positive' ? '+' : '−'}{entry.impactPct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: TOKEN.bg.hover }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${barWidth}%`, background: barColor }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ResultsCard>
          )}

          <InsightsCard title="Nhận Xét Kịch Bản" icon="💡" items={insights} />
        </>
      }
    />
  );
}
