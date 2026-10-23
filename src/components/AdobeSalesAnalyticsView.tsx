/**
 * Adobe Sales Analytics & CSV Import View
 * Priority 7.0 & 7.0.1: Mobile-friendly, client-side analytics & deduplicated import
 */

import React, { useState, useEffect, useRef } from 'react';
import { Asset, StudioTab } from '../types';
import {
  AdobeSaleRecord,
  ColumnMappingOverride,
  ImportSalesResult,
  ParseSalesCSVResult,
  SalesAnalyticsSummary,
} from '../types/salesAnalytics';
import { parseAdobeSalesCSV } from '../utils/adobeSalesCsvParser';
import {
  clearAllSalesRecords,
  deleteSalesRecord,
  importSalesRecordsToDB,
  loadAllSalesRecords,
} from '../utils/salesAnalyticsStorage';
import { calculateSalesAnalytics } from '../utils/salesAnalyticsCalculator';
import {
  Upload,
  FileSpreadsheet,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Download,
  Layers,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  ExternalLink,
  ChevronRight,
  Info,
  Sparkles,
  BarChart3,
  Calendar,
  Search,
  X,
  SlidersHorizontal,
  Check,
} from 'lucide-react';

interface AdobeSalesAnalyticsViewProps {
  assets: Asset[];
  onNavigate?: (tab: StudioTab) => void;
  onSelectTopicForPlanner?: (topic: string) => void;
}

