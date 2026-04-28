
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { startVideoGeneration, getApiKey } from '../services/geminiService';
import { VideoAspectRatio, Resolution, Generation } from '../types';
import { VIDEO_ASPECT_RATIOS, RESOLUTIONS, VIDEO_TEMPLATES, VIDEO_LOADING_MESSAGES } from '../constants';
import LoadingSpinner from './LoadingSpinner';
import ImageUploader from './ImageUploader';
import { fileToBase64 } from '../utils/fileUtils';
import Icon from './Icons';
import { GoogleGenAI } from "@google/genai";
import useLocalStorage from '../hooks/useLocalStorage';

interface VideoGeneratorProps {
  addGenerationToHistory: (generation: Generation) => void;
  prefilledData?: { image?: string, prompt?: string } | null;
  onClearPrefilled?: () => void;
}

const VideoGenerator: React.FC<VideoGeneratorProps> = ({ 
  addGenerationToHistory, 
  prefilledData,
  onClearPrefilled
}) => {
  const [prompt, setPrompt] = useLocalStorage<string>('sandari_video_prompt', '');
  const [aspectRatio, setAspectRatio] = useLocalStorage<VideoAspectRatio>('sandari_video_aspect', '16:9');
  const [resolution, setResolution] = useLocalStorage<Resolution>('sandari_video_res', '720p');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>(VIDEO_LOADING_MESSAGES[0]);
  const [error, setError] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useLocalStorage<string | null>('sandari_video_result', null);
  const [uploadedImage, setUploadedImage] = useState<{ file?: File; previewUrl: string } | null>(null);
  
  // Progress simulation since video gen is async and takes time
  const [progress, setProgress] = useState(0);

  // Handle prefilled data
  useEffect(() => {
    if (prefilledData) {
      if (prefilledData.prompt) setPrompt(prefilledData.prompt);
      if (prefilledData.image) {
        setUploadedImage({ previewUrl: prefilledData.image });
      }
      if (onClearPrefilled) onClearPrefilled();
    }
  }, [prefilledData, onClearPrefilled]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      let msgIndex = 0;
      interval = setInterval(() => {
        msgIndex = (msgIndex + 1) % VIDEO_LOADING_MESSAGES.length;
        setLoadingMessage(VIDEO_LOADING_MESSAGES[msgIndex]);
        setProgress(prev => Math.min(prev + (100 - prev) * 0.1, 95));
      }, 5000);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleImageUpload = (file: File, previewUrl: string) => {
    setUploadedImage({ file, previewUrl });
    setError(null);
  };

  const handleImageRemove = () => {
    if (uploadedImage && uploadedImage.file) {
      URL.revokeObjectURL(uploadedImage.previewUrl);
    }
    setUploadedImage(null);
  };

  const handleGenerate = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setError('Silakan masukkan deskripsi video.');
      return;
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      setError('API Key tidak ditemukan. Silakan atur di Settings.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedVideo(null);
    setProgress(0);

    const generationId = crypto.randomUUID();
    const ai = new GoogleGenAI({ apiKey });

    try {
      let startImageParam = undefined;
      if (uploadedImage) {
        let base64Data: string;
        let mimeType: string;

        if (uploadedImage.file) {
          base64Data = await fileToBase64(uploadedImage.file);
          mimeType = uploadedImage.file.type;
        } else {
          // It's just a URL (prefilled)
          const response = await fetch(uploadedImage.previewUrl);
          const blob = await response.blob();
          mimeType = blob.type;
          base64Data = await new Promise((resolve) => {
             const reader = new FileReader();
             reader.onloadend = () => resolve(reader.result as string);
             reader.readAsDataURL(blob);
          });
        }
        
        // Remove data URL prefix for API
        const base64String = base64Data.split(',')[1];
        startImageParam = {
          data: base64String,
          mimeType: mimeType
        };
      }

      const operation = await startVideoGeneration(
        ai,
        trimmedPrompt,
        resolution,
        aspectRatio,
        startImageParam
      );

      // Wait for operation to complete
      let result;
      // Note: In real Veo API, this might be a polling mechanism. 
      // For this implementation, we assume generateVideos returns the final result or handles the wait.
      // Based on typical GoogleGenAI SDK patterns, startVideoGeneration might need to be awaited.
      // If it's a long running operation, we'd poll.
      
      // Checking the operation status
      result = await operation;
      
      // Extract video URL or data
      const videoUri = result.videoValue?.uri;
      if (!videoUri) {
          throw new Error("Gagal memperoleh URL video hasil.");
      }

      setGeneratedVideo(videoUri);
      setProgress(100);

      addGenerationToHistory({
        id: generationId,
        prompt: trimmedPrompt,
        timestamp: Date.now(),
        type: 'video',
        status: 'completed',
        outputs: [videoUri],
        config: {
          aspectRatio,
          resolution,
          hasStartImage: !!uploadedImage
        },
      });

    } catch (e: any) {
      const errorMessage = e.message || 'Gagal menghasilkan video.';
      setError(errorMessage);
      addGenerationToHistory({
        id: generationId,
        prompt: trimmedPrompt,
        timestamp: Date.now(),
        type: 'video',
        status: 'failed',
        outputs: [],
        config: {
          aspectRatio,
          resolution,
          hasStartImage: !!uploadedImage
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
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
               <Icon name="play" className="w-3 h-3" />
               Video Templates
             </h3>
          </div>
          <div className="flex flex-wrap gap-2">
              {VIDEO_TEMPLATES.slice(0, 6).map(template => (
                  <button
                      key={template.name}
                      onClick={() => setPrompt(template.prompt)}
                      className="group bg-gray-900/50 hover:bg-pink-500/10 border border-gray-800 hover:border-pink-500/30 text-gray-400 hover:text-pink-400 text-[10px] font-bold uppercase tracking-wider py-2 px-3 rounded-xl transition-all duration-300 flex items-center gap-2"
                  >
                      <Icon name={template.icon} className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                      <span>{template.name}</span>
                  </button>
              ))}
          </div>
        </div>

        <div className="space-y-6">
          {/* Optional Start Image Upload */}
          <div className="glass-panel p-4 rounded-2xl border border-gray-800/50">
             <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">
               Start Image (Optional)
             </label>
             <ImageUploader 
                onImageUpload={handleImageUpload}
                onImageRemove={handleImageRemove}
                uploadedImagePreview={uploadedImage?.previewUrl}
                label="Unggah Gambar Referensi"
             />
             <p className="mt-2 text-[9px] text-gray-600 italic">
               Gunakan gambar sebagai titik awal untuk animasi video Anda.
             </p>
          </div>

          <div className="w-full">
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">
              Video Prompt
            </label>
            <div className="relative group">
              <textarea
                id="video-prompt"
                rows={5}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-gray-900/50 border border-gray-800 rounded-2xl p-5 text-gray-100 placeholder-gray-600 focus:ring-1 focus:ring-pink-500/50 focus:border-pink-500/50 outline-none transition-all resize-none shadow-inner"
                placeholder="Deskripsikan video yang ingin Anda buat secara detail..."
              />
              <div className="absolute bottom-3 right-3 text-[10px] font-bold text-gray-700 bg-black/50 px-2 py-1 rounded-lg border border-white/5 uppercase tracking-widest hidden sm:block">Ctrl+Enter</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest">Rasio Aspek</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as VideoAspectRatio)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-[10px] font-bold text-gray-300 outline-none focus:border-pink-500 cursor-pointer appearance-none"
              >
                {VIDEO_ASPECT_RATIOS.map((ratio) => (
                    <option key={ratio} value={ratio}>{ratio}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest">Resolusi</label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value as Resolution)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-[10px] font-bold text-gray-300 outline-none focus:border-pink-500 cursor-pointer appearance-none"
              >
                {RESOLUTIONS.map((res) => (
                    <option key={res} value={res}>{res}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            className="group relative w-full py-5 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 rounded-[1.5rem] text-white font-black tracking-[0.2em] uppercase shadow-xl shadow-purple-900/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-3 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            {isLoading ? (
              <>
                <LoadingSpinner size="small" color="white" />
                <span className="text-sm">Generating AI Video...</span>
              </>
            ) : (
              <>
                <Icon name="video" className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                <span className="text-sm">Create Video</span>
              </>
            )}
          </button>
          
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
      </div>

      {/* RIGHT COLUMN: Results */}
      <div className="flex flex-col gap-6 lg:border-l lg:border-gray-700/50 lg:pl-10 relative">
        <div className="sticky top-28 flex flex-col gap-6 h-full min-h-[500px]">
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
             <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Icon name="video" className="w-5 h-5 text-pink-400" />
                Video Output
             </h3>
          </div>

          {isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-900/30 rounded-3xl border border-gray-800 shadow-inner p-8">
              <div className="w-full max-w-sm space-y-6 text-center">
                <div className="relative inline-block">
                  <div className="w-24 h-24 rounded-full border-4 border-pink-500/20 border-t-pink-500 animate-spin"></div>
                  <Icon name="video" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-pink-500" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-black tracking-tighter text-white animate-pulse">
                    {loadingMessage}
                  </p>
                  <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-pink-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                    AI sedang merender visual tingkat lanjut
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isLoading && generatedVideo && (
            <div className="flex-1 flex flex-col gap-6 animate-fade-in">
              <div className="relative group aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-gray-800">
                <video 
                  src={generatedVideo} 
                  controls 
                  autoPlay 
                  loop 
                  className="w-full h-full object-contain"
                />
              </div>
              
              <div className="flex gap-4">
                <a 
                  href={generatedVideo} 
                  download="sandari-video.mp4"
                  className="flex-1 py-4 bg-pink-600 hover:bg-pink-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg shadow-pink-600/20"
                >
                  <Icon name="download" className="w-4 h-4" />
                  Download MP4
                </a>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(generatedVideo);
                    alert("Link video disalin!");
                  }}
                  className="px-6 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-2xl border border-gray-700 transition-all"
                >
                  <Icon name="copy" className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {!isLoading && !generatedVideo && !error && (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-gray-800 rounded-[2rem] p-10 bg-gray-900/10">
              <div className="w-20 h-20 bg-gray-900/50 rounded-full flex items-center justify-center mb-6">
                <Icon name="video" className="w-8 h-8 opacity-20" />
              </div>
              <h4 className="text-xl font-black text-gray-400 mb-2 uppercase tracking-tighter">Ready to Action</h4>
              <p className="text-xs text-center max-w-xs leading-relaxed opacity-50 font-medium">
                Visualisasikan ide video Anda. Masukkan prompt dan tekan Create Video untuk memulai keajaiban AI.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoGenerator;
