
import React, { useState, useRef, useEffect } from 'react';
import { Chat } from '@google/genai';
import { createChatSession, sendMessage } from '../services/geminiService';
import { ChatMessage } from '../types';
import Icon from './Icons';
import LoadingSpinner from './LoadingSpinner';
import useLocalStorage from '../hooks/useLocalStorage';
import { fileToBase64 } from '../utils/fileUtils';

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages, isLoaded] = useLocalStorage<ChatMessage[]>('sandari_ai_chat_history', []);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{data: string, mimeType: string, url?: string} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoaded) return;
    // Initial greeting if history is empty
    setMessages(prev => {
      if (!prev || prev.length === 0) {
        return [
          {
            id: 'init-1',
            role: 'model',
            text: 'Halo! Saya **SANDARI AI**. Saya siap membantu Anda membuat prompt canggih untuk gambar & video, atau konfigurasi JSON. Apa yang bisa saya bantu?',
            timestamp: Date.now()
          }
        ];
      }
      return prev;
    });
  }, [setMessages, isLoaded]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    if (!chatSession) {
      try {
        const historyToPass = messages.length > 1 ? messages.slice(1).map(msg => ({
           role: msg.role === 'model' ? 'model' : 'user',
           text: msg.text,
           image: msg.image
        })) : undefined;
        
        const session = createChatSession(historyToPass);
        setChatSession(session);
      } catch (e) {
        console.error("Failed to init chat:", e);
      }
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: crypto.randomUUID(),
        role: 'model',
        text: 'Riwayat chat telah dihapus. Halo! Saya **SANDARI AI**. Apa yang bisa saya bantu?',
        timestamp: Date.now()
      }
    ]);
    setShowClearConfirm(false);
    // Refresh chat session to clear model context
    try {
        setChatSession(createChatSession());
    } catch (e) {
        console.error("Failed to re-init chat:", e);
    }
  };

  const handleSend = async () => {
    if ((!inputText.trim() && !selectedImage) || !chatSession) return;

    const currentImage = selectedImage;
    const currentText = inputText;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: currentText,
      timestamp: Date.now(),
      image: currentImage ? { data: currentImage.data, mimeType: currentImage.mimeType } : undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const responseText = await sendMessage(chatSession, currentText, currentImage ? { data: currentImage.data, mimeType: currentImage.mimeType } : undefined);
      
      const botMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'model',
        text: "Maaf, saya mengalami gangguan koneksi. Silakan coba lagi nanti.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {  // 5MB limit
        alert("Ukuran gambar terlalu besar. Maksimal 5MB.");
        return;
      }
      try {
        const url = URL.createObjectURL(file);
        const base64 = await fileToBase64(file);
        setSelectedImage({ data: base64, mimeType: file.type, url });
      } catch (error) {
        console.error("Gagal memuat gambar", error);
      }
    }
    if (e.target) e.target.value = '';
  };

  const removeImage = () => {
    if (selectedImage?.url) {
      URL.revokeObjectURL(selectedImage.url);
    }
    setSelectedImage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-[350px] sm:w-[400px] h-[500px] bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up origin-bottom-right transition-all ring-1 ring-purple-500/30">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-900/50 to-gray-900 p-4 border-b border-gray-800 flex justify-between items-center relative z-10">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-600/20 border border-purple-500/50 flex items-center justify-center text-purple-400 relative">
                   <div className="absolute inset-0 bg-purple-500/20 rounded-full animate-pulse"></div>
                   <Icon name="robot_head" className="w-6 h-6 relative z-10" />
                </div>
                <div>
                   <h3 className="text-white font-bold font-display tracking-wide">SANDARI AI</h3>
                   <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse"></span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider">Prompt Engineer</span>
                   </div>
                </div>
             </div>
             
             <div className="flex items-center gap-1">
                 <button 
                    onClick={() => setShowClearConfirm(true)}
                    title="Hapus Riwayat Chat"
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition"
                 >
                    <Icon name="trash" className="w-4 h-4" />
                 </button>
                 <button 
                    onClick={() => setIsOpen(false)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition"
                 >
                    <Icon name="minimize" className="w-5 h-5" />
                 </button>
             </div>
          </div>

          {/* Clear Confirm Overlay */}
          {showClearConfirm && (
             <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                 <div className="w-12 h-12 bg-red-500/20 text-red-500 border border-red-500/30 rounded-full flex items-center justify-center mb-4">
                     <Icon name="trash" className="w-6 h-6" />
                 </div>
                 <h4 className="text-white font-bold mb-2">Hapus Riwayat Chat?</h4>
                 <p className="text-sm text-gray-400 mb-6">Semua percakapan dengan SANDARI AI akan dihapus permanen dari lokal.</p>
                 <div className="flex gap-3 w-full">
                     <button 
                        onClick={() => setShowClearConfirm(false)}
                        className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-semibold text-sm transition"
                     >
                         Batal
                     </button>
                     <button 
                         onClick={handleClearHistory}
                         className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold text-sm transition shadow-lg shadow-red-900/30"
                     >
                         Ya, Hapus
                     </button>
                 </div>
             </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
             {messages.map((msg) => (
                <div 
                   key={msg.id} 
                   className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                   <div className={`max-w-[85%] rounded-2xl p-3.5 text-sm leading-relaxed shadow-sm ${
                      msg.role === 'user' 
                      ? 'bg-purple-600 text-white rounded-br-none' 
                      : 'bg-gray-800/80 text-gray-200 border border-gray-700/50 rounded-bl-none'
                   }`}>
                      {msg.role === 'model' ? (
                          <div className="prose prose-invert prose-sm max-w-none">
                              {/* Simple formatting for bold/code */}
                              {msg.text.split('\n').map((line, i) => (
                                  <p key={i} className="mb-1 min-h-[1em]">{line}</p>
                              ))}
                          </div>
                      ) : (
                          <div className="flex flex-col gap-2">
                             {msg.image && (
                                <img 
                                  src={`data:${msg.image.mimeType};base64,${msg.image.data}`} 
                                  alt="User upload" 
                                  className="max-w-full rounded-lg object-contain shadow-sm bg-gray-900/50" 
                                />
                             )}
                             {msg.text}
                          </div>
                      )}
                      <span className="text-[9px] opacity-50 block text-right mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                   </div>
                </div>
             ))}
             {isLoading && (
                 <div className="flex justify-start">
                     <div className="bg-gray-800/50 rounded-2xl rounded-bl-none p-3 flex items-center gap-2">
                        <LoadingSpinner size="small" />
                        <span className="text-xs text-gray-400">Sandari sedang mengetik...</span>
                     </div>
                 </div>
             )}
             <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-gray-900 border-t border-gray-800">
             {selectedImage && (
                <div className="mb-2 relative inline-block">
                   <img src={selectedImage.url || `data:${selectedImage.mimeType};base64,${selectedImage.data}`} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-purple-500/50" />
                   <button 
                     onClick={removeImage}
                     className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-400"
                   >
                     <Icon name="close" className="w-3 h-3" />
                   </button>
                </div>
             )}
             <div className="relative flex items-end gap-2 bg-gray-800/50 rounded-xl border border-gray-700 p-1 pl-2 focus-within:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-500/20 transition-all">
                <input 
                   type="file" 
                   accept="image/*" 
                   className="hidden" 
                   ref={fileInputRef}
                   onChange={handleImageUpload}
                />
                <button 
                   onClick={() => fileInputRef.current?.click()}
                   className="p-2 text-gray-400 hover:text-purple-400 transition mb-0.5"
                   title="Unggah Gambar"
                >
                   <Icon name="image" className="w-5 h-5" />
                </button>
                <textarea
                   value={inputText}
                   onChange={(e) => setInputText(e.target.value)}
                   onKeyDown={handleKeyDown}
                   placeholder="Tulis pesan..."
                   className="w-full bg-transparent border-none text-white text-sm focus:ring-0 resize-none py-3 max-h-24 scrollbar-hide placeholder-gray-500"
                   rows={1}
                />
                <button
                   onClick={handleSend}
                   disabled={(!inputText.trim() && !selectedImage) || isLoading}
                   className="p-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg mb-0.5"
                >
                   <Icon name="send" className="w-4 h-4" />
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button 
         onClick={isOpen ? () => setIsOpen(false) : handleOpen}
         className={`group relative flex items-center justify-center w-14 h-14 rounded-full shadow-[0_0_20px_rgba(147,51,234,0.5)] transition-all duration-300 z-50 hover:scale-110 ${
            isOpen 
            ? 'bg-gray-800 text-gray-400 rotate-90' 
            : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white animate-blob'
         }`}
      >
         <span className="absolute inset-0 rounded-full border border-white/20"></span>
         {isOpen ? (
            <Icon name="close" className="w-6 h-6" />
         ) : (
            <>
               <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500 border border-white"></span>
               </span>
               <Icon name="chat" className="w-7 h-7" />
            </>
         )}
         
         {!isOpen && (
            <span className="absolute right-16 bg-white text-gray-900 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
               Tanya SANDARI AI
            </span>
         )}
      </button>
    </div>
  );
};

export default ChatWidget;
