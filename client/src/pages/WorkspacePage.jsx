import { useState } from 'react';
import { AlertTriangle, Menu, X } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { ChatPane } from '../components/chat/ChatPane.jsx';
import { ThemeToggle } from '../components/common/ThemeToggle.jsx';
import { Sidebar } from '../components/layout/Sidebar.jsx';
import { RightPanel } from '../components/resume/RightPanel.jsx';

export function WorkspacePage() {
  const { state, dispatch, retryConnection } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState('chat');

  return (
    <div className="flex h-dvh w-screen overflow-hidden bg-slate-100 text-slate-900 dark:bg-[#090A0D] dark:text-[#F8FAFC]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Unified mobile/tablet header below xl; on xl+ each column keeps its aligned h-14 hairline top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 xl:hidden dark:border-[#222631] dark:bg-[#0E1015]">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sessions sidebar"
              className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-[#94A3B8] dark:hover:bg-[#171A22] dark:hover:text-white"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {state.activeConversation?.title || 'New Resume Session'}
              </h2>
              {state.currentVersion && (
                <p className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-[#94A3B8]">
                  Active: v{state.currentVersion.versionNumber} ({state.currentVersion.createdBy})
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold dark:border-[#222631] dark:bg-[#090A0D]">
              <button
                type="button"
                onClick={() => setMobilePane('chat')}
                className={`rounded px-2.5 py-1 transition-colors ${
                  mobilePane === 'chat'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-[#090A0D]'
                    : 'text-slate-600 dark:text-[#94A3B8]'
                }`}
              >
                Chat
              </button>
              <button
                type="button"
                onClick={() => setMobilePane('resume')}
                className={`rounded px-2.5 py-1 transition-colors ${
                  mobilePane === 'resume'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-[#090A0D]'
                    : 'text-slate-600 dark:text-[#94A3B8]'
                }`}
              >
                Resume
              </button>
            </div>
            <ThemeToggle />
          </div>
        </header>

        {state.error && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-200">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {state.error}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={retryConnection}
                className="rounded border border-rose-300 px-2 py-0.5 font-medium transition-colors hover:bg-rose-100 dark:border-rose-400/40 dark:hover:bg-rose-900/50"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'CLEAR_ERROR' })}
                aria-label="Dismiss error"
                className="rounded p-1 hover:bg-rose-100 dark:hover:bg-rose-900/50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        <main className="flex min-h-0 flex-1 overflow-hidden">
          <div
            className={`${
              mobilePane === 'chat' ? 'flex' : 'hidden xl:flex'
            } min-w-0 flex-1 flex-col`}
          >
            <div className="hidden h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 xl:flex dark:border-[#222631] dark:bg-[#0E1015]">
              <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {state.activeConversation?.title || 'New Resume Session'}
              </h2>
              {state.currentVersion && (
                <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-[#94A3B8]">
                  v{state.currentVersion.versionNumber} · {state.currentVersion.createdBy}
                </span>
              )}
            </div>
            <ChatPane />
          </div>

          <div
            className={`${
              mobilePane === 'resume' ? 'flex' : 'hidden xl:flex'
            } w-full min-w-0 flex-col xl:w-[50%] xl:flex-none`}
          >
            <RightPanel />
          </div>
        </main>
      </div>
    </div>
  );
}
