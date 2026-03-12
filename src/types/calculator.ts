/**
 * types/calculator.ts
 *
 * Root aggregate types — the full state + derived shape for the 6-tab calculator.
 * These are the only types persisted to localStorage / Supabase.
 */

import type { TabId } from './shared';
import type { PricingInputs, PricingOutputs }             from './pricing';
import type { UnitEconomicsInputs, UnitEconomicsOutputs } from './unit-economics';
import type { MarketingInputs, MarketingOutputs }         from './marketing';
import type { LTVInputs, LTVOutputs }                     from './ltv';
import type { InventoryInputs, InventoryOutputs }         from './inventory';
import type { ScenarioInputs, ScenarioOutputs }           from './scenario';
import type { ValidationResult }                          from './validation';

// ─────────────────────────────────────────────────────────────────────────────
// ROOT INPUT STATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All user inputs across all 6 tabs.
 * This is the ONLY slice persisted to localStorage / Supabase.
 * Serialisation-safe: no functions, no class instances.
 */
export interface BusinessCalculatorInputs {
  pricing:        PricingInputs;
  unitEconomics:  UnitEconomicsInputs;
  marketing:      MarketingInputs;
  ltv:            LTVInputs;
  inventory:      InventoryInputs;
  scenario:       ScenarioInputs;

  meta: {
    /** Semver string for migration guards, e.g. "2.0.0". */
    appVersion: string;
    /** ISO timestamp of last user-triggered save. */
    lastSavedAt: string;
    activeTab: TabId;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT DERIVED STATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All computed outputs across all 6 tabs.
 * This slice is NEVER persisted — always derived from BusinessCalculatorInputs
 * via pure functions in lib/finance/.
 */
export interface BusinessCalculatorDerived {
  pricing:        PricingOutputs;
  unitEconomics:  UnitEconomicsOutputs;
  marketing:      MarketingOutputs;
  ltv:            LTVOutputs;
  inventory:      InventoryOutputs;
  scenario:       ScenarioOutputs;
  /** Cross-domain financial health checks. Computed by runFinancialValidation(). */
  validation:     ValidationResult[];
}
