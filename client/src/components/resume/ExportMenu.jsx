import { Download } from 'lucide-react';
import { getExportUrl } from '../../api/conversationsApi.js';

export function ExportMenu({ conversationId, versionId, disabled }) {
  const isDisabled = disabled || !conversationId;

  return (
    <div className="flex items-center gap-1">
      <a
        href={isDisabled ? undefined : getExportUrl(conversationId, 'pdf', versionId)}
        aria-disabled={isDisabled}
        onClick={(e) => {
          if (isDisabled) e.preventDefault();
        }}
        className={`inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 transition-colors dark:border-[#2A303E] dark:bg-[#14171F] dark:text-white ${
          isDisabled
            ? 'pointer-events-none opacity-35'
            : 'hover:bg-slate-100 dark:hover:bg-[#1D212D]'
        }`}
      >
        <Download className="h-3.5 w-3.5" />
        PDF
      </a>
      <a
        href={isDisabled ? undefined : getExportUrl(conversationId, 'docx', versionId)}
        aria-disabled={isDisabled}
        onClick={(e) => {
          if (isDisabled) e.preventDefault();
        }}
        className={`inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-1.5 text-xs font-semibold text-white transition-colors dark:bg-white dark:text-[#090A0D] ${
          isDisabled
            ? 'pointer-events-none opacity-35'
            : 'hover:bg-slate-800 dark:hover:bg-slate-200'
        }`}
      >
        <Download className="h-3.5 w-3.5" />
        DOCX
      </a>
    </div>
  );
}
