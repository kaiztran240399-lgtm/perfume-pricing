/**
 * hooks/useBusinessCalculator.ts
 *
 * Pure glue — composes 4 focused sub-hooks into the single public API.
 *
 *   useBusinessCalculatorState       → raw inputs state (useState only)
 *   useBusinessCalculatorPersistence → localStorage sync (side-effect only)
 *   useBusinessCalculatorDerived     → all 6 tab outputs via useMemo
 *   useBusinessCalculatorActions     → every write/update callback
 *
 * No logic lives here. Changing behaviour means changing a sub-hook.
 */

import { useEffect } from 'react';
import { useBusinessCalculatorState }   from './useBusinessCalculatorState';
import { saveToStorage }                from './useBusinessCalculatorPersistence';
import { useBusinessCalculatorDerived } from './useBusinessCalculatorDerived';
import { useBusinessCalculatorActions } from './useBusinessCalculatorActions';

export function useBusinessCalculator() {
  const { inputs, setInputs, costTemplates } = useBusinessCalculatorState();

  // Side-effect: persist every state change to localStorage
  useEffect(() => { saveToStorage(inputs); }, [inputs]);

  const derived   = useBusinessCalculatorDerived(inputs, costTemplates);
  const activeTab = inputs.meta.activeTab;
  const actions   = useBusinessCalculatorActions(setInputs, activeTab);

  return { inputs, derived, costTemplates, activeTab, ...actions };
}

// Re-export so callers that imported defaults from here keep working.
export { DEFAULT_INPUTS, DEFAULT_COST_TEMPLATES } from '../lib/defaults';
