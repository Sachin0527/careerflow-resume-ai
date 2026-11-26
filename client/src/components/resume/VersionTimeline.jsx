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
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-[#222631] dark:bg-[#101218] dark:text-[#94A3B8]">
        No resume versions recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {versions.length >= 2 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 text-xs dark:border-[#222631] dark:bg-[#101218]">
          <span className="font-medium text-slate-700 dark:text-[#CBD5E1]">Compare:</span>
          <select
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            aria-label="From version"
            className="rounded border border-slate-300 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-900 dark:border-[#2A303E] dark:bg-[#171A22] dark:text-white"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                v{v.versionNumber} ({v.createdBy})
              </option>
            ))}
          </select>
          <span className="text-slate-500 dark:text-[#94A3B8]">→</span>
          <select
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            aria-label="To version"
            className="rounded border border-slate-300 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-900 dark:border-[#2A303E] dark:bg-[#171A22] dark:text-white"
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
            className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1 font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-40 dark:bg-white dark:text-[#090A0D] dark:hover:bg-slate-200"
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
            className={`rounded-lg border p-3.5 transition-colors ${
              v.isCurrent
                ? 'border-slate-400 bg-white dark:border-white/45 dark:bg-[#14171F]'
                : 'border-slate-200 bg-white dark:border-[#222631] dark:bg-[#101218]'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold tabular-nums text-slate-900 dark:border-[#2A303E] dark:bg-[#1B1F2A] dark:text-white">
                  v{v.versionNumber}
                </span>
                <span className="text-xs font-medium text-slate-800 dark:text-[#E2E8F0]">
                  {v.createdBy}
                </span>
                {v.isCurrent && (
                  <span className="rounded bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white dark:bg-white dark:text-[#090A0D]">
                    Active
                  </span>
                )}
              </div>

              {!v.isCurrent && (
                <button
                  type="button"
                  onClick={() => restoreVersion(v.id)}
                  className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-100 dark:border-[#2A303E] dark:bg-[#171A22] dark:text-white dark:hover:bg-[#222733]"
                >
                  <RotateCcw className="h-3 w-3" />
                  Restore
                </button>
              )}
            </div>

            {v.changeSummary && (
              <p className="mt-1.5 text-xs text-slate-600 dark:text-[#94A3B8]">
                {v.changeSummary}
              </p>
            )}
            {v.createdAt && (
              <p className="mt-1 font-mono text-[11px] tabular-nums text-slate-500 dark:text-[#94A3B8]">
                {new Date(v.createdAt).toLocaleString()}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
