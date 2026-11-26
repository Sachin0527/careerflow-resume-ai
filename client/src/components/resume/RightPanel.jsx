import { Redo2, Undo2 } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
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
    <aside className="flex h-full w-full flex-col border-l border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/80 xl:w-[48%]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
          {TABS.map((tab) => {
            const active = state.rightTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => dispatch({ type: 'SET_RIGHT_TAB', payload: tab.id })}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!state.canUndo || state.isStreaming}
              onClick={undo}
              title="Undo version"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Undo
            </button>
            <button
              type="button"
              disabled={!state.canRedo || state.isStreaming}
              onClick={redo}
              title="Redo version"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
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
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        {state.rightTab === 'preview' && <ResumePreview resume={state.currentResume} />}
        {state.rightTab === 'changes' && <DiffViewer comparison={state.lastComparison} />}
        {state.rightTab === 'versions' && <VersionTimeline />}
      </div>
    </aside>
  );
}
