import { useState } from 'react';
import { ChevronDown, ChevronRight, FileText } from 'lucide-react';

/**
 * Renders user messages cleanly, collapsing long pasted Job Descriptions into an expandable drawer.
 */
export function JdPasteBlock({ content }) {
  const [expanded, setExpanded] = useState(false);
  const text = String(content || '');
  const isLong = text.length > 360 || text.split('\n').length > 6;

  if (!isLong) {
    return <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>;
  }

  const lines = text.split('\n');
  const preview = lines[0]?.slice(0, 140) || text.slice(0, 140);

  return (
    <div className="space-y-2 text-sm">
      <p className="leading-relaxed">
        {preview}
        {preview.length < text.length ? '…' : ''}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="inline-flex items-center gap-1.5 rounded border border-white/25 bg-black/10 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-black/20 dark:border-slate-300 dark:bg-slate-100 dark:text-[#090A0D] dark:hover:bg-slate-200"
      >
        {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <FileText className="h-3.5 w-3.5" />
        {expanded
          ? 'Hide pasted text'
          : `Show full text (${text.length.toLocaleString()} chars)`}
      </button>
      {expanded && (
        <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border border-black/15 bg-black/10 p-3 font-mono text-xs leading-relaxed dark:border-slate-300 dark:bg-slate-100 dark:text-slate-900">
          {text}
        </pre>
      )}
    </div>
  );
}
