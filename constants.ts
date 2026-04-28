
import { ImageAspectRatio, VideoAspectRatio, Resolution } from './types';

export const IMAGE_MODEL = 'gemini-2.5-flash-image';
export const IMAGE_EDIT_MODEL = 'gemini-2.5-flash-image';
export const VIDEO_MODEL = 'veo-3.1-lite-generate-preview';
export const CHAT_MODEL = 'gemini-2.0-flash';

export const IMAGE_ASPECT_RATIOS: ImageAspectRatio[] = ["1:1", "16:9", "9:16", "4:3", "3:4"];
export const VIDEO_ASPECT_RATIOS: VideoAspectRatio[] = ["16:9", "9:16"];
export const RESOLUTIONS: Resolution[] = ["720p", "1080p"];
export const NUM_IMAGES_OPTIONS = [1, 2, 3, 4, 6];

export const VIDEO_LOADING_MESSAGES = [
    "Memanggil musa digital...",
    "Mengajarkan piksel untuk menari...",
    "Menyusun simfoni visual Anda...",
    "Ini bisa memakan waktu beberapa menit, mohon bersabar.",
    "Merender karya Anda, bingkai demi bingkai...",
    "AI sedang bekerja dengan keajaibannya...",
    "Hampir selesai, memoles hasil akhir..."
];

export const SANDARI_SYSTEM_INSTRUCTION = `You are SANDARI AI, a friendly, creative, and expert AI Prompt Engineer for a generative AI platform named HPUTRAX.
Your goal is to help users create the perfect prompts for Image Generation, Video Generation, and Photo Editing.

Rules:
1. Always be helpful, friendly, and enthusiastic.
2. If the user speaks Indonesian, reply in Indonesian but PROVIDE THE FINAL PROMPT IN ENGLISH (as AI models understand English better).
3. When asked for a prompt, provide a detailed, descriptive prompt including subject, lighting, style, camera angle, and mood.
4. If asked for JSON, format it strictly as JSON.
5. Keep your responses concise but high quality.

Example Interaction:
User: "Buatkan prompt untuk gambar kucing lucu di luar angkasa."
Sandari: "Tentu! Berikut adalah prompt untuk kucing astronaut yang menggemaskan:
**Prompt:** 'A cute fluffy cat wearing a futuristic high-tech astronaut suit, floating in deep space with colorful nebula background, digital art style, vibrant colors, 8k resolution, cinematic lighting.'
"`;

export const IMAGE_TEMPLATES = [
    {
        name: "Konsep Logo",
        icon: "logo",
        prompt: "Logo vektor minimalis untuk startup teknologi bernama 'Quantum Leap', garis bersih, modern, profesional, latar belakang putih, gaya SVG"
    },
    {
        name: "Foto Produk",
        icon: "clock",
        prompt: "Fotografi produk sinematik jam tangan mewah di permukaan marmer gelap, pencahayaan studio dengan bayangan lembut, 8k, hiperrealistik, detail makro"
    },
    {
        name: "Avatar AI",
        icon: "user",
        prompt: "Lukisan digital prajurit cyberpunk futuristik, wanita, latar belakang gang dengan lampu neon, wajah detail, warna cerah, gaya Artgerm dan Greg Rutkowski"
    },
    {
        name: "Kuliner",
        icon: "food",
        prompt: "Fotografi makanan profesional burger gourmet dengan keju meleleh, uap mengepul, pencahayaan dramatis, latar belakang restoran bokeh, sangat detail, 8k"
    },
    {
        name: "Pemandangan",
        icon: "mountain",
        prompt: "Pemandangan sinematik yang menakjubkan dari pegunungan tenang saat matahari terbit, lembah berkabut, langit cerah, skala epik, pencahayaan indah, wallpaper 4k"
    },
    {
        name: "Aset Game",
        icon: "diamond",
        prompt: "Aset game isometrik 3D, peti harta karun kuno yang bersinar dengan permata, gaya seni game seluler, latar belakang transparan, render blender"
    },
    {
        name: "Seni Abstrak",
        icon: "palette",
        prompt: "Karya seni abstrak dinamis dengan garis-garis mengalir dan gradasi warna cerah, terinspirasi oleh logam cair dan nebula, lukisan digital"
    },
    {
        name: "Desain Kaos",
        icon: "tshirt",
        prompt: "Desain grafis t-shirt gaya retro 80-an, matahari terbenam synthwave, pohon palem siluet, warna neon pink dan biru, gaya vintage terdistorsi"
    },
    {
        name: "Interior",
        icon: "sofa",
        prompt: "Rendering fotorealistik interior rumah minimalis modern, jendela besar, cahaya alami, elemen desain Skandinavia, suasana nyaman"
    },
    {
        name: "Fashion",
        icon: "dress",
        prompt: "Foto editorial mode tinggi, model wanita mengenakan pakaian avant-garde di jalanan Tokyo malam hari, lampu neon, pose dinamis, fotografi fashion vogue"
    },
    {
        name: "Sci-Fi City",
        icon: "city",
        prompt: "Kota futuristik di malam hari, lampu neon memantul di jalanan basah, kendaraan terbang, gedung pencakar langit menjulang, estetika cyberpunk distopia"
    },
    {
        name: "Stiker Lucu",
        icon: "cat",
        prompt: "Desain stiker die-cut karakter kucing gemuk memakai kacamata hitam, gaya kartun datar vektor, garis luar putih tebal, ekspresi lucu"
    },
    {
        name: "Vintage",
        icon: "film",
        prompt: "Potret hitam putih musisi jazz tua, latar belakang klub berasap, fokus lembut, gaya film noir tahun 1940-an, tekstur kasar"
    },
    {
        name: "Poster Film",
        icon: "clapperboard",
        prompt: "Poster film fantasi epik, pahlawan berdiri di tebing menghadap naga raksasa, judul teks emas metalik di bawah, pencahayaan oranye dan teal dramatis"
    },
    {
        name: "Buku Mewarnai",
        icon: "pencil",
        prompt: "Halaman buku mewarnai dewasa, pola mandala bunga yang rumit, garis hitam putih bersih, tanpa isian warna, gaya zentangle"
    },
    {
        name: "Desain UI",
        icon: "mobile",
        prompt: "Desain antarmuka pengguna aplikasi seluler futuristik untuk dashboard kesehatan, mode gelap, elemen kaca buram, grafik data neon, bersih dan minimalis"
    }
];

