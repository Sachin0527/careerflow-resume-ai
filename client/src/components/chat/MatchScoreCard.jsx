export function MatchScoreCard({ extras }) {
  if (!extras || typeof extras.matchScore !== 'number') return null;

  const score = Math.max(0, Math.min(100, Math.round(extras.matchScore)));
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  const scoreTone =
    score >= 75
      ? 'text-emerald-600 dark:text-emerald-400'
      : score >= 50
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-rose-600 dark:text-rose-400';

  return (
    <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/60">
      <div className="flex items-center gap-4">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
          <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
            <circle
              cx="32"
              cy="32"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-slate-200 dark:text-slate-700"
            />
            <circle
              cx="32"
              cy="32"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className={scoreTone}
            />
          </svg>
          <span className="absolute font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {score}%
          </span>
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            Job Description Match Score
          </div>

          {extras.matchedSkills?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {extras.matchedSkills.map((skill) => (
                <span
                  key={`m-${skill}`}
                  className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                >
                  ✓ {skill}
                </span>
              ))}
            </div>
          )}

          {extras.missingSkills?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {extras.missingSkills.map((skill) => (
                <span
                  key={`g-${skill}`}
                  className="rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-800 dark:bg-rose-950/70 dark:text-rose-300"
                >
                  Missing: {skill}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
