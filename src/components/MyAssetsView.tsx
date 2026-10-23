import React, { useState, useEffect, useMemo } from 'react';
import { Asset, AssetType, StudioTab } from '../types';
import { GoogleFlowModal } from './GoogleFlowModal';
import { StockPreparationModal } from './StockPreparationModal';
import { ImageEnhancementModal } from './ImageEnhancementModal';
import { BatchStockAuditModal } from './BatchStockAuditModal';
import { auditBatchImageReadiness, BatchAuditSummary } from '../utils/batchStockAuditor';
import {
  FolderHeart,
  Search,
  Grid,
  List,
  Upload,
  Play,
  Heart,
  Download,
  Copy,
  Trash2,
  CheckCircle2,
  Image as ImageIcon,
  Video,
  Sparkles,
  Calendar,
  Clock,
  Info,
  Maximize2,
  ArrowUpDown,
  Tag,
  SlidersHorizontal,
  Check,
  Eye,
  ExternalLink,
  Store,
  Sliders,
  HardDrive,
  Database,
  ShieldCheck,
  Cpu,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';
import { inspectVideoFile, inspectImageFile } from '../utils/mediaInspector';
import { getStorageQuotaInfo, StorageQuotaInfo } from '../utils/assetStorage';

interface MyAssetsViewProps {
  assets: Asset[];
  onSelectAsset: (asset: Asset) => void;
  onToggleFavorite: (id: string) => void;
  onDeleteAsset: (id: string) => void;
  onAddCustomAsset: (
    asset: Omit<Asset, 'id' | 'createdAt' | 'views'>,
    mediaBlob?: Blob,
    thumbnailBlob?: Blob
  ) => void;
  onNavigate?: (tab: StudioTab) => void;
}

export const MyAssetsView: React.FC<MyAssetsViewProps> = ({
  assets,
  onSelectAsset,
  onToggleFavorite,
  onDeleteAsset,
  onAddCustomAsset,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'image' | 'video' | 'marketing' | 'flow' | 'favorites'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [recentlyDeletedTitle, setRecentlyDeletedTitle] = useState<string | null>(null);
  const [showFlowModal, setShowFlowModal] = useState(false);
  const [stockModalAsset, setStockModalAsset] = useState<Asset | null>(null);
  const [enhanceModalAsset, setEnhanceModalAsset] = useState<Asset | null>(null);
  const [enhancedToast, setEnhancedToast] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; currentFileName: string } | null>(null);
  const [batchAuditSummary, setBatchAuditSummary] = useState<BatchAuditSummary | null>(null);
  const [showBatchAuditModal, setShowBatchAuditModal] = useState(false);
  const [isAuditingBatch, setIsAuditingBatch] = useState(false);

  const handleRunBatchAudit = async (targetAssets?: Asset[]) => {
    const assetsToAudit = targetAssets || assets.filter((a) => a.type === 'image');
    if (assetsToAudit.length === 0) {
      setEnhancedToast('নিরীক্ষা করার মতো কোনো ইমেজ ফাইল পাওয়া যায়নি।');
      setTimeout(() => setEnhancedToast(null), 3000);
      return;
    }
    setIsAuditingBatch(true);
    try {
      const summary = await auditBatchImageReadiness(assetsToAudit);
      setBatchAuditSummary(summary);
      setShowBatchAuditModal(true);
    } catch (err) {
      console.error('Batch stock readiness audit failed:', err);
    } finally {
      setIsAuditingBatch(false);
    }
  };

  const handleSaveEnhancedAsset = (enhancedPayload: Omit<Asset, 'id' | 'createdAt' | 'views'>) => {
    onAddCustomAsset(enhancedPayload);
    setEnhancedToast(`উন্নত কপি (${enhancedPayload.dimensions}) My Assets-এ সফলভাবে সংরক্ষিত হয়েছে!`);
    setTimeout(() => setEnhancedToast(null), 3500);
  };

  const [quotaInfo, setQuotaInfo] = useState<StorageQuotaInfo | null>(null);

  useEffect(() => {
    getStorageQuotaInfo().then((info) => {
      if (info) setQuotaInfo(info);
    });
  }, [assets.length]);

  // Safe multi-file upload with independent media inspection and binary Blob storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isImporting) return;
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    setIsImporting(true);
    setEnhancedToast(null);

    let successCount = 0;
    let failedCount = 0;
    const failedReasons: string[] = [];
    const importedImageAssets: Asset[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setImportProgress({
          current: i + 1,
          total: files.length,
          currentFileName: file.name,
        });

        // Validate format: accept image (jpg, jpeg, png, webp) or video (mp4, webm, mov)
        const isVid = file.type.startsWith('video') || /\.(mp4|webm|mov)$/i.test(file.name);
        const isImg = file.type.startsWith('image') || /\.(jpe?g|png|webp)$/i.test(file.name);

        if (!isVid && !isImg) {
          failedCount++;
          failedReasons.push(`"${file.name}" (অসমর্থিত ফরম্যাট: ${file.type || 'অজানা'})`);
          continue;
        }

        if (file.size === 0) {
          failedCount++;
          failedReasons.push(`"${file.name}" (খালি ফাইল 0 Bytes)`);
          continue;
        }

        if (file.size > 50 * 1024 * 1024) {
          failedCount++;
          failedReasons.push(`"${file.name}" (ফাইল সাইজ ৫০MB সীমা অতিক্রম করেছে)`);
          continue;
        }

        try {
          const objectUrl = URL.createObjectURL(file);
          if (isVid) {
            const inspected = await inspectVideoFile(file);
            await onAddCustomAsset(
              {
                title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
                type: 'video',
                prompt: `Imported video: ${file.name}`,
                style: 'Real Video',
                aspectRatio: inspected.aspectRatio || '16:9',
                dimensions: inspected.dimensions || 'Not available',
                duration: inspected.duration || 'Not available',
                fps: inspected.fps || 30,
                url: objectUrl,
                thumbnailUrl: inspected.thumbnailUrl || objectUrl,
                isFavorite: false,
                model: 'Real Video File',
                source: 'Imported',
                fileSize: inspected.fileSize,
                fileFormat: inspected.fileFormat,
              },
              file,
              inspected.thumbnailBlob
            );
          } else {
            const inspected = await inspectImageFile(file);
            const now = new Date();
            const formattedDate = `${now.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })} · ${now.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}`;
            const newImgAsset: Asset = {
              id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
              type: 'image',
              prompt: `Imported image: ${file.name}`,
              style: 'Real Image',
              aspectRatio: inspected.aspectRatio || '1:1',
              dimensions: inspected.dimensions || 'Not available',
              url: objectUrl,
              thumbnailUrl: objectUrl,
              isFavorite: false,
              model: 'Real Image File',
              source: 'Imported',
              fileSize: inspected.fileSize,
              fileFormat: inspected.fileFormat,
              createdAt: formattedDate,
            };
            await onAddCustomAsset(newImgAsset, file);
            importedImageAssets.push(newImgAsset);
          }
          successCount++;
        } catch (fileErr: any) {
          failedCount++;
          failedReasons.push(`"${file.name}" (${fileErr?.message || 'ইন্সপেকশন ত্রুটি'})`);
        }
      }

      // Automatically audit imported images for Adobe Stock readiness
      if (importedImageAssets.length > 0) {
        try {
          const auditRes = await auditBatchImageReadiness(importedImageAssets);
          setBatchAuditSummary(auditRes);
        } catch (auditErr) {
          console.warn('Batch readiness audit warning:', auditErr);
        }
      }

      // Summary feedback
      if (failedCount === 0 && successCount > 0) {
        setEnhancedToast(
          successCount === 1
            ? `'${files[0].name}' সফলভাবে IndexedDB-তে সংরক্ষিত হয়েছে!`
            : `সর্বমোট ${successCount}টি ফাইল সফলভাবে IndexedDB-তে সংরক্ষিত হয়েছে!`
        );
      } else if (successCount > 0 && failedCount > 0) {
        setEnhancedToast(
          `${successCount}টি ফাইল সংরক্ষিত, ${failedCount}টি ব্যর্থ। ব্যর্থতার কারণ: ${failedReasons.join('; ')}`
        );
      } else if (failedCount > 0) {
        setEnhancedToast(`ইমপোর্ট ব্যর্থ হয়েছে: ${failedReasons.join('; ')}`);
      }
      setTimeout(() => setEnhancedToast(null), failedCount > 0 ? 6000 : 3500);
    } finally {
      setIsImporting(false);
      setImportProgress(null);
      e.target.value = '';
    }
  };

  const handleCopyPrompt = (e: React.MouseEvent, id: string, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleDownloadAsset = (e: React.MouseEvent, asset: Asset) => {
    e.stopPropagation();
    setDownloadingId(asset.id);

    const safeTitle = asset.title.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'studio-asset';
    const ext = asset.type === 'video' ? 'mp4' : 'png';
    const filename = `${safeTitle}.${ext}`;

    // Direct client-side download for base64 or blob URLs (native IndexedDB)
    if (asset.url.startsWith('data:') || asset.url.startsWith('blob:')) {
      const link = document.createElement('a');
      link.href = asset.url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => setDownloadingId(null), 1500);
      return;
    }

    // Proxy server download for external URLs
    const downloadUrl = `/api/download-image?url=${encodeURIComponent(asset.url)}&filename=${encodeURIComponent(filename)}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloadingId(null), 1800);
  };

  const handleDeleteWithFeedback = (e: React.MouseEvent, asset: Asset) => {
    e.stopPropagation();
    setRecentlyDeletedTitle(asset.title);
    onDeleteAsset(asset.id);
    setTimeout(() => {
      setRecentlyDeletedTitle((prev) => (prev === asset.title ? null : prev));
    }, 3000);
  };

  // Filter and sort assets
  const filteredAndSortedAssets = useMemo(() => {
    let list = assets.filter((asset) => {
      if (activeFilter === 'favorites' && !asset.isFavorite) return false;
      if (activeFilter === 'flow') {
        return asset.source === 'Google Flow' || asset.model.toLowerCase().includes('google flow');
      }
      if (activeFilter !== 'all' && activeFilter !== 'favorites' && asset.type !== activeFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          asset.title.toLowerCase().includes(q) ||
          asset.prompt.toLowerCase().includes(q) ||
          asset.style.toLowerCase().includes(q) ||
          asset.model.toLowerCase().includes(q) ||
          (asset.source && asset.source.toLowerCase().includes(q)) ||
          (asset.createdAt && asset.createdAt.toLowerCase().includes(q))
        );
      }
      return true;
    });

    if (sortBy === 'newest') {
      // By default the array is stored newest first, preserve order
      return [...list];
    } else if (sortBy === 'oldest') {
      return [...list].reverse();
    } else if (sortBy === 'title') {
      return [...list].sort((a, b) => a.title.localeCompare(b.title));
    }
    return list;
  }, [assets, activeFilter, searchQuery, sortBy]);

  // Counts
  const imageCount = useMemo(() => assets.filter((a) => a.type === 'image').length, [assets]);
  const videoCount = useMemo(() => assets.filter((a) => a.type === 'video').length, [assets]);
  const flowCount = useMemo(
    () => assets.filter((a) => a.source === 'Google Flow' || a.model.toLowerCase().includes('google flow')).length,
    [assets]
  );
  const favCount = useMemo(() => assets.filter((a) => a.isFavorite).length, [assets]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-20 space-y-6">
      {/* Toast Notification */}
      {recentlyDeletedTitle && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 border border-zinc-700/80 text-zinc-200 px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs animate-in slide-in-from-bottom duration-200">
          <Trash2 className="w-4 h-4 text-rose-400" />
          <span>Removed &ldquo;{recentlyDeletedTitle}&rdquo; from library</span>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FolderHeart className="w-5 h-5 text-indigo-400" />
            <span>My Assets</span>
          </h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 px-2.5 py-0.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>নিরাপদ IndexedDB সক্রিয় (Safe Storage · No Quota Crash)</span>
            </span>
            {quotaInfo && (
              <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400 font-mono bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md">
                <HardDrive className="w-3 h-3 text-cyan-400" />
                <span>{quotaInfo.usedFormatted} ব্যবহার হয়েছে</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Header Controls */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {/* Autonomous AI Pipeline Button */}
          {onNavigate && (
            <button
              onClick={() => onNavigate('autonomous-pipeline')}
              className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-700 via-indigo-600 to-cyan-600 hover:from-indigo-600 hover:to-cyan-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-950/40 active:scale-95"
              title="Launch End-to-End Autonomous AI Stock Pipeline"
            >
              <Cpu className="w-3.5 h-3.5 text-cyan-200 animate-pulse" />
              <span>স্বয়ংক্রিয় এআই পাইপলাইন</span>
            </button>
          )}

          {/* Enhance Image Header Button */}
          {assets.some((a) => a.type === 'image') && (
            <button
              onClick={() => {
                const firstImg = assets.find((a) => a.type === 'image');
                if (firstImg) setEnhanceModalAsset(firstImg);
              }}
              className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-950/40 active:scale-95"
              title="2x/4x Upscale and Convert to JPEG"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-200" />
              <span>Enhance Image (2x/4x)</span>
            </button>
          )}

          {/* Prepare for Stock Sale Header Button */}
          {assets.length > 0 && (
            <button
              onClick={() => setStockModalAsset(assets[0])}
              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-md shadow-emerald-950/40 active:scale-95"
              title="Prepare Title, Description, and Keywords for Stock Sale"
            >
              <Store className="w-3.5 h-3.5 text-emerald-100" />
              <span>Prepare for Stock</span>
            </button>
          )}

          {/* Batch Stock Readiness Audit Button */}
          {assets.some((a) => a.type === 'image') && (
            <button
              onClick={() => handleRunBatchAudit()}
              disabled={isAuditingBatch}
              className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-950/40 active:scale-95 disabled:opacity-60"
              title="Audit Images for Adobe Stock Requirements & Commercial Readiness"
            >
              {isAuditingBatch ? (
                <Loader2 className="w-3.5 h-3.5 text-purple-200 animate-spin" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-purple-200" />
              )}
              <span>Stock Readiness Audit</span>
            </button>
          )}

          {/* Google Flow Integration Button */}
          <button
            onClick={() => setShowFlowModal(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-medium transition-all shadow-md shadow-blue-950/40 active:scale-95"
            title="Open Google Flow website and import creation"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>Google Flow (Import)</span>
          </button>

          {onNavigate && (
            <button
              onClick={() => onNavigate('create-image')}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-medium transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Create New Image</span>
            </button>
          )}

          {/* Import Media Button */}
          <label
            className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors shadow-sm ${
              isImporting
                ? 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/50 cursor-not-allowed opacity-80'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-zinc-700 cursor-pointer'
            }`}
          >
            {isImporting ? (
              <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>
              {isImporting
                ? `ইমপোর্ট হচ্ছে (${importProgress?.current || 1}/${importProgress?.total || 1})...`
                : 'Import'}
            </span>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              disabled={isImporting}
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </div>

      {/* Real-time Import Progress Bar */}
      {importProgress && (
        <div className="bg-indigo-950/40 border border-indigo-800/60 rounded-2xl p-3.5 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-indigo-200 font-medium truncate">
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
              <span className="truncate">
                ফাইল প্রসেসিং চলছে ({importProgress.current}/{importProgress.total}):{' '}
                <span className="text-white font-mono">{importProgress.currentFileName}</span>
              </span>
            </div>
            <span className="font-mono text-[11px] text-indigo-300 font-semibold shrink-0 ml-2">
              {Math.round((importProgress.current / importProgress.total) * 100)}%
            </span>
          </div>
          <div className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-indigo-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Batch Stock Readiness Audit Notification Banner */}
      {batchAuditSummary && (
        <div className="bg-zinc-900/90 border border-purple-900/50 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200 shadow-lg shadow-purple-950/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <span className="font-semibold text-white">Adobe Stock ব্যাচ নিরীক্ষা সম্পন্ন: </span>
              <span className="text-emerald-400 font-semibold">{batchAuditSummary.readyCount} Ready</span>,{' '}
              <span className="text-amber-400 font-semibold">{batchAuditSummary.needsFixCount} Needs Fix</span>,{' '}
              <span className="text-rose-400 font-semibold">{batchAuditSummary.rejectedCount} Rejected</span>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => setShowBatchAuditModal(true)}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shadow-sm"
            >
              <span>বিস্তারিত রিপোর্ট দেখুন</span>
              <ExternalLink className="w-3 h-3" />
            </button>
            <button
              onClick={() => setBatchAuditSummary(null)}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition-colors"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-900/60 border border-zinc-800/80 p-3 rounded-xl flex items-center justify-between">
          <span className="text-xs text-zinc-400">Total Saved</span>
          <span className="text-sm font-semibold text-white font-mono">{assets.length}</span>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/80 p-3 rounded-xl flex items-center justify-between">
          <span className="text-xs text-zinc-400 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
            Images
          </span>
          <span className="text-sm font-semibold text-indigo-300 font-mono">{imageCount}</span>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/80 p-3 rounded-xl flex items-center justify-between">
          <span className="text-xs text-zinc-400 flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5 text-purple-400" />
            Videos
          </span>
          <span className="text-sm font-semibold text-purple-300 font-mono">{videoCount}</span>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/80 p-3 rounded-xl flex items-center justify-between">
          <span className="text-xs text-zinc-400 flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/20" />
            Favorites
          </span>
          <span className="text-sm font-semibold text-rose-300 font-mono">{favCount}</span>
        </div>
      </div>

      {/* Search & Filter & Sorting Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-900/80 border border-zinc-800 p-3 rounded-2xl">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by prompt, title, model, style, date..."
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2.5 text-base sm:text-xs text-zinc-200 placeholder-zinc-400 focus:outline-none transition-colors min-h-[42px]"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0 text-xs">
          {[
            { id: 'all', label: `All (${assets.length})` },
            { id: 'image', label: `Images (${imageCount})` },
            { id: 'video', label: `Videos (${videoCount})` },
            { id: 'flow', label: `Google Flow (${flowCount})` },
            { id: 'favorites', label: `Favorites (${favCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeFilter === tab.id
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sorting & View Toggle */}
        <div className="flex items-center gap-2">
          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1 text-xs text-zinc-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-zinc-300 focus:outline-none cursor-pointer text-xs"
            >
              <option value="newest" className="bg-zinc-900 text-zinc-200">Newest first</option>
              <option value="oldest" className="bg-zinc-900 text-zinc-200">Oldest first</option>
              <option value="title" className="bg-zinc-900 text-zinc-200">Title (A-Z)</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="hidden sm:flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Notification Toast for Enhanced Asset */}
      {enhancedToast && (
        <div className="bg-emerald-950/70 border border-emerald-800 text-emerald-200 px-4 py-3 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{enhancedToast}</span>
          </div>
          <button
            onClick={() => setEnhancedToast(null)}
            className="text-emerald-400 hover:text-emerald-200 text-xs px-2 py-0.5 rounded-lg hover:bg-emerald-900/40"
          >
            ✕
          </button>
        </div>
      )}

      {/* Assets Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredAndSortedAssets.map((asset) => (
            <div
              key={asset.id}
              onClick={() => onSelectAsset(asset)}
              className="group bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700/90 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 flex flex-col shadow-sm hover:shadow-md"
            >
              {/* Image Preview Container */}
              <div className="relative aspect-video bg-zinc-950 overflow-hidden">
                <img
                  src={asset.thumbnailUrl || asset.url}
                  alt={asset.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Video Play Overlay */}
                {asset.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white">
                      <Play className="w-3.5 h-3.5 fill-white translate-x-0.5" />
                    </div>
                  </div>
                )}

                {/* Badges Overlay */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-semibold tracking-wider bg-black/75 backdrop-blur-md text-zinc-200 px-2 py-0.5 rounded-md border border-white/10">
                    {asset.type}
                  </span>
                  <span className="text-[10px] font-mono bg-black/75 backdrop-blur-md text-zinc-300 px-1.5 py-0.5 rounded-md border border-white/10">
                    {asset.aspectRatio}
                  </span>
                </div>

                {/* Inspect Details Button Overlay on Hover */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectAsset(asset);
                  }}
                  className="absolute bottom-2.5 left-2.5 px-2 py-1 rounded-md bg-black/75 backdrop-blur-md text-zinc-200 hover:text-white border border-white/10 text-[10px] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Inspect Image Details"
                >
                  <Eye className="w-3 h-3 text-indigo-400" />
                  <span>Inspect Details</span>
                </button>

                {/* Prepare for Stock Sale quick overlay button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStockModalAsset(asset);
                  }}
                  className="absolute bottom-2.5 right-2.5 px-2 py-1 rounded-md bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-300 text-[10px] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md active:scale-95"
                  title="Prepare for Stock Sale (AI Title, Description & Keywords)"
                >
                  <Store className="w-3 h-3 text-emerald-400" />
                  <span>Stock Sale</span>
                </button>

                {/* Favorite Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(asset.id);
                  }}
                  className={`absolute top-2.5 right-2.5 p-1.5 rounded-lg backdrop-blur-md transition-colors ${
                    asset.isFavorite
                      ? 'bg-rose-950/80 text-rose-400 border border-rose-800/80'
                      : 'bg-black/60 text-zinc-400 hover:text-white border border-white/10 opacity-0 group-hover:opacity-100'
                  }`}
                  title={asset.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart className={`w-3.5 h-3.5 ${asset.isFavorite ? 'fill-rose-400' : ''}`} />
                </button>
              </div>

              {/* Card Body with Prompt, Date, Details */}
              <div className="p-3.5 flex flex-col justify-between flex-1 space-y-3">
                {/* Title & Date */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-semibold text-zinc-100 group-hover:text-indigo-300 transition-colors line-clamp-1">
                      {asset.title}
                    </h3>
                  </div>

                  {/* Creation Date */}
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-zinc-400">
                    <Clock className="w-3 h-3 text-zinc-500 shrink-0" />
                    <span className="truncate">{asset.createdAt || 'Saved recently'}</span>
                  </div>

                  {/* Full Prompt Display with Copy Action */}
                  <div className="mt-2 p-2 bg-zinc-950/70 border border-zinc-800/80 rounded-xl relative group/prompt">
                    <p className="text-[11px] text-zinc-300 line-clamp-2 leading-relaxed">
                      {asset.prompt}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => handleCopyPrompt(e, asset.id, asset.prompt)}
                      className="mt-1.5 text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                      title="Copy full prompt"
                    >
                      {copiedId === asset.id ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">Prompt copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Prompt</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Image Details Badges */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="bg-zinc-950 border border-zinc-800 text-zinc-300 px-2 py-0.5 rounded-md font-mono">
                      {asset.dimensions}
                    </span>
                    <span className="bg-zinc-950 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md truncate max-w-[120px]">
                      {asset.style}
                    </span>
                    <span className="bg-indigo-950/40 border border-indigo-800/40 text-indigo-300 px-2 py-0.5 rounded-md truncate max-w-[130px]">
                      {asset.model}
                    </span>
                    {(asset.source === 'Google Flow' || asset.model.toLowerCase().includes('google flow')) && (
                      <span className="bg-cyan-950/80 border border-cyan-800/80 text-cyan-300 px-2 py-0.5 rounded-md font-medium text-[10px] flex items-center gap-1 shrink-0">
                        <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                        Google Flow
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons: Enhance Image + Prepare for Stock Sale */}
                <div className="grid grid-cols-2 gap-1.5">
                  {asset.type === 'image' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEnhanceModalAsset(asset);
                      }}
                      className="flex items-center justify-center gap-1 bg-indigo-950/40 hover:bg-indigo-900/60 active:scale-98 text-indigo-300 border border-indigo-800/60 hover:border-indigo-600/80 text-xs font-semibold py-2 px-2.5 rounded-xl transition-all shadow-sm"
                      title="2x/4x Upscale & Convert to JPEG"
                    >
                      <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Enhance</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStockModalAsset(asset);
                    }}
                    className={`flex items-center justify-center gap-1 bg-emerald-950/40 hover:bg-emerald-900/60 active:scale-98 text-emerald-300 border border-emerald-800/60 hover:border-emerald-600/80 text-xs font-semibold py-2 px-2.5 rounded-xl transition-all shadow-sm ${
                      asset.type !== 'image' ? 'col-span-2' : ''
                    }`}
                    title="Prepare English Title, Description & Keywords for Stock Sale"
                  >
                    <Store className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Stock Sale</span>
                  </button>
                </div>

                {/* Action Buttons: Download, Details, Delete */}
                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-1.5">
                  {/* Download Button */}
                  <button
                    type="button"
                    onClick={(e) => handleDownloadAsset(e, asset)}
                    disabled={downloadingId === asset.id}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-medium py-1.5 px-2.5 rounded-lg transition-colors shadow-sm"
                    title="Download to your device"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{downloadingId === asset.id ? 'Downloading...' : 'Download'}</span>
                  </button>

                  {/* Image Details Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAsset(asset);
                    }}
                    className="flex items-center justify-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs py-1.5 px-2.5 rounded-lg border border-zinc-700/60 transition-colors"
                    title="View full image details & specs"
                  >
                    <Info className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="hidden sm:inline">Details</span>
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteWithFeedback(e, asset)}
                    className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg border border-transparent hover:border-rose-900/40 transition-colors"
                    title="Delete asset from library"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800">
          {filteredAndSortedAssets.map((asset) => (
            <div
              key={asset.id}
              onClick={() => onSelectAsset(asset)}
              className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-900 cursor-pointer transition-colors"
            >
              <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                {/* Thumbnail Preview */}
                <div className="relative w-24 h-16 rounded-xl overflow-hidden bg-zinc-950 shrink-0 border border-zinc-800">
                  <img
                    src={asset.thumbnailUrl || asset.url}
                    alt={asset.title}
                    className="w-full h-full object-cover"
                  />
                  {asset.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Play className="w-3.5 h-3.5 fill-white text-white" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-semibold text-zinc-100 truncate">{asset.title}</h4>
                    <span className="text-[10px] uppercase font-semibold tracking-wider bg-black/60 text-zinc-400 px-1.5 py-0.2 rounded border border-zinc-800">
                      {asset.type}
                    </span>
                  </div>

                  {/* Prompt */}
                  <p className="text-[11px] text-zinc-300 truncate max-w-xl">{asset.prompt}</p>

                  {/* Metadata Chips including Date */}
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-zinc-400">
                    <span className="flex items-center gap-1 text-zinc-400">
                      <Calendar className="w-3 h-3 text-zinc-500" />
                      <span>{asset.createdAt}</span>
                    </span>
                    <span>·</span>
                    <span className="font-mono text-zinc-300">{asset.dimensions}</span>
                    <span>·</span>
                    <span>{asset.aspectRatio}</span>
                    <span>·</span>
                    <span className="text-indigo-300">{asset.model}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Toolbar in List View */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={(e) => handleCopyPrompt(e, asset.id, asset.prompt)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 border border-zinc-800/80"
                  title="Copy prompt"
                >
                  {copiedId === asset.id ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>

                {/* Enhance Image Button (শর্ত ১ ও ২) */}
                {asset.type === 'image' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEnhanceModalAsset(asset);
                    }}
                    className="flex items-center gap-1.5 bg-indigo-950/60 hover:bg-indigo-900/80 active:scale-95 text-indigo-300 border border-indigo-800/60 text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors shadow-sm"
                    title="2x/4x Upscale & Convert to JPEG"
                  >
                    <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Enhance</span>
                  </button>
                )}

                {/* Stock Sale Button (শর্ত ১) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStockModalAsset(asset);
                  }}
                  className="flex items-center gap-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 active:scale-95 text-emerald-300 border border-emerald-800/60 text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors shadow-sm"
                  title="Prepare English Title, Description & Keywords for Stock Sale"
                >
                  <Store className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Stock Sale</span>
                </button>

                {/* Download Button */}
                <button
                  type="button"
                  onClick={(e) => handleDownloadAsset(e, asset)}
                  disabled={downloadingId === asset.id}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium py-1.5 px-3 rounded-lg transition-colors shadow-sm"
                  title="Download asset"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloadingId === asset.id ? 'Downloading...' : 'Download'}</span>
                </button>

                {/* Details Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectAsset(asset);
                  }}
                  className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs py-1.5 px-2.5 rounded-lg border border-zinc-700/60"
                  title="View image details"
                >
                  <Info className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Details</span>
                </button>

                {/* Favorite */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(asset.id);
                  }}
                  className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-zinc-800"
                  title={asset.isFavorite ? 'Remove favorite' : 'Mark as favorite'}
                >
                  <Heart className={`w-4 h-4 ${asset.isFavorite ? 'fill-rose-400 text-rose-400' : ''}`} />
                </button>

                {/* Delete */}
                <button
                  type="button"
                  onClick={(e) => handleDeleteWithFeedback(e, asset)}
                  className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/30"
                  title="Delete asset"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredAndSortedAssets.length === 0 && (
        <div className="text-center py-16 bg-zinc-900/40 rounded-2xl border border-zinc-800 space-y-4">
          <FolderHeart className="w-12 h-12 text-zinc-500 mx-auto" />
          <div className="space-y-1">
            <p className="text-zinc-200 text-sm font-semibold">No assets found</p>
            <p className="text-zinc-400 text-xs max-w-sm mx-auto">
              {searchQuery
                ? `No assets match your search "${searchQuery}". Try different search terms or clear filters.`
                : 'Your studio library is empty. Generate images using Gemini Nano Banana or MiniMax to automatically save them here.'}
            </p>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('create-image')}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-medium transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Generate Your First Image</span>
            </button>
          )}
        </div>
      )}

      {/* Google Flow Modal */}
      <GoogleFlowModal
        isOpen={showFlowModal}
        onClose={() => setShowFlowModal(false)}
        onImportAsset={onAddCustomAsset}
      />

      {/* Image Enhancement Modal (শর্ত ১, ২, ৩, ৪, ৫, ৬) */}
      <ImageEnhancementModal
        asset={enhanceModalAsset}
        isOpen={!!enhanceModalAsset}
        onClose={() => setEnhanceModalAsset(null)}
        onSaveEnhancedAsset={handleSaveEnhancedAsset}
        onOpenStockModal={(enhancedAsset) => {
          setEnhanceModalAsset(null);
          setStockModalAsset(enhancedAsset);
        }}
      />

      {/* Prepare for Stock Sale Modal */}
      <StockPreparationModal
        asset={stockModalAsset}
        isOpen={!!stockModalAsset}
        onClose={() => setStockModalAsset(null)}
        onSaveEnhancedAsset={handleSaveEnhancedAsset}
      />

      {/* Batch Image Quality & Adobe Stock Readiness Audit Modal */}
      <BatchStockAuditModal
        isOpen={showBatchAuditModal}
        onClose={() => setShowBatchAuditModal(false)}
        summary={batchAuditSummary}
        onOpenStockPrep={(asset) => setStockModalAsset(asset)}
        onOpenEnhance={(asset) => setEnhanceModalAsset(asset)}
      />
    </div>
  );
};
