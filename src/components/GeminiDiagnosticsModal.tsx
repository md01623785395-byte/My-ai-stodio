import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Server,
  Zap,
  Layers,
  X,
  CreditCard,
  Lock,
} from 'lucide-react';
import { DiagnosticsSummary, ModelHealthInfo } from '../types/aiRouting';

interface GeminiDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GeminiDiagnosticsModal: React.FC<GeminiDiagnosticsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [data, setData] = useState<DiagnosticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDiagnostics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/gemini/diagnostics');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'ডায়াগনস্টিক তথ্য লোড করা যায়নি');
    } finally {
      setLoading(false);
    }
  };

  const handleRunLiveTest = async () => {
    setTesting(true);
    setError(null);
    try {
      const res = await fetch('/api/gemini/diagnostics/run', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'লাইভ পরীক্ষা ব্যর্থ হয়েছে');
    } finally {
      setTesting(false);
    }
  };

  const handleResetCooldown = async () => {
    setResetting(true);
    try {
      const res = await fetch('/api/gemini/reset-cooldown', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchDiagnostics();
    } catch (err: any) {
      setError(err.message || 'কুলডাউন রিসেট ব্যর্থ হয়েছে');
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDiagnostics();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const renderStatusBadge = (status: ModelHealthInfo['status'], httpStatus?: number) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            সচল (HTTP {httpStatus || 200})
          </span>
        );
      case 'quota_exceeded':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            কোটা শেষ (HTTP 429)
          </span>
        );
      case 'high_demand':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            উচ্চ চাপ (HTTP 503)
          </span>
        );
      case 'permission_denied':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <Lock className="w-3.5 h-3.5 text-purple-400" />
            অনুমতি নেই (HTTP {httpStatus || 403})
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
            <Clock className="w-3.5 h-3.5" />
            অনির্ধারিত / টেস্ট হয়নি
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                Gemini AI কোটা ও মডেল হেলথ ডায়াগনস্টিকস
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-normal">
                  Live Quota Protection
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Google Gemini API-এর প্রতিটি মডেলের লাইভ স্ট্যাটাস, কোটা সীমা ও রেসপন্স রেট
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button onClick={fetchDiagnostics} className="underline text-xs ml-4">
                পুনরায় চেষ্টা
              </button>
            </div>
          )}

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-zinc-800/40 border border-zinc-800">
              <div className="text-xs text-zinc-400 mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                API Key স্ট্যাটাস
              </div>
              <div className="text-sm font-semibold text-zinc-200">
                {data?.apiKeyPresent ? (
                  <span className="text-emerald-400">সংযুক্ত ({data.apiKeyMasked})</span>
                ) : (
                  <span className="text-rose-400">অনুপস্থিত</span>
                )}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">কখনো গোপন কি লগ হয় না</div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-800/40 border border-zinc-800">
              <div className="text-xs text-zinc-400 mb-1 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-400" />
                সচল মডেল
              </div>
              <div className="text-2xl font-bold text-emerald-400">
                {data ? data.activeModelsCount : '--'}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">HTTP 200 রেসপন্স প্রাপ্ত</div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-800/40 border border-zinc-800">
              <div className="text-xs text-zinc-400 mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                কোটা সীমাবদ্ধ (429)
              </div>
              <div className="text-2xl font-bold text-amber-400">
                {data ? data.quotaExceededCount : '--'}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">ফ্রি লিমিট অতিক্রম বা ০ লিমিট</div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-800/40 border border-zinc-800">
              <div className="text-xs text-zinc-400 mb-1 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-sky-400" />
                উচ্চ ট্রাফিকের চাপ (503)
              </div>
              <div className="text-2xl font-bold text-sky-400">
                {data ? data.highDemandCount : '--'}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">স্বয়ংক্রিয় ব্যাকঅফ কুলডাউন</div>
            </div>
          </div>

          {/* AI Quota Recommendation Card */}
          {data && (
            <div className="p-4 rounded-xl bg-violet-950/30 border border-violet-800/40 text-violet-200">
              <div className="flex items-start gap-3">
                <Server className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-sm font-medium text-violet-300">
                    সিস্টেম ডায়াগনস্টিক রিপোর্ট ও করণীয়
                  </div>
                  <p className="text-xs text-violet-300/80 leading-relaxed">
                    {data.recommendationBn}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Models Table */}
          <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/60">
            <div className="px-4 py-3 bg-zinc-800/60 border-b border-zinc-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                মডেল রেজিস্ট্রি ও কোটা অবস্থা
              </span>
              <span className="text-xs text-zinc-400">
                সর্বশেষ হালনাগাদ: {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : '--'}
              </span>
            </div>

            <div className="divide-y divide-zinc-800/80">
              {data?.models?.map((model) => (
                <div
                  key={model.modelId}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-zinc-800/20 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-200">{model.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                        {model.modelId}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                          model.tier === 'Free Tier'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}
                      >
                        {model.tier}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-3">
                      <span>ভূমিকা: {model.role}</span>
                      {model.lastLatencyMs && (
                        <span className="text-emerald-400">লেভেল ল্যাটেন্সি: {model.lastLatencyMs}ms</span>
                      )}
                      {model.quotaLimit && (
                        <span className="text-zinc-500">সীমা: {model.quotaLimit}</span>
                      )}
                    </div>
                    {model.lastError && (
                      <div className="text-xs text-rose-400/90 bg-rose-500/5 px-2 py-1 rounded border border-rose-500/20 mt-1">
                        ত্রুটি: {model.lastError}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {model.cooldownRemainingSeconds > 0 && (
                      <span className="text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                        কুলডাউন: {model.cooldownRemainingSeconds}s
                      </span>
                    )}
                    {renderStatusBadge(model.status, model.httpStatus)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Offline Protection Notice */}
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/30 text-emerald-300">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-semibold block text-emerald-200">
                  অফলাইন মোড ও লোকাল ডেটা সুরক্ষা নিশ্চয়তা:
                </span>
                <p className="text-emerald-300/80 leading-relaxed">
                  API কোটা সম্পূর্ণ শেষ হলেও আপনার কাজের ক্ষতি হবে না। ব্যাচ প্রম্পট প্ল্যানারের
                  (Batch Prompt Planner) বৈচিত্র্যময় ৫০/১০০ প্রম্পট তৈরি, স্টক কিওয়ার্ড জেনারেটর,
                  CSV এবং JSON এক্সপোর্ট এবং সংরক্ষিত অ্যাসেট ব্রাউজিং সম্পূর্ণ লোকাল ইঞ্জিনের মাধ্যমে
                  ১০০% সচল ও কার্যকর থাকবে।
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunLiveTest}
              disabled={testing || loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-all shadow-lg shadow-violet-600/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              {testing ? 'মডেল যাচাই চলছে...' : 'লাইভ ডায়াগনস্টিক টেস্ট চালান'}
            </button>

            <button
              onClick={handleResetCooldown}
              disabled={resetting || loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <Clock className="w-3.5 h-3.5" />
              {resetting ? 'রিসেট হচ্ছে...' : 'কুলডাউন রিসেট'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://aistudio.google.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Google AI Studio বিলিং ও কোটা পেজ
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
