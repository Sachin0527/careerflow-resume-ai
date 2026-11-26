import { ArrowUpRight } from 'lucide-react';
import { SUGGESTED_PROMPTS } from '../../lib/constants.js';

export function PromptChips({ onSelect, disabled }) {
  return (
    <div className="flex flex-nowrap gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible">
      {SUGGESTED_PROMPTS.map((item) => (
        <button
          key={item.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(item)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 transition-colors duration-150 hover:border-slate-900 hover:bg-slate-50 disabled:opacity-45 dark:border-[#2A303E] dark:bg-[#12141B] dark:text-[#E2E8F0] dark:hover:border-white/70 dark:hover:bg-[#1A1D26] dark:hover:text-white"
        >
          <span>{item.label}</span>
          <ArrowUpRight className="h-3 w-3 text-slate-400 dark:text-[#94A3B8]" />
        </button>
      ))}
    </div>
  );
}
