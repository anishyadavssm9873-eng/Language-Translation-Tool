import React from 'react';
import { ArrowLeftRight, ChevronDown } from 'lucide-react';

export default function LanguageSelector({
  languages = [],
  sourceLang,
  targetLang,
  onSourceChange,
  onTargetChange,
  onSwap,
  detectedLang,
  isLoading,
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4">
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Source Dropdown */}
        <div className="flex-1 w-full flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">From:</span>
          <div className="relative flex-1">
            <select
              value={sourceLang}
              onChange={(e) => onSourceChange(e.target.value)}
              disabled={isLoading}
              className="w-full appearance-none bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm rounded-lg pl-3 pr-8 py-2 border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <option value="auto">
                Auto-detect {detectedLang ? `(${detectedLang})` : ''}
              </option>
              {languages.map((l) => (
                <option key={`src-${l.code}`} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Swap Button */}
        <button
          type="button"
          onClick={onSwap}
          disabled={isLoading || sourceLang === 'auto'}
          title="Swap languages"
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <ArrowLeftRight className="w-4 h-4 text-indigo-500" />
        </button>

        {/* Target Dropdown */}
        <div className="flex-1 w-full flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To:</span>
          <div className="relative flex-1">
            <select
              value={targetLang}
              onChange={(e) => onTargetChange(e.target.value)}
              disabled={isLoading}
              className="w-full appearance-none bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm rounded-lg pl-3 pr-8 py-2 border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              {languages.map((l) => (
                <option key={`tgt-${l.code}`} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
