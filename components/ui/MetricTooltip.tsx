import React from "react";

export interface MetricTooltipProps {
  title: string;
  description: string;
}

/** 指標説明を表示するツールチップ。 */
export function MetricTooltip({ title, description }: MetricTooltipProps): React.JSX.Element {
  return (
    <span className="group relative inline-flex items-center">
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-bold text-slate-600"
        aria-label={`${title}の説明`}
      >
        ?
      </button>
      <span className="pointer-events-none absolute left-1/2 top-7 z-20 hidden w-64 -translate-x-1/2 rounded-md bg-slate-900 px-3 py-2 text-xs leading-relaxed text-white shadow-lg group-hover:block group-focus-within:block">
        {description}
      </span>
    </span>
  );
}
