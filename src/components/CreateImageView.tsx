import React, { useState, useEffect, useRef } from 'react';
import { Asset, AspectRatioType, ApiStatus, ImageProvider } from '../types';
import {
  Sparkles,
  Sliders,
  Image as ImageIcon,
  Wand2,
  RefreshCw,
  Copy,
  Download,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldAlert,
  Info,
  Maximize2,
  CreditCard,
  UploadCloud,
  Upload,
  Trash2,
  ImagePlus,
  Compass,
  Zap,
} from 'lucide-react';
import { PRESET_IMAGE_PROMPTS } from '../data/mockAssets';
import { GoogleFlowModal } from './GoogleFlowModal';
import { inspectImageFile } from '../utils/mediaInspector';

interface CreateImageViewProps {
  onGenerateImage: (
    newAsset: Omit<Asset, 'id' | 'createdAt' | 'views'>,
    mediaBlob?: Blob,
    thumbnailBlob?: Blob
  ) => void;
  recentImages: Asset[];
  onSelectAsset: (asset: Asset) => void;
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
}

const STYLES = [
  { id: 'Cinematic 3D', label: 'Cinematic 3D', desc: 'Volumetric light & octane render' },
  { id: 'Photorealistic', label: 'Photorealistic', desc: 'True-to-life 85mm lens optics' },
  { id: 'Anime & Manga', label: 'Anime & Manga', desc: 'Japanese animation line art' },
  { id: 'Editorial Fashion', label: 'Editorial Fashion', desc: 'High-end studio magazine look' },
  { id: 'Cyberpunk', label: 'Cyberpunk', desc: 'Neon reflections & dark chrome' },
  { id: 'Surreal Fantasy', label: 'Surreal Fantasy', desc: 'Dreamscapes & floating physics' },
];

const ASPECT_RATIOS: { value: AspectRatioType; label: string; desc: string }[] = [
  { value: '1:1', label: '1:1 Square', desc: 'Instagram / Avatars (1024x1024)' },
  { value: '16:9', label: '16:9 Widescreen', desc: 'YouTube / Cinema (1280x720)' },
  { value: '9:16', label: '9:16 Vertical', desc: 'Reels / Stories (720x1280)' },
  { value: '4:3', label: '4:3 Standard', desc: 'Editorial / Classic (1152x864)' },
  { value: '3:2', label: '3:2 Photography', desc: '35mm Camera frame (1248x832)' },
  { value: '21:9', label: '21:9 Ultra-wide', desc: 'Cinematic banner (1344x576)' },
];

