import React, { useState, useEffect, useRef } from 'react';
import { Asset, StockMarketplaceId } from '../types';
import {
  X,
  Play,
  Pause,
  Video,
  Film,
  Scissors,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Download,
  FileSpreadsheet,
  FileCode,
  FileText,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Sliders,
  RefreshCw,
  Eye,
  Info,
  Maximize2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  runVideoQualityCheck,
  VideoQualityReport,
} from '../utils/videoQualityChecker';
import {
  extractVideoThumbnail,
  trimVideoClipClient,
  downloadVideoContributorPackage,
  getClientVideoProcessingCapabilities,
} from '../utils/videoProcessor';
import { getAssetBlobsFromDB } from '../utils/assetStorage';

interface VideoStudioModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateAssetThumbnail?: (assetId: string, newThumbnailUrl: string, newThumbnailBlob?: Blob) => void;
  onSaveNewTrimmedAsset?: (newAsset: Omit<Asset, 'id' | 'createdAt' | 'views'>, mediaBlob?: Blob) => void;
}

const MARKETPLACE_CHOICES: Array<{ id: StockMarketplaceId; name: string; badge: string; color: string }> = [
  { id: 'adobe-stock', name: 'Adobe Stock', badge: 'ভিডিও অনুমোদিত', color: 'emerald' },
  { id: 'shutterstock', name: 'Shutterstock', badge: 'বাহ্যিক AI নিষিদ্ধ', color: 'rose' },
  { id: 'freepik', name: 'Freepik', badge: 'অনিশ্চিত', color: 'amber' },
  { id: 'dreamstime', name: 'Dreamstime', badge: 'মুখ ছাড়া গৃহীত', color: 'emerald' },
  { id: 'wirestock', name: 'Wirestock', badge: 'সিন্ডিকেট স্পেক', color: 'emerald' },
];

