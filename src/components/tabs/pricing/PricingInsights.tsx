/**
 * PricingInsights — Key analytical observations for the Pricing tab.
 *
 * Insights are derived purely from inputs + outputs and are recalculated
 * on every render. Displayed in an InsightsCard.
 */

import type { PricingInputs, PricingOutputs } from '../../../types/business-calculator';
import { InsightsCard } from '../../cards/InsightsCard';
import type { InsightItem } from '../../cards/InsightsCard';
import { formatVND, formatPct } from '../../../lib/finance';

export interface PricingInsightsProps {
  inputs:  PricingInputs;
  outputs: PricingOutputs;
}

export function PricingInsights({ inputs, outputs }: PricingInsightsProps) {
  if (inputs.purchasePrice <= 0) return null;

  const insights: InsightItem[] = [];

  // 1. Rounding delta
  const delta = outputs.sellingPriceRounded - outputs.sellingPriceExact;
  if (Math.abs(delta) > 0) {
    insights.push({
      id:    'rounding',
      level: delta >= 0 ? 'info' : 'tip',
      text:  `Giá bán làm tròn ${formatVND(outputs.sellingPriceRounded)} (chênh lệch ${delta >= 0 ? '+' : ''}${formatVND(delta)} so với giá chính xác ${formatVND(outputs.sellingPriceExact)}).`,
    });
  }

  // 2. Margin accuracy
  const marginDiff = outputs.grossMarginPct - inputs.targetMarginPct;
  if (Math.abs(marginDiff) > 0.5) {
    insights.push({
      id:    'margin-actual',
      level: marginDiff >= 0 ? 'success' : 'info',
      text:  `Tỉ lệ lợi nhuận thực tế là ${formatPct(outputs.grossMarginPct)}${
        marginDiff >= 0
          ? ` — cao hơn mục tiêu ${formatPct(marginDiff)}`
          : ` — thấp hơn mục tiêu ${formatPct(Math.abs(marginDiff))} do làm tròn giá`
      }.`,
    });
  }

  // 3. Cost share of purchase price
  if (outputs.totalCostPerUnit > 0) {
    const costSharePct = (outputs.totalCostPerUnit / outputs.effectivePurchasePrice) * 100;
    if (costSharePct > 30) {
      insights.push({
        id:    'cost-share',
        level: costSharePct > 60 ? 'warning' : 'tip',
        text:  `Chi phí phụ chiếm ${formatPct(costSharePct)} giá nhập — hãy rà soát các khoản có thể giảm.`,
      });
    }
  }

  // 4. Decant mode: price per ml
  if (inputs.productType === 'chiet' && inputs.bottleSizeMl > 0) {
    const pricePerMl = outputs.effectivePurchasePrice / inputs.decantSizeMl;
    const costPerMl  = outputs.costBase / inputs.decantSizeMl;
    insights.push({
      id:    'per-ml',
      level: 'info',
      text:  `Giá nhập / ml: ${formatVND(pricePerMl)} — Giá vốn / ml: ${formatVND(costPerMl)}.`,
    });
  }

  // 5. High margin (> 50%)
  if (outputs.grossMarginPct > 50) {
    insights.push({
      id:    'high-margin',
      level: 'success',
      text:  `Lợi nhuận gộp ${formatPct(outputs.grossMarginPct)} — rất cao. Hãy kiểm tra xem giá bán có còn cạnh tranh không.`,
    });
  }

  if (insights.length === 0) return null;

  return (
    <InsightsCard
      title="Nhận Xét Tính Giá"
      icon="💡"
      items={insights}
    />
  );
}
