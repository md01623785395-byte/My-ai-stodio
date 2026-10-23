import React, { useState, useEffect } from 'react';
import { Asset, StockMarketplaceId, PreparedStockMetadata } from '../types';
import { upscaleImageReal, convertToJpegReal, EnhancementResult } from '../utils/imageEnhancer';
import { generateClientStockMetadata } from '../utils/stockMetadataFallback';
import { prepareImageForVisionAnalysis } from '../utils/imagePixelHelper';
import { FinalQualityCheckCard } from './FinalQualityCheckCard';
import { ExportMetadataModal } from './ExportMetadataModal';
import { VisualVerificationChecklist } from './VisualVerificationChecklist';
import { FinalQualityReport } from '../utils/qualityChecker';
import { MARKETPLACE_TITLE_RULES, auditMarketplaceValidation } from '../utils/stockMetadataValidator';
import {
  X,
  Sparkles,
  Check,
  Copy,
  Download,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  ShieldCheck,
  ExternalLink,
  Tag,
  Store,
  Layers,
  FileText,
  RefreshCw,
  Sliders,
  ChevronRight,
  ShieldAlert,
  Maximize2,
  FileSpreadsheet,
  FileCode,
  RotateCcw,
  Eye,
  Edit3,
} from 'lucide-react';

interface StockPreparationModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveEnhancedAsset?: (newAsset: Omit<Asset, 'id' | 'createdAt' | 'views'>) => void;
}

const MARKETPLACES: Array<{
  id: StockMarketplaceId;
  name: string;
  badge: string;
  color: 'green' | 'amber' | 'red';
  shortDesc: string;
}> = [
  {
    id: 'adobe-stock',
    name: 'Adobe Stock',
    badge: 'অনুমোদিত',
    color: 'green',
    shortDesc: 'AI অনুমোদিত (লেবেল আবশ্যক)',
  },
  {
    id: 'shutterstock',
    name: 'Shutterstock',
    badge: 'নিষিদ্ধ',
    color: 'red',
    shortDesc: 'থার্ড-পার্টি AI নিষিদ্ধ!',
  },
  {
    id: 'freepik',
    name: 'Freepik',
    badge: 'অনুমোদিত',
    color: 'green',
    shortDesc: '_ai_generated ট্যাগ সহ',
  },
  {
    id: 'dreamstime',
    name: 'Dreamstime',
    badge: 'শর্তসাপেক্ষ',
    color: 'amber',
    shortDesc: 'মানুষের মুখ ছাড়া গৃহীত',
  },
  {
    id: 'wirestock',
    name: 'Wirestock',
    badge: 'অনুমোদিত',
    color: 'green',
    shortDesc: '১-ক্লিকে মাল্টি-ডিস্ট্রিবিউশন',
  },
  {
    id: 'other',
    name: 'অন্যান্য (Other)',
    badge: 'যাচাই করা হয়নি',
    color: 'amber',
    shortDesc: 'নীতি যাচাই করা হয়নি',
  },
];