export const VideoStudioModal: React.FC<VideoStudioModalProps> = ({
  asset,
  isOpen,
  onClose,
  onUpdateAssetThumbnail,
  onSaveNewTrimmedAsset,
}) => {
  const [activeTab, setActiveTab] = useState<'quality' | 'thumbnail' | 'trimmer' | 'export'>('quality');
  const [selectedMarketplace, setSelectedMarketplace] = useState<StockMarketplaceId>('adobe-stock');

  const [qualityReport, setQualityReport] = useState<VideoQualityReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Video playback state
  const videoRef = useRef<HTMLVideoElement>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  // Poster Thumbnail state
  const [extractedThumbUrl, setExtractedThumbUrl] = useState<string | null>(null);
  const [extractedThumbBlob, setExtractedThumbBlob] = useState<Blob | null>(null);
  const [isExtractingThumb, setIsExtractingThumb] = useState(false);
  const [thumbSuccessMsg, setThumbSuccessMsg] = useState<string | null>(null);

  // Trimming state
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(8);
  const [isTrimming, setIsTrimming] = useState(false);
  const [trimProgress, setTrimProgress] = useState(0);
  const [trimmedVideoResult, setTrimmedVideoResult] = useState<{ url: string; blob: Blob; duration: number } | null>(null);
  const [trimError, setTrimError] = useState<string | null>(null);

  // Export package state
  const [isExportingPackage, setIsExportingPackage] = useState(false);
  const [packageExportedFiles, setPackageExportedFiles] = useState<string[]>([]);

  // Native Blob from IndexedDB
  const [nativeMediaBlob, setNativeMediaBlob] = useState<Blob | undefined>(undefined);

  const capabilities = getClientVideoProcessingCapabilities();

  // Load Native Blob from IndexedDB on open
  useEffect(() => {
    if (!asset || !isOpen) return;

    let isMounted = true;
    getAssetBlobsFromDB(asset.id).then((blobs) => {
      if (isMounted && blobs?.mediaBlob) {
        setNativeMediaBlob(blobs.mediaBlob);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [asset?.id, isOpen]);

  // Run Quality Check whenever asset or marketplace changes
  useEffect(() => {
    if (!asset || !isOpen) return;

    let isMounted = true;
    setLoadingReport(true);

    runVideoQualityCheck(asset, selectedMarketplace, {
      customVideoBlob: nativeMediaBlob,
    })
      .then((rep) => {
        if (isMounted) {
          setQualityReport(rep);
          if (rep.inspectionData.durationSeconds > 0) {
            setTrimEnd(Math.min(rep.inspectionData.durationSeconds, 60));
          }
        }
      })
      .catch((err) => {
        console.error('Video quality check error:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingReport(false);
      });

    return () => {
      isMounted = false;
    };
  }, [asset?.id, asset?.url, selectedMarketplace, nativeMediaBlob, isOpen]);

  // Safe cleanup of playback on unmount or close
  useEffect(() => {
    return () => {
      const vid = videoRef.current;
      if (vid) {
        try {
          if (!vid.paused) {
            vid.pause();
          }
        } catch {
          // ignore
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      const vid = videoRef.current;
      if (vid) {
        try {
          if (!vid.paused) {
            vid.pause();
          }
        } catch {
          // ignore
        }
      }
      setIsPlaying(false);
    }
  }, [isOpen]);

  if (!isOpen || !asset) return null;

  // Video event handlers
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      if (!isNaN(dur) && dur > 0) {
        setVideoDuration(dur);
        setTrimEnd(Math.min(Math.round(dur * 10) / 10, 60));
      }
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      setIsPlaying(false);
      if (playPromiseRef.current) {
        playPromiseRef.current
          .then(() => {
            if (videoRef.current && !videoRef.current.paused) {
              videoRef.current.pause();
            }
          })
          .catch(() => {
            // Harmless if play was aborted
          });
      } else {
        try {
          if (!video.paused) {
            video.pause();
          }
        } catch {
          // ignore
        }
      }
    } else {
      setIsPlaying(true);
      try {
        const promise = video.play();
        if (promise !== undefined) {
          playPromiseRef.current = promise;
          promise
            .catch((err: any) => {
              if (err?.name === 'AbortError' || err?.message?.includes('interrupted')) {
                // Expected browser abort when pause() interrupts play()
                return;
              }
              console.warn('Playback play error:', err);
            })
            .finally(() => {
              playPromiseRef.current = null;
            });
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.warn('Play call error:', err);
        }
      }
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Thumbnail Extraction
  const handleExtractPoster = async () => {
    if (!videoRef.current && !asset.url) return;
    setIsExtractingThumb(true);
    setThumbSuccessMsg(null);

    try {
      const targetSource = videoRef.current || nativeMediaBlob || asset.url;
      const res = await extractVideoThumbnail(targetSource, currentTime || 0.5);
      setExtractedThumbUrl(res.dataUrl);
      setExtractedThumbBlob(res.blob);
      setThumbSuccessMsg(`পোস্টার ফ্রেম সফলভাবে ক্যাপচার হয়েছে (${res.width} × ${res.height} px)`);
    } catch (err: any) {
      setThumbSuccessMsg(`থাম্বনেইল এক্সট্রাকশনে সমস্যা: ${err?.message || 'Error'}`);
    } finally {
      setIsExtractingThumb(false);
    }
  };

  const handleApplyAsAssetThumbnail = () => {
    if (extractedThumbUrl && onUpdateAssetThumbnail) {
      onUpdateAssetThumbnail(asset.id, extractedThumbUrl, extractedThumbBlob || undefined);
      setThumbSuccessMsg('এই পোস্টার ফ্রেমটি My Assets-এ অ্যাসেট থাম্বনেইল হিসেবে সেট করা হয়েছে!');
    }
  };

  // Trimming Execution
  const handleExecuteTrim = async () => {
    if (!asset.url) return;
    setIsTrimming(true);
    setTrimProgress(0);
    setTrimError(null);
    setTrimmedVideoResult(null);

    try {
      const res = await trimVideoClipClient(
        asset.url,
        trimStart,
        trimEnd,
        (p) => setTrimProgress(p)
      );
      setTrimmedVideoResult({
        url: res.downloadUrl,
        blob: res.trimmedBlob,
        duration: res.durationSeconds,
      });
    } catch (err: any) {
      setTrimError(err?.message || 'ভিডিও ট্রিম করতে সমস্যা হয়েছে');
    } finally {
      setIsTrimming(false);
    }
  };

  const handleSaveTrimmedAsNewAsset = () => {
    if (!trimmedVideoResult || !onSaveNewTrimmedAsset) return;

    const newAsset: Omit<Asset, 'id' | 'createdAt' | 'views'> = {
      title: `${asset.title} (Trimmed ${Math.round(trimmedVideoResult.duration)}s)`,
      type: 'video',
      prompt: asset.prompt,
      style: asset.style,
      aspectRatio: asset.aspectRatio,
      dimensions: asset.dimensions,
      duration: `${Math.round(trimmedVideoResult.duration)}s`,
      fps: asset.fps || 30,
      url: trimmedVideoResult.url,
      thumbnailUrl: asset.thumbnailUrl,
      isFavorite: false,
      model: `${asset.model} (Trimmed Clip)`,
      source: asset.source,
      fileSize: `${(trimmedVideoResult.blob.size / (1024 * 1024)).toFixed(2)} MB`,
      fileFormat: trimmedVideoResult.blob.type || 'video/webm',
    };

    onSaveNewTrimmedAsset(newAsset, trimmedVideoResult.blob);
    setTrimError('সফলভাবে My Assets-এ নতুন ট্রিম করা ভিডিও সংরক্ষিত হয়েছে! ✅');
  };

  // Download Full Contributor Package
  const handleDownloadPackage = async () => {
    setIsExportingPackage(true);
    try {
      const res = await downloadVideoContributorPackage(
        asset,
        nativeMediaBlob,
        extractedThumbBlob || undefined,
        qualityReport || undefined
      );
      setPackageExportedFiles(res.filesExported);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExportingPackage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <div
        className="relative w-full max-w-5xl max-h-[92vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30 flex items-center justify-center">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Professional Video Contributor Studio</span>
                <span className="text-[10px] bg-violet-950/80 text-violet-300 border border-violet-700/50 px-2 py-0.5 rounded-full font-mono">
                  Priority 2.5
                </span>
              </h2>
              <p className="text-xs text-zinc-400 truncate max-w-md">
                {asset.title} · {asset.dimensions} · {asset.duration || 'Video'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-zinc-800 transition-colors"
            aria-label="Close video studio"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900/90 border-b border-zinc-800 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setActiveTab('quality')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 ${
              activeTab === 'quality'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 bg-zinc-950/60 border border-zinc-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Quality & Rules Check (কোয়ালিটি নিরীক্ষা)</span>
          </button>

          <button
            onClick={() => setActiveTab('thumbnail')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 ${
              activeTab === 'thumbnail'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 bg-zinc-950/60 border border-zinc-800'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Poster Thumbnail (পোস্টার ফ্রেম)</span>
          </button>

          <button
            onClick={() => setActiveTab('trimmer')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 ${
              activeTab === 'trimmer'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 bg-zinc-950/60 border border-zinc-800'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Video Trimmer (ক্লিপ ট্রিমার)</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 ${
              activeTab === 'export'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 bg-zinc-950/60 border border-zinc-800'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Package (কনট্রিবিউটর প্যাকেজ)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Top Real Video Player Canvas & Scrubber */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="aspect-video bg-black rounded-xl overflow-hidden border border-zinc-800 relative group max-h-[340px] flex items-center justify-center">
              <video
                ref={videoRef}
                src={asset.url}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                playsInline
                className="w-full h-full object-contain"
              />

              {/* Overlay Play/Pause Button */}
              <button
                type="button"
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors"
                aria-label="Toggle playback"
              >
                <div className="w-12 h-12 rounded-full bg-black/70 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform">
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-white" />
                  ) : (
                    <Play className="w-5 h-5 fill-white translate-x-0.5" />
                  )}
                </div>
              </button>

              {/* Top overlay metadata badge */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none">
                <span className="text-[10px] bg-black/80 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-md font-mono backdrop-blur-sm">
                  {qualityReport?.inspectionData.resolutionTier || 'Full HD'}
                </span>
                <span className="text-[10px] bg-black/80 text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded-md font-mono backdrop-blur-sm">
                  {asset.dimensions}
                </span>
              </div>
            </div>

            {/* Custom Interactive Scrubber Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span className="text-zinc-200">
                  {currentTime.toFixed(1)}s / {(videoDuration || 8).toFixed(1)}s
                </span>
                <span>FPS: {asset.fps || 30} · {asset.fileFormat || 'MP4'}</span>
              </div>
              <input
                type="range"
                min="0"
                max={videoDuration || 8}
                step="0.1"
                value={currentTime}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="w-full accent-violet-500 h-2 bg-zinc-950 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* TAB 1: Quality & Rules Check */}
          {activeTab === 'quality' && (
            <div className="space-y-5">
              {/* Marketplace Selector */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-2.5">
                <label className="text-xs font-semibold text-zinc-200 block">
                  Select Stock Marketplace (মার্কেটপ্লেস নির্বাচন করুন):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {MARKETPLACE_CHOICES.map((mp) => (
                    <button
                      key={mp.id}
                      type="button"
                      onClick={() => setSelectedMarketplace(mp.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        selectedMarketplace === mp.id
                          ? 'bg-violet-600/20 border-violet-500 text-violet-200 shadow-sm'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span className="text-xs font-bold block text-zinc-100">{mp.name}</span>
                      <span
                        className={`text-[10px] block mt-0.5 ${
                          mp.color === 'rose'
                            ? 'text-rose-400 font-semibold'
                            : mp.color === 'emerald'
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {mp.badge}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {loadingReport && !qualityReport && (
                <div className="p-8 bg-zinc-900/60 border border-zinc-800 rounded-2xl text-center space-y-3">
                  <RefreshCw className="w-6 h-6 text-violet-400 animate-spin mx-auto" />
                  <p className="text-xs text-zinc-300 font-medium">
                    ভিডিওর প্রযুক্তিগত শর্ত, ব্ল্যাক ফ্রেম ও মার্কেটপ্লেস রুলস যাচাই করা হচ্ছে...
                  </p>
                </div>
              )}

              {qualityReport && (
                <div className="space-y-4">
                  {/* Readiness Banner */}
                  <div
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      qualityReport.readinessColor === 'rose'
                        ? 'bg-rose-950/30 border-rose-800/60 text-rose-200'
                        : qualityReport.readinessColor === 'amber'
                        ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                        : 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        {qualityReport.readinessColor === 'rose' ? (
                          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                        ) : qualityReport.readinessColor === 'amber' ? (
                          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        )}
                        <h3 className="text-sm font-bold">{qualityReport.headlineBn}</h3>
                      </div>
                      <p className="text-xs opacity-90 mt-1 max-w-2xl leading-relaxed">
                        {qualityReport.summaryNoteBn}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-black/40 border border-white/10 block">
                        {qualityReport.readinessLabelBn}
                      </span>
                      <span className="text-[10px] opacity-75 mt-0.5 block">
                        Confidence: {qualityReport.readinessConfidence}
                      </span>
                    </div>
                  </div>

                  {/* Technical & Visual Checks Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Technical Specs & Decoding */}
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
                      <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-violet-400" />
                        <span>প্রযুক্তিগত শর্ত ও ডিকোডিং (Technical Specs)</span>
                      </h4>

                      <div className="space-y-2">
                        {qualityReport.technicalChecks.map((tc) => (
                          <div
                            key={tc.id}
                            className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-850 space-y-1"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-zinc-200">{tc.titleBn}</span>
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                                  tc.status === 'passed'
                                    ? 'bg-emerald-950 text-emerald-300'
                                    : tc.status === 'warning'
                                    ? 'bg-amber-950 text-amber-300'
                                    : 'bg-rose-950 text-rose-300'
                                }`}
                              >
                                {tc.measuredValue}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-relaxed">{tc.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Visual & Audio Integrity */}
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
                      <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                        <Eye className="w-4 h-4 text-violet-400" />
                        <span>ভিজ্যুয়াল ও অডিও নিরীক্ষা (Visual & Audio Review)</span>
                      </h4>

                      <div className="space-y-2">
                        {qualityReport.visualChecks.map((vc) => (
                          <div
                            key={vc.id}
                            className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-850 space-y-1"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-zinc-200">{vc.titleBn}</span>
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                                  vc.status === 'passed'
                                    ? 'bg-emerald-950 text-emerald-300'
                                    : vc.status === 'warning'
                                    ? 'bg-amber-950 text-amber-300'
                                    : 'bg-rose-950 text-rose-300'
                                }`}
                              >
                                {vc.measuredValue}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-relaxed">{vc.message}</p>
                          </div>
                        ))}

                        {qualityReport.audioChecks.map((ac) => (
                          <div
                            key={ac.id}
                            className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-850 space-y-1"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                                {qualityReport.inspectionData.hasAudio ? (
                                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                                ) : (
                                  <VolumeX className="w-3.5 h-3.5 text-emerald-400" />
                                )}
                                <span>{ac.titleBn}</span>
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300">
                                {ac.measuredValue}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-relaxed">{ac.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Marketplace Verified Rules Section */}
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>{selectedMarketplace.toUpperCase()} অফিসিয়াল ভিডিও রুলস মূল্যায়ন</span>
                    </h4>

                    <div className="space-y-2">
                      {qualityReport.marketplaceChecks.map((mc) => (
                        <div
                          key={mc.id}
                          className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-zinc-200">{mc.title}</span>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                                mc.status === 'passed'
                                  ? 'bg-emerald-950 text-emerald-300'
                                  : mc.status === 'warning'
                                  ? 'bg-amber-950 text-amber-300'
                                  : 'bg-rose-950 text-rose-300'
                              }`}
                            >
                              {mc.measuredValue}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 leading-relaxed">{mc.message}</p>
                          {mc.sourceUrl && (
                            <div className="flex items-center gap-2 text-[10px] text-zinc-500 pt-1">
                              <ExternalLink className="w-3 h-3 text-violet-400" />
                              <a
                                href={mc.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-violet-400 hover:underline truncate max-w-md"
                              >
                                {mc.sourceUrl}
                              </a>
                              {mc.lastVerifiedAt && <span>(Verified: {mc.lastVerifiedAt})</span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Disclaimers & Limitations */}
                  <div className="p-3.5 bg-zinc-950/80 border border-zinc-850 rounded-xl space-y-1.5 text-[11px] text-zinc-400">
                    <p className="font-semibold text-zinc-300 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-violet-400" />
                      <span>সতর্কবার্তা ও সীমাবদ্ধতা:</span>
                    </p>
                    <p>{qualityReport.disclaimerBn}</p>
                    <p>{qualityReport.limitationsBn}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Poster Thumbnail Extractor */}
          {activeTab === 'thumbnail' && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-violet-400" />
                  <span>High-Resolution Poster Thumbnail Extraction</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                  ভিডিওর বর্তমান প্লেব্যাক পজিশন ({currentTime.toFixed(1)}s) থেকে সর্বোচ্চ রেজোলিউশনের জেপিইজি পোস্টার ফ্রেম তৈরি করুন।
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleExtractPoster}
                  disabled={isExtractingThumb}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 active:scale-98 disabled:opacity-50 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition-all shadow-md shadow-violet-950"
                >
                  {isExtractingThumb ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>ক্যাপচার হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4" />
                      <span>Capture Current Frame ({currentTime.toFixed(1)}s)</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <span>Quick timestamps:</span>
                  {[0.5, 2.0, 5.0].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleSeek(t)}
                      className="px-2 py-1 bg-zinc-950 border border-zinc-800 rounded-lg font-mono hover:text-white"
                    >
                      {t}s
                    </button>
                  ))}
                </div>
              </div>

              {thumbSuccessMsg && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{thumbSuccessMsg}</span>
                </div>
              )}

              {extractedThumbUrl && (
                <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                  <span className="text-xs font-semibold text-zinc-300 block">
                    ক্যাপচার করা পোস্টার ফ্রেম প্রিভিউ:
                  </span>
                  <div className="max-w-md aspect-video bg-black rounded-lg overflow-hidden border border-zinc-800">
                    <img
                      src={extractedThumbUrl}
                      alt="Captured Poster"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleApplyAsAssetThumbnail}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white text-xs font-medium py-2 px-3.5 rounded-xl transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>My Assets-এ থাম্বনেইল হিসেবে সেট করুন</span>
                    </button>

                    <a
                      href={extractedThumbUrl}
                      download={`${asset.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-poster.jpg`}
                      className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 active:scale-98 text-zinc-200 text-xs font-medium py-2 px-3.5 rounded-xl transition-all border border-zinc-700"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Poster (JPEG)</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Video Trimmer */}
          {activeTab === 'trimmer' && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-violet-400" />
                  <span>Client-Side Video Clip Trimmer</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                  ব্রাউজারেই ভিডিওর শুরু ও শেষের অংশ ট্রিম করে নতুন সাবমিশন-উপযোগী ক্লিপ তৈরি করুন।
                </p>
              </div>

              {/* In/Out Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-zinc-300">Start Time (শুরুর সময়):</span>
                    <span className="font-mono text-violet-400">{trimStart.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(0.1, trimEnd - 0.5)}
                    step="0.1"
                    value={trimStart}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setTrimStart(v);
                      handleSeek(v);
                    }}
                    className="w-full accent-violet-500 h-2 bg-zinc-900 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-zinc-300">End Time (শেষের সময়):</span>
                    <span className="font-mono text-violet-400">{trimEnd.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min={trimStart + 0.5}
                    max={videoDuration || 60}
                    step="0.1"
                    value={trimEnd}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setTrimEnd(v);
                      handleSeek(v);
                    }}
                    className="w-full accent-violet-500 h-2 bg-zinc-900 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center justify-between text-xs text-zinc-400 pt-1 border-t border-zinc-850">
                  <span>
                    ট্রিম করা ক্লিপের মোট দৈর্ঘ্য: <strong className="text-zinc-200">{(trimEnd - trimStart).toFixed(1)}s</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      handleSeek(trimStart);
                      const video = videoRef.current;
                      if (video) {
                        setIsPlaying(true);
                        try {
                          const promise = video.play();
                          if (promise !== undefined) {
                            playPromiseRef.current = promise;
                            promise
                              .catch((err: any) => {
                                if (err?.name === 'AbortError' || err?.message?.includes('interrupted')) {
                                  return;
                                }
                                console.warn('Playback preview error:', err);
                              })
                              .finally(() => {
                                playPromiseRef.current = null;
                              });
                          }
                        } catch (err: any) {
                          if (err?.name !== 'AbortError') {
                            console.warn('Play preview call error:', err);
                          }
                        }
                      }
                    }}
                    className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 font-medium"
                  >
                    <Play className="w-3 h-3" />
                    <span>প্রিভিউ রেঞ্জ প্লে করুন</span>
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleExecuteTrim}
                  disabled={isTrimming}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 active:scale-98 disabled:opacity-50 text-white font-semibold text-xs py-3 px-5 rounded-xl transition-all shadow-md shadow-violet-950"
                >
                  {isTrimming ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>ট্রিম প্রসেসিং হচ্ছে ({trimProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Scissors className="w-4 h-4" />
                      <span>Trim Video Now (ক্লিপ ট্রিম করুন)</span>
                    </>
                  )}
                </button>
              </div>

              {trimProgress > 0 && isTrimming && (
                <div className="space-y-1">
                  <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800">
                    <div
                      className="bg-violet-600 h-full transition-all duration-150"
                      style={{ width: `${trimProgress}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-zinc-400 block text-right font-mono">
                    {trimProgress}%
                  </span>
                </div>
              )}

              {trimmedVideoResult && (
                <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      ট্রিম সম্পন্ন হয়েছে! (দৈর্ঘ্য: {trimmedVideoResult.duration.toFixed(1)}s, আকার: {(trimmedVideoResult.blob.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  </div>

                  <div className="max-w-md aspect-video bg-black rounded-lg overflow-hidden border border-zinc-800">
                    <video
                      src={trimmedVideoResult.url}
                      controls
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSaveTrimmedAsNewAsset}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white text-xs font-medium py-2 px-4 rounded-xl transition-all shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Save as New Asset (My Assets-এ নতুন অ্যাসেট হিসেবে সেভ করুন)</span>
                    </button>

                    <a
                      href={trimmedVideoResult.url}
                      download={`${asset.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-trimmed.webm`}
                      className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 active:scale-98 text-zinc-200 text-xs font-medium py-2 px-4 rounded-xl transition-all border border-zinc-700"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Trimmed Clip</span>
                    </a>
                  </div>
                </div>
              )}

              {trimError && (
                <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl text-xs text-amber-300">
                  {trimError}
                </div>
              )}

              {/* Limitations Notice */}
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-850 space-y-1 text-[11px] text-zinc-400">
                <span className="font-semibold text-zinc-300 block">ট্রান্সকোডিং ও ব্রাউজার সীমাবদ্ধতার স্বচ্ছতা:</span>
                <p>
                  ব্রাউজার স্যান্ডবক্সে সরাসরি MediaRecorder দিয়ে ওয়েবএম/এমপি৪ কন্টেইনারে ট্রিম সম্পন্ন হয়। কোনো ক্ষতিহীন সরাসরি বিটস্ট্রিম কপি বা অ্যাপল প্রোরেস এনকোডিংয়ের জন্য নেটিভ সার্ভার-সাইড এফএফএমপেক (FFmpeg) প্রয়োজন যা ব্রাউজারে স্বয়ংক্রিয়ভাবে অনুকরণের দাবি করা হয় না।
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: Contributor Export Package */}
          {activeTab === 'export' && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Download className="w-4 h-4 text-violet-400" />
                  <span>Stock Contributor Export Package</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                  স্টক মার্কেটপ্লেসে সরাসরি সাবমিটের জন্য আসল ভিডিও ফাইল, সিএসভি মেটাডেটা, জেএসএন ফাইল এবং অডিট চেকলিস্ট ডাউনলোড করুন।
                </p>
              </div>

              {/* Package Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                    <Video className="w-4 h-4 text-violet-400" />
                    <span>১. মূল ভিডিও বাইনারি (Genuine Video Binary)</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    আসল কোয়ালিটি ও বাইনারি ফরম্যাট অক্ষত রেখে ভিডিও ফাইল এক্সপোর্ট।
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>২. সাইডকার সিএসভি মেটাডেটা (Sidecar CSV)</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Adobe Stock, Shutterstock ও Freepik বাল্ক সিএসভি আপলোডের উপযোগী ফাইল।
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                    <FileCode className="w-4 h-4 text-amber-400" />
                    <span>৩. স্ট্যান্ডার্ড জেএসএন মেটাডেটা (JSON Sidecar)</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    এপিআই ও ব্যাকআপের জন্য সম্পূর্ণ মেটাডেটা ও টেকনিক্যাল স্পেসিফিকেশন।
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span>৪. মার্কেটপ্লেস চেকলিস্ট (Checklist TXT)</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    অফিসিয়াল সোর্স লিংক ও মানুষের চেকের ধাপসমূহ লিখিত গাইডলাইন।
                  </p>
                </div>
              </div>

              {/* Single Click Download Package Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleDownloadPackage}
                  disabled={isExportingPackage}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-98 disabled:opacity-50 text-white font-semibold text-xs py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-violet-950 min-h-[46px]"
                >
                  {isExportingPackage ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>প্যাকেজ ফাইলসমূহ এক্সপোর্ট হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download Complete Contributor Package (সম্পূর্ণ প্যাকেজ ডাউনলোড)</span>
                    </>
                  )}
                </button>
              </div>

              {packageExportedFiles.length > 0 && (
                <div className="p-3.5 bg-emerald-950/30 border border-emerald-800/40 rounded-xl space-y-1 text-xs text-emerald-300">
                  <span className="font-semibold block">সফলভাবে ডাউনলোড সম্পন্ন হয়েছে:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90 font-mono">
                    {packageExportedFiles.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
