import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AlertCircle } from 'lucide-react';
import { AgentTimeline } from './AgentTimeline.jsx';
import { JdPasteBlock } from './JdPasteBlock.jsx';
import { MatchScoreCard } from './MatchScoreCard.jsx';

export function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg bg-slate-900 px-4 py-2.5 text-white dark:bg-white dark:text-[#090A0D]">
          <JdPasteBlock content={message.content} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div
        className={`max-w-[92%] rounded-lg border px-4 py-3 ${
          message.isError
            ? 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-500/40 dark:bg-rose-950/30 dark:text-rose-200'
            : 'border-slate-200 bg-white text-slate-800 dark:border-[#222631] dark:bg-[#101218] dark:text-[#F1F5F9]'
        }`}
      >
        {message.isError && (
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
            <AlertCircle className="h-4 w-4" />
            Unable to complete request
          </div>
        )}

        <AgentTimeline steps={message.agentTrace} live={false} />
        <MatchScoreCard extras={message.matchExtras} />

        <div className="prose prose-sm max-w-[70ch] text-sm leading-relaxed dark:prose-invert prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content || ''}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
