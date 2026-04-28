
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { generateImages, editImage, generateAffiliateScripts, regenerateVisualPrompt, regenerateSceneScript } from '../services/geminiService';
import { ImageAspectRatio, Generation } from '../types';
import { IMAGE_ASPECT_RATIOS, NUM_IMAGES_OPTIONS, IMAGE_TEMPLATES, IMAGE_STYLES, IMAGE_LIGHTING, GENERATION_MODES } from '../constants';
import LoadingSpinner from './LoadingSpinner';
import ImageUploader from './ImageUploader';
import { fileToBase64 } from '../utils/fileUtils';
import Icon from './Icons';
import useLocalStorage from '../hooks/useLocalStorage';

interface ImageGeneratorProps {
  addGenerationToHistory: (generation: Generation) => void;
  updateGenerationInHistory: (id: string, updates: Partial<Generation>) => void;
  onSendToVideo?: (data: { image?: string, prompt?: string }) => void;
}

interface ScriptData {
  storyboard: { script: string, visualPrompt: string }[];
  prompt: string;
}

const LANGUAGES = [
  { id: 'id', label: 'Indonesia' },
  { id: 'jv', label: 'Jawa' },
  { id: 'su', label: 'Sunda' }
];

const STYLES = [
  { id: 'gaul', label: 'Gaul (Jakarta)' },
  { id: 'formal', label: 'Formal (Edukasi)' },
  { id: 'medok', label: 'Medok (Jawa)' },
  { id: 'hype', label: 'Hype (Semangat)' },
  { id: 'soft', label: 'Soft Selling (Kalem)' }
];

const TRANSITIONS = [
  { id: 'fade', label: 'Fade' },
  { id: 'slide', label: 'Slide' },
  { id: 'zoom', label: 'Zoom' },
  { id: 'cut', label: 'Hard Cut' }
];

const CTA_OPTIONS = [
  { id: 'buy_now', label: 'Beli Sekarang' },
  { id: 'click_link', label: 'Klik Link di Bio' },
  { id: 'checkout', label: 'Check Out Sekarang' },
  { id: 'promo', label: 'Ambil Promonya' }
];

const IMAGE_PROMPT_TIPS = [
  "Spesifik: 'Danau pegunungan yang tenang saat matahari terbit dengan pantulan' lebih baik daripada 'Danau yang bagus'.",
  "Sertakan kata sifat: Jelaskan warna, suasana, gaya (mis., 'cerah', 'dramatis', 'minimalis').",
  "Tentukan gaya artistik: Gunakan istilah seperti 'lukisan digital', 'fotorealistik', 'cat air', 'cyberpunk'.",
  "Definisikan pencahayaan: 'Golden hour', 'cahaya neon', 'pencahayaan studio', 'siluet dramatis'.",
  "Tambahkan detail: Sebutkan tekstur, bahan, lingkungan, waktu, cuaca.",
  "Pertimbangkan komposisi: 'Close-up shot', 'wide-angle', 'dari atas', 'sudut dinamis'.",
  "Untuk pengeditan/multi-gambar: Jelaskan dengan jelas bagaimana kedua gambar harus berinteraksi atau digabungkan.",
  "Eksperimen: Cobalah menggabungkan elemen atau konsep yang tidak biasa."
];

// Helper Component for Toggle Options
const ToggleOption = ({
  id,
  label,
  subLabel,
  checked,
  onChange,
  icon,
  activeColor = "green"
}: {
  id: string;
  label: string;
  subLabel?: React.ReactNode;
  checked: boolean;
  onChange: (val: boolean) => void;
  icon: string;
  activeColor?: "green" | "blue" | "yellow";
}) => {
  const bgColors = {
    green: "peer-checked:bg-pink-600",
    blue: "peer-checked:bg-blue-600",
    yellow: "peer-checked:bg-yellow-500",
  };
  
  const textColors = {
     green: "text-pink-400",
     blue: "text-blue-400",
     yellow: "text-yellow-400"
  };

  return (
    <div
      onClick={() => onChange(!checked)}
      className={`relative flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-200 group ${
        checked
          ? "bg-gray-800 border-gray-600 shadow-sm"
          : "bg-gray-900/40 border-gray-800 hover:bg-gray-800 hover:border-gray-700"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            checked ? `bg-gray-700 ${textColors[activeColor]}` : "bg-gray-800 text-gray-600 group-hover:text-gray-500"
          }`}
        >
          <Icon name={icon} className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span
            className={`text-xs font-bold uppercase tracking-wide transition-colors ${
              checked ? "text-gray-200" : "text-gray-500"
            }`}
          >
            {label}
          </span>
          {subLabel && <span className="text-[10px] text-gray-600">{subLabel}</span>}
        </div>
      </div>

      <div className="relative inline-flex items-center pointer-events-none">
        <input type="checkbox" id={id} checked={checked} readOnly className="sr-only peer" />
        <div
          className={`w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all border-gray-600 ${bgColors[activeColor]}`}
        ></div>
      </div>
    </div>
  );
};

