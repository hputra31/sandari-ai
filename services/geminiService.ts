
import { GoogleGenAI, Chat, GenerateContentResponse, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { ImageAspectRatio, Resolution, VideoAspectRatio } from "../types";
import { IMAGE_EDIT_MODEL, IMAGE_MODEL, VIDEO_MODEL, CHAT_MODEL, SANDARI_SYSTEM_INSTRUCTION } from "../constants";

const STORAGE_API_KEY = 'sandari_custom_api_key';

export const getApiKey = (): string | undefined => {
  if (typeof window !== 'undefined') {
    const storedKey = localStorage.getItem(STORAGE_API_KEY);
    if (storedKey && storedKey.trim().length > 0) {
      return storedKey;
    }
  }
  return process.env.GEMINI_API_KEY;
};

// Safety settings - Defaulting to BLOCK_ONLY_HIGH to avoid 403 errors on some keys
const SAFETY_SETTINGS = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
];

// Helper to stagger requests with jitter
const delay = (ms: number) => {
    const jitter = Math.random() * 500; // Reduced jitter from 2000ms
    return new Promise(resolve => setTimeout(resolve, ms + jitter));
};

const QUOTA_ERROR_MESSAGE = "Batas penggunaan AI (Quota) sedang penuh. Mohon tunggu beberapa saat lalu coba lagi.";

const withRetry = async <T>(fn: () => Promise<T>, retries = 5, initialDelay = 2000): Promise<T> => {
    let currentDelay = initialDelay;
    for (let i = 0; i < retries + 1; i++) {
        try {
            return await fn();
        } catch (e: any) {
            const errorText = e.message?.toLowerCase() || '';
            const isRateLimit = 
                errorText.includes('429') || 
                errorText.includes('resource_exhausted') || 
                errorText.includes('quota') || 
                errorText.includes('limit') ||
                errorText.includes('exceeded') ||
                errorText.includes('terlampaui') ||
                errorText.includes('exceeded quota') ||
                errorText.includes('failed to call the gemini api');
            
            if (isRateLimit && i < retries) {
                const waitTime = currentDelay + (Math.random() * 2000);
                console.warn(`Quota/Rate limit hit, retrying in ${Math.round(waitTime)}ms... (Attempt ${i + 1}/${retries})`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                currentDelay *= 2.5; // Slightly more aggressive backoff
                continue;
            }
            
            if (isRateLimit) {
                throw new Error(QUOTA_ERROR_MESSAGE);
            }
            throw e;
        }
    }
    throw new Error("Maximum retries reached due to persistent API limits.");
};

export const generateImages = async (
  prompt: string,
  numberOfImages: number,
  aspectRatio: ImageAspectRatio
): Promise<string[]> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key tidak ditemukan.");

  const ai = new GoogleGenAI({ apiKey });
  
  const generateSingleImage = async (index: number) => {
      await delay(index * 1000); // Reduced stagger from 4000ms

      const finalPrompt = numberOfImages > 1 
        ? `${prompt} --variation ${index + 1}` 
        : prompt;

      try {
          return await withRetry(async () => {
              const response = await ai.models.generateContent({
                  model: IMAGE_MODEL,
                  contents: {
                      parts: [{ text: finalPrompt }]
                  },
                  config: {
                      imageConfig: { aspectRatio: aspectRatio },
                      safetySettings: SAFETY_SETTINGS,
                  },
              });

              const candidate = response.candidates?.[0];
              
              if (candidate?.finishReason === 'SAFETY') {
                  return 'SAFETY_BLOCKED';
              }

              const parts = candidate?.content?.parts;
              if (parts && parts.length > 0) {
                  const imagePart = parts.find((p: any) => p.inlineData);
                  if (imagePart && imagePart.inlineData) {
                      return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                  }
              }
              return null;
          });
      } catch (e: any) {
          const errText = e.message?.toLowerCase() || '';
          const isRateLimit = errText.includes('429') || errText.includes('resource_exhausted') || errText.includes('quota') || errText.includes('limit');
          console.warn(`Image generation attempt ${index+1} failed:`, e.message);
          
          if (e.message?.includes('403')) {
             handleApiError(e, `generateSingleImage (variation ${index+1})`);
          }

          if (isRateLimit) return 'RATE_LIMIT';
          return null;
      }
  };

  try {
      const promises = Array.from({ length: numberOfImages }, (_, i) => generateSingleImage(i));
      const results = await Promise.all(promises);
      
      // Check for specific failures
      if (results.every(r => r === 'SAFETY_BLOCKED')) {
          throw new Error("Prompt Anda ditolak oleh filter keamanan AI. Silakan gunakan bahasa yang lebih sopan atau deskripsi yang berbeda.");
      }
      
      if (results.every(r => r === 'RATE_LIMIT')) {
          throw new Error(QUOTA_ERROR_MESSAGE);
      }

      // Filter out nulls and special markers
      const validImages = results.filter((img): img is string => img !== null && img !== 'SAFETY_BLOCKED' && img !== 'RATE_LIMIT');
      
      if (validImages.length === 0) {
          throw new Error("AI gagal membuat gambar. Silakan coba lagi atau ubah prompt Anda.");
      }
      
      return validImages;
  } catch (error) {
      console.error("Image generation failed", error);
      throw error;
  }
};