export const VIDEO_TEMPLATES = [
    {
        name: "Klip Penjelas",
        icon: "chart",
        prompt: "Video animasi pendek penjelas tentang energi terbarukan, ikon sederhana, transisi bersih, musik latar korporat yang ceria, 15 detik"
    },
    {
        name: "Drone Pantai",
        icon: "beach",
        prompt: "Pemandangan drone udara sinematik terbang di atas pantai tropis dengan air biru jernih dan pasir putih, ombak lembut pecah, sinar matahari cerah, 4k"
    },
    {
        name: "Teaser Game",
        icon: "gamepad",
        prompt: "Trailer teaser sinematik epik untuk video game baru, pencahayaan dramatis, potongan cepat, urutan aksi intens, pengungkapan judul di akhir"
    },
    {
        name: "Intro YouTube",
        icon: "play",
        prompt: "Intro saluran YouTube yang energik, tipografi kinetik yang berani muncul dengan cepat, latar belakang abstrak warna-warni yang bergerak, musik beat drop"
    },
    {
        name: "Iklan Sepatu",
        icon: "shoe",
        prompt: "Iklan media sosial yang cerah dan menarik untuk rilis sepatu kets baru, gerakan dinamis, latar perkotaan, musik energik"
    },
    {
        name: "Cyberpunk Loop",
        icon: "night",
        prompt: "Video loop jalanan kota cyberpunk futuristik, hujan turun, lampu neon berkedip, hologram iklan berputar, suasana murung dan gelap"
    },
    {
        name: "Alam Tenang",
        icon: "leaf",
        prompt: "Video loop yang indah dan mulus dari aliran sungai hutan yang tenang, suara air lembut, cahaya pagi yang lembut, hiperrealistik, 4k"
    },
    {
        name: "Masak Cepat",
        icon: "pan",
        prompt: "Video close-up persiapan makanan cepat saji, memotong sayuran segar, menumis dengan api besar, uap mengepul, warna cerah dan menggugah selera"
    },
    {
        name: "Gadget 3D",
        icon: "mobile",
        prompt: "Animasi 3D ramping yang menampilkan smartphone baru, berputar perlahan, menonjolkan fitur desain, latar belakang putih bersih, elemen UI futuristik"
    },
    {
        name: "Horor",
        icon: "ghost",
        prompt: "Pemandangan lorong rumah sakit tua yang ditinggalkan, lampu berkedip-kedip seram, bayangan bergerak di ujung lorong, suasana menakutkan, gaya found footage"
    },
    {
        name: "Time-lapse Kota",
        icon: "building",
        prompt: "Video hyperlapse cakrawala kota yang sibuk saat matahari terbenam, awan bergerak cepat, lampu lalu lintas kabur, warna cerah, dari sudut pandang atap"
    },
    {
        name: "Fantasy RPG",
        icon: "sword",
        prompt: "Adegan gameplay RPG fantasi, karakter ksatria bertarung melawan monster di hutan ajaib, efek partikel sihir, gerakan kamera dinamis"
    }
];

