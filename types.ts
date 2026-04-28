
export type ImageAspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
export type VideoAspectRatio = "16:9" | "9:16";
export type Resolution = "720p" | "1080p";

export type GenerationStatus = 'completed' | 'processing' | 'failed';
export type GenerationType = 'image' | 'video' | 'editor' | 'affiliate' | 'voiceover';

export interface Generation {
    id: string;
    prompt: string;
    timestamp: number;
    type: GenerationType;
    status: GenerationStatus;
    outputs: string[];
    config: {
        [key: string]: any;
    };
    error?: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: number;
    image?: { data: string; mimeType: string };
}
