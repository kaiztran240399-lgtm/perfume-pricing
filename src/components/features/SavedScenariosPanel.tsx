/**
 * SavedScenariosPanel — Floating drawer to save, load, and manage named scenarios.
 *
 * Renders as:
 *   - A FAB (floating action button) in the bottom-right corner
 *   - A slide-in drawer panel with:
 *       • Save current state (name input + save button)
 *       • List of saved scenarios with load / delete actions
 *
 * Usage:
 *   <SavedScenariosPanel
 *     inputs={inputs}
 *     onLoad={(savedInputs) => loadFn(savedInputs)}
 *   />
 */

import { useState, useRef } from 'react';
import type { BusinessCalculatorInputs } from '../../types';
import { useSavedScenarios } from '../../hooks/useSavedScenarios';
import type { SavedScenario } from '../../hooks/useSavedScenarios';
import { TOKEN } from '../ui/tokens';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1)  return 'vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)   return `${diffH} giờ trước`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30)   return `${diffD} ngày trước`;
  return new Date(isoString).toLocaleDateString('vi-VN');
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function ScenarioRow({
  scenario,
  onLoad,
  onDelete,
}: {
  scenario: SavedScenario;
  onLoad:   (s: SavedScenario) => void;
  onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div
      className="rounded-xl p-3 space-y-2 transition-colors"
      style={{
        background:  TOKEN.bg.input,
        border:      `1px solid ${TOKEN.border.muted}`,
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: TOKEN.text.primary }}>
            {scenario.name}
          </p>
          {scenario.productLabel && (
            <p className="text-xs truncate" style={{ color: TOKEN.text.muted }}>
              {scenario.productLabel}
            </p>
          )}
          <p className="text-xs mt-0.5" style={{ color: TOKEN.text.ghost }}>
            {formatRelativeTime(scenario.savedAt)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {confirmDelete ? (
            <>
              <button
                onClick={() => onDelete(scenario.id)}
                className="text-xs px-2 py-1 rounded-lg font-medium transition-colors"
                style={{
                  background: TOKEN.status.dangerBg,
                  color:      TOKEN.status.danger,
                  border:     `1px solid ${TOKEN.status.dangerBorder}`,
                }}
              >
                Xoá
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs px-2 py-1 rounded-lg transition-colors"
                style={{ color: TOKEN.text.ghost }}
              >
                Huỷ
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onLoad(scenario)}
                className="text-xs px-2.5 py-1 rounded-lg font-medium transition-colors"
                style={{
                  background: TOKEN.accent.glow,
                  color:      TOKEN.text.accent,
                  border:     `1px solid ${TOKEN.border.accent}`,
                }}
              >
                Tải
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs px-2 py-1 rounded-lg transition-colors"
                style={{ color: TOKEN.text.ghost }}
                title="Xoá kịch bản này"
              >
                ✕
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export interface SavedScenariosPanelProps {
  inputs:  BusinessCalculatorInputs;
  onLoad:  (inputs: BusinessCalculatorInputs) => void;
}

export function SavedScenariosPanel({ inputs, onLoad }: SavedScenariosPanelProps) {
  const { scenarios, count, save, remove } = useSavedScenarios();
  const [isOpen, setIsOpen]   = useState(false);
  const [saveName, setSaveName] = useState('');
  const [justSaved, setJustSaved] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  function handleSave() {
    if (!saveName.trim()) return;
    save(saveName.trim(), inputs);
    setSaveName('');
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  }

  function handleLoad(scenario: SavedScenario) {
    onLoad(scenario.inputs);
    setIsOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') setIsOpen(false);
  }

  return (
    <>
      {/* ── FAB ──────────────────────────────────────────────────────────── */}
      <button
        onClick={() => { setIsOpen(v => !v); if (!isOpen) setTimeout(() => nameRef.current?.focus(), 150); }}
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium shadow-lg transition-all active:scale-95"
        style={{
          background:   TOKEN.accent.glow2,
          color:        TOKEN.text.accent,
          border:       `1px solid ${TOKEN.border.accent}`,
          backdropFilter: 'blur(8px)',
        }}
        title={isOpen ? 'Đóng' : 'Lưu / Tải kịch bản'}
      >
        <span>{isOpen ? '✕' : '💾'}</span>
        <span className="hidden sm:inline">{isOpen ? 'Đóng' : 'Kịch bản'}</span>
        {!isOpen && count > 0 && (
          <span
            className="text-xs px-1.5 py-0.5 rounded-full font-bold"
            style={{ background: TOKEN.accent.primary, color: '#fff' }}
          >
            {count}
          </span>
        )}
      </button>

      {/* ── Backdrop ─────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
        />
      )}

      {/* ── Drawer ───────────────────────────────────────────────────────── */}
      <div
        className="fixed bottom-0 right-0 z-50 w-full sm:w-96 flex flex-col rounded-t-2xl sm:rounded-2xl sm:bottom-20 sm:right-6 transition-all duration-200"
        style={{
          background:     TOKEN.bg.card,
          border:         `1px solid ${TOKEN.border.muted}`,
          boxShadow:      '0 -4px 40px rgba(0,0,0,0.6)',
          maxHeight:      '80vh',
          transform:      isOpen ? 'translateY(0)' : 'translateY(120%)',
          opacity:        isOpen ? 1 : 0,
          pointerEvents:  isOpen ? 'auto' : 'none',
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 border-b flex items-center justify-between"
          style={{ borderColor: TOKEN.border.default }}
        >
          <div>
            <h3 className="text-sm font-semibold" style={{ color: TOKEN.text.primary }}>
              💾 Kịch Bản Đã Lưu
            </h3>
            <p className="text-xs mt-0.5" style={{ color: TOKEN.text.ghost }}>
              Lưu trạng thái hiện tại để so sánh sau
            </p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-xs px-2 py-1 rounded-lg transition-colors"
            style={{ color: TOKEN.text.ghost }}
          >
            ✕
          </button>
        </div>

        {/* Save form */}
        <div
          className="px-4 py-3 border-b"
          style={{ borderColor: TOKEN.border.default }}
        >
          <p className="text-xs font-medium mb-2" style={{ color: TOKEN.text.muted }}>
            Lưu trạng thái hiện tại
          </p>
          <div className="flex gap-2">
            <input
              ref={nameRef}
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tên kịch bản (VD: Chanel N5 – giá cao)"
              maxLength={60}
              className="flex-1 px-3 py-2 rounded-lg text-xs border focus:outline-none transition-colors"
              style={{
                background:  TOKEN.bg.input,
                borderColor: TOKEN.border.muted,
                color:       TOKEN.text.primary,
              }}
              onFocus={(e) => (e.target.style.borderColor = TOKEN.border.accent)}
              onBlur={(e) => (e.target.style.borderColor = TOKEN.border.muted)}
            />
            <button
              onClick={handleSave}
              disabled={!saveName.trim()}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: saveName.trim()
                  ? TOKEN.accent.primary
                  : TOKEN.bg.input,
                color: saveName.trim() ? '#fff' : TOKEN.text.ghost,
                cursor: saveName.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              {justSaved ? '✓' : 'Lưu'}
            </button>
          </div>
          {justSaved && (
            <p className="text-xs mt-1.5" style={{ color: TOKEN.text.success }}>
              ✓ Đã lưu thành công!
            </p>
          )}
        </div>

        {/* Scenarios list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {scenarios.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">📂</p>
              <p className="text-xs" style={{ color: TOKEN.text.ghost }}>
                Chưa có kịch bản nào được lưu.
              </p>
              <p className="text-xs mt-1" style={{ color: TOKEN.text.ghost }}>
                Nhập tên và nhấn "Lưu" ở trên.
              </p>
            </div>
          ) : (
            scenarios.map((s) => (
              <ScenarioRow
                key={s.id}
                scenario={s}
                onLoad={handleLoad}
                onDelete={remove}
              />
            ))
          )}
        </div>

        {/* Footer */}
        {scenarios.length > 0 && (
          <div
            className="px-4 py-2 border-t"
            style={{ borderColor: TOKEN.border.default }}
          >
            <p className="text-xs text-center" style={{ color: TOKEN.text.ghost }}>
              {scenarios.length} / 20 kịch bản · Lưu trong trình duyệt này
            </p>
          </div>
        )}
      </div>
    </>
  );
}
