/**
 * hooks/useBusinessCalculatorActions.ts
 *
 * All useCallback updaters for BusinessCalculatorInputs.
 * Encapsulates every "write" operation: per-tab patch, tab navigation,
 * full reset, and scenario load.
 *
 * Rules:
 *  - Only useCallback here — no useState, no useMemo.
 *  - Each action receives a `setInputs` dispatcher from the parent hook.
 *  - `resetAll` delegates storage removal to clearStorage().
 */

import { useCallback } from 'react';
import type {
  BusinessCalculatorInputs,
  InventoryInputs,
  LTVInputs,
  MarketingInputs,
  PricingInputs,
  ScenarioInputs,
  TabId,
  UnitEconomicsInputs,
} from '../types';
import { DEFAULT_INPUTS } from '../lib/defaults';
import { clearStorage } from './useBusinessCalculatorPersistence';

type SetInputs = React.Dispatch<React.SetStateAction<BusinessCalculatorInputs>>;

export function useBusinessCalculatorActions(
  setInputs: SetInputs,
  activeTab: TabId,
) {
  // ── Tab navigation ─────────────────────────────────────────────────────────

  const setActiveTab = useCallback((tab: TabId) => {
    setInputs(prev => ({ ...prev, meta: { ...prev.meta, activeTab: tab } }));
  }, [setInputs]);

  // ── Per-tab updaters ───────────────────────────────────────────────────────

  const updatePricing = useCallback((patch: Partial<PricingInputs>) => {
    setInputs(prev => ({ ...prev, pricing: { ...prev.pricing, ...patch } }));
  }, [setInputs]);

  const updateUnitEconomics = useCallback((patch: Partial<UnitEconomicsInputs>) => {
    setInputs(prev => ({ ...prev, unitEconomics: { ...prev.unitEconomics, ...patch } }));
  }, [setInputs]);

  const updateMarketing = useCallback((patch: Partial<MarketingInputs>) => {
    setInputs(prev => ({ ...prev, marketing: { ...prev.marketing, ...patch } }));
  }, [setInputs]);

  const updateLTV = useCallback((patch: Partial<LTVInputs>) => {
    setInputs(prev => ({ ...prev, ltv: { ...prev.ltv, ...patch } }));
  }, [setInputs]);

  const updateInventory = useCallback((patch: Partial<InventoryInputs>) => {
    setInputs(prev => ({ ...prev, inventory: { ...prev.inventory, ...patch } }));
  }, [setInputs]);

  const updateScenario = useCallback((patch: Partial<ScenarioInputs>) => {
    setInputs(prev => ({ ...prev, scenario: { ...prev.scenario, ...patch } }));
  }, [setInputs]);

  // ── Global actions ─────────────────────────────────────────────────────────

  const resetAll = useCallback(() => {
    setInputs(DEFAULT_INPUTS);
    clearStorage();
  }, [setInputs]);

  /**
   * Load a saved scenario snapshot, replacing all current inputs while
   * preserving the user's current active tab.
   */
  const loadScenario = useCallback((savedInputs: BusinessCalculatorInputs) => {
    setInputs({
      ...savedInputs,
      meta: {
        ...savedInputs.meta,
        activeTab: activeTab,
      },
    });
  }, [setInputs, activeTab]);

  return {
    setActiveTab,
    updatePricing,
    updateUnitEconomics,
    updateMarketing,
    updateLTV,
    updateInventory,
    updateScenario,
    resetAll,
    loadScenario,
  };
}
