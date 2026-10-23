import React from 'react';
import { Asset, StudioTab } from '../types';
import { StockPreparationModal } from './StockPreparationModal';
import { ImageEnhancementModal } from './ImageEnhancementModal';
import { VideoStudioModal } from './VideoStudioModal';
import { X, Copy, Download, Heart, Sparkles, ExternalLink, Play, Film, Calendar, Tag, Trash2, ArrowRight, Store, Sliders } from 'lucide-react';

interface AssetDetailModalProps {
  asset: Asset | null;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  onDeleteAsset: (id: string) => void;
  onRemix: (asset: Asset, targetTab: 'create-image' | 'create-video') => void;
  onSaveEnhancedAsset?: (newAsset: Omit<Asset, 'id' | 'createdAt' | 'views'>) => void;
  onUpdateAssetThumbnail?: (assetId: string, newThumbnailUrl: string, newThumbnailBlob?: Blob) => void;
  onSaveNewTrimmedAsset?: (newAsset: Omit<Asset, 'id' | 'createdAt' | 'views'>, mediaBlob?: Blob) => void;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  asset,
  onClose,
  onToggleFavorite,
  onDeleteAsset,
  onRemix,
  onSaveEnhancedAsset,
  onUpdateAssetThumbnail,
  onSaveNewTrimmedAsset,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [downloadSuccess, setDownloadSuccess] = React.useState(false);
  const [showStockModal, setShowStockModal] = React.useState(false);
  const [showEnhanceModal, setShowEnhanceModal] = React.useState(false);
  const [showVideoStudioModal, setShowVideoStudioModal] = React.useState(false);

  if (!asset) return null;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(asset.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    setDownloadSuccess(true);
    const filename = `${asset.title.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'asset'}.${asset.type === 'video' ? 'mp4' : 'png'}`;

    if (asset.url.startsWith('data:') || asset.url.startsWith('blob:')) {
      const link = document.createElement('a');
      link.href = asset.url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => setDownloadSuccess(false), 2000);
      return;
    }

