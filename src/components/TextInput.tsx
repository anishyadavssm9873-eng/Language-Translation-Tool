import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  X,
  ClipboardPaste,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface TextInputProps {
  value: string;
  onChange: (val: string) => void;
  onClear: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  isLoading?: boolean;
  maxLength?: number;
  sourceLang?: string;
}

// Sample phrases for quick testing
const SAMPLE_PHRASES = [
  'Hello, welcome to our application!',
  'Where is the nearest train station?',
  'I would like to order a cup of coffee, please.',
  'Artificial intelligence is transforming global communication.',
];

export const TextInput: React.FC<TextInputProps> = ({
  value,
  onChange,
  onClear,
  onKeyDown,
  isLoading = false,
  maxLength = 5000,
  sourceLang = 'en',
}) => {
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isPlayingSourceAudio, setIsPlayingSourceAudio] = useState(false);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize Speech Recognition (Web Speech API)
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = sourceLang === 'auto' ? 'en-US' : sourceLang;

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          onChange(value ? `${value.trim()} ${transcript}` : transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission was denied. Please allow microphone access in your browser settings.');
        } else if (event.error !== 'no-speech') {
          setSpeechError(`Voice input error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [sourceLang, value, onChange]);

  const toggleSpeechRecognition = () => {
    setSpeechError(null);
    if (!speechSupported || !recognitionRef.current) {
      setSpeechError('Speech recognition is not supported in this browser. Try Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        if (sourceLang !== 'auto') {
          recognitionRef.current.lang = sourceLang;
        }
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start recognition:', err);
        setIsListening(false);
      }
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const combined = value ? `${value}\n${text}` : text;
        onChange(combined.slice(0, maxLength));
      }
    } catch {
      // Browser permissions fallback
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  const handleSpeakInput = () => {
    if (!('speechSynthesis' in window) || !value.trim()) return;

    if (isPlayingSourceAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingSourceAudio(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(value);
    if (sourceLang && sourceLang !== 'auto') {
      utterance.lang = sourceLang;
    }

    utterance.onend = () => setIsPlayingSourceAudio(false);
    utterance.onerror = () => setIsPlayingSourceAudio(false);

    setIsPlayingSourceAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  const charsCount = value.length;
  const isNearLimit = charsCount >= maxLength * 0.9;
  const isAtLimit = charsCount >= maxLength;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500">
      {/* Panel Sub-Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Source Text
          </span>
          {isListening && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-rose-500 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full animate-pulse border border-rose-200 dark:border-rose-800">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Listening...
            </span>
          )}
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={handleSpeakInput}
              title={isPlayingSourceAudio ? 'Stop speaking' : 'Listen to source text'}
              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isPlayingSourceAudio ? (
                <VolumeX className="w-4 h-4 text-rose-500" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handlePaste}
            title="Paste from clipboard"
            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ClipboardPaste className="w-4 h-4" />
          </button>

          {value && (
            <button
              type="button"
              onClick={onClear}
              title="Clear input text"
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Textarea */}
      <div className="relative flex-1 p-4 flex flex-col">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          onKeyDown={onKeyDown}
          placeholder="Type or paste text to translate... (Press Ctrl+Enter to translate)"
          disabled={isLoading}
          rows={7}
          className="w-full flex-1 resize-none bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-base leading-relaxed focus:outline-none"
        />

        {/* Sample Prompts Pills (if empty) */}
        {!value && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-1.5 block">
              Try a sample sentence:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_PHRASES.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onChange(sample)}
                  className="text-xs px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/60 text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 transition-colors text-left"
                >
                  "{sample}"
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Speech Recognition Error notification */}
        {speechError && (
          <div className="mt-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200 dark:border-rose-900">
            {speechError}
          </div>
        )}
      </div>

      {/* Footer info: Voice input button & Character counter */}
      <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {/* Speech-to-Text Button */}
          <button
            type="button"
            onClick={toggleSpeechRecognition}
            title={isListening ? 'Stop listening' : 'Start voice input (Speech-to-Text)'}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              isListening
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-600 hover:border-indigo-400'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-3.5 h-3.5" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden sm:inline">Voice Input</span>
              </>
            )}
          </button>
          <span className="hidden sm:inline text-[11px] text-slate-400">
            Shortcut: <kbd className="font-mono bg-slate-200/70 dark:bg-slate-700 px-1 py-0.5 rounded text-[10px]">Ctrl+Enter</kbd>
          </span>
        </div>

        {/* Character Counter */}
        <div
          className={`font-mono text-xs font-medium transition-colors ${
            isAtLimit
              ? 'text-rose-600 dark:text-rose-400 font-bold'
              : isNearLimit
              ? 'text-amber-500'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {charsCount} / {maxLength}
        </div>
      </div>
    </div>
  );
};