export const editImage = async (
  prompt: string,
  images: { data: string; mimeType: string }[],
  aspectRatio?: ImageAspectRatio,
  numberOfImages: number = 1
): Promise<string[]> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key tidak ditemukan.");
  
  const ai = new GoogleGenAI({ apiKey });
  
  const generateSingleConcept = async (index: number) => {
      await delay(index * 1000); // Reduced stagger from 4000ms

      const parts: any[] = [];
  
      images.forEach(img => {
        parts.push({
          inlineData: {
            data: img.data,
            mimeType: img.mimeType,
          },
        });
      });

      const specificPrompt = numberOfImages > 1 
        ? `${prompt} (Variation ${index + 1})` 
        : prompt;

      // Prefix with a strong task instruction to prevent the model from just chatting or repeating the prompt
      const taskPrefix = "IMAGE GENERATION TASK: You MUST output an image part, not text. Use the provided images as reference and apply this instruction: ";
      
      // Automatically add identity preservation instruction if multiple images (model reference) are provided
      const identityInstruction = images.length > 1 
        ? ". CRITICAL: You MUST strictly preserve the facial identity and features of the person in the provided reference images. The person in your output MUST be recognizeable as the exact same individual."
        : "";

      parts.push({
        text: taskPrefix + specificPrompt + identityInstruction,
      });

      try {
        return await withRetry(async () => {
          const response = await ai.models.generateContent({
              model: IMAGE_EDIT_MODEL,
              contents: {
                parts: parts,
              },
              config: {
                imageConfig: aspectRatio ? { aspectRatio: aspectRatio } : undefined,
                safetySettings: SAFETY_SETTINGS,
              },
          });

          const candidate = response.candidates?.[0];
          
          if (candidate?.finishReason === 'SAFETY') {
              console.warn(`Edit attempt ${index+1} blocked by safety filters`);
              return ['SAFETY_BLOCKED'];
          }

          const results: string[] = [];
          let refusalText = "";

          const content = candidate?.content;
          if (content && content.parts) {
              for (const part of content.parts) {
                  if (part.inlineData) {
                      results.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
                  } else if (part.text) {
                      refusalText += part.text;
                  }
              }
          }
          
          if (results.length === 0 && refusalText) {
              console.warn(`Model Refusal: ${refusalText}`);
              throw new Error(`AI Menolak: ${refusalText.slice(0, 100)}...`);
          }

          return results;
        });
      } catch (e: any) {
        const errText = e.message?.toLowerCase() || '';
        const isRateLimit = errText.includes('429') || errText.includes('resource_exhausted') || errText.includes('quota') || errText.includes('limit');
        console.warn(`Edit attempt ${index+1} failed:`, e.message);

        if (e.message?.includes('403')) {
            handleApiError(e, `generateSingleConcept (variation ${index+1})`);
        }

        if (isRateLimit) return ['RATE_LIMIT'];
        if (e.message?.startsWith('AI Menolak')) throw e;
        return [];
      }
  };

  try {
      const promises = Array.from({ length: numberOfImages }, (_, i) => generateSingleConcept(i));
      const results = await Promise.all(promises);
      
      // Check for specific failures
      const allResults = results.flat();
      
      if (allResults.every(r => r === 'SAFETY_BLOCKED')) {
          throw new Error("Instruksi edit Anda ditolak oleh filter keamanan AI.");
      }
      
      if (allResults.every(r => r === 'RATE_LIMIT')) {
          throw new Error(QUOTA_ERROR_MESSAGE);
      }

      const flattened = allResults.filter(r => r !== 'SAFETY_BLOCKED' && r !== 'RATE_LIMIT');
      
      if (flattened.length === 0) {
          throw new Error("AI tidak menghasilkan gambar. Kemungkinan prompt ditolak oleh filter keamanan atau tidak valid.");
      }
      return flattened;
  } catch (error: any) {
      console.error("Edit image failed", error);
      // Pass the specific refusal message if available
      if (error.message.startsWith('AI Menolak')) {
         throw error;
      }
      throw error;
  }
};

