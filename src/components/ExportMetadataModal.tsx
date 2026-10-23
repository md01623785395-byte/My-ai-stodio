import React, { useState } from 'react';
import { Asset, PreparedStockMetadata } from '../types';
import { FinalQualityReport } from '../utils/qualityChecker';
import {
  generateStockMetadataCsv,
  generateStockMetadataJson,
  generateStockPlatformCopyText,
  downloadFile,
  buildStructuredExportData,
} from '../utils/stockMetadataExporter';
import {
  X,
  Download,
  Copy,
  Check,
  FileSpreadsheet,
  FileCode,
  FileText,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Sparkles,
  Info,
  CheckCircle2,
  Tag,
  Sliders,
  ExternalLink,
} from 'lucide-react';

interface ExportMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
  metadata: PreparedStockMetadata;
  qualityReport?: FinalQualityReport | null;
}

export const ExportMetadataModal: React.FC<ExportMetadataModalProps> = ({
  isOpen,
  onClose,
  asset,
  metadata,
  qualityReport,
}) => {
  const [activeTab, setActiveTab] = useState<'csv' | 'json' | 'quick-copy'>('csv');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const exportData = buildStructuredExportData(asset, metadata, qualityReport);
  const csvContent = generateStockMetadataCsv(asset, metadata, qualityReport);
  const jsonContent = generateStockMetadataJson(asset, metadata, qualityReport);
  const copyTextContent = generateStockPlatformCopyText(asset, metadata, qualityReport);

  const safeTitle = asset.title.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'stock-asset';
  const timestampStr = new Date().toISOString().slice(0, 10);

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadCsv = () => {
    const filename = `${safeTitle}-${metadata.marketplace}-metadata-${timestampStr}.csv`;
    downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
  };

  const handleDownloadJson = () => {
    const filename = `${safeTitle}-${metadata.marketplace}-metadata-${timestampStr}.json`;
    downloadFile(jsonContent, filename, 'application/json;charset=utf-8;');
  };

  const handleDownloadPlatformText = () => {
    const filename = `${safeTitle}-${metadata.marketplace}-submission-guide-${timestampStr}.txt`;
    downloadFile(copyTextContent, filename, 'text/plain;charset=utf-8;');
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[92vh] bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-zinc-800 bg-zinc-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Export Metadata (মেটাডেটা এক্সপোর্ট)
                </h3>
                <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded-full font-mono font-medium">
                  {metadata.marketplaceName}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                প্রম্পট, ব্র্যান্ড আইডেন্টিফিকেশন ও কমপ্লায়েন্স স্ট্যাটাসসহ স্ট্রাকচার্ড টেক্সট ফাইল (CSV/JSON)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 rounded-xl transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-5 sm:px-6 pt-3 pb-2 border-b border-zinc-800/80 bg-zinc-900/40 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('csv')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'csv'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 shadow-sm'
                : 'bg-zinc-900/60 text-zinc-400 border border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>CSV Format (.csv)</span>
            <span className="text-[10px] bg-emerald-950 px-1.5 py-0.2 rounded text-emerald-400 font-mono">
              Excel / Sheets
            </span>
          </button>

          <button
            onClick={() => setActiveTab('json')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'json'
                ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-700/80 shadow-sm'
                : 'bg-zinc-900/60 text-zinc-400 border border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <FileCode className="w-4 h-4 text-indigo-400" />
            <span>JSON Format (.json)</span>
            <span className="text-[10px] bg-indigo-950 px-1.5 py-0.2 rounded text-indigo-400 font-mono">
              Structured
            </span>
          </button>

          <button
            onClick={() => setActiveTab('quick-copy')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'quick-copy'
                ? 'bg-amber-950/80 text-amber-300 border border-amber-700/80 shadow-sm'
                : 'bg-zinc-900/60 text-zinc-400 border border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Copy className="w-4 h-4 text-amber-400" />
            <span>Quick Copy Hub</span>
            <span className="text-[10px] bg-amber-950 px-1.5 py-0.2 rounded text-amber-300 font-mono">
              Stock Portals
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-4 flex-1">
          {/* Key Summary Badges (Prompts + Brands + Compliance) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            {/* 1. Prompt Info */}
            <div className="bg-zinc-900/60 border border-zinc-800/90 rounded-2xl p-3 space-y-1">
              <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>প্রম্পট ও মডেল (Prompts)</span>
              </span>
              <p className="text-zinc-200 line-clamp-1 font-mono text-[11px]" title={asset.prompt}>
                {asset.prompt}
              </p>
              <div className="text-[10px] text-zinc-400 flex items-center gap-2 pt-0.5">
                <span>Model: {asset.model || 'Studio'}</span>
                <span>·</span>
                <span>{asset.dimensions}</span>
              </div>
            </div>

            {/* 2. Brand Identification */}
            <div className="bg-zinc-900/60 border border-zinc-800/90 rounded-2xl p-3 space-y-1">
              <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>ব্র্যান্ড তথ্য (Brand Info)</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                    exportData.brandInformation.promptBrandDetected
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}
                >
                  {exportData.brandInformation.promptBrandDetected
                    ? `ব্র্যান্ড: ${exportData.brandInformation.identifiedBrands.join(', ')}`
                    : 'কোনো ব্র্যান্ড উল্লেখ নেই'}
                </span>
              </div>
              <p className="text-[10px] text-amber-300/90 truncate">
                {exportData.brandInformation.visualLogoCheckStatus}
              </p>
            </div>

            {/* 3. Compliance Status */}
            <div className="bg-zinc-900/60 border border-zinc-800/90 rounded-2xl p-3 space-y-1">
              <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>কমপ্লায়েন্স (Compliance)</span>
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                    exportData.complianceStatus.overallStatusColor === 'rose'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : exportData.complianceStatus.overallStatusColor === 'amber'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}
                >
                  {exportData.complianceStatus.overallQualityTier}
                </span>
                <span className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded">
                  {metadata.aiPolicyBadge}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 truncate">
                {metadata.labelingRequirement}
              </p>
            </div>
          </div>

          {/* TAB 1: CSV Export */}
          {activeTab === 'csv' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-emerald-950/20 border border-emerald-800/50 rounded-2xl p-3.5 text-xs text-emerald-300">
                <div className="flex items-start gap-2.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-emerald-200">
                      RFC 4180 কমপ্লায়েন্ট CSV ফাইল (Excel ও Google Sheets ফ্রেন্ডলি)
                    </h4>
                    <p className="text-[11px] text-emerald-300/90 mt-0.5">
                      এতে Commercial Title, Description, Keywords, Prompts, Brand Information ও Compliance Status-এর জন্য নির্ধারিত কলাম রয়েছে।
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    onClick={() => handleCopy(csvContent, 'csv')}
                    className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs px-3 py-1.5 rounded-xl border border-zinc-700 transition-colors"
                  >
                    {copiedField === 'csv' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">কপি হয়েছে!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy CSV</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDownloadCsv}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl transition-all shadow-md shadow-emerald-950/50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV (.csv)</span>
                  </button>
                </div>
              </div>

              {/* CSV Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                  <span>ফাইল প্রিভিউ (CSV Plaintext Preview):</span>
                  <span className="font-mono text-[11px] text-zinc-500">
                    UTF-8 BOM · Comma-Separated
                  </span>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 font-mono text-[11px] text-zinc-300 overflow-x-auto max-h-60 leading-relaxed whitespace-pre">
                  {csvContent.replace('\uFEFF', '')}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: JSON Export */}
          {activeTab === 'json' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-indigo-950/20 border border-indigo-800/50 rounded-2xl p-3.5 text-xs text-indigo-300">
                <div className="flex items-start gap-2.5">
                  <FileCode className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-indigo-200">
                      স্ট্রাকচার্ড JSON ফাইল (Developer & Automation API Ready)
                    </h4>
                    <p className="text-[11px] text-indigo-300/90 mt-0.5">
                      Prompts, Identified Brands, Visual Logo Analysis এবং Compliance Status-এর পরিষ্কার কী-ভ্যালু অবজেক্ট।
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    onClick={() => handleCopy(jsonContent, 'json')}
                    className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs px-3 py-1.5 rounded-xl border border-zinc-700 transition-colors"
                  >
                    {copiedField === 'json' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">কপি হয়েছে!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDownloadJson}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl transition-all shadow-md shadow-indigo-950/50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download JSON (.json)</span>
                  </button>
                </div>
              </div>

              {/* JSON Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                  <span>স্ট্রাকচার্ড অবজেক্ট প্রিভিউ (JSON Object Preview):</span>
                  <span className="font-mono text-[11px] text-zinc-500">application/json</span>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 font-mono text-[11px] text-indigo-200 overflow-x-auto max-h-60 leading-relaxed whitespace-pre">
                  {jsonContent}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Quick Copy Hub for Stock Platforms */}
          {activeTab === 'quick-copy' && (
            <div className="space-y-3.5">
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3 flex items-start gap-2 text-xs text-zinc-300">
                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Adobe Stock, Freepik বা অন্যান্য স্টক কন্ট্রিবিউটর পোর্টালে সাবমিট করার সুবিধার্থে প্রতিটি ফিল্ড নিচে আলাদাভাবে সাজানো হয়েছে। এক ক্লিকে কপি করে স্টক ফর্মের সংশ্লিষ্ট বক্সে পেস্ট করুন।
                </p>
              </div>

              {/* Field 1: Title */}
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Commercial Title ({metadata.title.length} chars)</span>
                  </span>
                  <button
                    onClick={() => handleCopy(metadata.title, 'qc-title')}
                    className="flex items-center gap-1 text-[11px] text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900 px-2.5 py-1 rounded-lg border border-indigo-800/60 transition-colors"
                  >
                    {copiedField === 'qc-title' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Title</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs font-mono text-zinc-200 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 select-all">
                  {metadata.title}
                </p>
              </div>

              {/* Field 2: Description */}
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-purple-400" />
                    <span>Commercial Description</span>
                  </span>
                  <button
                    onClick={() => handleCopy(metadata.description, 'qc-desc')}
                    className="flex items-center gap-1 text-[11px] text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900 px-2.5 py-1 rounded-lg border border-indigo-800/60 transition-colors"
                  >
                    {copiedField === 'qc-desc' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Description</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-zinc-200 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 select-all leading-relaxed">
                  {metadata.description}
                </p>
              </div>

              {/* Field 3: Keywords */}
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-semibold text-zinc-300">
                      Keywords ({metadata.keywords.length} Comma-Separated Tags)
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(metadata.keywords.join(', '), 'qc-keywords')}
                    className="flex items-center gap-1 text-[11px] text-amber-300 hover:text-white bg-amber-950/60 hover:bg-amber-900 px-2.5 py-1 rounded-lg border border-amber-800/60 transition-colors"
                  >
                    {copiedField === 'qc-keywords' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Comma Tags</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs font-mono text-zinc-300 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 max-h-24 overflow-y-auto select-all leading-relaxed">
                  {metadata.keywords.join(', ')}
                </p>
              </div>

              {/* Field 4: Prompt & Provenance */}
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Generation Prompt</span>
                  </span>
                  <button
                    onClick={() => handleCopy(asset.prompt, 'qc-prompt')}
                    className="flex items-center gap-1 text-[11px] text-cyan-300 hover:text-white bg-cyan-950/60 hover:bg-cyan-900 px-2.5 py-1 rounded-lg border border-cyan-800/60 transition-colors"
                  >
                    {copiedField === 'qc-prompt' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Prompt</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-zinc-200 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 select-all leading-relaxed">
                  {asset.prompt}
                </p>
              </div>

              {/* Field 5: Labeling & Compliance Checkbox Note */}
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Portal AI Labeling Requirement</span>
                  </span>
                  <button
                    onClick={() => handleCopy(metadata.labelingRequirement, 'qc-labeling')}
                    className="flex items-center gap-1 text-[11px] text-emerald-300 hover:text-white bg-emerald-950/60 hover:bg-emerald-900 px-2.5 py-1 rounded-lg border border-emerald-800/60 transition-colors"
                  >
                    {copiedField === 'qc-labeling' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Labeling</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs font-mono text-emerald-200 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 select-all">
                  {metadata.labelingRequirement}
                </p>
              </div>

              {/* Field 6: AI Disclosure & Transparency Statement (Separate Field) */}
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span>AI Disclosure & Contributor Statement (পৃথক ফিল্ড)</span>
                  </span>
                  <button
                    onClick={() => handleCopy(metadata.aiDisclosure || 'Created with generative AI. Complies with commercial stock distribution standards without brand logos or private biometrics.', 'qc-disclosure')}
                    className="flex items-center gap-1 text-[11px] text-blue-300 hover:text-white bg-blue-950/60 hover:bg-blue-900 px-2.5 py-1 rounded-lg border border-blue-800/60 transition-colors"
                  >
                    {copiedField === 'qc-disclosure' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Disclosure</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-zinc-300 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 select-all leading-relaxed">
                  {metadata.aiDisclosure || 'Created with generative AI. Complies with commercial stock distribution standards without brand logos or private biometrics.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-zinc-800 bg-zinc-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-zinc-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-zinc-500" />
            <span>প্রম্পট, ব্র্যান্ড তথ্য ও অফিসিয়াল নীতি যাচাইসহ প্রস্তুতকৃত</span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
            <button
              onClick={handleDownloadPlatformText}
              className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs px-3 py-2 rounded-xl border border-zinc-700 transition-colors"
              title="সম্পূর্ণ টেক্সট গাইড ডাউনলোড"
            >
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              <span>Full Guide (.txt)</span>
            </button>

            <button
              onClick={handleDownloadCsv}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shadow-md shadow-emerald-950/50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>

            <button
              onClick={handleDownloadJson}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shadow-md shadow-indigo-950/50"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Download JSON</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
