import { Check } from 'lucide-react';

export function MatchScoreCard({ extras }) {
  if (!extras || typeof extras.matchScore !== 'number') return null;

  const score = Math.max(0, Math.min(100, Math.round(extras.matchScore)));
  const barTone =
    score >= 75
      ? 'bg-emerald-600 dark:bg-emerald-400'
      : score >= 50
        ? 'bg-amber-600 dark:bg-amber-400'
        : 'bg-rose-600 dark:bg-rose-400';

  return (
    <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-[#222631] dark:bg-[#0B0D11]">
      <div className="space-y-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-semibold text-slate-900 dark:text-white">
            Job Description Match Score
          </span>
          <span className="font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-white">
            {score}%
          </span>
        </div>

        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-[#222631]"
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className={`h-full transition-all duration-200 ${barTone}`} style={{ width: `${score}%` }} />
        </div>

        {extras.matchedSkills?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {extras.matchedSkills.map((skill) => (
              <span
                key={`m-${skill}`}
                className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-300"
              >
                <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
                {skill}
              </span>
            ))}
          </div>
        )}

        {extras.missingSkills?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {extras.missingSkills.map((skill) => (
              <span
                key={`g-${skill}`}
                className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/50 dark:text-rose-300"
              >
                Missing: {skill}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
