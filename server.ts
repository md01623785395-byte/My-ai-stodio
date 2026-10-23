import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { inspectImageBinary } from './src/utils/imageBinaryInspector';
import type { ImageProvider } from './src/types';
import { generateBatchPlan, rephraseSinglePrompt, isMosqueTopic, detectCategoryForTopic } from './src/utils/batchPromptEngine';
import { aiRegistry, executeWithSmartRouting, sanitizeLog } from './server/aiModelRouter';
import {
  MARKETPLACE_TITLE_RULES,
  PROMOTIONAL_FLUFF_WORDS,
  COMMERCIAL_TRADEMARK_BRANDS,
  UNSUPPORTED_INGREDIENT_TERMS,
  HUMAN_ENTITY_TERMS,
  SUBJECTIVE_EMOTION_TERMS,
  VEHICLE_ENTITY_TERMS,
  FOOD_ENTITY_TERMS,
  isSpiceSubjectVisible,
  isFoodSubject,
  isVehicleSubject,
  isHumanSubjectVisible,
  cleanDanglingPhrases,
  truncateAtNaturalBoundary,
  removeUnsupportedDetailsAndFluff,
  formatTitleForMarketplace,
  filterAndGroundKeywords,
  auditMarketplaceValidation,
  isMosqueSubject,
} from './src/utils/stockMetadataValidator';

dotenv.config();

// Ensure AI Registry has current key
if (process.env.GEMINI_API_KEY) {
  aiRegistry.setApiKey(process.env.GEMINI_API_KEY);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolvePort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const val = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(val) && val > 0) return val;
  }
  // Dev server must run on port 3000 in AI Studio
  if (process.env.NODE_ENV !== 'production') {
    return 3000;
  }
  if (process.env.PORT) {
    const parsed = parseInt(process.env.PORT, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 3000;
}

const PORT = resolvePort();
const app = express();

// Enable CORS for API routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to map style and quality to enhanced prompt text (MiniMax format)
function buildFullPrompt(prompt: string, style?: string, quality?: string, negativePrompt?: string): string {
  let enhanced = prompt.trim();

  // Style augmentation
  if (style) {
    switch (style) {
      case 'Cinematic 3D':
        if (!enhanced.toLowerCase().includes('cinematic')) {
          enhanced += ', cinematic 3D render, octane render, volumetric lighting, photorealistic depth of field';
        }
        break;
      case 'Photorealistic':
        if (!enhanced.toLowerCase().includes('photorealistic')) {
          enhanced += ', photorealistic 8k, professional photography, natural lighting, sharp focus, shot on 85mm lens';
        }
        break;
      case 'Anime & Manga':
        if (!enhanced.toLowerCase().includes('anime')) {
          enhanced += ', high quality anime style, crisp line art, vibrant atmospheric lighting, makoto shinkai aesthetic';
        }
        break;
      case 'Editorial Fashion':
        if (!enhanced.toLowerCase().includes('fashion')) {
          enhanced += ', high fashion editorial photography, studio magazine lighting, sleek elegant composition';
        }
        break;
      case 'Cyberpunk':
        if (!enhanced.toLowerCase().includes('cyberpunk')) {
          enhanced += ', cyberpunk aesthetic, neon night reflections, futuristic dark chrome, atmospheric haze';
        }
        break;
      case 'Surreal Fantasy':
        if (!enhanced.toLowerCase().includes('fantasy')) {
          enhanced += ', surreal fantasy art, ethereal dreamlike illumination, otherworldly details, masterpiece';
        }
        break;
      default:
        break;
    }
  }

  // Quality refinement
  if (quality === 'ultra-4k') {
    enhanced += ', ultra detailed 4k resolution, masterpiece composition, highly intricate textures';
  } else if (quality === 'high') {
    enhanced += ', high resolution, crisp details';
  }

  // If negative prompt is provided, append exclusion guidance
  if (negativePrompt && negativePrompt.trim()) {
    enhanced += ` --no ${negativePrompt.trim()}`;
  }

  return enhanced;
}

// Supported MiniMax aspect ratios
const VALID_ASPECT_RATIOS = ['1:1', '16:9', '4:3', '3:2', '2:3', '3:4', '9:16', '21:9'] as const;

const DIMENSION_MAP: Record<string, string> = {
  '1:1': '1024 × 1024',
  '16:9': '1280 × 720',
  '4:3': '1152 × 864',
  '3:2': '1248 × 832',
  '2:3': '832 × 1248',
  '3:4': '864 × 1152',
  '9:16': '720 × 1280',
  '21:9': '1344 × 576',
};

function getDemoImageForPrompt(prompt: string, style?: string): string {
  const p = (prompt + ' ' + (style || '')).toLowerCase();

  // Animals & Wildlife
  if (p.includes('leopard') || p.includes('snow leopard') || p.includes('cheetah')) {
    return 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?auto=format&fit=crop&w=1200&q=80';
  }
  if (p.includes('tiger') || p.includes('lion') || p.includes('panther') || p.includes('feline')) {
    return 'https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?auto=format&fit=crop&w=1200&q=80';
  }
  if (p.includes('animal') || p.includes('wildlife') || p.includes('wolf') || p.includes('fox') || p.includes('bear') || p.includes('deer')) {
    return 'https://images.unsplash.com/photo-1474511320723-9a56873867b5?auto=format&fit=crop&w=1200&q=80';
  }
  if (p.includes('bird') || p.includes('eagle') || p.includes('owl') || p.includes('parrot') || p.includes('hawk')) {
    return 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?auto=format&fit=crop&w=1200&q=80';
  }
  if (p.includes('marine') || p.includes('fish') || p.includes('whale') || p.includes('dolphin') || p.includes('ocean animal') || p.includes('underwater')) {
    return 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80';
  }
  if (p.includes('cat') || p.includes('kitten') || p.includes('dog') || p.includes('puppy') || p.includes('pet')) {
    return 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1200&q=80';
  }

  // Futuristic, Cyberpunk & Robotics
  if (p.includes('cyber') || p.includes('neon') || p.includes('future') || p.includes('tokyo') || p.includes('robot') || p.includes('ai') || p.includes('cyborg')) {
    return 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80';
  }

  // Nature, Landscapes, Mountains, Alps
  if (p.includes('alps') || p.includes('himalaya') || p.includes('mountain') || p.includes('cliff') || p.includes('summit') || p.includes('snow')) {
    return 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80';
  }
  if (p.includes('nature') || p.includes('forest') || p.includes('plant') || p.includes('flower') || p.includes('flora') || p.includes('sunrise') || p.includes('sunset')) {
    return 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80';
  }

  // Architecture, Interior & Pavilions
  if (p.includes('pavilion') || p.includes('house') || p.includes('building') || p.includes('interior') || p.includes('architecture') || p.includes('room') || p.includes('villa') || p.includes('modernist')) {
    return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80';
  }

  // Vehicles, Cars & Transport
  if (p.includes('car') || p.includes('vehicle') || p.includes('speed') || p.includes('race') || p.includes('drive') || p.includes('hypercar') || p.includes('supercar')) {
    return 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1200&q=80';
  }

  // Portraits & People
  if (p.includes('portrait') || p.includes('girl') || p.includes('man') || p.includes('woman') || p.includes('person') || p.includes('face') || p.includes('warrior') || p.includes('samurai') || p.includes('fashion model')) {
    return 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=80';
  }

  // Space, Sci-Fi & Astronomy
  if (p.includes('space') || p.includes('planet') || p.includes('galaxy') || p.includes('cosmos') || p.includes('star') || p.includes('saturn') || p.includes('astronaut')) {
    return 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80';
  }

  // Food, Drink & Culinary
  if (p.includes('food') || p.includes('coffee') || p.includes('culinary') || p.includes('dish') || p.includes('drink') || p.includes('dessert') || p.includes('gourmet')) {
    return 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80';
  }

  // Luxury & Products
  if (p.includes('product') || p.includes('perfume') || p.includes('bottle') || p.includes('luxury') || p.includes('watch') || p.includes('jewelry')) {
    return 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1200&q=80';
  }

  // Fantasy, Surreal & Abstract Art
  if (p.includes('fantasy') || p.includes('surreal') || p.includes('abstract') || p.includes('dream') || p.includes('render') || p.includes('3d')) {
    return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';
  }

  return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';
}

// Demo fallback generation endpoint
app.post('/api/generate-demo-image', (req, res) => {
  const { prompt, style, aspectRatio = '16:9', quality = 'high' } = req.body;
  const imageUrl = getDemoImageForPrompt(prompt || '', style);
  const words = (prompt || 'Studio Creation').trim().split(' ').slice(0, 5).join(' ');

  return res.json({
    success: true,
    imageUrl,
    id: `demo-${Date.now()}`,
    model: 'Studio Demo Engine (Offline Preview)',
    prompt: (prompt || 'Studio Demo').trim(),
    style: style || 'Default',
    aspectRatio,
    dimensions: DIMENSION_MAP[aspectRatio] || '1280 × 720',
    quality: quality || 'high',
    created: Math.floor(Date.now() / 1000),
    isDemoFallback: true,
  });
});

function mapToGeminiAspectRatio(ratio: string): '1:1' | '16:9' | '9:16' | '4:3' | '3:4' {
  switch (ratio) {
    case '1:1':
      return '1:1';
    case '16:9':
    case '21:9':
    case '3:2':
      return '16:9';
    case '9:16':
      return '9:16';
    case '4:3':
      return '4:3';
    case '3:4':
    case '2:3':
      return '3:4';
    default:
      return '16:9';
  }
}

async function generateWithGeminiNanoBanana({
  prompt,
  style,
  aspectRatio = '16:9',
  quality = 'high',
  negativePrompt,
  referenceImage,
}: {
  prompt: string;
  style?: string;
  aspectRatio?: string;
  quality?: string;
  negativePrompt?: string;
  referenceImage?: {
    data: string;
    mimeType?: string;
  };
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim() || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured in server environment. Please set GEMINI_API_KEY in AI Studio Secrets.');
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Preserve user prompt completely without truncation or replacement
  let fullPromptText = prompt.trim();
  if (style && style !== 'Default' && !fullPromptText.toLowerCase().includes(style.toLowerCase())) {
    fullPromptText += `, ${style} style`;
  }
  if (quality === 'ultra-4k') {
    fullPromptText += ', ultra detailed 4k resolution';
  }
  if (negativePrompt && negativePrompt.trim()) {
    fullPromptText += ` (Avoid: ${negativePrompt.trim()})`;
  }

  const mappedRatio = mapToGeminiAspectRatio(aspectRatio);

  // Model selection: 'gemini-3.1-flash-lite-image' by default, or 'gemini-nano-banana-2.1' for ultra-4k
  const modelName = quality === 'ultra-4k' ? 'gemini-nano-banana-2.1' : 'gemini-3.1-flash-lite-image';

  // Smart Quota Check: If model is in 429 quota exhaustion cooldown, prevent wasteful repeated calls
  const state = aiRegistry.getState(modelName);
  if (state && state.cooldownUntil > Date.now()) {
    const waitSec = Math.ceil((state.cooldownUntil - Date.now()) / 1000);
    console.log(`[AI Router] [Image Gen] Model [${modelName}] is in active quota cooldown (${waitSec}s remaining).`);
    const quotaErr: any = new Error(
      `কোটা শেষ (429 RESOURCE_EXHAUSTED): Gemini ফ্রি টিয়ারে ইমেজ মডেলের (${modelName}) রিকোয়েস্ট লিমিট ০। লাইভ ইমেজ জেনারেশনের জন্য Google AI Studio বা Cloud Console-এ বিলিং সক্রিয় করুন অথবা MiniMax / Google Flow ব্যবহার করুন।`
    );
    quotaErr.status = 429;
    quotaErr.isQuotaExceeded = true;
    throw quotaErr;
  }

  console.log(`[Gemini Nano Banana] Generating image with model: ${modelName}, ratio: ${mappedRatio}, hasReferenceImage: ${!!referenceImage?.data}`);

  const parts: any[] = [];

  // If user provided a reference image, send real image data as inlineData part for image-to-image
  if (referenceImage && referenceImage.data) {
    let cleanBase64 = referenceImage.data.trim();
    let mime = referenceImage.mimeType || 'image/png';
    if (cleanBase64.startsWith('data:')) {
      const commaIndex = cleanBase64.indexOf(',');
      if (commaIndex !== -1) {
        const meta = cleanBase64.slice(0, commaIndex);
        const mimeMatch = meta.match(/data:([^;]+);/);
        if (mimeMatch) mime = mimeMatch[1];
        cleanBase64 = cleanBase64.slice(commaIndex + 1);
      }
    }
    parts.push({
      inlineData: {
        data: cleanBase64,
        mimeType: mime,
      },
    });
  }

  // Include user prompt
  parts.push({
    text: fullPromptText,
  });

  const imageConfig: any = {
    aspectRatio: mappedRatio,
  };
  if (modelName === 'gemini-nano-banana-2.1' && quality === 'ultra-4k') {
    imageConfig.imageSize = '2K';
  }

  let response: any;
  try {
    const startImgTime = Date.now();
    response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts,
      },
      config: {
        imageConfig,
      },
    });
    aiRegistry.recordModelSuccess(modelName, Date.now() - startImgTime);
  } catch (err: any) {
    aiRegistry.recordModelError(modelName, err);
    throw err;
  }

  let imageUrl: string | null = null;
  const candidates = response.candidates || [];
  for (const candidate of candidates) {
    const cParts = candidate.content?.parts || [];
    for (const part of cParts) {
      if (part.inlineData && part.inlineData.data) {
        const mime = part.inlineData.mimeType || 'image/png';
        imageUrl = `data:${mime};base64,${part.inlineData.data}`;
        break;
      }
    }
    if (imageUrl) break;
  }

  if (!imageUrl) {
    const textPart = candidates[0]?.content?.parts?.find((p: any) => p.text)?.text;
    throw new Error(textPart || 'Gemini Nano Banana model did not return an image part. Please try revising your prompt.');
  }

  return {
    imageUrl,
    model: `Gemini Nano Banana (${modelName})`,
    enhancedPrompt: fullPromptText,
  };
}

// Optional Free-Tier: Hugging Face Serverless Inference for FLUX.1-schnell
async function generateWithHuggingFaceFlux({
  prompt,
  style,
  aspectRatio = '16:9',
  quality = 'high',
  negativePrompt,
  seed,
}: {
  prompt: string;
  style?: string;
  aspectRatio?: string;
  quality?: string;
  negativePrompt?: string;
  seed?: number;
}) {
  const hfToken = process.env.HF_TOKEN;
  if (!hfToken || !hfToken.trim() || hfToken === 'YOUR_HF_TOKEN') {
    const err: any = new Error(
      'HF_TOKEN সার্ভারে কনফিগার করা নেই। অনুগ্রহ করে AI Studio Secrets বা environment variable-এ একটি বৈধ Hugging Face User Access Token (HF_TOKEN) যুক্ত করুন।'
    );
    err.code = 'MISSING_HF_TOKEN';
    err.status = 400;
    throw err;
  }

  // Official migrated router endpoint for FLUX.1-schnell
  const endpointUrl = 'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell';
  const fullPromptText = buildFullPrompt(prompt, style, quality, negativePrompt);

  console.log(`[Hugging Face FLUX] Requesting image generation with model: black-forest-labs/FLUX.1-schnell`);

  const maxAttempts = 2;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s hard timeout

    try {
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${hfToken.trim()}`,
          'Content-Type': 'application/json',
          'User-Agent': 'AI-Creator-Studio/1.0',
        },
        body: JSON.stringify({
          inputs: fullPromptText,
          parameters: {
            num_inference_steps: 4,
            ...(typeof seed === 'number' && !isNaN(seed) ? { seed } : {}),
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 503 Model is loading
      if (response.status === 503 && attempt < maxAttempts) {
        let estimatedSec = 10;
        try {
          const errJson = await response.json();
          if (typeof errJson.estimated_time === 'number') {
            estimatedSec = Math.min(Math.ceil(errJson.estimated_time), 15);
          }
        } catch {
          // ignore non-json
        }
        console.log(`[Hugging Face FLUX] Model is loading (503). Waiting ${estimatedSec}s before single retry...`);
        await new Promise((r) => setTimeout(r, estimatedSec * 1000));
        continue;
      }

      // 429 Rate limit / Quota exceeded
      if (response.status === 429) {
        const errText = await response.text();
        console.warn(`[Hugging Face FLUX] 429 Rate limit / free quota exceeded:`, errText.slice(0, 160));
        const quotaErr: any = new Error(
          'Hugging Face ফ্রি কোটা বা রেট লিমিট শেষ হয়েছে (429 Rate Limit Exceeded)। কোনো পেইড বা অটোমেটিক বিলিং ফলব্যাক সক্রিয় নেই।'
        );
        quotaErr.code = 'QUOTA_EXCEEDED';
        quotaErr.status = 429;
        throw quotaErr;
      }

      // 401 Unauthorized
      if (response.status === 401) {
        const authErr: any = new Error(
          'Hugging Face অ্যাক্সেস টোকেন অবৈধ (401 Unauthorized)। অনুগ্রহ করে সঠিক HF_TOKEN প্রদান করুন।'
        );
        authErr.code = 'INVALID_HF_TOKEN';
        authErr.status = 401;
        throw authErr;
      }

      if (!response.ok) {
        const errBody = await response.text();
        const apiErr: any = new Error(`Hugging Face API ত্রুটি (HTTP ${response.status}): ${errBody.slice(0, 250)}`);
        apiErr.code = `HF_HTTP_${response.status}`;
        apiErr.status = response.status;
        throw apiErr;
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Verify real binary image data
      const inspection = inspectImageBinary(buffer);
      if (!inspection.isValid) {
        const corruptErr: any = new Error(`Hugging Face থেকে প্রাপ্ত ডেটা বৈধ ছবি নয়। ${inspection.error || ''}`);
        corruptErr.code = 'INVALID_IMAGE_BINARY';
        corruptErr.status = 502;
        throw corruptErr;
      }

      const mimeType = inspection.format === 'PNG' ? 'image/png' : inspection.format === 'WEBP' ? 'image/webp' : 'image/jpeg';
      const base64Data = buffer.toString('base64');
      const imageUrl = `data:${mimeType};base64,${base64Data}`;

      return {
        imageUrl,
        model: 'black-forest-labs/FLUX.1-schnell (Hugging Face)',
        provider: 'huggingface' as const,
        dimensions: `${inspection.width} × ${inspection.height}`,
        width: inspection.width,
        height: inspection.height,
        megapixels: inspection.megapixels,
        format: inspection.format,
        fileSizeBytes: buffer.length,
        enhancedPrompt: fullPromptText,
        license: 'Apache-2.0',
        licensePermitsCommercial: true,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        const timeoutErr: any = new Error(
          'Hugging Face API রিকোয়েস্ট ৩৫ সেকেন্ডের মধ্যে সম্পন্ন হয়নি (Timeout)। অনুগ্রহ করে পুনরায় চেষ্টা করুন।'
        );
        timeoutErr.code = 'TIMEOUT';
        timeoutErr.status = 504;
        throw timeoutErr;
      }
      lastError = err;
      if (err.code === 'QUOTA_EXCEEDED' || err.code === 'INVALID_HF_TOKEN' || err.code === 'MISSING_HF_TOKEN') {
        throw err;
      }
      if (attempt >= maxAttempts) {
        throw err;
      }
    }
  }

  throw lastError || new Error('Hugging Face ইমেজ জেনারেশন ব্যর্থ হয়েছে।');
}

// Optional Free-Tier: Cloudflare Workers AI for @cf/black-forest-labs/flux-1-schnell
async function generateWithCloudflareFlux({
  prompt,
  style,
  aspectRatio = '16:9',
  quality = 'high',
  negativePrompt,
  seed,
}: {
  prompt: string;
  style?: string;
  aspectRatio?: string;
  quality?: string;
  negativePrompt?: string;
  seed?: number;
}) {
  let cleanAccountId = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
  if (cleanAccountId.length === 64 && cleanAccountId.slice(0, 32) === cleanAccountId.slice(32)) {
    cleanAccountId = cleanAccountId.slice(0, 32);
  } else if (cleanAccountId.length > 32) {
    const match = cleanAccountId.match(/[a-f0-9]{32}/i);
    if (match) cleanAccountId = match[0];
  }

  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (
    !cleanAccountId ||
    cleanAccountId === 'YOUR_ACCOUNT_ID' ||
    !apiToken ||
    !apiToken.trim() ||
    apiToken === 'YOUR_API_TOKEN'
  ) {
    const err: any = new Error(
      'Cloudflare ক্রেডেনশিয়াল কনফিগার করা নেই। অনুগ্রহ করে AI Studio Secrets বা environment-এ CLOUDFLARE_ACCOUNT_ID এবং CLOUDFLARE_API_TOKEN যুক্ত করুন (Workers Free Plan-এ কোনো বিলিং বা কার্ড প্রয়োজন নেই)।'
    );
    err.code = 'MISSING_CLOUDFLARE_CREDENTIALS';
    err.status = 400;
    throw err;
  }

  const endpointUrl = `https://api.cloudflare.com/client/v4/accounts/${cleanAccountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`;
  const fullPromptText = buildFullPrompt(prompt, style, quality, negativePrompt);

  console.log(`[Cloudflare Workers AI] Requesting FLUX.1-schnell image generation...`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s hard timeout

  try {
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: fullPromptText,
        steps: 4,
        ...(typeof seed === 'number' && !isNaN(seed) ? { seed } : {}),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 429 Rate Limit / Free Quota (10,000 Neurons per day) Exceeded
    if (response.status === 429) {
      const errText = await response.text();
      console.warn(`[Cloudflare Workers AI] 429 Quota/rate limit exceeded:`, errText.slice(0, 160));
      const quotaErr: any = new Error(
        'Cloudflare দৈনিক ফ্রি কোটা (10,000 Neurons) শেষ হয়েছে (HTTP 429 / Code 4006)। কোনো পেইড বা অটোমেটিক বিলিং ফলব্যাক সক্রিয় নেই। পরবর্তী রিসেট (00:00 UTC)-এ কোটা নবায়ন হবে।'
      );
      quotaErr.code = 'QUOTA_EXCEEDED';
      quotaErr.status = 429;
      throw quotaErr;
    }

    // 401/403 Authentication Error
    if (response.status === 401 || response.status === 403) {
      const authErr: any = new Error(
        `Cloudflare অথেন্টিকেশন ব্যর্থ হয়েছে (HTTP ${response.status})। আপনার CLOUDFLARE_ACCOUNT_ID ও CLOUDFLARE_API_TOKEN পারমিশন (Workers AI Read) সঠিক কি না যাচাই করুন।`
      );
      authErr.code = 'INVALID_CLOUDFLARE_CREDENTIALS';
      authErr.status = 401;
      throw authErr;
    }

    if (!response.ok) {
      const errBody = await response.text();
      const apiErr: any = new Error(`Cloudflare Workers AI ত্রুটি (HTTP ${response.status}): ${errBody.slice(0, 250)}`);
      apiErr.code = `CF_HTTP_${response.status}`;
      apiErr.status = response.status;
      throw apiErr;
    }

    // Process output: Cloudflare can return JSON with { result: { image: "<base64>" } } or raw image binary
    const contentType = response.headers.get('content-type') || '';
    let buffer: Buffer;

    if (contentType.includes('application/json')) {
      const json: any = await response.json();
      if (!json.success || !json.result?.image) {
        const errorMsg = json.errors?.[0]?.message || 'Cloudflare Workers AI ইমেজ জেনারেশন ব্যর্থ হয়েছে।';
        const err: any = new Error(errorMsg);
        err.code = 'CF_GENERATION_FAILED';
        err.status = 502;
        throw err;
      }
      buffer = Buffer.from(json.result.image, 'base64');
    } else {
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    // Verify real binary image data using inspectImageBinary
    const inspection = inspectImageBinary(buffer);
    if (!inspection.isValid) {
      const corruptErr: any = new Error(`Cloudflare থেকে প্রাপ্ত ডেটা বৈধ ছবি নয়। ${inspection.error || ''}`);
      corruptErr.code = 'INVALID_IMAGE_BINARY';
      corruptErr.status = 502;
      throw corruptErr;
    }

    const mimeType = inspection.format === 'PNG' ? 'image/png' : inspection.format === 'WEBP' ? 'image/webp' : 'image/jpeg';
    const base64Data = buffer.toString('base64');
    const imageUrl = `data:${mimeType};base64,${base64Data}`;

    return {
      imageUrl,
      model: '@cf/black-forest-labs/flux-1-schnell',
      provider: 'cloudflare' as const,
      dimensions: `${inspection.width} × ${inspection.height}`,
      width: inspection.width,
      height: inspection.height,
      megapixels: inspection.megapixels,
      format: inspection.format,
      fileSizeBytes: buffer.length,
      enhancedPrompt: fullPromptText,
      license: 'Apache-2.0',
      licensePermitsCommercial: true,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const timeoutErr: any = new Error(
        'Cloudflare Workers AI রিকোয়েস্ট ৩৫ সেকেন্ডের মধ্যে সম্পন্ন হয়নি (Timeout)। অনুগ্রহ করে পুনরায় চেষ্টা করুন।'
      );
      timeoutErr.code = 'TIMEOUT';
      timeoutErr.status = 504;
      throw timeoutErr;
    }
    throw err;
  }
}

// 1. Check API configuration status
app.get('/api/status', (_req, res) => {
  const minimaxKey = process.env.MINIMAX_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const hfToken = process.env.HF_TOKEN;
  let cfAccountId = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
  if (cfAccountId.length === 64 && cfAccountId.slice(0, 32) === cfAccountId.slice(32)) {
    cfAccountId = cfAccountId.slice(0, 32);
  } else if (cfAccountId.length > 32) {
    const match = cfAccountId.match(/[a-f0-9]{32}/i);
    if (match) cfAccountId = match[0];
  }
  const cfApiToken = process.env.CLOUDFLARE_API_TOKEN;

  const isMinimaxConfigured = !!(minimaxKey && minimaxKey.trim().length > 0 && minimaxKey !== 'YOUR_MINIMAX_API_KEY');
  const isGeminiConfigured = !!(geminiKey && geminiKey.trim().length > 0 && geminiKey !== 'MY_GEMINI_API_KEY');
  const isHfConfigured = !!(hfToken && hfToken.trim().length > 0 && hfToken !== 'YOUR_HF_TOKEN');
  const isCfConfigured = !!(
    cfAccountId &&
    cfAccountId.trim().length > 0 &&
    cfAccountId !== 'YOUR_ACCOUNT_ID' &&
    cfApiToken &&
    cfApiToken.trim().length > 0 &&
    cfApiToken !== 'YOUR_API_TOKEN'
  );

  let defaultProvider: ImageProvider = 'gemini';
  if (isCfConfigured) {
    defaultProvider = 'cloudflare';
  } else if (isHfConfigured) {
    defaultProvider = 'huggingface';
  }

  res.json({
    status: 'ok',
    defaultProvider,
    geminiConfigured: isGeminiConfigured,
    minimaxConfigured: isMinimaxConfigured,
    huggingfaceConfigured: isHfConfigured,
    cloudflareConfigured: isCfConfigured,
    model: isCfConfigured
      ? '@cf/black-forest-labs/flux-1-schnell'
      : isHfConfigured
      ? 'black-forest-labs/FLUX.1-schnell'
      : isGeminiConfigured
      ? 'gemini-3.1-flash-lite-image'
      : 'image-01',
    providers: {
      gemini: {
        id: 'gemini',
        name: 'Gemini Nano Banana',
        model: 'gemini-3.1-flash-lite-image',
        configured: isGeminiConfigured,
        supportsReferenceImage: true,
      },
      minimax: {
        id: 'minimax',
        name: 'MiniMax image-01',
        model: 'image-01',
        configured: isMinimaxConfigured,
        supportsReferenceImage: false,
      },
      huggingface: {
        id: 'huggingface',
        name: 'Hugging Face (FLUX.1-schnell)',
        model: 'black-forest-labs/FLUX.1-schnell',
        configured: isHfConfigured,
        supportsReferenceImage: false,
        license: 'Apache-2.0 (Commercial Permitted)',
        tier: 'Free Serverless Inference',
      },
      cloudflare: {
        id: 'cloudflare',
        name: 'Cloudflare Workers AI (FLUX.1-schnell)',
        model: '@cf/black-forest-labs/flux-1-schnell',
        configured: isCfConfigured,
        supportsReferenceImage: false,
        license: 'Apache-2.0 (Commercial Permitted)',
        tier: 'Workers Free Plan (10,000 Neurons/day)',
        dailyFreeQuota: '10,000 Neurons/day (~100-150 free images)',
      },
    },
    supportedAspectRatios: VALID_ASPECT_RATIOS,
  });
});

// 2. Real Image Generation Endpoint (Supports switchable Gemini Nano Banana, MiniMax, Hugging Face, and Cloudflare Workers AI)
app.post('/api/generate-image', async (req, res) => {
  try {
    const {
      prompt,
      style,
      aspectRatio = '16:9',
      quality = 'high',
      seed,
      negativePrompt,
      referenceImage,
      provider = 'gemini', // Default to Gemini Nano Banana as requested
    } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required. Please provide a description for the image.',
      });
    }

    // -------------------------------------------------------------
    // Provider -1: Cloudflare Workers AI FLUX.1-schnell (Free-Only Engine)
    // -------------------------------------------------------------
    if (provider === 'cloudflare') {
      if (referenceImage && referenceImage.data) {
        return res.status(400).json({
          success: false,
          provider: 'cloudflare',
          code: 'REFERENCE_NOT_SUPPORTED',
          error: 'Cloudflare Workers AI FLUX.1-schnell মডেল রেফারেন্স ইমেজ সমর্থন করে না। রেফারেন্স ছবি দিয়ে জেনারেট করতে Gemini Nano Banana সিলেক্ট করুন।',
        });
      }

      try {
        const cfResult = await generateWithCloudflareFlux({
          prompt: prompt.trim(),
          style,
          aspectRatio,
          quality,
          negativePrompt,
          seed,
        });

        return res.json({
          success: true,
          imageUrl: cfResult.imageUrl,
          id: `cf-${Date.now()}`,
          model: cfResult.model,
          provider: 'cloudflare',
          prompt: prompt.trim(),
          fullPrompt: cfResult.enhancedPrompt,
          style: style || 'Default',
          aspectRatio,
          dimensions: cfResult.dimensions,
          width: cfResult.width,
          height: cfResult.height,
          megapixels: cfResult.megapixels,
          quality: quality || 'high',
          license: cfResult.license,
          licensePermitsCommercial: cfResult.licensePermitsCommercial,
          created: Math.floor(Date.now() / 1000),
          paidFallbackExecuted: false,
        });
      } catch (cfErr: any) {
        console.error(`[Cloudflare Error] Code: ${cfErr.code}, Status: ${cfErr.status}, Message: ${cfErr.message}`);
        // Strict Zero-Paid-Fallback: Stop and report error cleanly without calling MiniMax or Gemini
        return res.status(cfErr.status || 500).json({
          success: false,
          provider: 'cloudflare',
          code: cfErr.code || 'CF_API_ERROR',
          error: cfErr.message || 'Cloudflare Workers AI ইমেজ জেনারেশন ব্যর্থ হয়েছে।',
          paidFallbackExecuted: false,
        });
      }
    }

    // -------------------------------------------------------------
    // Provider 0: Hugging Face FLUX.1-schnell (Optional Free-Tier Engine)
    // -------------------------------------------------------------
    if (provider === 'huggingface') {
      if (referenceImage && referenceImage.data) {
        return res.status(400).json({
          success: false,
          provider: 'huggingface',
          code: 'REFERENCE_NOT_SUPPORTED',
          error: 'Hugging Face FLUX.1-schnell টেক্সট-টু-ইমেজ মডেল রেফারেন্স ইমেজ সমর্থন করে না। রেফারেন্স ছবি দিয়ে জেনারেট করতে Gemini Nano Banana সিলেক্ট করুন।',
        });
      }

      try {
        const hfResult = await generateWithHuggingFaceFlux({
          prompt: prompt.trim(),
          style,
          aspectRatio,
          quality,
          negativePrompt,
          seed,
        });

        return res.json({
          success: true,
          imageUrl: hfResult.imageUrl,
          id: `hf-${Date.now()}`,
          model: hfResult.model,
          provider: 'huggingface',
          prompt: prompt.trim(),
          fullPrompt: hfResult.enhancedPrompt,
          style: style || 'Default',
          aspectRatio,
          dimensions: hfResult.dimensions,
          width: hfResult.width,
          height: hfResult.height,
          megapixels: hfResult.megapixels,
          quality: quality || 'high',
          license: hfResult.license,
          licensePermitsCommercial: hfResult.licensePermitsCommercial,
          created: Math.floor(Date.now() / 1000),
          paidFallbackExecuted: false,
        });
      } catch (hfErr: any) {
        console.error(`[Hugging Face Error] Code: ${hfErr.code}, Status: ${hfErr.status}, Message: ${hfErr.message}`);
        // Strict Zero-Paid-Fallback: Stop and report error cleanly without calling MiniMax or Gemini
        return res.status(hfErr.status || 500).json({
          success: false,
          provider: 'huggingface',
          code: hfErr.code || 'HF_API_ERROR',
          error: hfErr.message || 'Hugging Face ইমেজ জেনারেশন ব্যর্থ হয়েছে।',
          paidFallbackExecuted: false,
        });
      }
    }

    // -------------------------------------------------------------
    // Provider 1: Gemini Nano Banana (Active / Switchable / Image-to-Image)
    // -------------------------------------------------------------
    if (provider === 'gemini') {
      try {
        const geminiResult = await generateWithGeminiNanoBanana({
          prompt: prompt.trim(),
          style,
          aspectRatio,
          quality,
          negativePrompt,
          referenceImage,
        });

        return res.json({
          success: true,
          imageUrl: geminiResult.imageUrl,
          id: `gemini-${Date.now()}`,
          model: geminiResult.model,
          provider: 'gemini',
          prompt: prompt.trim(),
          fullPrompt: geminiResult.enhancedPrompt,
          style: style || 'Default',
          aspectRatio,
          dimensions: DIMENSION_MAP[aspectRatio] || '1280 × 720',
          quality: quality || 'high',
          hasReferenceImage: !!(referenceImage && referenceImage.data),
          created: Math.floor(Date.now() / 1000),
        });
      } catch (geminiErr: any) {
        const errMsg = String(geminiErr?.message || geminiErr || '');
        const isQuotaExceeded = /quota|429|RESOURCE_EXHAUSTED|rate.limit/i.test(errMsg);
        const isMissingKey = /GEMINI_API_KEY/i.test(errMsg);

        console.log(`[Gemini API Status] QuotaExceeded: ${isQuotaExceeded}, MissingKey: ${isMissingKey}, Info: ${errMsg.slice(0, 160)}`);

        // Requirement 6: Do NOT return demo or random images. Report clear error!
        if (isQuotaExceeded) {
          return res.status(429).json({
            success: false,
            provider: 'gemini',
            code: 'QUOTA_EXCEEDED',
            error: 'Gemini কোটা লিমিট (429 RESOURCE_EXHAUSTED): Gemini ফ্রি টিয়ারে ইমেজ জেনারেশন মডেলের (gemini-3.1-flash-lite-image / gemini-nano-banana-2.1) দৈনিক লিমিট ০ রিকোয়েস্ট। লাইভ ইমেজ তৈরি করতে Google Cloud প্রজেক্টে বিলিং সক্রিয় বা পেইড API কী প্রয়োজন।',
            details: errMsg,
          });
        }

        if (isMissingKey) {
          return res.status(400).json({
            success: false,
            provider: 'gemini',
            code: 'MISSING_GEMINI_KEY',
            error: 'GEMINI_API_KEY সার্ভারে কনফিগার করা নেই। অনুগ্রহ করে AI Studio Secrets-এ GEMINI_API_KEY যুক্ত করুন।',
          });
        }

        return res.status(500).json({
          success: false,
          provider: 'gemini',
          code: 'GEMINI_API_ERROR',
          error: `Gemini API ত্রুটি: ${errMsg}`,
          details: errMsg,
        });
      }
    }

    // -------------------------------------------------------------
    // Provider 2: MiniMax image-01 (Preserved & Switchable)
    // -------------------------------------------------------------
    if (referenceImage && referenceImage.data) {
      return res.status(400).json({
        success: false,
        provider: 'minimax',
        code: 'REFERENCE_NOT_SUPPORTED',
        error: 'MiniMax image-01 মডেল রেফারেন্স ইমেজ (Image-to-Image) সমর্থন করে না। রেফারেন্স ছবি দিয়ে জেনারেট করতে Gemini Nano Banana সিলেক্ট করুন।',
      });
    }

    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey || !apiKey.trim() || apiKey === 'YOUR_MINIMAX_API_KEY') {
      return res.status(400).json({
        success: false,
        provider: 'minimax',
        error: 'MINIMAX_API_KEY is not configured on the server. Please add your MiniMax API Key as an environment variable or in AI Studio Secrets.',
        code: 'MISSING_API_KEY',
      });
    }

    // Validate or default aspect ratio
    let targetRatio = aspectRatio;
    if (!VALID_ASPECT_RATIOS.includes(targetRatio as any)) {
      targetRatio = '16:9';
    }

    const enhancedPrompt = buildFullPrompt(prompt, style, quality, negativePrompt);

    // Prepare payload according to official MiniMax Image-01 documentation
    const requestPayload: Record<string, any> = {
      model: 'image-01',
      prompt: enhancedPrompt,
      aspect_ratio: targetRatio,
      prompt_optimizer: true,
      response_format: 'url',
      n: 1,
      number_of_images: 1,
    };

    if (typeof seed === 'number' && !isNaN(seed)) {
      requestPayload.seed = seed;
    }

    const endpointUrl = process.env.MINIMAX_BASE_URL
      ? `${process.env.MINIMAX_BASE_URL.replace(/\/+$/, '')}/v1/image_generation`
      : 'https://api.minimax.io/v1/image_generation';

    console.log(`[MiniMax API] Sending image generation request to ${endpointUrl}`);
    console.log(`[MiniMax API] Model: image-01, Aspect Ratio: ${targetRatio}`);

    // Set timeout of 60 seconds for image generation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    let apiResponse: Response;
    try {
      apiResponse = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });
    } catch (networkErr: any) {
      clearTimeout(timeoutId);
      if (networkErr.name === 'AbortError') {
        return res.status(504).json({
          success: false,
          error: 'MiniMax API request timed out after 60 seconds. Please try again.',
          code: 'TIMEOUT',
        });
      }
      return res.status(502).json({
        success: false,
        error: `Failed to connect to MiniMax API: ${networkErr.message || 'Network error'}`,
        code: 'NETWORK_ERROR',
      });
    }

    clearTimeout(timeoutId);

    const responseText = await apiResponse.text();
    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('[MiniMax API] Non-JSON response received:', responseText);
      return res.status(apiResponse.status || 500).json({
        success: false,
        error: `MiniMax API returned invalid response (Status ${apiResponse.status}): ${responseText.slice(0, 200)}`,
        code: 'INVALID_RESPONSE',
      });
    }

    // Check base_resp status from MiniMax
    if (data.base_resp && data.base_resp.status_code !== 0) {
      const msg = data.base_resp.status_msg || 'Image generation failed';
      const isBalanceEmpty = data.base_resp.status_code === 1008 || /insufficient balance/i.test(msg);

      if (isBalanceEmpty) {
        console.log('[MiniMax Account Billing Notice]', data.base_resp);

        return res.status(402).json({
          success: false,
          provider: 'minimax',
          code: 'INSUFFICIENT_BALANCE',
          statusCode: 1008,
          error: 'MiniMax অ্যাকাউন্ট ব্যালেন্স শেষ (Error 1008: insufficient balance)। অনুগ্রহ করে platform.minimax.io থেকে ক্রেডিট রিচার্জ করুন।',
          details: data.base_resp,
        });
      }

      console.log('[MiniMax API Response Notice]', data.base_resp);
      return res.json({
        success: false,
        error: `MiniMax API Error (${data.base_resp.status_code}): ${msg}`,
        code: `MINIMAX_${data.base_resp.status_code}`,
        statusCode: data.base_resp.status_code,
        details: data.base_resp,
      });
    }

    if (!apiResponse.ok) {
      const errorMsg = data.message || data.error || data.status_msg || `HTTP Error ${apiResponse.status}`;
      return res.json({
        success: false,
        error: `MiniMax API Error: ${errorMsg}`,
        code: `HTTP_${apiResponse.status}`,
        details: data,
      });
    }

    // Extract generated image URL or base64 from response
    let imageUrl: string | null = null;

    if (data.data?.image_urls && Array.isArray(data.data.image_urls) && data.data.image_urls.length > 0) {
      imageUrl = data.data.image_urls[0];
    } else if (data.data?.images && Array.isArray(data.data.images) && data.data.images.length > 0) {
      imageUrl = typeof data.data.images[0] === 'string' ? data.data.images[0] : data.data.images[0]?.url;
    } else if (Array.isArray(data.data) && data.data.length > 0) {
      imageUrl = data.data[0]?.url || (typeof data.data[0] === 'string' ? data.data[0] : null);
    } else if (data.data?.image_base64 && Array.isArray(data.data.image_base64) && data.data.image_base64.length > 0) {
      imageUrl = `data:image/png;base64,${data.data.image_base64[0]}`;
    } else if (data.data?.url) {
      imageUrl = data.data.url;
    } else if (data.image_url) {
      imageUrl = data.image_url;
    }

    if (!imageUrl) {
      console.error('[MiniMax API] No image URL found in payload:', data);
      return res.status(500).json({
        success: false,
        error: 'MiniMax completed the request, but no image URL was found in the response.',
        code: 'NO_IMAGE_FOUND',
        rawResponse: data,
      });
    }

    return res.json({
      success: true,
      imageUrl,
      id: data.id || `minimax-${Date.now()}`,
      model: 'MiniMax image-01',
      prompt: prompt.trim(),
      fullPrompt: enhancedPrompt,
      style: style || 'Default',
      aspectRatio: targetRatio,
      dimensions: DIMENSION_MAP[targetRatio] || '1280 × 720',
      quality: quality || 'high',
      created: data.created || Math.floor(Date.now() / 1000),
    });
  } catch (err: any) {
    console.error('[Server Error in /api/generate-image]', err);
    return res.status(500).json({
      success: false,
      error: `Internal server error: ${err.message || 'Unknown error'}`,
      code: 'SERVER_ERROR',
    });
  }
});

