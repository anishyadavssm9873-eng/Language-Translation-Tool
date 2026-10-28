import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { LanguageSelector } from './components/LanguageSelector';
import { TextInput } from './components/TextInput';
import { TranslationOutput } from './components/TranslationOutput';
import { Controls } from './components/Controls';
import { HistoryList, HistoryItem } from './components/HistoryList';
import { CodeDocsModal } from './components/CodeDocsModal';
import {
  fetchLanguages,
  translateText,
  fetchHealth,
  switchProvider,
  clearServerCache,
  Language,
  HealthResponse,
} from './services/api';
import { DEFAULT_LANGUAGES } from '../backend/services/translationService';

const STORAGE_KEY_SOURCE = 'polyglot_source_lang';
const STORAGE_KEY_TARGET = 'polyglot_target_lang';
const STORAGE_KEY_THEME = 'polyglot_theme';
const STORAGE_KEY_HISTORY = 'polyglot_history';

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Languages & Selection state
  const [languages, setLanguages] = useState<Language[]>(DEFAULT_LANGUAGES);
  const [sourceLang, setSourceLang] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_SOURCE) || 'auto';
  });
  const [targetLang, setTargetLang] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_TARGET) || 'es';
  });

  // Text state
  const [inputText, setInputText] = useState<string>('');
  const [translatedText, setTranslatedText] = useState<string>('');
  const [detectedLang, setDetectedLang] = useState<string | undefined>();
  const [isCached, setIsCached] = useState<boolean>(false);
  const [usedProvider, setUsedProvider] = useState<string | undefined>();

  // Process & Error states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [autoTranslate, setAutoTranslate] = useState<boolean>(false);

  // Backend Health & Docs
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [activeProvider, setActiveProvider] = useState<string>('google');
  const [isDocsOpen, setIsDocsOpen] = useState<boolean>(false);

  // History state
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Debounce timer for auto-translate
  const autoTranslateTimeoutRef = useRef<any>(null);

  // Apply theme to HTML root element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEY_THEME, theme);
  }, [theme]);

  // Persist language selection
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SOURCE, sourceLang);
  }, [sourceLang]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TARGET, targetLang);
  }, [targetLang]);

  // Save history
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history.slice(0, 30)));
    } catch {}
  }, [history]);

  // Load languages and check health on mount
  useEffect(() => {
    let mounted = true;

    async function init() {
      // 1. Fetch supported languages from backend
      try {
        const langs = await fetchLanguages();
        if (mounted && langs.length > 0) {
          setLanguages(langs);
        }
      } catch (err) {
        console.warn('Could not fetch language list, using fallback catalog:', err);
      }

      // 2. Fetch backend health
      try {
        const healthData = await fetchHealth();
        if (mounted) {
          setHealth(healthData);
          if (healthData.provider) {
            setActiveProvider(healthData.provider);
          }
        }
      } catch (err) {
        console.warn('Backend health check initial call failed:', err);
      }
    }

    init();

    // Periodic health poll every 25 seconds
    const interval = setInterval(async () => {
      try {
        const healthData = await fetchHealth();
        if (mounted) {
          setHealth(healthData);
        }
      } catch {}
    }, 25000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Main translation function
  const handleTranslate = useCallback(async () => {
    const textToTranslate = inputText.trim();
    if (!textToTranslate) {
      setErrorMessage('Please enter some text in the input box to translate.');
      return;
    }

    if (!targetLang || targetLang === 'auto') {
      setErrorMessage('Please select a valid destination target language.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await translateText({
        text: textToTranslate,
        source: sourceLang,
        target: targetLang,
      });

      setTranslatedText(response.translatedText);
      setDetectedLang(response.detectedSourceLanguage);
      setIsCached(Boolean(response.cached));
      setUsedProvider(response.provider);

      // Add to history
      if (response.translatedText && response.translatedText !== textToTranslate) {
        const newItem: HistoryItem = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          sourceText: textToTranslate,
          translatedText: response.translatedText,
          sourceLang: response.detectedSourceLanguage || sourceLang,
          targetLang,
          timestamp: Date.now(),
        };

        setHistory((prev) => [newItem, ...prev.filter((h) => h.sourceText !== textToTranslate)].slice(0, 30));
      }

      // Refresh health stats to reflect cache hit/miss count
      fetchHealth().then(setHealth).catch(() => {});
    } catch (err: any) {
      console.error('Translation error:', err);
      setErrorMessage(err.message || 'An error occurred while communicating with the translation backend.');
    } finally {
      setIsLoading(false);
    }
  }, [inputText, sourceLang, targetLang]);

  // Debounced auto-translate effect
  useEffect(() => {
    if (!autoTranslate || !inputText.trim() || inputText.trim().length < 2) {
      return;
    }

    if (autoTranslateTimeoutRef.current) {
      clearTimeout(autoTranslateTimeoutRef.current);
    }

    autoTranslateTimeoutRef.current = setTimeout(() => {
      handleTranslate();
    }, 600);

    return () => {
      if (autoTranslateTimeoutRef.current) {
        clearTimeout(autoTranslateTimeoutRef.current);
      }
    };
  }, [inputText, autoTranslate, sourceLang, targetLang, handleTranslate]);

  // Swap Languages and Text
  const handleSwap = () => {
    if (sourceLang === 'auto') {
      return;
    }
    const currentSource = sourceLang;
    const currentTarget = targetLang;
    const currentInput = inputText;
    const currentOutput = translatedText;

    setSourceLang(currentTarget);
    setTargetLang(currentSource);

    if (currentOutput) {
      setInputText(currentOutput);
      setTranslatedText(currentInput);
    }
    setErrorMessage(null);
  };

  // Clear both input & output
  const handleClearAll = () => {
    setInputText('');
    setTranslatedText('');
    setDetectedLang(undefined);
    setIsCached(false);
    setErrorMessage(null);
  };

  // Keyboard shortcut: Ctrl + Enter / Cmd + Enter to translate
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleTranslate();
    }
  };

  // Switch backend provider
  const handleSelectProvider = async (provider: string) => {
    try {
      await switchProvider(provider);
      setActiveProvider(provider);
      const h = await fetchHealth();
      setHealth(h);
    } catch (err: any) {
      console.error('Failed to change provider:', err);
      setErrorMessage(`Failed to switch provider: ${err.message}`);
    }
  };

  // Clear server cache
  const handleClearServerCache = async () => {
    try {
      await clearServerCache();
      const h = await fetchHealth();
      setHealth(h);
    } catch (err) {
      console.warn('Could not clear server cache:', err);
    }
  };

  // Restore item from history
  const handleSelectHistoryItem = (item: HistoryItem) => {
    setInputText(item.sourceText);
    setTranslatedText(item.translatedText);
    if (item.sourceLang) setSourceLang(item.sourceLang);
    if (item.targetLang) setTargetLang(item.targetLang);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* App Header */}
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenDocs={() => setIsDocsOpen(true)}
        health={health}
        activeProvider={activeProvider}
        onSelectProvider={handleSelectProvider}
        onClearCache={handleClearServerCache}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col">
        {/* Error Notification Banner */}
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/80 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer ml-3"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Translation App Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none overflow-hidden flex flex-col">
          {/* Language Selector Bar */}
          <LanguageSelector
            languages={languages}
            sourceLang={sourceLang}
            targetLang={targetLang}
            onSourceChange={setSourceLang}
            onTargetChange={setTargetLang}
            onSwap={handleSwap}
            detectedLang={detectedLang}
            isLoading={isLoading}
          />

          {/* Two-Panel Layout: Left = Input, Right = Output */}
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 min-h-[380px]">
            {/* Left Panel: Input Area */}
            <TextInput
              value={inputText}
              onChange={setInputText}
              onClear={() => {
                setInputText('');
                setErrorMessage(null);
              }}
              onKeyDown={handleKeyDown}
              isLoading={isLoading}
              maxLength={5000}
              sourceLang={sourceLang}
            />

            {/* Right Panel: Output Area */}
            <TranslationOutput
              translatedText={translatedText}
              isLoading={isLoading}
              targetLang={targetLang}
              sourceLang={sourceLang}
              detectedLang={detectedLang}
              cached={isCached}
              provider={usedProvider || activeProvider}
              languages={languages}
              error={errorMessage}
            />
          </div>

          {/* Controls Footer */}
          <div className="px-4 sm:px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/30">
            <Controls
              onTranslate={handleTranslate}
              onClearAll={handleClearAll}
              onSwap={handleSwap}
              isLoading={isLoading}
              canTranslate={Boolean(inputText.trim())}
              canSwap={sourceLang !== 'auto'}
              autoTranslate={autoTranslate}
              onToggleAutoTranslate={() => setAutoTranslate((v) => !v)}
            />
          </div>
        </div>

        {/* Recent Translations History */}
        <HistoryList
          items={history}
          onSelect={handleSelectHistoryItem}
          onClear={() => setHistory([])}
          languages={languages}
        />
      </main>

      {/* Setup Instructions, File-by-file Code & cURL Modal */}
      <CodeDocsModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 py-4 px-6 text-center text-xs text-slate-400 dark:text-slate-500">
        Polyglot Translation App &bull; Powered by Google Cloud Translation API (v2) architecture &bull; End-to-end secret isolation
      </footer>
    </div>
  );
}
