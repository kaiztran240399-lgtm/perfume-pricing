/**
 * Tests for hooks/useBusinessCalculatorPersistence.ts
 * Uses a mock localStorage (Vitest provides global with `environment: 'node'` is
 * missing localStorage, so we set it up manually here).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Minimal localStorage stub (node environment) ─────────────────────────────
const store: Record<string, string> = {};
const localStorageMock = {
  getItem:    (key: string) => store[key] ?? null,
  setItem:    (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear:      () => { Object.keys(store).forEach(k => delete store[k]); },
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// ── Now import after stubbing ─────────────────────────────────────────────────
import { loadFromStorage, saveToStorage, clearStorage, LS_KEY } from '../../../hooks/useBusinessCalculatorPersistence';
import { DEFAULT_INPUTS } from '../../../lib/defaults';

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  localStorageMock.clear();
});

describe('loadFromStorage', () => {
  it('returns DEFAULT_INPUTS when localStorage is empty', () => {
    const result = loadFromStorage();
    expect(result).toEqual(DEFAULT_INPUTS);
  });

  it('returns stored data merged with DEFAULT_INPUTS', () => {
    const partial = { meta: { appVersion: '3.0.0', lastSavedAt: '2026-01-01', activeTab: 'pricing' as const } };
    localStorage.setItem(LS_KEY, JSON.stringify(partial));
    const result = loadFromStorage();
    expect(result.meta.appVersion).toBe('3.0.0');
    // Fields not in stored data still come from DEFAULT_INPUTS
    expect(result.pricing).toEqual(DEFAULT_INPUTS.pricing);
  });

  it('returns DEFAULT_INPUTS when JSON is corrupt', () => {
    localStorage.setItem(LS_KEY, 'NOT_JSON{{{');
    const result = loadFromStorage();
    expect(result).toEqual(DEFAULT_INPUTS);
  });
});

describe('saveToStorage', () => {
  it('persists inputs under LS_KEY', () => {
    saveToStorage(DEFAULT_INPUTS);
    const raw = localStorage.getItem(LS_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.meta.appVersion).toBe(DEFAULT_INPUTS.meta.appVersion);
  });
});

describe('clearStorage', () => {
  it('removes the key from localStorage', () => {
    saveToStorage(DEFAULT_INPUTS);
    clearStorage();
    expect(localStorage.getItem(LS_KEY)).toBeNull();
  });
});
