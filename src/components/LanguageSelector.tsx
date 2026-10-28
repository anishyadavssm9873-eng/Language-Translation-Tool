import React from 'react';
import { ArrowLeftRight, Sparkles, ChevronDown } from 'lucide-react';
import { Language } from '../services/api';

interface LanguageSelectorProps {
  languages: Language[];
  sourceLang: string;
  targetLang: string;
  onSourceChange: (code: string) => void;
  onTargetChange: (code: string) => void;
  onSwap: () => void;
  detectedLang?: string;
  isLoading?: boolean;
}

const POPULAR_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'hi', name: 'Hindi' },
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  languages,
  sourceLang,
  targetLang,
  onSourceChange,
  onTargetChange,
  onSwap,
  detectedLang,
  isLoading,
}) => {
  const getLanguageName = (code: string) => {
    if (code === 'auto') return 'Auto-detect';
    return languages.find((l) => l.code === code)?.name || code;
  };

  const detectedLanguageName = detectedLang
    ? languages.find((l) => l.code === detectedLang)?.name || detectedLang
    : null;

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 sm:px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
        {/* Source Language Column */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-1.5 min-w-[140px]">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              From:
            </span>
            <div className="relative flex-1">
              <select
                value={sourceLang}
                onChange={(e) => onSourceChange(e.target.value)}
                disabled={isLoading}
                className="w-full appearance-none bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-900 dark:text-white font-medium text-sm rounded-lg pl-3 pr-8 py-2 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-colors"
              >
                <option value="auto">
                  Detect Language {detectedLanguageName ? `(${detectedLanguageName})` : ''}
                </option>
                <optgroup label="Supported Languages">
                  {languages.map((lang) => (
                    <option key={`src-${lang.code}`} value={lang.code}>
                      {lang.name} {lang.nativeName ? `(${lang.nativeName})` : ''}
                    </option>
                  ))}
                </optgroup>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Quick source pills */}
          <div className="hidden lg:flex items-center gap-1 overflow-x-auto py-0.5">
            <button
              type="button"
              onClick={() => onSourceChange('auto')}
              className={`text-xs px-2.5 py-1 rounded-md transition-all whitespace-nowrap ${
                sourceLang === 'auto'
                  ? 'bg-indigo-600 text-white font-medium shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Auto
            </button>
            {POPULAR_LANGUAGES.slice(0, 4).map((lang) => (
              <button
                key={`quick-src-${lang.code}`}
                type="button"
                onClick={() => onSourceChange(lang.code)}
                className={`text-xs px-2.5 py-1 rounded-md transition-all whitespace-nowrap ${
                  sourceLang === lang.code
                    ? 'bg-indigo-600 text-white font-medium shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {lang.name}
              </button>
            ))}
          </div>
        </div>

        {/* Target Language Column & Swap */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          {/* Swap Button */}
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <button
              type="button"
              onClick={onSwap}
              disabled={isLoading || sourceLang === 'auto'}
              title={
                sourceLang === 'auto'
                  ? 'Cannot swap when source is set to Auto-detect'
                  : 'Swap source and target languages (and transfer text)'
              }
              aria-label="Swap languages"
              className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium ${
                sourceLang === 'auto'
                  ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-800 text-slate-400'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 active:scale-95'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4 text-indigo-500" />
              <span className="sm:hidden text-xs">Swap</span>
            </button>

            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              To:
            </span>

            <div className="relative flex-1 min-w-[140px]">
              <select
                value={targetLang}
                onChange={(e) => onTargetChange(e.target.value)}
                disabled={isLoading}
                className="w-full appearance-none bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-900 dark:text-white font-medium text-sm rounded-lg pl-3 pr-8 py-2 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-colors"
              >
                {languages.map((lang) => (
                  <option key={`tgt-${lang.code}`} value={lang.code}>
                    {lang.name} {lang.nativeName ? `(${lang.nativeName})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Quick target pills */}
          <div className="hidden lg:flex items-center gap-1 overflow-x-auto py-0.5">
            {POPULAR_LANGUAGES.slice(0, 4).map((lang) => (
              <button
                key={`quick-tgt-${lang.code}`}
                type="button"
                onClick={() => onTargetChange(lang.code)}
                className={`text-xs px-2.5 py-1 rounded-md transition-all whitespace-nowrap ${
                  targetLang === lang.code
                    ? 'bg-indigo-600 text-white font-medium shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {lang.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
