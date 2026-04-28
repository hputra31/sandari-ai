
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { editImage } from '../services/geminiService';
import { Generation } from '../types';
import { EDITOR_TOOLS, ENHANCE_TOOLS } from '../constants';
import LoadingSpinner from './LoadingSpinner';
import ImageUploader from './ImageUploader';
import { fileToBase64 } from '../utils/fileUtils';
import Icon from './Icons';
import useLocalStorage from '../hooks/useLocalStorage';

interface PhotoEditorProps {
  addGenerationToHistory: (generation: Generation) => void;
  onSendToVideo?: (data: { image?: string, prompt?: string }) => void;
}

const PhotoEditor: React.FC<PhotoEditorProps> = ({ addGenerationToHistory, onSendToVideo }) => {
  const [prompt, setPrompt] = useLocalStorage<string>('sandari_editor_prompt', '');
  const [isNanoBanana, setIsNanoBanana] = useLocalStorage<boolean>('sandari_editor_nano', false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useLocalStorage<string[]>('sandari_editor_results', []);
  
  const [uploadedImage, setUploadedImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const [referenceImage, setReferenceImage] = useState<{ file: File; previewUrl: string } | null>(null);
  
  const handleImageUpload = (file: File, previewUrl: string) => {
    setUploadedImage({ file, previewUrl });
    setGeneratedImages([]);
    setError(null);
  };

  const handleImageRemove = () => {
    if (uploadedImage) {
      URL.revokeObjectURL(uploadedImage.previewUrl);
    }
    setUploadedImage(null);
    setGeneratedImages([]);
  };

  const handleReferenceUpload = (file: File, previewUrl: string) => {
    setReferenceImage({ file, previewUrl });
    setError(null);
  };

  const handleReferenceRemove = () => {
    if (referenceImage) {
      URL.revokeObjectURL(referenceImage.previewUrl);
    }
    setReferenceImage(null);
  };

  const applyPreset = (presetPrompt: string) => {
      setPrompt(presetPrompt);
  };

  const handleGenerate = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setError('Silakan pilih efek atau masukkan instruksi edit.');
      return;
    }
    if (!uploadedImage) {
        setError('Silakan unggah foto yang ingin diedit terlebih dahulu.');
        return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImages([]);
    const generationId = crypto.randomUUID();
    
    try {
        const base64Data = await fileToBase64(uploadedImage.file);
        // Important: First image is always the MAIN image to be edited
        const imagesPayload = [{ data: base64Data, mimeType: uploadedImage.file.type }];

        // If a reference image is uploaded (e.g. for Swap Face), include it as the SECOND image
        if (referenceImage) {
             const refBase64 = await fileToBase64(referenceImage.file);
             imagesPayload.push({ data: refBase64, mimeType: referenceImage.file.type });
        }
        
        const images = await editImage(trimmedPrompt, imagesPayload, undefined, 1, isNanoBanana);
        
        if (images.length === 0) {
            throw new Error("AI tidak mengembalikan gambar. Coba instruksi yang berbeda.");
        }

        setGeneratedImages(images);
        addGenerationToHistory({
          id: generationId,
          prompt: trimmedPrompt,
          timestamp: Date.now(),
          type: 'editor',
          status: 'completed',
          outputs: images,
          config: { 
              originalImage: uploadedImage.file.name,
              referenceImage: referenceImage?.file.name 
          },
        });

    } catch (e: any) {
      const errorMessage = e.message || "Gagal mengedit gambar.";
      setError(errorMessage);
      addGenerationToHistory({
        id: generationId,
        prompt: trimmedPrompt,
        timestamp: Date.now(),
        type: 'editor',
        status: 'failed',
        outputs: [],
        config: { 
            originalImage: uploadedImage.file.name,
             referenceImage: referenceImage?.file.name 
        },
        error: errorMessage,
      });
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      {/* LEFT COLUMN: Inputs */}
      <div className="flex flex-col gap-6">
        
        <div className="flex flex-col gap-5">
           {/* Nano Banana Mode Toggle */}
           <div className="glass-panel p-1 rounded-2xl border border-gray-800/50 overflow-hidden relative">
              <div className="flex bg-black/20 p-2">
                 <button 
                   onClick={() => setIsNanoBanana(!isNanoBanana)}
                   className={`flex-1 flex items-center justify-center gap-3 py-3 px-4 rounded-xl border transition-all duration-500 group ${
                     isNanoBanana 
                     ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.15)]' 
                     : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-700'
                   }`}
                 >
                    <div className={`relative w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ${isNanoBanana ? 'scale-125 rotate-[360deg]' : 'scale-100'}`}>
                       <div className={`absolute inset-0 bg-yellow-500/20 rounded-full blur-md animate-pulse ${isNanoBanana ? 'block' : 'hidden'}`}></div>
                       <Icon name="logo" className={`w-full h-full relative z-10 ${isNanoBanana ? 'text-yellow-500' : 'text-gray-600'}`} />
                    </div>
                    <div className="flex flex-col items-start leading-none">
                       <span className="text-[10px] font-black uppercase tracking-[0.2em] mb-1">NANO BANANA ENGINE</span>
                       <span className={`text-[8px] font-bold uppercase transition-colors ${isNanoBanana ? 'text-yellow-500/80' : 'text-gray-700'}`}>
                          {isNanoBanana ? 'High-Performance Mode Active' : 'Standard Speed Mode'}
                       </span>
                    </div>
                    <div className="ml-auto">
                       <div className={`w-10 h-5 rounded-full border transition-all duration-500 relative ${isNanoBanana ? 'bg-yellow-500 border-yellow-400' : 'bg-gray-800 border-gray-700'}`}>
                          <motion.div 
                            animate={{ x: isNanoBanana ? 20 : 0 }}
                            className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full shadow-sm transition-colors ${isNanoBanana ? 'bg-white' : 'bg-gray-600'}`}
                          />
                       </div>
                    </div>
                 </button>
              </div>
           </div>

          {/* Image Uploader Container */}
          <div className="grid grid-cols-2 gap-3">

              <div className="glass-panel p-1 rounded-2xl border border-gray-800/50">
                 <ImageUploader 
                    onImageUpload={handleImageUpload}
                    onImageRemove={handleImageRemove}
                    uploadedImagePreview={uploadedImage?.previewUrl}
                    label="Utama"
                 />
              </div>
              <div className="glass-panel p-1 rounded-2xl border border-gray-800/50 relative">
                 <ImageUploader 
                    onImageUpload={handleReferenceUpload}
                    onImageRemove={handleReferenceRemove}
                    uploadedImagePreview={referenceImage?.previewUrl}
                    label="Ref. Face"
                 />
                 {prompt.includes('face swap') && !referenceImage && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[8px] font-black bg-yellow-500 text-black px-2 py-1 rounded-full z-20 shadow-lg whitespace-nowrap uppercase tracking-tighter"
                    >
                        Required for Swap
                    </motion.div>
                 )}
              </div>
          </div>

          {/* Tools Section */}
          <div className="glass-panel rounded-2xl border border-gray-800/50 overflow-hidden">
             <div className="flex border-b border-gray-800/50 bg-black/20">
                <div className="flex-1 flex items-center gap-2 px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-pink-500 leading-none">
                   <Icon name="magic" className="w-3 h-3" />
                   Smart Editing Tools
                </div>
             </div>

             <div className="p-4 space-y-6">
                {/* Magic Tools Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {EDITOR_TOOLS.map((tool) => (
                        <button
                            key={tool.id}
                            onClick={() => applyPreset(tool.prompt)}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300 relative overflow-hidden group ${
                                prompt === tool.prompt 
                                ? 'bg-pink-600 text-white border-pink-500 shadow-lg shadow-pink-500/20' 
                                : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-300'
                            }`}
                        >
                            <div className="mb-2 group-hover:scale-110 transition-transform">
                                 <Icon name={tool.icon} className="w-5 h-5" />
                            </div>
                            <span className="text-[9px] font-black text-center uppercase tracking-tighter leading-tight">{tool.label}</span>
                        </button>
                    ))}
                </div>

                {/* Enhance Section */}
                <div className="space-y-3">
                   <h5 className="text-[9px] font-black text-gray-600 uppercase tracking-widest px-1">Quality Boosters</h5>
                   <div className="grid grid-cols-3 gap-2">
                       {ENHANCE_TOOLS.map((tool) => (
                           <button
                               key={tool.id}
                               onClick={() => applyPreset(tool.prompt)}
                               className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all duration-300 group ${
                                   prompt === tool.prompt 
                                   ? 'bg-cyan-600 text-white border-cyan-500 shadow-lg shadow-cyan-500/20' 
                                   : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-300'
                               }`}
                           >
                               <Icon name={tool.icon} className="w-4 h-4" />
                               <span className="text-[9px] font-black uppercase tracking-tighter">{tool.label}</span>
                           </button>
                       ))}
                   </div>
                </div>
             </div>
          </div>

          {/* Custom Prompt */}
          <div className="w-full">
              <div className="relative group">
                <textarea
                  id="prompt-edit"
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-5 text-gray-100 placeholder-gray-600 focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all resize-none font-sans group-hover:border-gray-700"
                  placeholder="Detail instruksi modifikasi (cth: Ubah kemeja jadi gaun biru)..."
                />
                <div className="absolute bottom-3 right-3 text-[10px] font-black text-gray-700 bg-black/50 px-2 py-1 rounded-lg border border-white/5 uppercase tracking-widest hidden sm:block">Ctrl+Enter</div>
              </div>
          </div>

          <button
              onClick={handleGenerate}
              disabled={isLoading || !uploadedImage}
              className="group relative w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-black py-5 px-6 rounded-[1.5rem] shadow-xl transition-all duration-500 overflow-hidden disabled:opacity-50 disabled:grayscale active:scale-95"
          >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              {isLoading ? (
                <div className="flex items-center justify-center gap-3">
                    <LoadingSpinner color="white" size="small" />
                    <span className="uppercase tracking-[0.3em] text-sm">Processing...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                    <Icon name="magic" className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    <span className="uppercase tracking-[0.3em] text-sm">Apply Magic</span>
                </div>
              )}
          </button>
        </div>
      </div>

      {/* RIGHT COLUMN: Results */}
      <div className="flex flex-col gap-6 lg:border-l lg:border-gray-700/50 lg:pl-10 relative">
        <div className="sticky top-28 flex flex-col gap-6 h-full">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                 <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Icon name="image" className="w-5 h-5 text-purple-400" />
                    Hasil Edit
                 </h3>
            </div>

            {isLoading && (
                <div className="flex-1 flex items-center justify-center min-h-[300px] bg-gray-800/30 rounded-2xl border border-gray-700/50 animate-pulse p-8">
                    <div className="text-center max-w-xs flex flex-col items-center">
                        <div className="mb-6"><LoadingSpinner size="large" /></div>
                        <p className="text-lg font-bold text-white mb-2">Memanipulasi Piksel...</p>
                        <p className="text-sm text-gray-400">Menerapkan filter dan transformasi cerdas.</p>
                    </div>
                </div>
            )}

            {error && (
                <div className={`border p-6 rounded-2xl flex items-start gap-4 transition-all duration-300 animate-slide-up ${
                    error.toLowerCase().includes('quota') || error.toLowerCase().includes('exhausted') || error.toLowerCase().includes('limit')
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.1)]' 
                    : 'bg-red-500/10 border-red-500/30 text-red-200'
                }`}>
                    <div className={`p-2 rounded-xl flex-shrink-0 ${
                        error.toLowerCase().includes('quota') || error.toLowerCase().includes('exhausted') || error.toLowerCase().includes('limit')
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                        <Icon name="warning" className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-white text-lg">
                            {error.toLowerCase().includes('quota') || error.toLowerCase().includes('exhausted') || error.toLowerCase().includes('limit')
                                ? 'Limit Penggunaan AI Terlampaui' 
                                : 'Terjadi Kesalahan'
                            }
                        </p>
                        <p className="text-sm opacity-90 mt-2 leading-relaxed font-medium">{error}</p>
                        
                        {(error.toLowerCase().includes('quota') || error.toLowerCase().includes('exhausted') || error.toLowerCase().includes('limit')) && (
                            <div className="mt-6 flex flex-wrap gap-3">
                                <button 
                                     onClick={() => window.location.reload()}
                                     className="bg-amber-500 hover:bg-amber-600 text-black text-xs font-black py-3 px-6 rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-2"
                                >
                                    <Icon name="refresh" className="w-4 h-4" />
                                    COBA LAGI NANTI
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {generatedImages.length > 0 && (
            <div className="flex flex-col gap-4 animate-fade-in-up">
                {/* Result View */}
                <div className="group relative bg-gray-900 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-purple-500/50">
                     <div className="absolute top-3 left-3 bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded z-10 shadow uppercase tracking-wider">
                        Hasil Baru
                    </div>
                    <img src={generatedImages[0]} alt="Edited Result" className="w-full h-auto object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 gap-2">
                         <a 
                            href={generatedImages[0]} 
                            download={`sandari-edited.jpg`} 
                            className="w-full bg-white text-gray-900 font-bold py-3 rounded-lg text-center hover:bg-gray-100 transition transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 text-sm"
                        >
                            <Icon name="download" className="w-4 h-4" />
                            Unduh Hasil
                        </a>
                        <button
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                if (onSendToVideo) onSendToVideo({ image: generatedImages[0], prompt: prompt }); 
                            }}
                            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg text-center hover:bg-indigo-500 transition transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 text-sm"
                        >
                            <Icon name="video" className="w-4 h-4" />
                            Animate Hasil
                        </button>
                    </div>
                </div>

                {/* Original View (Small) */}
                 {uploadedImage && (
                    <div className="bg-gray-800/30 rounded-xl p-3 border border-gray-700 flex items-center gap-4">
                        <div className="h-16 w-16 rounded-lg overflow-hidden relative flex-shrink-0 border border-gray-600">
                            <img src={uploadedImage.previewUrl} alt="Original" className="w-full h-full object-cover opacity-80" />
                        </div>
                        <div>
                             <p className="text-xs text-gray-500 font-bold uppercase mb-1">Sumber Asli</p>
                             <p className="text-xs text-gray-400 truncate max-w-[150px]">{uploadedImage.file.name}</p>
                        </div>
                    </div>
                )}
            </div>
            )}
            
            {!isLoading && !error && generatedImages.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-800 rounded-2xl p-10 bg-gray-900/30 min-h-[400px]">
                     <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4 text-gray-600">
                        <Icon name="magic" className="w-8 h-8" />
                     </div>
                     <h4 className="text-xl font-bold text-gray-300 mb-2">Ruang Edit</h4>
                     <p className="text-sm text-center max-w-xs leading-relaxed">Unggah foto dan pilih efek di kiri untuk melihat transformasi ajaib di sini.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default PhotoEditor;
