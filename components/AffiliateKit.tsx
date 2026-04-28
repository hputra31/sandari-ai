
import React, { useState, useRef } from 'react';
import { Generation, ImageAspectRatio } from '../types';
import Icon from './Icons';
import ImageUploader from './ImageUploader';
import LoadingSpinner from './LoadingSpinner';
import { fileToBase64 } from '../utils/fileUtils';
import { editImage, generateAffiliateScripts, regenerateVisualPrompt, regenerateSceneScript } from '../services/geminiService';
import { IMAGE_ASPECT_RATIOS } from '../constants';

interface AffiliateKitProps {
  addGenerationToHistory: (generation: Generation) => void;
  updateGenerationInHistory: (id: string, updates: Partial<Generation>) => void;
}

interface AffiliateResult {
  url: string;
  storyboard: { script: string, visualPrompt: string }[];
  prompt: string;
}

interface ImageState {
  data: string;
  mimeType: string;
  url: string;
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

const AffiliateKit: React.FC<AffiliateKitProps> = ({ addGenerationToHistory, updateGenerationInHistory }) => {
  // Image Generation State
  const [productImage, setProductImage] = useState<ImageState | null>(null);
  const [modelFace, setModelFace] = useState<ImageState | null>(null);
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>('9:16');
  const [gender, setGender] = useState<'pria' | 'wanita'>('wanita');
  const [numImages, setNumImages] = useState(1);
  const [clothingType, setClothingType] = useState<'default' | 'custom'>('default');
  const [customClothing, setCustomClothing] = useState('');
  const [posePrompt, setPosePrompt] = useState('');
  
  // Video Generation State
  const [numScenes, setNumScenes] = useState(3);
  const [sceneDuration, setSceneDuration] = useState(5);
  const [language, setLanguage] = useState('id');
  const [voiceStyle, setVoiceStyle] = useState('gaul');
  const [cta, setCta] = useState('buy_now');
  const [transition, setTransition] = useState('fade');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Generation | null>(null);
  const [activeStep, setActiveStep] = useState<'setup' | 'result'>('setup');
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [showVideoSettings, setShowVideoSettings] = useState(false);
  const [isUpdatingScript, setIsUpdatingScript] = useState(false);
  const [isRegeneratingPrompt, setIsRegeneratingPrompt] = useState<string | null>(null);
  const [isRegeneratingScript, setIsRegeneratingScript] = useState<string | null>(null);
  const [copiedSceneIndex, setCopiedSceneIndex] = useState<string | null>(null);
  const [copiedPromptIndex, setCopiedPromptIndex] = useState<string | null>(null);
  const [copiedVOIndex, setCopiedVOIndex] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!productImage) {
      alert("Foto Produk wajib diunggah!");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // 1. Generate scripts first to use as base for images too
      const scripts = await generateAffiliateScripts(numImages, {
        productImage: { data: productImage.data, mimeType: productImage.mimeType },
        modelInfo: modelFace ? 'Provided face reference' : 'Professional model',
        clothing: clothingType === 'default' ? 'Default' : customClothing,
        pose: posePrompt,
        gender,
        language,
        voiceStyle,
        cta,
        numScenes,
        sceneDuration
      });

      const referenceImages = [
        { data: productImage.data, mimeType: productImage.mimeType }
      ];
      if (modelFace) {
        referenceImages.push({ data: modelFace.data, mimeType: modelFace.mimeType });
      }

      // To get UNIQUE photos per prompt, we might need multiple editImage calls with increasing delays
      const imageUrlPromises = scripts.map(async (s, i) => {
        // Stagger the calls significantly to avoid hit rate limits (Gemini 2.5 Image has tight limits)
        await new Promise(resolve => setTimeout(resolve, i * 6000));
        const batch = await editImage(s.prompt, referenceImages, aspectRatio, 1);
        return batch[0];
      });
      const imageUrls = await Promise.all(imageUrlPromises);

      const affiliateResults: AffiliateResult[] = imageUrls.map((url, i) => ({
        url,
        storyboard: scripts[i].storyboard,
        prompt: scripts[i].prompt
      }));

      const generation: Generation = {
        id: crypto.randomUUID(),
        prompt: scripts[0].prompt,
        timestamp: Date.now(),
        type: 'affiliate',
        status: 'completed',
        outputs: imageUrls,
        config: {
          productImage: productImage.url,
          modelFace: modelFace?.url,
          affiliateResults,
          videoSettings: {
            numScenes,
            sceneDuration,
            language,
            voiceStyle,
            cta,
            transition
          }
        }
      };

      setResult(generation);
      addGenerationToHistory(generation);
      setSelectedResultIndex(0);
      setActiveStep('result');
      setShowVideoSettings(false);
    } catch (error: any) {
      console.error(error);
      setError(error.message || "Gagal melakukan generate. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPromptOnly = (promptText: string, index: number) => {
    navigator.clipboard.writeText(promptText);
    setCopiedPromptIndex(`scene-${index}`);
    setTimeout(() => setCopiedPromptIndex(null), 2000);
  };

  const handleCopyVOOnly = (voText: string, index: number) => {
    navigator.clipboard.writeText(voText);
    setCopiedVOIndex(`scene-${index}`);
    setTimeout(() => setCopiedVOIndex(null), 2000);
  };

  const handleCopyScene = (scene: { script: string, visualPrompt: string }, index: number) => {
    const text = `${scene.visualPrompt}. Voice over content: "${scene.script}"`;
    navigator.clipboard.writeText(text);
    setCopiedSceneIndex(`scene-${index}`);
    setTimeout(() => setCopiedSceneIndex(null), 2000);
  };

  const handleCopyAll = () => {
    if (!currentResult) return;
    const text = currentResult.storyboard.map((scene) => 
      `${scene.visualPrompt}. Voice over content: "${scene.script}"`
    ).join('\n\n---\n\n');
    
    navigator.clipboard.writeText(text);
    setCopiedSceneIndex('all');
    setTimeout(() => setCopiedSceneIndex(null), 2000);
  };

  const handleRegeneratePrompt = async (idx: number) => {
    const storyboard = result?.config?.affiliateResults?.[selectedResultIndex]?.storyboard;
    if (!storyboard || !storyboard[idx]) return;
    
    const script = storyboard[idx].script;
    setIsRegeneratingPrompt(`scene-${idx}`);
    try {
      const newPrompt = await regenerateVisualPrompt(script, language);
      
      if (result && result.config?.affiliateResults) {
        const updatedResults = [...result.config.affiliateResults];
        updatedResults[selectedResultIndex].storyboard[idx].visualPrompt = newPrompt;
        
        const updatedGeneration = {
          ...result,
          config: {
            ...result.config,
            affiliateResults: updatedResults
          }
        };

        setResult(updatedGeneration);
        updateGenerationInHistory(result.id, {
          config: updatedGeneration.config
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
    const storyboard = result?.config?.affiliateResults?.[selectedResultIndex]?.storyboard;
    if (!storyboard || !storyboard[idx]) return;
    
    const visualPrompt = storyboard[idx].visualPrompt;
    setIsRegeneratingScript(`scene-${idx}`);
    try {
      const newScript = await regenerateSceneScript(visualPrompt, language);
      
      if (result && result.config?.affiliateResults) {
        const updatedResults = [...result.config.affiliateResults];
        updatedResults[selectedResultIndex].storyboard[idx].script = newScript;
        
        const updatedGeneration = {
          ...result,
          config: {
            ...result.config,
            affiliateResults: updatedResults
          }
        };

        setResult(updatedGeneration);
        updateGenerationInHistory(result.id, {
          config: updatedGeneration.config
        });
      }
    } catch (error) {
      console.error(error);
      alert("Gagal meregenerasi naskah.");
    } finally {
      setIsRegeneratingScript(null);
    }
  };

  const handleUpdateScript = async () => {
    if (!productImage || !result) return;

    setIsUpdatingScript(true);
    try {
      const scripts = await generateAffiliateScripts(numImages, {
        productImage: { data: productImage.data, mimeType: productImage.mimeType },
        modelInfo: modelFace ? 'Provided face reference' : 'Professional model',
        clothing: clothingType === 'default' ? 'Default' : customClothing,
        pose: posePrompt,
        gender,
        language,
        voiceStyle,
        cta,
        numScenes,
        sceneDuration
      });

      const updatedResults: AffiliateResult[] = (result.config.affiliateResults as AffiliateResult[]).map((res, i) => ({
        ...res,
        storyboard: scripts[i]?.storyboard || res.storyboard,
      }));

      const updatedGeneration = {
        ...result,
        config: {
          ...result.config,
          affiliateResults: updatedResults,
          videoSettings: {
            numScenes,
            sceneDuration,
            language,
            voiceStyle,
            cta,
            transition
          }
        }
      };

      setResult(updatedGeneration);
      updateGenerationInHistory(result.id, {
        config: updatedGeneration.config
      });
      setShowVideoSettings(false);
    } catch (error) {
      console.error(error);
      alert("Gagal memperbarui script.");
    } finally {
      setIsUpdatingScript(false);
    }
  };

  const handleDownload = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `affiliate-kit-${Date.now()}.jpg`;
    link.click();
  };

  const currentResult = result?.config?.affiliateResults?.[selectedResultIndex] as AffiliateResult | undefined;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black italic tracking-tighter bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent uppercase">
          Affiliate Kit
        </h2>
        <p className="text-gray-400 text-sm">
          Buat konten promosi profesional dalam hitungan detik. Cukup unggah produk dan biarkan AI bekerja.
        </p>
      </div>

      {activeStep === 'setup' ? (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Photos Setup */}
          <div className="glass-panel p-6 rounded-3xl border border-gray-800/50 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <ImageUploader 
                  label="Foto Produk"
                  onImageUpload={async (file, url) => {
                    const base64 = await fileToBase64(file);
                    setProductImage({ data: base64, mimeType: file.type, url });
                  }}
                  onImageRemove={() => setProductImage(null)}
                  uploadedImagePreview={productImage?.url}
                />
                <p className="mt-2 text-[10px] text-pink-500 font-bold uppercase tracking-widest text-center">* Wajib</p>
              </div>

              <div>
                <ImageUploader 
                  label="Wajah Model"
                  onImageUpload={async (file, url) => {
                    const base64 = await fileToBase64(file);
                    setModelFace({ data: base64, mimeType: file.type, url });
                  }}
                  onImageRemove={() => setModelFace(null)}
                  uploadedImagePreview={modelFace?.url}
                />
                <p className="mt-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest text-center">(Opsional)</p>
              </div>
            </div>
          </div>

          {/* Image Properties */}
          <div className="glass-panel p-6 rounded-3xl border border-gray-800/50 space-y-6">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Icon name="settings" className="w-4 h-4 text-pink-500" />
              Pengaturan Gambar Utama
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Rasio Foto</label>
                <select 
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as ImageAspectRatio)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-pink-500 outline-none appearance-none cursor-pointer"
                >
                  {IMAGE_ASPECT_RATIOS.map(ratio => (
                    <option key={ratio} value={ratio}>{ratio}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Jumlah</label>
                <select 
                  value={numImages}
                  onChange={(e) => setNumImages(parseInt(e.target.value))}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-purple-500 outline-none appearance-none cursor-pointer"
                >
                  {[1, 2, 3, 4, 6].map(num => (
                    <option key={num} value={num}>{num} Gambar</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-3">Gender Karakter</label>
              <div className="flex gap-4">
                <button 
                  onClick={() => setGender('wanita')}
                  className={`flex-1 py-3 text-xs rounded-xl border transition-all flex items-center justify-center gap-2 ${
                    gender === 'wanita' ? 'bg-gray-800 border-pink-500/50 text-pink-400' : 'bg-gray-900/50 border-gray-800 text-gray-500'
                  }`}
                >
                  <Icon name="dress" className="w-4 h-4" />
                  Wanita
                </button>
                <button 
                  onClick={() => setGender('pria')}
                  className={`flex-1 py-3 text-xs rounded-xl border transition-all flex items-center justify-center gap-2 ${
                    gender === 'pria' ? 'bg-gray-800 border-blue-500/50 text-blue-400' : 'bg-gray-900/50 border-gray-800 text-gray-500'
                  }`}
                >
                  <Icon name="suit" className="w-4 h-4" />
                  Pria
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-3">Pakaian Karakter</label>
              <div className="flex gap-4 mb-3">
                <button 
                  onClick={() => setClothingType('default')}
                  className={`flex-1 py-3 text-xs rounded-xl border transition-all flex items-center justify-center gap-2 ${
                    clothingType === 'default' ? 'bg-gray-800 border-pink-500/50 text-pink-400' : 'bg-gray-900/50 border-gray-800 text-gray-500'
                  }`}
                >
                  <Icon name="tshirt" className="w-4 h-4" />
                  Default
                </button>
                <button 
                  onClick={() => setClothingType('custom')}
                  className={`flex-1 py-3 text-xs rounded-xl border transition-all flex items-center justify-center gap-2 ${
                    clothingType === 'custom' ? 'bg-gray-800 border-purple-500/50 text-purple-400' : 'bg-gray-900/50 border-gray-800 text-gray-500'
                  }`}
                >
                  <Icon name="wand" className="w-4 h-4" />
                  Custom AI
                </button>
              </div>
              {clothingType === 'custom' && (
                <input 
                  type="text"
                  value={customClothing}
                  onChange={(e) => setCustomClothing(e.target.value)}
                  placeholder="Contoh: Dress biru elegan, Hijab modern..."
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-200 focus:border-purple-500 outline-none transition-all"
                />
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Interaksi Pose (Manual Prompt)</label>
              <textarea 
                value={posePrompt}
                onChange={(e) => setPosePrompt(e.target.value)}
                placeholder="Contoh: Model sedang memegang botol skincare sambil tersenyum ke arah kamera..."
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-200 focus:border-pink-500 outline-none transition-all h-24 resize-none"
              />
            </div>
          </div>

            {/* Error Message */}
            {error && (
                <div className={`border p-5 rounded-2xl flex items-start gap-4 transition-all duration-300 animate-slide-up mb-6 ${
                    error.toLowerCase().includes('quota') || error.toLowerCase().includes('exhausted') || error.toLowerCase().includes('limit')
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.1)]' 
                    : 'bg-red-500/10 border-red-500/30 text-red-200'
                }`}>
                    <div className={`p-2 rounded-xl flex-shrink-0 ${
                        error.toLowerCase().includes('quota') || error.toLowerCase().includes('exhausted') || error.toLowerCase().includes('limit')
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                        <Icon name="warning" className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-white text-base">
                            {error.toLowerCase().includes('quota') || error.toLowerCase().includes('exhausted') || error.toLowerCase().includes('limit')
                                ? 'Limit Penggunaan AI Terlampaui' 
                                : 'Terjadi Kesalahan'
                            }
                        </p>
                        <p className="text-xs opacity-90 mt-1 leading-relaxed font-medium">{error}</p>
                        
                        {(error.toLowerCase().includes('quota') || error.toLowerCase().includes('exhausted') || error.toLowerCase().includes('limit')) && (
                            <div className="mt-5 flex flex-wrap gap-2">
                                <button 
                                     onClick={() => window.location.reload()}
                                     className="bg-amber-500 hover:bg-amber-600 text-black text-[10px] font-black py-2 px-4 rounded-lg transition-all shadow-lg active:scale-95 flex items-center gap-1.5"
                                >
                                    <Icon name="refresh" className="w-3.5 h-3.5" />
                                    RETRY
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

          <button
              onClick={handleGenerate}
              disabled={isLoading || !productImage}
              className="w-full py-5 rounded-3xl bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 text-white font-black tracking-[0.2em] uppercase shadow-xl shadow-purple-900/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-3 group relative overflow-hidden"
          >
              {isLoading ? (
                <>
                    <LoadingSpinner size="small" color="white" />
                    <span>Meracik Kit...</span>
                </>
              ) : (
                <>
                    <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    <Icon name="magic" className="w-5 h-5 animate-pulse" />
                    <span>Generate Affiliate Kit</span>
                </>
              )}
          </button>
        </div>
      ) : (
        <div className="space-y-8 animate-slide-up">
           <div className="flex items-center justify-between">
              <button 
                onClick={() => setActiveStep('setup')}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition"
              >
                <Icon name="close" className="w-4 h-4 rotate-90" />
                Kembali ke Pengaturan
              </button>
              <div className="flex items-center gap-2 bg-green-500/10 text-green-400 px-4 py-1.5 rounded-full border border-green-500/20 text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Generate Berhasil
              </div>
           </div>

           {/* Results Grid */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 mb-2">
                  {result?.outputs.map((url, i) => (
                    <button 
                      key={i} 
                      onClick={() => setSelectedResultIndex(i)}
                      className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all ${
                        selectedResultIndex === i ? 'border-pink-500 shadow-lg shadow-pink-500/20' : 'border-gray-800 grayscale hover:grayscale-0'
                      }`}
                    >
                      <img src={url} alt={`Thumb ${i}`} className="w-full h-full object-cover" />
                      {selectedResultIndex === i && (
                        <div className="absolute top-2 right-2 bg-pink-500 text-white rounded-full p-1 ring-2 ring-gray-900">
                          <Icon name="check" className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <div className="group relative rounded-3xl overflow-hidden border border-gray-800 shadow-2xl bg-gray-900 aspect-square md:aspect-auto">
                  <img src={currentResult?.url} alt="Large preview" className="w-full h-auto" />
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent translate-y-2 group-hover:translate-y-0 transition-all opacity-0 group-hover:opacity-100 flex gap-2 justify-center">
                    <button className="p-2 bg-white/10 backdrop-blur-md rounded-xl hover:bg-white/20 transition text-white">
                      <Icon name="maximize" className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDownload(currentResult?.url || '')}
                      className="px-6 py-2 bg-pink-600 rounded-xl hover:bg-pink-500 transition text-white text-sm font-bold flex items-center gap-2"
                    >
                      <Icon name="download" className="w-4 h-4" />
                      Download HD
                    </button>
                  </div>
                </div>

                <button 
                  onClick={() => setShowVideoSettings(!showVideoSettings)}
                  className="w-full py-4 bg-gray-800/50 border border-gray-700/50 rounded-2xl text-[11px] font-bold text-white hover:bg-gray-700 transition flex items-center justify-center gap-2"
                >
                  <Icon name="video" className={`w-4 h-4 text-purple-400 transition-transform ${showVideoSettings ? 'rotate-180' : ''}`} />
                  {showVideoSettings ? 'Sembunyikan Pengaturan Video' : 'Atur Video & Script'}
                </button>

                {showVideoSettings && (
                  <div className="glass-panel p-6 rounded-3xl border border-gray-800/30 space-y-5 animate-slide-up bg-gray-900/30">
                    <div className="grid grid-cols-2 gap-4">
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
                          <span>Generate Storyboard Baru</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Storyboard & AI Info */}
              <div className="space-y-6">
                <div className="glass-panel p-6 rounded-3xl border border-gray-800/50 space-y-6">
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
                           ? 'bg-green-500 text-white' 
                           : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/30 shadow-lg shadow-blue-500/10'
                         }`}
                       >
                         <Icon name={copiedSceneIndex === 'all' ? "check" : "copy"} className="w-3 h-3" />
                         {copiedSceneIndex === 'all' ? 'Copied' : 'Copy All'}
                       </button>
                     </div>
                     <span className="text-[10px] font-bold text-gray-500 bg-gray-800 px-2 py-1 rounded-full uppercase">
                       Variasi #{selectedResultIndex + 1}
                     </span>
                   </div>
                   
                   <div className="bg-gray-900/80 rounded-2xl p-5 border border-gray-800 font-mono text-[11px] leading-relaxed text-blue-300 min-h-[250px] max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800">
                      <div className="space-y-6">
                        {currentResult?.storyboard.map((scene, idx) => (
                           <div key={idx} className="relative pl-4 border-l border-gray-800">
                             <div className="flex items-center justify-between mb-2">
                               <p className="text-pink-500/80 uppercase text-[9px] tracking-widest font-bold">SCENE {idx + 1}</p>
                               <div className="flex items-center gap-2">
                                 <p className="text-gray-600 text-[9px] font-bold">{sceneDuration}S</p>
                                  <div className="flex items-center gap-1">
                                    <button 
                                        onClick={() => handleRegeneratePrompt(idx)}
                                        className="flex items-center gap-1 px-2 py-0.5 rounded transition-all text-[8px] font-bold uppercase tracking-wider bg-purple-600/20 text-purple-400 hover:bg-purple-600 hover:text-white border border-purple-500/30"
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
                            <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-800 hover:border-purple-500/30 transition-all group">
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
                                     <span className="text-[7px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">{LANGUAGES.find(l => l.id === language)?.label}</span>
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
                        Full Prompt Result (Visual)
                      </h4>
                      <div className="p-4 bg-gray-900/50 rounded-xl border border-gray-800 text-[11px] text-gray-400 italic leading-relaxed">
                        {currentResult?.prompt}
                      </div>
                   </div>

                   <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center gap-4">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400">
                        <Icon name="clapperboard" className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-white mb-0.5">Voice Over Ready</p>
                        <p className="text-[10px] text-gray-500">Logat {voiceStyle.toUpperCase()} disinkronkan dengan naskah</p>
                      </div>
                      <button className="px-4 py-2 bg-purple-600 rounded-lg text-white text-[10px] font-bold hover:bg-purple-500 transition flex items-center gap-2">
                        <Icon name="play" className="w-3 h-3" />
                        Preview
                      </button>
                   </div>
                </div>

                <div className="flex gap-4">
                   <button 
                     onClick={handleGenerate}
                     className="flex-1 py-4 bg-gray-800/80 border border-gray-700/50 rounded-2xl text-xs font-bold text-white hover:bg-gray-700 transition flex items-center justify-center gap-2 group"
                   >
                     <Icon name="wand" className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                     Ganti Variasi
                   </button>
                   <button className="flex-1 py-4 bg-gray-800/80 border border-gray-700/50 rounded-2xl text-xs font-bold text-white hover:bg-gray-700 transition flex items-center justify-center gap-2 group">
                     <Icon name="magic" className="w-4 h-4 group-hover:scale-110 transition-transform" />
                     Editor Manual
                   </button>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AffiliateKit;
