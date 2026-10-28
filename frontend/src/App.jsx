import React, { useState, useEffect } from 'react';
import LanguageSelector from './components/LanguageSelector';
import TextInput from './components/TextInput';
import TranslationOutput from './components/TranslationOutput';
import Controls from './components/Controls';
import { fetchLanguages, translateText } from './services/api';

export default function App() {
  const [languages, setLanguages] = useState([]);
  const [sourceLang, setSourceLang] = useState(() => localStorage.getItem('src_lang') || 'auto');
  const [targetLang, setTargetLang] = useState(() => localStorage.getItem('tgt_lang') || 'es');
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [detectedLang, setDetectedLang] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    fetchLanguages()
      .then(setLanguages)
      .catch((err) => console.error('Failed to load languages', err));
  }, []);

  useEffect(() => {
    localStorage.setItem('src_lang', sourceLang);
  }, [sourceLang]);

  useEffect(() => {
    localStorage.setItem('tgt_lang', targetLang);
  }, [targetLang]);

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await translateText({
        text: inputText,
        source: sourceLang,
        target: targetLang,
      });
      setTranslatedText(res.translatedText);
      setDetectedLang(res.detectedSourceLanguage);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwap = () => {
    if (sourceLang === 'auto') return;
    const oldSource = sourceLang;
    const oldTarget = targetLang;
    setSourceLang(oldTarget);
    setTargetLang(oldSource);
    setInputText(translatedText);
    setTranslatedText(inputText);
  };

  const handleClearAll = () => {
    setInputText('');
    setTranslatedText('');
    setDetectedLang(null);
    setError(null);
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-8">
        <header className="max-w-5xl mx-auto flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold">Language Translation Tool</h1>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700"
          >
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
        </header>

        <main className="max-w-5xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
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

          {error && (
            <div className="p-3 mx-4 mt-4 bg-rose-50 text-rose-600 rounded-lg text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 min-h-[300px]">
            <TextInput
              value={inputText}
              onChange={setInputText}
              onClear={() => setInputText('')}
              isLoading={isLoading}
            />
            <TranslationOutput
              translatedText={translatedText}
              isLoading={isLoading}
              targetLang={targetLang}
              detectedLang={detectedLang}
            />
          </div>

          <Controls
            onTranslate={handleTranslate}
            onClear={handleClearAll}
            isLoading={isLoading}
            canTranslate={Boolean(inputText.trim())}
          />
        </main>
      </div>
    </div>
  );
}
