import { Download } from 'lucide-react';
import { getExportUrl } from '../../api/conversationsApi.js';

export function ExportMenu({ conversationId, versionId, disabled }) {
  if (!conversationId) return null;

  return (
    <div className="flex items-center gap-1.5">
      <a
        href={disabled ? undefined : getExportUrl(conversationId, 'pdf', versionId)}
        aria-disabled={disabled}
        onClick={(e) => {
          if (disabled) e.preventDefault();
        }}
        className={`inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 ${
          disabled
            ? 'pointer-events-none opacity-40'
            : 'hover:bg-slate-50 dark:hover:bg-slate-700'
        }`}
      >
        <Download className="h-3.5 w-3.5" />
        PDF
      </a>
      <a
        href={disabled ? undefined : getExportUrl(conversationId, 'docx', versionId)}
        aria-disabled={disabled}
        onClick={(e) => {
          if (disabled) e.preventDefault();
        }}
        className={`inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 ${
          disabled
            ? 'pointer-events-none opacity-40'
            : 'hover:bg-slate-50 dark:hover:bg-slate-700'
        }`}
      >
        <Download className="h-3.5 w-3.5" />
        DOCX
      </a>
    </div>
  );
}
