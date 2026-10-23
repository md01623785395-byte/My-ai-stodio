import React, { useState, useEffect, useRef } from 'react';
import { Asset, AspectRatioType } from '../types';
import {
  Video,
  Play,
  Film,
  Camera,
  Sparkles,
  Clock,
  Wand2,
  Copy,
  Check,
  ExternalLink,
  Upload,
  FileVideo,
  Info,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { PRESET_VIDEO_PROMPTS } from '../data/mockAssets';
import { inspectVideoFile, MediaInspectionResult } from '../utils/mediaInspector';
import { detectVideoGenerationCapability, VideoProviderStatus } from '../utils/videoCapabilityDetector';
import { VideoStudioModal } from './VideoStudioModal';

interface CreateVideoViewProps {
  onGenerateVideo: (
    newAsset: Omit<Asset, 'id' | 'createdAt' | 'views'>,
    mediaBlob?: Blob,
    thumbnailBlob?: Blob
  ) => void;
  recentVideos: Asset[];
  onSelectAsset: (asset: Asset) => void;
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
  onNavigateToAssets?: () => void;
}

const CAMERA_MOTIONS = [
  { id: 'orbit-360', label: 'Orbit 360', tag: '[Camera: Orbit 360 rotation]', desc: 'Subject focal circle' },
  { id: 'pan-left', label: 'Pan Left', tag: '[Camera: Smooth horizontal pan left]', desc: 'Horizontal motion glide' },
  { id: 'dolly-zoom', label: 'Dolly Zoom', tag: '[Camera: Vertigo dolly zoom compression]', desc: 'Vertigo compression' },
  { id: 'drone-flyover', label: 'Drone Flyover', tag: '[Camera: Sweeping aerial drone altitude]', desc: 'Aerial landscape' },
  { id: 'tilt-up', label: 'Tilt Up', tag: '[Camera: Dramatic vertical tilt up reveal]', desc: 'Dramatic vertical reveal' },
  { id: 'static-cinematic', label: 'Static Locked', tag: '[Camera: Static tripod cinematic 35mm]', desc: 'Locked-off shot' },
];

export const CreateVideoView: React.FC<CreateVideoViewProps> = ({
  onGenerateVideo,
  recentVideos,
  onSelectAsset,
  initialPrompt,
  onClearInitialPrompt,
  onNavigateToAssets,
}) => {
  const [videoMode, setVideoMode] = useState<'text-to-video' | 'image-to-video'>('text-to-video');
  const [prompt, setPrompt] = useState(initialPrompt || '');

  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      setPrompt(initialPrompt.trim());
      if (onClearInitialPrompt) onClearInitialPrompt();
    }
  }, [initialPrompt, onClearInitialPrompt]);

  const [selectedMotion, setSelectedMotion] = useState('orbit-360');
  const [duration, setDuration] = useState<'4s' | '8s' | '16s'>('8s');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('16:9');
  const [fps, setFps] = useState<24 | 30 | 60>(30);
  const [motionIntensity, setMotionIntensity] = useState(6);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Video Import State (Honest Workflow)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectedData, setInspectedData] = useState<MediaInspectionResult | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [importTitle, setImportTitle] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [capabilityStatus, setCapabilityStatus] = useState<VideoProviderStatus | null>(null);
  const [savedAssetForModal, setSavedAssetForModal] = useState<Asset | null>(null);
  const [showStudioModal, setShowStudioModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    detectVideoGenerationCapability().then((status) => {
      if (isMounted) setCapabilityStatus(status);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Build ready-to-use prompt with motion tags
  const getFullPreparedPrompt = () => {
    const motionObj = CAMERA_MOTIONS.find((m) => m.id === selectedMotion);
    const motionTag = motionObj ? motionObj.tag : '';
    const base = prompt.trim() || 'Cinematic video sequence';
    return `${base}, ${motionTag}, ${duration} duration, ${fps}fps, motion intensity ${motionIntensity}/10, 4k ultra-high definition, cinematic lighting`;
  };

  const handleCopyPrompt = () => {
    const fullPrompt = getFullPreparedPrompt();
    navigator.clipboard.writeText(fullPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const handleEnhancePrompt = () => {
    if (!prompt.trim()) {
      setPrompt(
        'Slow motion macro water droplet ripple reflecting vibrant neon skyline, 120fps high speed phantom camera, shallow depth of field'
      );
      return;
    }
    setPrompt(
      prompt.trim() +
        ', 35mm cinematic film grain, subtle ambient atmospheric motion, photorealistic camera parallax'
    );
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|webm|mov|mkv)$/i)) {
      setImportError('শুধুমাত্র ভিডিও ফাইল (MP4, WebM, MOV) নির্বাচন করুন। (Please select an MP4, WebM, or MOV video file)');
      return;
    }

    setImportError(null);
    setSelectedFile(file);
    setIsInspecting(true);

    const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    if (!importTitle) {
      setImportTitle(cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1));
    }

    // Create temporary object URL for instant preview
    const tempUrl = URL.createObjectURL(file);
    setPreviewVideoUrl(tempUrl);

    try {
      const result = await inspectVideoFile(file);
      setInspectedData(result);
      if (result.aspectRatio) {
        setAspectRatio(result.aspectRatio);
      }
    } catch {
      setImportError('ভিডিও মেটাডেটা পড়তে কিছুটা সমস্যা হয়েছে, তবে ফাইলটি সংরক্ষণ করা যাবে।');
    } finally {
      setIsInspecting(false);
    }
  };

  const handleSaveImportedVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    const titleToUse = importTitle.trim() || 'Imported Video';
    const dimToUse = inspectedData?.dimensions || (aspectRatio === '16:9' ? '1920 × 1080' : '1080 × 1920');
    const durToUse = inspectedData?.duration || duration;
    const formatToUse = inspectedData?.fileFormat || 'MP4';
    const sizeToUse = inspectedData?.fileSize || `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`;

    // Construct asset
    const newAsset: Omit<Asset, 'id' | 'createdAt' | 'views'> = {
      title: titleToUse,
      type: 'video',
      prompt: prompt.trim() || `Real video file: ${selectedFile.name}`,
      style: 'Cinematic Motion',
      aspectRatio,
      dimensions: dimToUse,
      duration: durToUse,
      fps: inspectedData?.fps || fps,
      url: previewVideoUrl || '',
      thumbnailUrl: inspectedData?.thumbnailUrl || previewVideoUrl || '',
      isFavorite: false,
      model: 'Google Flow / Real Video File',
      source: 'Google Flow',
      fileSize: sizeToUse,
      fileFormat: formatToUse,
    };

    const fullAsset: Asset = {
      ...newAsset,
      id: `asset-${Date.now()}`,
      createdAt: 'Just now',
      views: 1,
    };
    setSavedAssetForModal(fullAsset);

    // Save with the real File/Blob directly into IndexedDB
    onGenerateVideo(newAsset, selectedFile, inspectedData?.thumbnailBlob);

    setImportSuccess(true);
    setTimeout(() => {
      setImportSuccess(false);
    }, 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Video className="w-5 h-5 text-violet-400" />
              <span>Create Video (Google Flow & Veo Pipeline)</span>
            </h1>
            <span className="text-[10px] font-semibold bg-emerald-950/90 text-emerald-300 border border-emerald-700/60 px-2.5 py-0.5 rounded-full">
              সততা ভিত্তিক কর্মপ্রবাহ (Honest Workflow)
            </span>
            <span className="text-[10px] font-semibold bg-amber-950/90 text-amber-300 border border-amber-700/60 px-2.5 py-0.5 rounded-full">
              {capabilityStatus?.statusBadgeBn || 'Generation provider not configured (জেনারেটর কনফিগার করা নেই)'}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
            কোনো কৃত্রিম প্রগ্রেস বা ফেক স্ট্যাটিক ইমেজ নয় — এখানে ক্যামেরা মোশনসহ আসল প্রম্পট প্রস্তুত করুন, Google Flow-তে ফ্রি ক্রেডিটে আসল ভিডিও তৈরি করে ডাউনলোড করুন এবং এখানে আসল ভিডিও ফাইল ইমপোর্ট করুন।
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 rounded-xl text-zinc-300 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>IndexedDB Safe Video Storage Active</span>
        </div>
      </div>

      {/* Honest Capability Disclosure Box */}
      <div className="p-3.5 bg-zinc-900/70 border border-zinc-800 rounded-2xl flex items-start gap-3 text-xs text-zinc-300">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-200">
              সক্ষমতা অডিট স্ট্যাটাস: {capabilityStatus?.providerStatus === 'configured' ? 'কনফিগার করা' : 'Generation provider not configured'}
            </span>
            <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 font-mono">
              Priority 2.5 Truthful Workflow
            </span>
          </div>
          <p className="text-zinc-400 text-[11px] leading-relaxed">
            {capabilityStatus?.explanationBn ||
              'সার্ভারে কোনো অটোমেটেড পেইড ভিডিও এআই এপিআই কনফিগার করা নেই। অনুমোদন ছাড়া বিলিং চালু করা নিষিদ্ধ। কোনো কৃত্রিম প্রগ্রেস বা ফেক ভিডিও তৈরি করা হয় না। সততা ভিত্তিক ৩-ধাপের ম্যানুয়াল ওয়ার্কফ্লো সক্রিয় রয়েছে।'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 3-Step Honest Workflow */}
        <div className="lg:col-span-7 space-y-6">
          {/* STEP 1: Motion Prompt Studio */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-violet-600/30 text-violet-400 border border-violet-500/40 text-xs font-bold flex items-center justify-center">
                  ১
                </span>
                <h2 className="text-sm font-semibold text-zinc-100">
                  Step 1: Motion Prompt Studio (মোশন প্রম্পট প্রস্তুতকরণ)
                </h2>
              </div>
              <button
                type="button"
                onClick={handleEnhancePrompt}
                className="text-xs text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1.5 transition-colors"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Enhance Motion</span>
              </button>
            </div>

            {/* Mode switch */}
            <div className="flex items-center gap-2 p-1 bg-zinc-950 border border-zinc-800 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setVideoMode('text-to-video')}
                className={`px-3.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  videoMode === 'text-to-video'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Text to Video
              </button>
              <button
                type="button"
                onClick={() => setVideoMode('image-to-video')}
                className={`px-3.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  videoMode === 'image-to-video'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Image to Video
              </button>
            </div>

            {/* Textarea */}
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                {videoMode === 'text-to-video' ? 'Video Scene Description & Dynamics' : 'Animation Motion Prompt'}
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="বর্ণনা করুন: দৃশ্যের গতিবিধি, ক্যামেরার গতিপথ, আলো পরিবর্তন, বিষয়বস্তুর নড়াচড়া (e.g. Cinematic macro shot of glowing crystal orchids in misty rain...)"
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-xl p-3.5 text-base sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none transition-colors resize-none leading-relaxed"
              />
            </div>

            {/* Inspiration presets */}
            <div>
              <span className="text-[11px] text-zinc-400 block mb-1.5 font-medium">
                আইডিয়া প্রম্পট (Preset Inspirations):
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {PRESET_VIDEO_PROMPTS.slice(0, 3).map((preset, idx) => (
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

            {/* Camera Motion Selection */}
            <div>
              <label className="text-xs font-semibold text-zinc-200 flex items-center gap-2 mb-2">
                <Camera className="w-4 h-4 text-violet-400" />
                <span>Camera Direction & Movement Path (ক্যামেরা দিক ও গতিবিধি)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CAMERA_MOTIONS.map((motion) => (
                  <button
                    key={motion.id}
                    type="button"
                    onClick={() => setSelectedMotion(motion.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      selectedMotion === motion.id
                        ? 'bg-violet-600/20 border-violet-500 text-violet-200 shadow-sm'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    <span className="text-xs font-medium block text-zinc-100">{motion.label}</span>
                    <span className="text-[10px] text-zinc-500 block mt-0.5">{motion.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration, Ratio, FPS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-1">Duration</label>
                <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                  {(['4s', '8s', '16s'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      className={`py-1 text-xs font-mono rounded-lg transition-colors ${
                        duration === d ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-1">Aspect Ratio</label>
                <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                  {(['16:9', '9:16', '1:1'] as AspectRatioType[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setAspectRatio(r)}
                      className={`py-1 text-xs font-mono rounded-lg transition-colors ${
                        aspectRatio === r ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-1">Frame Rate</label>
                <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                  {([24, 30, 60] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFps(f)}
                      className={`py-1 text-xs font-mono rounded-lg transition-colors ${
                        fps === f ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {f}fps
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Motion Intensity Slider */}
            <div className="pt-2">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-medium text-zinc-300">Motion Amplitude / Speed</span>
                <span className="font-mono text-zinc-400">Level {motionIntensity} / 10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={motionIntensity}
                onChange={(e) => setMotionIntensity(parseInt(e.target.value))}
                className="w-full accent-violet-500 h-2 bg-zinc-950 rounded-lg cursor-pointer"
              />
            </div>

            {/* Copy Prepared Prompt Action */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 active:scale-98 text-white font-semibold text-xs py-3 px-4 rounded-xl transition-all shadow-md shadow-violet-950 min-h-[44px]"
              >
                {copiedPrompt ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>প্রম্পট কপি হয়েছে! (Copied Ready Prompt)</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Full Video Prompt for Google Flow</span>
                  </>
                )}
              </button>

              <a
                href="https://flow.google"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 active:scale-98 text-zinc-100 font-medium text-xs py-3 px-4 rounded-xl transition-colors border border-zinc-700 min-h-[44px]"
              >
                <ExternalLink className="w-4 h-4 text-violet-400" />
                <span>Open Google Flow (ফ্লো খুলুন)</span>
              </a>
            </div>
          </div>

          {/* STEP 2: Instruction Guide */}
          <div className="bg-gradient-to-r from-violet-950/30 to-zinc-900 border border-violet-800/40 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-violet-800/30">
              <span className="w-6 h-6 rounded-full bg-violet-600/30 text-violet-400 border border-violet-500/40 text-xs font-bold flex items-center justify-center">
                ২
              </span>
              <h2 className="text-sm font-semibold text-zinc-100">
                Step 2: Google Flow / Veo Instructions (কীভাবে আসল ভিডিও তৈরি করবেন)
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-zinc-300">
              <div className="p-3 bg-zinc-950/70 rounded-xl border border-zinc-800/80 space-y-1">
                <span className="font-semibold text-violet-300 block">১. প্রম্পট পেস্ট করুন:</span>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Google Flow (flow.google) অথবা আপনার পছন্দের ভিডিও এআই ইঞ্জিনে ওপরের কপি করা মোশন প্রম্পটটি দিন।
                </p>
              </div>

              <div className="p-3 bg-zinc-950/70 rounded-xl border border-zinc-800/80 space-y-1">
                <span className="font-semibold text-violet-300 block">২. ভিডিও ডাউনলোড করুন:</span>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  রেন্ডারিং সম্পন্ন হলে আসল MP4 বা WebM ফাইলটি আপনার ডিভাইসে ডাউনলোড করুন।
                </p>
              </div>
            </div>
          </div>

          {/* STEP 3: Real Video Import */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-800/80">
              <span className="w-6 h-6 rounded-full bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center justify-center">
                ৩
              </span>
              <h2 className="text-sm font-semibold text-zinc-100">
                Step 3: Import Real Video (আসল ভিডিও ফাইল My Assets-এ ইমপোর্ট করুন)
              </h2>
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileSelect(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-violet-500 bg-violet-950/20'
                  : selectedFile
                  ? 'border-emerald-500/60 bg-emerald-950/10'
                  : 'border-zinc-700 hover:border-violet-500 bg-zinc-950/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className="hidden"
              />

              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-violet-600/20 text-violet-400 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-200">
                    {selectedFile
                      ? `নির্বাচিত ফাইল: ${selectedFile.name}`
                      : 'ভিডিও ফাইল ড্রপ করুন বা ব্রাউজ করতে ক্লিক করুন'}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    সাপোর্টেড ফরম্যাট: MP4, WebM, MOV · IndexedDB-তে সুরক্ষিতভাবে সেভ হবে
                  </p>
                </div>
              </div>
            </div>

            {/* Real Metadata Inspection Card */}
            {selectedFile && (
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>প্রকৃত ফাইল থেকে মেটাডেটা যাচাই সম্পন্ন</span>
                  </span>
                  {isInspecting && <span className="text-violet-400 animate-pulse text-[11px]">মেটাডেটা রিড হচ্ছে...</span>}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-400 block">Resolution (রেজোলিউশন)</span>
                    <span className="font-mono text-zinc-100 font-medium">
                      {inspectedData?.dimensions || 'Not available'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-400 block">Duration (দৈর্ঘ্য)</span>
                    <span className="font-mono text-zinc-100 font-medium">
                      {inspectedData?.duration || 'Not available'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-400 block">File Size (আকার)</span>
                    <span className="font-mono text-zinc-100 font-medium">
                      {inspectedData?.fileSize || 'Not available'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-400 block">Format (ফরম্যাট)</span>
                    <span className="font-mono text-zinc-100 font-medium">
                      {inspectedData?.fileFormat || 'Not available'}
                    </span>
                  </div>
                </div>

                {/* Title input */}
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">Asset Title (অ্যাসেট নাম)</label>
                  <input
                    type="text"
                    value={importTitle}
                    onChange={(e) => setImportTitle(e.target.value)}
                    placeholder="ভিডিওর শিরোনাম লিখুন"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none"
                  />
                </div>

                {/* Save button */}
                <button
                  type="button"
                  onClick={handleSaveImportedVideo}
                  disabled={importSuccess}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:scale-98 disabled:opacity-50 text-white font-semibold text-xs py-3 px-4 rounded-xl transition-all shadow-md shadow-emerald-950 min-h-[44px]"
                >
                  {importSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>My Assets-এ সফলভাবে সংরক্ষিত হয়েছে!</span>
                    </>
                  ) : (
                    <>
                      <FileVideo className="w-4 h-4" />
                      <span>Save Real Video to My Assets (আমার অ্যাসেট-এ সংরক্ষণ করুন)</span>
                    </>
                  )}
                </button>

                {savedAssetForModal && (
                  <button
                    type="button"
                    onClick={() => setShowStudioModal(true)}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-98 text-white font-semibold text-xs py-3 px-4 rounded-xl transition-all shadow-md shadow-violet-950 min-h-[44px]"
                  >
                    <Film className="w-4 h-4 text-violet-100" />
                    <span>Open Video Contributor Studio (কোয়ালিটি, ট্রিমার ও প্যাকেজ)</span>
                  </button>
                )}
              </div>
            )}

            {importError && (
              <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-950/30 border border-amber-800/40 p-3 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{importError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Real Video Canvas & Recent Videos */}
        <div className="lg:col-span-5 space-y-6">
          {/* Real Video Player Canvas */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-violet-400" />
                <span>Real Video Preview Canvas</span>
              </h3>
              {previewVideoUrl && (
                <span className="text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-full font-mono">
                  {inspectedData?.dimensions || 'Active'}
                </span>
              )}
            </div>

            {previewVideoUrl ? (
              <div className="aspect-video bg-black rounded-xl overflow-hidden border border-zinc-800 shadow-xl relative group">
                <video
                  src={previewVideoUrl}
                  controls
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="aspect-video bg-zinc-950 rounded-xl border border-zinc-800/80 flex flex-col items-center justify-center p-6 text-center text-zinc-400 space-y-2.5">
                <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                  <Film className="w-6 h-6 text-violet-400/80" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-300">প্রকৃত ভিডিও ক্যানভাস অপেক্ষমান</p>
                  <p className="text-[11px] text-zinc-400 max-w-xs mt-1 leading-relaxed">
                    কোনো ফেক প্রিভিউ দেখানো হবে না। বামদিকের ৩-ধাপের গাইডলাইন দিয়ে আসল ভিডিও ফাইল ইমপোর্ট করলে এখানে লাইভ প্লে হবে।
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Recent Video Generations / Imports */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-200">
                Recent Video Assets ({recentVideos.length})
              </h3>
              {onNavigateToAssets && (
                <button
                  onClick={onNavigateToAssets}
                  className="text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
                >
                  <span>সব দেখুন</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {recentVideos.length === 0 ? (
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 text-center text-zinc-400 text-xs">
                এখনো কোনো ভিডিও অ্যাসেট সংরক্ষিত নেই। উপরের ৩ নম্বর ধাপে আপনার প্রথম ভিডিওটি ইমপোর্ট করুন।
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {recentVideos.slice(0, 4).map((vid) => (
                  <div
                    key={vid.id}
                    onClick={() => onSelectAsset(vid)}
                    className="group relative aspect-video rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-violet-500 transition-colors"
                  >
                    {vid.thumbnailUrl ? (
                      <img
                        src={vid.thumbnailUrl}
                        alt={vid.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-500">
                        <Video className="w-6 h-6" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
                      <div className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white">
                        <Play className="w-3 h-3 fill-white translate-x-0.5" />
                      </div>
                    </div>
                    <div className="absolute bottom-1 left-1 right-1 flex justify-between items-center text-[9px] text-white bg-black/70 px-1.5 py-0.5 rounded backdrop-blur-sm">
                      <span className="truncate max-w-[80px]">{vid.title}</span>
                      <span className="font-mono">{vid.duration || 'Video'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Video Studio Modal (Priority 2.5) */}
      {showStudioModal && savedAssetForModal && (
        <VideoStudioModal
          asset={savedAssetForModal}
          isOpen={showStudioModal}
          onClose={() => setShowStudioModal(false)}
        />
      )}
    </div>
  );
};
