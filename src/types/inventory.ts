/**
 * types/inventory.ts
 *
 * Input/output types for Tab 5 — Inventory & Cashflow.
 */

// ─────────────────────────────────────────────────────────────────────────────
// SHARED SUB-TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** One month in the 6-month cashflow projection. */
export interface MonthlyProjection {
  /** 0-based index (0 = current month, 5 = 5 months out). */
  monthIndex: number;
  /** Human label, e.g. "T4/2026". */
  label: string;
  openingBalance: number;       // ₫
  grossRevenue: number;         // ₫ before collection lag
  collectedCash: number;        // ₫ after collection lag
  inventoryPurchaseCost: number;// ₫ outflow to supplier this month
  operatingCosts: number;       // ₫ fixed + variable ops
  marketingSpend: number;       // ₫ ads + content + KOL
  taxReserve: number;           // ₫ set aside for tax
  netCashflow: number;          // ₫ = collected - all outflows
  closingBalance: number;       // ₫
  /** true when closingBalance falls below minimum reserve threshold. */
  isCritical: boolean;
}

/** Sales forecast for one month (input to inventory/cashflow). */
export interface MonthlySalesForecastEntry {
  monthIndex: number;
  label: string;                // "T4/2026"
  forecastUnits: number;
  forecastRevenue: number;      // ₫
  /** Auto-linked from MarketingOutputs or manually overridden. */
  marketingSpend: number;       // ₫
}

// ─────────────────────────────────────────────────────────────────────────────
// INPUTS
// ─────────────────────────────────────────────────────────────────────────────

export interface InventoryInputs {
  // ── Current state ─────────────────────────────────────────────────────────
  currentInventoryUnits: number;
  startingCashBalance: number;            // ₫

  // ── Reorder parameters ───────────────────────────────────────────────────
  leadTimeDays: number;
  /** e.g. 1.5 = 50% safety buffer on top of lead-time demand. */
  safetyStockMultiplier: number;
  /** ₫ admin/logistics cost per purchase order placed. */
  orderingCostPerOrder: number;
  /** ₫ per unit per month for storage, insurance, spoilage. */
  holdingCostPerUnitPerMonth: number;

  // ── Supplier payment terms ────────────────────────────────────────────────
  /** % of invoice paid when placing the order (0–100). */
  supplierUpfrontPct: number;
  /** Days after delivery to pay the remaining balance. */
  supplierBalanceDueDays: number;

  // ── Revenue collection lag ────────────────────────────────────────────────
  /** Days to receive COD cash after order fulfilment. */
  facebookCollectionLagDays: number;
  /** Days for TikTok Shop to remit payment after order completion. */
  tiktokCollectionLagDays: number;

  // ── Monthly operating costs ───────────────────────────────────────────────
  /** ₫ fixed costs: rent, salaries, subscriptions, utilities. */
  monthlyFixedOperatingCosts: number;
  /** % of net profit to reserve for tax each month. */
  taxReserveRatePct: number;
  /** ₫ any non-sales income (investment, side revenue). */
  otherMonthlyIncome: number;

  // ── 6-month sales forecast ───────────────────────────────────────────────
  /** Auto-populated from MarketingOutputs.blended; user can override. */
  monthlySalesForecast: MonthlySalesForecastEntry[];
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUTS
// ─────────────────────────────────────────────────────────────────────────────

export interface InventoryOutputs {
  // ── Reorder metrics ───────────────────────────────────────────────────────
  reorderPoint: number;                   // units
  economicOrderQuantity: number;          // units (EOQ formula)
  currentInventoryValue: number;          // ₫

  // ── Turnover ─────────────────────────────────────────────────────────────
  /** Days of sales remaining in current inventory. */
  daysOfSalesInventory: number;
  /** Annual inventory turnover ratio. */
  inventoryTurnoverAnnual: number;

  // ── Cash metrics ─────────────────────────────────────────────────────────
  /** Days: DSI + DSO − DPO. */
  cashConversionCycleDays: number;
  /** Months of fixed operating costs covered by current cash balance. */
  cashRunwayMonths: number;
  /** ₫ minimum cash reserve the business should maintain. */
  minimumCashReserveNeeded: number;

  // ── 6-month projection ───────────────────────────────────────────────────
  cashflowProjection: MonthlyProjection[];
  /** monthIndex values where closingBalance turns negative. */
  criticalMonths: number[];
}
