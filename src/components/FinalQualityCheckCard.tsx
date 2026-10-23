import React, { useState, useEffect } from 'react';
import { Asset, StockMarketplaceId } from '../types';
import {
  runFinalQualityCheck,
  FinalQualityReport,
  QualityCheckDetail,
} from '../utils/qualityChecker';
import { VisualVerificationChecklist } from './VisualVerificationChecklist';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Maximize2,
  FileText,
  Info,
  ChevronDown,
  ChevronUp,
  Sliders,
  ExternalLink,
  Eye,
  Check,
} from 'lucide-react';

interface FinalQualityCheckCardProps {
  asset: Asset;
  marketplaceId: StockMarketplaceId;
  onTriggerUpscale?: (factor: 2 | 4) => void;
  onTriggerConvertJpeg?: () => void;
  onReportGenerated?: (report: FinalQualityReport) => void;
}

export const FinalQualityCheckCard: React.FC<FinalQualityCheckCardProps> = ({
  asset,
  marketplaceId,
  onTriggerUpscale,
  onTriggerConvertJpeg,
  onReportGenerated,
}) => {
  const [report, setReport] = useState<FinalQualityReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [expanded, setExpanded] = useState<boolean>(true);
  const [filterTab, setFilterTab] = useState<'all' | 'failed' | 'warning' | 'passed'>('all');

  const executeCheck = async () => {
    setLoading(true);
    try {
      const res = await runFinalQualityCheck(asset, marketplaceId);
      setReport(res);
      onReportGenerated?.(res);
    } catch (err) {
      console.error('Final Quality Check error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeCheck();
  }, [asset.id, asset.url, asset.dimensions, marketplaceId]);

  if (loading && !report) {
    return (
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 text-center space-y-3">
        <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mx-auto" />
        <p className="text-xs font-semibold text-zinc-200">
          চূড়ান্ত কোয়ালিটি নিরীক্ষা (Final Quality Check) পরিচালিত হচ্ছে...
        </p>
        <p className="text-[11px] text-zinc-400">
          প্রকৃত রেজোলিউশন, ফরম্যাট, ক্যানভাস শার্পনেস, নয়েজ, ট্রেডমার্ক ও {marketplaceId.toUpperCase()} নিয়ম বিশ্লেষণ করা হচ্ছে
        </p>
      </div>
    );
  }

  if (!report) return null;

  const filteredChecks = report.checks.filter((c) => {
    if (filterTab === 'all') return true;
    return c.status === filterTab;
  });

  const failedCount = report.checks.filter((c) => c.status === 'failed').length;
  const warningCount = report.checks.filter((c) => c.status === 'warning').length;
  const passedCount = report.checks.filter((c) => c.status === 'passed').length;

  return (
    <div
      className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
        report.overallStatusColor === 'rose'
          ? 'bg-rose-950/20 border-rose-800/60'
          : report.overallStatusColor === 'amber'
          ? 'bg-amber-950/20 border-amber-800/60'
          : 'bg-zinc-900/70 border-emerald-800/60'
      }`}
    >
      {/* Header Bar */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80">
        <div className="flex items-start sm:items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              report.overallStatusColor === 'rose'
                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                : report.overallStatusColor === 'amber'
                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
            }`}
          >
            {report.overallStatusColor === 'rose' ? (
              <ShieldAlert className="w-5 h-5" />
            ) : report.overallStatusColor === 'amber' ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <ShieldCheck className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                <span>Final Quality Check (চূড়ান্ত কোয়ালিটি নিরীক্ষা)</span>
              </h3>

              {/* Exact Tier Badge (শর্ত ৫) */}
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 border ${
                  report.overallStatusColor === 'rose'
                    ? 'bg-rose-950 text-rose-300 border-rose-800'
                    : report.overallStatusColor === 'amber'
                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                }`}
              >
                {report.overallStatusColor === 'rose' ? (
                  <AlertCircle className="w-3.5 h-3.5" />
                ) : report.overallStatusColor === 'amber' ? (
                  <AlertTriangle className="w-3.5 h-3.5" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>{report.overallStatus}</span>
              </span>
            </div>

            <p className="text-[11px] text-zinc-400 mt-0.5">
              টার্গেট: <strong className="text-zinc-200">{report.marketplaceCompliance.marketplaceName}</strong> ·{' '}
              {report.timestamp}
            </p>
          </div>
        </div>

        {/* Top Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={executeCheck}
            disabled={loading}
            className="flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1.5 rounded-lg border border-zinc-700 transition-colors"
            title="পুনরায় পরীক্ষা করুন"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>পুনরায় চেক</span>
          </button>

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 bg-zinc-800/80 rounded-lg hover:bg-zinc-700"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Body */}
      {expanded && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Status Headline Banner */}
          <div
            className={`p-3.5 rounded-xl border text-xs leading-relaxed space-y-1.5 ${
              report.overallStatusColor === 'rose'
                ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                : report.overallStatusColor === 'amber'
                ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
            }`}
          >
            <div className="font-bold flex items-center gap-1.5">
              <span>{report.headline}</span>
            </div>
            <p className="text-[11px] opacity-90">{report.summaryNote}</p>
          </div>

          {/* Stock Readiness Assessment (Priority 2.2: Requirement 6) */}
          {report.stockReadiness && (
            <div
              className={`p-4 rounded-xl border space-y-3 ${
                report.stockReadiness.outcome === 'reject_candidate'
                  ? 'bg-rose-950/30 border-rose-800/70 text-rose-100'
                  : report.stockReadiness.outcome === 'needs_fix'
                  ? 'bg-amber-950/30 border-amber-800/70 text-amber-100'
                  : 'bg-emerald-950/30 border-emerald-800/70 text-emerald-100'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    স্টক প্রস্তুতির ফলাফল (Stock Readiness Assessment):
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 border ${
                      report.stockReadiness.outcome === 'reject_candidate'
                        ? 'bg-rose-950 text-rose-300 border-rose-700'
                        : report.stockReadiness.outcome === 'needs_fix'
                        ? 'bg-amber-950 text-amber-300 border-amber-700'
                        : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    }`}
                  >
                    {report.stockReadiness.outcome === 'reject_candidate' ? (
                      <AlertCircle className="w-3 h-3 text-rose-400" />
                    ) : report.stockReadiness.outcome === 'needs_fix' ? (
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    )}
                    <span>{report.stockReadiness.outcomeLabelBn}</span>
                  </span>
                </div>

                <div className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                  <span>নির্ভরযোগ্যতা:</span>
                  <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 font-medium text-zinc-200">
                    {report.stockReadiness.confidence === 'high'
                      ? 'উচ্চ (Deterministic Math/Spec)'
                      : 'আনুমানিক (Heuristic/Visual)'}
                  </span>
                </div>
              </div>

              {/* Reasons list */}
              {report.stockReadiness.reasonList.length > 0 && (
                <div className="space-y-1 text-xs">
                  <strong className="text-[11px] text-zinc-300 block font-semibold">
                    📋 ফলাফলের কারণ ও মূল্যায়ন (Reasons):
                  </strong>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-zinc-300 pl-1">
                    {report.stockReadiness.reasonList.map((reason, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actionable Fixes (Requirement 6) */}
              {report.stockReadiness.actionableFixes.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <strong className="text-[11px] text-zinc-300 block font-semibold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>প্রয়োজনীয় পদক্ষেপ ও সমাধান (Actionable Fixes):</span>
                  </strong>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {report.stockReadiness.actionableFixes.map((fix) => (
                      <div
                        key={fix.fixId}
                        className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs flex flex-col justify-between gap-2"
                      >
                        <div>
                          <div className="font-bold text-zinc-200 flex items-center justify-between">
                            <span>{fix.titleBn}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                              {fix.actionType}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                            {fix.descriptionBn}
                          </p>
                        </div>

                        {/* Interactive trigger button where applicable */}
                        {fix.actionType === 'upscale_2x' && onTriggerUpscale && (
                          <button
                            onClick={() => onTriggerUpscale(2)}
                            className="w-full flex items-center justify-center gap-1 text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white py-1.5 px-2.5 rounded-md transition-colors"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>২x আপস্কেল প্রয়োগ করুন (আলাদা কপি)</span>
                          </button>
                        )}
                        {fix.actionType === 'upscale_4x' && onTriggerUpscale && (
                          <button
                            onClick={() => onTriggerUpscale(4)}
                            className="w-full flex items-center justify-center gap-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 px-2.5 rounded-md transition-colors"
                          >
                            <Maximize2 className="w-3 h-3" />
                            <span>৪x আল্ট্রা আপস্কেল প্রয়োগ করুন (আলাদা কপি)</span>
                          </button>
                        )}
                        {fix.actionType === 'convert_jpeg' && onTriggerConvertJpeg && (
                          <button
                            onClick={onTriggerConvertJpeg}
                            className="w-full flex items-center justify-center gap-1 text-[11px] font-semibold bg-cyan-700 hover:bg-cyan-600 text-white py-1.5 px-2.5 rounded-md transition-colors"
                          >
                            <FileText className="w-3 h-3" />
                            <span>JPEG (sRGB)-এ কনভার্ট করুন</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Enhancement Assessment Disclosure (Requirements 4 & 5) */}
              {report.stockReadiness.enhancementAssessment && (
                <div className="p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800 text-[11px] space-y-1">
                  <div className="flex items-center justify-between text-zinc-300 font-semibold">
                    <span>এনহ্যান্সমেন্ট মূল্যায়ন (Enhancement Assessment):</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        report.stockReadiness.enhancementAssessment.isAppropriate
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {report.stockReadiness.enhancementAssessment.isAppropriate
                        ? 'এনহ্যান্সমেন্ট উপযুক্ত'
                        : 'এনহ্যান্সমেন্ট অপ্রয়োজনীয়'}
                    </span>
                  </div>
                  <p className="text-zinc-400">
                    {report.stockReadiness.enhancementAssessment.reasonBn}
                  </p>
                  <p className="text-indigo-300/90 font-medium">
                    {report.stockReadiness.enhancementAssessment.originalPreservedNote}
                  </p>
                  <p className="text-[10px] text-zinc-500 italic">
                    {report.stockReadiness.enhancementAssessment.honestDisclaimer}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Special Shutterstock Action Block if Shutterstock selected */}
          {marketplaceId === 'shutterstock' && (
            <div className="bg-rose-950/70 border border-rose-800 rounded-xl p-3 text-xs text-rose-200 flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="text-rose-100 font-bold block">
                  সতর্কতা: Shutterstock বাহ্যিক AI ছবি প্রত্যাখ্যান করে
                </strong>
                <p className="text-[11px] text-rose-300 leading-relaxed">
                  Shutterstock Contributor Guidelines অনুযায়ী শুধুমাত্র তাদের নিজস্ব বিল্ট-ইন জেনারেটর দিয়ে তৈরি ছবি গ্রহণযোগ্য। বাহ্যিক এআই মডেলের ছবি সাবমিট করলে রিভিউয়ার রিজেক্ট করবে এবং একাউন্ট সাসপেনশনের ঝুঁকি থাকবে।
                </p>
              </div>
            </div>
          )}

          {/* 4 Pillars Overview Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            {/* Pillar 1: টেকনিক্যাল স্পেক্স */}
            <div className="bg-zinc-950/70 border border-zinc-800/90 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-1.5">
                <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  <span>১. টেকনিক্যাল স্পেক্স</span>
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                    report.technicalMetrics.megapixels >= 4.0 && report.technicalMetrics.format.includes('JPEG')
                      ? 'text-emerald-400 bg-emerald-950'
                      : 'text-rose-400 bg-rose-950'
                  }`}
                >
                  {report.technicalMetrics.megapixels >= 4.0 && report.technicalMetrics.format.includes('JPEG')
                    ? 'উত্তীর্ণ'
                    : 'অপূর্ণ'}
                </span>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-zinc-500">রেজোলিউশন:</span>
                  <span className="font-mono text-zinc-200 font-medium">
                    {report.technicalMetrics.pixelDimensions}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">মেগাপিক্সেল:</span>
                  <span
                    className={`font-mono font-medium ${
                      report.technicalMetrics.megapixels >= 4.0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {report.technicalMetrics.megapixels} MP
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">ফরম্যাট:</span>
                  <span
                    className={`font-medium ${
                      report.technicalMetrics.format.includes('JPEG') ? 'text-zinc-200' : 'text-amber-400'
                    }`}
                  >
                    {report.technicalMetrics.format}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">সাইজ:</span>
                  <span className="font-mono text-zinc-200">
                    {report.technicalMetrics.estimatedSizeMb} MB (&lt; ৪৫ MB)
                  </span>
                </div>
              </div>
            </div>

            {/* Pillar 2: ভিজ্যুয়াল কোয়ালিটি (প্রাথমিক ইঙ্গিত) */}
            <div className="bg-zinc-950/70 border border-zinc-800/90 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-1.5">
                <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>২. ভিজ্যুয়াল কোয়ালিটি</span>
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold text-cyan-300 bg-cyan-950/80 border border-cyan-800/50">
                  প্রাথমিক ইঙ্গিত
                </span>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-zinc-500">ফোকাস/শার্পনেস:</span>
                  <span
                    className={`font-medium ${
                      report.visualAnalysis.blurStatus === 'sharp' ? 'text-emerald-400' : 'text-amber-300'
                    }`}
                  >
                    {report.visualAnalysis.blurStatus === 'sharp' ? 'তীব্র ফোকাস ইঙ্গিত ✅' : 'সফটনেস ইঙ্গিত (প্রাথমিক) ⚠️'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">ডিজিটাল নয়েজ:</span>
                  <span
                    className={`font-medium ${
                      report.visualAnalysis.noiseStatus === 'clean' ? 'text-emerald-400' : 'text-amber-300'
                    }`}
                  >
                    {report.visualAnalysis.noiseStatus === 'clean' ? 'ক্লিন টেক্সচার ইঙ্গিত' : 'নয়েজ নিরীক্ষা ইঙ্গিত (প্রাথমিক)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">আর্টিফ্যাক্ট:</span>
                  <span className="text-zinc-200">
                    {report.visualAnalysis.artifactStatus === 'low' ? 'ন্যূনতম' : 'পরিমিত'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">AI অ্যানাটমি ঝুঁকি:</span>
                  <span
                    className={`font-semibold ${
                      report.visualAnalysis.aiDistortionRisk === 'high'
                        ? 'text-rose-400'
                        : report.visualAnalysis.aiDistortionRisk === 'medium'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {report.visualAnalysis.aiDistortionRisk === 'high'
                      ? 'উচ্চ ঝুঁকি ⚠️'
                      : report.visualAnalysis.aiDistortionRisk === 'medium'
                      ? 'মাঝারি'
                      : 'কম ঝুঁকি'}
                  </span>
                </div>
              </div>
            </div>

            {/* Pillar 3: আইনি ও বাণিজ্যিক ঝুঁকি */}
            <div className="bg-zinc-950/70 border border-zinc-800/90 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-1.5">
                <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>৩. আইনি ও কপিরাইট</span>
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold text-amber-300 bg-amber-950/80 border border-amber-800/60">
                  ম্যানুয়াল যাচাই প্রয়োজন
                </span>
              </div>

              <div className="space-y-1 text-[11px]">
                {/* 1. Prompt/metadata brand mention */}
                <div className="flex justify-between items-start gap-1">
                  <span className="text-zinc-500 shrink-0">প্রম্পট ব্র্যান্ড উল্লেখ:</span>
                  <span
                    className={`font-medium text-right ${
                      report.legalRisk.promptBrandDetected ? 'text-amber-300 font-semibold' : 'text-emerald-400'
                    }`}
                  >
                    {report.legalRisk.promptBrandDetected
                      ? `উল্লেখ: [${report.legalRisk.promptBrandDetails.join(', ')}] ⚠️`
                      : 'কোনো উল্লেখ নেই ✅'}
                  </span>
                </div>

                {/* 2. Image visual logo check */}
                <div className="flex justify-between items-start gap-1">
                  <span className="text-zinc-500 shrink-0">ছবির দৃশ্যমান লোগো:</span>
                  <span className="font-medium text-right text-amber-300">
                    ছবির লোগো ম্যানুয়ালি যাচাই করুন ⚠️
                  </span>
                </div>

                {/* 3. Human presence */}
                <div className="flex justify-between">
                  <span className="text-zinc-500">মানুষের উপস্থিতি:</span>
                  <span
                    className={`font-medium ${
                      report.legalRisk.humanDetected ? 'text-amber-400' : 'text-zinc-300'
                    }`}
                  >
                    {report.legalRisk.humanDetected ? 'মডেল রিলিজ বিবেচ্য' : 'মানুষ নেই'}
                  </span>
                </div>

                {/* 4. AI Labeling */}
                <div className="flex justify-between">
                  <span className="text-zinc-500">এআই লেবেলিং:</span>
                  <span className="text-indigo-400 font-semibold">বাধ্যতামূলক</span>
                </div>
              </div>
            </div>

            {/* Pillar 4: মার্কেটপ্লেস স্পেসিফিক রুলস */}
            <div className="bg-zinc-950/70 border border-zinc-800/90 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-1.5">
                <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>৪. {report.marketplaceCompliance.marketplaceName}</span>
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                    report.marketplaceCompliance.aiPermitted
                      ? 'text-emerald-400 bg-emerald-950'
                      : 'text-rose-400 bg-rose-950'
                  }`}
                >
                  {report.marketplaceCompliance.aiPermitted ? 'AI অনুমোদিত' : 'AI নিষিদ্ধ'}
                </span>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-zinc-500">ন্যূনতম MP:</span>
                  <span className="font-mono text-zinc-200">
                    {report.marketplaceCompliance.minMegapixelsRequired} MP
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">ফরম্যাট গ্রহণযোগ্যতা:</span>
                  <span
                    className={`font-medium ${
                      report.marketplaceCompliance.formatAccepted ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {report.marketplaceCompliance.formatAccepted ? 'JPEG গৃহীত' : 'রূপান্তর আবশ্যক'}
                  </span>
                </div>
                <div className="pt-1 text-[10px] text-zinc-400 leading-tight">
                  <strong className="text-zinc-300 block">বিশেষ শর্ত:</strong>
                  {report.marketplaceCompliance.specialRequirement}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Fix Action Helpers if conditions failed */}
          {(report.technicalMetrics.megapixels < 4.0 || !report.technicalMetrics.format.includes('JPEG')) && (
            <div className="bg-indigo-950/30 border border-indigo-800/60 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>প্রযুক্তিগত শর্ত পূরণে এক-ক্লিক সমাধান (Quick Fix Actions):</span>
                </span>
                <span className="text-[10px] text-indigo-300">আসল রেজোলিউশন বৃদ্ধি</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {onTriggerUpscale && report.technicalMetrics.megapixels < 4.0 && (
                  <button
                    onClick={() => onTriggerUpscale(2)}
                    className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold py-2 px-3 rounded-lg shadow-sm"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>2x Upscale প্রয়োগ করুন</span>
                  </button>
                )}

                {onTriggerUpscale && (
                  <button
                    onClick={() => onTriggerUpscale(4)}
                    className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold py-2 px-3 rounded-lg shadow-sm"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>4x Ultra Upscale (16+ MP)</span>
                  </button>
                )}

                {onTriggerConvertJpeg && !report.technicalMetrics.format.includes('JPEG') && (
                  <button
                    onClick={onTriggerConvertJpeg}
                    className="flex items-center justify-center gap-1.5 bg-cyan-700 hover:bg-cyan-600 active:scale-95 text-white text-xs font-semibold py-2 px-3 rounded-lg shadow-sm"
                  >
                    <FileText className="w-3 h-3" />
                    <span>Convert to JPEG (sRGB)</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Visual Verification Checklist (Priority 2.7) */}
          <VisualVerificationChecklist report={report} asset={asset} />

          {/* Detailed Itemized Checklist Filter & List */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2">
              <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1">
                <span>বিশ্লেষিত আইটেম তালিকা ({report.checks.length}টি চেক)</span>
              </span>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  onClick={() => setFilterTab('all')}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                    filterTab === 'all'
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  সব ({report.checks.length})
                </button>
                {failedCount > 0 && (
                  <button
                    onClick={() => setFilterTab('failed')}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                      filterTab === 'failed'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'text-rose-400 hover:bg-rose-950/40'
                    }`}
                  >
                    ব্যর্থ ({failedCount})
                  </button>
                )}
                {warningCount > 0 && (
                  <button
                    onClick={() => setFilterTab('warning')}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                      filterTab === 'warning'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'text-amber-400 hover:bg-amber-950/40'
                    }`}
                  >
                    সতর্কতা ({warningCount})
                  </button>
                )}
                <button
                  onClick={() => setFilterTab('passed')}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                    filterTab === 'passed'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'text-emerald-400 hover:bg-emerald-950/40'
                  }`}
                >
                  উত্তীর্ণ ({passedCount})
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {filteredChecks.map((chk) => (
                <div
                  key={chk.id}
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
                    chk.status === 'failed'
                      ? 'bg-rose-950/20 border-rose-800/60 text-rose-200'
                      : chk.status === 'warning'
                      ? 'bg-amber-950/20 border-amber-800/50 text-amber-200'
                      : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-300'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {chk.status === 'failed' ? (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    ) : chk.status === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-bold text-zinc-100">{chk.title}</span>
                      {chk.measuredValue && (
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                          {chk.measuredValue}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-90">{chk.message}</p>
                    {chk.detectionReason && (
                      <div className="bg-zinc-900/90 border border-zinc-800 p-2 rounded-lg text-[11px] text-amber-200/95 space-y-0.5 mt-1.5">
                        <strong className="text-zinc-300 block font-semibold">🔍 শনাক্তকরণের কারণ ও প্রেক্ষাপট:</strong>
                        <p>{chk.detectionReason}</p>
                      </div>
                    )}
                    {chk.recommendedAction && (
                      <p className="text-[10px] font-semibold text-indigo-300 pt-0.5">
                        💡 সুপারিশকৃত পদক্ষেপ: {chk.recommendedAction}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mandatory Strict Disclaimers & Limitations (শর্ত ৫ ও ৬) */}
          <div className="space-y-2 pt-2 border-t border-zinc-800/80">
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 text-[11px] text-zinc-400 leading-relaxed flex items-start gap-2">
              <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-zinc-300 block font-semibold mb-0.5">
                  বাধ্যতামূলক গ্রহণযোগ্যতা ডিসক্লেইমার (No Guarantee Statement):
                </strong>
                <p>{report.disclaimer}</p>
              </div>
            </div>

            <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-xl p-2.5 text-[10px] text-zinc-500 leading-relaxed flex items-start gap-2">
              <span className="text-zinc-400 font-mono shrink-0">ℹ️</span>
              <div>
                <strong className="text-zinc-400 block font-medium">
                  {report.limitationNotice}
                </strong>
                <span className="text-zinc-500">
                  কোনো পেইড API কল করা হয়নি; ক্লায়েন্ট-সাইড ব্রাউজার ক্যানভাস এবং নন-ইনভেসিভ প্যাটার্ন ম্যাচিং দ্বারা স্বয়ংক্রিয়ভাবে সম্পাদিত।
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
