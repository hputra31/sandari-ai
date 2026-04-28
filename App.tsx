
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ImageGenerator from './components/ImageGenerator';
import VideoGenerator from './components/VideoGenerator';
import PhotoEditor from './components/PhotoEditor';
import AffiliateKit from './components/AffiliateKit';
import VoiceOver from './components/VoiceOver';
import HistoryItemCard from './components/HistoryItemCard';
import useLocalStorage from './hooks/useLocalStorage';
import { Generation } from './types';
import Icon from './components/Icons';

type Tab = 'image' | 'video' | 'editor' | 'affiliate' | 'voice' | 'gallery';

const App: React.FC = () => {
  // App State
  const [activeTab, setActiveTab] = useLocalStorage<Tab>('sandari_active_tab', 'image');
  const [prefilledVideoData, setPrefilledVideoData] = useLocalStorage<{ image?: string, prompt?: string } | null>('sandari_prefilled_video', null);
  const [history, setHistory, isHistoryLoaded] = useLocalStorage<Generation[]>('sandari_ai_history', []);
  
  const addGenerationToHistory = (generation: Generation) => {
    setHistory(prev => [generation, ...prev]);
  };

  const updateGenerationInHistory = (id: string, updates: Partial<Generation>) => {
    setHistory(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };
  
  const removeGenerationFromHistory = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const renderTabContent = () => {
    return (
      <AnimatePresence mode="wait">
        <motion.div
           key={activeTab}
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: -10 }}
           transition={{ duration: 0.2 }}
           className="h-full"
        >
          {(() => {
            switch (activeTab) {
              case 'image':
                return (
                  <ImageGenerator 
                    addGenerationToHistory={addGenerationToHistory} 
                    updateGenerationInHistory={updateGenerationInHistory}
                    onSendToVideo={(data) => {
                      setPrefilledVideoData(data);
                      setActiveTab('video');
                    }}
                  />
                );
              case 'video':
                return (
                  <VideoGenerator 
                    addGenerationToHistory={addGenerationToHistory} 
                    prefilledData={prefilledVideoData}
                    onClearPrefilled={() => setPrefilledVideoData(null)}
                  />
                );
              case 'editor':
                return (
                  <PhotoEditor 
                    addGenerationToHistory={addGenerationToHistory} 
                    onSendToVideo={(data) => {
                      setPrefilledVideoData(data);
                      setActiveTab('video');
                    }}
                  />
                );
              case 'affiliate':
                return (
                  <AffiliateKit 
                    addGenerationToHistory={addGenerationToHistory} 
                    updateGenerationInHistory={updateGenerationInHistory}
                  />
                );
              case 'voice':
                return (
                    <VoiceOver addGenerationToHistory={addGenerationToHistory} />
                );
              case 'gallery':
                return (
                  <div className="animate-fade-in">
                    <div className="flex flex-col gap-2 mb-10">
                      <h2 className="text-3xl font-black italic tracking-tighter bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent uppercase">
                        Koleksi Karya
                      </h2>
                      <p className="text-gray-400 text-sm">
                        Seluruh mahakarya yang telah Anda buat tersimpan aman di sini.
                      </p>
                    </div>

                    {history.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {history.map(item => (
                          <HistoryItemCard 
                            key={item.id} 
                            item={item} 
                            onDelete={removeGenerationFromHistory}
                            onUpdate={updateGenerationInHistory}
                            onSendToVideo={(data) => {
                              setPrefilledVideoData(data);
                              setActiveTab('video');
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 bg-gray-900/30 rounded-3xl border border-dashed border-gray-800">
                        <Icon name="image" className="w-16 h-16 text-gray-700 mb-4 opacity-20" />
                        <p className="text-gray-500 font-medium">Belum ada karya yang disimpan.</p>
                        <button 
                           onClick={() => setActiveTab('image')}
                           className="mt-6 px-6 py-2 bg-pink-600/10 hover:bg-pink-600/20 text-pink-500 rounded-xl text-sm font-bold border border-pink-500/20 transition-all"
                        >
                           Mulai Berkreasi
                        </button>
                      </div>
                    )}
                  </div>
                );
              default:
                return null;
            }
          })()}
        </motion.div>
      </AnimatePresence>
    );
  };

  const TabButton: React.FC<{ tabName: Tab; label: string; iconName: string }> = ({ tabName, label, iconName }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`group relative flex flex-col items-center justify-center py-2 px-1 transition-all duration-300 md:flex-row md:gap-2 md:px-4 md:py-3 md:rounded-xl ${
        activeTab === tabName
          ? 'text-white'
          : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      {activeTab === tabName && (
        <motion.div 
           layoutId="activeTabBg"
           className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl hidden md:block -z-10 shadow-lg shadow-pink-600/20"
           transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      
      <div className={`flex items-center justify-center w-10 h-10 md:w-5 md:h-5 rounded-full mb-1 md:mb-0 transition-all duration-300 ${
         activeTab === tabName ? 'bg-pink-500 text-white md:bg-transparent' : 'bg-transparent'
      }`}>
        <Icon name={iconName} className="w-5 h-5" />
      </div>
      
      <span className={`text-[10px] font-bold uppercase tracking-widest md:text-sm md:normal-case md:tracking-normal ${
         activeTab === tabName ? 'block md:block' : 'hidden md:block'
      }`}>
        {label}
      </span>

      {activeTab === tabName && (
         <motion.div 
           layoutId="activeIndicator"
           className="absolute -top-1 w-1 h-1 bg-pink-500 rounded-full md:hidden" 
         />
      )}
    </button>
  );

  return (
    <div className="min-h-screen text-gray-100 font-sans selection:bg-pink-500 selection:text-white pb-20 md:pb-0">
      {/* Glass Navbar */}
      <nav className="sticky top-0 z-40 w-full glass-panel border-b border-gray-800/50 backdrop-blur-xl">
        <div className="container mx-auto flex justify-between items-center py-4 px-4">
           {/* Animated Brand Identity */}
           <div className="flex items-center gap-4 group cursor-default">
             <div className="relative w-10 h-10 flex items-center justify-center">
                <div className="absolute inset-0 bg-pink-500/20 rounded-xl blur-md animate-pulse group-hover:bg-pink-400/30 transition-all duration-500"></div>
                <div className="relative w-full h-full bg-gray-900/80 rounded-xl flex items-center justify-center border border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.15)] group-hover:border-pink-400/50 transition-colors overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-b from-transparent via-pink-500/10 to-transparent translate-y-[-100%] animate-grid-flow opacity-50"></div>
                   <Icon name="logo" className="w-6 h-6 text-pink-400 animate-spin-slow" />
                </div>
             </div>
             
             <div className="flex flex-col justify-center">
                <h1 className="text-xl font-black tracking-widest font-display uppercase bg-gradient-to-r from-white via-pink-400 to-white bg-clip-text text-transparent animate-gradient-text bg-[length:200%_auto]">
                  SANDARI
                </h1>
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-bold text-purple-500 uppercase tracking-[0.3em] leading-none group-hover:text-purple-400 transition-colors">
                      AI Generator
                    </span>
                   <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-pink-500"></span>
                   </span>
                </div>
             </div>
           </div>

           {/* Mobile Menu Removed (Legacy) */}
           <div className="hidden md:flex bg-gray-900/50 backdrop-blur-md p-1.5 rounded-2xl border border-gray-800 shadow-inner">
             <TabButton tabName="image" label="Gambar" iconName="image" />
             <TabButton tabName="video" label="Video" iconName="video" />
             <TabButton tabName="editor" label="Editor" iconName="magic" />
             <TabButton tabName="affiliate" label="Affiliate" iconName="affiliate" />
             <TabButton tabName="voice" label="Voice Over" iconName="mic" />
             <div className="w-px h-6 bg-gray-800 self-center mx-1"></div>
             <TabButton tabName="gallery" label="Koleksi" iconName="layers" />
           </div>

           <div className="flex gap-3">
             {/* Admin functionality removed */}
           </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 md:py-16 max-w-7xl">
        <header className="text-center mb-10 md:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-5xl md:text-8xl font-black mb-6 tracking-tighter text-white font-display leading-[0.9]">
               STUDIO<br/><span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent italic">KREATIF</span>
            </h1>
            <p className="text-gray-400 text-base md:text-xl max-w-2xl mx-auto leading-relaxed font-medium px-4">
              Revolusi konten bertenaga <span className="text-pink-500 font-bold">GEMINI AI</span>. 
              <span className="block mt-1 opacity-60">Visual, Audio, & Marketing dalam genggaman.</span>
            </p>
          </motion.div>
        </header>

        <main className="relative">
          {/* Main Content Panel */}
          <section className="glass-panel rounded-[2rem] p-6 md:p-12 shadow-2xl shadow-black/50 min-h-[600px] border-t border-white/10 relative overflow-hidden">
            {/* Background Accent glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-pink-600/5 blur-[100px] -z-10 rounded-full"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/5 blur-[100px] -z-10 rounded-full"></div>
            
            {renderTabContent()}
          </section>
        </main>
        
        <footer className="text-center text-gray-500 mt-20 md:mt-32 pb-12 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] border-t border-gray-900 pt-10">
          <div className="flex flex-col items-center gap-6">
             <div className="flex items-center gap-8 stroke-gray-800 opacity-20">
                <Icon name="logo" className="w-12 h-12" />
             </div>
             <p className="max-w-xs md:max-w-none opacity-40">
                &copy; {new Date().getFullYear()} SANDARI SYSTEM &bull; MADE WITH ARTIFICIAL INTELLIGENCE
             </p>
             <button 
               onClick={() => {
                 localStorage.removeItem('sandari_custom_api_key');
                 window.location.reload();
               }}
               className="mt-2 text-[8px] text-gray-700 hover:text-pink-500 transition-colors uppercase tracking-widest font-bold"
             >
               Reset API Key Status
             </button>
          </div>
        </footer>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden pb-safe">
        <div className="bg-gray-950/80 backdrop-blur-2xl border-t border-white/5 px-2 py-1 flex items-center justify-around shadow-2xl shadow-black">
           <TabButton tabName="image" label="Gambar" iconName="image" />
           <TabButton tabName="video" label="Video" iconName="video" />
           <TabButton tabName="editor" label="Editor" iconName="magic" />
           <TabButton tabName="affiliate" label="Affiliate" iconName="affiliate" />
           <TabButton tabName="voice" label="Voice Over" iconName="mic" />
           <TabButton tabName="gallery" label="Koleksi" iconName="layers" />
        </div>
      </div>
      
      {/* Modals removed */}
    </div>
  );
};

export default App;