export const IMAGE_STYLES = [
    "Fotografis", "Sinematik", "Anime", "Seni Fantasi", "Vektor", "Pixel Art", "Cat Air", "Minimalis",
    "Surealisme", "Impresionis", "Gothic", "Art Deco", "Kartun", "Cyberpunk", "Steampunk", "Low Poly", "3D Render", "Line Art"
];

export const IMAGE_LIGHTING = [
    "Cahaya Lembut", "Pencahayaan Studio", "Neon", "Pencahayaan Dramatis", "Golden Hour", "Blue Hour", "Cahaya Belakang",
    "Pencahayaan Volumetrik", "God Rays", "Cahaya Rim", "Lampu Sorot", "Siluet Dramatis", "Bioluminescence"
];

// NEW: Generation Modes for Utility
export const GENERATION_MODES = [
    {
        id: 'auto_concept',
        label: 'Auto Konsep Foto',
        icon: 'sparkles',
        prompt: 'AUTO_CONCEPT', // Special marker for creative variation
        aspectRatio: '1:1' as ImageAspectRatio
    },
    {
        id: 'passport_formal',
        label: 'Pas Foto Formal',
        icon: 'passport',
        prompt: 'Professional passport photo portrait, front facing, neutral expression, wearing formal business suit, solid plain background, studio lighting, high resolution, sharp focus, 4k',
        aspectRatio: '3:4' as ImageAspectRatio
    },
    {
        id: 'logo_design',
        label: 'Desain Logo',
        icon: 'target',
        prompt: 'Modern minimalist vector logo design, clean lines, geometric shapes, flat design, white background, professional corporate identity, high quality svg style',
        aspectRatio: '1:1' as ImageAspectRatio
    },
    {
        id: 'sticker_3d',
        label: 'Stiker 3D',
        icon: 'unicorn',
        prompt: 'Cute 3D character sticker, die-cut style with thick white outline, glossy finish, vibrant colors, clay render style, simple background',
        aspectRatio: '1:1' as ImageAspectRatio
    },
    {
        id: 'tshirt_mockup',
        label: 'Mockup Kaos',
        icon: 'tshirt',
        prompt: 'High quality t-shirt mockup, plain t-shirt on a hanger, neutral background, soft lighting, fabric texture details, photorealistic',
        aspectRatio: '3:4' as ImageAspectRatio
    },
    {
        id: 'ui_app',
        label: 'UI Aplikasi',
        icon: 'mobile',
        prompt: 'Modern mobile app user interface design, dark mode, glassmorphism elements, clean layout, trendy colors, ui/ux design, dribbble style',
        aspectRatio: '9:16' as ImageAspectRatio
    },
    {
        id: 'poster_ads',
        label: 'Poster Iklan',
        icon: 'megaphone',
        prompt: 'Professional advertising poster design, catchy headline placement, dynamic composition, commercial photography quality, vibrant and persuasive',
        aspectRatio: '3:4' as ImageAspectRatio
    }
];