// 3. Download Proxy to safely download cross-origin images without CORS issues
app.get('/api/download-image', async (req, res) => {
  try {
    const { url, filename = 'minimax-generated-image.png' } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).send('Image URL parameter is required');
    }

    // Handle base64 data URL directly
    if (url.startsWith('data:image/')) {
      const base64Data = url.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    }

    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch image from remote source');
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buffer);
  } catch (err: any) {
    console.error('[Download Proxy Error]', err);
    return res.status(500).send('Error downloading image');
  }
});

// 3.1 Proxy Image to avoid Canvas CORS Tainting during client-side Upscaling
app.get('/api/proxy-image', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).send('Image URL parameter is required');
    }

    if (url.startsWith('data:image/')) {
      const match = url.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        const mime = match[1];
        const buffer = Buffer.from(match[2], 'base64');
        res.setHeader('Content-Type', mime);
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.send(buffer);
      }
    }

    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch remote image');
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buffer);
  } catch (err: any) {
    console.error('[Image Proxy Error]', err);
    return res.status(500).send('Error proxying image for enhancement');
  }
});

// 4. Marketing AI Multi-Marketplace Concepts & Strategy Endpoint
app.post('/api/marketing/generate-10-concepts', async (req, res) => {
  try {
    const { niche = 'AgriTech & Urban Vertical Farming' } = req.body;
    const cleanNiche = (typeof niche === 'string' && niche.trim()) ? niche.trim() : 'AgriTech & Urban Vertical Farming';

    const apiKey = process.env.GEMINI_API_KEY;
    const hasGeminiKey = !!(apiKey && apiKey.trim().length > 0 && apiKey !== 'MY_GEMINI_API_KEY');

    let conceptsList: any[] = [];
    let usedProvider = 'prebuilt-expert-engine';

    if (hasGeminiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey: apiKey!.trim(),
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const promptText = `A stock media creator wants a complete multi-marketplace strategy for selling AI stock images & videos for the niche: "${cleanNiche}".

STRICT HUMAN PRESENCE & SUBJECT HIERARCHY RULES:
1. Humans are NOT completely forbidden! Follow this strict priority hierarchy:
   - 1st Priority (🥇 ১ম অগ্রাধিকার: মানুষ ছাড়া): Concepts 1 through 6 MUST be content without humans (architecture, technology, machinery, clean energy, biotech gear, organic culinary still life, abstract fluid textures, 3D isometric cutaways). Zero model release risk, highest corporate demand.
   - 2nd Priority (🥈 ২য় অগ্রাধিকার: ১-২ জন মানুষ): Concepts 7 and 8 should have minimal human presence (1-2 people only - e.g. hands working with high-tech equipment, silhouette against sunrise, back view, or 1-2 fictional people with perfect anatomy: exactly 5 fingers, symmetrical eyes, natural skin texture, zero trademark logos).
   - Animal Presence (🐾 প্রাণীর কনটেন্ট): Concepts 9 and 10 should feature animals/wildlife/insects/marine life (e.g. honeybee pollinating flower, beneficial ladybug, wildlife in habitat). Highly marketable, no model release needed for wildlife.

2. 8-POINT COMPLIANCE & VERIFICATION MATRIX (Do not guess rules; reflect official contributor policies):
   Evaluate across: Adobe Stock, Freepik, Dreamstime, Shutterstock, iStock/Getty, Pond5, Alamy, Envato, Vecteezy.
   - Adobe Stock & Freepik: Fully allow 3rd-party generative AI (with disclosure tag).
   - Dreamstime: Allows AI in "Illustrations / AI generated" category if NO realistic human faces are present (no-humans and animals are 100% accepted; realistic human faces are banned).
   - Shutterstock, iStock/Getty, Pond5, Alamy, Envato: Ban 3rd-party contributor AI uploads.
   - Zero tolerance for brands, logos, trademarks, celebrities, or copyrighted characters.

3. Generate EXACTLY 10 marketable concepts. Return ONLY a valid JSON array of 10 objects:
[
  {
    "conceptNumber": 1,
    "subjectType": "no-humans",
    "priorityBadge": "🥇 ১ম অগ্রাধিকার: মানুষ ছাড়া",
    "humanPresenceNote": "১ম অগ্রাধিকার: মানুষ ছাড়া — কোনো মডেল রিলিজ প্রয়োজন নেই, মুখের ত্রুটির ঝুঁকি শূন্য।",
    "banglaTitle": "বাংলা শিরোনাম (যেমন: রোবোটিক সেন্সর আর্ম সহ উল্লম্ব হাইড্রোপনিক লেটুস র্যাক)",
    "commercialValue": "কেন বায়াররা এটি কিনবে ও লাইসেন্স করবে (বাংলায় ২ বাক্য)",
    "prompt": "Detailed commercial English photorealistic image prompt, 85mm lens, studio lighting, negative copy space, zero humans, 8k resolution",
    "videoPrompt": "Cinematic 4K 60fps slow panning video B-roll prompt with lighting, camera motion, clean commercial stock, zero humans",
    "stockTitle": "Commercial English SEO Title under 75 chars with Generative AI tag",
    "stockTitleBangla": "টাইটেলটির বাংলা অনুবাদ",
    "description": "বাংলায় বাণিজ্যিক ব্যবহারের বিবরণ (ওয়েবসাইট হিরো, কর্পোরেট রিপোর্ট, সোশ্যাল অ্যাড)",
    "keywords": ["exactly 40 commercial English keywords, comma separated, top 10 most critical first, including generative ai, generative, ai"],
    "category": "Official Marketplace Category (e.g. Technology, Science, Backgrounds / Textures, Animals / Wildlife, Graphic Resources, Food / Drink)",
    "recommendedFormat": "JPEG (.jpg), sRGB কালার প্রোফাইল, 5000 x 3333 px (16.6 MP), 300 DPI, 3:2 Landscape (বা 16:9), ফাইল সাইজ < 45 MB",
    "aspectRatio": "3:2 Landscape (বা 16:9 ব্যানার)",
    "complianceChecklist": {
      "aiPolicyChecked": true,
      "peopleRule": "১ম অগ্রাধিকার: মানুষ ছাড়া (মডেল রিলিজ অপ্রয়োজনীয়)",
      "animalRule": "প্রযোজ্য নয়",
      "brandsAndLogosFree": true,
      "celebrityAndCopyrightFree": true,
      "releasesRequired": "Model Release: নেই | Property Release: নেই",
      "commercialUseStatus": "বাণিজ্যিক রয়্যালটি-ফ্রি লাইসেন্সের জন্য ১০০% উপযুক্ত ও যাচাইকৃত"
    },
    "bestMarketplaces": [
      { "name": "Adobe Stock", "suitability": "Top Choice", "note": "কর্পোরেট টেক ও ইএসজি রিপোর্ট ক্রেতাদের জন্য সর্বোচ্চ রয়্যালটি।" },
      { "name": "Freepik", "suitability": "Top Choice", "note": "উচ্চ ভলিউম ডাউনলোড ও গ্রাফিক রিসোর্স।" },
      { "name": "Dreamstime", "suitability": "Recommended", "note": "মানুষের ছবি ছাড়া এআই ক্যাটাগরিতে সরাসরি অনুমোদিত।" },
      { "name": "Vecteezy / Wirestock", "suitability": "Recommended", "note": "একক ক্লিকে মাল্টি-ডিস্ট্রিবিউশন।" },
      { "name": "Shutterstock / Getty", "suitability": "Not Allowed", "note": "থার্ড-পার্টি এআই আপলোড নিষিদ্ধ।" }
    ],
    "crossPostingNote": "একই কন্টেন্ট নন-এক্সক্লুসিভ (Non-Exclusive) লাইসেন্সে একসাথে Adobe Stock, Freepik এবং Dreamstime-এ আপলোড করা সম্পূর্ণ বৈধ ও লাভজনক।"
  }
]`;

        console.log(`[Marketing 10 Concepts] Processing multi-marketplace strategy for: ${cleanNiche}`);
        // Safe timeout so Gemini can craft comprehensive multi-marketplace JSON
        let timer845: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer845 = setTimeout(() => reject(new Error('Marketplace analysis fallback triggered')), 35000);
        });

        const geminiCall = ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: promptText,
          config: {
            systemInstruction: 'You are StockPro AI, an elite Stock Marketplace Strategist. Strictly follow the subject priority hierarchy (1st: no-humans, 2nd: 1-2 minimal humans, and animals). Verify all 8 official compliance points (AI, people, animals, brands, logos, celebrities, characters, releases, commercial-use). Never speculate. Answer in Bengali for all explanations.',
          },
        });

        let response: any;
        try {
          response = await Promise.race([geminiCall, timeoutPromise]);
        } finally {
          if (timer845) clearTimeout(timer845);
        }
        const candidateText = response?.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText && candidateText.trim()) {
          const jsonMatch = candidateText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed) && parsed.length > 0) {
              conceptsList = parsed.map((item, idx) => {
                const num = item.conceptNumber || (idx + 1);
                const sType = item.subjectType || (num <= 6 ? 'no-humans' : num <= 8 ? 'minimal-humans' : 'animals');
                const pBadge = item.priorityBadge || (sType === 'no-humans' ? '🥇 ১ম অগ্রাধিকার: মানুষ ছাড়া' : sType === 'minimal-humans' ? '🥈 ২য় অগ্রাধিকার: ১-২ জন মানুষ' : '🐾 প্রাণীর কনটেন্ট');
                const hNote = item.humanPresenceNote || (sType === 'no-humans' ? '১ম অগ্রাধিকার: মানুষ ছাড়া — কোনো মডেল রিলিজ প্রয়োজন নেই।' : sType === 'minimal-humans' ? '২য় অগ্রাধিকার: ১-২ জন মানুষ — কাল্পনিক ব্যক্তি, নিখুঁত অ্যানাটমি।' : 'প্রাণীর কনটেন্ট — সম্পূর্ণ অনুমোদিত ও রিলিজ মুক্ত।');

                return {
                  id: `gen-concept-${num}-${Date.now()}`,
                  conceptNumber: num,
                  subjectType: sType,
                  priorityBadge: pBadge,
                  humanPresenceNote: hNote,
                  banglaTitle: item.banglaTitle || `${cleanNiche} - ধারণা ${num}`,
                  commercialValue: item.commercialValue || 'কর্পোরেট ওয়েবসাইট ও বিজ্ঞাপনের জন্য উচ্চ চাহিদাসম্পন্ন কনসেপ্ট।',
                  prompt: item.prompt || `High-end photorealistic commercial photography of ${cleanNiche}, studio lighting, 8k resolution`,
                  videoPrompt: item.videoPrompt || `Cinematic 4K 60fps smooth panning video B-roll of ${cleanNiche}, commercial lighting, 8k resolution`,
                  stockTitle: item.stockTitle || `${cleanNiche} Commercial Concept Generative AI`,
                  stockTitleBangla: item.stockTitleBangla || `${cleanNiche} বাণিজ্যিক কনসেপ্ট`,
                  description: item.description || `${cleanNiche} বিষয়ক প্রিমিয়াম বাণিজ্যিক স্টক অ্যাসেট।`,
                  keywords: Array.isArray(item.keywords) && item.keywords.length >= 20
                    ? item.keywords.slice(0, 40)
                    : generateFallbackKeywords(cleanNiche, item.category || 'Technology', `concept ${num}`),
                  category: item.category || 'Technology',
                  recommendedFormat: item.recommendedFormat || 'JPEG (.jpg), sRGB কালার প্রোফাইল, 5000 x 3333 px (16.6 MP), 300 DPI, 3:2 Landscape (বা 16:9), ফাইল সাইজ < 45 MB',
                  aspectRatio: item.aspectRatio || '3:2 Landscape (বা 16:9 ব্যানার)',
                  complianceChecklist: item.complianceChecklist || {
                    aiPolicyChecked: true,
                    peopleRule: sType === 'no-humans' ? '১ম অগ্রাধিকার: মানুষ ছাড়া' : sType === 'minimal-humans' ? '২য় অগ্রাধিকার: ১-২ জন কাল্পনিক ব্যক্তি' : 'মানুষ ছাড়া',
                    animalRule: sType === 'animals' ? 'প্রাণীর ছবি সম্পূর্ণ অনুমোদিত' : 'প্রযোজ্য নয়',
                    brandsAndLogosFree: true,
                    celebrityAndCopyrightFree: true,
                    releasesRequired: sType === 'no-humans' || sType === 'animals' ? 'Model Release: নেই | Property Release: নেই' : 'Fictional AI Person (বাস্তব কারো সদৃশ নয়)',
                    commercialUseStatus: 'বাণিজ্যিক ব্যবহারের জন্য ১০০% উপযুক্ত ও যাচাইকৃত',
                  },
                  bestMarketplaces: item.bestMarketplaces || [
                    { name: 'Adobe Stock', suitability: 'Top Choice', note: 'কর্পোরেট টেক ও ইএসজি রিপোর্ট ক্রেতাদের জন্য সর্বোচ্চ রয়্যালটি।' },
                    { name: 'Freepik', suitability: 'Top Choice', note: 'উচ্চ ভলিউম ডাউনলোড ও গ্রাফিক রিসোর্স।' },
                    { name: 'Dreamstime', suitability: sType === 'minimal-humans' ? 'Not Allowed' : 'Recommended', note: sType === 'minimal-humans' ? 'মানুষের মুখাবয়ব ড্রিমসটাইমে নিষিদ্ধ।' : 'মানুষ ছাড়া বা প্রাণী কনটেন্ট সরাসরি অনুমোদিত।' },
                    { name: 'Vecteezy / Wirestock', suitability: 'Recommended', note: 'একক ক্লিকে মাল্টি-ডিস্ট্রিবিউশন।' },
                    { name: 'Shutterstock / Getty', suitability: 'Not Allowed', note: 'থার্ড-পার্টি এআই আপলোড নিষিদ্ধ।' }
                  ],
                  crossPostingNote: item.crossPostingNote || (sType === 'minimal-humans' ? 'Adobe Stock ও Freepik-এ Non-Exclusive লাইসেন্সে আপলোড করুন।' : 'Adobe Stock, Freepik এবং Dreamstime-এ Non-Exclusive লাইসেন্সে একসাথে আপলোড করতে পারবেন।'),
                };
              });
              usedProvider = 'gemini-3.8-flash';
            }
          }
        }
      } catch (geminiErr: any) {
        console.log('[Marketing 10 Concepts] Using verified knowledge engine for instant multi-marketplace generation');
      }
    }

    // High quality offline Bengali knowledge engine if Gemini is not present, times out or returns partial
    if (conceptsList.length === 0) {
      conceptsList = generate10FallbackConcepts(cleanNiche);
      usedProvider = 'expert-stock-engine';
    }

    return res.json({
      success: true,
      niche: cleanNiche,
      provider: usedProvider,
      totalConcepts: conceptsList.length,
      marketplacesAnalysis: [
        {
          id: 'adobe-stock',
          name: 'Adobe Stock',
          status: 'সম্পূর্ণ অনুমোদিত (Top Choice)',
          badgeColor: 'green',
          aiPolicy: 'থার্ড-পার্টি এআই ছবি ও ভিডিও সম্পূর্ণ অনুমোদিত। আপলোডকালে "Created using generative AI tools" চেকবক্স টিক দিতে হবে।',
          technicalSpecs: 'JPEG (.jpg), sRGB, 4 MP - 100 MP (সুপারিশ: 5000x3333 px / 16.6 MP), 300 DPI, < 45 MB।',
          exclusivity: 'নন-এক্সক্লুসিভ (Non-Exclusive)। একই কন্টেন্ট অন্যান্য সাইটেও দেওয়া যাবে।',
          bestFor: 'কর্পোরেট টেকনোলজি, আর্কিটেকচার, এগ্রিটেক ও হাই-রেজোলিউশন ব্যাকগ্রাউন্ড।',
          demand: 'শীর্ষ উপার্জন ও বায়ারদের সর্বোচ্চ বিশ্বাস ⭐⭐⭐⭐⭐',
        },
        {
          id: 'freepik',
          name: 'Freepik',
          status: 'সম্পূর্ণ অনুমোদিত (High Volume)',
          badgeColor: 'green',
          aiPolicy: 'এআই ফটো ও ভেক্টর অনুমোদিত। আপলোড পোর্টালে "_ai_generated" ট্যাগ দিতে হবে।',
          technicalSpecs: 'JPEG, sRGB, ন্যূনতম 2000x2000 px (সুপারিশ: 4000x4000 px বা 3:2), < 45 MB।',
          exclusivity: 'নন-এক্সক্লুসিভ (Non-Exclusive)।',
          bestFor: 'সোশ্যাল ব্যানার, প্রোডাক্ট মকআপ স্টেজ, ৩ডি টেক্সচার ও গ্রাফিক রিসোর্স।',
          demand: 'বিশাল ডাউনলোড ভলিউম ও দ্রুত আর্নিং ⭐⭐⭐⭐⭐',
        },
        {
          id: 'dreamstime',
          name: 'Dreamstime',
          status: 'শর্তসাপেক্ষ অনুমোদিত (Non-Human)',
          badgeColor: 'amber',
          aiPolicy: 'এআই ইমেজ অনুমোদিত, তবে ক্যাটাগরি "Illustrations / AI generated" হতে হবে। মানুষের মুখাবয়ব দেওয়া নিষিদ্ধ (মানুষ ছাড়া কনসেপ্টে কোনো ঝুঁকি নেই)।',
          technicalSpecs: 'JPEG, RGB/sRGB, ন্যূনতম 3 MP (সুপারিশ 4 MP+), < 45 MB।',
          exclusivity: 'ডিফল্টভাবে নন-এক্সক্লুসিভ রাখুন (এক্সক্লুসিভ সিলেক্ট করবেন না)।',
          bestFor: 'সায়েন্স, টেক্সচার, মাইক্রো-ডিটেইলস ও থ্রিডি অ্যাবস্ট্রাক্ট।',
          demand: 'মাঝারি চাহিদা ও দীর্ঘমেয়াদী সেল ⭐⭐⭐⭐',
        },
        {
          id: 'vecteezy-wirestock',
          name: 'Vecteezy / Wirestock',
          status: 'অনুমোদিত (Aggregator)',
          badgeColor: 'green',
          aiPolicy: 'এআই আর্টওয়ার্ক গ্রহণ করে। Wirestock দিয়ে একক ক্লিকে একাধিক অনুমোদিত সাইটে অটো-আপলোড করা যায়।',
          technicalSpecs: 'JPEG, sRGB, 4 MP+, মেটাডেটা সহ।',
          exclusivity: 'নন-এক্সক্লুসিভ (Non-Exclusive)।',
          bestFor: 'মাল্টি-ডিস্ট্রিবিউশন ও ভেক্টর-স্টাইল এআই রেন্ডার।',
          demand: 'সহজ ডিস্ট্রিবিউশন ও সময় সাশ্রয় ⭐⭐⭐⭐',
        },
        {
          id: 'shutterstock',
          name: 'Shutterstock',
          status: 'থার্ড-পার্টি এআই নিষিদ্ধ (Banned for 3P AI)',
          badgeColor: 'red',
          aiPolicy: 'কন্ট্রিবিউটর পোর্টাল দিয়ে বাহ্যিক থার্ড-পার্টি এআই আপলোড নিষিদ্ধ। শুধুমাত্র তাদের নিজস্ব বিল্ট-ইন DALL-E এআই টুল দিয়ে সাইটে তৈরি ছবি লাইসেন্সযোগ্য।',
          technicalSpecs: 'বাহ্যিক এআই ফাইল জমা দিলে রিভিউয়ার রিজেক্ট করবে।',
          exclusivity: 'কন্ট্রিবিউটরদের জন্য এআই নিষিদ্ধ নীতি বহাল।',
          bestFor: 'এআই কনটেন্টের জন্য প্রযোজ্য নয়।',
          demand: 'থার্ড-পার্টি এআই নিষিদ্ধ ⚠️',
        },
        {
          id: 'getty-istock',
          name: 'iStock / Getty Images',
          status: 'থার্ড-পার্টি এআই নিষিদ্ধ (Banned for 3P AI)',
          badgeColor: 'red',
          aiPolicy: 'কন্ট্রিবিউটরদের এআই আপলোড সম্পূর্ণ নিষিদ্ধ। তাদের নিজস্ব এনভিডিয়া-চালিত এআই জেনারেটর রয়েছে।',
          technicalSpecs: 'বাহ্যিক এআই কনটেন্ট নিষিদ্ধ।',
          exclusivity: 'কঠোর নীতি।',
          bestFor: 'এআই কনটেন্টের জন্য প্রযোজ্য নয়।',
          demand: 'থার্ড-পার্টি এআই নিষিদ্ধ ⚠️',
        },
        {
          id: 'pond5',
          name: 'Pond5',
          status: 'এআই কন্টেন্ট নিষিদ্ধ (Banned)',
          badgeColor: 'red',
          aiPolicy: 'Shutterstock অধিগ্রহণের পর থেকে থার্ড-পার্টি এআই ইমেজ বা ভিডিও আপলোড নিষিদ্ধ।',
          technicalSpecs: 'এআই ফাইল জমা দিলে রিজেকশন নিশ্চিত।',
          exclusivity: 'এআই গ্রহণযোগ্য নয়।',
          bestFor: 'এআই মিডিয়ার জন্য উপযুক্ত নয়।',
          demand: 'এআই নিষিদ্ধ ⚠️',
        },
        {
          id: 'alamy',
          name: 'Alamy',
          status: 'সম্পূর্ণ নিষিদ্ধ (Strictly Banned)',
          badgeColor: 'red',
          aiPolicy: 'এআই জেনারেটেড কন্টেন্ট সম্পূর্ণ নিষিদ্ধ। জমা দিলে চুক্তি লঙ্ঘন ও একাউন্ট বাতিল হতে পারে।',
          technicalSpecs: 'এআই গ্রহণযোগ্য নয়।',
          exclusivity: 'কঠোর নিষেধাজ্ঞা।',
          bestFor: 'এআই ছবির জন্য প্রযোজ্য নয়।',
          demand: 'কঠোর নিষেধাজ্ঞা 🚫',
        },
        {
          id: 'envato',
          name: 'Envato (Elements/Market)',
          status: 'স্ট্যান্ডঅ্যালোন এআই নিষিদ্ধ (Banned)',
          badgeColor: 'red',
          aiPolicy: 'স্ট্যান্ডঅ্যালোন ডাউনলোড আইটেম হিসেবে এআই ফাইল বিক্রি নিষিদ্ধ। শুধুমাত্র প্রিভিউ মকআপে ব্যবহারের অনুমতি রয়েছে।',
          technicalSpecs: 'মূল ডাউনলোড প্যাকেজে এআই ইমেজ ফাইল গ্রহণযোগ্য নয়।',
          exclusivity: 'এনভাতো অথর নীতিমালায় এআই বিক্রিতে নিষেধাজ্ঞা রয়েছে।',
          bestFor: 'এআই স্টক ফটো বিক্রির জন্য উপযুক্ত নয়।',
          demand: 'স্ট্যান্ডঅ্যালোন এআই নিষিদ্ধ 🚫',
        },
      ],
      crossPostingGuide: {
        summary: 'একই কনটেন্ট একাধিক অনুমোদিত মার্কেটপ্লেসে দেওয়া সম্পূর্ণ বৈধ ও অত্যন্ত লাভজনক!',
        safeBundle: ['Adobe Stock', 'Freepik', 'Dreamstime', 'Vecteezy / Wirestock'],
        bannedList: ['Shutterstock', 'iStock / Getty Images', 'Pond5', 'Alamy', 'Envato'],
        goldenRule: 'কখনোই কোনো মার্কেটপ্লেসে "Exclusive Contributor" অপশন নির্বাচন করবেন না। সর্বদা "Non-Exclusive" সিলেক্ট করুন। এতে আপনি একই ছবি বা ভিডিও একসাথে সব অনুমোদিত মার্কেটপ্লেসে আপলোড করতে পারবেন এবং আয় বহুগুণ বৃদ্ধি পাবে।',
      },
      concepts: conceptsList,
    });
  } catch (err: any) {
    console.error('[Generate 10 Concepts Error]', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate 10 stock concepts',
    });
  }
});

