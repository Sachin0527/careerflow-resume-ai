import { Sparkles } from 'lucide-react';
import { SUGGESTED_PROMPTS } from '../../lib/constants.js';

export function PromptChips({ onSelect, disabled }) {
  return (
    <div className="flex flex-wrap gap-2">
      {SUGGESTED_PROMPTS.map((item) => (
        <button
          key={item.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(item)}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50/70 hover:text-blue-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:border-blue-500/50 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
        >
          <Sparkles className="h-3 w-3 text-blue-500" />
          {item.label}
        </button>
      ))}
    </div>
  );
}
