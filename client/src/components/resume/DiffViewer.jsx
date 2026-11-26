export function DiffViewer({ comparison }) {
  if (!comparison) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-[#222631] dark:bg-[#101218] dark:text-[#94A3B8]">
        Make an edit via chat or select two versions in the Versions tab to inspect side-by-side
        section diffs.
      </div>
    );
  }

  const changedSections = (comparison.sections || []).filter((s) => s.changed);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm dark:border-[#222631] dark:bg-[#101218]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
            v{comparison.from?.versionNumber} → v{comparison.to?.versionNumber}
          </span>
          <span className="text-xs text-slate-600 dark:text-[#94A3B8]">{comparison.summary}</span>
        </div>
      </div>

      {changedSections.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-[#222631] dark:bg-[#101218] dark:text-[#94A3B8]">
          These two versions have identical resume content.
        </div>
      ) : (
        changedSections.map((section) => (
          <div
            key={section.section}
            className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-[#222631] dark:bg-[#101218]"
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2 dark:border-[#222631] dark:bg-[#14171F]">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-white">
                {section.section}
              </span>
              <span className="font-mono text-xs tabular-nums">
                <span className="text-rose-600 dark:text-rose-400">-{section.removedLines}</span>{' '}
                <span className="text-emerald-600 dark:text-emerald-400">+{section.addedLines}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 divide-y divide-slate-200 md:grid-cols-2 md:divide-x md:divide-y-0 dark:divide-[#222631]">
              <div className="p-3">
                <div className="mb-1.5 font-mono text-[11px] font-semibold uppercase text-slate-600 dark:text-[#94A3B8]">
                  Before (v{comparison.from?.versionNumber})
                </div>
                <div className="space-y-0.5 font-mono text-xs leading-relaxed">
                  {(section.hunks || [])
                    .filter((h) => !h.added)
                    .map((hunk, i) => (
                      <pre
                        key={i}
                        className={`whitespace-pre-wrap rounded px-1.5 py-0.5 ${
                          hunk.removed
                            ? 'bg-rose-50 text-rose-900 dark:bg-rose-950/55 dark:text-rose-200'
                            : 'text-slate-600 dark:text-[#94A3B8]'
                        }`}
                      >
                        {hunk.value}
                      </pre>
                    ))}
                </div>
              </div>

              <div className="p-3">
                <div className="mb-1.5 font-mono text-[11px] font-semibold uppercase text-slate-600 dark:text-[#94A3B8]">
                  After (v{comparison.to?.versionNumber})
                </div>
                <div className="space-y-0.5 font-mono text-xs leading-relaxed">
                  {(section.hunks || [])
                    .filter((h) => !h.removed)
                    .map((hunk, i) => (
                      <pre
                        key={i}
                        className={`whitespace-pre-wrap rounded px-1.5 py-0.5 ${
                          hunk.added
                            ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/55 dark:text-emerald-200'
                            : 'text-slate-600 dark:text-[#94A3B8]'
                        }`}
                      >
                        {hunk.value}
                      </pre>
                    ))}
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
