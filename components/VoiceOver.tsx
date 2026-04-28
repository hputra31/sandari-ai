
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { generateVoiceOverScript } from '../services/geminiService';
import { Generation } from '../types';
import { fileToBase64 } from '../utils/fileUtils';
import Icon from './Icons';
import useLocalStorage from '../hooks/useLocalStorage';
import LoadingSpinner from './LoadingSpinner';

interface VoiceOverProps {
  addGenerationToHistory: (generation: Generation) => void;
}

const LANGUAGES = [
  { id: 'id-ID', label: 'Indonesia', flag: '🇮🇩' },
  { id: 'en-US', label: 'English (US)', flag: '🇺🇸' },
  { id: 'en-GB', label: 'English (UK)', flag: '🇬🇧' },
  { id: 'ja-JP', label: 'Japan', flag: '🇯🇵' },
  { id: 'ko-KR', label: 'Korea', flag: '🇰🇷' }
];

const TONES = [
  { id: 'professional', label: 'Professional', icon: 'suit' },
  { id: 'excited', label: 'Semangat', icon: 'sparkles' },
  { id: 'calm', label: 'Tenang', icon: 'night' },
  { id: 'storyteller', label: 'Bercerita', icon: 'film' },
  { id: 'aggressive', label: 'Hard Sell', icon: 'target' }
];

