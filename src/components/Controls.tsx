import React from 'react';
import {
  Languages,
  Loader2,
  Trash2,
  ArrowLeftRight,
  Sparkles,
} from 'lucide-react';

interface ControlsProps {
  onTranslate: () => void;
  onClearAll: () => void;
  onSwap: () => void;
  isLoading: boolean;
  canTranslate: boolean;
  canSwap: boolean;
  autoTranslate: boolean;
  onToggleAutoTranslate: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  onTranslate,
  onClearAll,
  onSwap,
  isLoading,
  canTranslate,
  canSwap,
  autoTranslate,
  onToggleAutoTranslate,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-4">
      {/* Left side actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClearAll}
          title="Clear both input and output panels"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          <span>Clear All</span>
        </button>

        <button
          type="button"
          onClick={onSwap}
          disabled={!canSwap || isLoading}
          title={
            !canSwap
              ? 'Cannot swap when source is Auto-detect or text is empty'
              : 'Swap input and output languages + text'
          }
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
            !canSwap || isLoading
              ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-800 text-slate-400'
              : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4 text-indigo-500" />
          <span className="hidden sm:inline">Swap & Transfer</span>
        </button>
      </div>

      {/* Right side: Auto-translate toggle & Main Translate Action */}
      <div className="flex items-center gap-3">
        {/* Auto translate toggle */}
        <label
          className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer select-none"
          title="Automatically translate as you stop typing (debounced)"
        >
          <input
            type="checkbox"
            checked={autoTranslate}
            onChange={onToggleAutoTranslate}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700"
          />
          <span className="hidden sm:inline">Instant Translate</span>
        </label>

        {/* Primary Translate Button */}
        <button
          type="button"
          onClick={onTranslate}
          disabled={!canTranslate || isLoading}
          className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md cursor-pointer ${
            !canTranslate || isLoading
              ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/25 active:scale-[0.98]'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Translating...</span>
            </>
          ) : (
            <>
              <Languages className="w-4 h-4" />
              <span>Translate</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