const ImageGenerator: React.FC<ImageGeneratorProps> = ({ 
  addGenerationToHistory, 
  updateGenerationInHistory,
  onSendToVideo
}) => {
  const [prompt, setPrompt] = useLocalStorage<string>('sandari_image_prompt', '');
  const [numberOfImages, setNumberOfImages] = useLocalStorage<number>('sandari_image_count', 1);
  const [aspectRatio, setAspectRatio] = useLocalStorage<ImageAspectRatio>('sandari_image_aspect', '1:1');
  const [style, setStyle] = useLocalStorage<string>('sandari_image_style', '');
  const [lighting, setLighting] = useLocalStorage<string>('sandari_image_lighting', '');
  const [enhanceFace, setEnhanceFace] = useLocalStorage<boolean>('sandari_image_enhance_face', false);
  const [keepOriginalFace, setKeepOriginalFace] = useLocalStorage<boolean>('sandari_image_keep_face', false); 
  const [isNanoBanana, setIsNanoBanana] = useLocalStorage<boolean>('sandari_image_nano', false);
  const [selectedModeId, setSelectedModeId] = useLocalStorage<string>('sandari_image_mode', '');
  const [gender, setGender] = useLocalStorage<'pria' | 'wanita'>('sandari_image_gender', 'wanita');
  const [clothingType, setClothingType] = useLocalStorage<'default' | 'custom'>('sandari_image_clothing_type', 'default');
  const [customClothing, setCustomClothing] = useLocalStorage<string>('sandari_image_custom_clothing', '');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useLocalStorage<string[]>('sandari_image_results', []);
  
  // State for two images (Removed 3rd image)
  const [uploadedImage1, setUploadedImage1] = useState<{ file: File; previewUrl: string } | null>(null);
  const [uploadedImage2, setUploadedImage2] = useState<{ file: File; previewUrl: string } | null>(null);
  
  const [showPromptTips, setShowPromptTips] = useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedPromptIndex, setCopiedPromptIndex] = useState<string | null>(null);
  const [copiedVOIndex, setCopiedVOIndex] = useState<string | null>(null);
  const [copiedSceneIndex, setCopiedSceneIndex] = useState<string | null>(null);
  
  // Video & Script State
  const [selectedResultIndex, setSelectedResultIndex] = useLocalStorage<number>('sandari_image_selected_idx', 0);
  const [showVideoSettings, setShowVideoSettings] = useState(false);
  const [isUpdatingScript, setIsUpdatingScript] = useState(false);
  const [numScenes, setNumScenes] = useState(3);
  const [sceneDuration, setSceneDuration] = useState(5);
  const [language, setLanguage] = useState('id');
  const [voiceStyle, setVoiceStyle] = useState('gaul');
  const [cta, setCta] = useState('buy_now');
  const [transition, setTransition] = useState('fade');
  const [imageScripts, setImageScripts] = useLocalStorage<ScriptData[]>('sandari_image_scripts', []);
  const [currentGenerationId, setCurrentGenerationId] = useLocalStorage<string | null>('sandari_image_gen_id', null);
  const [isRegeneratingPrompt, setIsRegeneratingPrompt] = useState<string | null>(null);
  const [isRegeneratingScript, setIsRegeneratingScript] = useState<string | null>(null);

  const handleImage1Upload = (file: File, previewUrl: string) => {
    setUploadedImage1({ file, previewUrl });
    setGeneratedImages([]);
    setError(null);
  };

  const handleImage1Remove = () => {
    if (uploadedImage1) {
      URL.revokeObjectURL(uploadedImage1.previewUrl);
    }
    setUploadedImage1(null);
  };

  const handleImage2Upload = (file: File, previewUrl: string) => {
    setUploadedImage2({ file, previewUrl });
    setGeneratedImages([]);
    setError(null);
  };

  const handleImage2Remove = () => {
    if (uploadedImage2) {
      URL.revokeObjectURL(uploadedImage2.previewUrl);
    }
    setUploadedImage2(null);
  };

  const handleGenerate = async () => {
    let trimmedPrompt = prompt.trim();
    const isAutoConcept = selectedModeId === 'auto_concept';
    let finalNumImages = numberOfImages;

    // Mode-specific logic
    const selectedMode = GENERATION_MODES.find(m => m.id === selectedModeId);
    if (selectedMode && !trimmedPrompt) {
      if (isAutoConcept) {
        trimmedPrompt = "Create a high-quality product lifestyle photography concept based on the uploaded product. Make it realistic, aesthetic, and professional with diverse artistic styles and environments.";
        finalNumImages = 6;
      } else {
        trimmedPrompt = selectedMode.prompt;
      }
    }

    if (!trimmedPrompt) {
      setError('Silakan masukkan prompt atau pilih mode auto.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImages([]);
    setImageScripts([]);
    setSelectedResultIndex(0);
    setShowVideoSettings(false);

    const generationId = crypto.randomUUID();
    setCurrentGenerationId(generationId);
    
    const hasUploads = uploadedImage1 || uploadedImage2;

    try {
      // Construct final prompt with styles
      let finalPrompt = trimmedPrompt;
      const advancedDetails = [];
      if (style && selectedModeId !== 'auto_concept') advancedDetails.push(style);
      if (lighting) advancedDetails.push(`${lighting} lighting`);
      if (gender) advancedDetails.push(`${gender === 'pria' ? 'male' : 'female'} character`);
      if (clothingType === 'default') {
          advancedDetails.push("wearing casual professional professional outfit");
      } else if (clothingType === 'custom' && customClothing) {
          advancedDetails.push(`wearing ${customClothing}`);
      }
      if (enhanceFace) advancedDetails.push("enhance face details, clear face, detailed eyes");

      if (advancedDetails.length > 0) {
          finalPrompt = `${finalPrompt}, ${advancedDetails.join(', ')}`;
      }

      // If Nano Banana is active OR we have uploads OR auto_concept, use editImage (Flash model)
      if (hasUploads || isNanoBanana || selectedModeId === 'auto_concept') {
        // Image editing/mixing mode (or Nano Banana Text mode)
        const imagesPayload: { data: string; mimeType: string }[] = [];
        const uploadedFileNames: string[] = [];

        if (uploadedImage1) {
          const base64Data = await fileToBase64(uploadedImage1.file);
          imagesPayload.push({ data: base64Data, mimeType: uploadedImage1.file.type });
          uploadedFileNames.push(uploadedImage1.file.name);
        }

        if (uploadedImage2) {
          const base64Data = await fileToBase64(uploadedImage2.file);
          imagesPayload.push({ data: base64Data, mimeType: uploadedImage2.file.type });
          uploadedFileNames.push(uploadedImage2.file.name);
        }

        const generationConfig = { 
            uploadedImages: uploadedFileNames, 
            aspectRatio, 
            style: selectedModeId === 'auto_concept' ? 'auto' : style, 
            lighting, 
            enhanceFace,
            keepOriginalFace,
            numberOfImages: finalNumImages,
            model: 'nano_banana',
            modeId: selectedModeId
        };

        // Use editImage which utilizes gemini-2.5-flash-image (Nano Banana)
        const images = await editImage(finalPrompt, imagesPayload, aspectRatio, finalNumImages);
        setGeneratedImages(images);
        
        addGenerationToHistory({
          id: generationId,
          prompt: trimmedPrompt,
          timestamp: Date.now(),
          type: 'image',
          status: 'completed',
          outputs: images,
          config: generationConfig,
        });
      } else {
        // Pure Text-to-image mode using Imagen (Standard)
        const generationConfig = { numberOfImages: finalNumImages, aspectRatio, style, lighting, enhanceFace, keepOriginalFace, model: 'imagen' };
        const images = await generateImages(finalPrompt, finalNumImages, aspectRatio);
        setGeneratedImages(images);
        
        addGenerationToHistory({
          id: generationId,
          prompt: trimmedPrompt,
          timestamp: Date.now(),
          type: 'image',
          status: 'completed',
          outputs: images,
          config: generationConfig,
        });
      }
    } catch (e: any) {
      const errorMessage = `Terjadi kesalahan: ${e.message}`;
      setError(errorMessage);
       const config = hasUploads || isNanoBanana
            ? { uploadedImages: [uploadedImage1?.file.name, uploadedImage2?.file.name].filter(Boolean), aspectRatio, style, lighting, model: 'nano_banana' } 
            : { numberOfImages, aspectRatio, style, lighting, enhanceFace, model: 'imagen' };
      addGenerationToHistory({
        id: generationId,
        prompt: trimmedPrompt,
        timestamp: Date.now(),
        type: 'image',
        status: 'failed',
        outputs: [],
        config,
        error: errorMessage,
      });
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateScript = async () => {
    if (generatedImages.length === 0 || !currentGenerationId) return;

    setIsUpdatingScript(true);
    try {
      const productImageParam = uploadedImage1 
        ? { data: await fileToBase64(uploadedImage1.file), mimeType: uploadedImage1.file.type } 
        : undefined;
      
      const scripts = await generateAffiliateScripts(generatedImages.length, {
        productImage: productImageParam,
        modelInfo: uploadedImage2 ? 'Provided face reference' : 'Regular photo',
        clothing: 'As shown in photo',
        pose: prompt || 'Product presentation',
        gender,
        language,
        voiceStyle,
        cta,
        numScenes,
        sceneDuration
      });

      const updatedScripts: ScriptData[] = scripts.map((s) => ({
        storyboard: s.storyboard,
        prompt: s.prompt
      }));

      setImageScripts(updatedScripts);
      
      // Update history with the generated storyboard
      updateGenerationInHistory(currentGenerationId, {
        config: {
           storyboards: updatedScripts
        }
      });
    } catch (error) {
      console.error(error);
      alert("Gagal membuat script.");
    } finally {
      setIsUpdatingScript(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault(); // Prevent new line in textarea
      handleGenerate();
    }
  };

  const handleCopyJSON = (src: string, index: number) => {
    const dataToCopy = {
        prompt: prompt,
        config: {
            aspectRatio,
            style,
            lighting,
            enhanceFace,
            keepOriginalFace,
            nanoBanana: isNanoBanana,
            mode: (uploadedImage1 || uploadedImage2) ? 'image-to-image' : 'text-to-image'
        },
        image: src 
    };
    
    navigator.clipboard.writeText(JSON.stringify(dataToCopy, null, 2))
        .then(() => {
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000);
        })
        .catch(err => console.error('Gagal menyalin JSON:', err));
  };

  const handleCopyPromptOnly = (promptText: string, index: number | string) => {
    navigator.clipboard.writeText(promptText);
    setCopiedPromptIndex(`scene-${index}`);
    setTimeout(() => setCopiedPromptIndex(null), 2000);
  };

  const handleCopyVOOnly = (voText: string, index: number | string) => {
    navigator.clipboard.writeText(voText);
    setCopiedVOIndex(`scene-${index}`);
    setTimeout(() => setCopiedVOIndex(null), 2000);
  };

  const handleCopyScene = (scene: { script: string, visualPrompt: string }, index: number | string) => {
    const text = `${scene.visualPrompt}. Voice over content: "${scene.script}"`;
    navigator.clipboard.writeText(text);
    setCopiedSceneIndex(`scene-${index}`);
    setTimeout(() => setCopiedSceneIndex(null), 2000);
  };

  const handleCopyAll = () => {
    const currentStoryboard = imageScripts[selectedResultIndex]?.storyboard;
    if (!currentStoryboard) return;
    
    const text = currentStoryboard.map((scene) => 
      `${scene.visualPrompt}. Voice over content: "${scene.script}"`
    ).join('\n\n---\n\n');
    
    navigator.clipboard.writeText(text);
    setCopiedSceneIndex('all');
    setTimeout(() => setCopiedSceneIndex(null), 2000);
  };

  const handleRegeneratePrompt = async (idx: number) => {
    const script = imageScripts[selectedResultIndex]?.storyboard[idx]?.script;
    if (!script) return;
    
    setIsRegeneratingPrompt(`scene-${idx}`);
    try {
      const newPrompt = await regenerateVisualPrompt(script, language);
      
      const newScripts = [...imageScripts];
      newScripts[selectedResultIndex].storyboard[idx].visualPrompt = newPrompt;
      setImageScripts(newScripts);
      
      if (currentGenerationId) {
        updateGenerationInHistory(currentGenerationId, {
          config: {
            storyboards: newScripts
          }
        });
      }
    } catch (error) {
      console.error(error);
      alert("Gagal meregenerasi prompt.");
    } finally {
      setIsRegeneratingPrompt(null);
    }
  };

  const handleRegenerateScript = async (idx: number) => {
    const visualPrompt = imageScripts[selectedResultIndex]?.storyboard[idx]?.visualPrompt;
    if (!visualPrompt) return;
    
    setIsRegeneratingScript(`scene-${idx}`);
    try {
      const newScript = await regenerateSceneScript(visualPrompt, language);
      
      const newScripts = [...imageScripts];
      newScripts[selectedResultIndex].storyboard[idx].script = newScript;
      setImageScripts(newScripts);
      
      if (currentGenerationId) {
        updateGenerationInHistory(currentGenerationId, {
          config: {
            storyboards: newScripts
          }
        });
      }
    } catch (error) {
      console.error(error);
      alert("Gagal meregenerasi naskah.");
    } finally {
      setIsRegeneratingScript(null);
    }
  };

  const hasUploads = uploadedImage1 || uploadedImage2;

  // Settings Tabs
  const [activeSettingsTab, setActiveSettingsTab] = useState<'subject' | 'settings' | 'model'>('subject');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      {/* LEFT COLUMN: Inputs */}
      <div className="flex flex-col gap-6">
        {/* Template Section */}
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
               <Icon name="magic" className="w-3 h-3" />
               Quick Templates
             </h3>
          </div>
          <div className="flex flex-wrap gap-2">
              {IMAGE_TEMPLATES.slice(0, 6).map(template => (
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

        <div className="flex flex-col gap-4">
          {/* Two Image Uploaders */}
          <div className="grid grid-cols-2 gap-3">
             <div className="glass-panel p-1 rounded-2xl border border-gray-800/50">
               <ImageUploader 
                  onImageUpload={handleImage1Upload}
                  onImageRemove={handleImage1Remove}
                  uploadedImagePreview={uploadedImage1?.previewUrl}
                  label="Produk"
               />
             </div>
             <div className="glass-panel p-1 rounded-2xl border border-gray-800/50">
               <ImageUploader 
                  onImageUpload={handleImage2Upload}
                  onImageRemove={handleImage2Remove}
                  uploadedImagePreview={uploadedImage2?.previewUrl}
                  label="Model"
               />
             </div>
          </div>

          <div className="w-full">
            <div className="relative group">
              <textarea
                id="prompt"
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-5 text-gray-100 placeholder-gray-600 focus:ring-1 focus:ring-pink-500/50 focus:border-pink-500/50 outline-none transition-all resize-none font-sans group-hover:border-gray-700 shadow-inner"
                placeholder={
                    hasUploads ? "Gambarkan bagaimana produk dan model menyatu..." : "Visualisasikan ide Anda di sini dengan detail..."
                }
              />
              <div className="absolute bottom-3 right-3 text-[10px] font-bold text-gray-700 bg-black/50 px-2 py-1 rounded-lg border border-white/5 uppercase tracking-widest hidden sm:block">Ctrl+Enter</div>
            </div>
            
             <div className="mt-3 flex justify-end">
                <button
                    onClick={() => setShowPromptTips(!showPromptTips)}
                    className="text-gray-500 hover:text-pink-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors px-2 py-1"
                >
                    {showPromptTips ? 'Tutup Guide' : 'Prompt Guide'}
                    <Icon name={showPromptTips ? "close" : "info"} className="w-3 h-3" />
                </button>
            </div>
            
            <AnimatePresence>
              {showPromptTips && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-2 overflow-hidden"
                  >
                    <div className="p-5 bg-gray-950 border border-gray-800 rounded-2xl text-gray-400 text-sm">
                        <h4 className="font-black text-[10px] uppercase tracking-[0.2em] mb-4 text-pink-500 flex items-center gap-2">
                          Guide Visualisasi Pro
                        </h4>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {IMAGE_PROMPT_TIPS.map((tip, index) => (
                                <li key={index} className="text-[11px] leading-relaxed flex gap-2">
                                  <span className="text-pink-600 font-bold">•</span>
                                  {tip}
                                </li>
                            ))}
                        </ul>
                    </div>
                  </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="glass-panel rounded-2xl border border-gray-800/50 overflow-hidden">
              {/* Settings Tab Headers */}
              <div className="flex border-b border-gray-800/50 bg-black/20">
                {[
                  { id: 'subject', label: 'Subjek', icon: 'user' },
                  { id: 'settings', label: 'Setting', icon: 'settings' },
                  { id: 'model', label: 'Model AI', icon: 'robot' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSettingsTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                      activeSettingsTab === tab.id 
                      ? 'text-pink-500 bg-pink-500/5' 
                      : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <Icon name={tab.icon} className="w-3 h-3" />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-5">
                <AnimatePresence mode="wait">
                  {activeSettingsTab === 'subject' && (
                    <motion.div 
                      key="subject"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="space-y-5"
                    >
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-3 leading-none underline decoration-pink-500/30 underline-offset-4">Gender</label>
                              <div className="flex gap-2">
                                  {['wanita', 'pria'].map(g => (
                                    <button 
                                        key={g}
                                        onClick={() => setGender(g as any)}
                                        className={`flex-1 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                            gender === g ? 'bg-pink-500 text-white border-pink-500 shadow-lg shadow-pink-500/20' : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-700'
                                        }`}
                                    >
                                        <Icon name="user" className="w-3 h-3" />
                                        {g}
                                    </button>
                                  ))}
                              </div>
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-3 leading-none underline decoration-pink-500/30 underline-offset-4">Pakaian</label>
                              <div className="flex gap-2">
                                  {[
                                    { id: 'default', label: 'Std', icon: 'tshirt' },
                                    { id: 'custom', label: 'AI', icon: 'wand' }
                                  ].map(c => (
                                    <button 
                                        key={c.id}
                                        onClick={() => setClothingType(c.id as any)}
                                        className={`flex-1 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                            clothingType === c.id ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-500/20' : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-700'
                                        }`}
                                    >
                                        <Icon name={c.icon} className="w-3 h-3" />
                                        {c.label}
                                    </button>
                                  ))}
                              </div>
                          </div>
                      </div>

                      {clothingType === 'custom' && (
                          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                              <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest">Detail Kostum Karakter</label>
                              <input 
                                  type="text"
                                  value={customClothing}
                                  onChange={(e) => setCustomClothing(e.target.value)}
                                  placeholder="Contoh: Streetwear hoodie neon, batik modern luxury..."
                                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-xs text-white focus:border-pink-500/50 outline-none transition-all placeholder:italic placeholder:opacity-30"
                              />
                          </motion.div>
                      )}
                    </motion.div>
                  )}

                  {activeSettingsTab === 'settings' && (
                    <motion.div 
                      key="settings"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest">Rasio Aspek</label>
                          <select
                            value={aspectRatio}
                            onChange={(e) => setAspectRatio(e.target.value as ImageAspectRatio)}
                            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-[10px] font-bold text-gray-300 outline-none focus:border-pink-500 appearance-none cursor-pointer"
                          >
                          {IMAGE_ASPECT_RATIOS.map((ratio) => (
                              <option key={ratio} value={ratio}>{ratio}</option>
                          ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest">Jumlah Hasil</label>
                          <select
                            value={numberOfImages}
                            onChange={(e) => setNumberOfImages(parseInt(e.target.value, 10))}
                            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-[10px] font-bold text-gray-300 outline-none focus:border-pink-500 appearance-none cursor-pointer"
                          >
                          {NUM_IMAGES_OPTIONS.map((num) => (
                              <option key={num} value={num}>{num} Hasil</option>
                          ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest">Art Style</label>
                          <select 
                            value={style} 
                            onChange={(e) => setStyle(e.target.value)} 
                            disabled={selectedModeId === 'auto_concept'}
                            className={`w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-[10px] font-bold text-gray-300 outline-none focus:border-pink-500 appearance-none cursor-pointer ${selectedModeId === 'auto_concept' ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                          >
                              <option value="">{selectedModeId === 'auto_concept' ? 'AI Inferred' : 'Default Style'}</option>
                              {IMAGE_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest">Lighting</label>
                          <select value={lighting} onChange={(e) => setLighting(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-[10px] font-bold text-gray-300 outline-none focus:border-pink-500 appearance-none cursor-pointer">
                              <option value="">Default Lighting</option>
                              {IMAGE_LIGHTING.map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeSettingsTab === 'model' && (
                    <motion.div 
                      key="model"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="grid grid-cols-1 gap-2"
                    >
                      <ToggleOption 
                          id="enhance-face" 
                          label="Facial Detail Boost" 
                          subLabel="Meningkatkan kejernihan wajah"
                          checked={enhanceFace} 
                          onChange={setEnhanceFace} 
                          icon="sparkles" 
                          activeColor="blue" 
                      />
                      <ToggleOption 
                          id="keep-original-face" 
                          label="Preserve Face Identity" 
                          subLabel="Menjaga kemiripan wajah asli"
                          checked={keepOriginalFace} 
                          onChange={setKeepOriginalFace} 
                          icon="user" 
                          activeColor="green" 
                      />
                      <ToggleOption 
                          id="nano-banana" 
                          label="Hyper Fast Mode" 
                          subLabel="Generasi instan (Flash Gen)"
                          checked={isNanoBanana} 
                          onChange={setIsNanoBanana} 
                          icon="robot" 
                          activeColor="yellow" 
                      />

                      <div className="mt-4 pt-4 border-t border-gray-800/50">
                        <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-3">AI Utility Mode</label>
                        <div className="grid grid-cols-1 gap-2">
                          {GENERATION_MODES.map((mode) => (
                            <button
                              key={mode.id}
                              onClick={() => {
                                if (selectedModeId === mode.id) {
                                  setSelectedModeId('');
                                } else {
                                  setSelectedModeId(mode.id);
                                  if (mode.aspectRatio) setAspectRatio(mode.aspectRatio);
                                }
                              }}
                              className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 group ${
                                selectedModeId === mode.id
                                  ? "bg-pink-500/10 border-pink-500/50 shadow-sm"
                                  : "bg-gray-900/40 border-gray-800 hover:bg-gray-800 hover:border-gray-700"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                    selectedModeId === mode.id ? "bg-pink-500 text-white" : "bg-gray-800 text-gray-600 group-hover:text-gray-500"
                                  }`}
                                >
                                  <Icon name={mode.icon} className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col text-left">
                                  <span
                                    className={`text-xs font-bold uppercase tracking-wide transition-colors ${
                                      selectedModeId === mode.id ? "text-gray-200" : "text-gray-500"
                                    }`}
                                  >
                                    {mode.label}
                                  </span>
                                  <span className="text-[9px] text-gray-600">
                                    {mode.id === 'auto_concept' ? 'AI makes 6 creative concepts' : 'Pre-configured prompt'}
                                  </span>
                                </div>
                              </div>
                              {selectedModeId === mode.id && <Icon name="check" className="w-4 h-4 text-pink-500" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
          </div>

          <button
              onClick={handleGenerate}
              disabled={isLoading}
              className={`group relative w-full text-white font-black py-5 px-6 rounded-[1.5rem] shadow-xl transition-all duration-500 overflow-hidden disabled:opacity-50 disabled:grayscale active:scale-95 ${
                 isNanoBanana 
                 ? 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 shadow-orange-500/20' 
                 : 'bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 shadow-pink-500/20'
              }`}
          >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              {isLoading ? (
                <div className="flex items-center justify-center gap-3">
                    <LoadingSpinner color="white" size="small" />
                    <span className="uppercase tracking-[0.3em] text-sm">{isNanoBanana ? 'Syncing...' : 'Rendering...'}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                    <Icon name={isNanoBanana ? 'robot' : 'image'} className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    <span className="uppercase tracking-[0.3em] text-sm">
                      {hasUploads ? 'Master Mix' : (isNanoBanana ? 'Instant Gen' : 'Initialize Gen')}
                    </span>
                </div>
              )}
          </button>
        </div>
      </div>

      {/* RIGHT COLUMN: Results & Status */}
      <div className="flex flex-col gap-6 lg:border-l lg:border-gray-700/50 lg:pl-10 relative">
        <div className="sticky top-28 flex flex-col gap-6 h-full">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                 <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Icon name="image" className="w-5 h-5 text-pink-400" />
                    Hasil Karya
                 </h3>
                 {generatedImages.length > 0 && (
                    <span className="text-[10px] font-bold bg-pink-500/10 text-pink-400 px-2 py-1 rounded-full border border-pink-500/20 uppercase tracking-wider">Selesai</span>
                 )}
            </div>

            {isLoading && (
                <div className="flex-1 flex items-center justify-center min-h-[300px] bg-gray-800/30 rounded-2xl border border-gray-700/50 animate-pulse p-8">
                    <div className="text-center max-w-xs flex flex-col items-center">
                        <div className="mb-6"><LoadingSpinner size="large" /></div>
                        <p className="text-lg font-bold text-white mb-2">AI sedang melukis...</p>
                        <p className="text-sm text-gray-400">Mohon tunggu, pixel sedang disusun menjadi karya seni.</p>
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
            <div className="space-y-6">
                <div className={`grid grid-cols-1 ${generatedImages.length > 1 ? 'sm:grid-cols-2' : ''} gap-6 animate-fade-in-up`}>
                    {generatedImages.map((src, index) => (
                        <div 
                            key={index} 
                            onClick={() => setSelectedResultIndex(index)}
                            className={`group relative bg-gray-900 rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 cursor-pointer ${selectedResultIndex === index ? 'ring-2 ring-pink-500' : 'ring-1 ring-gray-700 hover:ring-pink-500/50 grayscale-[0.5] hover:grayscale-0'}`}
                        >
                            <img src={src} alt={`Generated ${index + 1}`} className="w-full h-auto object-cover" />
                            
                            {/* Overlay Actions */}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <a 
                                        href={src} 
                                        download={`sandari-ai-${index}.jpg`} 
                                        className="flex items-center justify-center gap-1.5 bg-white text-gray-900 font-bold py-2 rounded-lg text-center hover:bg-gray-100 transition text-[9px]"
                                    >
                                        <Icon name="download" className="w-3 h-3" />
                                        Unduh
                                    </a>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSelectedResultIndex(index); setShowVideoSettings(true); }}
                                        className={`flex items-center justify-center gap-1.5 font-bold py-2 rounded-lg text-center transition text-[9px] border hover:scale-105 active:scale-95 ${showVideoSettings && selectedResultIndex === index ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-500/20' : 'bg-gray-800/80 text-white border-gray-600'}`}
                                    >
                                        <Icon name="play" className="w-3 h-3 text-purple-400" />
                                        Script
                                    </button>
                                    <button
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            if (onSendToVideo) onSendToVideo({ image: src, prompt: prompt }); 
                                        }}
                                        className="flex items-center justify-center gap-1.5 font-bold py-2 rounded-lg text-center transition text-[9px] border bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95"
                                    >
                                        <Icon name="video" className="w-3 h-3" />
                                        Animate
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleCopyJSON(src, index); }}
                                        className={`col-span-2 flex items-center justify-center gap-1.5 font-bold py-1.5 rounded-lg text-center transition text-[8px] border ${copiedIndex === index ? 'bg-pink-600 text-white border-pink-600' : 'bg-gray-900/40 text-gray-500 hover:text-white border-gray-800'}`}
                                    >
                                        {copiedIndex === index ? 'Disalin!' : 'Copy JSON'}
                                    </button>
                                </div>
                            </div>
                            {selectedResultIndex === index && (
                                <div className="absolute top-3 right-3 bg-pink-500 text-white rounded-full p-1 shadow-lg ring-2 ring-gray-900">
                                    <Icon name="check" className="w-4 h-4" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Video Settings Toggler removed from here and moved to card buttons */}
                <div className="space-y-6">
                    {showVideoSettings && (
                        <div className="glass-panel p-6 rounded-3xl border border-gray-800/30 space-y-5 animate-slide-up bg-gray-900/40">
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">Video Configuration</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Jumlah Scene</label>
                                    <select 
                                        value={numScenes}
                                        onChange={(e) => setNumScenes(parseInt(e.target.value))}
                                        className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                                    >
                                        {[1,2,3,4,5,6,7,8,9,10].map(n => (
                                            <option key={n} value={n}>{n} Scene</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Durasi / Scene</label>
                                    <select 
                                        value={sceneDuration}
                                        onChange={(e) => setSceneDuration(parseInt(e.target.value))}
                                        className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                                    >
                                        {[3,4,5,6,7,8,9,10,12,15].map(d => (
                                            <option key={d} value={d}>{d} Detik</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Bahasa</label>
                                    <select 
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                                    >
                                        {LANGUAGES.map(lang => (
                                            <option key={lang.id} value={lang.id}>{lang.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Logat</label>
                                    <select 
                                        value={voiceStyle}
                                        onChange={(e) => setVoiceStyle(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                                    >
                                        {STYLES.map(styleItem => (
                                            <option key={styleItem.id} value={styleItem.id}>{styleItem.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Pilihan CTA</label>
                                    <select 
                                        value={cta}
                                        onChange={(e) => setCta(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                                    >
                                        {CTA_OPTIONS.map(ctaItem => (
                                            <option key={ctaItem.id} value={ctaItem.id}>{ctaItem.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Transisi</label>
                                    <select 
                                        value={transition}
                                        onChange={(e) => setTransition(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                                    >
                                        {TRANSITIONS.map(t => (
                                            <option key={t.id} value={t.id}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Gender Model</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setGender('wanita')}
                                            className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${gender === 'wanita' ? 'bg-pink-600 border-pink-500 text-white shadow-lg shadow-pink-500/20' : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'}`}
                                        >
                                            Wanita
                                        </button>
                                        <button
                                            onClick={() => setGender('pria')}
                                            className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${gender === 'pria' ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'}`}
                                        >
                                            Pria
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleUpdateScript}
                                disabled={isUpdatingScript}
                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-black tracking-widest uppercase hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isUpdatingScript ? (
                                    <LoadingSpinner size="small" color="white" />
                                ) : (
                                    <>
                                        <Icon name="wand" className="w-4 h-4" />
                                        <span>Generate Storyboard & VO</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Storyboard Display */}
                    {imageScripts.length > 0 && (
                        <div className="glass-panel p-6 rounded-3xl border border-gray-800/50 space-y-6 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                        <Icon name="json" className="w-4 h-4 text-blue-500" />
                                        Storyboard & Voice Over
                                    </h3>
                                    <button 
                                        onClick={handleCopyAll}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all text-[9px] font-black uppercase tracking-widest ${
                                            copiedSceneIndex === 'all' 
                                            ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' 
                                            : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/30'
                                        }`}
                                    >
                                        <Icon name={copiedSceneIndex === 'all' ? "check" : "copy"} className="w-3 h-3" />
                                        {copiedSceneIndex === 'all' ? 'Copied' : 'Copy All'}
                                    </button>
                                </div>
                                <span className="text-[10px] font-bold text-gray-500 bg-gray-800 px-2 py-1 rounded-full uppercase">
                                    Hasil #{selectedResultIndex + 1}
                                </span>
                            </div>
                            
                            <div className="bg-gray-900/80 rounded-2xl p-5 border border-gray-800 font-mono text-[11px] leading-relaxed text-blue-300 min-h-[250px] max-h-[450px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800">
                                <div className="space-y-6">
                                    {imageScripts[selectedResultIndex]?.storyboard.map((scene, idx) => (
                                        <div key={idx} className="relative pl-4 border-l border-gray-800">
                                            <div className="flex items-center justify-between mb-2">
                                                 <p className="text-pink-500/80 uppercase text-[9px] tracking-widest font-bold">SCENE {idx + 1}</p>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-gray-600 text-[9px] font-bold">{sceneDuration}S</p>
                                                    <div className="flex items-center gap-1">
                                                        <button 
                                                            onClick={() => handleRegeneratePrompt(idx)}
                                                            className={`flex items-center gap-1 px-2 py-0.5 rounded transition-all text-[8px] font-bold uppercase tracking-wider bg-purple-600/20 text-purple-400 hover:bg-purple-600 hover:text-white border border-purple-500/30`}
                                                            title="Regenerate Visual Prompt dari Dialog"
                                                            disabled={isRegeneratingPrompt === `scene-${idx}`}
                                                        >
                                                            {isRegeneratingPrompt === `scene-${idx}` ? (
                                                                <LoadingSpinner size="small" color="purple" />
                                                            ) : (
                                                                <Icon name="wand" className="w-2.5 h-2.5" />
                                                            )}
                                                            {isRegeneratingPrompt === `scene-${idx}` ? 'Wait' : 'Rethink'}
                                                        </button>
                                                        <button 
                                                            onClick={() => handleCopyPromptOnly(scene.visualPrompt, idx)}
                                                            className={`flex items-center gap-1 px-2 py-0.5 rounded transition-all text-[8px] font-bold uppercase tracking-wider ${
                                                                copiedPromptIndex === `scene-${idx}` 
                                                                ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' 
                                                                : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700/50'
                                                            }`}
                                                            title="Salin Visual Prompt"
                                                        >
                                                            <Icon name={copiedPromptIndex === `scene-${idx}` ? "check" : "copy"} className="w-2.5 h-2.5" />
                                                            {copiedPromptIndex === `scene-${idx}` ? 'Copied' : 'Prompt'}
                                                        </button>
                                                        <button 
                                                            onClick={() => handleCopyVOOnly(scene.script, idx)}
                                                            className={`flex items-center gap-1 px-2 py-0.5 rounded transition-all text-[8px] font-bold uppercase tracking-wider ${
                                                                copiedVOIndex === `scene-${idx}` 
                                                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                                                                : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700/50'
                                                            }`}
                                                            title="Salin Dialog"
                                                        >
                                                            <Icon name={copiedVOIndex === `scene-${idx}` ? "check" : "play"} className="w-2.5 h-2.5" />
                                                            {copiedVOIndex === `scene-${idx}` ? 'Copied' : 'Dialog'}
                                                        </button>
                                                        <button 
                                                            onClick={() => handleRegenerateScript(idx)}
                                                            className="flex items-center gap-1 px-2 py-0.5 rounded transition-all text-[8px] font-bold uppercase tracking-wider bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/30"
                                                            title="Regenerate Dialog dari Visual"
                                                            disabled={isRegeneratingScript === `scene-${idx}`}
                                                        >
                                                            {isRegeneratingScript === `scene-${idx}` ? (
                                                                <LoadingSpinner size="small" color="blue" />
                                                            ) : (
                                                                <Icon name="wand" className="w-2.5 h-2.5" />
                                                            )}
                                                            {isRegeneratingScript === `scene-${idx}` ? 'Wait' : 'Rethink'}
                                                        </button>
                                                        <button 
                                                            onClick={() => {
                                                                if (onSendToVideo) onSendToVideo({ prompt: scene.visualPrompt });
                                                            }}
                                                            className="flex items-center gap-1 px-2 py-0.5 rounded transition-all text-[8px] font-bold uppercase tracking-wider bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white border border-indigo-500/30"
                                                            title="Buat Video dari Prompt ini"
                                                        >
                                                            <Icon name="video" className="w-2.5 h-2.5" />
                                                            Anim
                                                        </button>
                                                        <button 
                                                            onClick={() => handleCopyScene(scene, idx)}
                                                            className={`flex items-center gap-1 px-2 py-0.5 rounded transition-all text-[8px] font-bold uppercase tracking-wider ${
                                                                copiedSceneIndex === `scene-${idx}` 
                                                                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                                                : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700/50'
                                                            }`}
                                                            title="Salin Full Prompt (Dialog + Visual)"
                                                        >
                                                            <Icon name={copiedSceneIndex === `scene-${idx}` ? "check" : "copy"} className="w-2.5 h-2.5" />
                                                            {copiedSceneIndex === `scene-${idx}` ? 'Copied' : 'Full'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-800 hover:border-purple-500/30 transition-all group">
                                                <p className="text-blue-100 text-[11px] mb-3 leading-relaxed">
                                                    {scene.visualPrompt}
                                                </p>
                                                <div className="flex items-start gap-3 pt-3 border-t border-gray-800/50">
                                                    <div className="w-5 h-5 bg-green-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                                        <Icon name="play" className="w-2.5 h-2.5 text-green-500" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-tighter">Naskah / Dialog</p>
                                                            <span className="text-[7px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded uppercase font-bold">{LANGUAGES.find(l => l.id === language)?.label}</span>
                                                        </div>
                                                        <p className="text-white italic text-[11px] leading-relaxed font-medium">"{scene.script}"</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <Icon name="pencil" className="w-3 h-3" />
                                    Full Prompt Context
                                </h4>
                                <div className="p-4 bg-gray-900/50 rounded-xl border border-gray-800 text-[11px] text-gray-400 italic leading-relaxed">
                                    {imageScripts[selectedResultIndex]?.prompt}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            )}
            
            {!isLoading && !error && generatedImages.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-800 rounded-2xl p-10 bg-gray-900/30 min-h-[400px]">
                     <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4 text-gray-600">
                        <Icon name="image" className="w-8 h-8" />
                     </div>
                     <h4 className="text-xl font-bold text-gray-300 mb-2">Kanvas Kosong</h4>
                     <p className="text-sm text-center max-w-xs leading-relaxed">Hasil gambar Anda akan muncul di sini setelah Anda menekan tombol buat.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ImageGenerator;
