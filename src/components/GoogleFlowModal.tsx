import React, { useState, useRef } from 'react';
import { Asset, AspectRatioType } from '../types';
import {
  ExternalLink,
  Upload,
  CheckCircle2,
  Sparkles,
  Info,
  X,
  Image as ImageIcon,
  Video,
  FileCheck,
  AlertCircle,
  FolderHeart,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

import { inspectVideoFile, inspectImageFile, MediaInspectionResult } from '../utils/mediaInspector';

interface GoogleFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportAsset: (
    asset: Omit<Asset, 'id' | 'createdAt' | 'views'>,
    mediaBlob?: Blob,
    thumbnailBlob?: Blob
  ) => void;
  onNavigateToAssets?: () => void;
}

export const GoogleFlowModal: React.FC<GoogleFlowModalProps> = ({
  isOpen,
  onClose,
  onImportAsset,
  onNavigateToAssets,
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'guide'>('import');
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inspectedMetadata, setInspectedMetadata] = useState<MediaInspectionResult | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('16:9');
  const [style, setStyle] = useState('Photorealistic');
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (file: File) => {
    if (!file) return;
    setImportError(null);
    setImportSuccess(false);

    // Validate supported formats: JPG, JPEG, PNG, WebP (and optionally Flow video MP4/WebM)
    const validImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const isImage = validImageTypes.includes(file.type.toLowerCase()) || /\.(jpe?g|png|webp)$/i.test(file.name);
    const isVid = validVideoTypes.includes(file.type.toLowerCase()) || /\.(mp4|webm|mov)$/i.test(file.name);

    if (!isImage && !isVid) {
      setImportError('শুধুমাত্র JPG, JPEG, PNG এবং WebP ছবি (বা MP4/WebM ভিডিও) নির্বাচন করা যাবে।');
      setFileDataUrl(null);
      setFileName('');
      setSelectedFile(null);
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setImportError('ফাইলের সাইজ ৫০ মেগাবাইটের (50MB) চেয়ে বেশি হতে পারবে না।');
      setFileDataUrl(null);
      setFileName('');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setFileName(file.name);
    setMediaType(isVid ? 'video' : 'image');

    if (!title) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }

    const objectUrl = URL.createObjectURL(file);
    setFileDataUrl(objectUrl);

    setIsInspecting(true);
    try {
      if (isVid) {
        const res = await inspectVideoFile(file);
        setInspectedMetadata(res);
        if (res.aspectRatio) {
          setAspectRatio(res.aspectRatio);
        }
      } else {
        const res = await inspectImageFile(file);
        setInspectedMetadata(res);
        if (res.aspectRatio) {
          setAspectRatio(res.aspectRatio);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsInspecting(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  };

  const handleSaveImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileDataUrl) return;

    const finalDimensions =
      inspectedMetadata?.dimensions ||
      (aspectRatio === '16:9' ? '1920 × 1080' : aspectRatio === '9:16' ? '1080 × 1920' : '1024 × 1024');
    const finalDuration = mediaType === 'video' ? inspectedMetadata?.duration || 'Not available' : undefined;
    const finalFps = mediaType === 'video' ? inspectedMetadata?.fps || 30 : undefined;
    const finalFormat = inspectedMetadata?.fileFormat || (mediaType === 'video' ? 'MP4' : 'PNG');
    const finalSize = inspectedMetadata?.fileSize || 'Not available';

    onImportAsset(
      {
        title: title.trim() || 'Google Flow Creation',
        type: mediaType,
        prompt: prompt.trim() || 'Created with Google Flow (Free Credits)',
        style,
        aspectRatio,
        dimensions: finalDimensions,
        duration: finalDuration,
        fps: finalFps,
        url: fileDataUrl,
        thumbnailUrl: inspectedMetadata?.thumbnailUrl || fileDataUrl,
        isFavorite: false,
        model: 'Google Flow FX (Free Credits)',
        source: 'Google Flow',
        sourceUrl: 'https://flow.google',
        fileSize: finalSize,
        fileFormat: finalFormat,
      },
      selectedFile || undefined,
      inspectedMetadata?.thumbnailBlob || undefined
    );

    setImportSuccess(true);
    setTimeout(() => {
      setImportSuccess(false);
      // Reset form
      setFileDataUrl(null);
      setSelectedFile(null);
      setInspectedMetadata(null);
      setFileName('');
      setTitle('');
      setPrompt('');
      if (onNavigateToAssets) {
        onNavigateToAssets();
      }
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-0.5 flex items-center justify-center shadow-lg shadow-blue-950/40">
              <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Google Flow Integration
                </h2>
                <span className="text-[10px] font-medium bg-cyan-950/80 text-cyan-400 border border-cyan-800/70 px-2 py-0.5 rounded-full">
                  Free Credits
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                অফিসিয়াল Google Flow সাইটে ফ্রি ক্রেডিট দিয়ে তৈরি করে Studio-তে Import করুন
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation & Official Link Action */}
        <div className="px-4 sm:px-5 py-3 bg-zinc-900/30 border-b border-zinc-800/60 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setActiveTab('import')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'import'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Import to My Assets
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'guide'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              কীভাবে কাজ করে (Guide)
            </button>
          </div>

          {/* Official Google Flow Website Link Button */}
          <a
            href="https://flow.google"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-medium px-3.5 py-1.5 rounded-xl shadow-md shadow-blue-950/40 transition-all active:scale-95 shrink-0"
          >
            <span>Open Google Flow (ফ্রি ক্রেডিট)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Honest Transparent Policy Notice */}
          <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-3 sm:p-3.5 text-xs text-blue-200/90 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-blue-300">
                সরাসরি API তথ্য (API Transparency):
              </p>
              <p className="text-[11px] leading-relaxed text-blue-200/80">
                Google Flow-এর কোনো পাবলিক অনুমোদিত REST API নেই। তাই এটি কোনো অননুমোদিত ফেক ইন্টিগ্রেশন ছাড়াই স্বচ্ছভাবে কাজ করে: আপনি অফিসিয়াল Flow ওয়েবসাইট থেকে সম্পূর্ণ ফ্রিতে ছবি বা ভিডিও জেনারেট করে ডাউনলোড করবেন, এবং নিচের ড্রপজোনে আপলোড করে সরাসরি <strong>My Assets</strong>-এ যুক্ত করবেন।
              </p>
            </div>
          </div>

          {activeTab === 'import' ? (
            <form onSubmit={handleSaveImport} className="space-y-4">
              {/* File Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-950/20'
                    : fileDataUrl
                    ? 'border-emerald-700/80 bg-emerald-950/10'
                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/70'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileChange(f);
                  }}
                />

                {fileDataUrl ? (
                  <div className="space-y-3">
                    <div className="relative max-h-48 rounded-lg overflow-hidden border border-zinc-800 inline-block bg-black">
                      {mediaType === 'video' ? (
                        <video src={fileDataUrl} className="max-h-48 max-w-full rounded-lg" controls />
                      ) : (
                        <img src={fileDataUrl} alt="Preview" className="max-h-48 max-w-full object-contain rounded-lg" />
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs text-emerald-400">
                      <FileCheck className="w-4 h-4" />
                      <span className="font-medium truncate max-w-xs">{fileName}</span>
                      <span className="text-[10px] text-zinc-400 uppercase">({mediaType})</span>
                    </div>

                    {inspectedMetadata && (
                      <div className="flex items-center justify-center gap-2 flex-wrap text-[11px] text-zinc-300">
                        <span className="bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md font-mono">
                          {inspectedMetadata.dimensions}
                        </span>
                        {inspectedMetadata.duration && (
                          <span className="bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md font-mono">
                            {inspectedMetadata.duration}
                          </span>
                        )}
                        <span className="bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md font-mono">
                          {inspectedMetadata.fileSize}
                        </span>
                        <span className="bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md text-indigo-300">
                          {inspectedMetadata.fileFormat}
                        </span>
                      </div>
                    )}
                    <p className="text-[10px] text-zinc-500">অন্য ফাইল বেছে নিতে এখানে ক্লিক করুন</p>
                  </div>
                ) : (
                  <div className="space-y-2 py-4">
                    <div className="w-10 h-10 rounded-full bg-zinc-800/80 text-zinc-400 mx-auto flex items-center justify-center">
                      <Upload className="w-5 h-5 text-indigo-400" />
                    </div>
                    <p className="text-xs font-semibold text-zinc-200">
                      Google Flow থেকে ডাউনলোড করা ছবি বা ভিডিও এখানে ড্রপ করুন
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      বা ক্লিক করে ব্রাউজ করুন (PNG, JPG, WebP, MP4, WebM)
                    </p>
                  </div>
                )}
              </div>

              {/* Explicit Upload Error Message Banner */}
              {importError && (
                <div className="bg-rose-950/50 border border-rose-800/80 rounded-xl p-3 text-xs text-rose-200 flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-rose-300">আপলোড ব্যর্থ হয়েছে (Upload Error)</p>
                    <p className="text-[11px] text-rose-200/90 mt-0.5 leading-relaxed">{importError}</p>
                  </div>
                </div>
              )}

              {/* Form Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    কন্টেন্টের শিরোনাম (Title)
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="যেমন: Safawi Dates Luxury Commercial"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    মিডিয়ার ধরন (Media Type)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMediaType('image')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium border transition-colors ${
                        mediaType === 'image'
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Image</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaType('video')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium border transition-colors ${
                        mediaType === 'video'
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Video</span>
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Google Flow-এ ব্যবহৃত প্রম্পট (Prompt)
                  </label>
                  <textarea
                    rows={2}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Flow-এ যে প্রম্পট দিয়ে তৈরি করেছিলেন তা এখানে পেস্ট করুন..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    অ্যাসপেক্ট রেশিও (Aspect Ratio)
                  </label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value as AspectRatioType)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="16:9">16:9 (Landscape / YouTube)</option>
                    <option value="9:16">9:16 (Vertical / Reels / TikTok)</option>
                    <option value="1:1">1:1 (Square / Instagram)</option>
                    <option value="4:3">4:3 (Standard)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    স্টাইল (Style)
                  </label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Photorealistic">Photorealistic</option>
                    <option value="Cinematic 3D">Cinematic 3D</option>
                    <option value="Commercial Ad">Commercial Ad</option>
                    <option value="Anime & Manga">Anime & Manga</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                {importSuccess ? (
                  <div className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>My Assets-এ সফলভাবে Import সম্পন্ন হয়েছে!</span>
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={!fileDataUrl}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-lg shadow-indigo-950/50 transition-all flex items-center justify-center gap-2 active:scale-98"
                  >
                    <FolderHeart className="w-4 h-4" />
                    <span>Import to My Assets (স্টুডিওতে সংরক্ষণ)</span>
                  </button>
                )}
              </div>
            </form>
          ) : (
            /* Guide Tab */
            <div className="space-y-3.5 text-xs">
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Google Flow ব্যবহারের ৪টি সহজ ধাপ:
                </h3>
                <div className="space-y-2.5 text-zinc-300">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-900/80 text-indigo-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                      ১
                    </span>
                    <p className="text-[12px] leading-relaxed">
                      <strong>অফিসিয়াল সাইটে যান:</strong> উপরের <span className="text-cyan-400 font-medium">"Open Google Flow"</span> বাটনে ক্লিক করে <code className="bg-zinc-800 px-1 py-0.5 rounded text-[11px]">flow.google</code> বা Google Labs FX ওপেন করুন। আপনার Google অ্যাকাউন্ট দিয়ে লগইন করলেই ফ্রি ক্রেডিট পেয়ে যাবেন।
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-900/80 text-indigo-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                      ২
                    </span>
                    <p className="text-[12px] leading-relaxed">
                      <strong>ছবি বা ভিডিও তৈরি করুন:</strong> আপনার কাঙ্ক্ষিত প্রম্পট লিখুন (যেমন: সাফাওয়ী খেজুর বা লাক্সারি পারফিউম বিজ্ঞাপন) এবং ফ্রি ক্রেডিট ব্যবহার করে জেনারেট করুন।
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-900/80 text-indigo-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                      ৩
                    </span>
                    <p className="text-[12px] leading-relaxed">
                      <strong>ডাউনলোড করুন:</strong> তৈরি করা ছবি বা ভিডিওটি আপনার মোবাইল বা কম্পিউটারে সেভ করে নিন।
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-900/80 text-indigo-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                      ৪
                    </span>
                    <p className="text-[12px] leading-relaxed">
                      <strong>স্টুডিওতে Import করুন:</strong> এই মডালের <span className="text-indigo-400 font-medium">"Import to My Assets"</span> ট্যাবে ফাইলটি আপলোড করলেই তা স্থায়ীভাবে আপনার AI Creator Studio গ্যালারিতে সেভ হয়ে যাবে।
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-200">Google Labs FX এক্সপ্লোর করতে চান?</p>
                  <p className="text-[11px] text-zinc-400">ImageFX ও VideoFX-এর অফিসিয়াল ল্যাব</p>
                </div>
                <a
                  href="https://labs.google/fx/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-colors"
                >
                  <span>Open Labs FX</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
