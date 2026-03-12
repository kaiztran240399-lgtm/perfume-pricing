/**
 * PricingWarnings — Actionable risk alerts for the Pricing tab.
 *
 * Checks for pricing errors and dangerous configurations that would
 * lead to losses or invalid calculations.
 */

import type { PricingInputs, PricingOutputs } from '../../../types';
import { WarningsCard } from '../../cards/WarningsCard';
import type { WarningItem } from '../../cards/WarningsCard';
import { formatVND } from '../../../lib/finance';

export interface PricingWarningsProps {
  inputs:  PricingInputs;
  outputs: PricingOutputs;
}

export function PricingWarnings({ inputs, outputs }: PricingWarningsProps) {
  const warnings: WarningItem[] = [];

  // 1. No purchase price
  if (inputs.purchasePrice <= 0) {
    warnings.push({
      id:       'no-price',
      severity: 'notice',
      title:    'Chưa nhập giá nhập',
      detail:   'Vui lòng nhập giá nhập để tính giá bán.',
    });
  }

  // 2. Invalid margin (>= 100)
  if (inputs.targetMarginPct >= 100) {
    warnings.push({
      id:       'margin-too-high',
      severity: 'critical',
      title:    'Tỉ lệ lợi nhuận ≥ 100% — không hợp lệ',
      detail:   'Công thức giá bán = giá vốn ÷ (1 − lợi nhuận%) không hoạt động khi lợi nhuận ≥ 100%. Nhập giá trị từ 0–99%.',
    });
  }

  // 3. Selling price below purchase price (only when calculated)
  if (inputs.purchasePrice > 0 && outputs.sellingPriceRounded < outputs.effectivePurchasePrice) {
    warnings.push({
      id:       'price-below-cost',
      severity: 'critical',
      title:    'Giá bán thấp hơn giá nhập',
      detail:   `Giá bán ${formatVND(outputs.sellingPriceRounded)} < Giá nhập ${formatVND(outputs.effectivePurchasePrice)}. Kiểm tra lại tỉ lệ lợi nhuận và các chi phí.`,
    });
  }

  // 4. Negative gross profit
  if (inputs.purchasePrice > 0 && outputs.grossProfitPerUnit < 0) {
    warnings.push({
      id:       'negative-profit',
      severity: 'critical',
      title:    'Lợi nhuận gộp âm',
      detail:   `Mỗi sản phẩm đang lỗ ${formatVND(Math.abs(outputs.grossProfitPerUnit))}. Tăng giá bán hoặc giảm chi phí.`,
    });
  }

  // 5. Decant: missing sizes
  if (inputs.productType === 'chiet') {
    if (inputs.bottleSizeMl <= 0 || inputs.decantSizeMl <= 0) {
      warnings.push({
        id:       'chiet-missing-size',
        severity: 'warning',
        title:    'Thiếu thông tin kích thước lọ chiết',
        detail:   'Nhập dung tích chai gốc và lọ chiết để tính giá nhập mỗi lọ chính xác.',
      });
    } else if (inputs.decantSizeMl >= inputs.bottleSizeMl) {
      warnings.push({
        id:       'chiet-size-invalid',
        severity: 'warning',
        title:    'Dung tích lọ chiết ≥ chai gốc',
        detail:   `Lọ chiết ${inputs.decantSizeMl}ml không thể lớn hơn hoặc bằng chai gốc ${inputs.bottleSizeMl}ml.`,
      });
    }
  }

  // 6. Zero margin
  if (inputs.purchasePrice > 0 && inputs.targetMarginPct === 0) {
    warnings.push({
      id:       'zero-margin',
      severity: 'warning',
      title:    'Tỉ lệ lợi nhuận = 0%',
      detail:   'Bạn đang bán theo giá vốn, không có lợi nhuận. Đây có phải ý định không?',
    });
  }

  return <WarningsCard items={warnings} title="Cảnh Báo Tính Giá" />;
}