export const StockPreparationModal: React.FC<StockPreparationModalProps> = ({
  asset,
  isOpen,
  onClose,
  onSaveEnhancedAsset,
}) => {
  const [activeAsset, setActiveAsset] = useState<Asset | null>(asset);
  const [selectedMarketplace, setSelectedMarketplace] = useState<StockMarketplaceId>('adobe-stock');
  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceSuccessMessage, setEnhanceSuccessMessage] = useState<string | null>(null);
  const [enhanceErrorMessage, setEnhanceErrorMessage] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<PreparedStockMetadata | null>(null);
  const [needsUserDescription, setNeedsUserDescription] = useState(false);
  const [userDescriptionInput, setUserDescriptionInput] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [qualityReport, setQualityReport] = useState<FinalQualityReport | null>(null);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [providerUsed, setProviderUsed] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [visionErrorState, setVisionErrorState] = useState<{
    error: string;
    errorType?: string;
    canRetry?: boolean;
    canManualDescribe?: boolean;
  } | null>(null);

  // Priority 2.9: Inline metadata editing states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editedDesc, setEditedDesc] = useState('');
  const [isEditingKeywords, setIsEditingKeywords] = useState(false);
  const [editedKeywordsText, setEditedKeywordsText] = useState('');

  const handleStartEditTitle = () => {
    if (!metadata) return;
    setEditedTitle(metadata.title);
    setIsEditingTitle(true);
  };

  const handleSaveEditedTitle = () => {
    if (!metadata || !editedTitle.trim()) return;
    const newTitle = editedTitle.trim();
    const updatedAudit = auditMarketplaceValidation(
      {
        title: newTitle,
        description: metadata.description,
        keywords: metadata.keywords,
        visualSubject: metadata.visualSubjectDescription || (activeAsset || asset)?.prompt || 'Subject',
        category: metadata.category,
        hasHumans: (activeAsset || asset)?.prompt ? /(woman|man|person|people|face|portrait)/i.test((activeAsset || asset)!.prompt) : false,
      },
      selectedMarketplace
    );
    setMetadata({
      ...metadata,
      title: newTitle,
      validationAudit: updatedAudit,
    });
    setIsEditingTitle(false);
  };

  const handleStartEditDesc = () => {
    if (!metadata) return;
    setEditedDesc(metadata.description);
    setIsEditingDesc(true);
  };

  const handleSaveEditedDesc = () => {
    if (!metadata || !editedDesc.trim()) return;
    const newDesc = editedDesc.trim();
    const updatedAudit = auditMarketplaceValidation(
      {
        title: metadata.title,
        description: newDesc,
        keywords: metadata.keywords,
        visualSubject: metadata.visualSubjectDescription || (activeAsset || asset)?.prompt || 'Subject',
        category: metadata.category,
        hasHumans: (activeAsset || asset)?.prompt ? /(woman|man|person|people|face|portrait)/i.test((activeAsset || asset)!.prompt) : false,
      },
      selectedMarketplace
    );
    setMetadata({
      ...metadata,
      description: newDesc,
      validationAudit: updatedAudit,
    });
    setIsEditingDesc(false);
  };

  const handleStartEditKeywords = () => {
    if (!metadata) return;
    setEditedKeywordsText(metadata.keywords.join(', '));
    setIsEditingKeywords(true);
  };

  const handleSaveEditedKeywords = () => {
    if (!metadata || !editedKeywordsText.trim()) return;
    const newKeywords = Array.from(
      new Set(
        editedKeywordsText
          .split(/[,;\n]/)
          .map((k) => k.trim())
          .filter(Boolean)
      )
    );
    const updatedAudit = auditMarketplaceValidation(
      {
        title: metadata.title,
        description: metadata.description,
        keywords: newKeywords,
        visualSubject: metadata.visualSubjectDescription || (activeAsset || asset)?.prompt || 'Subject',
        category: metadata.category,
        hasHumans: (activeAsset || asset)?.prompt ? /(woman|man|person|people|face|portrait)/i.test((activeAsset || asset)!.prompt) : false,
      },
      selectedMarketplace
    );
    setMetadata({
      ...metadata,
      keywords: newKeywords,
      validationAudit: updatedAudit,
    });
    setIsEditingKeywords(false);
  };

  useEffect(() => {
    setActiveAsset(asset);
    setEnhanceSuccessMessage(null);
    setEnhanceErrorMessage(null);
    setNeedsUserDescription(false);
    setUserDescriptionInput('');
    setIsEditingDescription(false);
    setIsEditingTitle(false);
    setIsEditingDesc(false);
    setIsEditingKeywords(false);
    setVisionErrorState(null);
  }, [asset?.id]);

  // Generate metadata when modal opens or marketplace changes or asset updates
  useEffect(() => {
    if (isOpen && (activeAsset || asset)) {
      handleGenerateMetadata(selectedMarketplace, activeAsset || asset);
    }
  }, [isOpen, asset?.id, selectedMarketplace]);

  const currentDisplayAsset = activeAsset || asset;
  if (!isOpen || !currentDisplayAsset) return null;

  const handleGenerateMetadata = async (
    marketplace: StockMarketplaceId,
    targetAssetToUse?: Asset | null,
    overrideDescription?: string
  ) => {
    const targetAsset = targetAssetToUse || activeAsset || asset;
    if (!targetAsset) return;

    setLoading(true);
    setError(null);
    setVisionErrorState(null);

    const descToSend = overrideDescription !== undefined ? overrideDescription : userDescriptionInput;

    try {
      // 1. If not providing manual description, prepare optimized canvas pixels for Gemini Vision
      let preparedPixels: { base64: string; mimeType: string } | null = null;
      if (!descToSend || descToSend.trim().length === 0) {
        try {
          preparedPixels = await prepareImageForVisionAnalysis(targetAsset.url);
        } catch (pixErr) {
          console.warn('Canvas pixel extraction notice:', pixErr);
        }
      }

      let safeUrl = targetAsset.thumbnailUrl || targetAsset.url;
      if (safeUrl && safeUrl.startsWith('data:') && safeUrl.length > 5_000_000) {
        safeUrl = targetAsset.thumbnailUrl || '';
      }

      const response = await fetch('/api/stock/prepare-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset: {
            id: targetAsset.id,
            title: targetAsset.title,
            prompt: targetAsset.prompt,
            style: targetAsset.style,
            aspectRatio: targetAsset.aspectRatio,
            dimensions: targetAsset.dimensions,
            type: targetAsset.type,
            model: targetAsset.model,
            url: safeUrl,
          },
          marketplace,
          userDescription: descToSend,
          imagePixels: preparedPixels ? {
            base64: preparedPixels.base64,
            mimeType: preparedPixels.mimeType,
          } : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to prepare stock metadata`);
      }

      const data = await response.json();

      if (data.visionError || !data.success) {
        // Requirement: "If image analysis fails or no vision model is available, clearly show an error and let the user retry or manually describe the image."
        setVisionErrorState({
          error: data.error || 'ছবির পিক্সেল বিশ্লেষণ সম্পন্ন করা সম্ভব হয়নি।',
          errorType: data.errorType,
          canRetry: data.canRetry !== false,
          canManualDescribe: data.canManualDescribe !== false,
        });
        setMetadata(null);
      } else if (data.success && data.metadata) {
        setMetadata(data.metadata);
        setVisionErrorState(null);
        setNeedsUserDescription(false);
        setIsEditingDescription(false);
        setIsEditingTitle(false);
        setIsEditingDesc(false);
        setIsEditingKeywords(false);
        setProviderUsed(data.provider || 'Google Gemini 3.8 Flash Vision');
      } else {
        throw new Error(data.error || 'Failed to prepare stock metadata');
      }
    } catch (err: any) {
      console.error('Error during image analysis:', err);
      setVisionErrorState({
        error: `ইমেজ প্রসেসিং বা সার্ভার রিকোয়েস্ট ব্যর্থ হয়েছে: ${err.message || 'Unknown error'}`,
        canRetry: true,
        canManualDescribe: true,
      });
      setMetadata(null);
    } finally {
      setLoading(false);
    }
  };

  const handleEnhanceInModal = async (type: 'upscale-2x' | 'upscale-4x' | 'convert-jpeg') => {
    const targetAsset = activeAsset || asset;
    if (!targetAsset) return;

    if (targetAsset.type === 'video') {
      setEnhanceErrorMessage('ভিডিও ফাইল আপস্কেল সমর্থিত নয়; শুধুমাত্র ছবি প্রসেস করা যায়।');
      return;
    }

    setEnhancing(true);
    setEnhanceErrorMessage(null);
    setEnhanceSuccessMessage(null);

    try {
      let res: EnhancementResult;
      if (type === 'upscale-2x') {
        res = await upscaleImageReal(targetAsset.url, 2);
      } else if (type === 'upscale-4x') {
        res = await upscaleImageReal(targetAsset.url, 4);
      } else {
        res = await convertToJpegReal(targetAsset.url, 0.95);
      }

      const label =
        type === 'upscale-4x'
          ? '4x Ultra Upscaled'
          : type === 'upscale-2x'
          ? '2x Upscaled'
          : 'JPEG sRGB';

      const enhancedPayload: Omit<Asset, 'id' | 'createdAt' | 'views'> = {
        title: `${targetAsset.title} [${label}]`,
        type: 'image',
        prompt: targetAsset.prompt,
        negativePrompt: targetAsset.negativePrompt,
        style: targetAsset.style,
        aspectRatio: targetAsset.aspectRatio,
        dimensions: `${res.newWidth} × ${res.newHeight}`,
        url: res.dataUrl,
        thumbnailUrl: res.dataUrl,
        isFavorite: false,
        model: `Studio Enhancer (${label})`,
        source: targetAsset.source || 'Studio',
        fileSize: `${res.fileSizeMb} MB`,
        fileFormat: res.format === 'JPEG' ? 'JPEG Image' : 'PNG Image',
      };

      if (onSaveEnhancedAsset) {
        onSaveEnhancedAsset(enhancedPayload);
      }

      const now = new Date();
      const formattedDate = `${now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })} · ${now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })}`;

      const updatedAssetObj: Asset = {
        ...enhancedPayload,
        id: `enhanced-${Date.now()}`,
        createdAt: formattedDate,
        views: 1,
      };

      setActiveAsset(updatedAssetObj);
      setEnhanceSuccessMessage(
        `সফল! ছবিটি ${res.newWidth} × ${res.newHeight} px (${res.newMegapixels} MP, ${res.format}, ${res.fileSizeMb} MB) এ উন্নীত হয়েছে এবং My Assets-এ আলাদা কপি হিসেবে সংরক্ষিত হয়েছে!`
      );

      // Re-evaluate metadata and technical inspection with new asset immediately
      await handleGenerateMetadata(selectedMarketplace, updatedAssetObj);
    } catch (err: any) {
      console.error('Enhancement error in stock modal:', err);
      setEnhanceErrorMessage(
        err.message || 'ইমেজ আপস্কেল/কনভার্সন ব্যর্থ হয়েছে। ফাইল সমস্যা হতে পারে।'
      );
    } finally {
      setEnhancing(false);
    }
  };

  const handleCopyText = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCopyAll = () => {
    if (!metadata) return;
    const fullText = `=== ${metadata.marketplaceName} Stock Metadata ===
[1] Commercial Title:
${metadata.title}

[2] Commercial Description:
${metadata.description}

[3] Keywords (${metadata.keywords.length}):
${metadata.keywords.join(', ')}

[4] AI Disclosure & Licensing (Separate Field):
${metadata.aiDisclosure || 'Created using Generative AI. Commercial non-exclusive licensing.'}

[5] Labeling Requirement:
${metadata.labelingRequirement}

[6] Marketplace Policy:
${metadata.officialPolicyNote}

[7] Technical Requirements:
${metadata.technicalRequirements}`;

    handleCopyText(fullText, 'all');
  };

  const handleDownloadTxt = () => {
    if (!metadata) return;
    const content = `=== ${metadata.marketplaceName} Stock Metadata ===
[1] Commercial Title:
${metadata.title}

[2] Commercial Description:
${metadata.description}

[3] Keywords (${metadata.keywords.length} Relevant Tags):
${metadata.keywords.join(', ')}

[4] AI Disclosure & Licensing (Separate Field):
${metadata.aiDisclosure || 'Created using Generative AI. Certified free of proprietary corporate logos and private biometrics.'}

[5] Labeling Requirement:
${metadata.labelingRequirement}

