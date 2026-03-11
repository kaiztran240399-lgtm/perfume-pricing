/**
 * hooks/useBusinessCalculator.ts
 *
 * Thin orchestrator for the 6-tab Business Calculator.
 *
 * Responsibilities (delegated to sub-hooks):
 *   - State:       useState<BusinessCalculatorInputs>
 *   - Persistence: useEffect → saveToStorage  [useBusinessCalculatorPersistence]
 *   - Derived:     useMemo with auto-linking   [useBusinessCalculatorDerived]
 *   - Actions:     all useCallback updaters    [useBusinessCalculatorActions]
 *
 * Public API is identical to the previous monolith — no consumer changes needed.
 */

import { useState, useEffect } from 'react';
import type { CostTemplate }          from '../types';
import { DEFAULT_COST_TEMPLATES } from '../lib/defaults';
import { loadFromStorage, saveToStorage }          from './useBusinessCalculatorPersistence';
import { useBusinessCalculatorDerived }            from './useBusinessCalculatorDerived';
import { useBusinessCalculatorActions }            from './useBusinessCalculatorActions';

export function useBusinessCalculator() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [inputs, setInputs] = useState(loadFromStorage);
  const [costTemplates] = useState<CostTemplate[]>(DEFAULT_COST_TEMPLATES);

  // ── Persistence ────────────────────────────────────────────────────────────
  useEffect(() => {
    saveToStorage(inputs);
  }, [inputs]);

  // ── Derived outputs ────────────────────────────────────────────────────────
  const derived = useBusinessCalculatorDerived(inputs, costTemplates);

  // ── Actions ────────────────────────────────────────────────────────────────
  const activeTab = inputs.meta.activeTab;
  const actions   = useBusinessCalculatorActions(setInputs, activeTab);

  return {
    inputs,
    derived,
    costTemplates,
    activeTab,
    ...actions,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-export defaults so existing consumers don't need to change their imports.
// ─────────────────────────────────────────────────────────────────────────────
export { DEFAULT_INPUTS, DEFAULT_COST_TEMPLATES } from '../lib/defaults';
