import { FileText, Plus, Trash2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';

export function Sidebar({ mobileOpen, onClose }) {
  const { state, loadConversation, createConversation, deleteConversation } = useApp();

  return (
    <aside
      className={`${
        mobileOpen ? 'fixed inset-y-0 left-0 z-40 flex' : 'hidden lg:flex'
      } w-72 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900`}
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <FileText className="h-4 w-4" />
          </span>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              CareerFlow AI
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Resume Optimizer</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-3">
        <button
          type="button"
          onClick={() => {
            createConversation();
            onClose?.();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
        >
          <Plus className="h-4 w-4" />
          New Session
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4" aria-label="Conversations">
        <div className="px-2 pb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          Sessions
        </div>
        {state.loadingConversations ? (
          <p className="px-2 py-4 text-xs text-slate-500 dark:text-slate-400">Loading sessions...</p>
        ) : state.conversations.length === 0 ? (
          <p className="px-2 py-4 text-xs text-slate-500 dark:text-slate-400">
            No sessions yet. Start one above.
          </p>
        ) : (
          <ul className="space-y-1">
            {state.conversations.map((conv) => {
              const active = conv.id === state.activeConversationId;
              return (
                <li key={conv.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => {
                      loadConversation(conv.id);
                      onClose?.();
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                      active
                        ? 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <span className="truncate pr-6">{conv.title || 'New Resume Session'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    title="Delete session"
                    aria-label={`Delete ${conv.title || 'session'}`}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 focus:opacity-100 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </aside>
  );
}