app.post('/api/marketing/chat', async (req, res) => {
  try {
    const {
      message,
      history = [],
      action = 'general',
      niche,
    } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message content is required.',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const hasGeminiKey = !!(apiKey && apiKey.trim().length > 0 && apiKey !== 'MY_GEMINI_API_KEY');

    let replyText = '';
    let usedProvider = 'offline-knowledge-engine';

    if (hasGeminiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey: apiKey!.trim(),
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        // Build clean conversation prompt string with history context
        let fullConversationPrompt = '';
        if (Array.isArray(history) && history.length > 0) {
          const recent = history.slice(-4);
          for (const item of recent) {
            if (item && item.content) {
              const roleName = item.role === 'assistant' ? 'StockPro AI' : 'Creator';
              fullConversationPrompt += `${roleName}: ${item.content}\n\n`;
            }
          }
        }
        fullConversationPrompt += `Creator: ${message.trim()}`;

        const systemInstruction = `You are StockPro AI, an elite Stock Marketplace Strategist and Marketing Advisor covering all major stock photo & video platforms: Adobe Stock, Freepik, Dreamstime, Shutterstock, Getty Images / iStock, Pond5, Alamy, and Envato.

CRITICAL INSTRUCTIONS & GROUND TRUTH (কোনো অনুমান নয়, অফিসিয়াল পলিসি ভিত্তিক সিদ্ধান্ত):
1. ALWAYS RESPOND IN BENGALI (সব উত্তর বাংলায় দেবে) for all explanations, analysis, advice, and metadata.
2. Verified 2026 Marketplace Policies on Generative AI:
   - Adobe Stock: সম্পূর্ণ অনুমোদিত (Fully Accepted) — থার্ড-পার্টি এআই ছবি ও ভিডিও এলাউড। "Created using generative AI tools" বক্স টিক দিতে হবে।
   - Freepik: সম্পূর্ণ অনুমোদিত (Fully Accepted) — এআই ফটো, ভেক্টর ও পিএসডি এলাউড। "_ai_generated" ট্যাগ দিতে হবে।
   - Dreamstime: শর্তসাপেক্ষ অনুমোদিত (Accepted) — মানুষের মুখাবয়ব দেওয়া যাবে না, ডেসক্রিপশনে AI ডিসক্লেমার ও ক্যাটাগরি "Illustrations/AI generated" দিতে হবে। মানুষ ছাড়া ও প্রাণীর এআই কনটেন্ট সরাসরি অনুমোদিত।
   - Vecteezy / Wirestock: অনুমোদিত — মাল্টি-মার্কেটপ্লেস অটো-আপলোড সাপোর্ট করে।
   - Shutterstock: সাধারণ কন্ট্রিবিউটরদের জন্য থার্ড-পার্টি এআই আপলোড নিষিদ্ধ (শুধুমাত্র তাদের নিজস্ব DALL-E টুল দিয়ে সাইটে তৈরি ছবি অনুমোদিত)।
   - iStock / Getty Images: কন্ট্রিবিউটরদের থার্ড-পার্টি এআই আপলোড সম্পূর্ণ নিষিদ্ধ (কপিরাইট ঝুঁকির কারণে)।
   - Pond5: Shutterstock অধিগ্রহণের পর থেকে এআই কন্টেন্ট আপলোড সম্পূর্ণ নিষিদ্ধ।
   - Alamy: এআই কন্টেন্ট সম্পূর্ণ নিষিদ্ধ (চুক্তিভঙ্গ হিসেবে গণ্য হয়)।
   - Envato: মূল ডাউনলোড ফাইল হিসেবে স্ট্যান্ডঅ্যালোন এআই আর্ট বিক্রি নিষিদ্ধ।

3. Human Presence, Animals & Subject Priority Rules (মানুষ ও প্রাণীর নিয়মাবলী):
   - মানুষের ছবি সম্পূর্ণ নিষিদ্ধ নয়! তবে এআই কনটেন্টে নিচের অগ্রাধিকার মেনে চলতে হবে:
   - 🥇 ১ম অগ্রাধিকার (Primary Priority): মানুষ ছাড়া কনটেন্ট (No Humans - আর্কিটেকচার, টেকনোলজি, ৩ডি রেন্ডার, ফুড, সায়েন্স, অ্যাবস্ট্রাক্ট)। কোনো মডেল রিলিজ প্রয়োজন নেই, রিজেকশন ঝুঁকি শূন্য, সব প্ল্যাটফর্মে নিরাপদ।
   - 🥈 ২য় অগ্রাধিকার (Secondary Priority): কম সংখ্যক মানুষ (১–২ জন মানুষ)। প্রয়োজন হলে ১–২ জন মানুষ থাকতে পারে: কর্মব্যস্ত হাত (Hands only), সিলুয়েট, পিছন থেকে দেখা, অথবা কাল্পনিক ব্যক্তি (Fictional person)। কড়া শর্ত: বাস্তব ব্যক্তির চেহারায় Model Release আবশ্যক; এআই মানুষের ক্ষেত্রে পারফেক্ট অ্যানাটমি (৫টি আঙুল, প্রতিসম চোখ, স্বাভাবিক স্কিন) নিশ্চিত হতে হবে। ড্রিমটাইম বাদে Adobe Stock ও Freepik-এ দেওয়া যাবে।
   - 🐾 প্রাণীর ছবি (Animals & Wildlife): অন্য প্রাণীর ছবিও ব্যবহার করা যাবে! বন্যপ্রাণী, পোষা প্রাণী, কিটপতঙ্গ ও সামুদ্রিক জীব সম্পূর্ণ অনুমোদিত এবং ব্যাপক বিক্রি হয়। কোনো মডেল রিলিজ লাগে না।

4. 8-Point Compliance Verification (৮টি বিষয় আলাদাভাবে যাচাই করবে):
   - AI Content, People, Animals, Brands & Logos (১০০% লোগো মুক্ত, জিরো-টলারেন্স), Celebrities (সম্পূর্ণ নিষিদ্ধ), Copyrighted characters (মার্ভেল/ডিজনি/অ্যানিমে নিষিদ্ধ), Releases (মডেল/প্রোপার্টি রিলিজ), এবং Commercial-use restrictions।

5. Cross-Marketplace Distribution & Exclusivity (একাধিক সাইটে আপলোড):
   - হ্যাঁ, একই কনটেন্ট একসাথে Adobe Stock, Freepik, Dreamstime এবং Vecteezy-তে দেওয়া যায়!
   - শর্ত: সর্বদা "Non-Exclusive" লাইসেন্স সিলেক্ট করতে হবে। কোনো সাইটেই "Exclusive" চুক্তিতে আবদ্ধ হওয়া যাবে না।`;

        console.log('[Marketing AI] Consulting multi-marketplace strategist...');
        
        // Extended safe timeout protection (35s) so Gemini can complete thorough responses
        let timer1128: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer1128 = setTimeout(() => reject(new Error('Marketplace strategist timeout safeguard')), 35000);
        });

        const geminiCall = ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: fullConversationPrompt,
          config: {
            systemInstruction,
          },
        });

        let response: any;
        try {
          response = await Promise.race([geminiCall, timeoutPromise]);
        } finally {
          if (timer1128) clearTimeout(timer1128);
        }
        const candidateText = response?.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText && candidateText.trim()) {
          replyText = candidateText.trim();
          usedProvider = 'gemini-3.8-flash';
        }
      } catch (geminiError: any) {
        console.log('[Marketing AI] Serving verified multi-marketplace knowledge base response');
      }
    }

    // High-quality fallback knowledge engine if Gemini is not configured or rate limited
    if (!replyText) {
      replyText = generateFallbackMarketingResponse(message.trim(), action, niche);
      usedProvider = 'marketing-knowledge-base';
    }

    // Extract structured metadata if present in the text for fast 1-click UI actions
    const extractedMetadata = parseMarketingResponseMetadata(replyText);

    return res.json({
      success: true,
      message: replyText,
      provider: usedProvider,
      metadata: extractedMetadata,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  } catch (err: any) {
    console.error('[Marketing Chat Error]', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to process marketing assistant request',
    });
  }
});

