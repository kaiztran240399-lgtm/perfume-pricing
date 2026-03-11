import type { PriceCalculation, SelectedCost } from '../types';

/**
 * Format tiền Việt Nam
 */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

/**
 * Format số nguyên có dấu phẩy
 */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n));
}

/**
 * Làm tròn giá bán theo quy tắc thương mại
 * - < 100k: làm tròn đến 1k
 * - 100k – 1M: làm tròn đến 5k
 * - > 1M: làm tròn đến 10k
 */
export function roundSellingPrice(price: number): number {
  if (price < 100_000) {
    return Math.ceil(price / 1_000) * 1_000;
  } else if (price < 1_000_000) {
    return Math.ceil(price / 5_000) * 5_000;
  } else {
    return Math.ceil(price / 10_000) * 10_000;
  }
}

/**
 * Tính giá bán
 *
 * Công thức:
 * - Tổng chi phí tiền = Σ cost.value (với is_percentage = false)
 * - Tổng chi phí % = Σ cost.value (với is_percentage = true) — áp dụng trên giá nhập
 * - Giá vốn = purchasePrice + totalCostAmount + (purchasePrice × totalCostPercent / 100)
 * - Giá bán = Giá vốn / (1 - profitMargin / 100)
 */
export function calculatePrice(
  purchasePrice: number,
  selectedCosts: SelectedCost[],
  profitMargin: number
): PriceCalculation {
  const costsBreakdown = selectedCosts.map((c) => ({
    name: c.name,
    amount: c.is_percentage ? (purchasePrice * c.value) / 100 : c.value,
    is_percentage: c.is_percentage,
    rate: c.is_percentage ? c.value : undefined,
  }));

  const totalCostAmount = selectedCosts
    .filter((c) => !c.is_percentage)
    .reduce((sum, c) => sum + c.value, 0);

  const totalCostPercent = selectedCosts
    .filter((c) => c.is_percentage)
    .reduce((sum, c) => sum + c.value, 0);

  const totalPercentAmount = (purchasePrice * totalCostPercent) / 100;

  const costBase = purchasePrice + totalCostAmount + totalPercentAmount;

  const sellingPrice =
    profitMargin >= 100
      ? costBase * 2
      : costBase / (1 - profitMargin / 100);

  const sellingPriceRounded = roundSellingPrice(sellingPrice);

  return {
    purchasePrice,
    costsBreakdown,
    totalCostAmount: totalCostAmount + totalPercentAmount,
    totalCostPercent,
    profitMargin,
    costBase,
    sellingPrice,
    sellingPriceRounded,
  };
}

/**
 * Tính giá nhập cho 1 lọ chiết
 * = (Giá nhập chai gốc / Size chai gốc) × Size lọ chiết
 */
export function calculateDecantPurchasePrice(
  bottlePurchasePrice: number,
  bottleSizeMl: number,
  decantSizeMl: number
): number {
  if (bottleSizeMl <= 0) return 0;
  return (bottlePurchasePrice / bottleSizeMl) * decantSizeMl;
}
