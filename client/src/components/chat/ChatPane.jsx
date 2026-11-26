import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { AgentTimeline } from './AgentTimeline.jsx';
import { ChatInput } from './ChatInput.jsx';
import { MatchScoreCard } from './MatchScoreCard.jsx';
import { MessageBubble } from './MessageBubble.jsx';
import { PromptChips } from './PromptChips.jsx';
import { UploadDropzone } from './UploadDropzone.jsx';

export function ChatPane() {
  const { state, sendMessage } = useApp();
  const [draft, setDraft] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages.length, state.activeStream?.tokens, state.activeStream?.steps?.length]);

  const handleSelectChip = (chip) => {
    if (chip.needsJd) {
      setDraft(chip.prompt);
      return;
    }
    if (state.currentResume && !state.isStreaming) {
      sendMessage(chip.prompt);
    } else {
      setDraft(chip.prompt);
    }
  };

  const handleSubmit = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    sendMessage(text);
  };

  const hasResume = Boolean(state.currentResume);

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-slate-50/70 dark:bg-slate-950/60">
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
        {!hasResume && !state.loadingDetail && <UploadDropzone />}

        {hasResume && state.messages.length === 0 && !state.isStreaming && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Resume ready for optimization
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Try a suggested prompt below, paste a job description, or describe what you want to
              tailor.
            </p>
            <div className="mt-3">
              <PromptChips onSelect={handleSelectChip} disabled={state.isStreaming} />
            </div>
          </div>
        )}

        {state.messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {state.isStreaming && state.activeStream && (
          <div className="flex justify-start">
            <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{state.streamStatus || 'Working...'}</span>
              </div>

              <AgentTimeline steps={state.activeStream.steps} live />
              <MatchScoreCard extras={state.activeStream.matchExtras} />

              {state.activeStream.tokens && (
                <div className="prose prose-sm max-w-none text-sm leading-relaxed dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {state.activeStream.tokens}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-200 bg-white/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/90 sm:px-6">
        {hasResume && state.messages.length > 0 && (
          <div className="mb-2.5 overflow-x-auto pb-0.5">
            <PromptChips onSelect={handleSelectChip} disabled={state.isStreaming} />
          </div>
        )}
        <ChatInput
          value={draft}
          onChange={setDraft}
          onSubmit={handleSubmit}
          disabled={state.isStreaming || !state.activeConversationId}
          hasResume={hasResume}
        />
      </div>
    </section>
  );
}
