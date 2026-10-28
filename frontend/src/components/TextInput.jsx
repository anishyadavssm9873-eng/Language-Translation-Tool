import React, { useState, useEffect } from 'react';
import { Mic, MicOff, X, ClipboardPaste } from 'lucide-react';

export default function TextInput({ value, onChange, onClear, isLoading }) {
  const [isListening, setIsListening] = useState(false);
  const maxLength = 5000;

  const toggleSpeech = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      onChange(value ? `${value} ${transcript}` : transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold text-slate-500">Source Text</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleSpeech}
            className={`p-1.5 rounded-lg text-xs flex items-center gap-1 ${
              isListening ? 'bg-rose-500 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Speech to text"
          >
            {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>
          {value && (
            <button
              type="button"
              onClick={onClear}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Clear input"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        disabled={isLoading}
        placeholder="Type or paste text to translate..."
        rows={6}
        className="w-full flex-1 bg-transparent resize-none focus:outline-none text-slate-900 dark:text-slate-100 text-base"
      />

      <div className="flex justify-end pt-2 text-xs text-slate-400 font-mono">
        {value.length} / {maxLength}
      </div>
    </div>
  );
}
