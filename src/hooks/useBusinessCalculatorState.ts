/**
 * hooks/useBusinessCalculatorState.ts
 *
 * Owns the two pieces of raw React state for the Business Calculator:
 *   1. inputs  — all user-entered data (BusinessCalculatorInputs)
 *   2. costTemplates — the static cost template catalogue
 *
 * Rules:
 *  - Only useState here — no useMemo, no useEffect, no side effects.
 *  - Initial inputs value comes from localStorage via loadFromStorage().
 *  - costTemplates never changes after mount; using useState as a const holder.
 */

import { useState } from 'react';
import type { BusinessCalculatorInputs } from '../types/calculator';
import type { CostTemplate } from '../types/shared';
import { DEFAULT_COST_TEMPLATES } from '../lib/defaults';
import { loadFromStorage } from './useBusinessCalculatorPersistence';

export interface BusinessCalculatorState {
  inputs: BusinessCalculatorInputs;
  setInputs: React.Dispatch<React.SetStateAction<BusinessCalculatorInputs>>;
  costTemplates: CostTemplate[];
}

export function useBusinessCalculatorState(): BusinessCalculatorState {
  const [inputs, setInputs] = useState<BusinessCalculatorInputs>(loadFromStorage);
  const [costTemplates] = useState<CostTemplate[]>(DEFAULT_COST_TEMPLATES);

  return { inputs, setInputs, costTemplates };
}
