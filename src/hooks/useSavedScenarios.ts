/**
 * useSavedScenarios — React hook for managing named scenario snapshots.
 *
 * Wraps the pure localStorage CRUD from lib/savedScenarios with local React
 * state so components re-render after mutations.
 */

import { useState, useCallback } from 'react';
import type { BusinessCalculatorInputs } from '../types/business-calculator';
import {
  listSavedScenarios,
  saveScenario,
  deleteSavedScenario,
  renameSavedScenario,
  clearAllSavedScenarios,
} from '../lib/savedScenarios';
import type { SavedScenario } from '../lib/savedScenarios';

export type { SavedScenario };

export function useSavedScenarios() {
  const [scenarios, setScenarios] = useState<SavedScenario[]>(listSavedScenarios);

  /** Refresh list from localStorage (call after any external mutation). */
  const refresh = useCallback(() => {
    setScenarios(listSavedScenarios());
  }, []);

  /**
   * Save the current inputs under the given name.
   * Returns the newly created SavedScenario.
   */
  const save = useCallback(
    (name: string, inputs: BusinessCalculatorInputs, description?: string) => {
      const s = saveScenario(name, inputs, description);
      setScenarios(listSavedScenarios());
      return s;
    },
    [],
  );

  /** Delete a scenario by id. */
  const remove = useCallback((id: string) => {
    deleteSavedScenario(id);
    setScenarios(listSavedScenarios());
  }, []);

  /** Rename a scenario by id. */
  const rename = useCallback((id: string, newName: string) => {
    renameSavedScenario(id, newName);
    setScenarios(listSavedScenarios());
  }, []);

  /** Remove all saved scenarios. */
  const clearAll = useCallback(() => {
    clearAllSavedScenarios();
    setScenarios([]);
  }, []);

  return {
    scenarios,
    count: scenarios.length,
    save,
    remove,
    rename,
    clearAll,
    refresh,
  };
}
