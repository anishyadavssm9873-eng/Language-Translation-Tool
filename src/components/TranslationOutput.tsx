import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  Info,
  Clock,
  Layers,
} from 'lucide-react';
import { Language } from '../services/api';

interface TranslationOutputProps {
  translatedText: string;
  isLoading: boolean;
  targetLang: string;
  sourceLang: string;
  detectedLang?: string;
  cached?: boolean;
  provider?: string;
  languages: Language[];
  error?: string | null;
}

export const TranslationOutput: React.FC<TranslationOutputProps> = ({
  translatedText,
  isLoading,
  targetLang,
  sourceLang,
  detectedLang,
  cached,
  provider,
  languages,
  error,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Reset copied state after 2 seconds
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  // Stop speaking if translated text changes
  useEffect(() => {
    if (isSpeaking && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [translatedText]);

  const handleCopy = async () => {
    if (!translatedText) return;
    try {
      await navigator.clipboard.writeText(translatedText);
      setCopied(true);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  const handleTextToSpeech = () => {
    if (!('speechSynthesis' in window) || !translatedText.trim()) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(translatedText);

    // Map target language code to speech synthesis locale
    utterance.lang = targetLang;
    utterance.rate = 0.95; // Natural speaking rate

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      setIsSpeaking(false);
    };

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const targetLangName =
    languages.find((l) => l.code === targetLang)?.name || targetLang;

  const detectedLangName = detectedLang
    ? languages.find((l) => l.code === detectedLang)?.name || detectedLang
    : null;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden transition-all">
      {/* Panel Sub-Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Translation ({targetLangName})
          </span>

          {/* Detected language indicator */}
          {detectedLangName && sourceLang === 'auto' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
              <Sparkles className="w-3 h-3" />
              Detected: {detectedLangName}
            </span>
          )}

          {/* Cache badge */}
          {cached && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/60">
              <Zap className="w-3 h-3 fill-amber-500" />
              Cached
            </span>
          )}
        </div>

        {/* Toolbar: TTS & Copy Buttons */}
        <div className="flex items-center gap-1">
          {translatedText && (
            <>
              {/* Text to Speech Button */}
              <button
                type="button"
                onClick={handleTextToSpeech}
                title={isSpeaking ? 'Stop speaking' : 'Listen to translation (Text-to-Speech)'}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isSpeaking
                    ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 animate-pulse'
                    : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {isSpeaking ? (
                  <VolumeX className="w-4 h-4 text-rose-500" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              {/* Copy Button */}
              <button
                type="button"
                onClick={handleCopy}
                title="Copy translated text to clipboard"
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  copied
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Copy</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative flex-1 p-4 flex flex-col justify-between">
        {isLoading ? (
          /* Loading Skeleton State */
          <div className="space-y-3 py-3 animate-pulse">
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-5/6" />
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-1/2" />
            <div className="pt-4 flex items-center gap-2 text-xs text-indigo-500 dark:text-indigo-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              Translating with backend service...
            </div>
          </div>
        ) : error ? (
          /* Error State */
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center mb-2 border border-rose-200 dark:border-rose-900">
              <Info className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-1">
              Translation Failed
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
              {error}
            </p>
          </div>
        ) : translatedText ? (
          /* Translated Content */
          <div className="h-full flex flex-col justify-between">
            <div className="text-slate-900 dark:text-slate-100 text-base leading-relaxed whitespace-pre-wrap select-text">
              {translatedText}
            </div>

            {/* Speaking Audio Wave Animation */}
            {isSpeaking && (
              <div className="mt-4 flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs w-fit">
                <span className="w-1 h-3 bg-indigo-500 animate-pulse rounded-full" />
                <span className="w-1 h-5 bg-indigo-500 animate-pulse delay-75 rounded-full" />
                <span className="w-1 h-2 bg-indigo-500 animate-pulse delay-150 rounded-full" />
                <span className="ml-1 font-medium">Reading translation aloud...</span>
              </div>
            )}
          </div>
        ) : (
          /* Empty Idle State */
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-500">
            <Layers className="w-8 h-8 mb-2 stroke-1 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium">Translation will appear here</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Select languages and click Translate
            </p>
          </div>
        )}
      </div>

      {/* Footer Info: Provider, Cache status & text count */}
      <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
        <div className="flex items-center gap-2">
          {provider && (
            <span className="text-[11px] font-mono truncate max-w-[200px]" title={`Backend Provider: ${provider}`}>
              Engine: <span className="text-slate-600 dark:text-slate-300 capitalize">{provider}</span>
            </span>
          )}
        </div>
        <div className="font-mono text-xs">
          {translatedText ? `${translatedText.length} characters` : '0 characters'}
        </div>
      </div>
    </div>
  );
};