export const startVideoGeneration = async (
  ai: GoogleGenAI,
  prompt: string,
  resolution: Resolution,
  aspectRatio: VideoAspectRatio,
  startImage?: { data: string; mimeType: string; }
) => {
  try {
    const operation = await ai.models.generateVideos({
        model: VIDEO_MODEL,
        prompt,
        ...(startImage && {
            image: {
                imageBytes: startImage.data,
                mimeType: startImage.mimeType,
            }
        }),
        config: {
          numberOfVideos: 1,
          resolution: resolution,
          aspectRatio: aspectRatio,
        }
      });
      return operation;
  } catch (error: any) {
      return handleApiError(error, "startVideoGeneration");
  }
};

export const generateAffiliateScripts = async (
  numImages: number,
  settings: {
    productImage?: { data: string; mimeType: string };
    modelInfo: string;
    clothing: string;
    pose: string;
    gender: string;
    language: string;
    voiceStyle: string;
    cta: string;
    numScenes: number;
    sceneDuration: number;
  }
): Promise<{ storyboard: { script: string, visualPrompt: string }[], prompt: string }[]> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key tidak ditemukan.");
  
  const ai = new GoogleGenAI({ apiKey });

  const systemPrompt = `You are an expert affiliate marketer. generate ${numImages} different variations of a promotional storyboard and high-quality AI image generation prompt.
  
  Each variation should have a slightly different concept or "hook" (e.g., lifestyle, close-up details, unboxing vibe).

  Settings:
  - Product Reference: Included in the image provided.
  - Model: ${settings.modelInfo}
  - Gender: ${settings.gender}
  - Identity Rule: If a model face reference is provided, ensure all visual descriptions emphasize strictly preserving that person's facial features and identity.
  - Clothing: ${settings.clothing}
  - Pose: ${settings.pose}
  - Language: ${settings.language}
  - Voice Style: ${settings.voiceStyle}
  - Call to Action: ${settings.cta}
  - Video Stats: ${settings.numScenes} scenes, ${settings.sceneDuration}s each.

  Requirement:
  Return a JSON array of exactly ${numImages} objects. Each object MUST contain:
  1. "storyboard": An array of exactly ${settings.numScenes} objects. Each object MUST have:
     - "script": The dialog/script for this scene in ${settings.language}.
     - "visualPrompt": A detailed English description of what should be happening visually in this specific scene (30-50 words). IMPORTANT: DO NOT include any text, subtitles, or overlays in the image/scene. Focus purely on realistic lighting, background, and subject positioning.
  2. "prompt": A master highly detailed English image generation prompt (about 80-100 words) describing the general aesthetic for this variation. Incorporate the core theme of the voice-over into this master prompt without using text.

  Format: Return valid JSON array only.`;

  const parts: any[] = [{ text: systemPrompt }];
  if (settings.productImage && settings.productImage.data) {
    parts.push({
      inlineData: {
        data: settings.productImage.data,
        mimeType: settings.productImage.mimeType,
      }
    });
  }

  try {
    return await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: CHAT_MODEL,
        contents: { parts },
        config: { 
          responseMimeType: "application/json",
          safetySettings: SAFETY_SETTINGS,
        }
      });

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("AI gagal menghasilkan script.");
      
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error("Format output tidak valid.");
      
      return parsed;
    });
  } catch (error: any) {
    if (error.message.includes("403") || error.message.includes("404")) {
      return handleApiError(error, "generateAffiliateScripts");
    }
    
    console.error("Script generation failed", error);
    if (error.message === QUOTA_ERROR_MESSAGE) {
       throw error;
    }
    // Fallback for non-quota errors
    return Array.from({ length: numImages }, (_, idx) => ({
      storyboard: Array.from({ length: settings.numScenes }, (_, i) => ({
        script: `[Scene ${i+1}] Produk ini keren di variasi ${idx+1}!`,
        visualPrompt: `Visual for scene ${i+1} of variation ${idx+1}`
      })),
      prompt: `Professional commercial product photography of the product, lifestyle setting, variation ${idx+1}, sharp focus, 8k.`
    }));
  }
};

export const regenerateVisualPrompt = async (script: string, language: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key tidak ditemukan.");
  
  const ai = new GoogleGenAI({ apiKey });

  const systemPrompt = `You are an expert AI prompt engineer for image generation.
  Given the following video script/dialog (in ${language}), create a new, high-quality, and highly detailed visual prompt in English (30-50 words) for an image generation model.
  
  Script/Dialog: "${script}"
  
  Guidelines:
  - Focus on cinematic lighting, realistic textures, subject positioning, and environment.
  - DO NOT include any text, subtitles, watermarks, or overlays in the visual description.
  - The scene should perfectly reflect the mood and action implied by the dialog.
  
  Return ONLY the text of the visual prompt. No preamble, no quotes.`;

  try {
    return await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: CHAT_MODEL,
        contents: { parts: [{ text: systemPrompt }] },
        config: { 
          safetySettings: SAFETY_SETTINGS,
        }
      });

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("AI gagal melakukan regenerasi prompt.");
      return text.trim();
    });
  } catch (error: any) {
    return handleApiError(error, "regenerateVisualPrompt");
  }
};

