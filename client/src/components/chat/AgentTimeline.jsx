import { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, Loader2, XCircle } from 'lucide-react';
import { AGENT_LABELS } from '../../lib/constants.js';

export function AgentTimeline({ steps = [], live = false }) {
  const [open, setOpen] = useState(live);

  if (!steps || steps.length === 0) return null;

  return (
    <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 text-xs dark:border-[#222631] dark:bg-[#0B0D11]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-3 py-2 text-left font-medium text-slate-800 dark:text-white"
      >
        <span className="flex items-center gap-2">
          {live ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-900 dark:text-white" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          )}
          <span>
            Agent Ledger ({steps.length} step{steps.length === 1 ? '' : 's'})
          </span>
        </span>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-slate-500 dark:text-[#94A3B8]" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-slate-500 dark:text-[#94A3B8]" />
        )}
      </button>

      {open && (
        <div className="divide-y divide-slate-200 border-t border-slate-200 dark:divide-[#222631] dark:border-[#222631]">
          {steps.map((step, idx) => {
            const label = AGENT_LABELS[step.agent] || step.agent;
            const status = step.status || 'completed';
            return (
              <div key={`${step.agent}-${idx}`} className="space-y-1.5 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                    {status === 'running' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-900 dark:text-white" />
                    ) : status === 'failed' ? (
                      <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    )}
                    {label}
                  </span>
                  {typeof step.durationMs === 'number' && (
                    <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-[#94A3B8]">
                      {(step.durationMs / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>

                {Array.isArray(step.subSteps) && step.subSteps.length > 0 && (
                  <ul className="space-y-0.5 pl-5 text-slate-600 dark:text-[#94A3B8]">
                    {step.subSteps.map((s, sIdx) => (
                      <li key={sIdx}>• {s}</li>
                    ))}
                  </ul>
                )}

                {Array.isArray(step.reasoning) && step.reasoning.length > 0 && (
                  <ul className="space-y-0.5 pl-5 text-slate-700 dark:text-slate-300">
                    {step.reasoning.map((r, rIdx) => (
                      <li key={rIdx}>— {r}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