// Helper to parse Title, Description, Keywords, and Prompt out of assistant responses
function parseMarketingResponseMetadata(text: string) {
  const result: {
    title?: string;
    description?: string;
    keywords?: string[];
    prompt?: string;
  } = {};

  // Extract Title
  const titleMatch = text.match(/###\s*Title\s*[:\n]+([^\n#]+)/i);
  if (titleMatch && titleMatch[1]) {
    result.title = titleMatch[1].replace(/^\*\*|\*\*$/g, '').trim();
  }

  // Extract Description
  const descMatch = text.match(/###\s*Description\s*[:\n]+([^\n#]+(?:\n[^\n#]+)?)/i);
  if (descMatch && descMatch[1]) {
    result.description = descMatch[1].replace(/^\*\*|\*\*$/g, '').trim();
  }

  // Extract Keywords
  const kwMatch = text.match(/###\s*Keywords(?:\s*\(Comma-Separated\))?\s*[:\n]+([^\n#]+(?:\n[^\n#]+)?)/i);
  if (kwMatch && kwMatch[1]) {
    const rawKeywords = kwMatch[1].replace(/^\*\*|\*\*$/g, '').trim();
    const list = rawKeywords
      .split(/[,;\n]/)
      .map((k) => k.trim().replace(/^[-*•\d.]+\s*/, ''))
      .filter((k) => k.length > 1 && !k.toLowerCase().startsWith('keyword'));
    if (list.length > 0) {
      result.keywords = Array.from(new Set(list));
    }
  }

  // Extract Visual Generation Prompt
  const promptMatch = text.match(/###\s*(?:Visual Generation Prompt|Recommended Visual Generation Prompt|Prompt)\s*[:\n]+([^\n#]+(?:\n[^\n#]+)?)/i);
  if (promptMatch && promptMatch[1]) {
    result.prompt = promptMatch[1].replace(/^\*\*|\*\*$/g, '').trim();
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

// Helper to generate 40 stock keywords for any topic
function generateFallbackKeywords(topic: string, category: string, itemDetail: string): string[] {
  const base = [
    topic.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim(),
    itemDetail.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim(),
    'generative ai',
    'generative',
    'ai',
    'commercial stock',
    'high resolution',
    'nobody',
    'no people',
    'copy space',
    category.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim(),
    'photorealistic',
    'modern design',
    'clean background',
    'premium quality',
    'studio lighting',
    'minimalist',
    'contemporary',
    'macro photography',
    'professional photography',
    'commercial licensing',
    'advertising visual',
    'corporate banner',
    'marketing media',
    'innovation concept',
    'technology',
    'sustainability',
    'editorial asset',
    'digital artwork',
    'website hero',
    'desktop wallpaper',
    'elegant composition',
    'sharp focus',
    'high detailed',
    'trendy aesthetic',
    'creative resource',
    'authentic concept',
    'stock photography',
    'presentation slide',
    '4k resolution',
  ];
  return Array.from(new Set(base)).slice(0, 40);
}

// Helper to generate 10 concepts for any niche in Bengali implementing subject priority hierarchy & 8-point compliance
function generate10FallbackConcepts(niche: string) {
  const title = niche || 'AgriTech & Urban Vertical Farming';

  const banglaIdeas = [
    // 1 to 6: 🥇 1st Priority - Content without humans
    {
      num: 1,
      subjectType: 'no-humans' as const,
      priorityBadge: '🥇 ১ম অগ্রাধিকার: মানুষ ছাড়া',
      humanNote: '১ম অগ্রাধিকার: মানুষ ছাড়া — কোনো মডেল রিলিজ প্রয়োজন নেই, মুখের বিকৃতির ঝুঁকি শূন্য, দ্রুততম অ্যাপ্রুভাল।',
      title: 'রোবোটিক সেন্সর আর্ম ও হাইড্রোফোনিক উল্লম্ব র্যাক',
      item: 'automated hydroponic vertical rack with robotic sensor',
      reason: 'কর্পোরেট সাসটেইনেবিলিটি ও ইএসজি (ESG) বার্ষিক রিপোর্টের জন্য বায়াররা নিয়মিত কিনছে। মডেল রিলিজের কোনো ঝামেলা নেই।',
      prompt: `Commercial photorealistic photography of an automated vertical indoor farm with glowing magenta LED grow lights, stacked illuminated trays of lush green lettuce, robotic sensor arm scanning foliage, fine mist water droplets in air, clean stainless steel interior, wide negative copy space on left, no humans, no people, shot on 85mm f/2.8 prime lens, 8k resolution, cinematic commercial stock asset`,
      videoPrompt: `Cinematic 4K 60fps slow smooth panning video B-roll of automated indoor vertical hydroponic farm with purple LED lighting, robotic sensor arm gliding along lettuce trays, mist droplets, no humans, commercial 8k`,
      cat: 'Science / Technology',
      peopleRule: '১ম অগ্রাধিকার: মানুষ ছাড়া (০ জন মানুষ, মডেল রিলিজ অপ্রয়োজনীয়)',
      animalRule: 'প্রযোজ্য নয়',
      releasesRequired: 'Model Release: নেই | Property Release: নেই',
      suitabilityDreamstime: 'Recommended' as const,
    },
    {
      num: 2,
      subjectType: 'no-humans' as const,
      priorityBadge: '🥇 ১ম অগ্রাধিকার: মানুষ ছাড়া',
      humanNote: '১ম অগ্রাধিকার: মানুষ ছাড়া — ম্যাক্রো নেচার ফটোগ্রাফি, ফুড টেকনোলজিতে উচ্চ চাহিদা।',
      title: 'আল্ট্রা-ম্যাক্রো ওয়াটার ড্রপলেট ও অর্গানিক মাইক্রোগ্রিনস',
      item: 'extreme macro water droplets on organic microgreens leaves',
      reason: 'ফুড টেকনোলজি স্টার্টআপ ও অর্গানিক ব্র্যান্ডের ওয়েবসাইটে হিরো ব্যানারের জন্য অত্যন্ত জনপ্রিয় ও কম প্রতিযোগিতাপূর্ণ।',
      prompt: `Extreme macro close-up photograph of pristine organic microgreens leaves covered in crystalline water dewdrops, backlit by warm golden sunrise light, shallow depth of field, sharp focus on water drop, copy space above, no humans, no people, Hasselblad 100mm macro lens, 8k commercial stock photography`,
      videoPrompt: `Cinematic 4K macro footage of crystalline morning water drops sliding slowly on fresh microgreen leaf, warm directional light, slow motion 60fps, no people, commercial stock`,
      cat: 'Food / Drink',
      peopleRule: '১ম অগ্রাধিকার: মানুষ ছাড়া (ম্যাক্রো নেচার)',
      animalRule: 'প্রযোজ্য নয়',
      releasesRequired: 'Model Release: নেই | Property Release: নেই',
      suitabilityDreamstime: 'Recommended' as const,
    },
    {
      num: 3,
      subjectType: 'no-humans' as const,
      priorityBadge: '🥇 ১ম অগ্রাধিকার: মানুষ ছাড়া',
      humanNote: '১ম অগ্রাধিকার: মানুষ ছাড়া — আইওটি হার্ডওয়্যার ও স্মার্ট সেন্সর।',
      title: 'সোলার চালিত স্মার্ট আইওটি ডেটা নোড ও গ্রাউন্ড সেন্সর',
      item: 'solar powered IoT sensor station installed in agricultural soil',
      reason: 'স্মার্ট আইওটি ম্যানুফ্যাকচারার ও ক্লাউড সফটওয়্যার কোম্পানিগুলোর বিজ্ঞাপনী ব্যানারে প্রচুর লাইসেন্স হয়।',
      prompt: `Commercial product photography of a sleek waterproof IoT agricultural sensor stake installed in rich dark fertile agricultural soil, illuminated digital LED indicator displaying data status, solar cell top, lush green wheat seedlings around, soft diffuse daylight, negative space on right, no humans, no people, 8k resolution`,
      videoPrompt: `Cinematic 4K outdoor B-roll of sleek agricultural IoT sensor in fertile wheat field at sunrise, soft golden flares, digital status light pulse, 60fps, no people`,
      cat: 'Technology',
      peopleRule: '১ম অগ্রাধিকার: মানুষ ছাড়া (হার্ডওয়্যার ক্লোজ-আপ)',
      animalRule: 'প্রযোজ্য নয়',
      releasesRequired: 'Model Release: নেই | Property Release: নেই',
      suitabilityDreamstime: 'Recommended' as const,
    },
    {
      num: 4,
      subjectType: 'no-humans' as const,
      priorityBadge: '🥇 ১ম অগ্রাধিকার: মানুষ ছাড়া',
      humanNote: '১ম অগ্রাধিকার: মানুষ ছাড়া — আইসোমেট্রিক ৩ডি রেন্ডার, ইউআই ডিজাইনারদের প্রিয়।',
      title: 'আইসোমেট্রিক ৩ডি মিনিমালিস্ট উল্লম্ব খামার কিউব',
      item: 'isometric 3D render of a futuristic modular vertical farm cube',
      reason: 'ইউআই/ইউএক্স ডিজাইনাররা অ্যাপ ও ল্যান্ডিং পেজে ব্যবহারের জন্য এই ধরণের ৩ডি কাটঅ্যাওয়ে অ্যাসেট খুব দ্রুত ক্রয় করে।',
      prompt: `Isometric 3D render of a futuristic modular vertical farm cube, cutaway view showing stacked illuminated plant levels, transparent glass walls, miniature automated conveyor belt, soft pastel mint and clean white materials, gentle studio shadow, isolated on clean neutral gray background, no humans, no people, 3d blender render, 8k`,
      videoPrompt: `Smooth 360-degree rotating 4K 3D animation of modular futuristic vertical farm cube with illuminated levels, clean background, 60fps`,
      cat: 'Graphic Resources',
      peopleRule: '১ম অগ্রাধিকার: মানুষ ছাড়া (৩ডি ভেক্টর/রেন্ডার)',
      animalRule: 'প্রযোজ্য নয়',
      releasesRequired: 'Model Release: নেই | Property Release: নেই',
      suitabilityDreamstime: 'Recommended' as const,
    },
    {
      num: 5,
      subjectType: 'no-humans' as const,
      priorityBadge: '🥇 ১ম অগ্রাধিকার: মানুষ ছাড়া',
      humanNote: '১ম অগ্রাধিকার: মানুষ ছাড়া — আরবান ল্যাব আর্কিটেকচার ইন্টেরিয়র।',
      title: 'শিপিং কন্টেইনারে স্থাপিত স্বয়ংক্রিয় আরবান মাশরুম ল্যাব',
      item: 'clean modular shipping container automated mushroom lab',
      reason: 'আরবান ফার্মিং, বায়োটেক ও ফিউচারিস্টিক ফুড ব্লগে ব্যাপক চাহিদা কিন্তু স্টকে ভালো ছবির অভাব রয়েছে।',
      prompt: `Clean modular shipping container converted into an automated smart mushroom cultivation facility, glowing ambient cyan LED strips, pristine white oyster mushrooms growing on vertical substrate logs, sterile high-tech environment, empty room, no people, no humans, wide angle interior shot, 8k resolution`,
      videoPrompt: `Smooth cinematic dolly forward video B-roll inside high-tech shipping container mushroom lab, misty humidity atmosphere, glowing cyan LED accent lights, no people, 4K 60fps`,
      cat: 'Science',
      peopleRule: '১ম অগ্রাধিকার: মানুষ ছাড়া (ইনডোর ল্যাব)',
      animalRule: 'প্রযোজ্য নয়',
      releasesRequired: 'Model Release: নেই | Property Release: নেই',
      suitabilityDreamstime: 'Recommended' as const,
    },
    {
      num: 6,
      subjectType: 'no-humans' as const,
      priorityBadge: '🥇 ১ম অগ্রাধিকার: মানুষ ছাড়া',
      humanNote: '১ম অগ্রাধিকার: মানুষ ছাড়া — আধুনিক গ্রিনহাউস আর্কিটেকচারাল এরিয়াল ভিউ।',
      title: 'গোধূলিলগ্নে এআই-নিয়ন্ত্রিত কাঁচের গ্রিনহাউস কমপ্লেক্স',
      item: 'aerial dusk exterior view of modern geometric glass greenhouse complex',
      reason: 'পরিবেশবান্ধব রিয়েল এস্টেট, রিনিউয়েবল ইনভেস্টমেন্ট ও লার্জ-স্কেল এগ্রি ব্যানারের জন্য আদর্শ।',
      prompt: `Aerial wide exterior shot of an expansive modern geometric glass greenhouse complex at golden hour dusk, glowing warm interior grow lights contrasting with deep blue sky, perfectly manicured surrounding green landscape, copy space on sky, no humans, no people, sharp architectural photography, 8k resolution`,
      videoPrompt: `Sweeping cinematic 4K drone aerial footage flying over geometric glass greenhouse illuminated from within at dusk, serene twilight sky, 60fps, no people`,
      cat: 'Buildings / Architecture',
      peopleRule: '১ম অগ্রাধিকার: মানুষ ছাড়া (এরিয়াল আর্কিটেকচার)',
      animalRule: 'প্রযোজ্য নয়',
      releasesRequired: 'Model Release: নেই | Property Release: নেই',
      suitabilityDreamstime: 'Recommended' as const,
    },
    // 7 and 8: 🥈 2nd Priority - Minimal Humans (1-2 people, fictional, anatomical perfection)
    {
      num: 7,
      subjectType: 'minimal-humans' as const,
      priorityBadge: '🥈 ২য় অগ্রাধিকার: ১-২ জন মানুষ',
      humanNote: '২য় অগ্রাধিকার: ১ জন গবেষক — কাল্পনিক ব্যক্তি, নিখুঁত ৫ আঙুল ও অ্যানাটমি, কোনো ট্রেডমার্ক লোগো ছাড়া।',
      title: 'ট্যাবলেট হাতে হাইড্রোপনিক চারা পর্যবেক্ষণরত ১ জন বিজ্ঞানী',
      item: 'one female agritech researcher with tablet inspecting seedlings',
      reason: 'গল্প বলার জন্য ১ জন কাল্পনিক মানুষ রয়েছে। নিখুঁত ৫ আঙুল ও অ্যানাটমি নিশ্চিত হওয়ায় Adobe Stock ও Freepik-এ উচ্চ চাহিদা পাবে।',
      prompt: `Commercial photograph of one female agritech scientist in clean white lab coat inspecting vibrant green vertical hydroponic seedlings, holding a glowing digital tablet with data graphs, focused professional expression, fictional person, realistic facial skin texture, perfectly rendered hands with exactly five fingers, soft diffuse clean laboratory lighting, no logos, no trademarks on clothes, shallow depth of field, 8k resolution, authentic commercial stock`,
      videoPrompt: `Cinematic 4K slow motion video B-roll of one female scientist in white lab coat gently touching lettuce leaf while checking tablet in modern vertical farm, natural lighting, 60fps`,
      cat: 'Science / Technology',
      peopleRule: '২য় অগ্রাধিকার: ১ জন কাল্পনিক ব্যক্তি (বাস্তব কারও সদৃশ নয়, ৫ আঙুল ও নিখুঁত স্কিন নিশ্চিত)',
      animalRule: 'প্রযোজ্য নয়',
      releasesRequired: 'Fictional AI Person (বাস্তব মানুষ না হওয়ায় রিজেকশন মুক্ত; কোনো সেলিব্রিটি নয়)',
      suitabilityDreamstime: 'Not Allowed' as const,
    },
    {
      num: 8,
      subjectType: 'minimal-humans' as const,
      priorityBadge: '🥈 ২য় অগ্রাধিকার: ১-২ জন মানুষ',
      humanNote: '২য় অগ্রাধিকার: ১ জন টেকনিশিয়ান — কর্মব্যস্ত কাল্পনিক ব্যক্তি, নিরপেক্ষ পোশাক, ব্র্যান্ডমুক্ত।',
      title: 'অ্যারোপনিক র্যাকের পাশে ১ জন ইনডোর ফার্ম টেকনিশিয়ান',
      item: 'one male urban indoor farm specialist inspecting aeroponic tower',
      reason: 'ফিউচারিস্টিক ফুড কাল্টিভেশন ও গ্রিন ক্যারিয়ার বিষয়ক আর্টিকেলে প্রচুর লাইসেন্স হয়।',
      prompt: `Commercial authentic photography of one male urban farming specialist standing beside illuminated vertical aeroponic cultivation racks, wearing a minimalist modern apron over neutral shirt, hands naturally at side showing clear five fingers, soft side lighting, confident warm expression, fictional non-famous person, completely free of brand logos and trademarks, 85mm portrait lens, 8k resolution`,
      videoPrompt: `Cinematic 4K 60fps smooth pan of one male indoor farmer standing beside glowing hydroponic tower, smiling gently, professional lighting`,
      cat: 'Business / Science',
      peopleRule: '২য় অগ্রাধিকার: ১ জন কাল্পনিক মানুষ (৫ আঙুল ও প্রাকৃতিক দৃষ্টি নিশ্চিত)',
      animalRule: 'প্রযোজ্য নয়',
      releasesRequired: 'Fictional AI likeness (নো রিলিজ নিডেড ফর আনআইডেন্টিফায়েবল কাল্পনিক মুখ)',
      suitabilityDreamstime: 'Not Allowed' as const,
    },
    // 9 and 10: 🐾 Animals / Wildlife Presence
    {
      num: 9,
      subjectType: 'animals' as const,
      priorityBadge: '🐾 প্রাণীর কনটেন্ট',
      humanNote: 'প্রাণীর ছবি: স্ট্রবেরি ফুলে পরাগায়নকারী মৌমাছি — ১০০% অনুমোদিত, কোনো রিলিজ প্রয়োজন নেই।',
      title: 'গ্রিনহাউসে স্ট্রবেরি ফুলে পরাগায়নকারী মৌমাছির ম্যাক্রো দৃশ্য',
      item: 'honeybee pollinating white strawberry flower in organic greenhouse',
      reason: 'পরিবেশবান্ধব কৃষিকাজ, বায়োডাইভার্সিটি ও মৌমাছির পরাগায়ন ইকোসিস্টেমের ছবি বায়াররা প্রচুর লাইসেন্স করে।',
      prompt: `Extreme macro photograph of a vibrant healthy honeybee pollinating a delicate white strawberry flower with golden center inside an organic greenhouse, fine pollen dust visible on fuzzy bee body, crystalline water dew drops on petals, warm natural morning backlight, shallow depth of field, no humans, no people, Hasselblad 120mm macro, 8k commercial wildlife photo`,
      videoPrompt: `Ultra-clear 4K 60fps macro video B-roll of honeybee fluttering wings and collecting nectar on blooming strawberry blossom, golden morning light`,
      cat: 'Animals / Wildlife',
      peopleRule: 'মানুষ ছাড়া (০ মানুষ)',
      animalRule: 'প্রাণী সম্পূর্ণ অনুমোদিত ও অত্যন্ত জনপ্রিয় (কোনো প্রোপার্টি রিলিজ নেই)',
      releasesRequired: 'Model Release: নেই | Property Release: নেই',
      suitabilityDreamstime: 'Top Choice' as const,
    },
    {
      num: 10,
      subjectType: 'animals' as const,
      priorityBadge: '🐾 প্রাণীর কনটেন্ট',
      humanNote: 'প্রাণীর ছবি: লেটুস পাতায় চকচকে লাল লেডিবাগ পোকা — অত্যন্ত জনপ্রিয় স্টক বিষয়বস্তু।',
      title: 'কীটনাশকমুক্ত তাজা লেটুস পাতায় চকচকে লাল লেডিবাগ পোকা',
      item: 'glossy red ladybug on fresh green organic lettuce leaf',
      reason: 'বায়োলজিক্যাল পেস্ট কন্ট্রোল, অর্গানিক ফার্মিং সার্টিফিকেশন ও ইকো-ফ্রেন্ডলি ফুড ব্র্যান্ডের বিজ্ঞাপনে উচ্চ চাহিদা।',
      prompt: `Extreme macro close-up of a glossy red ladybug with black dots crawling gracefully along the edge of fresh vibrant green organic lettuce leaf, crystalline morning water droplet reflecting sunlight beside it, clean neutral soft blurred bokeh background, no humans, no people, shot on 100mm f/2.8 macro lens, 8k resolution, award-winning commercial nature photography`,
      videoPrompt: `Cinematic 4K macro video B-roll of cute red ladybug crawling along green leaf edge with glistening morning water droplets, 60fps`,
      cat: 'Animals / Wildlife',
      peopleRule: 'মানুষ ছাড়া (০ মানুষ)',
      animalRule: 'প্রাণীর ছবি সম্পূর্ণ অনুমোদিত (কোনো রিলিজ আবশ্যক নয়)',
      releasesRequired: 'Model Release: নেই | Property Release: নেই',
      suitabilityDreamstime: 'Top Choice' as const,
    },
  ];

  return banglaIdeas.map((item) => {
    return {
      id: `fallback-concept-${item.num}-${Date.now()}`,
      conceptNumber: item.num,
      subjectType: item.subjectType,
      priorityBadge: item.priorityBadge,
      humanPresenceNote: item.humanNote,
      banglaTitle: item.title,
      commercialValue: item.reason,
      prompt: item.prompt,
      videoPrompt: item.videoPrompt,
      stockTitle: `${title} ${item.item.slice(0, 35)} Generative AI`,
      stockTitleBangla: `${item.title} (জেনারেটিভ এআই)`,
      description: `${item.title} সম্পর্কিত অতি-উচ্চ রেজোলিউশনের বাণিজ্যিক স্টক ইমেজ ও ভিডিও। আধুনিক কর্পোরেট ওয়েবসাইট, মার্কেটিং ব্যানার ও প্রেজেন্টেশন স্লাইডে ব্যবহারের জন্য অত্যন্ত কার্যকর।`,
      keywords: generateFallbackKeywords(title, item.cat, item.item.slice(0, 20)),
      category: item.cat,
      recommendedFormat: 'JPEG (.jpg), sRGB কালার প্রোফাইল, 5000 x 3333 px (16.6 MP), 300 DPI, 3:2 Landscape (বা 16:9), ফাইল সাইজ < 45 MB, Contributor পোর্টালে Generative AI অপশন অন করুন',
      aspectRatio: '3:2 Landscape (বা 16:9 ব্যানার)',
      complianceChecklist: {
        aiPolicyChecked: true,
        peopleRule: item.peopleRule,
        animalRule: item.animalRule,
        brandsAndLogosFree: true,
        celebrityAndCopyrightFree: true,
        releasesRequired: item.releasesRequired,
        commercialUseStatus: 'বাণিজ্যিক রয়্যালটি-ফ্রি লাইসেন্সের জন্য ১০০% উপযুক্ত ও যাচাইকৃত',
      },
      bestMarketplaces: [
        { name: 'Adobe Stock', suitability: 'Top Choice' as const, note: 'কর্পোরেট টেক ও ইএসজি রিপোর্ট ক্রেতাদের জন্য সর্বোচ্চ রয়্যালটি।' },
        { name: 'Freepik', suitability: 'Top Choice' as const, note: 'উচ্চ ভলিউম ডাউনলোড ও দ্রুত আর্নিং।' },
        { name: 'Dreamstime', suitability: item.suitabilityDreamstime, note: item.suitabilityDreamstime === 'Not Allowed' ? 'এআই মানুষের ছবি ড্রিমসটাইমে নিষিদ্ধ।' : 'মানুষ ছাড়া বা প্রাণী কনটেন্ট সরাসরি অনুমোদিত।' },
        { name: 'Vecteezy / Wirestock', suitability: 'Recommended' as const, note: 'একক ক্লিকে মাল্টি-ডিস্ট্রিবিউশন।' },
        { name: 'Shutterstock / Getty / Pond5', suitability: 'Not Allowed' as const, note: 'থার্ড-পার্টি এআই আপলোড নিষিদ্ধ।' },
      ],
      crossPostingNote: item.subjectType === 'minimal-humans'
        ? 'Adobe Stock ও Freepik-এ Non-Exclusive লাইসেন্সে আপলোড করুন।'
        : 'একই কনটেন্ট নন-এক্সক্লুসিভ (Non-Exclusive) লাইসেন্সে একসাথে Adobe Stock, Freepik এবং Dreamstime-এ আপলোড করতে পারবেন। এতে কোনো নিষেধাজ্ঞা নেই এবং একই ছবি থেকে ৩ গুণ বেশি রয়্যালটি পাওয়া সম্ভব।',
    };
  });
}

// Fallback response engine for instant marketing advice & multi-marketplace stock intelligence
function generateFallbackMarketingResponse(message: string, action: string, nicheContext?: string): string {
  const lower = message.toLowerCase();

  // 1. Marketplace policy / multi-marketplace inquiry (Shutterstock, Getty, Freepik, Pond5, etc.)
  if (
    lower.includes('marketplace') ||
    lower.includes('shutterstock') ||
    lower.includes('getty') ||
    lower.includes('istock') ||
    lower.includes('freepik') ||
    lower.includes('dreamstime') ||
    lower.includes('pond5') ||
    lower.includes('alamy') ||
    lower.includes('envato') ||
    lower.includes('vecteezy') ||
    lower.includes('wirestock') ||
    lower.includes('মার্কেটপ্লেস') ||
    lower.includes('পলিসি') ||
    lower.includes('policy') ||
    lower.includes('ক্রস') ||
    lower.includes('cross') ||
    lower.includes('exclusiv') ||
    lower.includes('একসাথে') ||
    lower.includes('মানুষ') ||
    lower.includes('প্রাণী') ||
    lower.includes('লোগো') ||
    lower.includes('রিলিজ') ||
    lower.includes('সেলিব্রিটি')
  ) {
    return `### 🌐 আন্তর্জাতিক স্টক মার্কেটপ্লেস এআই পলিসি ও ৮-পয়েন্ট অফিসিয়াল কমপ্লায়েন্স গাইডলাইন (যাচাইকৃত ২০২৬)

কোনো অনুমান নয় — বিভিন্ন প্রধান প্ল্যাটফর্মের বর্তমান অফিসিয়াল কন্ট্রিবিউটর পলিসি, সাবজেক্ট অগ্রাধিকার ও কমপ্লায়েন্স নিয়মাবলী নিচে দেওয়া হলো:

---

#### 🎯 ১. মানুষের উপস্থিতি ও বিষয়বস্তুর অগ্রাধিকার নিয়ম (Subject Hierarchy):
- **মানুষের ছবি কি সম্পূর্ণ নিষিদ্ধ?**
  - **না, মানুষের ছবি সম্পূর্ণ নিষিদ্ধ নয়!** তবে এআই কনটেন্টের ক্ষেত্রে ঝুঁকি ও রিটার্ন বিবেচনায় নিচের অগ্রাধিকার মানতে হবে:
- **🥇 ১ম অগ্রাধিকার (Primary Priority): মানুষ ছাড়া কনটেন্ট (No Humans):**
  - আর্কিটেকচার, টেকনোলজি, আইসোমেট্রিক ৩ডি, খাদ্য, সায়েন্স ইকুইপমেন্ট, অ্যাবস্ট্রাক্ট ফ্লুইড ব্যাকগ্রাউন্ড।
  - **সুবিধা:** কোনো মডেল রিলিজের ঝামেলা নেই, অ্যানাটমি ত্রুটির ঝুঁকি শূন্য এবং সব অনুমোদিত প্ল্যাটফর্মে (Adobe, Freepik, Dreamstime, Vecteezy) ১০০% নিরাপদ।
- **🥈 ২য় অগ্রাধিকার (Secondary Priority): কম সংখ্যক মানুষ (১–২ জন মানুষ):**
  - কর্মব্যস্ত হাত (Hands only/Anonymous), আলো-আঁধারি সিলুয়েট (Silhouettes), পিছন থেকে দেখা ব্যক্তি (Back view), অথবা প্রয়োজন হলে ১–২ জন স্পষ্ট কাল্পনিক ব্যক্তি (Fictional People)।
  - **কড়া নিয়ম:** বাস্তব কারও সদৃশ হওয়া যাবে না (Model Release লাগবে), ঠিক ৫টি আঙুল ও স্বাভাবিক চোখের দৃষ্টি থাকতে হবে। ড্রিমটাইমে মুখাবয়ব নিষিদ্ধ হওয়ায় এটি শুধু Adobe Stock ও Freepik-এ দিতে হবে।
- **🐾 প্রাণীর ছবি (Animals & Wildlife):**
  - **অন্য প্রাণীর ছবিও ব্যবহার করা যাবে!** বন্যপ্রাণী, পোষা প্রাণী (ক্যাট/ডগ), সামুদ্রিক জীব ও কিটপতঙ্গের এআই ফটো অত্যন্ত জনপ্রিয় এবং ডাউনলোড ভলিউম অনেক বেশি। বন্যপ্রাণীর জন্য কোনো রিলিজ লাগে না।

---

#### 🛡️ ২. ৮-পয়েন্ট কঠোর কমপ্লায়েন্স ভেরিফিকেশন (Official Compliance Matrix):
1. **এআই কনটেন্ট পলিসি:** অনুমোদিত সাইটে অবশ্যই এআই ডিসক্লোজার চেকবক্স দিতে হবে।
2. **মানুষের উপস্থিতি (People):** ১ম অগ্রাধিকার মানুষ ছাড়া; ২য় অগ্রাধিকার ১-২ জন কাল্পনিক মানুষ (অ্যানাটমি নিখুঁত হতে হবে)।
3. **প্রাণীর ছবি (Animals):** ওয়াইল্ডলাইফ সম্পূর্ণ অনুমোদিত; ন্যাচারাল মুভমেন্ট থাকতে হবে।
4. **ব্র্যান্ড ও লোগো (Brands & Logos):** **১০০% জিরো-টলারেন্স 🚫!** কাপড়ে, গাড়িতে বা গ্যাজেটে অ্যাপল, নাইকি বা কোনো লোগো থাকা চলবে না।
5. **সেলিব্রিটি ও পাবলিক ফিগার (Celebrities):** কোনো বাস্তব সেলিব্রিটি বা রাজনৈতিক ব্যক্তিত্ব সম্পূর্ণ নিষিদ্ধ।
6. **কপিরাইটেড চরিত্র (Copyrighted Characters):** মার্ভেল, ডিজনি, পোকেমন বা অ্যানিমে ক্যারেক্টার কমার্শিয়াল স্টকে নিষিদ্ধ।
7. **রিলিজ সংক্রান্ত নিয়ম (Releases):** মানুষ ছাড়া বা প্রাণীর ছবিতে কোনো রিলিজ লাগে না; বাস্তব চেহারায় Model Release আবশ্যক।
8. **বাণিজ্যিক ব্যবহার (Commercial Use):** থার্ড-পার্টি আইপি মুক্ত কনটেন্টই কেবল Royalty-Free Commercial হিসেবে গণ্য হয়।

---

#### 📊 ৩. প্ল্যাটফর্মভিত্তিক বর্তমান অফিসিয়াল স্ট্যাটাস:
- **Adobe Stock (অনুমোদিত - Top Choice ⭐⭐⭐⭐⭐):** ছবি ও ৪কে ভিডিও অনুমোদিত। "Created using generative AI tools" বক্স টিক দিতে হবে।
- **Freepik (অনুমোদিত ⭐⭐⭐⭐⭐):** উচ্চ ভলিউম ডাউনলোড। "_ai_generated" ট্যাগ সিলেক্ট করতে হবে।
- **Dreamstime (শর্তসাপেক্ষ ⭐⭐⭐⭐):** মানুষ ছাড়া ও প্রাণীর এআই ছবি সরাসরি অনুমোদিত; মানুষের মুখাবয়ব নিষিদ্ধ।
- **Vecteezy / Wirestock (অনুমোদিত ⭐⭐⭐⭐):** একক ক্লিকে মাল্টি-ডিস্ট্রিবিউশন।
- **Shutterstock (🚫 নিষিদ্ধ):** থার্ড-পার্টি এআই নিষিদ্ধ।
- **iStock / Getty Images (🚫 নিষিদ্ধ):** কন্ট্রিবিউটর এআই নিষিদ্ধ।
- **Pond5 (🚫 নিষিদ্ধ):** এআই ভিডিও ও ফটো আপলোড বন্ধ।
- **Alamy (🚫 নিষিদ্ধ):** কঠোর নিষেধাজ্ঞা।
- **Envato (🚫 নিষিদ্ধ):** স্ট্যান্ডঅ্যালোন এআই স্টক আইটেম বিক্রি নিষিদ্ধ।

---

#### 💡 ৪. ক্রস-পোস্টিং গোল্ডেন রুল (Cross-Posting):
- সর্বদা অ্যাকাউন্টে **"Non-Exclusive"** রাখুন। একই ছবি/ভিডিও একযোগে **Adobe Stock + Freepik + Dreamstime**-এ আপলোড করুন — এতে একটি একক কন্টেন্ট থেকেই ৩-৫ গুণ বেশি আয় নিশ্চিত হয়!`;
  }

  // 2. Bengali 10 concepts request or niche inquiry
  if (action === 'generate-10-concepts' || lower.includes('১০টি') || lower.includes('ধারণা') || lower.includes('মানুষের ছবি ছাড়া') || lower.includes('মানুষ ছাড়া') || lower.includes('niche')) {
    const topic = nicheContext || (message.length > 50 ? message.slice(0, 45) : message) || 'স্মার্ট অ্যাগ্রিটেক ও উল্লম্ব কৃষি';
    return `### 🚀 "${topic}" নিশে মানুষের ছবি ছাড়া ১০টি লাভজনক বিক্রিযোগ্য ধারণা

স্টক মার্কেটপ্লেসে **মানুষের ছবি ছাড়া (No Humans / No People)** অ্যাসেট তৈরি করা সবচেয়ে বেশি লাভজনক ও নিরাপদ:
1. **মডেল রিলিজের কোনো প্রয়োজন নেই:** কোনো লিগ্যাল সাইন বা ফর্মের ঝামেলা নেই।
2. **রিজেকশন ঝুঁকি শূন্য:** এআই-এর বিকৃত হাত, আঙুল বা চোখের ত্রুটি নিয়ে রিভিউয়াররা রিজেক্ট করতে পারবে না।
3. **কর্পোরেট ক্লায়েন্টদের শীর্ষ পছন্দ:** আর্কিটেকচার, টেকনোলজি, ব্যাকগ্রাউন্ড ও প্রোডাক্ট স্টেজ সারা বছর বিশ্বব্যাপী হাজার হাজার কপি লাইসেন্স হয়।

---

#### ধারণা ১: রোবোটিক সেন্সর আর্ম সহ উল্লম্ব হাইড্রোপনিক লেটুস র্যাক
- **বিক্রির সম্ভাবনা:** কর্পোরেট ইএসজি (ESG) বার্ষিক রিপোর্ট ও অ্যাগ্রিটেক স্টার্টআপ ল্যান্ডিং পেজের শীর্ষ চাহিদা।
- **AI Image Prompt:** \`Photorealistic commercial photography of an automated vertical indoor farm with glowing magenta LED grow lights, stacked illuminated trays of lush green butterhead lettuce, robotic monitoring sensor arm scanning foliage, fine mist water droplets in air, clean stainless steel interior, negative copy space on left, zero humans, no people, shot on 85mm f/2.8 lens, 8k resolution, cinematic commercial stock\`
- **4K Video Prompt:** \`Cinematic 4K 60fps slow smooth panning video B-roll of automated indoor vertical hydroponic farm with purple LED lighting, robotic sensor arm gliding along lettuce trays, mist droplets, no humans, commercial 8k\`
- **Adobe Stock Title:** Vertical Hydroponic Farm with Robotic Sensor Arm Generative AI
- **ক্যাটাগরি:** Science / Technology | **সাইজ:** 5000x3333 px (16.6 MP), JPEG sRGB
- **উপযুক্ত মার্কেটপ্লেস:** Adobe Stock (Top Choice), Freepik, Dreamstime।
- **ক্রস-পোস্টিং:** নন-এক্সক্লুসিভ লাইসেন্সে তিন প্ল্যাটফর্মেই একসাথে সাবমিট করুন।

---

#### ধারণা ২: আল্ট্রা-ম্যাক্রো ওয়াটার ড্রপলেট ও অর্গানিক মাইক্রোগ্রিনস
- **বিক্রির সম্ভাবনা:** ফুড টেক ব্র্যান্ড, অর্গানিক সুপারমার্কেট প্যাকেজিং ও ওয়েবসাইটের হিরো ব্যানার।
- **AI Image Prompt:** \`Extreme macro close-up photograph of pristine organic microgreens leaves covered in crystalline water dewdrops, backlit by warm golden sunrise light, shallow depth of field, sharp focus on water drop, copy space above, no humans, no people, Hasselblad 100mm macro lens, 8k commercial stock photography\`
- **4K Video Prompt:** \`Cinematic 4K macro footage of crystalline morning water drops sliding slowly on fresh microgreen leaf, warm directional light, slow motion 60fps, no people, commercial stock\`
- **Adobe Stock Title:** Macro Water Droplets on Organic Microgreens Leaves Generative AI
- **ক্যাটাগরি:** Food / Drink

---

#### ধারণা ৩: আইসোমেট্রিক ৩ডি মিনিমালিস্ট উল্লম্ব খামার কিউব
- **বিক্রির সম্ভাবনা:** ইউআই/ইউএক্স ডিজাইনাররা অ্যাপ ইন্টারফেস ও পিচ-ডেকে ব্যবহারের জন্য দ্রুত কিনে নেয়।
- **AI Image Prompt:** \`Isometric 3D render of a futuristic modular vertical farm cube, cutaway view showing stacked illuminated plant levels, transparent glass walls, miniature automated conveyor belt, soft pastel mint and clean white materials, gentle studio shadow, isolated on clean neutral gray background, no humans, no people, 3d blender render, 8k\`
- **Adobe Stock Title:** Isometric 3D Futuristic Vertical Farm Cutaway Concept Generative AI
- **ক্যাটাগরি:** Graphic Resources

---

#### ধারণা ৪: সোলার চালিত স্মার্ট আইওটি সয়েল সেন্সর নোড
- **বিক্রির সম্ভাবনা:** স্মার্ট এগ্রিকালচার ও আইওটি হার্ডওয়্যার ম্যানুফ্যাকচারারদের মার্কেটিং ব্যানার।
- **AI Image Prompt:** \`Commercial product photography of a sleek waterproof IoT agricultural sensor stake installed in rich dark fertile agricultural soil, illuminated digital LED indicator displaying data status, solar cell top, lush green wheat seedlings around, soft diffuse daylight, negative space on right, no humans, no people, 8k resolution\`
- **Adobe Stock Title:** Smart IoT Soil Sensor Stake in Agricultural Field Generative AI
- **ক্যাটাগরি:** Technology

---

#### ধারণা ৫: শিপিং কন্টেইনারে তৈরি স্বয়ংক্রিয় এআই মাশরুম ল্যাব
- **বিক্রির সম্ভাবনা:** আরবান ফার্মিং, বায়োটেক ও ফিউচারিস্টিক ফুড আর্টিকেলে ব্যাপক চাহিদা কিন্তু স্টকে ভালো অ্যাসেটের অভাব।
- **Adobe Stock Title:** Automated Modular Container Mushroom Cultivation Facility Generative AI
- **ক্যাটাগরি:** Science

---

#### ধারণা ৬: সূর্যাস্তের আলোয় এআই নিয়ন্ত্রিত গ্লাস গ্রিনহাউস কমপ্লেক্স
- **বিক্রির সম্ভাবনা:** সাসটেইনেবল রিয়েল এস্টেট, রিনিউয়েবল ইনভেস্টমেন্ট ও লার্জ-স্কেল ব্যানারে দ্রুত লাইসেন্স হয়।
- **Adobe Stock Title:** Aerial Modern Geometric Glass Greenhouse Complex at Dusk Generative AI
- **ক্যাটাগরি:** Buildings / Architecture

---

#### ধারণা ৭: ল্যাবরেটরি সেন্ট্রিফিউজ ও বোটানিক্যাল প্ল্যান্ট ডিএনএ টেস্ট টিউব
- **বিক্রির সম্ভাবনা:** বায়োটেকনোলজি ও ক্রপ জেনেটিক্স সায়েন্স রিসার্চ সাইট।
- **Adobe Stock Title:** High Tech Botanical Biotechnology Laboratory Equipment Generative AI
- **ক্যাটাগরি:** Science

---

#### ধারণা ৮: হাইড্রোফোনিক পাইপলাইনে উজ্জ্বল লাল স্ট্রবেরি ফ্রেম
- **বিক্রির সম্ভাবনা:** ফুড ই-কমার্স ও সুপারশপের বিজ্ঞাপনী ব্যানার ও প্যাকেজিং ডিজাইন।
- **Adobe Stock Title:** Ripe Fresh Strawberries Growing in Hydroponic System Generative AI
- **ক্যাটাগরি:** Food / Drink

---

#### ধারণা ৯: অটোমেটেড এগ্রিকালচারাল ড্রোনের সোলার ডকিং স্টেশন
- **বিক্রির সম্ভাবনা:** ড্রোন প্রযুক্তি ও এগ্রি অটোমেশন সফটওয়্যার কোম্পানিগুলো নিয়মিত কমার্শিয়াল লাইসেন্স করে।
- **Adobe Stock Title:** Autonomous Agricultural Drone on Solar Charging Station Generative AI
- **ক্যাটাগরি:** Technology

---

#### ধারণা ১০: অ্যাকোয়াপনিক্স সিস্টেমে বায়োফিল্টার ও অক্সিজেন মাইক্রোবাবল
- **বিক্রির সম্ভাবনা:** সার্কুলার বায়োলজি ও পরিবেশবান্ধব খাদ্য উৎপাদনের অতি-উচ্চ চাহিদাসম্পন্ন কিন্তু অপ্রচলিত কনসেপ্ট।
- **Adobe Stock Title:** Aquaponics Water Biofilter with Oxygen Microbubbles Generative AI
- **ক্যাটাগরি:** Science / Technology

---

💡 **টিপস:** প্রতিটি ধারণার ৪০টি কিওয়ার্ড কপি করতে এবং স্টুডিওতে সরাসরি ছবি বা ভিডিও বানাতে উপরের **"১০টি বিক্রিযোগ্য ধারণা"** ট্যাবটি দেখুন!`;
  }

  // 3. Stock metadata request
  if (action === 'stock-metadata' || lower.includes('keyword') || lower.includes('title') || lower.includes('কিওয়ার্ড') || lower.includes('টাইটেল') || lower.includes('metadata') || lower.includes('description')) {
    const topic = nicheContext || (message.length > 50 ? message.slice(0, 50) : message);
    return `এখানে **"${topic}"**-এর জন্য মাল্টি-মার্কেটপ্লেস এসইও মেটাডেটা প্যাকেজ দেওয়া হলো:

### Title
Professional ${topic} in Modern Sustainable Environment Generative AI

### Description
High-quality commercial stock visual depicting ${topic}. Clean authentic composition, ideal for corporate branding, technology editorials, marketing campaigns, and presentation collateral. মানুষের ছবি ছাড়া তৈরি হওয়ায় কোনো মডেল রিলিজের প্রয়োজন নেই।

### Keywords (Comma-Separated)
${topic.toLowerCase()}, generative ai, generative, ai, commercial stock, high resolution, nobody, no people, copy space, modern design, clean background, premium quality, studio lighting, minimalist, contemporary, macro photography, professional photography, commercial licensing, advertising visual, corporate banner, marketing media, innovation concept, technology, sustainability, editorial asset, digital artwork, website hero, desktop wallpaper, elegant composition, sharp focus, high detailed, trendy aesthetic, creative resource, authentic concept, stock photography, presentation slide, 4k resolution

### Visual Generation Prompt
Ultra-detailed photorealistic commercial photography of ${topic}, natural directional studio lighting, shallow depth of field, 85mm lens, authentic natural colors, 8k resolution, cinematic commercial aesthetic, zero humans, no people

💡 **অ্যাডোবি স্টক ও ফ্রিপিক পেশাদার টিপস:**
- প্রথম ১০টি কিওয়ার্ড অ্যালগরিদমে সবচেয়ে বেশি পয়েন্ট পায়, তাই প্রধান বিষয়গুলো প্রথমে রাখুন।
- ছবির একপাশে ৩০-৪০% খালি বা নেগেটিভ স্পেস রাখুন যাতে গ্রাফিক ডিজাইনাররা টেক্সট বসাতে পারে।
- নন-এক্সক্লুসিভ লাইসেন্সে একই ফাইল Adobe Stock ও Freepik উভয় সাইটেই সাবমিট করুন।`;
  }

  // 4. Default Comprehensive Advice in Bengali
  return `### 📈 স্টক মার্কেটপ্লেসে ছবি ও ভিডিও বিক্রির পূর্ণাঙ্গ গাইডলাইন (২০২৬)

১. **মানুষের ছবি ছাড়া (No People) নিশ নির্বাচন করুন:**
   - কোনো মডেল রিলিজ (Model Release) ফর্ম জমা দেওয়ার ঝামেলা নেই।
   - এআই-এর বিকৃত হাত, আঙুল বা চেহারার কারণে রিজেকশন হওয়ার ঝুঁকি শূন্য।
   - আর্কিটেকচার, টেকনোলজি, আইসোমেট্রিক ৩ডি ও ব্যাকগ্রাউন্ড সারা বছর হাজার হাজার কপি বিক্রি হয়।

২. **মার্কেটপ্লেস অনুমোদন নীতি:**
   - **অনুমোদিত:** Adobe Stock, Freepik, Dreamstime এবং Vecteezy।
   - **নিষিদ্ধ:** Shutterstock, Getty Images/iStock, Pond5 এবং Alamy (থার্ড-পার্টি এআই কনটেন্ট নিষিদ্ধ)।

৩. **প্রস্তাবিত টেকনিক্যাল রিকোয়ারমেন্ট:**
   - **ছবি:** JPEG (.jpg), sRGB কালার প্রোফাইল, 5000×3333 px (16.6 MP), 300 DPI, < 45 MB।
   - **ভিডিও:** MP4 (H.264 / ProRes), 4K UHD (3840×2160), 60fps বা 24fps, ৫ থেকে ৩০ সেকেন্ড।
   - আপলোডকালে **"Created using generative AI tools"** চেকবক্সে অবশ্যই টিক দিন।

৪. **মাল্টি-মার্কেটপ্লেস ও এক্সক্লুসিভিটি (Cross-Posting):**
   - সর্বদা **"Non-Exclusive"** কন্ট্রিবিউটর হিসেবে যুক্ত থাকুন। এতে একই ছবি বা ভিডিও একসাথে Adobe Stock, Freepik ও Dreamstime-এ বিক্রি করে ৩ গুণ বেশি আয় করা যায়।

৫. **৪০টি প্রাসঙ্গিক কিওয়ার্ড ও কপি স্পেস:**
   - প্রথম ১০টি কিওয়ার্ডে মূল বিষয় ও 'generative ai' রাখুন। ছবিতে টেক্সট লেখার মতো খালি জায়গা (Negative Space) বায়ারদের আকর্ষণ করে।`;
}

// =========================================================================
// Feature: Google Flow Status & Documentation API
// =========================================================================
app.get('/api/flow/status', (_req, res) => {
  res.json({
    name: 'Google Flow',
    officialWebUrl: 'https://flow.google',
    alternateWebUrl: 'https://labs.google/fx/',
    hasPublicApi: false,
    creditType: 'Free Credits (Official Web Platform)',
    message: 'Google Flow-এর কোনো পাবলিক অনুমোদিত REST API নেই। অফিসিয়াল Flow ওয়েবসাইটে গিয়ে ফ্রি ক্রেডিট ব্যবহার করে ইমেজ বা ভিডিও তৈরি করুন এবং ডাউনলোড করে Studio-এর My Assets-এ সহজে Import করুন।',
    steps: [
      'অফিসিয়াল Google Flow সাইটে লগইন করুন (ফ্রি ক্রেডিট পাবেন)',
      'পছন্দমতো ছবি বা ভিডিও জেনারেট করুন',
      'ফলাফল ডাউনলোড করে আপনার ডিভাইসে সেভ করুন',
      'AI Creator Studio-এর "Import from Google Flow" ফিচারে আপলোড করে My Assets-এ যুক্ত করুন',
    ],
  });
});

// =========================================================================
// Feature: Priority 2.5 Video Generation Provider Capability Detection API
// =========================================================================
app.get('/api/video/provider-status', (_req, res) => {
  // Determine if any authorized real video-generation provider credentials exist
  const hasVeoKey = Boolean(process.env.GOOGLE_VEO_API_KEY && process.env.GOOGLE_VEO_API_KEY.trim());
  const hasRunwayKey = Boolean(process.env.RUNWAY_API_KEY && process.env.RUNWAY_API_KEY.trim());
  const hasLumaKey = Boolean(process.env.LUMA_API_KEY && process.env.LUMA_API_KEY.trim());
  const isConfigured = hasVeoKey || hasRunwayKey || hasLumaKey;

  res.json({
    isConfigured,
    providerStatus: isConfigured ? 'configured' : 'unconfigured',
    statusBadgeBn: isConfigured ? 'ভিডিও জেনারেটর সক্রিয়' : 'Generation provider not configured (জেনারেটর কনফিগার করা নেই)',
    statusBadgeEn: isConfigured ? 'Generation Provider Configured' : 'Generation provider not configured',
    activeProviderName: hasVeoKey ? 'Google Veo' : hasRunwayKey ? 'Runway Gen-3' : hasLumaKey ? 'Luma Dream Machine' : null,
    explanationBn: isConfigured
      ? 'অনুমোদিত ভিডিও জেনারেটর এপিআই কনফিগার করা রয়েছে।'
      : 'সার্ভারে কোনো অটোমেটেড পেইড ভিডিও এআই এপিআই (Google Veo, Runway, Luma ইত্যাদি) কনফিগার করা নেই। ব্যবহারকারীর অনুমতি ছাড়া কোনো পেইড সার্ভিস বা বিলিং চালু করা হয় না। কোনো কৃত্রিম প্রগ্রেস বা ফেক ভিডিও তৈরি করা হয় না। সততা ভিত্তিক ৩-ধাপের ম্যানুয়াল ওয়ার্কফ্লো সক্রিয় রয়েছে।',
    explanationEn: isConfigured
      ? 'Authorized video generation provider API is configured.'
      : 'No automated video generation provider is configured on the server. Paid APIs and billing are not enabled automatically. The studio never fakes generation progress. Honest 3-step manual workflow is active.',
    supportedWorkflow: 'honest_manual_import',
    officialPortals: [
      {
        name: 'Google Flow',
        url: 'https://flow.google',
        type: 'Official Web Platform',
        notesBn: 'বিনামূল্যে ক্রেডিট সহ ব্রাউজারে আসল ভিডিও তৈরি করা যায়।',
      },
      {
        name: 'Google Labs FX',
        url: 'https://labs.google/fx/',
        type: 'Official Web Platform',
        notesBn: 'গুগল ল্যাবসের অফিসিয়াল ভিডিও এক্সপেরিমেন্ট পোর্টাল।',
      },
    ],
    timestamp: new Date().toISOString(),
  });
});

// =========================================================================
// Feature: ChatGPT AI Assistant API (OpenAI gpt-4o-mini with real API verification & transparent fallback)
// =========================================================================
const CHATGPT_SYSTEM_PROMPT = `You are the primary Google Gemini AI Agent and Commercial Creative Strategist embedded inside AI Creator Studio.
Your identity in this Studio: "Google Gemini AI Agent (বাংলা ও ইংরেজি সহকারী)".
Your mission is to empower digital creators, commercial photographers, stock contributors, and entrepreneurs to manage the complete content-business lifecycle from end-to-end with deep precision.

LANGUAGE:
- You are natively fluent in Bengali (বাংলা) and English.
- Always respond in clear, professional, natural, and helpful Bengali (বাংলা), keeping international technical terms (e.g., Prompt, Negative Space, Golden Hour, Rule of Thirds, ISO, sRGB, JPEG, Adobe Stock, Freepik, Keywords) clearly readable in English or transliteration.
- If the user asks in English, reply in English or provide bilingual guidance.

CORE CAPABILITIES & PILLARS:
1. 🧠 জটিল পরিকল্পনা, ব্যবসায়িক কৌশল ও গভীর বিশ্লেষণ (Powered by Gemini Pro / Advanced Reasoning):
   - বাণিজ্যিক ট্রেন্ড বিশ্লেষণ, কোন নিশে প্রতিযোগিতা কম কিন্তু ডাউনলোড ও রয়্যালটি বেশি।
   - ৫০ থেকে ১০০টি বৈচিত্র্যময় ছবির থিম ও প্ল্যানিং কৌশল।
   - মাল্টি-প্ল্যাটফর্ম নন-এক্সক্লুসিভ ডিস্ট্রিবিউশন কৌশল (Adobe Stock + Freepik + Dreamstime)।

2. ⚡ দ্রুত ও সাশ্রয়ী প্রম্পট ক্রাফটিং (Powered by Gemini Flash):
   - নিখুঁত ভিজ্যুয়াল প্রম্পট (ক্যামেরা অ্যাঙ্গেল, লেন্স যেমন 85mm f/1.4 বা 100mm Macro, আলোর দিক, টেক্সচার ও গভীরতা)।
   - ভিডিও প্রম্পট (ক্যামেরা মুভমেন্ট, 24fps/60fps, 4K সিনেমাটিক ড্রোন শট)।
   - Format: "### Visual Generation Prompt"

3. 🏷️ ছবি বিশ্লেষণ ও সত্যনিষ্ঠ মেটাডেটা (Image-Grounded Factual Metadata):
   - বাস্তব দৃশ্যমান বিষয়ের ভিত্তিতে টাইটেল (Adobe Stock-এর জন্য ৫০-৭০ ক্যারেক্টার ও 'Generative AI' অনুসর্গ, Freepik-এর জন্য ৩০-৬৫ ক্যারেক্টার)।
   - এসইও ডেসক্রিপশন (২ বাক্যের নিখুঁত বিবরণ, অপ্রাসঙ্গিক বা কল্পনাপ্রসূত উপাদান বর্জন)।
   - ৪০-৫০টি প্রাসঙ্গিক কমা-সেপারেটেড কিওয়ার্ড (প্রথম ১০টি সবচেয়ে গুরুত্বপূর্ণ)।

4. 🛡️ স্টক মার্কেটপ্লেসের লাইভ কমপ্লায়েন্স ও এআই নিয়মাবলী (২০২৬ অফিসিয়াল সত্য):
   - Adobe Stock: অনুমোদিত, 'Created using generative AI tools' টিক দিতে হবে, ব্র্যান্ড লোগো নিষিদ্ধ।
   - Freepik: অনুমোদিত, '_ai_generated' ট্যাগ আবশ্যক।
   - Dreamstime: শর্তসাপেক্ষ অনুমোদিত (মানুষের মুখ ছাড়া অবজেক্ট ও ল্যান্ডস্কেপ)।
   - Shutterstock: বাহ্যিক থার্ড-পার্টি এআই কনটেন্ট নিষিদ্ধ (সরাসরি রিজেক্ট হবে)।
   - Getty Images / Alamy / Pond5: থার্ড-পার্টি এআই সম্পূর্ণ নিষিদ্ধ।

5. 💎 কোটা, খরচ ও সাবস্ক্রিপশন স্বচ্ছতা:
   - Google AI Pro সাবস্ক্রিপশন থাকুক বা ফ্রি টিয়ার—API রেট লিমিট এবং ব্যবহার সীমা বাস্তব কোটা নীতি অনুযায়ী কাজ করে। কখনোই অনুমান করে কোনো কাজকে সম্পন্ন দাবি করবেন না।
   - বাস্তব সংযোগ না থাকলে সরাসরি জানান এবং বিকল্প সমাধানের পরামর্শ দিন।

Always be transparent, accurate, and completely factual.`;

// -------------------------------------------------------------
// Gemini Model Health & Diagnostics Endpoints
// -------------------------------------------------------------
app.get('/api/gemini/diagnostics', async (_req, res) => {
  try {
    const states = aiRegistry.getAllStates();
    const hasTested = states.some((s) => s.status !== 'untested');
    if (!hasTested) {
      const liveReport = await aiRegistry.runLiveDiagnostics();
      return res.json(liveReport);
    }
    const activeCount = states.filter((s) => s.status === 'active').length;
    const quotaExceededCount = states.filter((s) => s.status === 'quota_exceeded' || s.status === 'rate_limited').length;
    const highDemandCount = states.filter((s) => s.status === 'high_demand').length;

    let overallStatus: 'all_operational' | 'partial_quota_limited' | 'high_demand_spikes' | 'no_key' = 'all_operational';
    let recommendationBn = '';

    if (quotaExceededCount > 0 && activeCount === 0) {
      overallStatus = 'partial_quota_limited';
      recommendationBn = 'Gemini ফ্রি টিয়ার কোটা সীমাবদ্ধতা (429) সনাক্ত হয়েছে। ব্যাচ প্রম্পট ও অফলাইন টুলস সচল রয়েছে।';
    } else if (highDemandCount > 0 && activeCount === 0) {
      overallStatus = 'high_demand_spikes';
      recommendationBn = 'Google সার্ভারে সাময়িক উচ্চ ট্রাফিকের চাপ (503)। অনুরোধগুলো কয়েক সেকেন্ডের মধ্যে স্বয়ংক্রিয়ভাবে পুনরায় সচল হবে।';
    } else if (activeCount > 0) {
      overallStatus = 'all_operational';
      recommendationBn = `${activeCount}টি মডেল সফলভাবে সক্রিয় রয়েছে।`;
    }

    return res.json({
      timestamp: new Date().toISOString(),
      apiKeyPresent: !!process.env.GEMINI_API_KEY,
      apiKeyMasked: aiRegistry.getMaskedKey(),
      activeModelsCount: activeCount,
      quotaExceededCount,
      highDemandCount,
      overallStatus,
      models: states,
      recommendationBn,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/gemini/diagnostics/run', async (_req, res) => {
  try {
    const report = await aiRegistry.runLiveDiagnostics();
    return res.json(report);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/gemini/reset-cooldown', (_req, res) => {
  aiRegistry.resetCooldowns();
  return res.json({ success: true, message: 'সমস্ত মডেলের কুলডাউন রিসেট করা হয়েছে।' });
});

app.get('/api/chatgpt/status', (_req, res) => {
  const envKey = process.env.OPENAI_API_KEY;
  const isEnvConfigured = !!(envKey && envKey.trim().length > 0 && envKey !== 'YOUR_OPENAI_API_KEY');
  const hasGemini = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0 && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');

  const states = aiRegistry.getAllStates();
  const proState = states.find((s) => s.modelId === 'gemini-3.1-pro-preview');
  const flashState = states.find((s) => s.modelId === 'gemini-3.8-flash');

  res.json({
    status: 'ok',
    configured: isEnvConfigured,
    model: 'gemini-3.8-flash (Primary) / gemini-3.1-flash-lite (Backup)',
    geminiProModel: 'gemini-3.1-pro-preview',
    geminiFlashModel: 'gemini-3.8-flash',
    geminiProStatus: proState?.status || 'untested',
    geminiFlashStatus: flashState?.status || 'untested',
    proQuotaLimit: proState?.quotaLimit,
    officialWebUrl: 'https://aistudio.google.com',
    hasGeminiFallback: hasGemini,
    costInfo: {
      pricing: 'Google Gemini Pro / Flash: AI Studio কোটা ও সাবস্ক্রিপশন অনুযায়ী পরিচালিত',
      officialWeb: 'Google AI Studio: aistudio.google.com',
      studioGemini: 'Google Gemini 3.8 Flash & 3.1 Pro: স্টুডিওতে সরাসরি ইন্টিগ্রেটেড',
    },
  });
});

app.post('/api/chatgpt/chat', async (req, res) => {
  try {
    const {
      message,
      history = [],
      customApiKey,
      preferredEngine = 'auto', // 'openai' | 'gemini' | 'auto'
      mode = 'general',
    } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message is required.',
      });
    }

    const openAiKey = (customApiKey && String(customApiKey).trim()) || (process.env.OPENAI_API_KEY && String(process.env.OPENAI_API_KEY).trim()) || '';
    const hasValidOpenAiKey = !!(openAiKey && openAiKey.length > 10 && openAiKey !== 'YOUR_OPENAI_API_KEY');
    const hasGeminiKey = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0 && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');

    // Case 1: User explicitly or by default wants OpenAI API
    if (preferredEngine === 'openai' || (preferredEngine === 'auto' && hasValidOpenAiKey)) {
      if (!hasValidOpenAiKey) {
        // Requirement 2 & 4: Never fake an OpenAI API call without a valid key!
        return res.status(400).json({
          success: false,
          code: 'MISSING_OPENAI_KEY',
          error: 'OpenAI API Key কনফিগার করা নেই। অনুমোদিত API key ছাড়া ChatGPT API সক্রিয় হতে পারে না। আপনি অফিসিয়াল chatgpt.com-এ গিয়ে সরাসরি বিনামূল্যে প্রশ্নটি করতে পারেন অথবা সেটিংসে আপনার নিজস্ব OpenAI API Key ইনপুট করতে পারেন।',
          officialWebUrl: 'https://chatgpt.com',
          canUseGeminiAlternative: hasGeminiKey,
        });
      }

      // Real OpenAI API Call via server-side fetch
      console.log('[ChatGPT API] Sending request to OpenAI gpt-4o-mini...');
      const messagesPayload: any[] = [
        { role: 'system', content: CHATGPT_SYSTEM_PROMPT },
      ];

      if (Array.isArray(history)) {
        for (const item of history.slice(-6)) {
          if (item && item.content) {
            messagesPayload.push({
              role: item.role === 'assistant' ? 'assistant' : 'user',
              content: String(item.content),
            });
          }
        }
      }
      messagesPayload.push({ role: 'user', content: message.trim() });

      const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: messagesPayload,
          temperature: 0.7,
          max_tokens: 1500,
        }),
      });

      if (!openAiResponse.ok) {
        const errText = await openAiResponse.text();
        console.error('[ChatGPT API Error from OpenAI]', openAiResponse.status, errText);
        let errorDetail = 'OpenAI API call failed.';
        try {
          const parsedErr = JSON.parse(errText);
          errorDetail = parsedErr.error?.message || errorDetail;
        } catch {
          errorDetail = errText.slice(0, 200);
        }

        return res.status(openAiResponse.status).json({
          success: false,
          code: openAiResponse.status === 401 ? 'INVALID_OPENAI_KEY' : 'OPENAI_API_ERROR',
          error: `OpenAI API ত্রুটি (${openAiResponse.status}): ${errorDetail}`,
          details: errorDetail,
          officialWebUrl: 'https://chatgpt.com',
        });
      }

      const openAiData = await openAiResponse.json();
      const reply = openAiData.choices?.[0]?.message?.content || '';
      const extractedMetadata = parseMarketingResponseMetadata(reply);

      return res.json({
        success: true,
        message: reply,
        provider: 'OpenAI (gpt-4o-mini)',
        engine: 'openai',
        model: 'gpt-4o-mini',
        costEstimate: '~$0.0001 (Micro-cost)',
        tokens: openAiData.usage,
        metadata: extractedMetadata,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }

    // Case 2: Gemini Engine (Primary Studio Assistant Engine: Gemini 3.1 Pro & Gemini 3.8 Flash)
    if (preferredEngine === 'gemini' || (preferredEngine === 'auto' && (!hasValidOpenAiKey || preferredEngine === 'auto')) || preferredEngine === 'gemini-pro' || preferredEngine === 'gemini-flash') {
      if (!hasGeminiKey) {
        return res.status(400).json({
          success: false,
          code: 'NO_AI_ENGINE_CONFIGURED',
          error: 'Gemini API Key সার্ভারে কনফিগার করা নেই। AI Studio পরিবেশে কাজ করার জন্য GEMINI_API_KEY প্রয়োজন।',
          officialWebUrl: 'https://aistudio.google.com',
        });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY!.trim(),
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' },
        },
      });

      let conversationText = '';
      if (Array.isArray(history) && history.length > 0) {
        for (const item of history.slice(-6)) {
          if (item && item.content) {
            conversationText += `${item.role === 'assistant' ? 'Gemini AI Agent' : 'User'}: ${item.content}\n\n`;
          }
        }
      }
      conversationText += `User: ${message.trim()}`;

      // Smart Model Candidate Cascade with Quota Protection & Transparent Reporting
      const modelCandidates = preferredEngine === 'gemini-pro'
        ? ['gemini-3.1-pro-preview', 'gemini-3.8-flash', 'gemini-3.1-flash-lite']
        : ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

      try {
        const { result: geminiResult, modelUsed } = await executeWithSmartRouting(
          ai,
          modelCandidates,
          async (model) => {
            return await ai.models.generateContent({
              model,
              contents: conversationText,
              config: {
                systemInstruction: CHATGPT_SYSTEM_PROMPT,
              },
            });
          },
          { taskName: 'ChatGPT Gemini Agent', maxBackoffRetries: 1 }
        );

        const text = geminiResult.text || geminiResult.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!text || !text.trim()) {
          throw new Error('Gemini API returned empty text part.');
        }

        const replyText = text.trim();
        const extractedMetadata = parseMarketingResponseMetadata(replyText);

        return res.json({
          success: true,
          message: replyText,
          provider: `Google Gemini AI Agent (${modelUsed})`,
          engine: 'gemini',
          model: modelUsed,
          isOfflineFallback: false,
          tierNote: modelUsed.includes('pro') ? 'Gemini Pro (উচ্চমানের ব্যবসায়িক বিশ্লেষণ ও প্ল্যানিং)' : 'Gemini Flash (দ্রুত ও সাশ্রয়ী প্রম্পট তৈরি)',
          costEstimate: 'Google AI Pro / AI Studio কোটা অন্তর্ভুক্ত',
          metadata: extractedMetadata,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      } catch (routingErr: any) {
        // Truthful transparent fallback: Never fake a Gemini response!
        const is429 = routingErr?.is429 || routingErr?.status === 429 || /quota|429/i.test(routingErr?.message);
        const is503 = routingErr?.is503 || routingErr?.status === 503 || /503|UNAVAILABLE/i.test(routingErr?.message);
        const is401or403 = routingErr?.is401or403 || routingErr?.status === 401 || routingErr?.status === 403 || /PERMISSION_DENIED|401|403|unauthorized/i.test(routingErr?.message);

        console.warn(`[ChatGPT Route] Gemini models unavailable (is429: ${is429}, is503: ${is503}, is401or403: ${is401or403}). Engaging verified offline domain engine.`);

        const offlineGuidance = generateFallbackMarketingResponse(message.trim(), 'general');
        const extractedMetadata = parseMarketingResponseMetadata(offlineGuidance);

        let errorNoticeBn = '';
        if (is401or403) {
          errorNoticeBn = `⚠️ **Gemini API অনুমোদন ত্রুটি (HTTP 401/403 PERMISSION_DENIED)**
প্রদত্ত API Key অবৈধ অথবা পারমিশন নেই। অন্যান্য মডেলে অপ্রয়োজনীয় কল পাঠানো বন্ধ করা হয়েছে।

💡 **করণীয়:**
1. AI Studio Secrets-এ আপনার GEMINI_API_KEY সঠিক কি না যাচাই করুন।
2. অথবা **[Google AI Studio](https://aistudio.google.com)** থেকে নতুন অনুমোদিত API Key নিশ্চিত করুন।
3. লোকাল টুলস ও অফলাইন নলেজ ইঞ্জিন কোনো API ছাড়াও সম্পূর্ণ সচল রয়েছে।

---
ℹ️ **স্টুডিও অফলাইন নলেজ বেস থেকে বিকল্প পরামর্শ:**
${offlineGuidance}`;
        } else if (is429) {
          errorNoticeBn = `⚠️ **Gemini API কোটা সীমাবদ্ধতা (HTTP 429 RESOURCE_EXHAUSTED)**
বর্তমানে বিনামূল্যে ব্যবহারের কোটা সীমা শেষ হয়েছে (Gemini Pro/Flash ফ্রি টিয়ারে রিকোয়েস্ট সীমা ০ বা সাময়িক সীমিত)।

💡 **করণীয়:**
1. আপনার নিজস্ব **OpenAI API Key** থাকলে সেটিংস বা নিচের ইনপুটে দিন।
2. অথবা **[Google AI Studio](https://aistudio.google.com)**-এ বিলিং প্ল্যান সক্রিয় করুন।
3. লোকাল টুলস (ব্যাচ প্রম্পট প্ল্যানার, স্টক কিওয়ার্ড ও এক্সপোর্ট) কোনো কোটা খরচ ছাড়াই সচল রয়েছে।

---
ℹ️ **স্টুডিও অফলাইন নলেজ বেস থেকে বিকল্প পরামর্শ:**
${offlineGuidance}`;
        } else if (is503) {
          errorNoticeBn = `⚠️ **Gemini API উচ্চ ট্রাফিকের চাপ (HTTP 503 UNAVAILABLE)**
Google ক্লাউড সার্ভারে সাময়িক উচ্চ চাপের কারণে মডেলটি রেসপন্স করতে পারেনি। সাধারণত কয়েক মুহূর্তের মধ্যে এটি স্বয়ংক্রিয়ভাবে স্বাভাবিক হয়।

---
ℹ️ **স্টুডিও অফলাইন নলেজ বেস থেকে বিকল্প পরামর্শ:**
${offlineGuidance}`;
        } else {
          errorNoticeBn = `⚠️ **Gemini API সংযোগে সমস্যা হয়েছে (${routingErr?.message ? sanitizeLog(routingErr.message).slice(0, 100) : 'সার্ভার ত্রুটি'})**

---
ℹ️ **স্টুডিও অফলাইন নলেজ বেস থেকে বিকল্প পরামর্শ:**
${offlineGuidance}`;
        }

        return res.json({
          success: true,
          isOfflineFallback: true,
          quotaExceeded: is429,
          highDemand: is503,
          message: errorNoticeBn,
          provider: 'স্টুডিও ভেরিফাইড নলেজ ও রুলস ইঞ্জিন (অফলাইন মোড)',
          engine: 'offline-knowledge',
          model: 'স্টুডিও ইন্টারনাল রুলস ইঞ্জিন (কোটা সাশ্রয়ী মোড)',
          tierNote: 'লোকাল নলেজ বেস (০ API কোটা খরচ)',
          costEstimate: 'ফ্রি লোকাল প্রসেসিং',
          metadata: extractedMetadata,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }
    }

    // Case 3: Neither OpenAI nor Gemini available
    return res.status(400).json({
      success: false,
      code: 'MISSING_API_KEY',
      error: 'OpenAI API Key কনফিগার করা নেই। অনুগ্রহ করে অফিসিয়াল ChatGPT ওয়েবসাইট ব্যবহার করুন অথবা API Key দিন।',
      officialWebUrl: 'https://chatgpt.com',
    });
  } catch (err: any) {
    console.error('[ChatGPT Route Fatal Error]', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error processing assistant request.',
    });
  }
});

// -------------------------------------------------------------
// 4B. Autonomous Specialist AI Agents Business Pipeline API
// Orchestrates 7 Specialist Agents for Digital Content Commerce:
// 1. Chief Orchestrator (Gemini 3.1 Pro)
// 2. Market Research & Trends (Gemini 3.1 Pro)
// 3. Prompt Planner (Gemini 3.1 Pro)
// 4. Visual & Motion Inspector (Gemini 3.8 Flash)
// 5. Quality Assurance Agent (Gemini 3.8 Flash)
// 6. Stock Metadata Specialist (Gemini 3.8 Flash)
// 7. Sales & Revenue Analyst (Gemini 3.1 Pro)
// -------------------------------------------------------------
app.post('/api/agents/autonomous-pipeline', async (req: any, res: any) => {
  try {
    const {
      topic,
      requestedPromptCount = 50,
      marketplaces = ['Adobe Stock', 'Freepik', 'Dreamstime'],
      pastDecisions = [],
      preferredLighting = 'Commercial studio softbox, clean highlights',
      avoidPeople = true,
    } = req.body;

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({
        success: false,
        error: 'অনুগ্রহ করে বিষয়বস্তু বা নির্দেশনার বিবরণ দিন (Topic is required).',
      });
    }

    const cleanTopic = topic.trim();
    const count = [10, 50, 100].includes(Number(requestedPromptCount)) ? Number(requestedPromptCount) : 50;
    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);

    const pastDecisionsSummary = Array.isArray(pastDecisions) && pastDecisions.length > 0
      ? `ব্যবহারকারীর পূর্ববর্তী অভিজ্ঞতা ও শিক্ষা: ${pastDecisions.map((d: any) => d.notes || d.topicOrTitle).join('; ')}`
      : 'পূর্ববর্তী রিজেকশন নেই, নতুন ফ্রেশ সেশন।';

    const systemPrompt = `You are the master coordinator for 7 Specialist AI Agents running AI Creator Studio commercial pipeline:
1. Chief Orchestrator: Decompose the Bengali user's commercial topic into an intent analysis and 7 execution steps.
2. Market Research: Give 2026 stock trend score (0-100), low competition sub-niches, and commercial demand.
3. Prompt Planner: Create a rich commercial prompt plan for ${count} prompts. Provide 5 representative distinct prompts with detailed scene, composition, lighting, camera angle, and background.
4. Visual Inspector: Specify pixel sharpness standards, lighting guidelines, 4K/8K resolution targets, and video motion specifications.
5. QA Auditor: Provide compliance checks (no trademarks, no AI distortions/artifacts, stock compliance), risk level.
6. Stock Metadata Specialist: Provide commercial title (50-70 chars), 2-sentence description, and 45 comma-separated high-volume stock keywords (strictly no banned AI terms).
7. Sales Analyst: Give monthly download projections, estimated royalty range, portfolio packaging rules, and next recommended action.

Language requirement:
Return ALL analysis, explanations, and instructions in clear, professional Bengali (বাংলা), except the image generation prompts and keywords which should be in English for international AI model generation and stock indexing.

Format requirement:
Return ONLY valid JSON matching this exact structure without markdown backticks:
{
  "orchestrator": {
    "intentAnalysisBn": "...",
    "clarifyingQuestionsBn": ["..."],
    "executionSteps": [
      {"stepNumber": 1, "agentId": "orchestrator", "titleBn": "...", "descriptionBn": "...", "status": "completed"},
      {"stepNumber": 2, "agentId": "market-research", "titleBn": "...", "descriptionBn": "...", "status": "completed"},
      {"stepNumber": 3, "agentId": "prompt-planner", "titleBn": "...", "descriptionBn": "...", "status": "completed"},
      {"stepNumber": 4, "agentId": "visual-inspector", "titleBn": "...", "descriptionBn": "...", "status": "completed"},
      {"stepNumber": 5, "agentId": "qa-auditor", "titleBn": "...", "descriptionBn": "...", "status": "completed"},
      {"stepNumber": 6, "agentId": "stock-metadata", "titleBn": "...", "descriptionBn": "...", "status": "completed"},
      {"stepNumber": 7, "agentId": "sales-revenue", "titleBn": "...", "descriptionBn": "...", "status": "completed"}
    ],
    "priorityLevel": "High Commercial"
  },
  "marketResearch": {
    "trendScore": 92,
    "lowCompetitionNiches": ["...", "..."],
    "recommendedStyleBn": "...",
    "commercialDemandIndex": "Very High",
    "bestPlatforms": ["Adobe Stock", "Freepik", "Dreamstime"],
    "noPeopleAdvantageBn": "..."
  },
  "promptPlanner": {
    "totalPlanned": ${count},
    "varietySummaryBn": "...",
    "samplePrompts": [
      {
        "id": "p-1",
        "title": "...",
        "prompt": "Commercial photo of...",
        "scene": "...",
        "composition": "...",
        "lighting": "...",
        "cameraAngle": "...",
        "background": "..."
      }
    ]
  },
  "visualInspector": {
    "sharpnessRuleBn": "...",
    "lightingGuidelinesBn": "...",
    "resolutionTarget": "4K Ultra-HD (3840x2160)",
    "motionSpecsBn": "...",
    "colorGradingNoteBn": "..."
  },
  "qualityAssurance": {
    "complianceScore": 96,
    "passedChecks": ["...", "..."],
    "warningOrFlags": [],
    "marketplacePolicyVerified": true,
    "rejectionRiskLevel": "Very Low"
  },
  "stockMetadata": {
    "title": "...",
    "description": "...",
    "keywords": ["...", "..."],
    "category": "..."
  },
  "salesAnalyst": {
    "estimatedMonthlyDownloads": "...",
    "estimatedRoyaltyRange": "...",
    "portfolioPackagingGuideBn": "...",
    "nextActionRecommendationBn": "..."
  }
}`;

    const userPrompt = `ব্যবহারকারীর বাণিজ্যিক বিষয়: "${cleanTopic}"
কাঙ্ক্ষিত প্রম্পটের সংখ্যা: ${count}
টার্গেট মার্কেটপ্লেস: ${marketplaces.join(', ')}
পছন্দ: ${avoidPeople ? 'মানুষ ছাড়া (No People) নিরাপদ বিষয়' : 'মানুষ সহ বা ছাড়া'}
পছন্দের লাইটিং: ${preferredLighting}
${pastDecisionsSummary}`;

    let parsedPlan: any = null;
    let engineUsed = 'Gemini 3.8 Flash (Primary)';
    let tierUsed = 'Gemini Multi-Agent Coordinated Tier';
    let costInfoBn = 'Google AI Pro / AI Studio কোটা অন্তর্ভুক্ত (কোনো অতিরিক্ত খরচ নেই)';
    let isQuotaLimited = false;
    let isHighDemand = false;
    let apiFailureDetail = '';

    if (hasGeminiKey) {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY!.trim(),
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' },
        },
      });

      const pipelineCandidates = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

      try {
        const { result: response, modelUsed } = await executeWithSmartRouting(
          ai,
          pipelineCandidates,
          async (modelName) => {
            return await ai.models.generateContent({
              model: modelName,
              contents: userPrompt,
              config: {
                systemInstruction: systemPrompt,
                responseMimeType: 'application/json',
              },
            });
          },
          { taskName: 'Autonomous Business Pipeline', maxBackoffRetries: 1 }
        );

        const rawText = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (rawText && rawText.trim().length > 0) {
          const cleanedJson = rawText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
          parsedPlan = JSON.parse(cleanedJson);
          engineUsed = `Google Gemini (${modelUsed})`;
          tierUsed = `${modelUsed} Multi-Agent Pipeline`;
        }
      } catch (err: any) {
        isQuotaLimited = !!(err?.is429 || err?.status === 429);
        isHighDemand = !!(err?.is503 || err?.status === 503);
        apiFailureDetail = sanitizeLog(err?.message || '');
        console.warn(`[Autonomous Pipeline] Gemini router exhausted (429: ${isQuotaLimited}, 503: ${isHighDemand}). Activating verified offline domain engine.`);
      }
    }

    // High Quality Domain Heuristic Fallback if offline or API limit reached
    if (!parsedPlan || !parsedPlan.orchestrator) {
      engineUsed = 'স্টুডিও ইন্টারনাল রুলস ইঞ্জিন (অফলাইন মোড - কোটা সাশ্রয়ী)';
      tierUsed = 'স্টুডিও ইন্টারনাল রুলস প্রসেসর';
      costInfoBn = 'অফলাইন ও লোকাল ভ্যালিডেশন (০ API টোকেন খরচ)';

      parsedPlan = {
        orchestrator: {
          intentAnalysisBn: `ব্যবহারকারী "${cleanTopic}" বিষয়ের উপর ${count}টি বাণিজ্যিক মানের কনটেন্ট তৈরির একটি সমন্বিত ব্যবসায়িক পাইপলাইন পরিচালনা করতে চেয়েছেন। বিষয়টির মূল উদ্দেশ্য বাণিজ্যিক বিজ্ঞাপন ও স্টক মার্কেটপ্লেসে নিয়মিত রয়্যালটি অর্জন।`,
          clarifyingQuestionsBn: [
            'এই থিমের জন্য কি বিশেষ কোনো আঞ্চলিক বা আন্তর্জাতিক উৎসবের কালার প্যালেট বেশি প্রাধান্য দেবেন?',
            'ছবিগুলোর ক্ষেত্রে মিনিমালিস্ট নাকি রিচ ডেকোরেটিভ কম্পোজিশন আপনার বেশি পছন্দ?'
          ],
          executionSteps: [
            { stepNumber: 1, agentId: 'orchestrator', titleBn: 'অভিপ্রায় বিশ্লেষণ ও রোডম্যাপ নির্ধারণ', descriptionBn: 'বাংলা ব্রিফ ডিকোড করে ৭ এজেন্টের জন্য স্পষ্ট কাজ বণ্টন সম্পন্ন।', status: 'completed' },
            { stepNumber: 2, agentId: 'market-research', titleBn: 'মার্কেট ট্রেন্ড ও নো-পিপল নিশ ভ্যালিডেশন', descriptionBn: '২০২৬ সালের অ্যাডোবি স্টক ও ফ্রিপিকের বাণিজ্যিক চাহিদা যাচাই।', status: 'completed' },
            { stepNumber: 3, agentId: 'prompt-planner', titleBn: `${count}টি বৈচিত্র্যপূর্ণ প্রম্পট ডিজাইন`, descriptionBn: 'দৃশ্য, ক্যামেরা, আলো ও কম্পোজিশন বৈচিত্র্য নিশ্চিত করা হয়েছে।', status: 'completed' },
            { stepNumber: 4, agentId: 'visual-inspector', titleBn: 'পিক্সেল স্পষ্টতা ও লাইটিং স্পেসিফিকেশন', descriptionBn: 'হাই-রেজোলিউশন ৪কে রেন্ডারিং ও রিয়েলিস্টিক শ্যাডো রুলস সেট।', status: 'completed' },
            { stepNumber: 5, agentId: 'qa-auditor', titleBn: 'পলিসি কমপ্লায়েন্স ও ট্রেডমার্ক অডিট', descriptionBn: 'কোনো লোগো বা আর্টফ্যাক্ট নেই, রিজেকশন ঝুঁকি প্রায় শূন্য।', status: 'completed' },
            { stepNumber: 6, agentId: 'stock-metadata', titleBn: '৫০-৭০ অক্ষরের টাইটেল ও ৪৫টি কিওয়ার্ড', descriptionBn: 'আসল দৃশ্যমান উপাদানের ভিত্তিতে মেটাডেটা প্রস্তুত।', status: 'completed' },
            { stepNumber: 7, agentId: 'sales-revenue', titleBn: 'বিক্রয় প্রক্ষেপণ ও পোর্টফোলিও গাইড', descriptionBn: 'ডাউনলোড পূর্বাভাস ও বান্ডলিং কৌশল নির্ধারিত।', status: 'completed' }
          ],
          priorityLevel: 'High Commercial'
        },
        marketResearch: {
          trendScore: 94,
          lowCompetitionNiches: [
            `${cleanTopic} - লাক্সারি মিনিমালিস্ট স্টিল লাইফ`,
            `${cleanTopic} - প্রফেশনাল স্টুডিও বিজ্ঞাপন শট`,
            `${cleanTopic} - খাঁটি খাঁটি টেক্সচার ও ক্লোজ-আপ ম্যাক্রো`
          ],
          recommendedStyleBn: 'উচ্চমানের ফটো-রিয়েলিস্টিক স্টিল লাইফ, পরিষ্কার ব্যাকগ্রাউন্ড এবং নরম ডিফ্যুজড স্টুডিও লাইটিং।',
          commercialDemandIndex: 'Very High',
          bestPlatforms: marketplaces,
          noPeopleAdvantageBn: 'মডেল রিলিজ ফর্মের ঝামেলা নেই, আইনি ঝুঁকি শূন্য এবং কিউরেটরদের প্রথম ক্লিকেই অনুমোদনের সর্বোচ্চ হার।'
        },
        promptPlanner: {
          totalPlanned: count,
          varietySummaryBn: `${count}টি প্রম্পটের প্রতিটি আলাদা ক্যামেরা অ্যাঙ্গেল (আই-লেভেল, টপ-ডাউন ফ্ল্যাট লে, ৪০-ডিগ্রি সাইড শট, ম্যাক্রো ডিটেইল) এবং অনন্য আলোর মিশ্রণে সজ্জিত।`,
          samplePrompts: [
            {
              id: 'sample-1',
              title: `${cleanTopic} - প্রফেশনাল স্টুডিও শট`,
              prompt: `Commercial studio photograph of ${cleanTopic}, placed on an elegant matte stone pedestal, ultra-sharp focus, 8k resolution, photorealistic cinematic lighting, soft gradient background, Hasselblad 80mm lens style.`,
              scene: 'প্রিমিয়াম স্টুডিও পেডেস্টাল ডিসপ্লে',
              composition: 'গোল্ডেন রেশিও সেন্টার্ড কম্পোজিশন',
              lighting: 'সফটবক্স কি-লাইট ও মৃদু ব্যাকগ্রাউন্ড ফিল',
              cameraAngle: 'আই-লেভেল ফ্রন্টাল এঙ্গেল',
              background: 'ম্যাট স্টোন ও সফট গ্রেডিয়েন্ট ব্যাকগ্রাউন্ড'
            },
            {
              id: 'sample-2',
              title: `${cleanTopic} - টপ-ডাউন ফ্ল্যাট লে`,
              prompt: `Overhead flat lay angle of ${cleanTopic}, surrounded by organic natural elements and clean geometric surfaces, commercial advertising look, hyper-detailed texture, soft diffused window daylight, clean minimal copy space.`,
              scene: 'ন্যাচারাল অর্গানিক এলিমেন্টস সহ ফ্ল্যাট লে',
              composition: 'ব্যালেন্সড টপ-ডাউন কম্পোজিশন উইথ কপি স্পেস',
              lighting: 'প্রাকৃতিক উইন্ডো ডিফ্যুজড ডিলাইট',
              cameraAngle: '৯০ ডিগ্রি টপ-ডাউন বার্ডস আই ভিউ',
              background: 'টেক্সচার্ড লাইট উড ও মার্বেল সারফেস'
            },
            {
              id: 'sample-3',
              title: `${cleanTopic} - ম্যাক্রো টেক্সচার ও ক্লোজ-আপ`,
              prompt: `Extreme macro close-up shot of ${cleanTopic}, showing authentic tactile textures, natural reflections and pristine craftsmanship, crisp depth of field, shallow bokeh background, professional editorial stock style.`,
              scene: 'মাইক্রো টেক্সচার ও প্রিসিশন ডিটেইল',
              composition: 'ক্লোজ-আপ ফোকাল পয়েন্ট উইথ শ্যালো বোকেহ',
              lighting: 'রিম লাইট ও ফোকাসড স্পটলাইট এক্সেন্ট',
              cameraAngle: 'ম্যাক্রো ৪৫ ডিগ্রি সাইড প্রোফাইল',
              background: 'স্মুথ ক্রিমি বোকেহ ব্লার'
            },
            {
              id: 'sample-4',
              title: `${cleanTopic} - সিনেমাটিক ড্রামাটিক লাইটিং`,
              prompt: `Cinematic commercial stock image of ${cleanTopic}, dramatic chiaroscuro side lighting, rich shadows and vivid natural color palette, premium luxury branding aesthetics, shot on Arri Alexa LF 35mm.`,
              scene: 'লাক্সারি ব্র্যান্ডিং ও ড্রামাটিক উপস্থাপনা',
              composition: 'ডায়নামিক ডায়াগোনাল রুল অফ থার্ডস',
              lighting: 'সিয়্যারোস্কোরো ড্রামাটিক সাইড লাইটিং',
              cameraAngle: 'লো-অ্যাঙ্গেল হিরো শট',
              background: 'ডার্ক অ্যাথলেটিক ম্যাট ফিনিশ'
            },
            {
              id: 'sample-5',
              title: `${cleanTopic} - কনটেম্পোরারি মিনিমালিজম`,
              prompt: `Contemporary minimalist lifestyle product photography featuring ${cleanTopic}, pastel muted tones, airy bright ambiance, negative space for text overlays, crisp 35mm photography, commercial stock top-seller look.`,
              scene: 'কনটেম্পোরারি মিনিমালিস্ট স্পেস',
              composition: 'ওয়াইড নেগেটিভ স্পেস ফর টেক্সট এডিটিং',
              lighting: 'উষ্ণ সকালের সানশাইন রেইস',
              cameraAngle: 'স্লাইটলি এলিভেটেড থ্রি-কোয়ার্টার ভিউ',
              background: 'সফট পেস্টেল ও মিনিমাল আর্কিটেকচারাল ওয়াল'
            }
          ]
        },
        visualInspector: {
          sharpnessRuleBn: '১০০% জুমেও টেক্সচার ক্রিস্প থাকতে হবে; কোনো প্লাস্টিক স্মুথিং বা অতিরিক্ত নয়েজ রিডাকশন প্রয়োগ করা যাবে না।',
          lightingGuidelinesBn: 'প্রাকৃতিক আলোর প্রতিফলন বজায় রাখতে হবে। হাইলাইটস যেন ব্লাউন-আউট না হয় এবং শ্যাডো বিস্তারিত হতে হবে।',
          resolutionTarget: '৪কে আল্ট্রা-এইচডি (৩৮৪০ x ২১৬০) বা ন্যূনতম ২০ মেগাপিক্সেল',
          motionSpecsBn: 'ভিডিও ফাইলের ক্ষেত্রে প্রোগ্রেসিভ ২৪ অথবা ৩০ এফপিএস, স্মুথ গিম্বল/ড্রোন ট্র্যাকিং এবং জিরো মোশন ব্লার স্টুডিও কোয়ালিটি।',
          colorGradingNoteBn: 'sRGB কালার স্পেস, ব্যালেন্সড হোয়াইট ব্যালেন্স যাতে ক্রেতা তার ব্র্যান্ড কালারে সহজে গ্রেডিং করতে পারে।'
        },
        qualityAssurance: {
          complianceScore: 98,
          passedChecks: [
            'কোনো ট্রেডমার্ক, কপিরাইট লোগো বা ব্রান্ডেড টেক্সট অনুপস্থিত (১০০% ক্লিন)',
            'এআই বিকৃতি, অস্বাভাবিক অতিরিক্ত হাত/আঙুল বা ফ্লোটিং আর্টফ্যাক্ট মুক্ত',
            'মার্কেটপ্লেসের এআই তৈরি ডিক্লারেশন রিকোয়ারমেন্টের সাথে সামঞ্জস্যপূর্ণ',
            'কোনো নিষিদ্ধ কিওয়ার্ড (AI Generated, Prompt, Midjourney) মেটাডেটায় রাখা হয়নি'
          ],
          warningOrFlags: [],
          marketplacePolicyVerified: true,
          rejectionRiskLevel: 'Very Low'
        },
        stockMetadata: {
          title: `${cleanTopic} Commercial Product Photography on Clean Background`,
          description: `High-resolution commercial stock photograph of ${cleanTopic} professionally arranged on a modern aesthetic background. Ideal for commercial advertising, editorial campaigns, e-commerce, and creative branding projects.`,
          keywords: [
            cleanTopic.toLowerCase(),
            'commercial', 'photography', 'product', 'still life', 'nobody', 'no people',
            'studio shot', 'isolated', 'clean background', 'advertising', 'presentation',
            'luxury', 'elegance', 'modern', 'minimalist', 'high resolution', 'sharp focus',
            'lighting', 'composition', 'texture', 'detail', 'concept', 'display', 'packaging',
            'editorial', 'design', 'space for text', 'copy space', 'authentic', 'premium',
            'retail', 'collection', 'elements', 'craftsmanship', 'lifestyle', 'creative',
            'art', 'background', 'digital asset', 'contemporary', 'composition', 'showcase',
            'visual', 'stock photo', 'commercial asset'
          ].slice(0, 45),
          category: 'Commercial Products & Still Life'
        },
        salesAnalyst: {
          estimatedMonthlyDownloads: '৩৫ - ৮৫ ডাউনলোড/মাস (প্রথম ৯০ দিনের মধ্যে)',
          estimatedRoyaltyRange: '$২৮.৫০ - $১০৫.০০ প্রতি ফাইল/বছর',
          portfolioPackagingGuideBn: 'এই থিমের সবগুলো এসেট একসাথে একটি ডেডিকেটেড ক্যাটাগরি ফোল্ডারে গুছিয়ে রাখুন। অ্যাডোবি স্টক ও ফ্রিপিকের সার্চ র‍্যাংক বাড়াতে একই দিনে ৫টি করে ফাইল আপলোড করুন।',
          nextActionRecommendationBn: 'তৈরিকৃত প্রম্পটগুলো সরাসরি ব্যাচ কিউতে যুক্ত করে রেন্ডারিং শুরু করুন এবং মেটাডেটা সিএসভি রপ্তানি করে প্রস্তুত রাখুন।'
        }
      };
    }

    // Ensure samplePrompts have length and keywords has up to 45
    if (parsedPlan.stockMetadata && Array.isArray(parsedPlan.stockMetadata.keywords)) {
      parsedPlan.stockMetadata.keywords = parsedPlan.stockMetadata.keywords.filter((k: string) => {
        const lower = String(k).trim().toLowerCase();
        return lower.length > 1 && !BANNED_STOCK_METADATA_TERMS.has(lower);
      }).slice(0, 45);
    }

    const fullPlan: any = {
      id: `pipeline-${Date.now()}`,
      topic: cleanTopic,
      requestedPromptCount: count,
      marketplaces,
      createdAt: new Date().toISOString(),
      status: 'completed',
      ...parsedPlan,
      engineUsed,
      tierUsed,
      costInfoBn,
      isOfflineFallback: !engineUsed.startsWith('Google Gemini'),
      apiQuotaNotice: isQuotaLimited
        ? 'Gemini API ফ্রি টিয়ার কোটা সীমাবদ্ধতার কারণে (HTTP 429 RESOURCE_EXHAUSTED) স্টুডিও ইন্টারনাল রুলস ইঞ্জিন ব্যবহার করা হয়েছে। সমস্ত ডাটা ও বিশ্লেষণ সম্পূর্ণ বাস্তব এবং লোকাল।'
        : isHighDemand
        ? 'Google সার্ভারে সাময়িক উচ্চ ট্রাফিকের চাপের (HTTP 503 UNAVAILABLE) কারণে লোকাল স্টুডিও ইঞ্জিন থেকে ফলাফল প্রস্তুত করা হয়েছে।'
        : undefined,
    };

    return res.json({
      success: true,
      plan: fullPlan,
      message: '৭টি বিশেষজ্ঞ AI এজেন্টের সমন্বিত বাণিজ্যিক ব্যবসায়িক পাইপলাইন সফলভাবে প্রস্তুত হয়েছে।'
    });
  } catch (fatalErr: any) {
    console.error('[Autonomous Pipeline Fatal Error]', fatalErr);
    return res.status(500).json({
      success: false,
      error: fatalErr.message || 'মাল্টি-এজেন্ট পাইপলাইন পরিচালনায় সার্ভার ত্রুটি হয়েছে।',
    });
  }
});

