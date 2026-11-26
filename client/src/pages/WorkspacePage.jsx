import { useState } from 'react';
import { AlertTriangle, Menu, X } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { ChatPane } from '../components/chat/ChatPane.jsx';
import { ThemeToggle } from '../components/common/ThemeToggle.jsx';
import { Sidebar } from '../components/layout/Sidebar.jsx';
import { RightPanel } from '../components/resume/RightPanel.jsx';

export function WorkspacePage() {
  const { state, dispatch } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState('chat');

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sessions sidebar"
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {state.activeConversation?.title || 'New Resume Session'}
              </h2>
              {state.currentVersion && (
                <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  Active: v{state.currentVersion.versionNumber} ({state.currentVersion.createdBy})
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium xl:hidden dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setMobilePane('chat')}
                className={`rounded-md px-2.5 py-1 ${
                  mobilePane === 'chat'
                    ? 'bg-white text-slate-900 dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Chat
              </button>
              <button
                type="button"
                onClick={() => setMobilePane('resume')}
                className={`rounded-md px-2.5 py-1 ${
                  mobilePane === 'resume'
                    ? 'bg-white text-slate-900 dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Resume
              </button>
            </div>
            <ThemeToggle />
          </div>
        </header>

        {state.error && (
          <div className="flex items-center justify-between gap-2 border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {state.error}
            </span>
            <button
              type="button"
              onClick={() => dispatch({ type: 'CLEAR_ERROR' })}
              aria-label="Dismiss error"
              className="rounded p-1 hover:bg-rose-100 dark:hover:bg-rose-900/50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <main className="flex min-h-0 flex-1 overflow-hidden">
          <div
            className={`${
              mobilePane === 'chat' ? 'flex' : 'hidden xl:flex'
            } min-w-0 flex-1 flex-col`}
          >
            <ChatPane />
          </div>
          <div
            className={`${
              mobilePane === 'resume' ? 'flex' : 'hidden xl:flex'
            } w-full min-w-0 flex-col xl:w-auto xl:flex-1`}
          >
            <RightPanel />
          </div>
        </main>
      </div>
    </div>
  );
}
