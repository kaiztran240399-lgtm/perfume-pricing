/**
 * TabLayout — Two-column responsive layout for each calculator tab.
 *
 * Desktop (lg+):  left 40% inputs  |  right 60% results
 * Tablet  (sm-lg): stacked (inputs on top, results below)
 * Mobile  (< sm):  stacked, full-width
 *
 * The right column is sticky on desktop so results stay visible while
 * the user scrolls through long input forms.
 */

import type { ReactNode } from 'react';

export interface TabLayoutProps {
  /** Left panel — input form(s) */
  inputs:  ReactNode;
  /** Right panel — results, insights, warnings */
  results: ReactNode;
  /** Optional className override on the root element */
  className?: string;
}

export function TabLayout({ inputs, results, className = '' }: TabLayoutProps) {
  return (
    <div className={`flex flex-col lg:flex-row gap-4 ${className}`}>
      {/* Left — inputs */}
      <div className="w-full lg:w-[42%] space-y-4 shrink-0">
        {inputs}
      </div>

      {/* Right — results + insights + warnings */}
      <div className="w-full lg:flex-1 space-y-4">
        <div className="lg:sticky lg:top-4 space-y-4">
          {results}
        </div>
      </div>
    </div>
  );
}
