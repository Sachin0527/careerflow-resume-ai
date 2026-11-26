import { useEffect, useState } from 'react';
import { GitCompare, RotateCcw } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';

export function VersionTimeline() {
  const { state, compareVersions, restoreVersion } = useApp();
  const versions = state.versions || [];
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');

  useEffect(() => {
    if (versions.length >= 2) {
      setToId(versions[0].id);
      setFromId(versions[1].id);
    } else if (versions.length === 1) {
      setToId(versions[0].id);
      setFromId(versions[0].id);
    } else {
      setToId('');
      setFromId('');
    }
  }, [versions]);

  if (versions.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        No resume versions recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {versions.length >= 2 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="font-medium text-slate-700 dark:text-slate-300">Compare:</span>
          <select
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            aria-label="From version"
            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                v{v.versionNumber} ({v.createdBy})
              </option>
            ))}
          </select>
          <span className="text-slate-400">→</span>
          <select
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            aria-label="To version"
            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                v{v.versionNumber} ({v.createdBy})
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!fromId || !toId || fromId === toId}
            onClick={() => compareVersions(fromId, toId)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1 font-medium text-white transition hover:bg-blue-700 disabled:opacity-40"
          >
            <GitCompare className="h-3.5 w-3.5" />
            Compare
          </button>
        </div>
      )}

      <ol className="space-y-2.5">
        {versions.map((v) => (
          <li
            key={v.id}
            className={`rounded-xl border p-3.5 transition ${
              v.isCurrent
                ? 'border-blue-300 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30'
                : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold tabular-nums text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                  v{v.versionNumber}
                </span>
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  {v.createdBy}
                </span>
                {v.isCurrent && (
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                    Active
                  </span>
                )}
              </div>

              {!v.isCurrent && (
                <button
                  type="button"
                  onClick={() => restoreVersion(v.id)}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <RotateCcw className="h-3 w-3" />
                  Restore
                </button>
              )}
            </div>

            {v.changeSummary && (
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
                {v.changeSummary}
              </p>
            )}
            {v.createdAt && (
              <p className="mt-1 font-mono text-[11px] text-slate-400 dark:text-slate-500">
                {new Date(v.createdAt).toLocaleString()}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
