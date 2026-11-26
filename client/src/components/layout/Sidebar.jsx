import { FileText, Plus, Trash2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';

export function Sidebar({ mobileOpen, onClose }) {
  const { state, loadConversation, createConversation, deleteConversation } = useApp();

  return (
    <aside
      className={`${
        mobileOpen ? 'fixed inset-y-0 left-0 z-40 flex' : 'hidden lg:flex'
      } w-68 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-[#222631] dark:bg-[#0E1015]`}
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-4 dark:border-[#222631]">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-white dark:bg-white dark:text-[#090A0D]">
            <FileText className="h-4 w-4" />
          </span>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
              CareerFlow AI
            </h1>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Resume Optimizer</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden dark:text-[#94A3B8] dark:hover:bg-[#171A22] dark:hover:text-white"
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
          className="flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-slate-800 dark:bg-white dark:text-[#090A0D] dark:hover:bg-slate-200"
        >
          <Plus className="h-4 w-4" />
          New Session
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 pb-4" aria-label="Conversations">
        <div className="px-2 pb-2 text-[11px] font-medium uppercase tracking-wider text-slate-600 dark:text-[#94A3B8]">
          Sessions
        </div>

        {state.loadingConversations ? (
          <div className="space-y-2 px-2 py-2" aria-busy="true">
            <div className="h-8 animate-pulse rounded-md bg-slate-200/80 dark:bg-[#171A22]" />
            <div className="h-8 animate-pulse rounded-md bg-slate-200/60 dark:bg-[#171A22]/70" />
          </div>
        ) : state.conversations.length === 0 ? (
          <p className="px-2 py-4 text-xs text-slate-500 dark:text-[#94A3B8]">
            No sessions yet. Start one above.
          </p>
        ) : (
          <ul className="space-y-1">
            {state.conversations.map((conv) => {
              const active = conv.id === state.activeConversationId;
              return (
                <li key={conv.id} className="group flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      loadConversation(conv.id);
                      onClose?.();
                    }}
                    className={`min-w-0 flex-1 rounded-md border px-3 py-2 text-left text-sm transition-colors duration-150 ${
                      active
                        ? 'border-slate-300 bg-slate-100 font-medium text-slate-900 dark:border-[#323846] dark:bg-[#171A22] dark:text-white'
                        : 'border-transparent text-slate-700 hover:bg-slate-100/80 dark:text-[#94A3B8] dark:hover:bg-[#14171F] dark:hover:text-slate-100'
                    }`}
                  >
                    <span className="block truncate">{conv.title || 'New Resume Session'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteConversation(conv.id)}
                    title="Delete session"
                    aria-label={`Delete ${conv.title || 'session'}`}
                    className="shrink-0 rounded-md border border-transparent p-1.5 text-slate-500 opacity-75 transition-all duration-150 hover:border-rose-300 hover:text-rose-600 focus:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 dark:text-[#94A3B8] dark:hover:border-rose-500/40 dark:hover:text-rose-400"
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
