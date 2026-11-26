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
      className={`rounded-xl border-2 border-dashed p-8 text-center transition ${
        dragging
          ? 'border-blue-500 bg-blue-50/70 dark:border-blue-400 dark:bg-blue-950/30'
          : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900/70'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
        {state.uploadingResume ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <FileUp className="h-6 w-6" />
        )}
      </div>

      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
        {state.uploadingResume ? 'Parsing your resume...' : 'Upload your resume to begin'}
      </h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-600 dark:text-slate-400">
        Drop a PDF or DOCX file (up to 5 MB). We extract a structured resume JSON and save Version 1
        without altering your facts.
      </p>

      <button
        type="button"
        disabled={state.uploadingResume}
        onClick={() => inputRef.current?.click()}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        Choose PDF or DOCX
      </button>
    </div>
  );
}
