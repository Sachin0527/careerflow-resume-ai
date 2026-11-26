import { useRef, useState } from 'react';
import { FileUp, Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';

export function UploadDropzone() {
  const { state, uploadResume } = useApp();
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files) => {
    const file = files?.[0];
    if (!file) return;
    uploadResume(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`rounded-lg border border-dashed p-8 text-center transition-colors duration-150 ${
        dragging
          ? 'border-slate-900 bg-slate-100 dark:border-white dark:bg-[#171A22]'
          : 'border-slate-300 bg-white dark:border-[#2E3444] dark:bg-[#101218]'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="mx-auto mb-3.5 flex h-11 w-11 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-900 dark:border-[#2A303E] dark:bg-[#171A22] dark:text-white">
        {state.uploadingResume ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <FileUp className="h-5 w-5" />
        )}
      </div>

      <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
        {state.uploadingResume ? 'Parsing your resume into structured JSON...' : 'Upload your resume to begin'}
      </h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-slate-600 dark:text-[#94A3B8]">
        Drop a PDF or DOCX file (up to 5 MB). Version 1 is extracted verbatim with zero invented
        facts and rendered on the white proof sheet.
      </p>

      <button
        type="button"
        disabled={state.uploadingResume}
        onClick={() => inputRef.current?.click()}
        className="mt-5 inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-slate-800 disabled:opacity-45 dark:bg-white dark:text-[#090A0D] dark:hover:bg-slate-200"
      >
        Choose PDF or DOCX
      </button>
    </div>
  );
}
