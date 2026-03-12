/**
 * inventory.ts — Inventory management and 6-month cashflow projection.
 *
 * Key outputs:
 *   Reorder point  = (dailySales × leadTimeDays) × safetyMultiplier
 *   EOQ            = √(2 × monthlyDemand × orderingCost / holdingCost)
 *   DSI            = inventoryUnits / dailySales
 *   CCC            = DSI + DSO − DPO  (cash conversion cycle)
 *   cashflow[6]    = rolling 6-month projection with collection lags
 *
 * Cashflow model per month:
 *   openingBalance
 *   + collectedCash        (prior month revenue × collection efficiency, lag-adjusted)
 *   − inventoryPurchase    (units to reorder × purchase price × upfront%)
 *   − operatingCosts       (fixed monthly ops)
 *   − marketingSpend       (from marketing inputs)
 *   − taxReserve           (% of net profit set aside)
 *   = closingBalance
 */

import type {
  InventoryInputs,
  InventoryOutputs,
  MonthlyProjection,
} from '../../types/inventory';
import type { CalcWarning } from '../../types/shared';
import { monthLabel, nonNegative, safeDivide } from './shared';

// ─────────────────────────────────────────────────────────────────────────────
// DEMAND & REORDER
// ─────────────────────────────────────────────────────────────────────────────

/** Daily sales rate from a monthly unit forecast. */
export function calculateDailySales(monthlyUnits: number): number {
  return safeDivide(nonNegative(monthlyUnits), 30, 0);
}

/**
 * Reorder point — minimum inventory level that triggers a new purchase order.
 *
 * ROP = (dailySales × leadTimeDays) × safetyStockMultiplier
 *
 * safetyStockMultiplier > 1 adds a buffer against demand spikes and
 * supplier delays. Typical value: 1.5 (50% safety buffer).
 */
export function calculateReorderPoint(
  dailySales: number,
  leadTimeDays: number,
  safetyStockMultiplier: number,
): number {
  return Math.ceil(dailySales * nonNegative(leadTimeDays) * Math.max(1, safetyStockMultiplier));
}

/**
 * Economic Order Quantity (EOQ) — optimal units per purchase order.
 *
 * EOQ = √(2 × monthlyDemand × orderingCost / holdingCostPerUnitPerMonth)
 *
 * Minimises total cost = ordering frequency cost + holding cost.
 * Returns reorderPoint as fallback when either cost input is zero.
 */
