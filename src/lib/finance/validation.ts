/**
 * lib/finance/validation.ts — Cross-domain financial validation engine.
 *
 * Unlike computeXxxWarnings() which operate on a single domain,
 * this engine can compare metrics across tabs:
 *   - blendedCac (Marketing) vs maxViableCac (LTV)
 *   - blendedRoas (Marketing) vs breakEvenRoas (derived from Pricing margin)
 *   - LTV:CAC (LTV) classified at 1.5 / 3 thresholds
 *
 * The 12 rules are grouped by domain and return ValidationResult[],
 * which includes 'healthy' severity (green lights) in addition to
 * 'caution' and 'danger'.
 *
 * Consumed by useBusinessCalculatorDerived → stored in
 * BusinessCalculatorDerived.validation → surfaced per tab via calcWarningBridge.
 */

import type { BusinessCalculatorDerived } from '../../types/calculator';
import { ValidationDomain } from '../../types/validation';
import type { ValidationResult } from '../../types/validation';
import { safeDivide } from './shared';

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN: UNIT ECONOMICS (rules 1–4)
// ─────────────────────────────────────────────────────────────────────────────

function validateUnitEconomics(
  ue: BusinessCalculatorDerived['unitEconomics'],
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const domain = ValidationDomain.UNIT_ECONOMICS;

  // Rule 1 — Contribution margin negative
  if (ue.contributionMarginPerUnit < 0) {
    results.push({
      id:             'ue-cm-negative',
      severity:       'danger',
      domain,
      message:        'Contribution margin âm — mỗi đơn bán đang lỗ tiền mặt.',
      recommendation: 'Kiểm tra ngay chi phí quảng cáo và chi phí biến đổi. Dừng ads cho đến khi CM > 0.',
    });
  }
  // Rule 2 — CM ratio low (but positive)
  else if (ue.contributionMarginRatioPct > 0 && ue.contributionMarginRatioPct < 15) {
    results.push({
      id:             'ue-cm-low',
      severity:       'caution',
      domain,
      message:        `CM ratio ${ue.contributionMarginRatioPct.toFixed(1)}% — thấp hơn ngưỡng 15%.`,
      recommendation: 'Tìm cách giảm CAC (tối ưu ads) hoặc tăng giá bán để cải thiện CM ratio.',
    });
  }
  // Rule 4 — CM ratio healthy (≥ 25%)
  else if (ue.contributionMarginRatioPct >= 25) {
    results.push({
      id:             'ue-cm-healthy',
      severity:       'healthy',
      domain,
      message:        `CM ratio ${ue.contributionMarginRatioPct.toFixed(1)}% — biên đóng góp tốt.`,
      recommendation: 'Duy trì chi phí và tiếp tục tối ưu mix sản phẩm.',
    });
  }

  // Rule 3 — Cannot break even
  if (ue.breakEvenUnitsPerMonth === Number.MAX_SAFE_INTEGER) {
    results.push({
      id:             'ue-no-break-even',
      severity:       'danger',
      domain,
      message:        'Không thể hoà vốn — contribution margin ≤ 0 không thể bù đắp chi phí cố định.',
      recommendation: 'Ưu tiên đưa CM về dương trước khi mở rộng quy mô.',
    });
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN: MARKETING (rules 5–7)
// ─────────────────────────────────────────────────────────────────────────────

function validateMarketing(
  marketing: BusinessCalculatorDerived['marketing'],
  ltv:       BusinessCalculatorDerived['ltv'],
  grossMarginPct: number,
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const domain = ValidationDomain.MARKETING;

  const blendedRoas  = marketing.blended.blendedRoas;
  const blendedCac   = marketing.blended.blendedCac;
  const maxViableCac = ltv.maxViableCac;

  // Break-even ROAS = 1 / grossMarginDecimal
  // e.g. 30% margin → breakEvenRoas = 1 / 0.30 = 3.33×
  const breakEvenRoas = grossMarginPct > 0
    ? safeDivide(100, grossMarginPct, 0)
    : 0;

  // Rule 5 — ROAS below break-even
  if (blendedRoas > 0 && breakEvenRoas > 0 && blendedRoas < breakEvenRoas) {
    results.push({
      id:             'mkt-roas-below-breakeven',
      severity:       'danger',
      domain,
      message:        `ROAS ${blendedRoas.toFixed(1)}× dưới điểm hoà vốn ${breakEvenRoas.toFixed(1)}× — quảng cáo đang lỗ ở biên lợi nhuận gộp.`,
      recommendation: `Cần ROAS ≥ ${breakEvenRoas.toFixed(1)}× để bù đắp COGS. Tối ưu creative hoặc giảm CPC.`,
    });
  }

  // Rule 6 — Blended CAC exceeds max viable CAC from LTV model
  if (maxViableCac > 0 && blendedCac > maxViableCac) {
    results.push({
      id:             'mkt-cac-over-max',
      severity:       'danger',
      domain,
      message:        `CAC thực tế ${Math.round(blendedCac).toLocaleString('vi-VN')} ₫ vượt CAC tối đa ${Math.round(maxViableCac).toLocaleString('vi-VN')} ₫ từ mô hình LTV:CAC 3:1.`,
      recommendation: 'Giảm CAC bằng cách tối ưu funnel quảng cáo, hoặc cải thiện LTV qua tăng AOV / tần suất mua.',
    });
  }

  // Rule 7 — ROAS healthy (≥ 3×)
  if (blendedRoas >= 3) {
    results.push({
      id:             'mkt-roas-healthy',
      severity:       'healthy',
      domain,
      message:        `Blended ROAS ${blendedRoas.toFixed(1)}× — hiệu quả quảng cáo tốt.`,
      recommendation: 'Có thể cân nhắc tăng ngân sách để scale doanh thu.',
    });
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN: LTV (rules 8–10)
// ─────────────────────────────────────────────────────────────────────────────

function validateLTV(
  ltv: BusinessCalculatorDerived['ltv'],
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const domain = ValidationDomain.LTV;
  const ratio = ltv.ltvCacRatio;

  if (ratio <= 0) return results; // no CAC data yet

  // Rule 8 — LTV:CAC < 1.5 → danger
  if (ratio < 1.5) {
    results.push({
      id:             'ltv-cac-danger',
      severity:       'danger',
      domain,
      message:        `LTV:CAC = ${ratio.toFixed(2)} — đang lỗ hoặc hoà vốn trên mỗi khách hàng thu hút được.`,
      recommendation: 'Tăng LTV qua giữ chân khách (retention) hoặc giảm CAC. Tỉ lệ mục tiêu tối thiểu ≥ 1.5.',
    });
  }
  // Rule 9 — LTV:CAC 1.5–3 → caution
  else if (ratio < 3) {
    results.push({
      id:             'ltv-cac-caution',
      severity:       'caution',
      domain,
      message:        `LTV:CAC = ${ratio.toFixed(2)} — dưới ngưỡng bền vững 3:1.`,
      recommendation: 'Cải thiện retention rate hoặc upsell để đưa LTV:CAC lên ≥ 3 trước khi scale ads.',
    });
  }
  // Rule 10 — LTV:CAC ≥ 3 → healthy
  else {
    results.push({
      id:             'ltv-cac-healthy',
      severity:       'healthy',
      domain,
      message:        `LTV:CAC = ${ratio.toFixed(2)} — kinh tế đơn vị lành mạnh.`,
      recommendation: 'Có thể đầu tư mạnh hơn vào acquisition. Theo dõi retention để duy trì LTV.',
    });
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN: INVENTORY (rules 11–12)
// ─────────────────────────────────────────────────────────────────────────────

function validateInventory(
  inventory: BusinessCalculatorDerived['inventory'],
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const domain = ValidationDomain.INVENTORY;
  const dsi = inventory.daysOfSalesInventory;

  if (dsi <= 0) return results; // no inventory data

  // Rule 12 — Dead stock risk (> 180 days = ~6 months)
  if (dsi > 180) {
    results.push({
      id:             'inv-dead-stock',
      severity:       'danger',
      domain,
      message:        `Tồn kho ${Math.round(dsi)} ngày bán — nguy cơ hàng tồn chết (dead stock > 15%).`,
      recommendation: 'Xem xét thanh lý hoặc bundle sản phẩm, giảm lệnh nhập hàng tiếp theo.',
    });
  }
  // Rule 11 — High inventory days (> 120 days)
  else if (dsi > 120) {
    results.push({
      id:             'inv-high-dsi',
      severity:       'caution',
      domain,
      message:        `Tồn kho ${Math.round(dsi)} ngày bán — vốn lưu động bị giam quá lâu.`,
      recommendation: 'Giảm lượng đặt hàng hoặc đẩy mạnh marketing để tăng tốc vòng quay hàng.',
    });
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run all 12 cross-domain financial validation rules.
 *
 * Accepts `Omit<BusinessCalculatorDerived, 'validation'>` so the hook can
 * call this with the partial derived object before the validation field exists.
 *
 * Returns a flat list of ValidationResult sorted by severity:
 *   danger → caution → healthy
 *
 * Results include both actionable warnings (danger/caution) and
 * positive health confirmations (healthy) so tabs can show green lights.
 */
export function runFinancialValidation(
  derived: Omit<BusinessCalculatorDerived, 'validation'>,
): ValidationResult[] {
  const { unitEconomics, marketing, ltv, inventory, pricing } = derived;

  const all: ValidationResult[] = [
    ...validateUnitEconomics(unitEconomics),
    ...validateMarketing(marketing, ltv, pricing.grossMarginPct),
    ...validateLTV(ltv),
    ...validateInventory(inventory),
  ];

  // Sort: danger first, then caution, then healthy
  const order: Record<ValidationResult['severity'], number> = {
    danger:  0,
    caution: 1,
    healthy: 2,
  };
  return all.sort((a, b) => order[a.severity] - order[b.severity]);
}