const VoiceOver: React.FC<VoiceOverProps> = ({ addGenerationToHistory }) => {
  const [topic, setTopic] = useLocalStorage<string>('sandari_voice_topic', '');
  const [tone, setTone] = useLocalStorage<string>('sandari_voice_tone', 'professional');
  const [language, setLanguage] = useLocalStorage<string>('sandari_voice_lang', 'id-ID');
  const [duration, setDuration] = useLocalStorage<number>('sandari_voice_duration', 30);
  const [script, setScript] = useLocalStorage<string>('sandari_voice_script', '');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      
      // Try to find a default voice for the selected language
      const langVoice = availableVoices.find(v => v.lang.startsWith(language.split('-')[0]));
      if (langVoice) setSelectedVoice(langVoice.name);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [language]);

  const handleGenerateScript = async () => {
    if (!topic.trim()) {
      setError('Silakan masukkan topik atau garis besar naskah.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const generatedScript = await generateVoiceOverScript(topic, tone, language, duration);
      setScript(generatedScript);
      
      addGenerationToHistory({
        id: crypto.randomUUID(),
        prompt: `Voice Over: ${topic}`,
        timestamp: Date.now(),
        type: 'voiceover',
        status: 'completed',
        outputs: [],
        config: {
          topic,
          tone,
          language,
          duration,
          script: generatedScript
        }
      });
    } catch (err: any) {
      setError(err.message || 'Gagal menghasilkan script.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayVoice = () => {
    if (!script) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(script);
    
    const voice = voices.find(v => v.name === selectedVoice);
    if (voice) utterance.voice = voice;
    
    utterance.lang = language;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleStopVoice = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(script);
    // Could add a toast here
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black italic tracking-tighter bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent uppercase">
          Voice Over AI
        </h2>
        <p className="text-gray-400 text-sm">
          Transformasikan narasi Anda menjadi audio profesional dengan karakter suara terpilih.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Left Column: Settings */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-gray-800/50 space-y-6">
            <div>
              <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-3 leading-none underline decoration-pink-500/30 underline-offset-4">
                Script Outline
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Deskripsikan konten narasi Anda secara mendalam..."
                className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-5 text-sm text-white focus:border-pink-500/50 outline-none transition-all h-40 resize-none font-sans shadow-inner"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-3 leading-none underline decoration-pink-500/30 underline-offset-4">
                  Bahasa 
                </label>
                <div className="relative">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-[11px] font-bold text-gray-300 outline-none focus:border-pink-500 appearance-none cursor-pointer"
                  >
                    {LANGUAGES.map(lang => (
                      <option key={lang.id} value={lang.id}>{lang.flag} {lang.label}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                    <Icon name="arrow-down" className="w-3 h-3" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-3 leading-none underline decoration-pink-500/30 underline-offset-4">
                  Target Durasi
                </label>
                <div className="relative">
                  <select
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-[11px] font-bold text-gray-300 outline-none focus:border-pink-500 appearance-none cursor-pointer"
                  >
                    {[15, 30, 45, 60, 90, 120].map(d => (
                      <option key={d} value={d}>{d} Detik</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                    <Icon name="arrow-down" className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-3 leading-none underline decoration-pink-500/30 underline-offset-4">
                Pilih Karakter Nada
              </label>
              <div className="grid grid-cols-5 gap-2">
                {TONES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTone(t.id)}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all group ${
                      tone === t.id 
                        ? 'bg-pink-600 border-pink-500 text-white shadow-lg shadow-pink-500/20' 
                        : 'bg-gray-900 border-gray-800 text-gray-600 hover:border-gray-700 hover:bg-gray-800'
                    }`}
                    title={t.label}
                  >
                    <Icon name={t.icon} className={`w-5 h-5 ${tone === t.id ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerateScript}
              disabled={isLoading || !topic.trim()}
              className="group relative w-full py-5 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 rounded-[1.5rem] text-white font-black tracking-[0.2em] uppercase shadow-xl shadow-purple-900/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-3 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              {isLoading ? (
                <>
                  <LoadingSpinner size="small" color="white" />
                  <span className="text-sm">Synthesizing...</span>
                </>
              ) : (
                <>
                  <Icon name="magic" className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  <span className="text-sm">Craft Script</span>
                </>
              )}
            </button>
          </div>
          
          {error && (
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-red-500/10 border border-red-500/30 text-red-200 p-5 rounded-2xl text-xs font-bold flex items-center gap-4"
            >
              <Icon name="warning" className="w-5 h-5 text-red-400 flex-shrink-0" />
              {error}
            </motion.div>
          )}
        </div>

        {/* Right Column: Result & Playback */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-gray-800/50 space-y-5 h-full flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between border-b border-gray-800/50 pb-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-purple-400 flex items-center gap-2">
                <Icon name="pencil" className="w-3 h-3" />
                Script Output
              </h3>
              {script && (
                <button 
                  onClick={handleCopyScript}
                  className="bg-gray-900 hover:bg-pink-600 border border-gray-800 hover:border-pink-500 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 text-gray-400 hover:text-white"
                >
                  <Icon name="copy" className="w-3 h-3" />
                  Copy
                </button>
              )}
            </div>

            <div className="flex-1 relative">
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Script narasi Anda akan terurai di sini..."
                className="w-full h-full bg-transparent p-2 text-sm text-gray-300 leading-relaxed outline-none resize-none font-sans"
              />
            </div>

            {script && (
              <div className="space-y-5 pt-6 border-t border-gray-800/50">
                <div className="glass-panel p-4 rounded-2xl bg-black/30 border border-gray-800/50">
                  <label className="block text-[8px] font-black text-gray-600 uppercase tracking-widest mb-3">
                    Browser Voice Selector (System Level)
                  </label>
                  <div className="relative">
                    <select
                      value={selectedVoice}
                      onChange={(e) => setSelectedVoice(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-[10px] font-bold text-gray-400 outline-none focus:border-pink-500 appearance-none cursor-pointer"
                    >
                      {voices.map(voice => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name.replace('Microsoft ', '').replace('Google ', '')}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-30">
                      <Icon name="arrow-down" className="w-3 h-3" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  {!isSpeaking ? (
                    <button
                      onClick={handlePlayVoice}
                      className="flex-1 py-4 bg-green-500/10 border border-green-500/30 text-green-400 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-green-600 hover:text-white transition-all flex items-center justify-center gap-3 shadow-lg shadow-green-500/5"
                    >
                      <Icon name="play" className="w-4 h-4" />
                      Listen Demo
                    </button>
                  ) : (
                    <button
                      onClick={handleStopVoice}
                      className="flex-1 py-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-3 shadow-lg shadow-red-500/5"
                    >
                      <Icon name="close" className="w-4 h-4" />
                      Stop Audio
                    </button>
                  )}
                  
                  <button
                    className="w-16 h-14 bg-gray-900 border border-gray-800 text-gray-700 rounded-2xl hover:bg-gray-800 transition-all flex items-center justify-center cursor-not-allowed group relative"
                    title="Export MP3 (Coming Soon)"
                  >
                    <Icon name="download" className="w-5 h-5" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-pink-500 rounded-full"></div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceOver;
