import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Download,
  Store,
  Sliders,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  FileCode,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { Asset } from '../types';
import { BatchAuditSummary, BatchItemAuditResult } from '../utils/batchStockAuditor';

interface BatchStockAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: BatchAuditSummary | null;
  onOpenStockPrep?: (asset: Asset) => void;
  onOpenEnhance?: (asset: Asset) => void;
}

export const BatchStockAuditModal: React.FC<BatchStockAuditModalProps> = ({
  isOpen,
  onClose,
  summary,
  onOpenStockPrep,
  onOpenEnhance,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'ready' | 'needs_fix' | 'rejected'>('all');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  if (!isOpen || !summary) return null;

  const filteredItems = summary.items.filter((item) => {
    if (filterTab === 'ready') return item.status === 'Ready';
    if (filterTab === 'needs_fix') return item.status === 'Needs Fix';
    if (filterTab === 'rejected') return item.status === 'Rejected';
    return true;
  });

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(summary, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `stock-submission-readiness-audit-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCsv = () => {
    const headers = [
      'Asset ID',
      'Title',
      'Marketplace',
      'Final Submission Status',
      'Resolution',
      'Format',
      'File Size',
      'Mandatory Rules Status',
      'Recommended Rules Status',
      'Uncertain Rules Count',
      'Human Review Required',
      'Specific Reasons'
    ];

    const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`;

    const rows = summary.items.map((item) => [
      escapeCsv(item.assetId),
      escapeCsv(item.title),
      escapeCsv(item.targetMarketplaceName || 'Adobe Stock'),
      escapeCsv(item.finalStatus || (item.status === 'Ready' ? 'Ready for Manual Review' : item.status)),
      escapeCsv(`${item.megapixels} MP (${item.dimensions})`),
      escapeCsv(item.format),
      escapeCsv(item.fileSize),
      escapeCsv(item.rulesSummary ? `${item.rulesSummary.mandatoryPassed}/${item.rulesSummary.mandatoryTotal} Passed` : 'N/A'),
      escapeCsv(item.rulesSummary ? `${item.rulesSummary.recommendedPassed}/${item.rulesSummary.recommendedTotal} Passed` : 'N/A'),
      escapeCsv(item.rulesSummary ? `${item.rulesSummary.uncertainTotal}` : '0'),
      escapeCsv('Yes (Mandatory)'),
      escapeCsv(item.reasons.join('; ') || 'None (Ready for Human Review)'),
    ].join(','));

    const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock-submission-audit-summary-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Final Stock Submission Readiness Audit</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {summary.totalInspected} Images
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                  {summary.targetMarketplaceName || 'Adobe Stock'}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                বাণিজ্যিক স্টক সাবমিশন শর্তাবলী, মেটাডেটা ভ্যালিডেশন ও মানব পর্যালোচনা নিরীক্ষা রিপোর্ট ({summary.timestamp})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Mandatory Human Review Disclaimer Banner */}
          <div className="bg-amber-950/30 border border-amber-800/50 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-amber-300">
                হিউম্যান রিভিউ বাধ্যতামূলক (Mandatory Human Review Required)
              </h3>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                কোনো স্বয়ংক্রিয় সফটওয়্যার স্টক এজেন্সিতে ১০০% গ্রহণযোগ্যতার নিশ্চয়তা দিতে পারে না। ছবির ভেতরের সূক্ষ্ম অঙ্গবিকৃতি, মাইক্রো-লোগো, দৃশ্যমান ব্যক্তি (মডেল রিলিজ) ও ব্যক্তিগত সম্পত্তি সাবমিশনের পূর্বে নিজ চোখে যাচাই করুন।
              </p>
            </div>
          </div>

          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-zinc-900/50 border border-zinc-800/80 p-3.5 rounded-2xl">
              <span className="text-xs text-zinc-400">মোট নিরীক্ষিত ছবি</span>
              <div className="text-2xl font-bold text-white mt-1 font-mono">{summary.totalInspected}</div>
              <span className="text-[11px] text-zinc-500">100% Non-destructive (0 Credits)</span>
            </div>

            <div className="bg-emerald-950/20 border border-emerald-900/30 p-3.5 rounded-2xl">
              <div className="flex items-center justify-between text-xs text-emerald-400">
                <span>রিভিউয়ের জন্য প্রস্তুত</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">{summary.readyCount}</div>
              <span className="text-[11px] text-emerald-500/80">Ready for Manual Review</span>
            </div>

            <div className="bg-amber-950/20 border border-amber-900/30 p-3.5 rounded-2xl">
              <div className="flex items-center justify-between text-xs text-amber-400">
                <span>সংশোধন প্রয়োজন</span>
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold text-amber-400 mt-1 font-mono">{summary.needsFixCount}</div>
              <span className="text-[11px] text-amber-500/80">Needs Fix (Upscale / Suffix / Meta)</span>
            </div>

            <div className="bg-rose-950/20 border border-rose-900/30 p-3.5 rounded-2xl">
              <div className="flex items-center justify-between text-xs text-rose-400">
                <span>বাতিলযোগ্য</span>
                <XCircle className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold text-rose-400 mt-1 font-mono">{summary.rejectedCount}</div>
              <span className="text-[11px] text-rose-500/80">Rejected (Prohibited AI / Corrupt)</span>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                filterTab === 'all'
                  ? 'bg-zinc-800 text-white font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              All Images ({summary.totalInspected})
            </button>
            <button
              onClick={() => setFilterTab('ready')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                filterTab === 'ready'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-semibold'
                  : 'text-zinc-400 hover:text-emerald-400 hover:bg-zinc-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ready for Review ({summary.readyCount})</span>
            </button>
            <button
              onClick={() => setFilterTab('needs_fix')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                filterTab === 'needs_fix'
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60 font-semibold'
                  : 'text-zinc-400 hover:text-amber-400 hover:bg-zinc-900'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Needs Fix ({summary.needsFixCount})</span>
            </button>
            <button
              onClick={() => setFilterTab('rejected')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                filterTab === 'rejected'
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60 font-semibold'
                  : 'text-zinc-400 hover:text-rose-400 hover:bg-zinc-900'
              }`}
            >
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>Rejected ({summary.rejectedCount})</span>
            </button>
          </div>

          {/* Per-Image Audit List */}
          <div className="space-y-3">
            {filteredItems.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-xs">
                এই ফিল্টারে কোনো ইমেজ পাওয়া যায়নি।
              </div>
            ) : (
              filteredItems.map((item: BatchItemAuditResult) => {
                const isExpanded = expandedItemId === item.assetId;
                const displayFinalStatus = item.finalStatus || (item.status === 'Ready' ? 'Ready for Manual Review' : item.status);
                return (
                  <div
                    key={item.assetId}
                    className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 transition-all hover:border-zinc-700 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Thumbnail & Basics */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-14 h-14 rounded-xl bg-zinc-800 overflow-hidden shrink-0 border border-zinc-700/60 flex items-center justify-center">
                          {item.asset.thumbnailUrl || item.asset.url ? (
                            <img
                              src={item.asset.thumbnailUrl || item.asset.url}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[10px] text-zinc-500 font-mono">No preview</span>
                          )}
                        </div>
                        <div className="min-w-0 space-y-1">
                          <h4 className="text-xs font-semibold text-white truncate max-w-md">
                            {item.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400 font-mono">
                            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                              {item.format}
                            </span>
                            <span>{item.dimensions}</span>
                            <span className="text-zinc-500">•</span>
                            <span
                              className={
                                item.megapixels >= 4.0 ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'
                              }
                            >
                              {item.megapixels} MP
                            </span>
                            <span className="text-zinc-500">•</span>
                            <span>{item.fileSize}</span>
                            {item.rulesSummary && item.rulesSummary.uncertainTotal > 0 && (
                              <>
                                <span className="text-zinc-500">•</span>
                                <span className="text-indigo-400">
                                  {item.rulesSummary.uncertainTotal} Uncertain (Needs Verification)
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Status Badge & Quick Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <span
                          className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                            item.status === 'Ready'
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                              : item.status === 'Needs Fix'
                              ? 'bg-amber-950/80 text-amber-300 border border-amber-700/60'
                              : 'bg-rose-950/80 text-rose-300 border border-rose-700/60'
                          }`}
                        >
                          {item.status === 'Ready' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                          {item.status === 'Needs Fix' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                          {item.status === 'Rejected' && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                          <span>{displayFinalStatus}</span>
                        </span>

                        {onOpenStockPrep && (
                          <button
                            onClick={() => {
                              onClose();
                              onOpenStockPrep(item.asset);
                            }}
                            className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors"
                            title="Open Stock Preparation Modal"
                          >
                            <Store className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="hidden sm:inline">Prepare</span>
                          </button>
                        )}

                        {item.megapixels < 4.0 && onOpenEnhance && (
                          <button
                            onClick={() => {
                              onClose();
                              onOpenEnhance(item.asset);
                            }}
                            className="flex items-center gap-1 bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors border border-indigo-700/50"
                            title="Upscale 2x or 4x to meet 4.0 MP"
                          >
                            <Sliders className="w-3.5 h-3.5 text-cyan-300" />
                            <span className="hidden sm:inline">Upscale</span>
                          </button>
                        )}

                        <button
                          onClick={() => setExpandedItemId(isExpanded ? null : item.assetId)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Specific Reasons Summary */}
                    {item.reasons.length > 0 && (
                      <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-xl p-3 text-xs space-y-1">
                        <span className="font-semibold text-zinc-300">পর্যবেক্ষণ ও নির্দিষ্ট কারণ (Reasons):</span>
                        <ul className="list-disc list-inside text-zinc-400 space-y-0.5">
                          {item.reasons.map((r, idx) => (
                            <li key={idx} className="leading-relaxed">
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Detailed Accordion Breakdown */}
                    {isExpanded && (
                      <div className="pt-2 border-t border-zinc-800/60 space-y-3">
                        {/* Technical & Metadata Rule Checks */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {item.checks.map((c) => (
                            <div
                              key={c.id}
                              className="bg-zinc-950/40 border border-zinc-800/40 rounded-xl p-2.5 flex items-start gap-2"
                            >
                              {c.status === 'passed' && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                              )}
                              {c.status === 'warning' && (
                                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                              )}
                              {c.status === 'failed' && (
                                <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                              )}
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-medium text-zinc-200">{c.label}</span>
                                  {c.enforcementLevel && (
                                    <span
                                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                                        c.enforcementLevel === 'mandatory'
                                          ? 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                                          : c.enforcementLevel === 'recommended'
                                          ? 'bg-indigo-950/60 text-indigo-400 border border-indigo-800/40'
                                          : 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                                      }`}
                                    >
                                      {c.enforcementLevel}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-zinc-400 leading-tight">{c.message}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Human Review Checkpoints Section */}
                        {item.humanReview && (
                          <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 space-y-2">
                            <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                              <Eye className="w-3.5 h-3.5" />
                              <span>বাধ্যতামূলক মানব পর্যালোচনা তালিকা (Human Review Checkpoints):</span>
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                              {item.humanReview.checkpoints.map((cp) => (
                                <div key={cp.id} className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 space-y-0.5">
                                  <span className="font-semibold text-zinc-200">{cp.labelBn}</span>
                                  <p className="text-[10px] text-zinc-400 leading-tight">{cp.descriptionBn}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span>ক্যাশ বা ডেটাবেস অপরিবর্তিত (Zero-Overwrite Safe · 0 Credits)</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Audit CSV</span>
            </button>
            <button
              onClick={handleExportJson}
              className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors"
            >
              <FileCode className="w-3.5 h-3.5 text-indigo-400" />
              <span>Export Audit JSON</span>
            </button>
            <button
              onClick={onClose}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
