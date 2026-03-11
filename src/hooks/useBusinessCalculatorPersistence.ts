/**
 * hooks/useBusinessCalculatorPersistence.ts
 *
 * Handles reading and writing BusinessCalculatorInputs to/from localStorage.
 * Isolated here so the storage key and serialisation logic live in one place.
 *
 * Rules:
 *  - No React state — pure load/save helpers + the storage key constant.
 *  - Merges with DEFAULT_INPUTS so newly-added fields always have a value.
 *  - Swallows quota / parse errors silently.
 */

import type { BusinessCalculatorInputs } from '../types';
import { DEFAULT_INPUTS } from '../lib/defaults';

// ─────────────────────────────────────────────────────────────────────────────
// KEY
// ─────────────────────────────────────────────────────────────────────────────

export const LS_KEY = 'business_calculator_inputs_v2';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load stored inputs from localStorage.
 * Falls back to DEFAULT_INPUTS when nothing is stored or JSON is corrupt.
 * Shallow-merges so new top-level keys added in later versions have a value.
 */
export function loadFromStorage(): BusinessCalculatorInputs {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_INPUTS;
    return { ...DEFAULT_INPUTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_INPUTS;
  }
}

/**
 * Persist the full inputs object.
 * Swallows quota errors so the app never crashes mid-calculation.
 */
export function saveToStorage(inputs: BusinessCalculatorInputs): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(inputs));
  } catch {
    // ignore QuotaExceededError or SecurityError
  }
}

/**
 * Wipe the persisted inputs (used by resetAll).
 */
export function clearStorage(): void {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    // ignore
  }
}
