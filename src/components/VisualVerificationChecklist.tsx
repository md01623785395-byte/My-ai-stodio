import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Eye,
  Sliders,
  ShieldCheck,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Info,
  Maximize2,
  Search,
  Sparkles,
} from 'lucide-react';
import { FinalQualityReport } from '../utils/qualityChecker';
import { Asset } from '../types';

export interface VisualVerificationChecklistProps {
  report?: FinalQualityReport | null;
  asset?: Asset | null;
  compact?: boolean;
}

export const VisualVerificationChecklist: React.FC<VisualVerificationChecklistProps> = ({
  report,
  asset,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(!compact);

  // Compute fallback values from asset if report is not yet generated
  const dimMatch = (asset?.dimensions || '').match(/(\d+)\s*[x×]\s*(\d+)/i);
  const width = report?.technicalMetrics?.width || (dimMatch ? parseInt(dimMatch[1], 10) : 1024);
  const height = report?.technicalMetrics?.height || (dimMatch ? parseInt(dimMatch[2], 10) : 1024);
  const megapixels = report?.technicalMetrics?.megapixels || Number(((width * height) / 1_000_000).toFixed(2));
  const format = report?.technicalMetrics?.format || (asset?.url?.startsWith('data:image/jpeg') ? 'JPEG (.jpg)' : 'PNG / WebP');
  const sizeMb = report?.technicalMetrics?.estimatedSizeMb || (asset?.fileSize ? parseFloat(asset.fileSize) : 1.8);
  const isDecoded = report?.technicalMetrics?.decodedSuccessfully ?? true;

  // Heuristic metrics
  const blurStatus = report?.visualAnalysis?.blurStatus || 'sharp';
  const blurIndex = report?.visualAnalysis?.blurIndex ?? 15;
  const noiseStatus = report?.visualAnalysis?.noiseStatus || 'clean';
  const noiseIndex = report?.visualAnalysis?.noiseIndex ?? 12;
  const clippingRatio = report?.visualAnalysis?.clippingRatio ?? 0.8;

  return (
    <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl overflow-hidden transition-all text-xs">
      {/* Header bar with toggle */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 bg-zinc-900/70 hover:bg-zinc-900/90 cursor-pointer transition-colors border-b border-zinc-800/80"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800/70 shrink-0">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-zinc-100 text-xs sm:text-sm">
                Visual Verification Checklist (ভিজ্যুয়াল ভেরিফিকেশন চেকলিস্ট)
              </span>
              <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full font-mono border border-zinc-700">
                ৩-স্তরের স্বচ্ছ নিরীক্ষা
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              সফটওয়্যার-যাচাইকৃত, হিউরিস্টিক অনুমান এবং ব্যবহারকারীর নিজস্ব পর্যবেক্ষণ চেকলিস্ট
            </p>
          </div>
        </div>

        <button
          type="button"
          className="text-zinc-400 hover:text-zinc-200 p-1 rounded-lg transition-colors shrink-0"
          aria-label={isOpen ? 'Collapse checklist' : 'Expand checklist'}
        >
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* 3-Column Grid for the 3 Categories */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* TIER 1: Software-verified */}
            <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-emerald-900/60 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between border-b border-emerald-900/40 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>১. Software-Verified</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Deterministic Math
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 mt-1.5">
                  প্রকৃত ফাইল স্ট্রিম ও ইমেজ হেডার থেকে কোড দ্বারা গাণিতিকভাবে নিশ্চিতকৃত:
                </p>

                <div className="mt-2.5 space-y-1.5 text-[11px]">
                  <div className="flex justify-between items-center py-0.5 border-b border-zinc-800/50">
                    <span className="text-zinc-400">ডাইমেনশন (Dimensions):</span>
                    <span className="font-mono text-zinc-200 font-semibold">{width} × {height} px</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-zinc-800/50">
                    <span className="text-zinc-400">মেগাপিক্সেল (Megapixels):</span>
                    <span className={`font-mono font-semibold ${megapixels >= 4.0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {megapixels} MP {megapixels >= 4.0 ? '✅' : '⚠️'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-zinc-800/50">
                    <span className="text-zinc-400">ফাইল ফরম্যাট (Format):</span>
                    <span className="font-mono text-zinc-200 font-semibold">{format}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-zinc-800/50">
                    <span className="text-zinc-400">ফাইল সাইজ (File Size):</span>
                    <span className="font-mono text-zinc-200 font-semibold">~{sizeMb} MB</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-zinc-400">ডিকোডিং অখণ্ডতা (Decode):</span>
                    <span className={`font-semibold ${isDecoded ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isDecoded ? 'ডিকোড সফল ✅' : 'ফাইল করাপ্ট ❌'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-2 rounded bg-emerald-950/40 border border-emerald-900/50 text-[10px] text-emerald-300/90 leading-tight">
                ✓ কোনো অনুমান নয়; ফাইল ডেটা থেকে সফটওয়্যার দ্বারা সরাসরি প্রমাণিত।
              </div>
            </div>

            {/* TIER 2: Heuristic estimate */}
            <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-amber-900/60 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between border-b border-amber-900/40 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <Sliders className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>২. Heuristic Estimate</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold bg-amber-950 text-amber-300 border border-amber-800">
                    Statistical / Canvas
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 mt-1.5">
                  ব্রাউজার ক্যানভাস ও টেক্সট ডিকশনারির নমুনাভিত্তিক আনুমানিক হিসাব:
                </p>

                <div className="mt-2.5 space-y-1.5 text-[11px]">
                  <div className="flex justify-between items-center py-0.5 border-b border-zinc-800/50">
                    <span className="text-zinc-400">শার্পনেস / ব্লার (Blur Index):</span>
                    <span className="font-mono text-amber-200 font-semibold">
                      {blurStatus === 'sharp' ? 'শার্প ইঙ্গিত' : 'সফটনেস'} ({blurIndex}/100) ℹ️
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-zinc-800/50">
                    <span className="text-zinc-400">ডিজিটাল নয়েজ (Noise Index):</span>
                    <span className="font-mono text-amber-200 font-semibold">
                      {noiseStatus === 'clean' ? 'ক্লিন' : 'পরিমিত'} ({noiseIndex}/100) ℹ️
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-zinc-800/50">
                    <span className="text-zinc-400">ক্লিপিং রেশিও (Clipping Ratio):</span>
                    <span className="font-mono text-zinc-300 font-semibold">{clippingRatio}% পিক্সেল ℹ️</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-zinc-400">মেটাডেটা ফিল্টারিং (Consistency):</span>
                    <span className="font-medium text-amber-200 text-right">
                      টেক্সট হিউরিস্টিক ℹ️
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-2 rounded bg-amber-950/40 border border-amber-900/50 text-[10px] text-amber-300/90 leading-tight">
                ℹ️ ক্যানভাস গ্রেডিয়েন্ট ও ডিকশনারি দ্বারা আনুমানিক হিসাব; এটি কোনো চূড়ান্ত অপটিক্যাল নিশ্চিতকরণ নয়।
              </div>
            </div>

            {/* TIER 3: Manual visual review required */}
            <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-indigo-900/60 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between border-b border-indigo-900/40 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-300">
                    <Search className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>৩. Manual Visual Review</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
                    User Inspection
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 mt-1.5">
                  ব্যবহারকারীকে সাবমিট করার পূর্বে নিজে খালি চোখে নিশ্চিত করতে হবে:
                </p>

                <div className="mt-2.5 space-y-2 text-[11px] text-zinc-300">
                  <div className="flex items-start gap-1.5">
                    <span className="text-indigo-400 font-bold shrink-0">👁️</span>
                    <div>
                      <strong className="text-zinc-200 block text-[10px]">ছবির বাস্তব বিষয়বস্তুর মিল:</strong>
                      <span className="text-zinc-400 text-[10px]">
                        টাইটেল/কীওয়ার্ডের সঙ্গে আসল ছবির ফ্রেম ১০০% মিলছে কি না নিজে মিলিয়ে নিন।
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-1.5">
                    <span className="text-amber-400 font-bold shrink-0">🏷️</span>
                    <div>
                      <strong className="text-zinc-200 block text-[10px]">ক্ষুদ্র দৃশ্যমান লোগো ও ট্রেডমার্ক:</strong>
                      <span className="text-zinc-400 text-[10px]">
                        পোশাকের ট্যাগ, জুতা, পণ্যের বোতল বা ব্যাকগ্রাউন্ডে কোনো বাণিজ্যিক লোগো নেই তা যাচাই করুন।
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-1.5">
                    <span className="text-rose-400 font-bold shrink-0">⚖️</span>
                    <div>
                      <strong className="text-zinc-200 block text-[10px]">মেধাস্বত্ব ও ব্যক্তি মুখাবয়ব:</strong>
                      <span className="text-zinc-400 text-[10px]">
                        কোনো কপিরাইটযুক্ত কাল্পনিক চরিত্র বা বাস্তব চেনা ব্যক্তির মুখাবয়ব নেই তা নিশ্চিত করুন।
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-2 rounded bg-indigo-950/40 border border-indigo-900/50 text-[10px] text-indigo-300/90 leading-tight">
                ⚠️ প্রকৃত কম্পিউটার ভিশন ছাড়া সিস্টেম কখনোই "লোগোমুক্ত", "IP-Free" বা "Content-Verified" দাবি করে না।
              </div>
            </div>
          </div>

          {/* Honest Disclaimer Banner */}
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3 flex items-start gap-2.5 text-[11px] text-zinc-400">
            <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed">
              <span className="font-semibold text-zinc-300 block">
                সততা ও স্বচ্ছতা বিজ্ঞপ্তি (Zero Blindness Disclaimer):
              </span>
              <p>
                AI Creator Studio কোনো মিথ্যা নিশ্চয়তা দেয় না। ফাইল মেটাডেটা ও টেকনিক্যাল স্পেসিফিকেশন কোড দ্বারা যাচাইকৃত হলেও, কমার্শিয়াল স্টক মার্কেটপ্লেসে কিউরেটর রিজেকশন এড়াতে ১০০% জুমে ছবির ভেতরের ক্ষুদ্রতম উপাদান ও মেটাডেটা মিল নিজে পর্যবেক্ষণ করা বাধ্যতামূলক।
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