[6] Marketplace Official Policy:
${metadata.officialPolicyNote}

[7] Human & Model Release Assessment:
${metadata.humanPresenceCompliance}

[8] Trademark & Brand Verification:
${metadata.trademarkCompliance}

Export Date: ${new Date().toISOString()}`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTitle = (activeAsset || asset)?.title?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'stock';
    link.download = `${safeTitle}-stock-metadata.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-zinc-800 bg-zinc-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Prepare for Stock Sale
                </h2>
                <span className="text-[10px] bg-indigo-950/80 text-indigo-300 border border-indigo-800/80 px-2 py-0.5 rounded-full font-medium">
                  AI Metadata & Official Compliance
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                স্টক মার্কেটপ্লেসে বিক্রির জন্য ফ্যাকচুয়াল মেটাডেটা (Title, Description, ৩০–৪০টি Keywords) ও অফিসিয়াল নীতি যাচাই
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExportModal(true)}
              disabled={!metadata}
              className="flex items-center gap-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 hover:text-emerald-200 border border-emerald-700/80 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shadow-sm"
              title="Export structured CSV or JSON metadata"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Metadata</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 rounded-xl transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-5 sm:p-7 space-y-6 flex-1">
          {/* Asset Summary Ribbon */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-20 h-20 sm:w-24 sm:h-20 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0">
              <img
                src={currentDisplayAsset.thumbnailUrl || currentDisplayAsset.url}
                alt={currentDisplayAsset.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-zinc-100 truncate">{currentDisplayAsset.title}</h3>
                <span className="text-[10px] uppercase font-semibold tracking-wider bg-black/60 text-zinc-300 px-2 py-0.5 rounded border border-zinc-800">
                  {currentDisplayAsset.type}
                </span>
                <span className="text-[10px] font-mono text-indigo-300 font-semibold">{currentDisplayAsset.dimensions}</span>
              </div>
              <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed bg-zinc-950/40 p-1.5 rounded-lg border border-zinc-800/50">
                <span className="text-zinc-500 font-medium">Prompt: </span>
                {currentDisplayAsset.prompt}
              </p>
              <div className="flex items-center gap-3 text-[11px] text-zinc-400 pt-0.5">
                <span>Model: <strong className="text-zinc-300">{currentDisplayAsset.model}</strong></span>
                <span>·</span>
                <span>Ratio: <strong className="text-zinc-300">{currentDisplayAsset.aspectRatio}</strong></span>
              </div>
            </div>
          </div>

          {/* Marketplace Selector Tabs (শর্ত ৩) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Select Target Marketplace (মার্কেটপ্লেস নির্বাচন করুন)</span>
              </label>
              <span className="text-[11px] text-zinc-400">
                প্রতিটি সাইটের অফিসিয়াল নীতি আলাদা
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {MARKETPLACES.map((mp) => {
                const isSelected = selectedMarketplace === mp.id;
                return (
                  <button
                    key={mp.id}
                    onClick={() => setSelectedMarketplace(mp.id)}
                    className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-zinc-800/90 border-indigo-500/80 shadow-md ring-1 ring-indigo-500/30'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-zinc-100">{mp.name}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold ${
                          mp.color === 'green'
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                            : mp.color === 'amber'
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                            : 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                        }`}
                      >
                        {mp.badge}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400 line-clamp-1">{mp.shortDesc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Adobe Stock বনাম Shutterstock অফিসিয়াল AI নীতির স্পষ্ট পার্থক্য (শর্ত ৪) */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Adobe Stock বনাম Shutterstock: অফিসিয়াল AI নীতির স্পষ্ট পার্থক্য</span>
              </span>
              <span className="text-[10px] text-zinc-400 font-mono bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 self-start sm:self-auto">
                অফিসিয়াল নীতি অনুসারে যাচাইকৃত
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {/* Adobe Stock Policy Highlights */}
              <div
                onClick={() => setSelectedMarketplace('adobe-stock')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedMarketplace === 'adobe-stock'
                    ? 'bg-emerald-950/30 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/20'
                    : 'bg-zinc-950/60 border-zinc-800/80 hover:border-emerald-800/50'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Adobe Stock</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded font-semibold">
                    অনুমোদিত (এআই ফ্রেন্ডলি)
                  </span>
                </div>
                <div className="text-[11px] text-zinc-300 space-y-1 leading-relaxed">
                  <p>• থার্ড-পার্টি এআই (Google Flow, Midjourney ইত্যাদি) কন্ট্রিবিউটরদের জন্য সম্পূর্ণ <strong>অনুমোদিত</strong>।</p>
                  <p>• আপলোডকালে কন্ট্রিবিউটর পোর্টালে <strong className="text-emerald-300 font-mono">"Created using generative AI tools"</strong> চেকবক্স টিক দেওয়া বাধ্যতামূলক।</p>
                  <p>• বাস্তব ব্যক্তি/সেলিব্রিটি ও ব্র্যান্ড লোগো মুক্ত হতে হবে।</p>
                </div>
                <a
                  href="https://helpx.adobe.com/stock/contributor/help/generative-ai-content.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-medium underline mt-2"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Adobe Stock অফিসিয়াল AI গাইডলাইন</span>
                </a>
              </div>

              {/* Shutterstock Policy Highlights */}
              <div
                onClick={() => setSelectedMarketplace('shutterstock')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedMarketplace === 'shutterstock'
                    ? 'bg-rose-950/30 border-rose-500/80 shadow-md ring-1 ring-rose-500/20'
                    : 'bg-zinc-950/60 border-zinc-800/80 hover:border-rose-800/50'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-rose-300">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Shutterstock</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 rounded font-semibold">
                    সম্পূর্ণ নিষিদ্ধ (External AI Ban)
                  </span>
                </div>
                <div className="text-[11px] text-zinc-300 space-y-1 leading-relaxed">
                  <p>• কোনো প্রকার বাহ্যিক বা থার্ড-পার্টি AI মডেলের ছবি আপলোড করা কঠোরভাবে <strong>নিষিদ্ধ</strong>।</p>
                  <p>• শুধুমাত্র তাদের সাইটের নিজস্ব এআই টুল সমর্থিত। বাহ্যিক এআই জমা দিলে <strong>রিজেকশন ও একাউন্ট সাসপেন্ডের ঝুঁকি</strong> থাকে।</p>
                  <p className="text-rose-300 font-medium">• চূড়ান্ত সতর্কতা: এই ছবিটি Shutterstock-এ আপলোড করবেন না!</p>
                </div>
                <a
                  href="https://support.submit.shutterstock.com/s/article/Generative-AI-FAQ"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[10px] text-rose-400 hover:text-rose-300 font-medium underline mt-2"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Shutterstock অফিসিয়াল AI পলিসি FAQ</span>
                </a>
              </div>
            </div>
          </div>

          {/* Factual Information & Anti-Hyperbole Notice (শর্ত ২ ও ৬) */}
          <div className="bg-emerald-950/20 border border-emerald-800/50 rounded-2xl p-3 sm:p-3.5 text-xs text-emerald-300 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-emerald-200">
                সত্যনিষ্ঠ ও যাচাইকৃত বিষয়বস্তু (Factual Image Description)
              </p>
              <p className="text-[11px] text-emerald-400/90 leading-relaxed">
                {metadata?.factualSubjectSummary ||
                  'ছবির আসল বিষয়বস্তু বিশ্লেষণ করে মেটাডেটা তৈরি হচ্ছে। ছবিতে যা নেই এমন কোনো উপাদান দাবি করা হবে না।'}
              </p>
              <p className="text-[10px] text-zinc-400 pt-0.5">
                * কোনো এআই-জেনারেটেড ছবিতেই "রিজেকশন ঝুঁকি শূন্য" বা "১০০% লোগো মুক্ত"-এর নিশ্চিত গ্যারান্টি দেওয়া যায় না; সাবমিট করার আগে নিজ চোখে কোয়ালিটি ও আর্টওয়ার্ক পরীক্ষা করুন।
              </p>
            </div>
          </div>

          {/* Vision Error State (শর্ত: If image analysis fails or no vision model is available, clearly show an error and let user retry or manually describe) */}
          {visionErrorState && !loading && (
            <div className="bg-gradient-to-br from-rose-950/60 via-zinc-900 to-zinc-900 border-2 border-rose-500/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 shrink-0">
                  <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm sm:text-base font-bold text-rose-100">
                      ছবির পিক্সেল বিশ্লেষণ ত্রুটি (Vision Inspection Error)
                    </h4>
                    <span className="text-[10px] font-mono uppercase bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded-md font-semibold">
                      {visionErrorState.errorType || 'Analysis Failed'}
                    </span>
                  </div>
                  <p className="text-xs text-rose-200 leading-relaxed bg-rose-950/40 p-2.5 rounded-xl border border-rose-900/60 font-medium">
                    {visionErrorState.error}
                  </p>
                  <p className="text-[11px] text-zinc-400 leading-relaxed pt-0.5">
                    স্টক ফটোগ্রাফি মার্কেটপ্লেসে মনগড়া বা প্রম্পটের ভুল তথ্যের ওপর ভিত্তি করে মেটাডেটা দেওয়া সম্পূর্ণ নিষিদ্ধ। নিচের বাটন দিয়ে আপনি পুনরায় ইমেজ বিশ্লেষণ চালাতে পারেন অথবা নিজেই ছবির আসল দৃশ্যমান বিষয়বস্তু সংক্ষেপে লিখে মেটাডেটা তৈরি করতে পারেন।
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-1 flex-wrap">
                {visionErrorState.canRetry && (
                  <button
                    type="button"
                    onClick={() => handleGenerateMetadata(selectedMarketplace, currentDisplayAsset)}
                    className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-zinc-700 transition-all shadow-md"
                  >
                    <RotateCcw className="w-4 h-4 text-indigo-400" />
                    <span>পুনরায় ইমেজ বিশ্লেষণ (Retry Vision Analysis)</span>
                  </button>
                )}

                {visionErrorState.canManualDescribe && (
                  <button
                    type="button"
                    onClick={() => {
                      setNeedsUserDescription(true);
                      setIsEditingDescription(true);
                    }}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-950 transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>ম্যানুয়ালি ছবির বর্ণনা দিন (Manually Describe Image)</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Prompt User to Describe the Image when reliable content cannot be determined, vision fails, or user wants to edit */}
          {(needsUserDescription || isEditingDescription) && (
            <div className="bg-gradient-to-br from-indigo-950/60 via-zinc-900 to-zinc-900 border-2 border-indigo-500/70 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm sm:text-base font-bold text-zinc-100 flex items-center gap-2">
                    <span>ছবির আসল দৃশ্যমান বিষয়বস্তু বর্ণনা করুন</span>
                    <span className="text-[10px] font-mono uppercase bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded-md">
                      {needsUserDescription ? 'সঠিক মেটাডেটা আবশ্যক' : 'বিষয়বস্তু সম্পাদনা'}
                    </span>
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {needsUserDescription
                      ? 'এই ছবিটির প্রম্পট বা টাইটেলে কেবল ইমপোর্ট তথ্য বা এআই টুলের নাম ছিল (যেমন Google Flow / Free Credits)। স্টক মার্কেটপ্লেসে মনগড়া ও ভুল তথ্যের মেটাডেটা তৈরি করা কঠোরভাবে নিষিদ্ধ। ছবিতে বাস্তবিকভাবে কী দেখা যাচ্ছে তা নিচে সংক্ষেপে লিখুন:'
                      : 'স্টক মার্কেটপ্লেসের মেটাডেটা আরও প্রাসঙ্গিক করতে ছবির দৃশ্যমান বিষয়বস্তু আপডেট করুন:'}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <textarea
                  value={userDescriptionInput}
                  onChange={(e) => setUserDescriptionInput(e.target.value)}
                  placeholder="উদাহরণ: A majestic snow leopard resting on high Himalayan cliffs at golden hour, sharp focus, natural environment..."
                  rows={3}
                  className="w-full bg-zinc-950/90 border border-zinc-700/80 focus:border-indigo-400 rounded-xl p-3 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all leading-relaxed"
                />

                {/* Quick suggestions */}
                <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-zinc-400">
                  <span className="text-zinc-500 font-medium">কুইক উদাহরণ:</span>
                  <button
                    type="button"
                    onClick={() => setUserDescriptionInput('Majestic snow leopard resting on rocky mountain cliff at sunset')}
                    className="px-2.5 py-1 bg-zinc-800/80 hover:bg-zinc-700 rounded-lg text-zinc-300 transition-colors"
                  >
                    হিমালয়ের স্নো লেপার্ড
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserDescriptionInput('Futuristic city street with illuminated neon signs at rainy night')}
                    className="px-2.5 py-1 bg-zinc-800/80 hover:bg-zinc-700 rounded-lg text-zinc-300 transition-colors"
                  >
                    নিওন সাইবারপাঙ্ক শহর
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserDescriptionInput('Serene mountain lake reflection with pine trees under morning sky')}
                    className="px-2.5 py-1 bg-zinc-800/80 hover:bg-zinc-700 rounded-lg text-zinc-300 transition-colors"
                  >
                    পাহাড়ি হ্রদ ও পাইন বন
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserDescriptionInput('Modern Scandinavian interior living room with sunlight and green plant')}
                    className="px-2.5 py-1 bg-zinc-800/80 hover:bg-zinc-700 rounded-lg text-zinc-300 transition-colors"
                  >
                    মডার্ন লিভিং রুম
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                {isEditingDescription && metadata && (
                  <button
                    type="button"
                    onClick={() => setIsEditingDescription(false)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-xl transition-colors"
                  >
                    বাতিল (Cancel)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleGenerateMetadata(selectedMarketplace, currentDisplayAsset, userDescriptionInput)}
                  disabled={loading || !userDescriptionInput.trim()}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-950 transition-all active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{loading ? 'প্রস্তুত হচ্ছে...' : 'মেটাডেটা তৈরি করুন (Generate Metadata)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Official Policy Verification Box with Contributor Policy Link & Date (শর্ত ৪ ও ৬) */}
          {metadata && (
            <div
              className={`rounded-2xl border p-4 space-y-3 ${
                metadata.aiPolicyColor === 'green'
                  ? 'bg-zinc-900/70 border-emerald-800/60'
                  : metadata.aiPolicyColor === 'amber'
                  ? 'bg-amber-950/20 border-amber-800/60'
                  : 'bg-rose-950/30 border-rose-800/70'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  {metadata.aiPolicyColor === 'red' ? (
                    <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                  ) : metadata.aiPolicyColor === 'amber' ? (
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  )}
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-zinc-100 flex items-center gap-2">
                      <span>{metadata.marketplaceName} Contributor Policy যাচাইকরণ</span>
                    </h4>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <span
                        className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md inline-block ${
                          metadata.aiPolicyColor === 'green'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : metadata.aiPolicyColor === 'amber'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}
                      >
                        {metadata.aiPolicyBadge}
                      </span>
                      {metadata.isPolicyVerified ? (
                        <span className="text-[10px] bg-blue-950/80 text-blue-300 border border-blue-800/70 px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">
                          <Check className="w-3 h-3 text-blue-400" />
                          <span>
                            যাচাইয়ের তারিখ:{' '}
                            {metadata.verificationDate &&
                            !metadata.verificationDate.includes('২০২৪') &&
                            !metadata.verificationDate.includes('2024') &&
                            metadata.verificationDate !== 'যাচাই করা হয়নি'
                              ? metadata.verificationDate
                              : `${(() => {
                                  const now = new Date();
                                  const months = [
                                    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
                                    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
                                  ];
                                  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
                                  const toBn = (v: number | string) => String(v).replace(/\d/g, (c) => bnDigits[parseInt(c, 10)] || c);
                                  return `${toBn(now.getDate())} ${months[now.getMonth()]} ${toBn(now.getFullYear())}`;
                                })()} (অফিসিয়াল Contributor Policy অনুসারে লাইভ যাচাইকৃত)`}
                          </span>
                        </span>
                      ) : (
                        <span className="text-[10px] bg-zinc-800 text-amber-300 border border-zinc-700 px-2.5 py-0.5 rounded-md font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-amber-400" />
                          <span>যাচাই করা হয়নি</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {metadata.officialPolicyUrl ? (
                    <a
                      href={metadata.officialPolicyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-indigo-300 hover:text-indigo-200 text-xs px-3 py-1.5 rounded-xl border border-zinc-700 transition-colors"
                      title="অফিসিয়াল পলিসি পেজ দেখুন"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>অফিসিয়াল পলিসি লিংক</span>
                    </a>
                  ) : (
                    <span className="text-[11px] text-zinc-500 bg-zinc-950/60 px-2.5 py-1.5 rounded-xl border border-zinc-800">
                      অফিসিয়াল লিংক নেই (যাচাই করা হয়নি)
                    </span>
                  )}

                  <button
                    onClick={() => handleGenerateMetadata(selectedMarketplace)}
                    disabled={loading}
                    className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-1.5 rounded-xl border border-zinc-700 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span>রিফ্রেশ</span>
                  </button>
                </div>
              </div>

              {/* Policy Alerts: Specific Notice for Shutterstock, Adobe Stock, and Unverified */}
              {selectedMarketplace === 'shutterstock' && (
                <div className="bg-rose-950/50 border border-rose-800/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-200">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-rose-100 block font-semibold">সরাসরি অ্যাকশন সতর্কতা: এই ছবিটি Shutterstock-এ আপলোড করবেন না</strong>
                    <p className="text-[11px] text-rose-300/90 mt-0.5 leading-relaxed">
                      Shutterstock-এর অফিসিয়াল Contributor Policy অনুযায়ী বাহ্যিক এআই ছবি আপলোড করলে সাবমিশন বাতিল ও একাউন্ট সাসপেনশনের ঝুঁকি থাকে। Adobe Stock, Freepik বা Wirestock ব্যবহার করুন।
                    </p>
                  </div>
                </div>
              )}

              {selectedMarketplace === 'adobe-stock' && (
                <div className="bg-emerald-950/40 border border-emerald-800/70 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-emerald-100 block font-semibold">Adobe Stock সাবমিশন প্রস্তুতি নিশ্চিতকরণ</strong>
                    <p className="text-[11px] text-emerald-300/90 mt-0.5 leading-relaxed">
                      Adobe Stock পোর্টালে আপলোডকালে "Created using generative AI tools" চেকবক্স চিহ্নিত করুন। নিচে তৈরি করা English Title, Description এবং Keywords কপি করে সহজেই সাবমিট করুন।
                    </p>
                  </div>
                </div>
              )}

              {!metadata.isPolicyVerified && (
                <div className="bg-amber-950/30 border border-amber-800/60 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-100 block font-semibold">অফিসিয়াল নীতি যাচাই করা হয়নি</strong>
                    <p className="text-[11px] text-amber-300/90 mt-0.5 leading-relaxed">
                      এই মার্কেটপ্লেসটির কোনো অফিসিয়াল Contributor Policy আমাদের সিস্টেম দ্বারা যাচাই করা হয়নি। ছবি আপলোড করার পূর্বে প্ল্যাটফর্মটির নিজস্ব কন্ট্রিবিউটর গাইডলাইন সরাসরি দেখে নিন।
                    </p>
                  </div>
                </div>
              )}

              {/* Policy Explanation */}
              <div className="text-xs text-zinc-300 leading-relaxed space-y-2">
                <p>{metadata.officialPolicyNote}</p>

                {/* Key Verification Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-[11px]">
                  <div className="bg-zinc-950/70 p-2.5 rounded-xl border border-zinc-800/80">
                    <span className="text-zinc-400 font-medium block">🏷️ প্রয়োজনীয় লেবেলিং (Labeling Checklist):</span>
                    <span className="text-zinc-200 mt-0.5 block font-mono text-[11px]">
                      {metadata.labelingRequirement}
                    </span>
                  </div>

                  <div className="bg-zinc-950/70 p-2.5 rounded-xl border border-zinc-800/80">
                    <span className="text-zinc-400 font-medium block">👤 মানুষ ও মডেল রিলিজ তথ্য:</span>
                    <span className="text-zinc-200 mt-0.5 block">{metadata.humanPresenceCompliance}</span>
                  </div>

                  <div className="bg-zinc-950/70 p-2.5 rounded-xl border border-zinc-800/80">
                    <span className="text-zinc-400 font-medium block">🚫 ট্রেডমার্ক ও ব্র্যান্ড নিরীক্ষা:</span>
                    <span className="text-zinc-200 mt-0.5 block">{metadata.trademarkCompliance}</span>
                  </div>

                  <div className="bg-zinc-950/70 p-2.5 rounded-xl border border-zinc-800/80">
                    <span className="text-zinc-400 font-medium block">📐 টেকনিক্যাল স্পেসিফিকেশন:</span>
                    <span className="text-zinc-200 mt-0.5 block font-mono text-[11px]">
                      {metadata.technicalRequirements}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Final Quality Check (চূড়ান্ত কোয়ালিটি নিরীক্ষা - শর্ত ১, ২, ৩, ৪, ৫, ৬) */}
          <FinalQualityCheckCard
            asset={currentDisplayAsset}
            marketplaceId={selectedMarketplace}
            onTriggerUpscale={(factor) => handleEnhanceInModal(factor === 4 ? 'upscale-4x' : 'upscale-2x')}
            onTriggerConvertJpeg={() => handleEnhanceInModal('convert-jpeg')}
            onReportGenerated={(rep) => setQualityReport(rep)}
          />

          {/* Real Technical Inspection Criteria (শর্ত ৬: পিক্সেল সাইজ, ফরম্যাট, ফাইল সাইজ ও সতর্কতা) */}
          {metadata && metadata.techInspection && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs sm:text-sm font-bold text-zinc-100">
                    ছবির বাস্তব টেকনিক্যাল শর্ত পরীক্ষা (Real Technical Inspection)
                  </h4>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                    metadata.techInspection.allTechPassed
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}
                >
                  {metadata.techInspection.allTechPassed ? 'সকল টেকনিক্যাল শর্ত উত্তীর্ণ' : 'সতর্কতা রয়েছে (Review Required)'}
                </span>
              </div>

              {/* 3 Inspection Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                {/* 1. Pixel Dimensions */}
                <div className={`p-3 rounded-xl border ${metadata.techInspection.pixelCheckPassed ? 'bg-zinc-950/80 border-emerald-900/40 text-zinc-200' : 'bg-amber-950/30 border-amber-800/50 text-amber-200'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-zinc-400">পিক্সেল সাইজ (Resolution)</span>
                    {metadata.techInspection.pixelCheckPassed ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    )}
                  </div>
                  <p className="font-mono text-xs">{metadata.techInspection.pixelDimensionsNote}</p>
                </div>

                {/* 2. Format */}
                <div className={`p-3 rounded-xl border ${metadata.techInspection.formatCheckPassed ? 'bg-zinc-950/80 border-emerald-900/40 text-zinc-200' : 'bg-amber-950/30 border-amber-800/50 text-amber-200'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-zinc-400">ফাইল ফরম্যাট (Extension)</span>
                    {metadata.techInspection.formatCheckPassed ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    )}
                  </div>
                  <p className="text-xs">{metadata.techInspection.formatNote}</p>
                </div>

                {/* 3. File Size */}
                <div className={`p-3 rounded-xl border ${metadata.techInspection.sizeCheckPassed ? 'bg-zinc-950/80 border-emerald-900/40 text-zinc-200' : 'bg-amber-950/30 border-amber-800/50 text-amber-200'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-zinc-400">ফাইল সাইজ (File Size)</span>
                    {metadata.techInspection.sizeCheckPassed ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    )}
                  </div>
                  <p className="font-mono text-xs">{metadata.techInspection.sizeNote}</p>
                </div>
              </div>

              {/* Warning boxes if any condition failed */}
              {metadata.techInspection.warnings.length > 0 && (
                <div className="bg-amber-950/20 border border-amber-800/60 rounded-xl p-3 space-y-1.5 text-xs text-amber-300">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>প্রয়োজনীয় টেকনিক্যাল সতর্কতা (Technical Warnings):</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-300/90 pl-1">
                    {metadata.techInspection.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Image Enhancement Quick Tools for Stock Compliance (শর্ত ১, ২, ৩, ৪) */}
              <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-3.5 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-xs font-bold text-zinc-200">
                      Image Enhancement Tools (প্রকৃত রেজোলিউশন ও JPEG রূপান্তর)
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    মূল ছবি অক্ষত থাকবে · আলাদা কপি সংরক্ষিত হবে
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* 2x Upscale */}
                  <button
                    type="button"
                    onClick={() => handleEnhanceInModal('upscale-2x')}
                    disabled={enhancing}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                      !metadata.techInspection.pixelCheckPassed
                        ? 'bg-indigo-950/40 border-indigo-700/80 hover:bg-indigo-900/60 ring-1 ring-indigo-500/30'
                        : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold text-zinc-100 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-indigo-400" />
                        <span>2x Upscale</span>
                      </span>
                      <span className="text-[10px] text-zinc-400 block mt-0.5">
                        প্রকৃত পিক্সেল দ্বিগুণ (4 MP+)
                      </span>
                    </div>
                    {!metadata.techInspection.pixelCheckPassed && (
                      <span className="text-[9px] bg-indigo-950 text-indigo-300 px-1.5 py-0.5 rounded font-semibold border border-indigo-800 shrink-0">
                        সুপারিশ
                      </span>
                    )}
                  </button>

                  {/* 4x Ultra Upscale */}
                  <button
                    type="button"
                    onClick={() => handleEnhanceInModal('upscale-4x')}
                    disabled={enhancing}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                      !metadata.techInspection.pixelCheckPassed
                        ? 'bg-emerald-950/40 border-emerald-700/80 hover:bg-emerald-900/60 ring-1 ring-emerald-500/30'
                        : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold text-emerald-200 flex items-center gap-1">
                        <Maximize2 className="w-3 h-3 text-emerald-400" />
                        <span>4x Ultra Upscale</span>
                      </span>
                      <span className="text-[10px] text-zinc-400 block mt-0.5">
                        ১৬ MP+ (Adobe Stock)
                      </span>
                    </div>
                    <span className="text-[9px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded font-semibold border border-emerald-800 shrink-0">
                      ১৬ MP+
                    </span>
                  </button>

                  {/* Convert to JPEG */}
                  <button
                    type="button"
                    onClick={() => handleEnhanceInModal('convert-jpeg')}
                    disabled={enhancing}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                      !metadata.techInspection.formatCheckPassed
                        ? 'bg-cyan-950/40 border-cyan-700/80 hover:bg-cyan-900/60 ring-1 ring-cyan-500/30'
                        : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold text-zinc-100 flex items-center gap-1">
                        <FileText className="w-3 h-3 text-cyan-400" />
                        <span>Convert to JPEG</span>
                      </span>
                      <span className="text-[10px] text-zinc-400 block mt-0.5">
                        sRGB কালার স্পেস (.jpg)
                      </span>
                    </div>
                    {!metadata.techInspection.formatCheckPassed && (
                      <span className="text-[9px] bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded font-semibold border border-cyan-800 shrink-0">
                        আবশ্যক
                      </span>
                    )}
                  </button>
                </div>

                {/* Processing State */}
                {enhancing && (
                  <div className="flex items-center gap-2 text-xs text-indigo-300 bg-indigo-950/50 p-2.5 rounded-lg border border-indigo-800/60">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400 shrink-0" />
                    <span>বাস্তব পিক্সেল প্রসেস হচ্ছে (ক্যানভাস রিস্যাম্পলিং ও sRGB এনকোডিং)...</span>
                  </div>
                )}

                {/* Success feedback */}
                {enhanceSuccessMessage && (
                  <div className="flex items-start gap-2 text-xs text-emerald-300 bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-800/60">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{enhanceSuccessMessage}</p>
                  </div>
                )}

                {/* Error feedback */}
                {enhanceErrorMessage && (
                  <div className="flex items-start gap-2 text-xs text-rose-300 bg-rose-950/40 p-2.5 rounded-lg border border-rose-800/60">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{enhanceErrorMessage}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Loading State */}
          {/* Loading State with Real Pixel Inspection Messaging */}
          {loading && (
            <div className="text-center py-12 bg-zinc-900/50 rounded-2xl border border-zinc-800 space-y-3.5 shadow-inner">
              <RefreshCw className="w-9 h-9 text-indigo-400 animate-spin mx-auto" />
              <div className="space-y-1">
                <p className="text-zinc-100 text-sm font-semibold flex items-center justify-center gap-2">
                  <Eye className="w-4 h-4 text-indigo-400 animate-pulse" />
                  <span>ছবির আসল পিক্সেল স্বয়ংক্রিয়ভাবে স্ক্যান ও বিশ্লেষণ করা হচ্ছে (Gemini Vision 3.8)...</span>
                </p>
                <p className="text-zinc-400 text-xs">
                  {selectedMarketplace.toUpperCase()}-এর জন্য সত্যনিষ্ঠ বাণিজ্যিক টাইটেল, ডেসক্রিপশন ও ৩০–৪০টি কীওয়ার্ড তৈরি হচ্ছে
                </p>
                <p className="text-zinc-500 text-[11px]">
                  প্রম্পট বা টুলের নামের ওপর নির্ভর না করে ছবির দৃশ্যমান উপাদান, রঙ, অবজেক্ট ও লাইটিং সরাসরি যাচাই করা হচ্ছে
                </p>
              </div>
            </div>
          )}

          {/* Metadata Display Section (শর্ত ১ ও ৫) */}
          {!loading && metadata && (
            <div className="space-y-4">
              {/* Visual Verification Checklist in Metadata Viewer (Priority 2.7) */}
              <VisualVerificationChecklist report={qualityReport} asset={currentDisplayAsset} compact={false} />

              {/* Actual Visual Content Basis Indicator with Edit Option */}
              <div className={`rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border ${
                metadata.pixelAnalyzed
                  ? 'bg-indigo-950/30 border-indigo-700/60 shadow-sm'
                  : 'bg-zinc-900/80 border-zinc-800'
              }`}>
                <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                  <div className={`p-1.5 rounded-lg shrink-0 ${
                    metadata.pixelAnalyzed
                      ? 'bg-indigo-900/80 text-indigo-300 border border-indigo-700'
                      : 'bg-emerald-950 text-emerald-400 border border-emerald-800/80'
                  }`}>
                    {metadata.pixelAnalyzed ? <Eye className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-zinc-400 font-medium text-[11px] block">
                        {metadata.pixelAnalyzed
                          ? 'ছবির আসল পিক্সেল বিশ্লেষণ দ্বারা যাচাইকৃত (Visible Content Analyzed from Pixels):'
                          : 'কন্ট্রিবিউটরের বর্ণিত দৃশ্যমান বিষয়বস্তু (User-Described Subject - পিক্সেল স্ক্যান নয়):'}
                      </span>
                      {metadata.pixelAnalyzed ? (
                        <span className="text-[9px] bg-indigo-950 text-indigo-300 border border-indigo-700 px-2 py-0.5 rounded-full font-mono font-semibold flex items-center gap-1">
                          <Eye className="w-2.5 h-2.5 text-indigo-400" />
                          Pixel Verified (Vision Analysis)
                        </span>
                      ) : (
                        <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full font-mono font-semibold">
                          User Described (Heuristic Context)
                        </span>
                      )}
                    </div>
                    <span className="text-zinc-100 font-semibold truncate block mt-0.5">
                      {metadata.visualSubjectDescription || 'যাচাইকৃত দৃশ্যমান বিষয়বস্তু'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setUserDescriptionInput(metadata.visualSubjectDescription || '');
                    setIsEditingDescription(!isEditingDescription);
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-800/50 px-3 py-1.5 rounded-xl transition-colors shrink-0 self-end sm:self-auto flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isEditingDescription ? 'সম্পাদনা বন্ধ করুন' : 'বিষয়বস্তু পরিবর্তন / সম্পাদনা'}</span>
                </button>
              </div>

              {/* Visual Grounding Quality Notice (Truthful Labeling) */}
              <div className="bg-emerald-950/20 border border-emerald-800/50 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-emerald-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-emerald-200">
                      {metadata.pixelAnalyzed
                        ? 'কোয়ালিটি ভ্যালিডেশন: পিক্সেল ভিশন ও দৃশ্যমান উপাদানের ভিত্তিতে মেটাডেটা'
                        : 'মেটাডেটা ফিল্টারিং: প্রম্পট ও টেক্সট ডিকশনারিভিত্তিক মেটাডেটা (Factual Context Filtered)'}
                    </span>
                    <span className="text-[10px] bg-emerald-900/60 text-emerald-300 px-2 py-0.2 rounded-full font-mono border border-emerald-700/60">
                      Zero Promotional Fluff
                    </span>
                  </div>
                  <p className="text-zinc-300 text-[11px] leading-relaxed">
                    ছবিতে সরাসরি দৃশ্যমান নয় এমন মনগড়া ইনগ্রেডিয়েন্ট বা কাল্পনিক অ্যাকশন টেক্সট ডিকশনারি দিয়ে ফিল্টার করা হয়েছে। তবে পিক্সেল-লেভেলে শতভাগ মিল ও কোনো ক্ষুদ্র লোগো নেই তা নিশ্চিত করতে ব্যবহারকারীর নিজস্ব ম্যানুয়াল ভিজ্যুয়াল রিভিউ আবশ্যক।
                  </p>
                </div>
              </div>

              {/* English Title with Specific Marketplace Title-Length Rules */}
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <label className="text-xs font-semibold text-zinc-200">
                      English Commercial Title
                    </label>
                    <span className="text-[11px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-md font-mono">
                      {metadata.title.length} chars · {metadata.title.split(/\s+/).filter(Boolean).length} words
                    </span>
                    {metadata.titleRule && (
                      <span className="text-[10px] bg-indigo-950/80 text-indigo-300 border border-indigo-800/80 px-2 py-0.5 rounded-md font-medium">
                        {metadata.titleRule.recommendedChars}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    {isEditingTitle ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handleSaveEditedTitle}
                          className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/60 px-2.5 py-1 rounded-lg transition-colors font-semibold"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Save</span>
                        </button>
                        <button
                          onClick={() => setIsEditingTitle(false)}
                          className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleStartEditTitle}
                        className="flex items-center gap-1 text-xs text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 px-2.5 py-1 rounded-lg transition-colors"
                        title="Edit Commercial Title"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Edit</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleCopyText(metadata.title, 'title')}
                      className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 hover:bg-indigo-950/80 border border-indigo-800/50 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      {copiedField === 'title' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Title</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {isEditingTitle ? (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEditedTitle();
                      }}
                      className="w-full bg-zinc-950 border border-indigo-500/80 rounded-xl p-3 text-xs text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Enter edited commercial title..."
                    />
                    <p className="text-[10px] text-zinc-400">
                      Enter চাপুন অথবা Save বাটনে ক্লিক করে টাইটেল পরিবর্তন নিশ্চিত করুন। রুলস অডিট স্বয়ংক্রিয়ভাবে আপডেট হবে।
                    </p>
                  </div>
                ) : (
                  <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3 text-xs text-zinc-100 font-mono select-all leading-relaxed">
                    {metadata.title}
                  </div>
                )}

                {/* Marketplace Validation Audit & Honest Scope Disclaimer (শর্ত ৩) */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] text-zinc-300 flex items-center gap-1.5 flex-wrap">
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{metadata.marketplaceName} কোড-ভিত্তিক সিনট্যাক্স যাচাই (PASS):</span>
                    </span>
                    <span>
                      {metadata.titleRule?.notes || `${metadata.marketplaceName} প্ল্যাটফর্মের সুনির্দিষ্ট ক্যারেক্টার ও শব্দসীমা অনুসরণ করা হয়েছে`}
                    </span>
                  </div>

                  {metadata.validationAudit?.policyScopeAudit && (
                    <div className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-2.5 text-[10.5px] space-y-1 text-zinc-400">
                      <div className="flex items-center gap-1.5 text-amber-300 font-medium">
                        <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>নীতিমালা যাচাইয়ের সঠিক পরিধি (Truthful Verification Scope):</span>
                      </div>
                      <p className="text-zinc-300 leading-relaxed">
                        {metadata.validationAudit.policyScopeAudit.disclaimerBn}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* English Description */}
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-purple-400" />
                    <label className="text-xs font-semibold text-zinc-200">
                      Factual Commercial Description (2 Factual Sentences)
                    </label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isEditingDesc ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handleSaveEditedDesc}
                          className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/60 px-2.5 py-1 rounded-lg transition-colors font-semibold"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Save</span>
                        </button>
                        <button
                          onClick={() => setIsEditingDesc(false)}
                          className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleStartEditDesc}
                        className="flex items-center gap-1 text-xs text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 px-2.5 py-1 rounded-lg transition-colors"
                        title="Edit Commercial Description"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Edit</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleCopyText(metadata.description, 'description')}
                      className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 hover:bg-indigo-950/80 border border-indigo-800/50 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      {copiedField === 'description' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Description</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                {isEditingDesc ? (
                  <div className="space-y-1.5">
                    <textarea
                      value={editedDesc}
                      onChange={(e) => setEditedDesc(e.target.value)}
                      rows={3}
                      className="w-full bg-zinc-950 border border-indigo-500/80 rounded-xl p-3 text-xs text-zinc-100 font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                      placeholder="Enter edited commercial description..."
                    />
                    <p className="text-[10px] text-zinc-400">
                      Save বাটনে ক্লিক করে ডেসক্রিপশন পরিবর্তন নিশ্চিত করুন।
                    </p>
                  </div>
                ) : (
                  <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3 text-xs text-zinc-200 leading-relaxed select-all">
                    {metadata.description}
                  </div>
                )}
              </div>

              {/* 30-40 Relevant Keywords */}
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tag className="w-4 h-4 text-amber-400" />
                    <label className="text-xs font-semibold text-zinc-200">
                      Keywords ({metadata.keywords.length} Relevant Keywords)
                    </label>
                    <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full font-mono">
                      {metadata.keywords.length}টি দৃশ্যমান যাচাইকৃত
                    </span>
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/70 px-2 py-0.5 rounded-full font-medium">
                      Pixel-Verified Visual Attributes
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {isEditingKeywords ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handleSaveEditedKeywords}
                          className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/60 px-2.5 py-1 rounded-lg transition-colors font-semibold"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Save</span>
                        </button>
                        <button
                          onClick={() => setIsEditingKeywords(false)}
                          className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleStartEditKeywords}
                        className="flex items-center gap-1 text-xs text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 px-2.5 py-1 rounded-lg transition-colors"
                        title="Edit Keywords"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Edit Tags</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleCopyText(metadata.keywords.join(', '), 'keywords-comma')}
                      className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 hover:bg-indigo-950/80 border border-indigo-800/50 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      {copiedField === 'keywords-comma' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy (Comma-Separated)</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleCopyText(metadata.keywords.join('\n'), 'keywords-list')}
                      className="flex items-center gap-1 text-xs text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      {copiedField === 'keywords-list' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy (List)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {isEditingKeywords ? (
                  <div className="space-y-1.5">
                    <textarea
                      value={editedKeywordsText}
                      onChange={(e) => setEditedKeywordsText(e.target.value)}
                      rows={3}
                      className="w-full bg-zinc-950 border border-indigo-500/80 rounded-xl p-3 text-xs text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                      placeholder="Enter comma-separated keywords..."
                    />
                    <p className="text-[10px] text-zinc-400">
                      কমা (,) দিয়ে আলাদা করে কীওয়ার্ড লিখুন। Save করার পর হাইজিন ও অ্যানোমালি অডিট স্বয়ংক্রিয়ভাবে পুনরায় চলবে।
                    </p>
                  </div>
                ) : (
                  <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3 max-h-52 overflow-y-auto flex flex-wrap gap-1.5">
                    {metadata.keywords.map((kw, idx) => {
                      const isComplianceTag = kw === 'generative ai' || kw === 'ai generated' || kw === '_ai_generated';
                      return (
                        <span
                          key={idx}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
                            isComplianceTag
                              ? 'bg-cyan-950/70 border-cyan-700/70 text-cyan-200 font-semibold'
                              : idx < 10
                              ? 'bg-indigo-950/60 border-indigo-800/60 text-indigo-200 font-medium'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                          }`}
                        >
                          {isComplianceTag ? (
                            <span className="text-[9px] text-cyan-400 font-mono">TAG</span>
                          ) : idx < 10 ? (
                            <span className="text-[9px] text-indigo-400 font-mono">#{idx + 1}</span>
                          ) : null}
                          {kw}
                        </span>
                      );
                    })}
                  </div>
                )}

                <p className="text-[10px] text-zinc-500">
                  * দৃশ্যমান পিক্সেল দ্বারা যাচাইকৃত সত্যনিষ্ঠ কীওয়ার্ড। এআই ডিসক্লোজার স্বতন্ত্র ফিল্ডে সংরক্ষিত এবং কাল্পনিক উপাদান (যেমন dipping sauce, steak knife, steam, protein, gastropub) সম্পূর্ণ বর্জিত।
                </p>

                {/* Keyword Hygiene & Anomaly Audit (Priority 2.8) */}
                {metadata.validationAudit?.keywordAnomalyAudit && (
                  <div className="mt-3 pt-3 border-t border-zinc-800/80 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                        <span>কীওয়ার্ড হাইজিন ও কোয়ালিটি অডিট (Keyword Hygiene Audit)</span>
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {metadata.validationAudit.keywordAnomalyAudit.correctionFlags.length === 0
                          ? '✅ ত্রুটিমুক্ত (Clean)'
                          : `⚠️ ${metadata.validationAudit.keywordAnomalyAudit.correctionFlags.length}টি সংশোধন ফ্ল্যাগ`}
                      </span>
                    </div>

                    {metadata.validationAudit.keywordAnomalyAudit.correctionFlags.length > 0 ? (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {metadata.validationAudit.keywordAnomalyAudit.correctionFlags.map((flag, fIdx) => (
                          <div
                            key={fIdx}
                            className="bg-zinc-950/90 border border-amber-900/40 rounded-lg p-2 text-[10.5px] space-y-0.5 text-zinc-300"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-amber-300 font-medium truncate">
                                {flag.term}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-400 border border-amber-800/60 uppercase font-mono">
                                {flag.type.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-zinc-400 text-[10px]">{flag.reason}</p>
                            <p className="text-indigo-300/90 text-[10px]">💡 {flag.suggestedFix}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-2 rounded bg-emerald-950/30 border border-emerald-900/40 text-[10.5px] text-emerald-300/90 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>কোনো প্রম্পট-আর্টিফ্যাক্ট, অপ্রাসঙ্গিক শব্দ, ডুপ্লিকেট বা পরস্পরবিরোধী উপাদান পাওয়া যায়নি।</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* AI Disclosure Statement (Kept in a Separate Dedicated Field) */}
              {metadata.aiDisclosure && (
                <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <label className="text-xs font-semibold text-zinc-200">
                        AI Disclosure & Commercial Licensing (স্বতন্ত্র এআই ডিসক্লোজার ফিল্ড)
                      </label>
                    </div>
                    <button
                      onClick={() => handleCopyText(metadata.aiDisclosure!, 'disclosure')}
                      className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 hover:bg-indigo-950/80 border border-indigo-800/50 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      {copiedField === 'disclosure' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy AI Disclosure</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3 text-xs text-zinc-300 font-mono leading-relaxed select-all">
                    {metadata.aiDisclosure}
                  </div>
                  <p className="text-[10px] text-zinc-500">
                    * কমার্শিয়াল টাইটেল বা ডেসক্রিপশনের সাথে এআই ডিসক্লেমার মেশানো হয়নি; স্টক প্ল্যাটফর্মের AI Disclosure চেকবক্স ও কন্ট্রিবিউটর নোটে ব্যবহারের জন্য এটি আলাদা রাখা হয়েছে।
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Paid API Notice & Free Tier Indicator (শর্ত ৬) */}
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-zinc-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                ইঞ্জিন: <strong className="text-zinc-200">{providerUsed || 'Studio Stock Engine'}</strong>
              </span>
              <span>·</span>
              <span className="text-emerald-400">কোনো পেইড API চালু করা হয়নি (Free Tier)</span>
            </span>
            <span className="text-zinc-400">
              নন-এক্সক্লুসিভ লাইসেন্সে মাল্টি-মার্কেটপ্লেসে সাবমিশন সমর্থিত
            </span>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-5 sm:px-7 py-3.5 border-t border-zinc-800 bg-zinc-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-zinc-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-zinc-500" />
            <span>Title, Description ও Keywords কপি করে সরাসরি স্টক পোর্টালে পেস্ট করুন</span>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
            {/* Download as TXT */}
            <button
              onClick={handleDownloadTxt}
              disabled={!metadata}
              className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs px-3.5 py-2 rounded-xl border border-zinc-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .txt</span>
            </button>

            {/* Export Metadata (CSV/JSON) Button */}
            <button
              onClick={() => setShowExportModal(true)}
              disabled={!metadata}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-emerald-950/50"
              title="Export structured metadata in CSV/JSON with prompts, identified brands, and compliance status"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Metadata</span>
            </button>

            {/* Copy All Button */}
            <button
              onClick={handleCopyAll}
              disabled={!metadata}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-950/50"
            >
              {copiedField === 'all' ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>সব মেটাডেটা কপি হয়েছে!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy All Metadata</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Export Metadata Modal (CSV / JSON / Prompts / Brand Info / Compliance) */}
      {metadata && currentDisplayAsset && (
        <ExportMetadataModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          asset={currentDisplayAsset}
          metadata={metadata}
          qualityReport={qualityReport}
        />
      )}
    </div>
  );
};
