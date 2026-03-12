/**
 * BusinessCalculator — Root component for the 6-tab business calculator.
 *
 * Orchestrates:
 *   - TabNavigation (tab selector)
 *   - useBusinessCalculator (state + derived + auto-linking)
 *   - Active tab routing → correct Tab component
 *   - SavedScenariosPanel (floating save/load drawer)
 */

import { useBusinessCalculator } from '../hooks/useBusinessCalculator';
import { TabNavigation } from './layout/TabNavigation';
import { SavedScenariosPanel } from './features/SavedScenariosPanel';
import { TOKEN } from './ui/tokens';

// Tab components
import { PricingTab }         from './tabs/pricing';
import { UnitEconomicsTab }   from './tabs/unit-economics/UnitEconomicsTab';
import { MarketingTab }       from './tabs/marketing/MarketingTab';
import { LTVTab }             from './tabs/ltv/LTVTab';
import { InventoryTab }       from './tabs/inventory/InventoryTab';
import { ScenariosTab }       from './tabs/scenarios/ScenariosTab';
import { monthLabel }         from '../lib/finance';
import type { MonthlySalesForecastEntry } from '../types';

export default function BusinessCalculator() {
  const {
    inputs,
    derived,
    costTemplates,
    activeTab,
    setActiveTab,
    updatePricing,
    updateUnitEconomics,
    updateMarketing,
    updateLTV,
    updateInventory,
    updateScenario,
    loadScenario,
  } = useBusinessCalculator();

  // Pre-compute auto-forecast to pass down to InventoryTab
  const autoForecast: MonthlySalesForecastEntry[] = Array.from({ length: 6 }, (_, i) => ({
    monthIndex:      i,
    label:           monthLabel(i),
    forecastUnits:   Math.round(derived.marketing.blended.totalOrders),
    forecastRevenue: derived.marketing.blended.totalNetRevenue,
    marketingSpend:  derived.marketing.blended.totalAdSpend,
  }));

  return (
    <div className="min-h-screen" style={{ background: TOKEN.bg.app }}>
      {/* ── Tab bar ────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40">
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* ── Tab content ───────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 pb-28 sm:pb-8">
        {activeTab === 'pricing' && (
          <PricingTab
            inputs={inputs.pricing}
            outputs={derived.pricing}
            templates={costTemplates}
            onChange={updatePricing}
          />
        )}

        {activeTab === 'unit-economics' && (
          <UnitEconomicsTab
            inputs={inputs.unitEconomics}
            outputs={derived.unitEconomics}
            onChange={updateUnitEconomics}
          />
        )}

        {activeTab === 'marketing' && (
          <MarketingTab
            inputs={inputs.marketing}
            outputs={derived.marketing}
            onChange={updateMarketing}
          />
        )}

        {activeTab === 'ltv' && (
          <LTVTab
            inputs={inputs.ltv}
            outputs={derived.ltv}
            onChange={updateLTV}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryTab
            inputs={inputs.inventory}
            outputs={derived.inventory}
            autoForecast={autoForecast}
            onChange={updateInventory}
          />
        )}

        {activeTab === 'scenario' && (
          <ScenariosTab
            inputs={inputs.scenario}
            outputs={derived.scenario}
            onChange={updateScenario}
          />
        )}
      </div>

      {/* ── Saved Scenarios FAB + drawer ──────────────────────────────── */}
      <SavedScenariosPanel
        inputs={inputs}
        onLoad={loadScenario}
      />
    </div>
  );
}