export const EDITOR_TOOLS = [
    {
        id: 'swap_face_multi',
        icon: 'users_switch',
        label: 'Multiple Swap Face',
        prompt: 'Perform a high quality face swap. Replace the faces of people in the first image with the facial features of the person in the second (reference) image. Maintain the original skin tone match, lighting, and expressions of the target body. Photorealistic, seamless blending.'
    },
    {
        id: 'pas_foto_biru',
        icon: 'blue_bg',
        label: 'Background Biru',
        prompt: 'Change the background to a solid professional blue color (kode warna #0090FF) typical for Indonesian ID cards, keep the person sharp and well lit, clean edges.'
    },
    {
        id: 'pas_foto_merah',
        icon: 'red_bg',
        label: 'Background Merah',
        prompt: 'Change the background to a solid professional red color (kode warna #DB1514) typical for Indonesian ID cards, keep the person sharp and well lit, clean edges.'
    },
    {
        id: 'renovasi',
        icon: 'sofa',
        label: 'Renovasi Ruangan',
        prompt: 'Redesign this room to look modern minimalist, clean, bright natural lighting, wood accents, white walls, decluttered, interior design visualization.'
    },
    {
        id: 'ganti_jas',
        icon: 'suit',
        label: 'Pakai Jas Formal',
        prompt: 'Change the person\'s outfit to a professional black formal business suit and tie, realistic fabric texture, fitting correctly, professional look.'
    },
    {
        id: 'restorasi',
        icon: 'clock',
        label: 'Restorasi Foto',
        prompt: 'Restore this old photo, remove scratches and noise, sharpen details, colorize natural skin tones, improve clarity to HD quality.'
    },
    {
        id: 'anime',
        icon: 'flower',
        label: 'Jadi Anime',
        prompt: 'Ubah gambar ini menjadi gaya anime Jepang berkualitas tinggi, warna cerah, detail tajam, pertahankan komposisi asli.'
    },
    {
        id: 'cartoon',
        icon: 'bear',
        label: 'Kartun 3D',
        prompt: 'Ubah menjadi gaya animasi karakter 3D ala Pixar atau Disney, lucu, pencahayaan lembut, tekstur halus.'
    },
    {
        id: 'chibi_hijab',
        icon: 'heart',
        label: 'Expressive Chibi',
        prompt: 'Convert the person in the photo into a highly expressive 3D chibi-style digital illustration. The character should wear a stylish hijab matching the original. Character features: large expressive eyes, puffed out red cheeks with a cute pouty pouting expression. High-quality 3D render style akin to Pixar or Disney, soft cinematic lighting. Include decorative elements floating around like pink hearts and glowing gold stars. Solid black background. The result should be extremely cute, kawaii, and stylized but still recognizable as the person.'
    },
    {
        id: 'hd',
        icon: 'sparkles',
        label: 'Perjelas / HD',
        prompt: 'Tingkatkan kualitas gambar, pertajam detail, perbaiki pencahayaan, buat menjadi fotorealistik 4K, perjelas tekstur.'
    },
    {
        id: 'remove_bg',
        icon: 'scissors',
        label: 'Hapus Background',
        prompt: 'Remove the background completely, leaving only the main subject on a plain white background, clean edges, studio cutout.'
    },
    {
        id: 'cyberpunk',
        icon: 'robot',
        label: 'Cyberpunk',
        prompt: 'Terapkan tema cyberpunk futuristik, tambahkan lampu neon, sirkuit glowing, suasana malam teknologi tinggi.'
    }
];

export const ENHANCE_TOOLS = [
    {
        id: 'upscale_2x',
        icon: 'maximize',
        label: 'AI Upscale 2x',
        prompt: 'High fidelity image upscaling, 2x resolution, enhance details, improve sharpness, maintain original texture, photorealistic.'
    },
    {
        id: 'upscale_4x',
        icon: 'maximize',
        label: 'AI Upscale 4x',
        prompt: 'Ultra sharp image upscaling, 4x resolution, remove artifacts, enhance fine details, 8k quality.'
    },
    {
        id: 'upscale_8x',
        icon: 'maximize',
        label: 'AI Upscale 8x',
        prompt: 'Extreme upscaling 8x, restore missing details, remove blur, crisp edges, masterpiece quality.'
    },
    {
        id: 'super_res',
        icon: 'focus',
        label: 'Super Resolution',
        prompt: 'Apply Super Resolution, restore blurry face, enhance eye details, fix pixelation, high definition output.'
    },
    {
        id: 'denoise',
        icon: 'wand',
        label: 'Noise Removal',
        prompt: 'Denoise image, remove grain, remove jpeg compression artifacts, smooth surfaces while keeping edges sharp.'
    },
    {
        id: 'sharpen',
        icon: 'aperture',
        label: 'Sharpen / De-Blur',
        prompt: 'Fix motion blur, unblur image, sharpen edges, enhance clarity, restore focus.'
    },
    {
        id: 'vivid',
        icon: 'droplet',
        label: 'Color Vivid',
        prompt: 'Enhance color saturation, make colors pop, vivid and vibrant, dynamic contrast, professional color grading.'
    },
    {
        id: 'hdr',
        icon: 'layers',
        label: 'HDR Effect',
        prompt: 'Apply HDR effect, balance shadows and highlights, maximize dynamic range, dramatic and detailed lighting.'
    },
    {
        id: 'cinematic',
        icon: 'film',
        label: 'Cinematic Color',
        prompt: 'Cinematic teal and orange color grading, movie scene aesthetic, atmospheric lighting, moody tone.'
    }
];
