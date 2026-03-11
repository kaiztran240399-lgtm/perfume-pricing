/**
 * PricingResultsPanel — Displays all computed PricingOutputs.
 *
 * Layout:
 *   1. Hero card: Giá bán đề xuất (rounded)
 *   2. 2×2 metric grid: effectivePurchasePrice, costBase, grossMargin, grossProfit
 *   3. Cost breakdown table: each resolved cost line
 *   4. Price comparison: exact vs rounded
 */

import type { PricingInputs, PricingOutputs } from '../../../types/business-calculator';
import { ResultsCard } from '../../cards/ResultsCard';
import { MetricCard, MetricRow } from '../../ui/MetricCard';
import { SectionLabel } from '../../ui/SectionLabel';
import { TOKEN } from '../../ui/tokens';
import { formatVND, formatPct } from '../../../lib/finance';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface PricingResultsPanelProps {
  inputs:  PricingInputs;
  outputs: PricingOutputs;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const isEmpty = (inputs: PricingInputs) =>
  inputs.purchasePrice <= 0;

// ── Component ─────────────────────────────────────────────────────────────────

export function PricingResultsPanel({ inputs, outputs }: PricingResultsPanelProps) {
  if (isEmpty(inputs)) {
    return (
      <ResultsCard
        title="Kết Quả Tính Giá"
        icon="💡"
        empty
        emptyMessage="Nhập giá nhập để xem kết quả"
      />
    );
  }

  const isChiet = inputs.productType === 'chiet';

  return (
    <div className="space-y-3">
      {/* ── Hero: selling price ──────────────────────────────────────────────── */}
      <ResultsCard title="Giá Bán Đề Xuất" icon="🏷️">
        <MetricCard
          label="Giá bán (đã làm tròn)"
          value={formatVND(outputs.sellingPriceRounded)}
          subValue={`Chính xác: ${formatVND(outputs.sellingPriceExact)}`}
          hint={`Lợi nhuận mục tiêu: ${inputs.targetMarginPct}%`}
          variant="accent"
          hero
        />
      </ResultsCard>

      {/* ── Key metrics grid ─────────────────────────────────────────────────── */}
      <ResultsCard title="Phân Tích Giá Vốn" icon="📊">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <MetricCard
            label={isChiet ? 'Giá nhập / lọ chiết' : 'Giá nhập'}
            value={formatVND(outputs.effectivePurchasePrice)}
            hint={isChiet ? `${inputs.decantSizeMl}ml / ${inputs.bottleSizeMl}ml` : undefined}
            variant="default"
          />
          <MetricCard
            label="Giá vốn"
            value={formatVND(outputs.costBase)}
            hint="Giá nhập + tất cả chi phí"
            variant="default"
          />
          <MetricCard
            label="Lợi nhuận gộp / sản phẩm"
            value={formatVND(outputs.grossProfitPerUnit)}
            variant={outputs.grossProfitPerUnit > 0 ? 'success' : 'danger'}
          />
          <MetricCard
            label="Tỉ lệ lợi nhuận gộp"
            value={formatPct(outputs.grossMarginPct)}
            hint="Trên giá bán chính xác"
            variant={
              outputs.grossMarginPct >= inputs.targetMarginPct - 0.5
                ? 'success'
                : outputs.grossMarginPct > 0
                ? 'warning'
                : 'danger'
            }
          />
        </div>

        {/* Cost breakdown */}
        {outputs.costsBreakdown.length > 0 && (
          <div className="space-y-1.5">
            <SectionLabel label="Chi Phí Chi Tiết" className="mb-2" />

            {/* Purchase price row */}
            <MetricRow
              label="Giá nhập"
              value={formatVND(outputs.effectivePurchasePrice)}
            />

            {/* Cost lines */}
            {outputs.costsBreakdown.map((line, i) => (
              <MetricRow
                key={i}
                label={`${line.name}${line.isPercentage && line.rate !== undefined ? ` (${line.rate}%)` : ''}`}
                value={formatVND(line.amount)}
                indent
              />
            ))}

            {/* Divider */}
            <div
              className="border-t my-2"
              style={{ borderColor: TOKEN.border.default }}
            />

            {/* Total */}
            <MetricRow
              label="Giá vốn"
              value={formatVND(outputs.costBase)}
              variant="accent"
            />
            <MetricRow
              label="→ Giá bán (làm tròn)"
              value={formatVND(outputs.sellingPriceRounded)}
              variant="accent"
            />
          </div>
        )}
      </ResultsCard>

      {/* ── Cost type split ──────────────────────────────────────────────────── */}
      {(outputs.variableCostFixedAmount > 0 || outputs.variableCostPctAmount > 0) && (
        <ResultsCard title="Cơ Cấu Chi Phí" icon="🔍">
          <div className="space-y-1.5">
            <MetricRow
              label="Chi phí cố định (₫)"
              value={formatVND(outputs.variableCostFixedAmount)}
            />
            <MetricRow
              label="Chi phí % trên giá nhập"
              value={formatVND(outputs.variableCostPctAmount)}
            />
            <div
              className="border-t my-1.5"
              style={{ borderColor: TOKEN.border.default }}
            />
            <MetricRow
              label="Tổng chi phí / sản phẩm"
              value={formatVND(outputs.totalCostPerUnit)}
              variant="accent"
            />
          </div>
        </ResultsCard>
      )}
    </div>
  );
}
