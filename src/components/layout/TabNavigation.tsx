/**
 * TabNavigation — Horizontal tab bar for the 6-tab Business Calculator.
 *
 * - Scrollable on mobile (overflow-x-auto + no flex-wrap)
 * - Each tab has a color-coded icon and label
 * - Active tab shows a colored bottom border and accent background
 */

import type { TabId } from '../../types/business-calculator';
import { TOKEN } from '../ui/tokens';

// ── Tab definitions ───────────────────────────────────────────────────────────

interface TabDef {
  id:    TabId;
  label: string;
  icon:  string;
  color: string;
}

const TABS: TabDef[] = [
  { id: 'pricing',        label: 'Tính Giá',       icon: '🏷️',  color: TOKEN.tabs.pricing       },
  { id: 'unit-economics', label: 'Unit Economics',  icon: '📊',  color: TOKEN.tabs.unitEconomics },
  { id: 'marketing',      label: 'Marketing',       icon: '📣',  color: TOKEN.tabs.marketing     },
  { id: 'ltv',            label: 'LTV',             icon: '💚',  color: TOKEN.tabs.ltv           },
  { id: 'inventory',      label: 'Tồn Kho',         icon: '📦',  color: TOKEN.tabs.inventory     },
  { id: 'scenario',       label: 'Kịch Bản',        icon: '🔮',  color: TOKEN.tabs.scenarios     },
];

// ── Component ─────────────────────────────────────────────────────────────────

export interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div
      className="w-full border-b overflow-x-auto scrollbar-none"
      style={{ borderColor: TOKEN.border.default, background: TOKEN.bg.card }}
    >
      <div className="flex min-w-max">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all whitespace-nowrap relative shrink-0"
              style={{
                color:      isActive ? tab.color : TOKEN.text.muted,
                background: isActive ? `${tab.color}14` : 'transparent',
              }}
            >
              {/* Icon */}
              <span className="text-base leading-none">{tab.icon}</span>

              {/* Label */}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden text-xs">{tab.label.split(' ')[0]}</span>

              {/* Active indicator — bottom border */}
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t"
                  style={{ background: tab.color }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Look up the color for a given tab (useful for dynamic coloring in child components). */
export function tabColor(id: TabId): string {
  return TABS.find((t) => t.id === id)?.color ?? TOKEN.text.accent;
}

export { TABS };