    const downloadUrl = `/api/download-image?url=${encodeURIComponent(asset.url)}&filename=${encodeURIComponent(filename)}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <div
        className="relative w-full max-w-4xl max-h-[92vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-y-auto md:overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button Top Right */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-2.5 text-zinc-300 hover:text-white bg-zinc-900/90 hover:bg-zinc-800 rounded-xl border border-zinc-700/80 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shadow-lg active:scale-95"
          aria-label="Close details modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Media Preview (Left / Top) */}
        <div className="md:w-3/5 bg-zinc-900/80 flex items-center justify-center relative p-4 min-h-[260px] md:min-h-[460px] border-b md:border-b-0 md:border-r border-zinc-800">
          {asset.type === 'video' ? (
            <video
              src={asset.url}
              controls
              playsInline
              className="max-h-[70vh] w-auto max-w-full rounded-lg shadow-xl object-contain bg-black"
            />
          ) : (
            <img
              src={asset.url}
              alt={asset.title}
              className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg shadow-xl"
            />
          )}

          {/* Quick type badge */}
          <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none">
            <span className="text-xs font-medium uppercase tracking-wide bg-zinc-900/90 text-zinc-200 px-2.5 py-1 rounded-md border border-zinc-700 backdrop-blur-sm">
              {asset.type}
            </span>
            <span className="text-xs text-zinc-300 bg-black/60 px-2.5 py-1 rounded-md border border-white/10 backdrop-blur-sm">
              {asset.aspectRatio}
            </span>
          </div>
        </div>

        {/* Details and Actions Sidebar (Right / Bottom) */}
        <div className="md:w-2/5 p-5 sm:p-6 flex flex-col justify-between overflow-y-auto max-h-[55vh] md:max-h-[92vh]">
          <div className="space-y-4">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold text-zinc-100 leading-snug">
                  {asset.title}
                </h3>
                <button
                  onClick={() => onToggleFavorite(asset.id)}
                  className={`p-2 rounded-lg border transition-colors shrink-0 ${
                    asset.isFavorite
                      ? 'text-rose-400 bg-rose-950/40 border-rose-800/60'
                      : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900 border-zinc-800'
                  }`}
                  title={asset.isFavorite ? 'Remove favorite' : 'Mark as favorite'}
                >
                  <Heart className={`w-4 h-4 ${asset.isFavorite ? 'fill-rose-400' : ''}`} />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{asset.createdAt}</span>
                </span>
                <span>·</span>
                <span className="text-indigo-300 font-medium">{asset.model}</span>
              </div>
            </div>

            {/* Prompt block */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400">Generation Prompt</span>
                <button
                  onClick={handleCopyPrompt}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <div className="bg-zinc-900/90 border border-zinc-800 p-3 rounded-xl text-xs text-zinc-200 leading-relaxed font-mono selection:bg-indigo-600 selection:text-white">
                {asset.prompt}
              </div>
            </div>

            {/* Negative Prompt (if present) */}
            {asset.negativePrompt && (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-zinc-400">Negative Prompt</span>
                <div className="bg-zinc-900/60 border border-zinc-800/80 p-2.5 rounded-xl text-xs text-zinc-400 font-mono">
                  {asset.negativePrompt}
                </div>
              </div>
            )}

            {/* Technical Specs Metadata */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                <span className="text-zinc-400 block text-[11px]">Dimensions</span>
                <span className="text-zinc-200 font-medium font-mono">{asset.dimensions}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                <span className="text-zinc-400 block text-[11px]">Aspect Ratio</span>
                <span className="text-zinc-200 font-medium font-mono">{asset.aspectRatio}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                <span className="text-zinc-400 block text-[11px]">Art Style</span>
                <span className="text-zinc-200 font-medium truncate block">{asset.style}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                <span className="text-zinc-400 block text-[11px]">AI Model</span>
                <span className="text-indigo-300 font-medium truncate block">{asset.model}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                <span className="text-zinc-400 block text-[11px]">Format</span>
                <span className="text-zinc-200 font-medium">
                  {asset.fileFormat || (asset.type === 'video' ? 'MP4 Video' : 'PNG Image')}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                <span className="text-zinc-400 block text-[11px]">File Size</span>
                <span className="text-zinc-200 font-medium">
                  {asset.fileSize || 'Not available'}
                </span>
              </div>
              {asset.duration && (
                <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 col-span-2">
                  <span className="text-zinc-400 block text-[11px]">Duration & Framerate</span>
                  <span className="text-zinc-200 font-medium">{asset.duration} @ {asset.fps || 30} FPS</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 pt-4 border-t border-zinc-800/80 space-y-2.5">
            {/* Prepare for Stock Sale Button (শর্ত ১) */}
            <button
              onClick={() => setShowStockModal(true)}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white font-semibold text-xs py-3 px-4 rounded-xl transition-all shadow-md shadow-emerald-950/40 min-h-[46px]"
              title="Prepare English Title, Description & Keywords for Stock Sale"
            >
              <Store className="w-4 h-4 text-emerald-100" />
              <span>Prepare for Stock Sale (AI Metadata & Compliance)</span>
            </button>

            {/* Enhance Image Button (শর্ত ১ ও ২) */}
            {asset.type === 'image' && (
              <button
                onClick={() => setShowEnhanceModal(true)}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-98 text-white font-semibold text-xs py-3 px-4 rounded-xl transition-all shadow-md shadow-indigo-950/40 min-h-[46px]"
                title="2x/4x Upscale Image & Convert to JPEG"
              >
                <Sliders className="w-4 h-4 text-indigo-100" />
                <span>Enhance Image (2x/4x Upscale & Convert JPEG)</span>
              </button>
            )}

            {/* Video Contributor Studio Button (Priority 2.5) */}
            {asset.type === 'video' && (
              <button
                onClick={() => setShowVideoStudioModal(true)}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-98 text-white font-semibold text-xs py-3 px-4 rounded-xl transition-all shadow-md shadow-violet-950/40 min-h-[46px]"
                title="Professional Video Quality Checks, Trimming & Contributor Package Export"
              >
                <Film className="w-4 h-4 text-violet-100" />
                <span>Video Contributor Studio (কোয়ালিটি, ট্রিমার ও প্যাকেজ)</span>
              </button>
            )}

            {/* Download */}
            <button
              onClick={handleDownload}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-medium text-xs py-3 px-4 rounded-xl transition-all shadow-md shadow-indigo-950/50 min-h-[46px]"
            >
              <Download className="w-4 h-4" />
              <span>{downloadSuccess ? 'Downloaded!' : `Download ${asset.type === 'video' ? 'Video (MP4)' : 'Image (PNG)'}`}</span>
            </button>

            {/* Remix in Studio */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onRemix(asset, 'create-image');
                  onClose();
                }}
                className="flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 active:scale-98 text-zinc-200 border border-zinc-800 text-xs py-2.5 px-3 rounded-xl transition-colors min-h-[44px]"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Remix Image</span>
              </button>
              <button
                onClick={() => {
                  onRemix(asset, 'create-video');
                  onClose();
                }}
                className="flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 active:scale-98 text-zinc-200 border border-zinc-800 text-xs py-2.5 px-3 rounded-xl transition-colors min-h-[44px]"
              >
                <Film className="w-3.5 h-3.5 text-indigo-400" />
                <span>Animate Video</span>
              </button>
            </div>

            {/* Delete */}
            <button
              onClick={() => {
                onDeleteAsset(asset.id);
                onClose();
              }}
              className="w-full flex items-center justify-center gap-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/20 py-2.5 text-xs rounded-xl transition-colors min-h-[40px] active:scale-98"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Asset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Image Enhancement Modal */}
      {onSaveEnhancedAsset && (
        <ImageEnhancementModal
          asset={asset}
          isOpen={showEnhanceModal}
          onClose={() => setShowEnhanceModal(false)}
          onSaveEnhancedAsset={onSaveEnhancedAsset}
          onOpenStockModal={() => {
            setShowEnhanceModal(false);
            setShowStockModal(true);
          }}
        />
      )}

      {/* Stock Preparation Modal */}
      <StockPreparationModal
        asset={asset}
        isOpen={showStockModal}
        onClose={() => setShowStockModal(false)}
        onSaveEnhancedAsset={onSaveEnhancedAsset}
      />

      {/* Video Studio Modal (Priority 2.5) */}
      <VideoStudioModal
        asset={asset}
        isOpen={showVideoStudioModal}
        onClose={() => setShowVideoStudioModal(false)}
        onUpdateAssetThumbnail={onUpdateAssetThumbnail}
        onSaveNewTrimmedAsset={onSaveNewTrimmedAsset}
      />
    </div>
  );
};

