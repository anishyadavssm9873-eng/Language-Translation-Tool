import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Controls({
  onTranslate,
  onClear,
  isLoading,
  canTranslate,
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800">
      <button
        type="button"
        onClick={onClear}
        className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
      >
        Clear All
      </button>

      <button
        type="button"
        onClick={onTranslate}
        disabled={!canTranslate || isLoading}
        className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors cursor-pointer"
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        <span>{isLoading ? 'Translating...' : 'Translate'}</span>
      </button>
    </div>
  );
}
