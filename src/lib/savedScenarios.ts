/**
 * savedScenarios.ts — localStorage-backed CRUD for named calculator states.
 *
 * Each saved scenario captures the full BusinessCalculatorInputs snapshot so
 * it can be re-loaded exactly as the user left it.
 *
 * Storage key: 'saved_scenarios_v1'
 * Format: JSON array of SavedScenario
 */

import type { BusinessCalculatorInputs } from '../types/business-calculator';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface SavedScenario {
  /** UUID-ish identifier (timestamp + random suffix). */
  id: string;
  /** User-supplied display name. */
  name: string;
  /** Optional description. */
  description?: string;
  /** ISO timestamp of when this snapshot was saved. */
  savedAt: string;
  /** The product/scenario being captured (product name + brand). */
  productLabel: string;
  /** Full input snapshot. */
  inputs: BusinessCalculatorInputs;
}

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE
// ─────────────────────────────────────────────────────────────────────────────

const LS_KEY = 'saved_scenarios_v1';
const MAX_SCENARIOS = 20;

function readAll(): SavedScenario[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(scenarios: SavedScenario[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(scenarios));
  } catch {
    // quota exceeded — silently skip
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC CRUD
// ─────────────────────────────────────────────────────────────────────────────

/** Return all saved scenarios, newest first. */
export function listSavedScenarios(): SavedScenario[] {
  return readAll().sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
  );
}

/**
 * Save a named snapshot of the current inputs.
 * Replaces an existing scenario with the same `id` if provided.
 * Enforces a max of MAX_SCENARIOS (oldest dropped when limit exceeded).
 */
export function saveScenario(
  name: string,
  inputs: BusinessCalculatorInputs,
  description?: string,
  existingId?: string,
): SavedScenario {
  const all = readAll();

  const productLabel = [inputs.pricing.brand, inputs.pricing.productName]
    .filter(Boolean)
    .join(' — ') || 'Chưa đặt tên sản phẩm';

  const scenario: SavedScenario = {
    id:           existingId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name:         name.trim() || 'Kịch bản không tên',
    description,
    savedAt:      new Date().toISOString(),
    productLabel,
    inputs:       { ...inputs, meta: { ...inputs.meta, lastSavedAt: new Date().toISOString() } },
  };

  // Replace if same id, otherwise append
  const idx = all.findIndex(s => s.id === scenario.id);
  if (idx !== -1) {
    all[idx] = scenario;
  } else {
    all.unshift(scenario);
  }

  // Trim to max
  const trimmed = all.slice(0, MAX_SCENARIOS);
  writeAll(trimmed);
  return scenario;
}

/** Remove a scenario by id. No-op if not found. */
export function deleteSavedScenario(id: string): void {
  const filtered = readAll().filter(s => s.id !== id);
  writeAll(filtered);
}

/** Rename a saved scenario. */
export function renameSavedScenario(id: string, newName: string): void {
  const all = readAll().map(s =>
    s.id === id ? { ...s, name: newName.trim() || s.name } : s,
  );
  writeAll(all);
}

/** Clear all saved scenarios. */
export function clearAllSavedScenarios(): void {
  localStorage.removeItem(LS_KEY);
}
