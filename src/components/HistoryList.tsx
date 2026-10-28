import React from 'react';
import { History, Trash2, ArrowRight, Clock, Star } from 'lucide-react';
import { Language } from '../services/api';

export interface HistoryItem {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
}

interface HistoryListProps {
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
  languages: Language[];
}

export const HistoryList: React.FC<HistoryListProps> = ({
  items,
  onSelect,
  onClear,
  languages,
}) => {
  if (items.length === 0) return null;

  const getLangName = (code: string) => {
    if (code === 'auto') return 'Auto';
    return languages.find((l) => l.code === code)?.name || code;
  };

  return (
    <div className="mt-8 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
      <div className="px-5 py-3 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          <History className="w-4 h-4 text-indigo-500" />
          <span>Recent Translations ({items.length})</span>
        </div>
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear History</span>
        </button>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800/70 max-h-72 overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelect(item)}
            className="p-4 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors cursor-pointer group flex flex-col gap-1.5"
          >
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                <span className="font-semibold">{getLangName(item.sourceLang)}</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {getLangName(item.targetLang)}
                </span>
              </div>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <p className="text-slate-700 dark:text-slate-300 line-clamp-1 font-normal">
                {item.sourceText}
              </p>
              <p className="text-indigo-900 dark:text-indigo-200 font-medium line-clamp-1">
                {item.translatedText}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
