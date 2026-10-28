import React, { useState } from 'react';
import { Copy, Check, Volume2 } from 'lucide-react';

export default function TranslationOutput({
  translatedText,
  isLoading,
  targetLang,
  detectedLang,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (!('speechSynthesis' in window) || !translatedText) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(translatedText);
    u.lang = targetLang;
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Translation</span>
          {detectedLang && (
            <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-medium">
              Detected: {detectedLang}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {translatedText && (
            <>
              <button
                type="button"
                onClick={handleSpeak}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Speak translation"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Copy to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-[140px] text-slate-900 dark:text-slate-100 text-base">
        {isLoading ? (
          <p className="text-slate-400 italic">Translating...</p>
        ) : translatedText ? (
          <p className="whitespace-pre-wrap">{translatedText}</p>
        ) : (
          <p className="text-slate-400 italic">Translation will appear here</p>
        )}
      </div>
    </div>
  );
}
