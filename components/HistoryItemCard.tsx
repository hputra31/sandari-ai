import React, { useState } from 'react';
import { Generation } from '../types';
import Icon from './Icons';
import LoadingSpinner from './LoadingSpinner';
import { regenerateVisualPrompt, regenerateSceneScript } from '../services/geminiService';

interface HistoryItemCardProps {
  item: Generation;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Generation>) => void;
  onSendToVideo?: (data: { image?: string, prompt?: string }) => void;
}

const HistoryItemCard: React.FC<HistoryItemCardProps> = ({ item, onDelete, onUpdate, onSendToVideo }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isRegeneratingPrompt, setIsRegeneratingPrompt] = useState<string | null>(null);
  const [isRegeneratingScript, setIsRegeneratingScript] = useState<string | null>(null);
  const [copiedSceneIndex, setCopiedSceneIndex] = useState<string | null>(null);
  const [copiedPromptIndex, setCopiedPromptIndex] = useState<string | null>(null);
  const [copiedVOIndex, setCopiedVOIndex] = useState<string | null>(null);

  const date = new Date(item.timestamp).toLocaleDateString('id-ID', {
    month: 'short',
    day: 'numeric',
  });

  const handleCopyPrompt = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent triggering any parent click events
    
    navigator.clipboard.writeText(item.prompt)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(err => console.error('Gagal menyalin text:', err));
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!item.outputs || item.outputs.length === 0) return;

    setIsDownloading(true);
    
    // Process all outputs
    item.outputs.forEach((url, index) => {
      const link = document.createElement('a');
      link.href = url;
      const extension = item.type === 'video' ? 'mp4' : 'jpg';
      const suffix = item.outputs.length > 1 ? `-${index + 1}` : '';
      link.download = `sandari-${item.type}-${item.id.slice(0, 8)}${suffix}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });

    setTimeout(() => setIsDownloading(false), 2000);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowConfirmDelete(true);
  };

  const confirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onDelete(item.id);
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowConfirmDelete(false);
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

  const handleRegeneratePrompt = async (resIdx: number, sceneIdx: number, script: string) => {
    setIsRegeneratingPrompt(`scene-${resIdx}-${sceneIdx}`);
    try {
      const newPrompt = await regenerateVisualPrompt(script, 'id');
      
      const config = { ...item.config };
      if (config.affiliateResults) {
        config.affiliateResults = [...config.affiliateResults];
        config.affiliateResults[resIdx].storyboard[sceneIdx].visualPrompt = newPrompt;
      } else if (config.storyboards) {
        config.storyboards = [...config.storyboards];
        config.storyboards[resIdx].storyboard[sceneIdx].visualPrompt = newPrompt;
      }

      onUpdate(item.id, { config });
    } catch (error) {
      console.error(error);
      alert("Gagal meregenerasi prompt.");
    } finally {
      setIsRegeneratingPrompt(null);
    }
  };

  const handleRegenerateScript = async (resIdx: number, sceneIdx: number, visualPrompt: string) => {
    setIsRegeneratingScript(`scene-${resIdx}-${sceneIdx}`);
    try {
      const newScript = await regenerateSceneScript(visualPrompt, 'id');
      
      const config = { ...item.config };
      if (config.affiliateResults) {
        config.affiliateResults = [...config.affiliateResults];
        config.affiliateResults[resIdx].storyboard[sceneIdx].script = newScript;
      } else if (config.storyboards) {
        config.storyboards = [...config.storyboards];
        config.storyboards[resIdx].storyboard[sceneIdx].script = newScript;
      }

      onUpdate(item.id, { config });
    } catch (error) {
      console.error(error);
      alert("Gagal meregenerasi naskah.");
    } finally {
      setIsRegeneratingScript(null);
    }
  };

  const StatusBadge: React.FC<{ status: Generation['status'] }> = ({ status }) => {
    const baseClasses = 'absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full z-10 backdrop-blur-sm shadow-sm uppercase tracking-wider';
    if (status === 'completed') {
      return <span className={`${baseClasses} bg-pink-500/90 text-white`}>Selesai</span>;
    }
    if (status === 'failed') {
      return <span className={`${baseClasses} bg-red-500/90 text-white`}>Gagal</span>;
    }
    return null;
  };

  const renderThumbnail = () => {
    if (!item.outputs || item.outputs.length === 0) {
      return (
        <div className="w-full aspect-square bg-gray-800 flex items-center justify-center text-gray-600">
          <Icon name="warning" className="w-8 h-8" />
        </div>
      );
    }
    if (item.type === 'image' || item.type === 'affiliate') {
      return <img src={item.outputs[0]} alt={item.prompt} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />;
    }
    if (item.type === 'video') {
      return <video src={item.outputs[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" muted loop playsInline onMouseOver={e => e.currentTarget.play()} onMouseOut={e => e.currentTarget.pause()} />;
    }
    if (item.type === 'voiceover') {
      return (
        <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center transition-transform duration-700 group-hover:scale-110">
          <Icon name="audio" className="w-16 h-16 text-white/20 animate-pulse" />
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`relative rounded-xl overflow-hidden shadow-lg bg-gray-900 group cursor-pointer ring-1 transition-all duration-300 ${showConfirmDelete ? 'ring-red-500' : 'ring-gray-800 hover:ring-pink-500/50'}`}>
      
      {/* Thumbnail Area */}
      <div className="aspect-square overflow-hidden bg-gray-900">
        {renderThumbnail()}
      </div>
      
      {!showConfirmDelete && <StatusBadge status={item.status} />}
      
      {!showConfirmDelete && item.type === 'image' && item.outputs.length > 1 && (
        <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-sm z-10 border border-white/10">
          +{item.outputs.length}
        </span>
      )}

      {/* DELETE CONFIRMATION OVERLAY */}
      {showConfirmDelete && (
        <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-4 animate-fade-in text-center">
            <div className="mb-3 bg-red-500/20 p-2 rounded-full text-red-400">
                <Icon name="trash" className="w-5 h-5" />
            </div>
            <p className="text-white font-bold text-sm mb-1">Hapus Item?</p>
            <p className="text-gray-400 text-[10px] mb-4">Tidak bisa dibatalkan.</p>
            <div className="flex gap-2 w-full">
                <button 
                    onClick={cancelDelete}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-bold py-2 rounded-lg transition"
                >
                    Batal
                </button>
                <button 
                    onClick={confirmDelete}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2 rounded-lg transition shadow-lg shadow-red-900/50"
                >
                    Hapus
                </button>
            </div>
        </div>
      )}

      {/* Standard Info & Actions Overlay (Hidden when confirming delete) */}
      {!showConfirmDelete && (
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 z-20">
            <p className="text-xs font-medium text-gray-200 line-clamp-3 leading-snug mb-3">{item.prompt}</p>
            
            <div className="flex justify-between items-center border-t border-gray-700 pt-2 mt-1">
                <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500">{date}</span>
                    <span className="text-[10px] text-pink-400 uppercase tracking-wider font-bold">{item.type}</span>
                </div>
                
                <div className="flex gap-1.5">
                    {/* Copy Prompt Button */}
                    <button
                        onClick={handleCopyPrompt}
                        className={`text-xs flex items-center justify-center w-7 h-7 rounded-md border transition-all shadow-lg ${
                            isCopied 
                            ? 'bg-pink-600 text-white border-pink-500' 
                            : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-600'
                        }`}
                        title="Salin Prompt"
                    >
                        {isCopied ? <Icon name="check" className="w-3 h-3" /> : <Icon name="copy" className="w-3 h-3" />}
                    </button>

                    {/* Download Button */}
                    <button
                        onClick={handleDownload}
                        className={`text-xs flex items-center justify-center w-7 h-7 rounded-md border transition-all shadow-lg ${
                            isDownloading 
                            ? 'bg-purple-600 text-white border-purple-500' 
                            : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-600'
                        }`}
                        title="Download Hasil"
                    >
                        {isDownloading ? <Icon name="check" className="w-3 h-3" /> : <Icon name="download" className="w-3 h-3" />}
                    </button>

                    {/* Delete Trigger Button */}
                    <button
                        onClick={handleDeleteClick}
                        className="text-xs flex items-center justify-center w-7 h-7 rounded-md border border-red-500/30 bg-red-500/10 hover:bg-red-500/30 text-red-400 transition-all shadow-lg"
                        title="Hapus Item"
                    >
                        <Icon name="trash" className="w-3 h-3" />
                    </button>
                    
                    {/* Details Button */}
                    {(item.config?.affiliateResults || item.config?.storyboards || item.type === 'voiceover') && (
                        <button
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); setShowDetails(true); }}
                            className="text-xs flex items-center justify-center w-7 h-7 rounded-md border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/30 text-blue-400 transition-all shadow-lg"
                            title="Lihat Detail"
                        >
                            <Icon name="eye" className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* DETAILS MODAL */}
      {showDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setShowDetails(false)}>
            <div className="bg-gray-950 border border-gray-800 w-full max-w-2xl max-h-[85vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                    <div>
                        <h3 className="text-xl font-black italic tracking-tighter text-white uppercase">Storyboard Detail</h3>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest font-bold">Salin prompt per scene untuk kebutuhan video</p>
                    </div>
                    <button onClick={() => setShowDetails(false)} className="p-2 hover:bg-gray-800 rounded-full transition text-gray-400 hover:text-white">
                        <Icon name="close" className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-gray-800">
                    {/* We might have multiple storyboard sets (for each generated image) */}
                    {(item.config?.affiliateResults || item.config?.storyboards || []).map((res: any, resIdx: number) => (
                        <div key={resIdx} className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-px flex-1 bg-gray-800"></div>
                                <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest">Variasi #{resIdx + 1}</span>
                                <div className="h-px flex-1 bg-gray-800"></div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {(res.storyboard || []).map((scene: any, idx: number) => (
                                    <div key={idx} className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5 hover:border-pink-500/30 transition-all">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-gray-800 px-3 py-1 rounded-full">Scene {idx + 1}</span>
                                            <div className="flex gap-1.5">
                                                <button 
                                                    onClick={() => handleRegeneratePrompt(resIdx, idx, scene.script)}
                                                    className="px-3 py-1 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center gap-1.5 border bg-purple-600/20 border-purple-500/30 text-purple-400 hover:bg-purple-600 hover:text-white"
                                                    title="Regenerate Visual Prompt dari Dialog"
                                                    disabled={isRegeneratingPrompt === `scene-${resIdx}-${idx}`}
                                                >
                                                    {isRegeneratingPrompt === `scene-${resIdx}-${idx}` ? (
                                                        <LoadingSpinner size="small" color="purple" />
                                                    ) : (
                                                        <Icon name="wand" className="w-3 h-3" />
                                                    )}
                                                    {isRegeneratingPrompt === `scene-${resIdx}-${idx}` ? 'Wait' : 'Rethink'}
                                                </button>
                                                <button 
                                                    onClick={() => handleCopyPromptOnly(scene.visualPrompt, `${resIdx}-${idx}`)}
                                                    className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center gap-1.5 border ${
                                                        copiedPromptIndex === `scene-${resIdx}-${idx}`
                                                        ? 'bg-pink-600 border-pink-500 text-white'
                                                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                                                    }`}
                                                >
                                                    <Icon name={copiedPromptIndex === `scene-${resIdx}-${idx}` ? "check" : "copy"} className="w-3 h-3" />
                                                    {copiedPromptIndex === `scene-${resIdx}-${idx}` ? 'Disalin' : 'Prompt'}
                                                </button>
                                                <button 
                                                    onClick={() => handleCopyVOOnly(scene.script, `${resIdx}-${idx}`)}
                                                    className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center gap-1.5 border ${
                                                        copiedVOIndex === `scene-${resIdx}-${idx}`
                                                        ? 'bg-blue-600 border-blue-500 text-white'
                                                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                                                    }`}
                                                    title="Salin Dialog"
                                                >
                                                    <Icon name={copiedVOIndex === `scene-${resIdx}-${idx}` ? "check" : "play"} className="w-3 h-3" />
                                                    {copiedVOIndex === `scene-${resIdx}-${idx}` ? 'Disalin' : 'Dialog'}
                                                </button>
                                                <button 
                                                    onClick={() => handleRegenerateScript(resIdx, idx, scene.visualPrompt)}
                                                    className="px-3 py-1 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center gap-1.5 border bg-blue-600/20 border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white"
                                                    title="Regenerate Dialog dari Visual"
                                                    disabled={isRegeneratingScript === `scene-${resIdx}-${idx}`}
                                                >
                                                    {isRegeneratingScript === `scene-${resIdx}-${idx}` ? (
                                                        <LoadingSpinner size="small" color="blue" />
                                                    ) : (
                                                        <Icon name="wand" className="w-3 h-3" />
                                                    )}
                                                    {isRegeneratingScript === `scene-${resIdx}-${idx}` ? 'Wait' : 'Rethink'}
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        if (onSendToVideo) onSendToVideo({ prompt: scene.visualPrompt });
                                                    }}
                                                    className="px-3 py-1 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center gap-1.5 border bg-indigo-600/20 border-indigo-500/30 text-indigo-400 hover:bg-indigo-600 hover:text-white"
                                                    title="Gunakan untuk Video"
                                                >
                                                    <Icon name="video" className="w-3 h-3" />
                                                    Anim
                                                </button>
                                                <button 
                                                    onClick={() => handleCopyScene(scene, `${resIdx}-${idx}`)}
                                                    className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center gap-1.5 border ${
                                                        copiedSceneIndex === `scene-${resIdx}-${idx}`
                                                        ? 'bg-green-600 border-green-500 text-white'
                                                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                                                    }`}
                                                    title="Salin Full Prompt (Dialog + Visual)"
                                                >
                                                    <Icon name={copiedSceneIndex === `scene-${resIdx}-${idx}` ? "check" : "copy"} className="w-3 h-3" />
                                                    {copiedSceneIndex === `scene-${resIdx}-${idx}` ? 'Disalin' : 'Full'}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">Visual Instruction</p>
                                                <p className="text-sm text-gray-200 leading-relaxed italic">"{scene.visualPrompt}"</p>
                                            </div>
                                            <div className="pt-3 border-t border-gray-800 flex gap-3">
                                                <div className="w-6 h-6 bg-pink-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <Icon name="play" className="w-3 h-3 text-pink-500" />
                                                </div>
                                                <div>
                                                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">Naskah / Dialog</p>
                                                    <p className="text-sm text-gray-400 leading-relaxed underline decoration-pink-500/20 underline-offset-4">{scene.script}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    
                    {item.type === 'voiceover' && (
                        <div className="bg-gray-900/50 border border-gray-800 rounded-3xl p-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Icon name="audio" className="w-5 h-5 text-pink-400" />
                                    Script Voice Over
                                </h4>
                                <button 
                                    onClick={() => navigator.clipboard.writeText(item.config?.script || '')}
                                    className="text-xs text-pink-400 font-bold hover:text-pink-300 transition flex items-center gap-1"
                                >
                                    <Icon name="copy" className="w-3 h-3" />
                                    Salin Script
                                </button>
                            </div>
                            <div className="p-6 bg-gray-950 rounded-2xl border border-gray-800 text-gray-300 leading-relaxed italic font-serif text-lg">
                                "{item.config?.script}"
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Nada Suara</p>
                                    <p className="text-xs text-white font-bold">{item.config?.tone?.toUpperCase()}</p>
                                </div>
                                <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Target Durasi</p>
                                    <p className="text-xs text-white font-bold">{item.config?.duration} DETIK</p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {(!item.config?.affiliateResults && !item.config?.storyboards && item.type !== 'voiceover') && (
                        <div className="py-20 text-center">
                            <Icon name="warning" className="w-12 h-12 text-gray-800 mx-auto mb-4" />
                            <p className="text-gray-500">Tidak ada data storyboard untuk item ini.</p>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-gray-800 bg-gray-900/50 flex justify-end">
                    <button 
                        onClick={() => setShowDetails(false)}
                        className="px-8 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-xl transition"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default HistoryItemCard;