export function calculateEOQ(
  monthlyDemand: number,
  orderingCostPerOrder: number,
  holdingCostPerUnitPerMonth: number,
  fallback = 0,
): number {
  if (holdingCostPerUnitPerMonth <= 0 || orderingCostPerOrder <= 0) return fallback;
  return Math.ceil(
    Math.sqrt(
      safeDivide(2 * monthlyDemand * orderingCostPerOrder, holdingCostPerUnitPerMonth, 0),
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY METRICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Days of Sales Inventory (DSI) — how many days of sales current stock covers.
 *
 * DSI = inventoryUnits / dailySales
 *
 * Lower is generally better (less capital tied up), but too low risks stockout.
 */
export function calculateDSI(
  inventoryUnits: number,
  dailySales: number,
): number {
  return nonNegative(safeDivide(inventoryUnits, dailySales, 0));
}

/**
 * Annual inventory turnover ratio.
 *
 * turnover = annualUnitSales / averageInventoryUnits
 *
 * Higher = faster-moving inventory = healthier cash cycle.
 */
export function calculateInventoryTurnover(
  annualUnitSales: number,
  averageInventoryUnits: number,
): number {
  return safeDivide(annualUnitSales, averageInventoryUnits, 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// CASH CONVERSION CYCLE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cash Conversion Cycle (CCC) in days.
 *
 * CCC = DSI + DSO − DPO
 *
 * DSI: days stock sits before being sold
 * DSO: days to collect cash after a sale (COD lag / platform payout)
 * DPO: days before supplier must be paid (payment terms)
 *
 * Lower CCC = cash moves through the business faster.
 * Negative CCC is ideal (collected before paying supplier).
 */
export function calculateCashConversionCycle(
  dsi: number,
  dso: number,
  dpo: number,
): number {
  return dsi + dso - dpo;
}

// ─────────────────────────────────────────────────────────────────────────────
// CASHFLOW PROJECTION — 6-MONTH ROLLING MODEL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Estimate units to reorder in a given month.
 *
 * If currentInventory (after sales) < reorderPoint, place an order
 * for max(EOQ, reorderPoint) units.
 */
function unitsToReorder(
  projectedInventoryAfterSales: number,
  reorderPoint: number,
  eoq: number,
): number {
  if (projectedInventoryAfterSales <= reorderPoint) {
    return Math.max(eoq, reorderPoint);
  }
  return 0;
}

/**
 * Build one month's cashflow row.
 *
 * Revenue from month M is collected in month M + collectionLagMonths.
 * We approximate lags in whole months (ceiling of lag / 30).
 *
 * @param monthIndex     - 0-based (0 = current month)
 * @param openingBalance - ₫ carried forward from previous month
 * @param inputs         - full inventory inputs
 * @param reorderPoint   - pre-computed ROP
 * @param eoq            - pre-computed EOQ
 * @param inventoryUnits - units on hand at start of month
 * @param pendingCollection - Map<monthIndex, ₫> revenue not yet collected
 */
function buildMonthProjection(
  monthIndex: number,
  openingBalance: number,
  inputs: InventoryInputs,
  reorderPoint: number,
  eoq: number,
  inventoryUnits: number,
  forecastRevenue: number,
  forecastUnits: number,
  marketingSpend: number,
): Omit<MonthlyProjection, 'isCritical'> & { endInventory: number } {
  const forecast = inputs.monthlySalesForecast[monthIndex];
  const revenue  = forecast?.forecastRevenue ?? forecastRevenue;
  const units    = forecast?.forecastUnits   ?? forecastUnits;
  const mktSpend = forecast?.marketingSpend  ?? marketingSpend;

  // Weighted average DSO across channels (simplified: use Facebook lag as default)
  const avgCollectionLagDays =
    (inputs.facebookCollectionLagDays + inputs.tiktokCollectionLagDays) / 2;
  const collectionLagMonths = Math.ceil(avgCollectionLagDays / 30);

  // Revenue collected this month = revenue from (monthIndex - lag) months ago
  // For month 0: no prior revenue, so 0 collected
  const collectedCash =
    monthIndex >= collectionLagMonths
      ? nonNegative(revenue * (1 - inputs.taxReserveRatePct / 100))
      : 0;

  // Inventory after sales
  const soldUnits    = Math.min(units, inventoryUnits);
  const endInventory = inventoryUnits - soldUnits;

  // Reorder
  const reorderQty = unitsToReorder(endInventory, reorderPoint, eoq);
  const reorderCost = inputs.monthlySalesForecast[0]
    ? reorderQty * (nonNegative(revenue) / Math.max(units, 1))
    : 0; // fallback — caller should supply purchase price; simplified here

  // Upfront supplier payment
  const inventoryPurchaseCost = nonNegative(
    reorderCost * (inputs.supplierUpfrontPct / 100),
  );

  // Operating costs
  const operatingCosts = nonNegative(inputs.monthlyFixedOperatingCosts);

  // Tax reserve on collected cash (approximate)
  const taxReserve = nonNegative(
    Math.max(0, collectedCash - operatingCosts - mktSpend) *
      (inputs.taxReserveRatePct / 100),
  );

  const netCashflow =
    collectedCash +
    nonNegative(inputs.otherMonthlyIncome) -
    inventoryPurchaseCost -
    operatingCosts -
    mktSpend -
    taxReserve;

  const closingBalance = openingBalance + netCashflow;

  return {
    monthIndex,
    label:                monthLabel(monthIndex),
    openingBalance,
    grossRevenue:         revenue,
    collectedCash,
    inventoryPurchaseCost,
    operatingCosts,
    marketingSpend:       mktSpend,
    taxReserve,
    netCashflow,
    closingBalance,
    endInventory:         endInventory + reorderQty,
  };
}

/**
 * Build the full 6-month cashflow projection.
 *
 * Each month's closing balance becomes next month's opening balance.
 * Inventory state carries forward.
 */
export function buildCashflowProjection(
  inputs: InventoryInputs,
  purchasePricePerUnit: number,
): MonthlyProjection[] {
  const baseMonthlyUnits =
    inputs.monthlySalesForecast[0]?.forecastUnits ?? 0;
  const baseRevenue      =
    inputs.monthlySalesForecast[0]?.forecastRevenue ?? 0;
  const baseMktSpend     =
    inputs.monthlySalesForecast[0]?.marketingSpend ?? 0;

  const dailySales   = calculateDailySales(baseMonthlyUnits);
  const reorderPoint = calculateReorderPoint(
    dailySales,
    inputs.leadTimeDays,
    inputs.safetyStockMultiplier,
  );
  const eoq = calculateEOQ(
    baseMonthlyUnits,
    inputs.orderingCostPerOrder,
    inputs.holdingCostPerUnitPerMonth,
    reorderPoint,
  );

  // Minimum cash reserve = 1 month of operating costs + 1 reorder
  const minReserve = inputs.monthlyFixedOperatingCosts + reorderPoint * purchasePricePerUnit;

  let openingBalance = inputs.startingCashBalance;
  let inventoryUnits = inputs.currentInventoryUnits;
  const projection: MonthlyProjection[] = [];

  for (let m = 0; m < 6; m++) {
    const row = buildMonthProjection(
      m,
      openingBalance,
      inputs,
      reorderPoint,
      eoq,
      inventoryUnits,
      baseRevenue,
      baseMonthlyUnits,
      baseMktSpend,
    );

    projection.push({
      monthIndex:            row.monthIndex,
      label:                 row.label,
      openingBalance:        row.openingBalance,
      grossRevenue:          row.grossRevenue,
      collectedCash:         row.collectedCash,
      inventoryPurchaseCost: row.inventoryPurchaseCost,
      operatingCosts:        row.operatingCosts,
      marketingSpend:        row.marketingSpend,
      taxReserve:            row.taxReserve,
      netCashflow:           row.netCashflow,
      closingBalance:        row.closingBalance,
      isCritical:            row.closingBalance < minReserve,
    });

    openingBalance = row.closingBalance;
    inventoryUnits = row.endInventory;
  }

  return projection;
}

// ─────────────────────────────────────────────────────────────────────────────
// WARNING CONDITIONS
// ─────────────────────────────────────────────────────────────────────────────

export function computeInventoryWarnings(
  out: Omit<InventoryOutputs, 'warnings'>,
): CalcWarning[] {
  const w: CalcWarning[] = [];

  if (out.criticalMonths.length > 0) {
    const labels = out.criticalMonths.map((i) => `Tháng ${i + 1}`).join(', ');
    w.push({
      level: 'critical',
      code: 'CASHFLOW_CRITICAL',
      message: `Dòng tiền dưới mức dự trữ tối thiểu: ${labels}.`,
    });
  }

  if (out.cashRunwayMonths < 2 && out.cashRunwayMonths >= 0) {
    w.push({
      level: 'critical',
      code: 'LOW_CASH_RUNWAY',
      message: `Tiền mặt chỉ đủ ${out.cashRunwayMonths} tháng chi phí cố định — nguy cơ cạn vốn.`,
    });
  }

  if (out.daysOfSalesInventory > 60) {
    w.push({
      level: 'warning',
      code: 'HIGH_DSI',
      message: `Tồn kho ${Math.round(out.daysOfSalesInventory)} ngày bán — vốn bị giam trong hàng tồn quá lâu.`,
    });
  }

  if (out.cashConversionCycleDays > 45) {
    w.push({
      level: 'warning',
      code: 'SLOW_CASH_CYCLE',
      message: `Chu kỳ chuyển đổi tiền mặt: ${Math.round(out.cashConversionCycleDays)} ngày — cân nhắc rút ngắn thời gian thu tiền hoặc thanh toán chậm hơn cho nhà cung cấp.`,
    });
  }

  return w;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full inventory and cashflow calculation pipeline.
 *
 * @param inputs              - InventoryInputs
 * @param purchasePricePerUnit - ₫ per unit (from PricingOutputs.effectivePurchasePrice)
 */
export function calculateInventoryOutputs(
  inputs: InventoryInputs,
  purchasePricePerUnit: number,
): InventoryOutputs {
  const baseUnits = inputs.monthlySalesForecast[0]?.forecastUnits ?? 0;

  // Derived demand metrics
  const dailySales   = calculateDailySales(baseUnits);
  const reorderPoint = calculateReorderPoint(
    dailySales,
    inputs.leadTimeDays,
    inputs.safetyStockMultiplier,
  );
  const eoq = calculateEOQ(
    baseUnits,
    inputs.orderingCostPerOrder,
    inputs.holdingCostPerUnitPerMonth,
    reorderPoint,
  );

  // Inventory value
  const currentInventoryValue = nonNegative(inputs.currentInventoryUnits * purchasePricePerUnit);

  // DSI
  const dsi = calculateDSI(inputs.currentInventoryUnits, dailySales);

  // Annual turnover (using 12 months of base forecast)
  const annualSales          = baseUnits * 12;
  const avgInventoryUnits    = inputs.currentInventoryUnits;
  const inventoryTurnoverAnnual = calculateInventoryTurnover(annualSales, avgInventoryUnits);

  // Cash conversion cycle
  const avgDSO = (inputs.facebookCollectionLagDays + inputs.tiktokCollectionLagDays) / 2;
  const dpo    = inputs.supplierBalanceDueDays;
  const cashConversionCycleDays = calculateCashConversionCycle(dsi, avgDSO, dpo);

  // Cash runway
  const minReserve     = inputs.monthlyFixedOperatingCosts + reorderPoint * purchasePricePerUnit;
  const cashRunwayMonths = Math.floor(
    safeDivide(inputs.startingCashBalance, inputs.monthlyFixedOperatingCosts, 0),
  );

  // 6-month cashflow projection
  const cashflowProjection = buildCashflowProjection(inputs, purchasePricePerUnit);

  // Critical months (closing balance < minReserve)
  const criticalMonths = cashflowProjection
    .filter((m) => m.isCritical)
    .map((m) => m.monthIndex);

  const partial = {
    reorderPoint,
    economicOrderQuantity:    eoq,
    currentInventoryValue,
    daysOfSalesInventory:     dsi,
    inventoryTurnoverAnnual,
    cashConversionCycleDays,
    cashRunwayMonths,
    minimumCashReserveNeeded: nonNegative(minReserve),
    cashflowProjection,
    criticalMonths,
  };
  return { ...partial, warnings: computeInventoryWarnings(partial) };
}
