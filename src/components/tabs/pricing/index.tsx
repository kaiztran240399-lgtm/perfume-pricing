/**
 * PricingTab — Reference implementation for the Pricing tab.
 *
 * Combines InputsPanel (left) with ResultsPanel + Insights + Warnings (right)
 * using the TabLayout 2-column shell.
 */

import type { CostTemplate } from '../../../types';
import type { PricingInputs, PricingOutputs } from '../../../types';
import { TabLayout } from '../../layout/TabLayout';
import { PricingInputsPanel } from './PricingInputsPanel';
import { PricingResultsPanel } from './PricingResultsPanel';
import { PricingInsights } from './PricingInsights';
import { PricingWarnings } from './PricingWarnings';

export interface PricingTabProps {
  inputs:    PricingInputs;
  outputs:   PricingOutputs;
  templates: CostTemplate[];
  onChange:  (patch: Partial<PricingInputs>) => void;
}

export function PricingTab({ inputs, outputs, templates, onChange }: PricingTabProps) {
  return (
    <TabLayout
      inputs={
        <PricingInputsPanel
          inputs={inputs}
          templates={templates}
          onChange={onChange}
        />
      }
      results={
        <>
          <PricingResultsPanel inputs={inputs} outputs={outputs} />
          <PricingInsights     inputs={inputs} outputs={outputs} />
          <PricingWarnings     inputs={inputs} outputs={outputs} />
        </>
      }
    />
  );
}