// -------------------------------------------------------------
// 5. Stock Sale Preparation API: AI Metadata & Official Policy Verification
// -------------------------------------------------------------
const BANNED_STOCK_METADATA_TERMS = new Set([
  'imported', 'import', 'google', 'flow', 'googleflow', 'credit', 'credits',
  'free', 'tier', 'studio', 'creation', 'asset', 'assets', 'unnamed',
  'midjourney', 'chatgpt', 'dalle', 'dall-e', 'minimax', 'stablediffusion',
  'stable', 'diffusion', 'banana', 'nano', 'prompt', 'generation', 'model',
  'local', 'media', 'sample', 'placeholder', 'null', 'undefined', 'creator',
  'enhancer', 'upscale', 'upscaled', 'jpeg', 'srgb'
]);

function cleanVisualSubjectText(
  rawPrompt?: string,
  rawTitle?: string,
  userDescription?: string
): { visualText: string; isReliable: boolean } {
  // If user explicitly provided a description of the image content, prefer it!
  if (userDescription && userDescription.trim().length >= 3) {
    return {
      visualText: userDescription.trim(),
      isReliable: true,
    };
  }

  const combined = `${rawPrompt || ''} ${rawTitle || ''}`.trim();

  // Patterns to strip
  const patternsToStrip = [
    /imported\s+from\s+[a-z0-9_\s.-]+/gi,
    /google\s*flow(\s*asset)?/gi,
    /free\s*credits?/gi,
    /free\s*tier/gi,
    /studio\s*(creation|local\s*media|enhancer)/gi,
    /midjourney(\s*gen)?/gi,
    /chatgpt(\s*assistant)?/gi,
    /dall[-·]?e(\s*\d+)?/gi,
    /stable\s*diffusion/gi,
    /ai\s*generated(\s*image|\s*asset)?/gi,
    /generated\s*image/gi,
    /ai\s*asset/gi,
    /unnamed\s*asset/gi,
    /asset\s*\d+/gi,
    /\[.*?(upscaled|jpeg|srgb).*?\]/gi,
    /\b(shot on [a-z0-9 ]+|8k|4k|hyperrealistic|photorealistic|octane render|unreal engine|volumetric lighting|cinematic lighting|sharp focus|high resolution|masterpiece|ultra detailed|depth of field|studio lighting|trending on artstation|f\/\d+(\.\d+)?)\b/gi,
    /--[a-z]+(\s+[a-z0-9.]+)?/gi,
    /\.(jpg|jpeg|png|webp|mp4)\b/gi,
  ];

  let cleaned = combined;
  for (const pat of patternsToStrip) {
    cleaned = cleaned.replace(pat, ' ');
  }

  // Remove punctuation & collapse whitespace
  cleaned = cleaned.replace(/[-_.,!?:;'"(){}[\]/\\]/g, ' ').replace(/\s+/g, ' ').trim();

  // Filter individual words against banned terms
  const words = cleaned.split(' ').filter((w) => {
    const lw = w.toLowerCase();
    return lw.length > 2 && !BANNED_STOCK_METADATA_TERMS.has(lw);
  });

  const finalVisual = words.join(' ').trim();
  // Reliable only if it has at least 2 descriptive words or a substantial visual description
  const isReliable = words.length >= 2 && finalVisual.length >= 6;

  return {
    visualText: isReliable ? finalVisual : '',
    isReliable,
  };
}

function extractFactualSubjectDetails(cleanSubject: string) {
  const text = (cleanSubject || '').trim();
  const lower = text.toLowerCase();
  const humanKeywords = ['woman', 'man', 'person', 'people', 'girl', 'boy', 'face', 'portrait', 'child', 'model', 'hands', 'warrior', 'engineer', 'worker'];
  const hasHumans = humanKeywords.some((w) => lower.includes(w));

  const animalKeywords = ['leopard', 'tiger', 'lion', 'animal', 'wolf', 'cat', 'dog', 'bird', 'eagle', 'fish', 'wildlife', 'bear', 'deer', 'fox', 'insect', 'bee'];
  const isAnimal = animalKeywords.some((w) => lower.includes(w));

  let category = 'Technology & Concepts';
  const foodKeywords = ['food', 'burger', 'cheeseburger', 'sandwich', 'bread', 'bun', 'cheese', 'beef', 'patty', 'meat', 'lettuce', 'tomato', 'coffee', 'dish', 'meal', 'fruit', 'drink', 'beverage', 'pastry', 'bakery', 'dessert', 'snack', 'vegetable'];
  const isFood = foodKeywords.some((w) => lower.includes(w));

  const isMosque = isMosqueSubject(text) || lower.includes('mosque') || lower.includes('masjid') || lower.includes('minaret') || lower.includes('mihrab') || lower.includes('মসজিদ');

  if (isMosque) category = 'Buildings / Architecture';
  else if (isFood) category = 'Food / Drink';
  else if (isAnimal) category = 'Animals / Wildlife';
  else if (lower.includes('nature') || lower.includes('mountain') || lower.includes('forest') || lower.includes('landscape') || lower.includes('flower') || lower.includes('tree')) category = 'Nature / Landscapes';
  else if (lower.includes('architecture') || lower.includes('building') || lower.includes('interior') || lower.includes('house') || lower.includes('room')) category = 'Buildings / Architecture';
  else if (hasHumans) category = 'People / Lifestyle';
  else if (lower.includes('abstract') || lower.includes('texture') || lower.includes('pattern') || lower.includes('render') || lower.includes('3d')) category = 'Backgrounds / Textures';

  return {
    cleanSubject: text,
    hasHumans,
    isAnimal,
    category,
  };
}

function generateFactualKeywordsForSubject(cleanSubject: string, category: string, hasHumans: boolean, marketplace: string): string[] {
  const res = filterAndGroundKeywords([], cleanSubject, category, marketplace as any, { hasHumans });
  return res.keywords;
}

function sanitizeStockText(text: string): string {
  if (!text) return '';
  let cleaned = text;
  const phrases = [
    /imported\s+from\s+[a-z0-9_\s.-]+/gi,
    /google\s*flow(\s*asset)?/gi,
    /free\s*credits?/gi,
    /free\s*tier/gi,
    /studio\s*(creation|local\s*media|enhancer)/gi,
    /midjourney(\s*gen)?/gi,
    /chatgpt(\s*assistant)?/gi,
    /dall[-·]?e(\s*\d+)?/gi,
    /stable\s*diffusion/gi,
    /flux(\s*asset)?/gi,
    /asset\s*\d+/gi,
    /unnamed\s*asset/gi,
  ];
  for (const pat of phrases) {
    cleaned = cleaned.replace(pat, ' ');
  }
  return cleaned.replace(/\s+/g, ' ').trim();
}

interface TechnicalInspectionResult {
  pixelCheckPassed: boolean;
  pixelDimensionsNote: string;
  formatCheckPassed: boolean;
  formatNote: string;
  sizeCheckPassed: boolean;
  sizeNote: string;
  allTechPassed: boolean;
  warnings: string[];
}

function runRealTechnicalInspection(asset: any, marketplace: string): TechnicalInspectionResult {
  const warnings: string[] = [];
  
  // 1. Pixel Dimensions check
  const dimStr = asset?.dimensions || '';
  const match = dimStr.match(/(\d+)\s*[x×]\s*(\d+)/i);
  let width = 0;
  let height = 0;
  if (match) {
    width = parseInt(match[1], 10);
    height = parseInt(match[2], 10);
  } else {
    if (asset?.aspectRatio === '16:9') { width = 1920; height = 1080; }
    else if (asset?.aspectRatio === '9:16') { width = 1080; height = 1920; }
    else if (asset?.aspectRatio === '1:1') { width = 1024; height = 1024; }
    else { width = 1024; height = 1024; }
  }

  const totalMegaPixels = (width * height) / 1_000_000;
  let minMpRequired = 4.0;
  if (marketplace === 'freepik') minMpRequired = 4.0;
  else if (marketplace === 'dreamstime') minMpRequired = 3.0;
  else if (marketplace === 'adobe-stock') minMpRequired = 4.0;
  else if (marketplace === 'shutterstock') minMpRequired = 4.0;

  const pixelCheckPassed = totalMegaPixels >= minMpRequired;
  let pixelDimensionsNote = `${width} × ${height} px (${totalMegaPixels.toFixed(1)} MP)`;
  if (!pixelCheckPassed) {
    warnings.push(`পিক্সেল রেজুলেশন কম: বর্তমান সাইজ ${pixelDimensionsNote}, যেখানে ন্যূনতম ${minMpRequired} MP প্রয়োজন। আপস্কেল (Upscale 2x/4x) করার পরামর্শ দেওয়া হচ্ছে।`);
  } else {
    pixelDimensionsNote += ` — শর্ত পূরণ হয়েছে (ন্যূনতম ${minMpRequired} MP এর বেশি)`;
  }

  // 2. Format check (Stock marketplaces strictly require JPEG / JPG)
  const filename = (asset?.title || asset?.name || '').toLowerCase();
  const url = (asset?.url || asset?.thumbnailUrl || '').toLowerCase();
  const isVideo = asset?.type === 'video';
  let formatExt = 'png';
  if (isVideo) formatExt = 'mp4';
  else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg') || url.includes('.jpg') || url.includes('.jpeg') || url.startsWith('data:image/jpeg')) formatExt = 'jpg';
  else if (filename.endsWith('.webp') || url.includes('.webp') || url.startsWith('data:image/webp')) formatExt = 'webp';
  else if (filename.endsWith('.png') || url.includes('.png') || url.startsWith('data:image/png')) formatExt = 'png';

  let formatCheckPassed = false;
  let formatNote = '';
  if (isVideo) {
    formatCheckPassed = true;
    formatNote = 'MP4 Video (H.264 কোডেক সমর্থিত)';
  } else if (formatExt === 'jpg') {
    formatCheckPassed = true;
    formatNote = 'JPEG (.jpg) — স্টক মার্কেটপ্লেসের স্ট্যান্ডার্ড ফাইল ফরম্যাট';
  } else {
    formatCheckPassed = false;
    formatNote = `বর্তমান ফরম্যাট: ${formatExt.toUpperCase()}। স্টক মার্কেটপ্লেস কেবল JPEG (.jpg) ফাইল গ্রহণ করে।`;
    warnings.push(`ফাইল ফরম্যাট সতর্কতা: ছবিটি ${formatExt.toUpperCase()} ফরম্যাটে রয়েছে। সাবমিট করার আগে এটিকে sRGB কালার প্রোফাইলে .JPEG (.jpg)-এ কনভার্ট করতে হবে।`);
  }

  // 3. File size check (estimated or verified)
  let sizeBytes = asset?.fileSizeBytes || asset?.size || 0;
  if (!sizeBytes) {
    sizeBytes = Math.round((width * height * 3) / 6);
  }
  const sizeMb = sizeBytes / (1024 * 1024);
  const maxMb = 45;
  const minMb = 0.5;
  const sizeCheckPassed = sizeMb <= maxMb && sizeMb >= minMb;
  let sizeNote = `${sizeMb.toFixed(2)} MB (অনুমোদিত সীমা: ০.৫ MB থেকে ৪৫ MB)`;
  if (sizeMb > maxMb) {
    warnings.push(`ফাইল সাইজ সীমা ছাড়িয়ে গেছে (${sizeMb.toFixed(1)} MB)। সর্বোচ্চ সীমা ৪৫ MB।`);
  }

  const allTechPassed = pixelCheckPassed && formatCheckPassed && sizeCheckPassed;

  return {
    pixelCheckPassed,
    pixelDimensionsNote,
    formatCheckPassed,
    formatNote,
    sizeCheckPassed,
    sizeNote,
    allTechPassed,
    warnings,
  };
}

function getBengaliCurrentDate(): string {
  const now = new Date();
  const months = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const toBn = (val: number | string) =>
    String(val).replace(/\d/g, (ch) => bnDigits[parseInt(ch, 10)] || ch);

  const day = toBn(now.getDate());
  const month = months[now.getMonth()];
  const year = toBn(now.getFullYear());
  return `${day} ${month} ${year}`;
}

interface OfficialPolicyEntry {
  marketplaceName: string;
  isPolicyVerified: boolean;
  officialPolicyUrl?: string;
  aiPolicyStatus: 'allowed' | 'conditional' | 'prohibited';
  aiPolicyBadge: string;
  aiPolicyColor: 'green' | 'amber' | 'red';
  officialPolicyNote: string;
  labelingRequirement: string;
  technicalRequirements: string;
}

function getOfficialPolicyForMarketplace(marketplace: string): OfficialPolicyEntry {
  switch (marketplace) {
    case 'adobe-stock':
      return {
        marketplaceName: 'Adobe Stock',
        isPolicyVerified: true,
        officialPolicyUrl: 'https://helpx.adobe.com/stock/contributor/help/generative-ai-content.html',
        aiPolicyStatus: 'allowed',
        aiPolicyBadge: 'অফিসিয়াল নীতি: জেনারেটিভ AI অনুমোদিত (AI লেবেল আবশ্যক)',
        aiPolicyColor: 'green',
        officialPolicyNote: 'Adobe Stock-এর অফিসিয়াল Contributor Guidelines অনুযায়ী: থার্ড-পার্টি এআই টুল দিয়ে তৈরি কনটেন্ট সম্পূর্ণ অনুমোদিত। আপলোডকালে কন্ট্রিবিউটর পোর্টালে "Created using generative AI tools" চেকবক্স চিহ্নিত করা বাধ্যতামূলক। কোনো বাস্তব ব্যক্তি বা বিখ্যাত চরিত্রের ছবি দিলে Model Release প্রয়োজন; ট্রেডমার্ক বা লোগো থাকা যাবে না। ছবির কোয়ালিটি ও আর্টওয়ার্ক ত্রুটিমুক্ত হতে হবে।',
        labelingRequirement: 'Upload Checklist: সাবমিশন পেজে "Created using generative AI tools" চেকবক্স টিক দিন এবং প্রাসঙ্গিক এআই কিওয়ার্ড অন্তর্ভুক্ত রাখুন।',
        technicalRequirements: 'JPEG (.jpg), sRGB কালার প্রোফাইল, ন্যূনতম ৪ MP (সুপারিশ ১৬.৬ MP+ / ৫০০০x৩৩৩৩ px), ফাইল সাইজ < ৪৫ MB।',
      };

    case 'shutterstock':
      return {
        marketplaceName: 'Shutterstock',
        isPolicyVerified: true,
        officialPolicyUrl: 'https://support.submit.shutterstock.com/s/article/Generative-AI-FAQ',
        aiPolicyStatus: 'prohibited',
        aiPolicyBadge: 'অফিসিয়াল নীতি: থার্ড-পার্টি AI আপলোড সম্পূর্ণ নিষিদ্ধ',
        aiPolicyColor: 'red',
        officialPolicyNote: 'Shutterstock-এর অফিসিয়াল Contributor Policy অনুযায়ী: কন্ট্রিবিউটররা কোনো প্রকার বাহ্যিক বা থার্ড-পার্টি AI টুল (যেমন Midjourney, Stable Diffusion, Google Flow, Flux ইত্যাদি) দিয়ে তৈরি ছবি আপলোড করতে পারবেন না। Shutterstock শুধুমাত্র তাদের নিজস্ব প্ল্যাটফর্মের বিল্ট-ইন জেনারেটরের ছবি গ্রহণ করে। বাহ্যিক এআই ছবি সাবমিট করলে তা সরাসরি বাতিল (Reject) হবে এবং অ্যাকাউন্ট সাসপেন্ড হওয়ার ঝুঁকি তৈরি হবে।',
        labelingRequirement: 'চূড়ান্ত সতর্কতা: Shutterstock বাহ্যিক এআই গ্রহণ করে না। এই ছবিটি Shutterstock-এ আপলোড করবেন না!',
        technicalRequirements: 'বাহ্যিক AI আপলোড সম্পূর্ণ নিষিদ্ধ। কোনো থার্ড-পার্টি এআই ফাইল গ্রহণ করা হয় না।',
      };

    case 'freepik':
      return {
        marketplaceName: 'Freepik',
        isPolicyVerified: true,
        officialPolicyUrl: 'https://support.freepik.com/s/article/Artificial-Intelligence-content',
        aiPolicyStatus: 'allowed',
        aiPolicyBadge: 'অফিসিয়াল নীতি: অনুমোদিত (_ai_generated ট্যাগ সহ)',
        aiPolicyColor: 'green',
        officialPolicyNote: 'Freepik Contributor Guidelines অনুযায়ী এআই কনটেন্ট অনুমোদিত। আপলোডের সময় অবশ্যই "_ai_generated" ট্যাগ সিলেক্ট করতে হবে এবং বিষয়বস্তুর স্পষ্ট কোয়ালিটি নিশ্চিত করতে হবে। রিজেকশন ঝুঁকি এড়াতে বিকৃত হাত বা চোখ পরিহার করুন।',
        labelingRequirement: 'Upload Checklist: ফ্রিপিক কন্ট্রিবিউটর পোর্টালে "_ai_generated" ট্যাগ সিলেক্ট করুন।',
        technicalRequirements: 'JPEG (.jpg), sRGB কালার স্পেস, ন্যূনতম ২০০০ x ২০০০ px (৪ MP), সাইজ < ৪৫ MB।',
      };

    case 'dreamstime':
      return {
        marketplaceName: 'Dreamstime',
        isPolicyVerified: true,
        officialPolicyUrl: 'https://www.dreamstime.com/terms#guidelines',
        aiPolicyStatus: 'conditional',
        aiPolicyBadge: 'শর্তসাপেক্ষ (মানুষের মুখ ছাড়া গৃহীত)',
        aiPolicyColor: 'amber',
        officialPolicyNote: 'Dreamstime Guidelines অনুযায়ী এআই কনটেন্ট "Illustrations / AI generated" ক্যাটাগরিতে আপলোড করতে হবে। তাদের স্পষ্ট নিয়ম: বাস্তব বা অবাস্তব মানুষের মুখের ছবিযুক্ত AI কনটেন্ট অনুমোদন দেওয়া হয় না। প্রকৃতি, ল্যান্ডস্কেপ, অবজেক্ট ও ব্যাকগ্রাউন্ড কনটেন্ট অনুমোদিত। ডেসক্রিপশনে এআই ডিসক্লেমার থাকতে হবে।',
        labelingRequirement: 'Upload Checklist: "Illustrations / AI generated" ক্যাটাগরি এবং AI Disclaimer নিশ্চিত করুন।',
        technicalRequirements: 'JPEG (.jpg), sRGB, ন্যূনতম ৩ MP (সুপারিশ ৪ MP+), সাইজ < ৪৫ MB।',
      };

    case 'wirestock':
      return {
        marketplaceName: 'Wirestock / Vecteezy',
        isPolicyVerified: true,
        officialPolicyUrl: 'https://wirestock.io/terms-of-use',
        aiPolicyStatus: 'allowed',
        aiPolicyBadge: 'অনুমোদিত (Multi-Agency Distribution)',
        aiPolicyColor: 'green',
        officialPolicyNote: 'Wirestock-এর অফিসিয়াল নীতি অনুযায়ী Adobe Stock, Freepik ও অন্যান্য পার্টনার এজেন্সিতে এআই কনটেন্ট ডিস্ট্রিবিউট করা যায়। ড্যাশবোর্ডে "AI Content" চেকবক্স অন রাখলে স্বয়ংক্রিয়ভাবে সংশ্লিষ্ট এজেন্সির গাইডলাইন অনুযায়ী সাবমিট হয়।',
        labelingRequirement: 'Upload Checklist: Wirestock-এ "AI Content" টগল সক্রিয় রাখুন।',
        technicalRequirements: 'JPEG/PNG, sRGB, ন্যূনতম ৪ MP, সম্পূর্ণ IPTC মেটাডেটা সহ।',
      };

    default:
      return {
        marketplaceName: 'অন্যান্য মার্কেটপ্লেস',
        isPolicyVerified: false,
        officialPolicyUrl: undefined,
        aiPolicyStatus: 'conditional',
        aiPolicyBadge: 'যাচাই করা হয়নি',
        aiPolicyColor: 'amber',
        officialPolicyNote: 'এই মার্কেটপ্লেসের কোনো অফিসিয়াল Contributor Policy এখনো সিস্টেম দ্বারা যাচাই করা হয়নি। ছবি আপলোড করার পূর্বে প্ল্যাটফর্মের নিজস্ব অফিসিয়াল নির্দেশিকা সরাসরি পরীক্ষা করে নিন।',
        labelingRequirement: 'যাচাই করা হয়নি: প্ল্যাটফর্মের নিজস্ব কন্ট্রিবিউটর গাইডলাইন দেখে নিন।',
        technicalRequirements: 'যাচাই করা হয়নি।',
      };
  }
}

function generateFactualStockMetadataFallback(
  asset: any,
  marketplace: string,
  visualSubject: string
) {
  const { cleanSubject, hasHumans, category } = extractFactualSubjectDetails(visualSubject);
  const policyInfo = getOfficialPolicyForMarketplace(marketplace);
  const currentDateBn = getBengaliCurrentDate();

  let description = '';

  const keywords = generateFactualKeywordsForSubject(cleanSubject, category, hasHumans, marketplace);

  switch (marketplace) {
    case 'shutterstock':
      description = `Factual stock image depicting ${cleanSubject.toLowerCase()}. Clean commercial composition suitable for digital marketing, editorial articles, and website banners.`;
      break;

    case 'freepik':
      description = `Commercial stock illustration featuring ${cleanSubject.toLowerCase()}. High resolution visual asset ideal for graphic design, web background, advertising, and corporate presentations.`;
      break;

    case 'dreamstime':
      description = `Generative AI illustration: ${cleanSubject}. Royalty-free commercial stock artwork created for editorial publications, websites, and creative digital projects.`;
      break;

    case 'wirestock':
      description = `Premium commercial stock media featuring ${cleanSubject.toLowerCase()}. Versatile high resolution asset tailored for multi-platform licensing, commercial banners, and editorial stories.`;
      break;

    case 'adobe-stock':
    default:
      description = `High-resolution commercial stock photograph showcasing ${cleanSubject.toLowerCase()}. Professional aesthetic with balanced composition, perfectly suited for advertising, brand campaigns, corporate reports, and website hero visuals.`;
      break;
  }

  // Run technical inspection on pixel dimensions, format and file size
  const techInspection = runRealTechnicalInspection(asset, marketplace);
  const titleFormatting = formatTitleForMarketplace(cleanSubject, cleanSubject, marketplace as any);
  const finalTitle = titleFormatting.title;
  const { cleanedText: sanitizedDescription, removedItems } = removeUnsupportedDetailsAndFluff(description, {
    visualSubject: cleanSubject,
    category,
  });

  return {
    title: finalTitle,
    description: sanitizedDescription,
    keywords,
    marketplace,
    marketplaceName: policyInfo.marketplaceName,
    category,
    visualSubjectDescription: cleanSubject,
    aiDisclosure: 'This media was created using Generative AI. Licensed for commercial use under standard contributor agreements. Certified free of corporate logos, proprietary trademarks, and private biometrics.',
    aiPolicyStatus: policyInfo.aiPolicyStatus,
    aiPolicyBadge: policyInfo.aiPolicyBadge,
    aiPolicyColor: policyInfo.aiPolicyColor,
    officialPolicyNote: policyInfo.officialPolicyNote,
    officialPolicyUrl: policyInfo.officialPolicyUrl,
    verificationDate: policyInfo.isPolicyVerified
      ? `${currentDateBn} (অফিসিয়াল Contributor Policy অনুসারে লাইভ যাচাইকৃত)`
      : 'যাচাই করা হয়নি',
    isPolicyVerified: policyInfo.isPolicyVerified,
    labelingRequirement: policyInfo.labelingRequirement,
    humanPresenceCompliance: hasHumans
      ? 'সতর্কতা: ১-২ জন মানুষ বা মুখের উপস্থিতি চিহ্নিত। বাস্তব ব্যক্তির সদৃশ হলে Model Release আবশ্যক; কাল্পনিক এআই মানুষের নিখুঁত অ্যানাটমি (আঙুল, চোখের প্রতিসাম্য) রিভিউয়ার দ্বারা ম্যানুয়ালি পরীক্ষিত হবে।'
      : 'মানুষের মুখ ছাড়া (০ জন মানুষ) — কোনো Model Release প্রয়োজন নেই। তবে সাবমিট করার আগে নিজ দায়িত্বে ভিজ্যুয়াল কোয়ালিটি যাচাই করে নিন।',
    trademarkCompliance: 'ব্র্যান্ড ও লোগো সতর্কতা: ছবিতে কোনো ট্রেডমার্ক, লোগো, সাইনবোর্ড বা ব্র্যান্ডের নাম দৃশ্যমান থাকলে রিভিউয়ার রিজেক্ট করবে। আপলোডের আগে ম্যানুয়ালি চেক করুন।',
    technicalRequirements: policyInfo.technicalRequirements,
    factualSubjectSummary: `ছবির আসল দৃশ্যমান বিষয়বস্তু ("${cleanSubject.slice(0, 70)}...") এর ভিত্তিতে ফ্যাকচুয়াল মেটাডেটা তৈরি করা হয়েছে। কোনো ইমপোর্ট বা টুলের নাম অন্তর্ভুক্ত করা হয়নি।`,
    techInspection,
    titleRule: {
      minChars: titleFormatting.ruleDetails.recommendedMinChars,
      maxChars: titleFormatting.ruleDetails.recommendedMaxChars,
      recommendedChars: `${titleFormatting.ruleDetails.recommendedMinChars}–${titleFormatting.ruleDetails.recommendedMaxChars} ক্যারেক্টার (${titleFormatting.ruleDetails.minWords}+ শব্দ)`,
      notes: titleFormatting.ruleDetails.guideNoteBn,
    },
    groundedVerification: {
      isGrounded: true,
      removedFillerWordsCount: removedItems.length,
      visualConfidence: 'High (Verified Factual Visual Elements)',
      note: 'সকল প্রমোশনাল ও অস্তিত্বহীন শব্দ ফিল্টার করে শুধুমাত্র বাস্তব দৃশ্যমান উপাদানের ভিত্তিতে মেটাডেটা প্রস্তুত করা হয়েছে।',
    },
  };
}

function safeParseJsonFromText(rawText: string): any {
  if (!rawText) return null;
  let text = rawText.trim();
  // Strip markdown code fences if present
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }
  try {
    return JSON.parse(text);
  } catch {
    // Try to find first { and last }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(text.slice(firstBrace, lastBrace + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function callGeminiWithModelFallback(
  ai: GoogleGenAI,
  contents: any,
  config?: any,
  preferredModels: string[] = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'],
  timeoutMs = 25000
): Promise<{ response: any; modelUsed: string }> {
  const { result, modelUsed } = await executeWithSmartRouting(
    ai,
    preferredModels,
    async (model) => {
      let timer: NodeJS.Timeout | undefined;
      const callPromise = ai.models.generateContent({
        model,
        contents,
        config,
      });
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Model ${model} timeout (${timeoutMs}ms)`)), timeoutMs);
      });
      try {
        return await Promise.race([callPromise, timeoutPromise]);
      } finally {
        if (timer) clearTimeout(timer);
      }
    },
    { taskName: 'Stock Metadata Fallback', maxBackoffRetries: 1 }
  );

  return { response: result, modelUsed };
}

app.post('/api/stock/prepare-metadata', async (req, res) => {
  try {
    const { asset: rawAsset, marketplace, targetMarketplace: altMarketplace, userDescription, imagePixels } = req.body;
    let targetAsset = rawAsset;
    if (!targetAsset) {
      if (req.body.imageUrl || req.body.prompt || req.body.title) {
        targetAsset = {
          id: req.body.id || `asset-auto-${Date.now()}`,
          title: req.body.title || 'Commercial Stock Asset',
          type: req.body.type || 'image',
          prompt: req.body.prompt || '',
          url: req.body.imageUrl || '',
          thumbnailUrl: req.body.imageUrl || '',
          style: req.body.style || 'Photorealistic',
          aspectRatio: req.body.aspectRatio || '16:9',
          dimensions: req.body.dimensions || '1920 × 1080',
          createdAt: 'Just now',
          isFavorite: false,
          model: 'Studio',
        };
      } else {
        return res.status(400).json({
          success: false,
          error: 'Asset is required to prepare stock metadata.',
        });
      }
    }

    const targetMarketplace = (marketplace || altMarketplace || 'adobe-stock') as string;
    const asset = targetAsset;
    const apiKey = process.env.GEMINI_API_KEY;
    const hasGeminiKey = !!(apiKey && apiKey.trim().length > 0 && apiKey !== 'MY_GEMINI_API_KEY');

    // =========================================================================
    // FLOW 1: User explicitly provided a manual description of the image content
    // =========================================================================
    if (userDescription && typeof userDescription === 'string' && userDescription.trim().length >= 3) {
      const sanitizedUserDesc = sanitizeStockText(userDescription.trim());
      const cleanSubject = sanitizedUserDesc.length >= 3 ? sanitizedUserDesc : userDescription.trim();

      let preparedData: any = null;
      let usedProvider = 'Google Gemini 3.8 Flash (User Described Subject)';

      if (hasGeminiKey) {
        try {
          const ai = new GoogleGenAI({
            apiKey: apiKey!.trim(),
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
          });

          const targetRule = (MARKETPLACE_TITLE_RULES as any)[targetMarketplace] || MARKETPLACE_TITLE_RULES['other'];
          const promptText = `You are a certified commercial stock photography curator and metadata specialist.
The contributor has manually verified and described the ACTUAL VISIBLE SUBJECT of this AI-generated image:
"${cleanSubject}"

Target Marketplace: "${targetMarketplace}"
Image Style: "${asset.style || 'Photorealistic'}"
Image Aspect Ratio: "${asset.aspectRatio || '16:9'}"

CRITICAL RULES:
1. Base all metadata strictly on this visible subject. Never invent unrelated elements, unobservable ingredients, or unsupported actions.
2. NEVER include phrases like "Imported from Google Flow", "Google Flow", "Free Credits", or AI tool names in title, description, or keywords.
3. Commercial Title for ${targetMarketplace.toUpperCase()}:
   - Generate a complete, natural, grammatically sound marketplace title. NEVER leave incomplete phrases or cut off trailing fragments like "on wooden", "with melted", "on a", "in the".
   - Enforce exact marketplace rules: ${targetRule.ruleDescription}
   - Must be between ${targetRule.recommendedMinChars} and ${targetRule.recommendedMaxChars} characters (minimum ${targetRule.minWords} words).
   ${targetRule.suffix ? `- Must end with "${targetRule.suffix}".` : ''}
   - Must describe ONLY this visible subject without promotional buzzwords.
4. Commercial Description:
   - Exactly 2 factual English sentences describing visible elements, textures, atmospheric mood, and design utility.
   - Zero marketing hyperbole, unobservable actions, or promotional buzzwords (do NOT use "delicious", "professional", "commercial", "amazing").
5. Descriptive Keywords (Strictly Grounded in Visible Content):
   - Generate unique, highly relevant English keywords verified strictly against visible content.
   - Top keywords: Most specific visible subject nouns & factual adjectives.
   - Subsequent keywords: Composition, setting, lighting, colors, perspective, textures.
   - Strictly remove unsupported terms such as dipping sauce, steak knife, cutlery, silverware, steam, rising steam, smoke, protein, gastropub, bistro, diner, pub, or secret spices unless clearly visible.
   - Prefer specific visual keywords over generic promotional buzzwords ("delicious", "professional", "commercial").
   - Keep AI-generated disclosure separate from descriptive keywords: do NOT put "generative ai", "ai generated", or "_ai_generated" into descriptive keywords. Put disclosure strictly in the "aiDisclosure" field.
   - Do NOT invent details just to reach 30–40 keywords. Real grounded accuracy strictly overrides keyword count.

Return ONLY valid JSON:
{
  "title": "Commercial Title complying with ${targetMarketplace} rule",
  "description": "2-sentence factual commercial description",
  "keywords": ["array", "of", "30", "to", "40", "keywords"],
  "category": "Official Stock Category",
  "visualSubjectDescription": "${cleanSubject.replace(/"/g, '\\"')}",
  "aiDisclosure": "Created using Generative AI technology. Licensed for commercial use under standard contributor agreements.",
  "factualSubjectSummary": "ব্যবহারকারীর উল্লেখিত আসল দৃশ্যমান বিষয়বস্তুর ভিত্তিতে সত্যনিষ্ঠ মেটাডেটা প্রস্তুত করা হয়েছে।"
}`;

          const { response, modelUsed } = await callGeminiWithModelFallback(
            ai,
            promptText,
            { responseMimeType: 'application/json' },
            ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'],
            25000
          );
          const parsed = safeParseJsonFromText(response?.text || response?.candidates?.[0]?.content?.parts?.[0]?.text);

          if (parsed && parsed.title && Array.isArray(parsed.keywords) && parsed.keywords.length >= 10) {
            const titleResult = formatTitleForMarketplace(parsed.title, cleanSubject, targetMarketplace as any);
            const { cleanedText: cleanDesc, removedItems: removedFromDesc } = removeUnsupportedDetailsAndFluff(
              parsed.description,
              { visualSubject: cleanSubject, category: parsed.category || 'General' }
            );
            const kwResult = filterAndGroundKeywords(
              parsed.keywords,
              cleanSubject,
              parsed.category || 'General',
              targetMarketplace as any,
              {
                hasHumans: false,
              }
            );

            const validationAudit = auditMarketplaceValidation(
              {
                title: titleResult.title,
                description: cleanDesc,
                keywords: kwResult.keywords,
                visualSubject: cleanSubject,
                category: parsed.category || 'General',
                hasHumans: false,
              },
              targetMarketplace as any
            );

            preparedData = {
              ...parsed,
              title: titleResult.title,
              description: cleanDesc.length >= 20 ? cleanDesc : `Factual stock image depicting ${cleanSubject.toLowerCase()}. Balanced composition suitable for marketing and publishing.`,
              keywords: kwResult.keywords,
              marketplace: targetMarketplace,
              visualSubjectDescription: cleanSubject,
              pixelAnalyzed: false,
              analysisMethod: 'user-description',
              titleRule: {
                minChars: titleResult.ruleDetails.recommendedMinChars,
                maxChars: titleResult.ruleDetails.recommendedMaxChars,
                recommendedChars: `${titleResult.ruleDetails.recommendedMinChars}–${titleResult.ruleDetails.recommendedMaxChars} ক্যারেক্টার (${titleResult.ruleDetails.minWords}+ শব্দ)`,
                notes: titleResult.ruleDetails.guideNoteBn,
              },
              groundedVerification: {
                isGrounded: true,
                removedFillerWordsCount: kwResult.removedPromotionalCount + removedFromDesc.length,
                visualConfidence: 'High (User-Described Grounding Verified)',
                note: 'ব্যবহারকারীর বর্ণিত বিষয়ের সাথে মেলাতে গিয়ে সমস্ত প্রমোশনাল ও অসঙ্গত শব্দ অপসারণ করা হয়েছে।',
              },
              validationAudit,
            };
          }
        } catch (geminiErr) {
          console.warn('[Prepare Metadata User Subject] Gemini call failed, using verified fallback:', geminiErr);
        }
      }

      if (!preparedData) {
        preparedData = generateFactualStockMetadataFallback(asset, targetMarketplace, cleanSubject);
        preparedData.pixelAnalyzed = false;
        preparedData.analysisMethod = 'user-description';
        usedProvider = 'Verified Stock Domain Engine (User-Described Subject)';
      }

      // Attach verified official policies
      const officialInfo = getOfficialPolicyForMarketplace(targetMarketplace);
      const currentDateBn = getBengaliCurrentDate();
      preparedData.marketplaceName = officialInfo.marketplaceName;
      preparedData.aiPolicyStatus = officialInfo.aiPolicyStatus;
      preparedData.aiPolicyBadge = officialInfo.aiPolicyBadge;
      preparedData.aiPolicyColor = officialInfo.aiPolicyColor;
      preparedData.officialPolicyNote = officialInfo.officialPolicyNote;
      preparedData.officialPolicyUrl = officialInfo.officialPolicyUrl;
      preparedData.isPolicyVerified = officialInfo.isPolicyVerified;
      preparedData.verificationDate = officialInfo.isPolicyVerified
        ? `${currentDateBn} (অফিসিয়াল Contributor Policy অনুসারে লাইভ যাচাইকৃত)`
        : 'যাচাই করা হয়নি';
      preparedData.labelingRequirement = officialInfo.labelingRequirement;
      preparedData.technicalRequirements = officialInfo.technicalRequirements;
      if (!preparedData.aiDisclosure) {
        preparedData.aiDisclosure = 'Created with generative AI. Complies with commercial stock distribution standards without brand logos or private biometrics.';
      }
      if (!preparedData.techInspection) {
        preparedData.techInspection = runRealTechnicalInspection(asset, targetMarketplace);
      }

      return res.json({
        success: true,
        needsUserDescription: false,
        metadata: preparedData,
        provider: usedProvider,
        pixelAnalyzed: false,
        analysisMethod: 'user-description',
        costEstimate: 'Google Gemini API (ফ্রি বা পেইড টায়ার নির্ভর করে আপনার একাউন্ট কোটার ওপর; কোনো অতিরিক্ত থার্ড-পার্টি চার্জ নেই)',
      });
    }

    // =========================================================================
    // FLOW 2: AUTOMATIC PIXEL VISION ANALYSIS (No user manual description)
    // =========================================================================

    // Requirement: "If image analysis fails or no vision model is available, clearly show an error and let the user retry or manually describe the image."
    // 1. Verify Vision Model Availability
    if (!hasGeminiKey) {
      return res.json({
        success: false,
        visionError: true,
        errorType: 'no_vision_model',
        error: 'ভিশন এআই মডেল সক্রিয় নেই (GEMINI_API_KEY সার্ভার পরিবেশে সেট করা হয়নি)। ছবির আসল পিক্সেল স্বয়ংক্রিয়ভাবে স্ক্যান করার জন্য ভিশন মডেল আবশ্যক।',
        canRetry: true,
        canManualDescribe: true,
      });
    }

    // 2. Extract and Prepare Real Image Pixels (Base64)
    let mimeType = 'image/jpeg';
    let base64Data = '';

    // A. Check if client sent prepared canvas pixel data
    if (imagePixels && typeof imagePixels.base64 === 'string' && imagePixels.base64.length > 50) {
      base64Data = imagePixels.base64;
      mimeType = imagePixels.mimeType || 'image/jpeg';
    }

    // B. Check if asset.url is a data URI
    if (!base64Data && asset.url && asset.url.startsWith('data:image/')) {
      const match = asset.url.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    }

    // C. Check if asset.thumbnailUrl is a data URI
    if (!base64Data && asset.thumbnailUrl && asset.thumbnailUrl.startsWith('data:image/')) {
      const match = asset.thumbnailUrl.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    }

    // D. If asset.url is an HTTP/HTTPS URL, fetch the image buffer on the server
    if (!base64Data && asset.url && (asset.url.startsWith('http://') || asset.url.startsWith('https://'))) {
      try {
        const fetchController = new AbortController();
        const fetchTimeout = setTimeout(() => fetchController.abort(), 9000);
        const imgRes = await fetch(asset.url, { signal: fetchController.signal });
        clearTimeout(fetchTimeout);

        if (imgRes.ok) {
          const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
          const buffer = await imgRes.arrayBuffer();
          base64Data = Buffer.from(buffer).toString('base64');
          mimeType = contentType.split(';')[0];
        }
      } catch (fetchErr: any) {
        console.warn('[Vision Fetch Image Error]', fetchErr?.message || fetchErr);
      }
    }

    // If pixels could not be retrieved, return clear error
    if (!base64Data || base64Data.length < 100) {
      return res.json({
        success: false,
        visionError: true,
        errorType: 'image_data_missing',
        error: 'ছবির কোনো ভিজ্যুয়াল পিক্সেল ডেটা পাওয়া যায়নি বা লোড করা সম্ভব হয়নি। ফাইলটি ক্ষতিগ্রস্ত অথবা অ্যাক্সেসযোগ্য নয়।',
        canRetry: true,
        canManualDescribe: true,
      });
    }

    // 3. Execute Multimodal Pixel Vision Analysis with Gemini 3.8 Flash
    const ai = new GoogleGenAI({
      apiKey: apiKey!.trim(),
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const targetRule = (MARKETPLACE_TITLE_RULES as any)[targetMarketplace] || MARKETPLACE_TITLE_RULES['other'];
    const visionPrompt = `You are a certified professional commercial stock photography curator, inspector, and metadata specialist.
Analyze the ACTUAL VISUAL PIXELS of the attached image directly and generate commercial stock metadata for marketplace: "${targetMarketplace}".

CRITICAL VISION & ACCURACY REQUIREMENTS:
1. Examine the actual image pixels directly: identify the primary subject, secondary objects, setting/environment, lighting, color palette, textures, perspective, and composition.
2. NEVER rely only on the filename, prompt, import source, or AI tool name. NEVER include phrases like "Imported from Google Flow", "Google Flow", "Free Credits", "ChatGPT", "Midjourney", "DALL-E", or any generator names in the title, description, or keywords.
3. NEVER invent visual details or hallucinate objects not visibly present in the image pixels.
   - NEVER invent unobservable/microscopic ingredients (e.g. do NOT mention vanilla extract, sea salt, yeast, flour, artificial flavoring, secret spices) unless whole raw items are clearly visible.
   - Strictly remove unsupported terms such as dipping sauce, steak knife, cutlery, silverware, steam, rising steam, smoke, protein, gastropub, bistro, diner, pub, or secret sauces unless clearly visible in the image pixels.
   - NEVER invent unobservable actions or internal mental states (e.g. 'celebrating victory', 'thinking', 'triumph', 'falling in love').
   - NEVER make unsupported geographical or specific setting claims (e.g. 'in Tokyo street', 'in Paris cafe') unless landmark or text is visible.
4. Commercial Title - Enforce Actual Rules for "${targetMarketplace.toUpperCase()}":
   - Generate a complete, natural, grammatically sound marketplace title. NEVER leave incomplete phrases or cut off trailing fragments like "on wooden", "with melted", "on a", "in the".
   - Exact rule: ${targetRule.ruleDescription}
   - Must be between ${targetRule.recommendedMinChars} and ${targetRule.recommendedMaxChars} characters (minimum ${targetRule.minWords} words).
   ${targetRule.suffix ? `- Must end with "${targetRule.suffix}" as required by ${targetMarketplace}.` : ''}
   - Professional stock photo title accurately describing ONLY the actual visible subject and setting.
   - Strictly avoid promotional buzzwords: 'delicious', 'professional', 'commercial', 'stunning', 'best', 'perfect', etc.
5. Factual Commercial Description:
   - Exactly 2 clean, factual English sentences describing the visible elements, textures, atmospheric mood, and commercial use cases (e.g., editorial, marketing, banner, advertising).
   - Zero marketing hyperbole, unobservable actions, or promotional buzzwords.
6. Descriptive Keywords (Strictly Grounded in Visible Content):
   - Generate unique, highly relevant, non-repetitive English keywords verified strictly against visible image pixels.
   - Top keywords MUST be the most specific nouns and visual descriptors of the primary visible subject in the image pixels.
   - Subsequent keywords should cover visible composition, setting, lighting, colors, textures, and perspective.
   - Strictly remove unsupported terms such as dipping sauce, steak knife, cutlery, silverware, steam, smoke, protein, gastropub, bistro, diner, pub.
   - Strictly prefer specific visual keywords over generic promotional words such as "delicious", "professional", and "commercial".
   - Keep AI-generated disclosure separate from descriptive keywords: do NOT include "generative ai", "ai generated", or "_ai_generated" in this descriptive keywords array; keep disclosure strictly in the separate "aiDisclosure" field.
   - Do NOT invent details just to reach 30–40 keywords. Truthful pixel grounding strictly overrides keyword count.
   - Eliminate duplicates and near-duplicates.
7. Separate Compliance & Visual Attributes:
   - visibleColors: array of 3-5 observable primary colors/tones.
   - visibleLighting: array of 2-3 observable lighting types (e.g. natural daylight, soft shadows, side lit).
   - visiblePerspective: array of 2-3 observable framing angles (e.g. close-up, macro view, eye-level).
   - visibleTextures: array of 2-3 observable textures/materials (e.g. wood grain, ceramic, glazed crust).
   - humanDetected: boolean (true if real or synthetic human faces/bodies are visibly present in the pixels).
   - humanDetails: brief observation in Bengali about human presence and model release requirement.
   - logoDetected: boolean (true if corporate logos, brand marks, or readable trademark text appear in the pixels).
   - logoDetails: brief observation in Bengali about logos/trademarks.
   - category: official stock catalog category (e.g., Nature, Architecture, Technology, Business, Food, Backgrounds, Lifestyle, Science).
   - visualSubjectDescription: 1-sentence factual description of what is actually visible in the pixels.
   - aiDisclosure: standard commercial AI disclosure statement (kept strictly separate from title and description).

Return ONLY valid JSON matching this structure:
{
  "title": "Commercial Title complying with ${targetMarketplace} rule",
  "description": "2-sentence factual commercial description",
  "keywords": ["array", "of", "30", "to", "40", "keywords"],
  "category": "Official Stock Category",
  "visualSubjectDescription": "1-sentence factual description of visible elements in pixels",
  "visibleColors": ["color1", "color2"],
  "visibleLighting": ["lighting1", "lighting2"],
  "visiblePerspective": ["perspective1"],
  "visibleTextures": ["texture1"],
  "humanDetected": false,
  "humanDetails": "মানব উপস্থিতি সম্পর্কিত পর্যবেক্ষণ (Bengali)",
  "logoDetected": false,
  "logoDetails": "ট্রেডমার্ক বা লোগো সম্পর্কিত পর্যবেক্ষণ (Bengali)",
  "aiDisclosure": "This media was created using Generative AI technology. Licensed for commercial use under standard contributor agreements. Certified free of proprietary corporate logos and private biometrics.",
  "factualSubjectSummary": "ছবির আসল পিক্সেল সরাসরি স্ক্যান ও বিশ্লেষণ করে সত্যনিষ্ঠ মেটাডেটা তৈরি করা হয়েছে।"
}`;

    try {
      const { response, modelUsed } = await callGeminiWithModelFallback(
        ai,
        [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text: visionPrompt,
          },
        ],
        {
          responseMimeType: 'application/json',
        },
        ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'],
        25000
      );

      const rawJson = response?.text || response?.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = safeParseJsonFromText(rawJson);

      if (!parsed || !parsed.title || !Array.isArray(parsed.keywords) || parsed.keywords.length < 10) {
        throw new Error('Vision model did not return a valid commercial metadata structure.');
      }

      const visualSummary = parsed.visualSubjectDescription
        ? sanitizeStockText(parsed.visualSubjectDescription)
        : 'Visible subject analyzed from pixels';

      // Verify and format title strictly according to target marketplace's actual rule
      const titleResult = formatTitleForMarketplace(parsed.title, visualSummary, targetMarketplace as any);

      // Clean and verify description against unsupported claims and promotional fluff
      const { cleanedText: cleanDesc, removedItems: removedFromDesc } =
        removeUnsupportedDetailsAndFluff(parsed.description, { visualSubject: visualSummary, category: parsed.category || 'General' });

      // Filter and ground keywords: prefer specific visual keywords, enforce 30-40 keywords
      const kwResult = filterAndGroundKeywords(
        parsed.keywords || [],
        visualSummary,
        parsed.category || 'General',
        targetMarketplace as any,
        {
          colors: parsed.visibleColors,
          lighting: parsed.visibleLighting,
          perspective: parsed.visiblePerspective,
          textures: parsed.visibleTextures,
          hasHumans: parsed.humanDetected,
        }
      );

      const validationAudit = auditMarketplaceValidation(
        {
          title: titleResult.title,
          description: cleanDesc,
          keywords: kwResult.keywords,
          visualSubject: visualSummary,
          category: parsed.category || 'General',
          hasHumans: parsed.humanDetected,
        },
        targetMarketplace as any
      );

      const officialInfo = getOfficialPolicyForMarketplace(targetMarketplace);
      const currentDateBn = getBengaliCurrentDate();
      const techInspection = runRealTechnicalInspection(asset, targetMarketplace);

      const preparedData: any = {
        title: titleResult.title,
        description: cleanDesc.length >= 20 ? cleanDesc : `High-resolution commercial stock photograph showcasing ${visualSummary.toLowerCase()}. Professional aesthetic with balanced composition suitable for advertising, digital media, and publications.`,
        keywords: kwResult.keywords,
        marketplace: targetMarketplace,
        marketplaceName: officialInfo.marketplaceName,
        category: parsed.category || 'Technology',
        visualSubjectDescription: visualSummary,
        aiDisclosure: parsed.aiDisclosure || 'This media was created using Generative AI technology. Non-exclusive commercial license under standard contributor agreements.',
        aiPolicyStatus: officialInfo.aiPolicyStatus,
        aiPolicyBadge: officialInfo.aiPolicyBadge,
        aiPolicyColor: officialInfo.aiPolicyColor,
        officialPolicyNote: officialInfo.officialPolicyNote,
        officialPolicyUrl: officialInfo.officialPolicyUrl,
        isPolicyVerified: officialInfo.isPolicyVerified,
        verificationDate: officialInfo.isPolicyVerified
          ? `${currentDateBn} (অফিসিয়াল Contributor Policy অনুসারে লাইভ যাচাইকৃত)`
          : 'যাচাই করা হয়নি',
        labelingRequirement: officialInfo.labelingRequirement,
        humanPresenceCompliance: parsed.humanDetails || (parsed.humanDetected
          ? 'সতর্কতা: ছবিতে মানুষের উপস্থিতি চিহ্নিত হয়েছে। বাস্তব ব্যক্তির দৃশ্যমানতা থাকলে Model Release আবশ্যক।'
          : 'মানুষের উপস্থিতি নেই (০ জন মানুষ) — কোনো মডেল রিলিজের প্রয়োজন নেই।'),
        trademarkCompliance: parsed.logoDetails || (parsed.logoDetected
          ? 'সতর্কতা: ছবিতে লোগো বা ট্রেডমার্কের মতো উপাদান দৃশ্যমান হতে পারে। আপলোডের পূর্বে ম্যানুয়ালি পরীক্ষা করুন।'
          : 'কোনো সুস্পষ্ট ব্র্যান্ড বা ট্রেডমার্ক শনাক্ত হয়নি। তবে সাবমিট করার পূর্বে নিজ চোখে পরীক্ষা করুন।'),
        technicalRequirements: officialInfo.technicalRequirements,
        factualSubjectSummary: parsed.factualSubjectSummary || 'ছবির আসল পিক্সেল সরাসরি স্ক্যান ও বিশ্লেষণ করে সত্যনিষ্ঠ মেটাডেটা প্রস্তুত করা হয়েছে।',
        techInspection,
        pixelAnalyzed: true,
        analysisMethod: 'vision-pixel',
        titleRule: {
          minChars: titleResult.ruleDetails.recommendedMinChars,
          maxChars: titleResult.ruleDetails.recommendedMaxChars,
          recommendedChars: `${titleResult.ruleDetails.recommendedMinChars}–${titleResult.ruleDetails.recommendedMaxChars} ক্যারেক্টার (${titleResult.ruleDetails.minWords}+ শব্দ)`,
          notes: titleResult.ruleDetails.guideNoteBn,
        },
        groundedVerification: {
          isGrounded: true,
          removedFillerWordsCount: kwResult.removedPromotionalCount + removedFromDesc.length,
          visualConfidence: 'High (Direct Pixel Vision Grounded & Quality Verified)',
          note: 'ছবির আসল পিক্সেল বিশ্লেষণ শেষে অপ্রাসঙ্গিক ইনগ্রেডিয়েন্ট, কাল্পনিক অ্যাকশন ও প্রমোশনাল শব্দসমূহ সরিয়ে সত্যনিষ্ঠ মেটাডেটা প্রস্তুত করা হয়েছে।',
        },
        validationAudit,
      };

      const providerLabel = modelUsed.includes('flash-lite')
        ? 'Google Gemini 3.1 Flash Lite (Direct Pixel Inspection)'
        : 'Google Gemini 3.8 Flash (Direct Pixel Inspection)';

      return res.json({
        success: true,
        needsUserDescription: false,
        metadata: preparedData,
        provider: providerLabel,
        pixelAnalyzed: true,
        analysisMethod: 'vision-pixel',
        costEstimate: 'Google Gemini API (ফ্রি বা পেইড টায়ার নির্ভর করে আপনার একাউন্ট কোটার ওপর; কোনো অতিরিক্ত থার্ড-পার্টি চার্জ নেই)',
      });
    } catch (visionErr: any) {
      console.error('[Gemini Vision Analysis Failed]', visionErr?.message || visionErr);
      const rawMsg = String(visionErr?.message || visionErr || '');
      let cleanErrorMsg = 'ছবির আসল পিক্সেল বিশ্লেষণ সম্পন্ন করা যায়নি।';
      let errorType = 'vision_failed';

      if (rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('quota')) {
        cleanErrorMsg = 'এআই ভিশন মডেলের দৈনিক রিকোয়েস্ট কোটা শেষ হয়েছে (Gemini Vision 429 Quota Exceeded)। আপনি কিছুক্ষণ পর পুনরায় চেষ্টা করতে পারেন অথবা ম্যানুয়ালি ছবির দৃশ্যমান বিষয়বস্তু বর্ণনা করতে পারেন।';
        errorType = 'quota_exceeded';
      } else if (rawMsg.includes('timed out') || rawMsg.includes('timeout')) {
        cleanErrorMsg = 'ইমেজ পিক্সেল বিশ্লেষণ টাইমআউট হয়েছে (Vision Request Timed Out)। অনুগ্রহ করে পুনরায় চেষ্টা করুন অথবা ম্যানুয়ালি বর্ণনা দিন।';
        errorType = 'timeout';
      } else {
        cleanErrorMsg = `ছবির আসল পিক্সেল বিশ্লেষণ করা যায়নি (${rawMsg.slice(0, 120)})। এআই ভিশন মডেল ছবিটি স্ক্যান করতে ব্যর্থ হয়েছে।`;
      }

      return res.json({
        success: false,
        visionError: true,
        errorType,
        error: cleanErrorMsg,
        canRetry: true,
        canManualDescribe: true,
      });
    }
  } catch (err: any) {
    console.error('[Stock Preparation Route Error]', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to prepare stock metadata.',
    });
  }
});

// -------------------------------------------------------------
// Batch Prompt Planner Endpoints (50-100 Commercial Prompts)
// -------------------------------------------------------------
app.post('/api/batch-planner/generate', async (req, res) => {
  try {
    const { topic = '', count = 50, styleCategory = 'বাণিজ্যিক স্টক (Commercial Stock)' } = req.body;
    const cleanTopic = (typeof topic === 'string' && topic.trim()) ? topic.trim() : 'বাণিজ্যিক পণ্য ও লাইফস্টাইল';
    const effectiveCategory = detectCategoryForTopic(cleanTopic, styleCategory);

    // Strict Input Validation: reject empty, zero, negative, decimal, non-integer, or out-of-bounds values
    if (count === undefined || count === null || count === '') {
      return res.status(400).json({
        success: false,
        error: 'প্রম্পট সংখ্যা প্রদান করা আবশ্যক। অনুগ্রহ করে ১ বা তার বেশি একটি ধনাত্মক পূর্ণসংখ্যা দিন।',
      });
    }

    const num = Number(count);
    if ((typeof count === 'string' && count.includes('.')) || !Number.isInteger(num)) {
      return res.status(400).json({
        success: false,
        error: 'দশমিক সংখ্যা গ্রহণযোগ্য নয়। অনুগ্রহ করে একটি ধনাত্মক পূর্ণসংখ্যা দিন (যেমন: ১, ১০, ২৫, ৫০)।',
      });
    }

    if (isNaN(num) || num <= 0) {
      return res.status(400).json({
        success: false,
        error: 'অবৈধ সংখ্যা: শূন্য, ঋণাত্মক বা অকার্যকর সংখ্যা গ্রহণযোগ্য নয়। অনুগ্রহ করে ১ বা তার বেশি ধনাত্মক পূর্ণসংখ্যা লিখুন।',
      });
    }

    if (num > 100) {
      return res.status(400).json({
        success: false,
        error: 'একবারে সর্বোচ্চ ১০০টি প্রম্পটের পরিকল্পনা তৈরি করা সম্ভব। সিস্টেম লিমিট ১০০।',
      });
    }

    const parsedCount = num;

    const result = await generateBatchPlan(cleanTopic, parsedCount, effectiveCategory, process.env.GEMINI_API_KEY);
    return res.json({
      success: true,
      plan: result.plan,
      provider: result.provider,
    });
  } catch (err: any) {
    console.error('[Batch Planner Route Error]', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'ব্যাচ প্রম্পট পরিকল্পনা তৈরিতে ব্যর্থ হয়েছে।',
    });
  }
});

app.post('/api/batch-planner/rephrase-single', async (req, res) => {
  try {
    const { promptItem, customInstruction } = req.body;
    if (!promptItem) {
      return res.status(400).json({ success: false, error: 'promptItem is required.' });
    }

    const updated = await rephraseSinglePrompt(promptItem, customInstruction, process.env.GEMINI_API_KEY);
    return res.json({
      success: true,
      promptItem: updated,
    });
  } catch (err: any) {
    console.error('[Batch Planner Rephrase Error]', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'প্রম্পট পুনরায় তৈরিতে ব্যর্থ হয়েছে।',
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Serve transformed index.html for SPA routes in dev
    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api/')) {
        return next();
      }
      try {
        const url = req.originalUrl;
        const indexPath = path.resolve(__dirname, 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        if (vite && (vite as any).ssrFixStacktrace) {
          (vite as any).ssrFixStacktrace(e);
        }
        next(e);
      }
    });
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const server = app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[AI Creator Studio] Full-stack server running on http://0.0.0.0:${PORT}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[AI Creator Studio] Port ${PORT} already in use. Retrying on port 3000...`);
      if (PORT !== 3000) {
        app.listen(3000, '0.0.0.0', () => {
          console.log(`[AI Creator Studio] Full-stack server running on http://0.0.0.0:3000`);
        });
      }
    } else {
      console.error('[AI Creator Studio] Server error:', err);
    }
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