export const AdobeSalesAnalyticsView: React.FC<AdobeSalesAnalyticsViewProps> = ({
  assets,
  onNavigate,
  onSelectTopicForPlanner,
}) => {
  const [salesRecords, setSalesRecords] = useState<AdobeSaleRecord[]>([]);
  const [analytics, setAnalytics] = useState<SalesAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'assets' | 'records'>('overview');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLicenseFilter, setSelectedLicenseFilter] = useState<string>('all');

  // Import Status & Audit
  const [lastImportResult, setLastImportResult] = useState<{
    parseResult: ParseSalesCSVResult;
    dbResult?: ImportSalesResult;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Priority 7.0.4: Pre-Import Confirmation Modal & Column Mapping Review State
  interface StagedImportData {
    fileName: string;
    fileSize: number;
    rawText: string;
    parseResult: ParseSalesCSVResult;
    userMapping: {
      assetIdCol: number;
      dateCol: number;
      royaltyCol: number;
      licenseCol: number;
      titleCol: number;
      hasHeaderRow: boolean;
    };
  }
  const [stagedImport, setStagedImport] = useState<StagedImportData | null>(null);
  const [showPreImportModal, setShowPreImportModal] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing records from IndexedDB on mount
  useEffect(() => {
    loadData();
  }, [assets]);

  const loadData = async () => {
    setLoading(true);
    try {
      const records = await loadAllSalesRecords();
      setSalesRecords(records);
      const computed = calculateSalesAnalytics(records, assets);
      setAnalytics(computed);
    } catch (err: any) {
      console.error('Failed to load sales records from IndexedDB:', err);
      setErrorMessage(`IndexedDB থেকে বিক্রয় তথ্য লোড করতে ব্যর্থ: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Support Android filenames (e.g. downloads.csv, downloads (1).csv, AdobeStock_sales.csv) and MIME types
    const fileName = (file.name || '').toLowerCase();
    const fileType = (file.type || '').toLowerCase();
    const isCsvOrTxt =
      fileName.endsWith('.csv') ||
      fileName.endsWith('.txt') ||
      fileType.includes('csv') ||
      fileType.includes('excel') ||
      fileType.includes('text/plain');

    if (!isCsvOrTxt) {
      setErrorMessage(
        `অনুগ্রহ করে শুধুমাত্র বৈধ CSV বা TXT ফাইল নির্বাচন করুন (যেমন: downloads.csv বা downloads (1).csv)। সিলেক্ট করা ফাইল: "${file.name}"`
      );
      return;
    }

    setIsProcessingFile(true);
    setErrorMessage(null);
    setSuccessToast(null);

    try {
      // Robust file reading: use file.text() with fallback to FileReader for Android WebViews/older browsers
      let text = '';
      if (typeof file.text === 'function') {
        try {
          text = await file.text();
        } catch {
          text = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(reader.error || new Error('ফাইল পড়তে ব্যর্থ হয়েছে'));
            reader.readAsText(file);
          });
        }
      } else {
        text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(reader.error || new Error('ফাইল পড়তে ব্যর্থ হয়েছে'));
          reader.readAsText(file);
        });
      }

      if (!text || text.trim().length === 0) {
        setErrorMessage('নির্বাচিত CSV ফাইলটি ফাঁকা (Empty file)।');
        setIsProcessingFile(false);
        return;
      }

      const parseResult = parseAdobeSalesCSV(text);

      const activeMapping = {
        assetIdCol: parseResult.activeMapping?.assetIdCol ?? 0,
        dateCol: parseResult.activeMapping?.dateCol ?? 1,
        royaltyCol: parseResult.activeMapping?.royaltyCol ?? 2,
        licenseCol: parseResult.activeMapping?.licenseCol ?? -1,
        titleCol: parseResult.activeMapping?.titleCol ?? -1,
        hasHeaderRow: parseResult.activeMapping?.hasHeaderRow ?? !parseResult.isHeaderless,
      };

      setStagedImport({
        fileName: file.name,
        fileSize: file.size,
        rawText: text,
        parseResult,
        userMapping: activeMapping,
      });
      setShowPreImportModal(true);
    } catch (err: any) {
      console.error('File parsing error:', err);
      setErrorMessage(`ফাইল প্রক্রিয়াকরণে ত্রুটি: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUpdateMapping = (field: keyof ColumnMappingOverride, value: any) => {
    if (!stagedImport) return;
    const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
    const newMapping = {
      ...stagedImport.userMapping,
      [field]: numValue,
    };
    const reParsed = parseAdobeSalesCSV(stagedImport.rawText, newMapping);
    setStagedImport({
      ...stagedImport,
      userMapping: newMapping,
      parseResult: reParsed,
    });
  };

  const handleConfirmImport = async () => {
    if (!stagedImport) return;
    if (!stagedImport.parseResult.success || stagedImport.parseResult.validRows === 0) {
      setErrorMessage(
        'ইমপোর্ট করার জন্য কোনো বৈধ বিক্রয় রেকর্ড পাওয়া যায়নি। অনুগ্রহ করে কলাম ম্যাপিং পরিবর্তন করুন।'
      );
      return;
    }

    setIsProcessingFile(true);
    setErrorMessage(null);
    try {
      const dbResult = await importSalesRecordsToDB(stagedImport.parseResult.records);
      setLastImportResult({
        parseResult: stagedImport.parseResult,
        dbResult,
      });

      const freshRecords = await loadAllSalesRecords();
      setSalesRecords(freshRecords);
      const computed = calculateSalesAnalytics(freshRecords, assets);
      setAnalytics(computed);

      setSuccessToast(
        `ইমপোর্ট সফল! "${stagedImport.fileName}" থেকে ${dbResult.importedCount}টি নতুন বিক্রয় সংরক্ষিত হয়েছে (${dbResult.duplicateCount}টি ডুপ্লিকেট বাদ দেওয়া হয়েছে)।`
      );
      setShowPreImportModal(false);
      setStagedImport(null);
    } catch (err: any) {
      console.error('Failed to import sales to IndexedDB:', err);
      setErrorMessage(`ডেটাবেজে সংরক্ষণ করতে ব্যর্থ: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleCancelImport = () => {
    setShowPreImportModal(false);
    setStagedImport(null);
  };

  const handleClearAll = async () => {
    if (
      !window.confirm(
        'আপনি কি নিশ্চিত যে সমস্ত Adobe Sales রেকর্ড মুছে ফেলতে চান? এটি পুনরায় ফিরিয়ে আনা যাবে না।'
      )
    ) {
      return;
    }

    try {
      await clearAllSalesRecords();
      setSalesRecords([]);
      setAnalytics(calculateSalesAnalytics([], assets));
      setLastImportResult(null);
      setSuccessToast('সমস্ত বিক্রয় তথ্য সফলভাবে মুছে ফেলা হয়েছে।');
    } catch (err: any) {
      setErrorMessage(`মুছে ফেলতে ব্যর্থ: ${err.message || 'Unknown error'}`);
    }
  };

  const handleDeleteSingle = async (id: string) => {
    try {
      await deleteSalesRecord(id);
      const updated = salesRecords.filter((r) => r.id !== id);
      setSalesRecords(updated);
      setAnalytics(calculateSalesAnalytics(updated, assets));
      setSuccessToast('রেকর্ডটি মুছে ফেলা হয়েছে।');
    } catch (err: any) {
      setErrorMessage(`রেকর্ড মুছতে ব্যর্থ: ${err.message}`);
    }
  };

  // Filtered raw records
  const filteredRecords = salesRecords.filter((r) => {
    const matchesSearch =
      !searchQuery ||
      r.assetId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.title && r.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      r.saleDate.includes(searchQuery);

    const matchesLicense =
      selectedLicenseFilter === 'all' ||
      r.license.toLowerCase() === selectedLicenseFilter.toLowerCase();

    return matchesSearch && matchesLicense;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-950/80 text-red-400 border border-red-800/60">
              Adobe Stock Insights
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              ১০০% ক্লায়েন্ট-সাইড (Private)
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            Adobe Stock Sales Analytics & CSV
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            অফিসিয়াল Insights CSV ড্রপ করুন। ব্রাউজারের ভেতর স্বয়ংক্রিয় ডুপ্লিকেট প্রতিরোধ ও নির্ভরযোগ্য চাহিদা যাচাই।
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label
            htmlFor="adobe-sales-csv-input"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs sm:text-sm font-medium transition-all shadow-sm cursor-pointer min-h-[44px] select-none ${
              isProcessingFile ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>{isProcessingFile ? 'পার্স করা হচ্ছে...' : 'CSV ইমপোর্ট করুন'}</span>
          </label>

          {salesRecords.length > 0 && (
            <button
              onClick={handleClearAll}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-400 hover:border-red-800/60 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="সব ডেটা মুছুন"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <input
            id="adobe-sales-csv-input"
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) handleFileUpload(file);
            }}
            accept=".csv,text/csv,application/vnd.ms-excel,text/plain,application/csv,text/comma-separated-values"
            disabled={isProcessingFile}
            className="sr-only"
            aria-label="Adobe Sales CSV ফাইল নির্বাচন করুন"
          />
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="bg-red-950/70 border border-red-800 text-red-200 px-4 py-3 rounded-lg text-xs sm:text-sm flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-200 text-xs font-semibold px-2 py-0.5 shrink-0"
          >
            বন্ধ করুন
          </button>
        </div>
      )}

      {successToast && (
        <div className="bg-emerald-950/70 border border-emerald-800 text-emerald-200 px-4 py-3 rounded-lg text-xs sm:text-sm flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-emerald-400 hover:text-emerald-200 text-xs font-semibold px-2 py-0.5 shrink-0"
          >
            বন্ধ করুন
          </button>
        </div>
      )}

      {/* Import Diagnostics / Breakdown Card */}
      {lastImportResult && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800 mb-3">
            <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
              সর্বশেষ CSV ইমপোর্ট রিপোর্ট ও কলাম ম্যাপিং
            </span>
            <button
              onClick={() => setLastImportResult(null)}
              className="text-zinc-500 hover:text-zinc-300 text-[11px]"
            >
              লুকান
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <div className="bg-zinc-950/70 p-2.5 rounded-lg border border-zinc-800/80">
              <span className="text-zinc-500 block text-[10px] uppercase">মোট সারি</span>
              <span className="text-sm font-bold text-zinc-100">
                {lastImportResult.parseResult.totalRows}
              </span>
            </div>
            <div className="bg-zinc-950/70 p-2.5 rounded-lg border border-emerald-900/40">
              <span className="text-emerald-400 block text-[10px] uppercase">নতুন ইমপোর্ট</span>
              <span className="text-sm font-bold text-emerald-400">
                {lastImportResult.dbResult?.importedCount ?? lastImportResult.parseResult.validRows}
              </span>
            </div>
            <div className="bg-zinc-950/70 p-2.5 rounded-lg border border-amber-900/40">
              <span className="text-amber-400 block text-[10px] uppercase">ডুপ্লিকেট বাদ</span>
              <span className="text-sm font-bold text-amber-400">
                {lastImportResult.dbResult?.duplicateCount ?? 0}
              </span>
            </div>
            <div className="bg-zinc-950/70 p-2.5 rounded-lg border border-red-900/40">
              <span className="text-red-400 block text-[10px] uppercase">বাতিল সারি</span>
              <span className="text-sm font-bold text-red-400">
                {lastImportResult.parseResult.skippedRows}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-zinc-400 flex flex-wrap gap-2 items-center">
            <span className="text-zinc-500 font-medium">শনাক্ত কলাম:</span>
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
              Asset ID: {lastImportResult.parseResult.detectedHeaders.assetIdHeader || 'N/A'}
            </span>
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
              Date: {lastImportResult.parseResult.detectedHeaders.dateHeader || 'N/A'}
            </span>
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
              Royalty: {lastImportResult.parseResult.detectedHeaders.royaltyHeader || 'N/A'}
            </span>
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
              License: {lastImportResult.parseResult.detectedHeaders.licenseHeader || 'Default (Standard)'}
            </span>
          </div>

          {lastImportResult.parseResult.errors.length > 0 && (
            <div className="mt-2 text-[11px] text-red-400 bg-red-950/30 p-2 rounded border border-red-900/50">
              <span className="font-semibold block mb-0.5">বাতিল সারির কারণ:</span>
              <ul className="list-disc pl-4 space-y-0.5">
                {lastImportResult.parseResult.errors.slice(0, 3).map((e, i) => (
                  <li key={i}>
                    সারি #{e.row}: {e.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}


      {/* Privacy Guarantee Card */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 sm:p-4 text-xs text-zinc-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>
            <strong className="text-zinc-200">জিরো ক্রেডেনশিয়াল ও লোকাল প্রসেসিং:</strong> Adobe পাসওয়ার্ড, ওটিপি বা সেশন কুকি সংগ্রহ করা হয় না। ফাইলটি শুধু আপনার ডিভাইসে পার্স হয়ে আলাদা IndexedDB স্টোরে সংরক্ষিত থাকে।
          </span>
        </div>
        <a
          href="https://contributor.stock.adobe.com/insights"
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[11px] underline shrink-0 min-h-[32px]"
        >
          <span>Adobe Insights পেজ খুলুন</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Empty State / Upload Dropzone */}
      {salesRecords.length === 0 && !loading && (
        <label
          htmlFor="adobe-sales-csv-input"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) handleFileUpload(file);
          }}
          className="border-2 border-dashed border-zinc-800 hover:border-indigo-600/80 bg-zinc-900/30 hover:bg-zinc-900/60 rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[220px] block select-none"
        >
          <div className="w-14 h-14 rounded-full bg-indigo-950/60 border border-indigo-800/80 flex items-center justify-center mb-4 text-indigo-400 mx-auto">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-zinc-200 mb-1">
            Adobe Insights CSV ফাইল এখানে ড্রপ করুন বা ক্লিক করুন
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto mb-4">
            Adobe Contributor পোর্টালের <strong>Insights</strong> ট্যাব থেকে ডাউনলোড করা সেলস CSV নির্বাচন করুন। হেডার কলাম স্বয়ংক্রিয়ভাবে শনাক্ত হবে।
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs">
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>CSV বা TXT ফাইল নির্বাচন করুন</span>
          </div>
        </label>
      )}

      {/* When Data Exists: KPI Cards & Analytics */}
      {analytics && salesRecords.length > 0 && (
        <>
          {/* KPI Stat Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                সর্বমোট রয়্যালটি (Earnings)
              </span>
              <div className="mt-2">
                <span className="text-2xl sm:text-3xl font-bold text-emerald-400">
                  ${analytics.totalEarnings.toFixed(2)}
                </span>
                <span className="text-[11px] text-zinc-500 ml-1">USD</span>
              </div>
              <span className="text-[11px] text-zinc-500 mt-1">
                সময়কাল: {analytics.dateRange.startDate} থেকে {analytics.dateRange.endDate}
              </span>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                মোট ডাউনলোড (Sales)
              </span>
              <div className="mt-2">
                <span className="text-2xl sm:text-3xl font-bold text-zinc-100">
                  {analytics.totalDownloads}
                </span>
                <span className="text-[11px] text-zinc-500 ml-1">বার</span>
              </div>
              <span className="text-[11px] text-zinc-500 mt-1">
                গড় রয়্যালটি: ${analytics.averageRoyalty.toFixed(2)} / বিক্রি
              </span>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                অনন্য বিক্রিত অ্যাসেট
              </span>
              <div className="mt-2">
                <span className="text-2xl sm:text-3xl font-bold text-zinc-100">
                  {analytics.uniqueAssetsCount}
                </span>
                <span className="text-[11px] text-zinc-500 ml-1">টি</span>
              </div>
              <span className="text-[11px] text-zinc-500 mt-1">
                প্রতি অ্যাসেটে গড়ে {analytics.uniqueAssetsCount > 0 ? (analytics.totalDownloads / analytics.uniqueAssetsCount).toFixed(1) : 0} বার
              </span>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                শীর্ষ লাইসেন্স ধরন
              </span>
              <div className="mt-2">
                <span className="text-lg sm:text-xl font-bold text-zinc-100 truncate block">
                  {analytics.licenseBreakdown[0]?.license || 'N/A'}
                </span>
                <span className="text-[11px] text-amber-400 font-medium">
                  {analytics.licenseBreakdown[0]?.percentage || 0}% বিক্রয়
                </span>
              </div>
              <span className="text-[11px] text-zinc-500 mt-1">
                ${analytics.licenseBreakdown[0]?.earnings.toFixed(2) || '0.00'} আয়
              </span>
            </div>
          </div>

          {/* Opportunity Engine & Statistical Reliability Assessment */}
          <div
            className={`border rounded-xl p-4 sm:p-5 ${
              analytics.opportunityAssessment.isReliableForBatchPlanner
                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                : 'bg-amber-950/40 border-amber-800/80 text-amber-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                {analytics.opportunityAssessment.isReliableForBatchPlanner ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                )}
                <h3 className="text-sm sm:text-base font-semibold text-zinc-100">
                  {analytics.opportunityAssessment.titleBn}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-900/90 text-zinc-300 font-mono">
                  নমুনা: {analytics.totalDownloads} / {analytics.opportunityAssessment.sampleThresholdRequired} (ন্যূনতম)
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    analytics.opportunityAssessment.isReliableForBatchPlanner
                      ? 'bg-emerald-900 text-emerald-300'
                      : 'bg-amber-900 text-amber-300'
                  }`}
                >
                  নির্ভরযোগ্যতা: {analytics.opportunityAssessment.reliabilityScorePercent}%
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-zinc-300 mb-3">
              {analytics.opportunityAssessment.explanationBn}
            </p>

            <div className="bg-zinc-900/80 rounded-lg p-3 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-zinc-400">
                <span className="text-zinc-200 font-medium">পরবর্তী পদক্ষেপ: </span>
                {analytics.opportunityAssessment.actionableRecommendationBn}
              </div>

              {analytics.opportunityAssessment.isReliableForBatchPlanner &&
                analytics.opportunityAssessment.topPerformingThemes.length > 0 &&
                onNavigate && (
                  <button
                    onClick={() => {
                      if (onSelectTopicForPlanner && analytics.opportunityAssessment.topPerformingThemes[0]) {
                        onSelectTopicForPlanner(analytics.opportunityAssessment.topPerformingThemes[0]);
                      }
                      onNavigate('batch-planner');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shrink-0 transition-colors min-h-[40px]"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>প্ল্যানারে থিম পাঠান</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 overflow-x-auto">
            <button
              onClick={() => setActiveSubTab('overview')}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors shrink-0 min-h-[40px] ${
                activeSubTab === 'overview'
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              পারফরম্যান্স ওভারভিউ ({analytics.monthlyTrends.length} মাস)
            </button>
            <button
              onClick={() => setActiveSubTab('assets')}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors shrink-0 min-h-[40px] ${
                activeSubTab === 'assets'
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              অ্যাসেট পারফরম্যান্স ({analytics.topAssets.length}টি)
            </button>
            <button
              onClick={() => setActiveSubTab('records')}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors shrink-0 min-h-[40px] ${
                activeSubTab === 'records'
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              বিক্রয় অডিট ও কাঁচা রেকর্ড ({salesRecords.length})
            </button>
          </div>

          {/* Tab 1: Overview & Trends */}
          {activeSubTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Monthly Trend Table */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
                <h4 className="text-xs sm:text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  মাসিক বিক্রয় ও আয়ের ইতিহাস
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400 font-medium">
                        <th className="py-2 pr-3">মাস</th>
                        <th className="py-2 pr-3 text-right">ডাউনলোড</th>
                        <th className="py-2 text-right">আয় (USD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {analytics.monthlyTrends.map((m) => (
                        <tr key={m.month} className="hover:bg-zinc-800/30">
                          <td className="py-2.5 pr-3 font-mono text-zinc-300">{m.month}</td>
                          <td className="py-2.5 pr-3 text-right text-zinc-200 font-medium">
                            {m.downloads}
                          </td>
                          <td className="py-2.5 text-right font-mono text-emerald-400 font-semibold">
                            ${m.earnings.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* License Distribution */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
                <h4 className="text-xs sm:text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  লাইসেন্স ধরন ভিত্তিক বিভাজন (License Split)
                </h4>
                <div className="space-y-3">
                  {analytics.licenseBreakdown.map((l) => (
                    <div key={l.license} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-300 font-medium">{l.license}</span>
                        <span className="text-zinc-400 font-mono">
                          {l.downloads} বার ({l.percentage}%) ·{' '}
                          <strong className="text-emerald-400">${l.earnings.toFixed(2)}</strong>
                        </span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.max(4, l.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Asset Level Performance */}
          {activeSubTab === 'assets' && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h4 className="text-xs sm:text-sm font-semibold text-zinc-200 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  অ্যাসেট পারফরম্যান্স তালিকা
                </h4>
                <div className="text-xs text-zinc-400">
                  সর্বমোট {analytics.topAssets.length}টি ভিন্ন অ্যাসেট বিক্রি হয়েছে
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 font-medium">
                      <th className="py-2.5 pr-3">Asset ID / Title</th>
                      <th className="py-2.5 pr-3 text-right">ডাউনলোড</th>
                      <th className="py-2.5 pr-3 text-right">রয়্যালটি</th>
                      <th className="py-2.5 pr-3">শীর্ষ লাইসেন্স</th>
                      <th className="py-2.5 pr-3">প্রথম বিক্রয়</th>
                      <th className="py-2.5 text-right">স্টুডিও লিংক</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {analytics.topAssets.map((asset) => (
                      <tr key={asset.assetId} className="hover:bg-zinc-800/30">
                        <td className="py-3 pr-3">
                          <div className="font-mono text-zinc-200 font-medium">
                            #{asset.assetId}
                          </div>
                          {asset.title ? (
                            <div className="text-[11px] text-zinc-400 truncate max-w-xs">
                              {asset.title}
                            </div>
                          ) : (
                            <div className="text-[10px] text-zinc-500 italic">
                              (Adobe CSV-তে টাইটেল নেই)
                            </div>
                          )}
                        </td>
                        <td className="py-3 pr-3 text-right font-medium text-zinc-100">
                          {asset.downloads}
                        </td>
                        <td className="py-3 pr-3 text-right font-mono font-semibold text-emerald-400">
                          ${asset.totalEarnings.toFixed(2)}
                        </td>
                        <td className="py-3 pr-3">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-300">
                            {asset.topLicense}
                          </span>
                        </td>
                        <td className="py-3 pr-3 text-zinc-400 font-mono text-[11px]">
                          {asset.firstSaleDate}
                        </td>
                        <td className="py-3 text-right">
                          {asset.matchedStudioAssetTitle ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              ম্যাচ হয়েছে
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-600">ম্যাচ নেই</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Raw Records & Deduplication Audit */}
          {activeSubTab === 'records' && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-4">
              {/* Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Asset ID বা তারিখ দিয়ে সার্চ করুন..."
                    className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <select
                  value={selectedLicenseFilter}
                  onChange={(e) => setSelectedLicenseFilter(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 min-h-[40px]"
                >
                  <option value="all">সব লাইসেন্স</option>
                  {analytics.licenseBreakdown.map((l) => (
                    <option key={l.license} value={l.license}>
                      {l.license} ({l.downloads})
                    </option>
                  ))}
                </select>
              </div>

              {/* Records Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 font-medium">
                      <th className="py-2.5 pr-3">তারিখ</th>
                      <th className="py-2.5 pr-3">Asset ID</th>
                      <th className="py-2.5 pr-3">লাইসেন্স</th>
                      <th className="py-2.5 pr-3 text-right">রয়্যালটি</th>
                      <th className="py-2.5 pr-3">ডুপ্লিকেট প্রতিরোধ কি (Dedupe Key)</th>
                      <th className="py-2.5 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {filteredRecords.slice(0, 100).map((record) => (
                      <tr key={record.id} className="hover:bg-zinc-800/30">
                        <td className="py-2.5 pr-3 font-mono text-zinc-300 text-[11px]">
                          {record.saleDate}
                        </td>
                        <td className="py-2.5 pr-3 font-mono font-medium text-zinc-200">
                          #{record.assetId}
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-300">
                            {record.license}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-right font-mono font-semibold text-emerald-400">
                          ${record.royalty.toFixed(2)}
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-[10px] text-zinc-500 truncate max-w-xs" title={record.dedupeKey}>
                          {record.dedupeKey}
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => handleDeleteSingle(record.id)}
                            className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                            title="রেকর্ড মুছুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredRecords.length > 100 && (
                <div className="text-center text-xs text-zinc-500 pt-2">
                  (প্রথম ১০০টি রেকর্ড প্রদর্শিত হচ্ছে, মোট {filteredRecords.length}টি রেকর্ডের মধ্যে)
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Priority 7.0.4: Pre-Import Confirmation & Column Mapping Review Modal */}
      {showPreImportModal && stagedImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-zinc-800 flex items-center justify-between gap-3 bg-zinc-950/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
                    CSV ইমপোর্ট প্রিভিউ ও কলাম নিশ্চিতকরণ
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-zinc-400">
                    <span className="font-mono text-zinc-300 truncate max-w-xs">{stagedImport.fileName}</span>
                    <span>•</span>
                    <span>{(stagedImport.fileSize / 1024).toFixed(1)} KB</span>
                    <span>•</span>
                    <span>মোট {stagedImport.parseResult.totalRows} সারি</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleCancelImport}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                title="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-5 text-xs sm:text-sm">
              {/* Status & Ambiguity Banner */}
              {stagedImport.parseResult.isAmbiguous || stagedImport.parseResult.isHeaderless ? (
                <div className="p-3 sm:p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-300">
                      হেডারবিহীন বা অস্পষ্ট কলাম ফাইল সনাক্ত হয়েছে
                    </h4>
                    <p className="text-xs text-amber-300/80 mt-0.5">
                      অনুমিত কলাম ম্যাপিং নিচে দেখানো হয়েছে। অনুমান করে ভুল বিক্রি সংরক্ষণ না করে ড্রপডাউন থেকে সঠিক কলাম নির্বাচন মিলিয়ে নিন।
                    </p>
                  </div>
                </div>
              ) : null}

              {/* License Fallback Banner */}
              {stagedImport.userMapping.licenseCol === -1 ||
              stagedImport.parseResult.detectedHeaders.licenseHeader.includes('Unknown') ||
              stagedImport.parseResult.detectedHeaders.licenseHeader.includes('অনুপস্থিত') ? (
                <div className="p-3 rounded-lg bg-sky-950/40 border border-sky-800/50 text-sky-200 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-sky-300">লাইসেন্স কলাম অনুপস্থিত:</span>{' '}
                    <span>
                      CSV-তে কোনো লাইসেন্স কলাম নেই, তাই বিক্রিগুলোকে 'Standard' অনুমান না করে নিরাপদভাবে <strong>'Unknown'</strong> লাইসেন্স হিসেবে রেকর্ড করা হবে।
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Error Banner if any */}
              {stagedImport.parseResult.errors.length > 0 && (
                <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-red-200">
                      সতর্কতা: {stagedImport.parseResult.errors.length}টি সারিতে অসংগতি বা বাদ পড়েছে
                    </span>
                    <p className="text-[11px] text-red-300/80 mt-0.5">
                      উদাহরণ: {stagedImport.parseResult.errors[0]?.error}
                    </p>
                  </div>
                </div>
              )}

              {/* Stat summary pills */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
                <div className="p-2.5 rounded-lg bg-zinc-800/40 border border-zinc-700/50">
                  <div className="text-[11px] text-zinc-400">মোট ডেটা সারি</div>
                  <div className="text-base font-bold text-zinc-100 mt-0.5">
                    {stagedImport.parseResult.totalRows}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/50">
                  <div className="text-[11px] text-emerald-400">বৈধ বিক্রয় রেকর্ড</div>
                  <div className="text-base font-bold text-emerald-300 mt-0.5">
                    {stagedImport.parseResult.validRows}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-800/40 border border-zinc-700/50">
                  <div className="text-[11px] text-zinc-400">বাদ/সামারি সারি</div>
                  <div className="text-base font-bold text-zinc-300 mt-0.5">
                    {stagedImport.parseResult.skippedRows}
                  </div>
                </div>
              </div>

              {/* Interactive Column Mapping Configuration */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                  <h4 className="font-semibold text-zinc-200 flex items-center gap-1.5">
                    <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                    কলাম ম্যাপিং নির্বাচন (User Column Mapping)
                  </h4>
                  <span className="text-[11px] text-zinc-400">প্রয়োজনে ড্রপডাউন পরিবর্তন করুন</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Asset ID Col */}
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                      Asset ID / Media ID কলাম <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={stagedImport.userMapping.assetIdCol}
                      onChange={(e) => handleUpdateMapping('assetIdCol', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    >
                      {(stagedImport.parseResult.rawHeaders || []).map((h, i) => (
                        <option key={`asset-${i}`} value={i}>
                          কলাম {i + 1}: {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date Col */}
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                      বিক্রির তারিখ কলাম <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={stagedImport.userMapping.dateCol}
                      onChange={(e) => handleUpdateMapping('dateCol', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    >
                      {(stagedImport.parseResult.rawHeaders || []).map((h, i) => (
                        <option key={`date-${i}`} value={i}>
                          কলাম {i + 1}: {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Royalty Col */}
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                      রয়্যালটি / আর্নিংস কলাম <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={stagedImport.userMapping.royaltyCol}
                      onChange={(e) => handleUpdateMapping('royaltyCol', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    >
                      {(stagedImport.parseResult.rawHeaders || []).map((h, i) => (
                        <option key={`royalty-${i}`} value={i}>
                          কলাম {i + 1}: {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* License Col */}
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                      লাইসেন্স কলাম (ঐচ্ছিক)
                    </label>
                    <select
                      value={stagedImport.userMapping.licenseCol}
                      onChange={(e) => handleUpdateMapping('licenseCol', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value={-1}>অনুপস্থিত (Unknown লাইসেন্স)</option>
                      {(stagedImport.parseResult.rawHeaders || []).map((h, i) => (
                        <option key={`lic-${i}`} value={i}>
                          কলাম {i + 1}: {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Title Col */}
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                      টাইটেল কলাম (ঐচ্ছিক)
                    </label>
                    <select
                      value={stagedImport.userMapping.titleCol}
                      onChange={(e) => handleUpdateMapping('titleCol', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value={-1}>অনুপস্থিত (কোনো টাইটেল নেই)</option>
                      {(stagedImport.parseResult.rawHeaders || []).map((h, i) => (
                        <option key={`title-${i}`} value={i}>
                          কলাম {i + 1}: {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Header Row Toggle */}
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                      প্রথম সারিতে কলাম হেডার আছে?
                    </label>
                    <select
                      value={stagedImport.userMapping.hasHeaderRow ? 'true' : 'false'}
                      onChange={(e) =>
                        handleUpdateMapping('hasHeaderRow', e.target.value === 'true')
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="true">হ্যাঁ (প্রথম সারি হেডার, বিক্রি নয়)</option>
                      <option value="false">না (প্রথম সারি থেকেই বিক্রি শুরু)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sample Rows Preview Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-zinc-200 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    নমুনা ৫টি বিক্রয় রেকর্ডের প্রিভিউ (Live Preview)
                  </h4>
                  <span className="text-[11px] text-zinc-400">
                    ম্যাপিং অনুযায়ী পার্স করা ডেটা
                  </span>
                </div>

                <div className="border border-zinc-800 rounded-xl overflow-x-auto bg-zinc-950/50">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-900/80 border-b border-zinc-800 text-[11px] text-zinc-400">
                      <tr>
                        <th className="py-2 px-3 font-medium">সারি</th>
                        <th className="py-2 px-3 font-medium">বিক্রির তারিখ</th>
                        <th className="py-2 px-3 font-medium">Asset ID</th>
                        <th className="py-2 px-3 font-medium">লাইসেন্স</th>
                        <th className="py-2 px-3 font-medium text-right">রয়্যালটি</th>
                        <th className="py-2 px-3 font-medium">টাইটেল</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-mono">
                      {stagedImport.parseResult.records.length > 0 ? (
                        stagedImport.parseResult.records.slice(0, 5).map((rec, i) => (
                          <tr key={`prev-${i}`} className="hover:bg-zinc-800/30">
                            <td className="py-2 px-3 text-zinc-500 text-[11px]">#{rec.rawRowNumber}</td>
                            <td className="py-2 px-3 text-zinc-300">{rec.saleDate}</td>
                            <td className="py-2 px-3 font-semibold text-zinc-100">#{rec.assetId}</td>
                            <td className="py-2 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-sans ${
                                  rec.license === 'Unknown'
                                    ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                    : 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/50'
                                }`}
                              >
                                {rec.license}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-400">
                              ${rec.royalty.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 font-sans text-zinc-400 truncate max-w-xs">
                              {rec.title || <span className="text-zinc-600">—</span>}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-zinc-500 font-sans">
                            নির্বাচিত ম্যাপিং অনুযায়ী কোনো বৈধ বিক্রয় রেকর্ড পাওয়া যায়নি। কলাম নির্বাচন পরিবর্তন করুন।
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Warnings List */}
              {stagedImport.parseResult.warnings.length > 0 && (
                <div className="p-3 rounded-lg bg-zinc-950/40 border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1">
                  <div className="font-semibold text-zinc-300">অডিট নোট:</div>
                  {stagedImport.parseResult.warnings.slice(0, 3).map((w, idx) => (
                    <div key={`warn-${idx}`}>• {w}</div>
                  ))}
                  {stagedImport.parseResult.warnings.length > 3 && (
                    <div>+ আরও {stagedImport.parseResult.warnings.length - 3}টি ফিল্টার নোট</div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-6 py-3.5 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleCancelImport}
                disabled={isProcessingFile}
                className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs sm:text-sm font-medium transition-colors"
              >
                বাতিল করুন
              </button>

              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isProcessingFile || stagedImport.parseResult.validRows === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none active:scale-95 text-white text-xs sm:text-sm font-medium transition-all shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isProcessingFile
                    ? 'সংরক্ষণ করা হচ্ছে...'
                    : `ইমপোর্ট নিশ্চিত করুন (${stagedImport.parseResult.validRows}টি বিক্রয়)`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

