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
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-blue-600 px-4 py-2.5 text-white">
          <JdPasteBlock content={message.content} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div
        className={`max-w-[92%] rounded-2xl rounded-bl-sm border px-4 py-3 ${
          message.isError
            ? 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200'
            : 'border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100'
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

        <div className="prose prose-sm max-w-none text-sm leading-relaxed dark:prose-invert prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content || ''}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
