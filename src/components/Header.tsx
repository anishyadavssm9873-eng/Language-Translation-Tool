import React from 'react';
import {
  Languages,
  Moon,
  Sun,
  Server,
  BookOpen,
  Settings,
  Sparkles,
  Database,
} from 'lucide-react';
import { HealthResponse } from '../services/api';

interface HeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenDocs: () => void;
  health: HealthResponse | null;
  activeProvider: string;
  onSelectProvider: (provider: string) => void;
  onClearCache: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  onOpenDocs,
  health,
  activeProvider,
  onSelectProvider,
  onClearCache,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 sm:px-6 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Languages className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Polyglot
              </h1>
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                v2 API
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              Secure Full-Stack Language Translation
            </p>
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Provider selector pill */}
          <div className="hidden md:flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300">
            <span className="text-slate-400 font-medium">Provider:</span>
            <select
              value={activeProvider}
              onChange={(e) => onSelectProvider(e.target.value)}
              className="bg-transparent font-semibold text-indigo-600 dark:text-indigo-400 cursor-pointer focus:outline-none"
              title="Select translation backend engine"
            >
              <option value="google" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                Google Cloud v2
              </option>
              <option value="gemini" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                Gemini 2.5 Flash
              </option>
              <option value="libretranslate" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                LibreTranslate
              </option>
              <option value="microsoft" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                Microsoft Azure
              </option>
              <option value="fallback" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                Local Heuristic
              </option>
            </select>
          </div>

          {/* Backend Status indicator */}
          <div
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300"
            title={
              health
                ? `Backend online | Uptime: ${health.uptimeSeconds}s | Cache: ${health.cacheStats.size} items (${health.cacheStats.hits} hits)`
                : 'Connecting to backend...'
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                health ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="hidden sm:inline font-mono text-[11px]">
              {health ? 'API Ready' : 'Connecting'}
            </span>
            {health && health.cacheStats.hits > 0 && (
              <span
                onClick={onClearCache}
                title="Click to clear server translation cache"
                className="hidden lg:inline text-[10px] text-slate-400 hover:text-indigo-500 cursor-pointer ml-1 pl-1 border-l border-slate-300 dark:border-slate-700"
              >
                Cache: {health.cacheStats.hits} hits
              </span>
            )}
          </div>

          {/* Setup Instructions & Code Docs Modal Trigger */}
          <button
            onClick={onOpenDocs}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/60 dark:border-indigo-800/60 transition-all cursor-pointer shadow-xs"
            title="View setup guide, curl examples, and code files"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Docs & Setup</span>
          </button>

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-colors cursor-pointer"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