export const CreateImageView: React.FC<CreateImageViewProps> = ({
  onGenerateImage,
  recentImages,
  onSelectAsset,
  initialPrompt,
  onClearInitialPrompt,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt || '');

  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      setPrompt(initialPrompt.trim());
      if (onClearInitialPrompt) onClearInitialPrompt();
    }
  }, [initialPrompt, onClearInitialPrompt]);
  const [negativePrompt, setNegativePrompt] = useState('blurry, distorted anatomy, low resolution, bad lighting, watermark');
  const [showNegative, setShowNegative] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('Cinematic 3D');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('16:9');
  const [quality, setQuality] = useState<'draft' | 'high' | 'ultra-4k'>('high');
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [useRandomSeed, setUseRandomSeed] = useState(true);

  // Active AI Provider: 'gemini' (Gemini Nano Banana) or 'minimax' (MiniMax image-01)
  const [provider, setProvider] = useState<ImageProvider>('gemini');

  // API Status & States
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStepText, setLoadingStepText] = useState('Connecting to Gemini Nano Banana...');
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiErrorCode, setApiErrorCode] = useState<string | null>(null);
  const [generationNotice, setGenerationNotice] = useState<string | null>(null);
  const [latestImage, setLatestImage] = useState<Asset | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [geminiConfigured, setGeminiConfigured] = useState<boolean | null>(null);
  const [minimaxConfigured, setMinimaxConfigured] = useState<boolean | null>(null);
  const [huggingfaceConfigured, setHuggingfaceConfigured] = useState<boolean | null>(null);
  const [cloudflareConfigured, setCloudflareConfigured] = useState<boolean | null>(null);
  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);
  const [flowImportSuccess, setFlowImportSuccess] = useState<string | null>(null);
  const [flowImportError, setFlowImportError] = useState<string | null>(null);
  const flowFileInputRef = useRef<HTMLInputElement>(null);

  // Reference Image State (Real Image-to-Image / Multimodal Input)
  const [referenceImage, setReferenceImage] = useState<{
    data: string;
    mimeType: string;
    previewUrl: string;
    name: string;
    size: number;
  } | null>(null);

  // Check API status on load
  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data: ApiStatus) => {
        setGeminiConfigured(!!data.geminiConfigured);
        setMinimaxConfigured(!!data.minimaxConfigured);
        setHuggingfaceConfigured(!!data.huggingfaceConfigured);
        setCloudflareConfigured(!!data.cloudflareConfigured);
        if (data.defaultProvider) {
          setProvider(data.defaultProvider);
        }
      })
      .catch(() => {
        setGeminiConfigured(false);
        setMinimaxConfigured(false);
        setHuggingfaceConfigured(false);
        setCloudflareConfigured(false);
      });
  }, []);

  const handleEnhancePrompt = () => {
    if (!prompt.trim()) {
      setPrompt('A surreal crystalline palace perched above cloud peaks at twilight, golden volumetric lighting, atmospheric fog, Hasselblad 8k');
      return;
    }
    const enhancements = [
      ', cinematic anamorphic lens, volumetric lighting, photorealistic, 8k render, hyper-detailed textures',
      ', octane render, soft ambient shadows, masterpiece quality, color graded',
      ', award-winning National Geographic photography, natural ambient illumination, sharp focus',
    ];
    const picked = enhancements[Math.floor(Math.random() * enhancements.length)];
    if (!prompt.includes('cinematic') && !prompt.includes('photorealistic')) {
      setPrompt(prompt.trim() + picked);
    }
  };

  const handleReferenceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setApiError('রেফারেন্স ইমেজের সাইজ ৮ মেগাবাইটের (8MB) কম হতে হবে।');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const commaIndex = dataUrl.indexOf(',');
      const base64Data = commaIndex !== -1 ? dataUrl.slice(commaIndex + 1) : dataUrl;
      const mimeType = file.type || 'image/png';

      setReferenceImage({
        data: base64Data,
        mimeType,
        previewUrl: dataUrl,
        name: file.name,
        size: file.size,
      });

      // Auto-switch to Gemini Nano Banana since it natively supports multimodal reference images
      if (provider !== 'gemini') {
        setProvider('gemini');
      }
      setApiError(null);
      setApiErrorCode(null);
    };
    reader.readAsDataURL(file);
  };

  const handleFlowFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFlowImportError(null);
    setFlowImportSuccess(null);

    // Validate supported image formats: JPG, JPEG, PNG, and WebP
    const validExtensions = /\.(jpe?g|png|webp)$/i;
    const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const isValidFormat = validMimeTypes.includes(file.type.toLowerCase()) || validExtensions.test(file.name);

    if (!isValidFormat) {
      setFlowImportError('শুধুমাত্র JPG, JPEG, PNG এবং WebP ফরম্যাটের ছবি সমর্থন করে। অন্য ফরম্যাট গ্রহণযোগ্য নয়।');
      e.target.value = '';
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setFlowImportError('ছবির সাইজ ২৫ মেগাবাইটের (25MB) চেয়ে বেশি হতে পারবে না।');
      e.target.value = '';
      return;
    }

    // Real media inspection to extract actual dimensions, format, file size, and aspect ratio
    let inspectedDimensions = '1920 × 1080';
    let inspectedAspect: AspectRatioType = aspectRatio;
    let inspectedFormat = file.type || 'image/jpeg';
    let inspectedSize = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
    let thumbnailBlob: Blob | undefined;

    try {
      const inspected = await inspectImageFile(file);
      if (inspected.dimensions && inspected.dimensions !== 'Not available') {
        inspectedDimensions = inspected.dimensions;
      }
      if (inspected.aspectRatio) {
        inspectedAspect = inspected.aspectRatio;
      }
      if (inspected.fileFormat) {
        inspectedFormat = inspected.fileFormat;
      }
      if (inspected.fileSize) {
        inspectedSize = inspected.fileSize;
      }
      if (inspected.thumbnailBlob) {
        thumbnailBlob = inspected.thumbnailBlob;
      }
    } catch (inspectErr) {
      console.warn('Media inspection fallback in handleFlowFileImport:', inspectErr);
    }

    const reader = new FileReader();
    reader.onerror = () => {
      setFlowImportError('ছবি লোড করতে ব্যর্থ হয়েছে। ফাইলটি ক্ষতিগ্রস্ত হতে পারে, অনুগ্রহ করে আবার চেষ্টা করুন।');
      e.target.value = '';
    };

    reader.onload = () => {
      try {
        const result = reader.result as string;
        if (!result || typeof result !== 'string') {
          setFlowImportError('ছবি থেকে ডাটা পড়া সম্ভব হয়নি।');
          return;
        }

        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        const assetTitle = cleanName ? cleanName.charAt(0).toUpperCase() + cleanName.slice(1) : 'Google Flow Image';

        // Save imported asset to My Assets with real inspected dimensions & format
        const newAsset: Omit<Asset, 'id' | 'createdAt' | 'views'> = {
          title: assetTitle,
          type: 'image',
          prompt: prompt.trim() || `Imported from Google Flow: ${cleanName}`,
          style: selectedStyle || 'Photorealistic',
          aspectRatio: inspectedAspect,
          dimensions: inspectedDimensions,
          url: result,
          thumbnailUrl: result,
          isFavorite: false,
          model: 'Google Flow FX (Free Credits)',
          source: 'Google Flow',
          sourceUrl: 'https://flow.google',
          fileSize: inspectedSize,
          fileFormat: inspectedFormat,
        };

        // Pass original binary File/Blob so IndexedDB stores original bytes intact
        onGenerateImage(newAsset, file, thumbnailBlob);

        // Update latest preview in the viewport monitor
        const now = new Date();
        const formattedDate = `${now.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })} · ${now.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        })}`;

        const createdAssetWithMeta: Asset = {
          ...newAsset,
          id: `flow-import-${Date.now()}`,
          createdAt: formattedDate,
          views: 1,
        };

        setLatestImage(createdAssetWithMeta);
        setFlowImportSuccess(`"${assetTitle}" (${inspectedDimensions}, ${inspectedFormat}) সফলভাবে My Assets-এ Import ও সংরক্ষণ করা হয়েছে!`);
        setTimeout(() => setFlowImportSuccess(null), 5000);
      } catch (err: any) {
        setFlowImportError('My Assets-এ সংরক্ষণ করার সময় ত্রুটি ঘটেছে: ' + (err?.message || 'Unknown error'));
      } finally {
        e.target.value = '';
      }
    };

    reader.readAsDataURL(file);
  };

  const handleRemoveReferenceImage = () => {
    setReferenceImage(null);
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    // Google Flow: Official external website with Free Credits workflow
    if (provider === 'flow') {
      window.open('https://flow.google', '_blank');
      setIsFlowModalOpen(true);
      return;
    }

    setIsGenerating(true);
    setApiError(null);
    setApiErrorCode(null);
    setGenerationNotice(null);
    setLoadingStepText(
      provider === 'gemini'
        ? (referenceImage ? 'Sending multimodal reference image & prompt to Gemini Nano Banana...' : 'Sending request to Gemini Nano Banana model...')
        : 'Sending request to MiniMax image-01 model...'
    );

    // Progress updates to give rich feedback
    const timer1 = setTimeout(() => {
      setLoadingStepText(
        provider === 'gemini'
          ? (referenceImage ? 'Synthesizing output using reference image features & prompt details...' : 'Synthesizing high-res image via Gemini multimodal engine...')
          : 'MiniMax neural diffusion synthesis in progress...'
      );
    }, 1800);

    const timer2 = setTimeout(() => {
      setLoadingStepText(
        provider === 'gemini'
          ? 'Decoding generated image bytes and preparing asset...'
          : 'Processing output and preparing image asset...'
      );
    }, 4500);

    try {
      const payloadSeed = useRandomSeed ? Math.floor(Math.random() * 1000000) : seed;

      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          style: selectedStyle,
          aspectRatio,
          quality,
          negativePrompt: showNegative ? negativePrompt : undefined,
          seed: payloadSeed,
          referenceImage: referenceImage ? { data: referenceImage.data, mimeType: referenceImage.mimeType } : undefined,
          provider,
        }),
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      const data = await response.json();

      if (!data.success) {
        setApiErrorCode(data.code || 'API_ERROR');
        setApiError(data.error || `Generation failed with status ${response.status}`);
        setIsGenerating(false);
        return;
      }

      if (!data.imageUrl) {
        setApiError('API থেকে কোনো ছবির ডাটা পাওয়া যায়নি। অনুগ্রহ করে প্রম্পট পরিবর্তন করে আবার চেষ্টা করুন।');
        setIsGenerating(false);
        return;
      }

      if (data.isQuotaExceeded || data.notice) {
        setGenerationNotice(data.notice || 'Rendered visual asset via Studio Visual Engine.');
      } else {
        setGenerationNotice(null);
      }

      // Title from prompt words
      const words = prompt.trim().split(' ').slice(0, 5).join(' ');
      const cleanTitle = words.charAt(0).toUpperCase() + words.slice(1);

      const generatedAsset: Omit<Asset, 'id' | 'createdAt' | 'views'> = {
        title:
          cleanTitle ||
          (provider === 'cloudflare'
            ? 'Cloudflare FLUX Asset'
            : provider === 'gemini'
            ? 'Gemini Visual Asset'
            : provider === 'huggingface'
            ? 'FLUX Schnell Creation'
            : 'MiniMax Creation'),
        type: 'image',
        prompt: prompt.trim(),
        negativePrompt: showNegative ? negativePrompt : undefined,
        style: selectedStyle,
        aspectRatio,
        dimensions: data.dimensions || '1280 × 720',
        url: data.imageUrl,
        thumbnailUrl: data.imageUrl,
        isFavorite: false,
        model:
          data.model ||
          (provider === 'cloudflare'
            ? '@cf/black-forest-labs/flux-1-schnell'
            : provider === 'gemini'
            ? 'Gemini Nano Banana'
            : provider === 'huggingface'
            ? 'black-forest-labs/FLUX.1-schnell'
            : 'MiniMax image-01'),
      };

      // Add to store
      onGenerateImage(generatedAsset);

      // Set locally to show in preview card
      setLatestImage({
        ...generatedAsset,
        id: data.id || `img-${Date.now()}`,
        createdAt: 'Just now',
        views: 1,
        license: data.license || (provider === 'cloudflare' || provider === 'huggingface' ? 'Apache-2.0' : undefined),
      });

      if (provider === 'cloudflare') {
        setCloudflareConfigured(true);
      } else if (provider === 'gemini') {
        setGeminiConfigured(true);
      } else if (provider === 'huggingface') {
        setHuggingfaceConfigured(true);
      } else {
        setMinimaxConfigured(true);
      }
    } catch (err: any) {
      const errMsg = err.message || 'An unexpected error occurred during generation.';
      setApiError(errMsg);
      if (errMsg.includes('GEMINI_API_KEY')) {
        setApiErrorCode('MISSING_GEMINI_KEY');
        setGeminiConfigured(false);
      } else if (errMsg.includes('MINIMAX_API_KEY')) {
        setApiErrorCode('MISSING_API_KEY');
        setMinimaxConfigured(false);
      } else if (errMsg.includes('HF_TOKEN')) {
        setApiErrorCode('MISSING_HF_TOKEN');
        setHuggingfaceConfigured(false);
      } else if (errMsg.includes('CLOUDFLARE')) {
        setApiErrorCode('MISSING_CLOUDFLARE_CREDENTIALS');
        setCloudflareConfigured(false);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadImage = (url: string, title: string) => {
    setDownloading(true);
    const filename = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'studio-image'}.png`;

    // Direct base64 download to avoid URL query string length limits
    if (url.startsWith('data:image/')) {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => {
        setDownloading(false);
      }, 600);
      return;
    }

    const downloadEndpoint = `/api/download-image?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;

    const a = document.createElement('a');
    a.href = downloadEndpoint;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      setDownloading(false);
    }, 1500);
  };

  const handleCopyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-20 space-y-6">
      {/* Studio Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <ImageIcon className="w-5 h-5 text-indigo-400" />
            Create Image
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            {provider === 'cloudflare'
              ? 'Cloudflare Workers AI · FLUX.1-schnell 12B transformer (10,000 Neurons/day Free Plan)'
              : provider === 'gemini'
              ? 'Google Gemini Nano Banana · High-speed multimodal visual generation'
              : provider === 'huggingface'
              ? 'Hugging Face FLUX.1-schnell · Free-tier 12B transformer image generation'
              : 'MiniMax Image-01 API · Real-time high-fidelity text-to-image synthesis'}
          </p>
        </div>

        {/* API Status Badge for currently selected provider */}
        <div className="flex items-center gap-2">
          {provider === 'cloudflare' ? (
            cloudflareConfigured === true ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-xs text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Cloudflare: Connected (10k Neurons Free)</span>
              </div>
            ) : cloudflareConfigured === false ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-950/60 border border-amber-800/80 rounded-xl text-xs text-amber-300">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Cloudflare Credentials Not Detected (Free Plan)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-zinc-500" />
                <span>Checking Cloudflare status...</span>
              </div>
            )
          ) : provider === 'gemini' ? (
            geminiConfigured === true ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-xs text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Gemini Nano Banana: Active</span>
              </div>
            ) : geminiConfigured === false ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-950/60 border border-amber-800/80 rounded-xl text-xs text-amber-300">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>GEMINI_API_KEY Not Detected</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-zinc-500" />
                <span>Checking Gemini status...</span>
              </div>
            )
          ) : provider === 'huggingface' ? (
            huggingfaceConfigured === true ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-xs text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Hugging Face: Connected (FLUX.1-schnell)</span>
              </div>
            ) : huggingfaceConfigured === false ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-950/60 border border-amber-800/80 rounded-xl text-xs text-amber-300">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>HF_TOKEN Not Detected (Optional Free Tier)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-zinc-500" />
                <span>Checking Hugging Face status...</span>
              </div>
            )
          ) : (
            minimaxConfigured === true ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-xs text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>MiniMax API: Connected (image-01)</span>
              </div>
            ) : minimaxConfigured === false ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-950/60 border border-amber-800/80 rounded-xl text-xs text-amber-300">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>MINIMAX_API_KEY Not Detected</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-zinc-500" />
                <span>Checking MiniMax status...</span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Provider Switcher Selector Bar */}
      <div className="bg-zinc-900/90 border border-zinc-800 p-2.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-semibold text-zinc-300 ml-1">Image Model:</span>
          <div className="flex flex-wrap items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            {/* Option 1: Cloudflare Workers AI FLUX.1-schnell (10k Neurons Free) */}
            <button
              type="button"
              onClick={() => {
                setProvider('cloudflare');
                setApiError(null);
                setApiErrorCode(null);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                provider === 'cloudflare'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-950'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-orange-200" />
              <span>Cloudflare FLUX</span>
              <span className="text-[10px] bg-orange-950/80 text-orange-200 border border-orange-500/40 px-1.5 py-0.2 rounded font-mono">
                10k Neurons Free
              </span>
            </button>

            {/* Option 2: Gemini Nano Banana */}
            <button
              type="button"
              onClick={() => {
                setProvider('gemini');
                setApiError(null);
                setApiErrorCode(null);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                provider === 'gemini'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Gemini Nano Banana</span>
              <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-1.5 py-0.2 rounded font-mono">
                Active
              </span>
            </button>

            {/* Option 3: Hugging Face FLUX.1-schnell */}
            <button
              type="button"
              onClick={() => {
                setProvider('huggingface');
                setApiError(null);
                setApiErrorCode(null);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                provider === 'huggingface'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-950'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>HF FLUX</span>
            </button>

            {/* Option 4: MiniMax image-01 */}
            <button
              type="button"
              onClick={() => {
                setProvider('minimax');
                setApiError(null);
                setApiErrorCode(null);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                provider === 'minimax'
                  ? 'bg-zinc-800 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <span>MiniMax image-01</span>
            </button>

            {/* Option 5: Google Flow */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setProvider('flow');
                  setApiError(null);
                  setApiErrorCode(null);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  provider === 'flow'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-950'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-cyan-300" />
                <span>Google Flow</span>
                <span className="text-[10px] bg-cyan-950/80 text-cyan-200 border border-cyan-500/30 px-1.5 py-0.2 rounded font-mono">
                  External / Free
                </span>
              </button>

              {/* Import Image Button right beside Google Flow */}
              <button
                type="button"
                onClick={() => flowFileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-200 border border-cyan-500/40 hover:border-cyan-400 transition-all shadow-sm active:scale-95"
                title="Google Flow থেকে তৈরি ছবি নির্বাচন করে My Assets-এ Import করুন"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-300" />
                <span>Import Image</span>
              </button>
              <input
                ref={flowFileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFlowFileImport}
              />
            </div>
          </div>
        </div>

        <div className="text-xs text-zinc-400 flex items-center gap-2 pr-1">
          {provider === 'cloudflare' ? (
            <span className="text-[11px] text-orange-300 flex items-center gap-1.5">
              <span>⚡ Powered by <strong>Cloudflare Workers AI (@cf/black-forest-labs/flux-1-schnell · Free Plan)</strong></span>
            </span>
          ) : provider === 'gemini' ? (
            <span className="text-[11px] text-zinc-400">
              ⚡ Powered by <strong className="text-indigo-300">Google @google/genai SDK</strong>
            </span>
          ) : provider === 'huggingface' ? (
            <span className="text-[11px] text-amber-300 flex items-center gap-1.5">
              <span>⚡ Powered by <strong>Hugging Face Serverless (FLUX.1-schnell)</strong></span>
            </span>
          ) : provider === 'minimax' ? (
            <span className="text-[11px] text-zinc-400">
              ⚡ Powered by <strong className="text-zinc-300">MiniMax REST API</strong>
            </span>
          ) : (
            <span className="text-[11px] text-cyan-300 flex items-center gap-1.5">
              <span>🌐 অফিসিয়াল Google Flow ওয়েবসাইট (Free Credits)</span>
            </span>
          )}
        </div>
      </div>

      {/* Missing Key Advisory Banner if key not detected for chosen provider */}
      {provider === 'cloudflare' && cloudflareConfigured === false && (
        <div className="bg-amber-950/30 border border-amber-800/60 rounded-2xl p-4 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-amber-100">Cloudflare Credentials Required for Workers AI Free Tier</span>
              <p className="text-amber-300/80 mt-0.5">
                Set <code className="bg-amber-900/60 px-1.5 py-0.5 rounded font-mono text-amber-200">CLOUDFLARE_ACCOUNT_ID</code> and <code className="bg-amber-900/60 px-1.5 py-0.5 rounded font-mono text-amber-200">CLOUDFLARE_API_TOKEN</code> in your environment variables or in AI Studio Secrets. Cloudflare Workers Free plan grants 10,000 Neurons/day free (~100-150 free images daily, no billing or card required).
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              fetch('/api/status')
                .then((r) => r.json())
                .then((d: ApiStatus) => {
                  setGeminiConfigured(!!d.geminiConfigured);
                  setMinimaxConfigured(!!d.minimaxConfigured);
                  setHuggingfaceConfigured(!!d.huggingfaceConfigured);
                  setCloudflareConfigured(!!d.cloudflareConfigured);
                });
            }}
            className="px-3 py-1.5 bg-amber-900/50 hover:bg-amber-800/60 border border-amber-700/60 rounded-lg text-amber-100 text-xs font-medium self-start sm:self-center transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Recheck Key</span>
          </button>
        </div>
      )}

      {provider === 'gemini' && geminiConfigured === false && (
        <div className="bg-amber-950/30 border border-amber-800/60 rounded-2xl p-4 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-amber-100">GEMINI_API_KEY Required for Gemini Nano Banana</span>
              <p className="text-amber-300/80 mt-0.5">
                Set <code className="bg-amber-900/60 px-1.5 py-0.5 rounded font-mono text-amber-200">GEMINI_API_KEY</code> in your environment variables or in AI Studio Secrets to generate with Gemini Nano Banana.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              fetch('/api/status')
                .then((r) => r.json())
                .then((d: ApiStatus) => {
                  setGeminiConfigured(!!d.geminiConfigured);
                  setMinimaxConfigured(!!d.minimaxConfigured);
                  setHuggingfaceConfigured(!!d.huggingfaceConfigured);
                  setCloudflareConfigured(!!d.cloudflareConfigured);
                });
            }}
            className="px-3 py-1.5 bg-amber-900/50 hover:bg-amber-800/60 border border-amber-700/60 rounded-lg text-amber-100 text-xs font-medium self-start sm:self-center transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Recheck Key</span>
          </button>
        </div>
      )}

      {provider === 'huggingface' && huggingfaceConfigured === false && (
        <div className="bg-amber-950/30 border border-amber-800/60 rounded-2xl p-4 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-amber-100">HF_TOKEN Required for Hugging Face FLUX.1-schnell Free Tier</span>
              <p className="text-amber-300/80 mt-0.5">
                To generate images with FLUX.1-schnell, add your free Hugging Face User Access Token as <code className="bg-amber-900/60 px-1.5 py-0.5 rounded font-mono text-amber-200">HF_TOKEN</code> in your environment variables or in AI Studio Secrets. No billing or paid card required.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              fetch('/api/status')
                .then((r) => r.json())
                .then((d: ApiStatus) => {
                  setGeminiConfigured(!!d.geminiConfigured);
                  setMinimaxConfigured(!!d.minimaxConfigured);
                  setHuggingfaceConfigured(!!d.huggingfaceConfigured);
                  setCloudflareConfigured(!!d.cloudflareConfigured);
                });
            }}
            className="px-3 py-1.5 bg-amber-900/50 hover:bg-amber-800/60 border border-amber-700/60 rounded-lg text-amber-100 text-xs font-medium self-start sm:self-center transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Recheck Key</span>
          </button>
        </div>
      )}

      {provider === 'minimax' && minimaxConfigured === false && (
        <div className="bg-amber-950/30 border border-amber-800/60 rounded-2xl p-4 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-amber-100">MINIMAX_API_KEY Required for MiniMax Generation</span>
              <p className="text-amber-300/80 mt-0.5">
                To generate images with MiniMax, set <code className="bg-amber-900/60 px-1.5 py-0.5 rounded font-mono text-amber-200">MINIMAX_API_KEY</code> in your environment variables or in AI Studio Secrets.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              fetch('/api/status')
                .then((r) => r.json())
                .then((d: ApiStatus) => {
                  setGeminiConfigured(!!d.geminiConfigured);
                  setMinimaxConfigured(!!d.minimaxConfigured);
                  setHuggingfaceConfigured(!!d.huggingfaceConfigured);
                  setCloudflareConfigured(!!d.cloudflareConfigured);
                });
            }}
            className="px-3 py-1.5 bg-amber-900/50 hover:bg-amber-800/60 border border-amber-700/60 rounded-lg text-amber-100 text-xs font-medium self-start sm:self-center transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Recheck Key</span>
          </button>
        </div>
      )}

      {/* Google Flow Direct Import Notifications */}
      {flowImportError && (
        <div className="bg-rose-950/40 border border-rose-800/80 rounded-2xl p-4 text-xs text-rose-200 flex items-start gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block text-rose-100">ছবির Import ব্যর্থ হয়েছে (Import Failed)</span>
            <p className="text-rose-300/90 mt-0.5 leading-relaxed">{flowImportError}</p>
          </div>
          <button
            onClick={() => setFlowImportError(null)}
            className="text-xs text-rose-400 hover:text-rose-200 px-2 py-1 bg-rose-900/40 hover:bg-rose-900/70 rounded-lg transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {flowImportSuccess && (
        <div className="bg-emerald-950/40 border border-emerald-800/80 rounded-2xl p-4 text-xs text-emerald-200 flex items-center justify-between gap-3 animate-in fade-in shadow-lg shadow-emerald-950/30">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="font-semibold block text-emerald-100">সফলভাবে সংরক্ষিত (Saved to My Assets)</span>
              <p className="text-emerald-300/90 mt-0.5">{flowImportSuccess}</p>
            </div>
          </div>
          <button
            onClick={() => setFlowImportSuccess(null)}
            className="text-xs text-emerald-400 hover:text-emerald-200 px-2.5 py-1 bg-emerald-900/40 hover:bg-emerald-900/70 rounded-lg transition-colors"
          >
            ঠিক আছে
          </button>
        </div>
      )}

      {/* Google Flow Information, Website Access & Import Banner */}
      {provider === 'flow' && (
        <div className="bg-gradient-to-r from-cyan-950/50 via-zinc-900 to-blue-950/40 border border-cyan-500/40 rounded-2xl p-4 sm:p-5 text-xs text-zinc-200 space-y-4 shadow-lg shadow-cyan-950/20">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-cyan-950/80 border border-cyan-500/30 rounded-xl text-cyan-400 shrink-0 mt-0.5">
                <Compass className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-white">Google Flow (Official Web Studio)</span>
                  <span className="text-[10px] bg-cyan-950 border border-cyan-500/40 text-cyan-300 px-2 py-0.5 rounded-full font-semibold">
                    100% Free Credits Available
                  </span>
                  <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                    No Direct API Connected
                  </span>
                </div>
                <p className="text-zinc-300 text-xs leading-relaxed">
                  গুগলের অফিসিয়াল <strong>Flow</strong> প্ল্যাটফর্মে গিয়ে আপনার ফ্রি ক্রেডিট ব্যবহার করে উচ্চমানের ছবি তৈরি করুন। তৈরি করা ছবি ডাউনলোড করে এই স্টুডিওর <strong>My Assets</strong>-এ সহজেই ইমপোর্ট করতে পারবেন।
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <a
                href="https://flow.google"
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-cyan-950 transition-all"
              >
                <span>Flow ওয়েবসাইট খুলুন</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => setIsFlowModalOpen(true)}
                className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
                <span>My Assets-এ Import করুন</span>
              </button>
            </div>
          </div>

          {/* Workflow & Transparency Notes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3 flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">1</span>
              <div>
                <p className="font-semibold text-zinc-200 text-[11px]">১. প্রম্পট ও আইডিয়া নিন</p>
                <p className="text-zinc-400 text-[11px] mt-0.5">নিচের বক্সে প্রম্পট লিখে কপি বোতামে চাপুন।</p>
              </div>
            </div>
            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3 flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">2</span>
              <div>
                <p className="font-semibold text-zinc-200 text-[11px]">২. Flow-তে ছবি বানান</p>
                <p className="text-zinc-400 text-[11px] mt-0.5">flow.google-এ গিয়ে ফ্রি ক্রেডিটে ছবি তৈরি ও ডাউনলোড করুন।</p>
              </div>
            </div>
            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3 flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">3</span>
              <div>
                <p className="font-semibold text-zinc-200 text-[11px]">৩. স্টুডিওতে Import করুন</p>
                <p className="text-zinc-400 text-[11px] mt-0.5">ডাউনলোড করা ছবিটি এখানে আপলোড করলেই My Assets-এ যুক্ত হবে।</p>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-zinc-400 bg-zinc-950/50 rounded-xl p-2.5 border border-zinc-800/60 flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              <strong>স্বচ্ছতা নিশ্চিতকরণ:</strong> Google Flow-এর কোনো পাবলিক অটোমেটেড API বর্তমানে চালু নেই। তাই সরাসরি API কানেক্টেড বলে মিথ্যা দেখানো হচ্ছে না এবং আপনার কোনো পেইড খরচ কাটা হবে না।
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Generation Controls */}
        <div className="lg:col-span-7 space-y-5">
          <form onSubmit={handleGenerate} className="space-y-5">
            {/* Prompt Card */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-200">Image Description Prompt</label>
                <button
                  type="button"
                  onClick={handleEnhancePrompt}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Enhance Prompt</span>
                </button>
              </div>

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter prompt (e.g., 'A majestic snow leopard resting on Himalayan cliff edge at sunrise, 8k resolution, cinematic lighting')..."
                rows={4}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl p-3.5 text-base sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none transition-colors resize-none leading-relaxed"
              />

              {/* Inspiration Presets */}
              <div className="pt-2">
                <span className="text-[11px] text-zinc-400 block mb-1.5 font-medium">Inspiration prompts:</span>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {PRESET_IMAGE_PROMPTS.slice(0, 3).map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPrompt(preset)}
                      className="shrink-0 text-[11px] bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 px-3 py-1.5 rounded-lg truncate max-w-xs transition-colors min-h-[36px]"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Negative Prompt Collapsible */}
              <div className="pt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setShowNegative(!showNegative)}
                  className="flex items-center justify-between w-full text-xs text-zinc-400 hover:text-zinc-200 py-1.5 transition-colors min-h-[38px]"
                >
                  <span>Negative Prompt / Exclusions</span>
                  {showNegative ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showNegative && (
                  <div className="mt-2 animate-in fade-in">
                    <input
                      type="text"
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="e.g. blurry, text, logo, bad anatomy, artifacts..."
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl p-3 text-base sm:text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none transition-colors min-h-[44px]"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Reference Image Upload Card (Image-to-Image / Multimodal) */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImagePlus className="w-4 h-4 text-indigo-400" />
                  <label className="text-xs font-semibold text-zinc-200">
                    Reference Image / রেফারেন্স ছবি (Image-to-Image)
                  </label>
                </div>
                {referenceImage ? (
                  <span className="text-[10px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Active Reference</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-500">Optional · ঐচ্ছিক</span>
                )}
              </div>

              <p className="text-[11px] text-zinc-400 leading-relaxed">
                আপনার প্রোডাক্ট বা প্যাকেজিংয়ের আসল ছবি (যেমন: সাফাওয়ী খেজুরের বক্স প্যাকেজিং) আপলোড করলে AI রেফারেন্স ছবির বৈশিষ্ট্য ও বিবরণ বজায় রেখে প্রম্পট অনুযায়ী সরাসরি ছবি তৈরি করবে।
              </p>

              {referenceImage ? (
                /* Uploaded Reference Preview */
                <div className="p-3 bg-zinc-950 border border-indigo-500/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={referenceImage.previewUrl}
                      alt="Uploaded reference"
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-zinc-700 shrink-0 bg-zinc-900"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-200 truncate">{referenceImage.name}</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        {(referenceImage.size / 1024).toFixed(1)} KB · {referenceImage.mimeType}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[10px] text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded mt-1.5 border border-indigo-800/60">
                        <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                        <span>Gemini Nano Banana Multimodal সক্রিয়</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <label className="cursor-pointer px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-lg font-medium transition-colors border border-zinc-700 flex items-center gap-1.5">
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>ছবি পরিবর্তন</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        onChange={handleReferenceImageUpload}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleRemoveReferenceImage}
                      className="p-1.5 bg-zinc-900 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-400 rounded-lg border border-zinc-800 hover:border-rose-800/60 transition-colors"
                      title="রেফারেন্স ছবি মুছুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Upload Dropzone / Button */
                <label className="cursor-pointer flex flex-col items-center justify-center p-5 border-2 border-dashed border-zinc-800 hover:border-indigo-500/60 bg-zinc-950/60 hover:bg-zinc-950 rounded-xl transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-400 group-hover:scale-105 flex items-center justify-center transition-transform mb-2">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-200 group-hover:text-indigo-300 transition-colors">
                    রেফারেন্স ছবি আপলোড করতে ক্লিক করুন
                  </span>
                  <span className="text-[11px] text-zinc-500 mt-0.5">
                    PNG, JPG, WebP (সর্বোচ্চ ৮ মেগাবাইট)
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    onChange={handleReferenceImageUpload}
                    className="hidden"
                  />
                </label>
              )}

              {/* Notice if provider is MiniMax while reference image is active */}
              {referenceImage && provider === 'minimax' && (
                <div className="p-2.5 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs text-amber-300 flex items-center justify-between gap-2">
                  <span>MiniMax image-01 রেফারেন্স ইমেজ সাপোর্ট করে না।</span>
                  <button
                    type="button"
                    onClick={() => setProvider('gemini')}
                    className="px-2.5 py-1 bg-amber-900/60 hover:bg-amber-800/80 text-amber-100 rounded text-[11px] font-semibold shrink-0"
                  >
                    Switch to Gemini
                  </button>
                </div>
              )}
            </div>

            {/* Visual Style Selection */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3">
              <label className="text-xs font-semibold text-zinc-200 block">Art Style Preset</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {STYLES.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setSelectedStyle(style.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedStyle === style.id
                        ? 'bg-indigo-600/15 border-indigo-500 text-indigo-200 shadow-sm'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    <span className="text-xs font-medium block text-zinc-100">{style.label}</span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5 line-clamp-1">{style.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio & Quality Grid */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-200 block mb-2">
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ASPECT_RATIOS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setAspectRatio(item.value)}
                      className={`p-2.5 rounded-xl border text-left transition-colors ${
                        aspectRatio === item.value
                          ? 'bg-zinc-800 border-zinc-600 text-white'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <div className="text-xs font-medium text-zinc-100">{item.label}</div>
                      <div className="text-[10px] text-zinc-400 truncate">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality & Seed options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-zinc-800/80">
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1.5">Output Quality Refinement</label>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl p-2.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="draft">Standard Resolution</option>
                    <option value="high">High Definition (Masterpiece)</option>
                    <option value="ultra-4k">Ultra 4K Maximum Detail</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-zinc-300">Seed Control</label>
                    <button
                      type="button"
                      onClick={() => setUseRandomSeed(!useRandomSeed)}
                      className="text-[11px] text-indigo-400 hover:underline"
                    >
                      {useRandomSeed ? 'Using Random' : 'Using Fixed'}
                    </button>
                  </div>
                  {useRandomSeed ? (
                    <div className="w-full bg-zinc-950/60 border border-zinc-800 text-zinc-400 text-xs rounded-xl p-2.5">
                      Randomized each run
                    </div>
                  ) : (
                    <input
                      type="number"
                      value={seed ?? 42}
                      onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                      placeholder="Seed number"
                      className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl p-2.5 focus:outline-none focus:border-indigo-500"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Error Message & Retry Box */}
            {apiError && (
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3 animate-in fade-in">
                {apiErrorCode === 'QUOTA_EXCEEDED' ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-amber-200">
                            Gemini API কোটা লিমিট (Quota Exceeded - Error 429)
                          </h4>
                          <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-800/80 px-1.5 py-0.2 rounded font-mono">
                            Status 429
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed">
                          Google Gemini-এর ফ্রি টিয়ারে ইমেজ জেনারেশন মডেলের (<code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-amber-300">gemini-3.1-flash-lite-image</code> / <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-amber-300">gemini-nano-banana-2.1</code>) ফ্রি রিকোয়েস্ট লিমিট ০।
                        </p>
                        <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                          সরাসরি ইমেজ তৈরি করতে Google Cloud প্রজেক্টে বিলিং সক্রিয় (Pay-as-you-go) থাকতে হয়। AI Studio Secrets-এ আপনার পেইড API কী যুক্ত থাকলে আনলিমিটেড লাইভ ইমেজ জেনারেট করতে পারবেন।
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800">
                      <a
                        href="https://ai.google.dev/gemini-api/docs/rate-limits"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition-colors border border-zinc-700"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                        <span>Gemini Quota & Billing বিবরণী</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => handleGenerate()}
                        disabled={isGenerating}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>পুনরায় চেষ্টা করুন / Retry</span>
                      </button>
                    </div>
                  </div>
                ) : apiErrorCode === 'REFERENCE_NOT_SUPPORTED' ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-indigo-200">রেফারেন্স ইমেজ সমর্থিত নয়</h4>
                        <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{apiError}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                      <button
                        type="button"
                        onClick={() => {
                          setProvider('gemini');
                          setApiError(null);
                          setApiErrorCode(null);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Gemini Nano Banana নির্বাচন করুন</span>
                      </button>
                    </div>
                  </div>
                ) : apiErrorCode === 'INSUFFICIENT_BALANCE' ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CreditCard className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-amber-200">
                            MiniMax ব্যালেন্স শেষ (Insufficient Balance - Error 1008)
                          </h4>
                          <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-800/80 px-1.5 py-0.2 rounded font-mono">
                            Status 1008
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                          আপনার <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-amber-300">MINIMAX_API_KEY</code> যুক্ত হয়েছে, কিন্তু MiniMax একাউন্টে পর্যাপ্ত ব্যালেন্স/ক্রেডিট নেই।
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800">
                      <a
                        href="https://platform.minimax.io"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition-colors border border-zinc-700"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                        <span>MiniMax রিচার্জ (platform.minimax.io)</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          setProvider('gemini');
                          setApiError(null);
                          setApiErrorCode(null);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Switch to Gemini Nano Banana</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-rose-200">Image Generation Failed</h4>
                        <p className="text-xs text-rose-300/90 mt-1 leading-relaxed">{apiError}</p>
                        {apiErrorCode === 'MISSING_API_KEY' && (
                          <p className="text-[11px] text-rose-400/80 mt-1.5">
                            Please set <code className="bg-rose-900/60 px-1 py-0.5 rounded font-mono">MINIMAX_API_KEY</code> in your environment variables to enable the MiniMax image-01 model.
                          </p>
                        )}
                        {apiErrorCode === 'MISSING_GEMINI_KEY' && (
                          <p className="text-[11px] text-rose-400/80 mt-1.5">
                            Please set <code className="bg-rose-900/60 px-1 py-0.5 rounded font-mono">GEMINI_API_KEY</code> in your environment variables.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-900/40">
                      <button
                        type="button"
                        onClick={() => handleGenerate()}
                        disabled={isGenerating}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-900/60 hover:bg-rose-800/80 text-rose-100 rounded-xl text-xs font-semibold transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>পুনরায় চেষ্টা করুন / Retry</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Main Generate Button */}
            {provider === 'flow' ? (
              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={!prompt.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-cyan-950"
                >
                  <Compass className="w-4 h-4 text-cyan-200" />
                  <span>Flow ওয়েবসাইটে গিয়ে ছবি তৈরি করুন (Free Credits)</span>
                  <ExternalLink className="w-4 h-4 text-cyan-200 ml-1" />
                </button>
                <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                  <span>ওয়েবসাইটে প্রম্পট পেস্ট করে তৈরি করুন</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(prompt);
                      setCopiedPrompt(true);
                      setTimeout(() => setCopiedPrompt(false), 2000);
                    }}
                    className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedPrompt ? 'Copied!' : 'প্রম্পট কপি করুন'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="submit"
                disabled={isGenerating || !prompt.trim()}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-indigo-950"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{loadingStepText}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>
                      {provider === 'gemini'
                        ? 'Generate with Gemini Nano Banana'
                        : 'Generate with MiniMax image-01'}
                    </span>
                  </>
                )}
              </button>
            )}
          </form>
        </div>

        {/* Right Column: Generation Monitor & Real Output Viewport */}
        <div className="lg:col-span-5 space-y-5">
          {/* Live Studio Monitor */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <span>Viewport Display</span>
                {latestImage && (
                  <span className="text-[10px] text-emerald-400 font-normal">· Real API Output</span>
                )}
              </h3>
              <span className="text-[10px] text-zinc-400 font-mono">Ratio: {aspectRatio}</span>
            </div>

            {isGenerating ? (
              /* Loading State */
              <div className="aspect-video bg-zinc-950 rounded-xl border border-indigo-500/40 flex flex-col items-center justify-center p-6 text-center space-y-3 animate-pulse">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                  <Sparkles className="w-5 h-5 text-indigo-400 absolute inset-0 m-auto" />
                </div>
                <div>
                  <p className="text-xs font-medium text-indigo-200">{loadingStepText}</p>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    {provider === 'gemini' ? 'Google Gemini Multimodal AI Engine' : 'MiniMax Neural Synthesis Engine'}
                  </p>
                </div>
              </div>
            ) : latestImage ? (
              /* Success State with Real Output Image */
              <div className="space-y-3 animate-in fade-in duration-300">
                <div className="relative rounded-xl overflow-hidden bg-zinc-950 border border-zinc-700/80 group">
                  <img
                    src={latestImage.url}
                    alt={latestImage.title}
                    className="w-full h-auto max-h-[380px] object-contain mx-auto"
                  />

                  {/* Badges Overlay */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold tracking-wider bg-black/80 backdrop-blur-md text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                      {latestImage.model || (provider === 'gemini' ? 'Gemini Nano Banana' : 'MiniMax image-01')}
                    </span>
                    <span className="text-[10px] bg-black/80 backdrop-blur-md text-zinc-300 px-1.5 py-0.5 rounded border border-white/10 font-mono">
                      {latestImage.aspectRatio}
                    </span>
                  </div>

                  <button
                    onClick={() => onSelectAsset(latestImage)}
                    className="absolute top-2.5 right-2.5 p-1.5 bg-black/70 hover:bg-black/90 text-zinc-200 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="View fullscreen"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Notice if Demo Engine Fallback Active */}
                {generationNotice && (
                  <div className="p-3 bg-indigo-950/40 border border-indigo-800/50 rounded-xl text-xs text-indigo-200 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block text-indigo-100">Studio Engine Preview Active</span>
                      <p className="text-[11px] text-indigo-300/90 mt-0.5 leading-relaxed">{generationNotice}</p>
                    </div>
                  </div>
                )}

                {/* Info & Download Actions */}
                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-semibold text-zinc-100 line-clamp-1">{latestImage.title}</h4>
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2 py-0.5 rounded-md font-medium shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Saved to My Assets</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1">{latestImage.prompt}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs">
                    <button
                      type="button"
                      onClick={() => handleCopyPrompt(latestImage.prompt)}
                      className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors"
                    >
                      {copiedPrompt ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 text-[11px]">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="text-[11px]">Copy Prompt</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadImage(latestImage.url, latestImage.title)}
                      disabled={downloading}
                      className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{downloading ? 'Downloading...' : 'Download Image'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Idle / Standby State */
              <div className="aspect-video bg-zinc-950 rounded-xl border border-zinc-800/80 flex flex-col items-center justify-center p-6 text-center text-zinc-400 space-y-2">
                <ImageIcon className="w-8 h-8 text-zinc-500" />
                <p className="text-xs text-zinc-300">Ready for Image Generation</p>
                <p className="text-[11px] text-zinc-400 max-w-xs leading-relaxed">
                  Enter your prompt and click Generate to produce images directly.
                </p>
              </div>
            )}
          </div>

          {/* Recent Image Creations from Storage */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-200">Recent Generated Images ({recentImages.length})</h3>
            {recentImages.length === 0 ? (
              <p className="text-xs text-zinc-400">No images generated yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {recentImages.slice(0, 4).map((img) => (
                  <div
                    key={img.id}
                    onClick={() => onSelectAsset(img)}
                    className="group relative aspect-square rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-indigo-500 transition-colors"
                  >
                    <img
                      src={img.thumbnailUrl}
                      alt={img.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                      <span className="text-[10px] text-white font-medium line-clamp-1">{img.title}</span>
                      <span className="text-[9px] text-zinc-300 font-mono">{img.model}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Google Flow Import & Guide Modal */}
      <GoogleFlowModal
        isOpen={isFlowModalOpen}
        onClose={() => setIsFlowModalOpen(false)}
        onImportAsset={(newAsset) => {
          onGenerateImage(newAsset);
          setIsFlowModalOpen(false);
        }}
      />
    </div>
  );
};
