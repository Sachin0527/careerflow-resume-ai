import { Send } from 'lucide-react';

export function ChatInput({ value, onChange, onSubmit, disabled, hasResume }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) {
        onSubmit();
      }
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled && value.trim()) {
          onSubmit();
        }
      }}
      className="flex items-end gap-2 rounded-lg border border-slate-300 bg-white p-2 transition-colors focus-within:border-slate-900 dark:border-[#2A303E] dark:bg-[#101218] dark:focus-within:border-white/75"
    >
      <textarea
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={
          hasResume
            ? 'Ask to optimize for a company, paste a job description, translate, or enhance a section...'
            : 'Upload a resume above or ask a question...'
        }
        className="max-h-44 min-h-[44px] flex-1 resize-y bg-transparent px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none disabled:opacity-50 dark:text-white dark:placeholder:text-[#94A3B8]"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        aria-label="Send message"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white transition-colors duration-150 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-35 dark:bg-white dark:text-[#090A0D] dark:hover:bg-slate-200"
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  );
}