export const regenerateSceneScript = async (visualPrompt: string, language: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key tidak ditemukan.");
  
  const ai = new GoogleGenAI({ apiKey });

  const systemPrompt = `You are an expert copywriter for affiliate video content.
  Given the following visual description of a scene, write a compelling, high-converting script/dialog in ${language}.
  The script should be concise, engaging, and fit naturally with the visual being described.
  
  Visual Description: "${visualPrompt}"
  
  Guidelines:
  - Keep it short (maximum 2-3 sentences).
  - Use a natural, expressive tone (e.g., conversational, persuasive, or gaul depending on the goal).
  - Focus on the hook or the direct benefit mentioned in the visual.
  
  Return ONLY the text of the script. No preamble, no quotes.`;

  try {
    return await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: CHAT_MODEL,
        contents: { parts: [{ text: systemPrompt }] },
        config: { 
          safetySettings: SAFETY_SETTINGS,
        }
      });

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("AI gagal melakukan regenerasi naskah.");
      return text.trim();
    });
  } catch (error: any) {
    return handleApiError(error, "regenerateSceneScript");
  }
};

export const generateVoiceOverScript = async (
  topic: string,
  tone: string,
  language: string,
  duration: number
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key tidak ditemukan.");
  
  const ai = new GoogleGenAI({ apiKey });

  const systemPrompt = `You are a professional voice-over script writer.
  Write a high-quality voice-over script in ${language} about "${topic}".
  The tone should be ${tone}.
  The target duration is approximately ${duration} seconds.
  
  Guidelines:
  - Write ONLY the spoken text.
  - No scene markers, no stage directions, no [bracketed] text.
  - Ensure the pacing is natural for the target duration.
  - Make it engaging and professional.
  
  Return ONLY the text of the script. No preamble, no quotes.`;

  try {
    return await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: CHAT_MODEL,
        contents: { parts: [{ text: systemPrompt }] },
        config: { 
          safetySettings: SAFETY_SETTINGS,
        }
      });

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("AI gagal menghasilkan script Voice Over.");
      return text.trim();
    });
  } catch (error: any) {
    return handleApiError(error, "generateVoiceOverScript");
  }
};

// Chat Functionality
export const createChatSession = (history?: {role: string, text: string, image?: {data: string, mimeType: string}}[]) => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key not found");
    
    const ai = new GoogleGenAI({ apiKey });
    
    let formattedHistory: any[] | undefined = undefined;
    if (history && history.length > 0) {
        formattedHistory = history.map(h => {
            const parts: any[] = [];
            if (h.image) {
                parts.push({ inlineData: { data: h.image.data, mimeType: h.image.mimeType } });
            }
            parts.push({ text: h.text });
            return { role: h.role, parts };
        });
    }

    return ai.chats.create({
        model: CHAT_MODEL,
        history: formattedHistory,
        config: {
            systemInstruction: SANDARI_SYSTEM_INSTRUCTION,
        },
    });
};

const handleApiError = (error: any, context: string) => {
    const errorText = error.message?.toLowerCase() || '';
    console.error(`Gemini Service Error (${context}):`, error);

    if (errorText.includes("403") || errorText.includes("permission_denied") || errorText.includes("permission")) {
        throw new Error(`Akses Ditolak (403): API Key tidak memiliki izin untuk model ini. (Context: ${context})\n\nSolusi:\n1. Pastikan Billing Firebase/Google Cloud aktif.\n2. Pastikan model ini diizinkan di Google AI Studio (misal: Nano Banana/Veo).\n3. Coba Hapus API Key di Settings jika Anda pernah mengaturnya secara manual.`);
    }

    if (errorText.includes("404")) {
        throw new Error(`Model Tidak Ditemukan (404): Model '${CHAT_MODEL}' mungkin tidak tersedia di wilayah Anda atau sudah tidak didukung.`);
    }

    throw error;
};

export const sendMessage = async (chat: Chat, message: string, image?: { data: string, mimeType: string }): Promise<string> => {
    return await withRetry(async () => {
        try {
            const parts: any[] = [];
            if (image) {
                parts.push({ inlineData: { data: image.data, mimeType: image.mimeType } });
            }
            parts.push({ text: message });

            const result: GenerateContentResponse = await chat.sendMessage({ message: parts });
            return result.text || "Maaf, saya tidak dapat menghasilkan respons saat ini.";
        } catch (error: any) {
            return handleApiError(error, "sendMessage");
        }
    });
};
