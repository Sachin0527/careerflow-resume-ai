import { Redo2, Undo2 } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { ThemeToggle } from '../common/ThemeToggle.jsx';
import { DiffViewer } from './DiffViewer.jsx';
import { ExportMenu } from './ExportMenu.jsx';
import { ResumePreview } from './ResumePreview.jsx';
import { VersionTimeline } from './VersionTimeline.jsx';

const TABS = [
  { id: 'preview', label: 'Preview' },
  { id: 'changes', label: 'Changes' },
  { id: 'versions', label: 'Versions' },
];

export function RightPanel() {
  const { state, dispatch, undo, redo } = useApp();

  return (
    <aside className="flex h-full w-full flex-col border-l border-slate-200 bg-[#E8EAEF] dark:border-[#222631] dark:bg-[#060709]">
      <div className="flex h-14 shrink-0 items-center justify-between gap-1.5 border-b border-slate-200 bg-white px-3 dark:border-[#222631] dark:bg-[#0E1015]">
        <div className="flex items-center gap-0.5 rounded-md border border-slate-200 bg-slate-100 p-0.5 dark:border-[#222631] dark:bg-[#090A0D]">
          {TABS.map((tab) => {
            const active = state.rightTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => dispatch({ type: 'SET_RIGHT_TAB', payload: tab.id })}
                className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors duration-150 ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-[#090A0D]'
                    : 'text-slate-600 hover:text-slate-900 dark:text-[#94A3B8] dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!state.canUndo || state.isStreaming}
              onClick={undo}
              title="Undo version"
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-100 disabled:opacity-35 dark:border-[#2A303E] dark:bg-[#14171F] dark:text-white dark:hover:bg-[#1D212D]"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Undo
            </button>
            <button
              type="button"
              disabled={!state.canRedo || state.isStreaming}
              onClick={redo}
              title="Redo version"
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-100 disabled:opacity-35 dark:border-[#2A303E] dark:bg-[#14171F] dark:text-white dark:hover:bg-[#1D212D]"
            >
              <Redo2 className="h-3.5 w-3.5" />
              Redo
            </button>
          </div>

          <ExportMenu
            conversationId={state.activeConversationId}
            versionId={state.currentVersion?.id}
            disabled={!state.currentResume}
          />

          <div className="hidden xl:block">
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {state.rightTab === 'preview' && (
          <ResumePreview
            resume={state.currentResume}
            versionNumber={state.currentVersion?.versionNumber}
          />
        )}
        {state.rightTab === 'changes' && <DiffViewer comparison={state.lastComparison} />}
        {state.rightTab === 'versions' && <VersionTimeline />}
      </div>
    </aside>
  );
}
