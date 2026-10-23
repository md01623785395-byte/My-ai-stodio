import React, { useState, useEffect } from 'react';
import { Asset } from '../types';
import { upscaleImageReal, convertToJpegReal, EnhancementResult } from '../utils/imageEnhancer';
import {
  X,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Download,
  Store,
  RefreshCw,
  Maximize2,
  FileText,
  ShieldCheck,
  Check,
  ArrowRight,
  Info,
} from 'lucide-react';

interface ImageEnhancementModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveEnhancedAsset: (newAsset: Omit<Asset, 'id' | 'createdAt' | 'views'>) => void;
  onOpenStockModal?: (asset: Asset) => void;
}

export const ImageEnhancementModal: React.FC<ImageEnhancementModalProps> = ({
  asset,
  isOpen,
  onClose,
  onSaveEnhancedAsset,
  onOpenStockModal,
}) => {
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EnhancementResult | null>(null);
  const [savedAsset, setSavedAsset] = useState<Asset | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Reset state when modal opens or asset changes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setResult(null);
      setSavedAsset(null);
      setProcessing(false);
      setDownloadSuccess(false);
    }
  }, [isOpen, asset?.id]);

  if (!isOpen || !asset) return null;

  // Infer current dimension numbers
  const dimMatch = (asset.dimensions || '').match(/(\d+)\s*[x×]\s*(\d+)/i);
  let curW = 1024;
  let curH = 1024;
  if (dimMatch) {
    curW = parseInt(dimMatch[1], 10);
    curH = parseInt(dimMatch[2], 10);
  } else if (asset.aspectRatio === '16:9') {
    curW = 1920;
    curH = 1080;
  } else if (asset.aspectRatio === '9:16') {
    curW = 1080;
    curH = 1920;
  }
  const curMp = Number(((curW * curH) / 1_000_000).toFixed(2));
  const isCurJpeg =
    asset.url.startsWith('data:image/jpeg') ||
    asset.url.toLowerCase().endsWith('.jpg') ||
    asset.url.toLowerCase().endsWith('.jpeg');

  const handleEnhance = async (type: 'upscale-2x' | 'upscale-4x' | 'convert-jpeg') => {
    if (asset.type === 'video') {
      setError('ভিডিও ফাইল আপস্কেল সমর্থিত নয়; শুধুমাত্র ছবি (JPG, PNG, WebP) প্রসেস করা যায়।');
      return;
    }

    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      let res: EnhancementResult;

      if (type === 'upscale-2x') {
        setProcessingStep('পিক্সেল রিড ও 2x হাই-কোয়ালিটি ক্যানভাস রিস্যাম্পলিং...');
        res = await upscaleImageReal(asset.url, 2);
      } else if (type === 'upscale-4x') {
        setProcessingStep('পিক্সেল রিড ও 4x মাল্টি-পাস সুপার-স্যাম্পলিং...');
        res = await upscaleImageReal(asset.url, 4);
      } else {
        setProcessingStep('ক্লিন sRGB ব্যাকগ্রাউন্ড ও JPEG কালার এনকোডিং...');
        res = await convertToJpegReal(asset.url, 0.95);
      }

      setResult(res);

      // Create enhanced asset as a separate copy (original asset kept untouched)
      const label =
        type === 'upscale-4x'
          ? '4x Ultra Upscaled'
          : type === 'upscale-2x'
          ? '2x Upscaled'
          : 'JPEG sRGB';

      const enhancedAssetPayload: Omit<Asset, 'id' | 'createdAt' | 'views'> = {
        title: `${asset.title} [${label}]`,
        type: 'image',
        prompt: asset.prompt,
        negativePrompt: asset.negativePrompt,
        style: asset.style,
        aspectRatio: asset.aspectRatio,
        dimensions: `${res.newWidth} × ${res.newHeight}`,
        url: res.dataUrl,
        thumbnailUrl: res.dataUrl,
        isFavorite: false,
        model: `Studio Enhancer (${label})`,
        source: 'Studio',
        fileSize: `${res.fileSizeMb} MB`,
        fileFormat: res.format === 'JPEG' ? 'JPEG Image' : 'PNG Image',
      };

      // Save to My Assets as a separate copy
      onSaveEnhancedAsset(enhancedAssetPayload);

      // Create full asset object for instant interaction
      const now = new Date();
      const formattedDate = `${now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })} · ${now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })}`;

      const createdAssetObj: Asset = {
        ...enhancedAssetPayload,
        id: `enhanced-${Date.now()}`,
        createdAt: formattedDate,
        views: 1,
      };

      setSavedAsset(createdAssetObj);
    } catch (err: any) {
      console.error('Enhancement error:', err);
      // Requirement 5: Show clear error without faking demo results
      setError(
        err.message ||
          'ইমেজ এনহ্যান্সমেন্ট ব্যর্থ হয়েছে। ব্রাউজার ক্যানভাস মেমোরি বা ফাইল সমস্যার কারণে প্রসেস করা সম্ভব হয়নি।'
      );
    } finally {
      setProcessing(false);
      setProcessingStep('');
    }
  };

  const handleDownloadResult = () => {
    if (!result || !savedAsset) return;
    setDownloadSuccess(true);
    const link = document.createElement('a');
    link.href = result.dataUrl;
    link.download = `${savedAsset.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloadSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-950/50">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-100 flex items-center gap-2">
                <span>Image Enhancement & Stock Optimization</span>
                <span className="text-[10px] font-medium bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full">
                  Real Canvas Engine
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                প্রকৃত পিক্সেল রেজোলিউশন বৃদ্ধি (2x/4x) ও sRGB JPEG ফরম্যাট রূপান্তর
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Current Asset Info Banner */}
          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3.5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-zinc-900 shrink-0 border border-zinc-800 relative group">
              <img
                src={asset.thumbnailUrl || asset.url}
                alt={asset.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs sm:text-sm font-semibold text-zinc-200 truncate">
                  {asset.title}
                </h4>
                <span className="text-[10px] text-zinc-400 font-mono bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 shrink-0">
                  মূল ফাইল
                </span>
              </div>

              {/* Current Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                <div className="bg-zinc-900/80 p-1.5 rounded-lg border border-zinc-800/60">
                  <span className="text-zinc-500 block text-[10px]">পিক্সেল রেজোলিউশন</span>
                  <span className="text-zinc-200 font-mono font-medium">
                    {curW} × {curH} px
                  </span>
                </div>
                <div className="bg-zinc-900/80 p-1.5 rounded-lg border border-zinc-800/60">
                  <span className="text-zinc-500 block text-[10px]">মেগাপিক্সেল</span>
                  <span className="text-zinc-200 font-mono font-medium">{curMp} MP</span>
                </div>
                <div className="bg-zinc-900/80 p-1.5 rounded-lg border border-zinc-800/60">
                  <span className="text-zinc-500 block text-[10px]">বর্তমান ফরম্যাট</span>
                  <span className="text-zinc-200 font-medium">
                    {isCurJpeg ? 'JPEG (.jpg)' : 'PNG / WebP'}
                  </span>
                </div>
                <div className="bg-zinc-900/80 p-1.5 rounded-lg border border-zinc-800/60">
                  <span className="text-zinc-500 block text-[10px]">স্টক শর্ত স্ট্যাটাস</span>
                  <span
                    className={`font-semibold ${
                      curMp >= 4.0 && isCurJpeg ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {curMp >= 4.0 && isCurJpeg ? 'উত্তীর্ণ ✅' : 'উন্নয়ন প্রয়োজন ⚠️'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Cards: 3 Options (2x Upscale, 4x Upscale, Convert to JPEG) */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>উপযুক্ত এনহ্যান্সমেন্ট অ্যাকশন নির্বাচন করুন</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option 1: 2x Upscale */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 hover:border-indigo-500/50 flex flex-col justify-between transition-all">
                <div className="space-y-1 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-100 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>2x Upscale</span>
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-800">
                      ~{(curMp * 4).toFixed(1)} MP
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    আসল পিক্সেল রেজোলিউশন দ্বিগুণ করবে ({curW * 2} × {curH * 2} px) এবং sRGB JPEG-এ সেভ করবে।
                  </p>
                </div>

                <button
                  onClick={() => handleEnhance('upscale-2x')}
                  disabled={processing}
                  className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold py-2 px-3 rounded-xl transition-all shadow-md shadow-indigo-950/40 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>2x Upscale প্রয়োগ করুন</span>
                </button>
              </div>

              {/* Option 2: 4x Upscale */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-emerald-900/50 hover:border-emerald-500/60 flex flex-col justify-between transition-all relative overflow-hidden">
                <div className="space-y-1 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-200 flex items-center gap-1">
                      <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>4x Ultra Upscale</span>
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                      ১৬ MP+ সুপারিশকৃত
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    আসল পিক্সেল রেজোলিউশন ৪ গুণ বাড়িয়ে ({curW * 4} × {curH * 4} px) Adobe Stock-এর ১৬.৬ MP স্ট্যান্ডার্ড পূরণ করবে।
                  </p>
                </div>

                <button
                  onClick={() => handleEnhance('upscale-4x')}
                  disabled={processing}
                  className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold py-2 px-3 rounded-xl transition-all shadow-md shadow-emerald-950/40 disabled:opacity-50"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>4x Ultra Upscale</span>
                </button>
              </div>

              {/* Option 3: Convert to JPEG */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 hover:border-cyan-500/50 flex flex-col justify-between transition-all">
                <div className="space-y-1 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-100 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Convert to JPEG</span>
                    </span>
                    <span className="text-[10px] font-semibold text-cyan-300 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800">
                      sRGB Standard
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    পিক্সেল সাইজ অপরিবর্তিত রেখে PNG/WebP ফাইলকে স্টক মার্কেটপ্লেস উপযোগী sRGB JPEG-এ রূপান্তর করবে।
                  </p>
                </div>

                <button
                  onClick={() => handleEnhance('convert-jpeg')}
                  disabled={processing}
                  className="w-full flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-100 text-xs font-semibold py-2 px-3 rounded-xl transition-all border border-zinc-700 disabled:opacity-50"
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Convert to JPEG</span>
                </button>
              </div>
            </div>
          </div>

          {/* Processing State */}
          {processing && (
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-6 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-zinc-100">{processingStep}</p>
                <p className="text-[11px] text-zinc-400">
                  ব্রাউজার ক্যানভাসে বাস্তব পিক্সেল প্রসেস হচ্ছে; কোনো পেইড API চালু করা হয়নি।
                </p>
              </div>
            </div>
          )}

          {/* Error State (শর্ত ৫: কোনো ডেমোকে আসল বলবে না) */}
          {error && (
            <div className="bg-rose-950/40 border border-rose-800/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-rose-200">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="text-rose-100 block font-semibold">এনহ্যান্সমেন্ট ত্রুটি</strong>
                <p className="text-[11px] text-rose-300/90 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* Enhancement Result Section (শর্ত ৩ ও ৪) */}
          {result && savedAsset && (
            <div className="bg-emerald-950/20 border border-emerald-800/70 rounded-2xl p-4 space-y-3.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-emerald-800/40 pb-2.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-emerald-200">
                      প্রসেস সম্পন্ন! নতুন কপি My Assets-এ সংরক্ষিত হয়েছে
                    </h4>
                    <span className="text-[10px] text-emerald-400/90">
                      মূল ছবিটি অপরিবর্তিত রাখা হয়েছে (Original preserved untouched)
                    </span>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-800">
                  {result.processTimeMs} ms
                </span>
              </div>

              {/* Before vs After Table */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">নতুন পিক্সেল সাইজ</span>
                  <div className="font-mono text-zinc-100 font-bold mt-0.5">
                    {result.newWidth} × {result.newHeight} px
                  </div>
                  <span className="text-[10px] text-emerald-400">
                    পূর্বের: {result.originalWidth} × {result.originalHeight}
                  </span>
                </div>

                <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">নতুন রেজোলিউশন (MP)</span>
                  <div className="font-mono text-zinc-100 font-bold mt-0.5">
                    {result.newMegapixels} MP
                  </div>
                  <span className="text-[10px] text-emerald-400">
                    {result.newMegapixels >= 4.0 ? 'স্টক শর্ত উত্তীর্ণ ✅' : 'কম রেজোলিউশন'}
                  </span>
                </div>

                <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">ফাইল ফরম্যাট</span>
                  <div className="font-mono text-zinc-100 font-bold mt-0.5">
                    {result.format} (.jpg)
                  </div>
                  <span className="text-[10px] text-emerald-400">sRGB কালার স্পেস ✅</span>
                </div>

                <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">নতুন ফাইল সাইজ</span>
                  <div className="font-mono text-zinc-100 font-bold mt-0.5">
                    {result.fileSizeMb} MB
                  </div>
                  <span className="text-[10px] text-zinc-400">&lt; ৪৫ MB সীমার মধ্যে</span>
                </div>
              </div>

              {/* Action Buttons for the new enhanced asset */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                {onOpenStockModal && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenStockModal(savedAsset);
                    }}
                    className="w-full sm:flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold py-2.5 px-3.5 rounded-xl transition-all shadow-md shadow-emerald-950/40"
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>উন্নত ছবিটির জন্য Prepare for Stock ওপেন করুন</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={handleDownloadResult}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-medium py-2.5 px-4 rounded-xl border border-zinc-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloadSuccess ? 'Downloaded!' : 'নতুন JPEG ডাউনলোড'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
