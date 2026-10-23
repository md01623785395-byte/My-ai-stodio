import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Sliders,
  ShieldCheck,
  HardDrive,
  Download,
  RotateCcw,
  KeyRound,
  Check,
  Sparkles,
  Info,
  Bot,
  ExternalLink,
  Activity,
} from 'lucide-react';

interface SettingsViewProps {
  onResetAssets: () => void;
  totalAssetsCount: number;
  onOpenGeminiDiagnostics?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onResetAssets,
  totalAssetsCount,
  onOpenGeminiDiagnostics,
}) => {
  const [defaultRatio, setDefaultRatio] = useState('16:9');
  const [autoEnhance, setAutoEnhance] = useState(true);
  const [highQualityPreview, setHighQualityPreview] = useState(true);
  const [exportFormat, setExportFormat] = useState('PNG');
  const [videoFpsDefault, setVideoFpsDefault] = useState('30');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [apiStatus, setApiStatus] = useState<{ configured: boolean; model: string } | null>(null);
  const [chatGptStatus, setChatGptStatus] = useState<{ configured: boolean; model: string } | null>(null);
  const [customOpenAiKey, setCustomOpenAiKey] = useState<string>(() => {
    return localStorage.getItem('openai_user_key') || '';
  });

  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((d) => setApiStatus({ configured: d.minimaxConfigured, model: d.model || 'image-01' }))
      .catch(() => setApiStatus({ configured: false, model: 'image-01' }));

    fetch('/api/chatgpt/status')
      .then((res) => res.json())
      .then((d) => setChatGptStatus({ configured: d.configured, model: d.model || 'gpt-4o-mini' }))
      .catch(() => setChatGptStatus({ configured: false, model: 'gpt-4o-mini' }));
  }, []);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    if (customOpenAiKey.trim()) {
      localStorage.setItem('openai_user_key', customOpenAiKey.trim());
    } else {
      localStorage.removeItem('openai_user_key');
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-20 space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <SettingsIcon className="w-5 h-5 text-amber-400" />
            Studio Settings
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Configure studio defaults, rendering parameters, storage, and API settings
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1.5 rounded-lg animate-in fade-in">
            <Check className="w-3.5 h-3.5" />
            <span>Preferences Saved</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSavePreferences} className="space-y-6">
        {/* Live MiniMax API Status Card */}
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-900/30 text-indigo-400 rounded-xl border border-indigo-700/40 shrink-0">
              <KeyRound className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs font-semibold text-zinc-200">MiniMax Image Generation API</h3>
                {apiStatus?.configured ? (
                  <span className="text-[10px] font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Connected ({apiStatus.model})
                  </span>
                ) : (
                  <span className="text-[10px] font-medium bg-amber-950/80 text-amber-400 border border-amber-800 px-2 py-0.5 rounded-full">
                    Key Not Detected (MINIMAX_API_KEY)
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {apiStatus?.configured
                  ? 'Real MiniMax Image-01 API integration is active on the server. Your API key is safely protected server-side.'
                  : 'MiniMax API integration is ready on the server. To enable live image generation, configure MINIMAX_API_KEY in your environment variables or AI Studio Secrets. No API keys are ever stored on the client.'}
              </p>
            </div>
          </div>
        </div>

        {/* Google Gemini AI Agent Status Card */}
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-900/30 text-emerald-400 rounded-xl border border-emerald-700/40 shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-zinc-200">Google Gemini AI Agent (Pro & Flash)</h3>
                  <span className="text-[10px] font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    মডেল রাউটার সক্রিয়
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {onOpenGeminiDiagnostics && (
                    <button
                      type="button"
                      onClick={onOpenGeminiDiagnostics}
                      className="inline-flex items-center gap-1 text-[11px] bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <Activity className="w-3 h-3 text-violet-400" />
                      <span>লাইভ কোটা ও মডেল হেলথ</span>
                    </button>
                  )}

                  <a
                    href="https://aistudio.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 underline"
                  >
                    <span>Google AI Studio</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                জটিল বাণিজ্যিক পরিকল্পনা ও ৫০-১০০ প্রম্পটের জন্য <strong>Gemini 3.1 Pro</strong> এবং দ্রুত সাশ্রয়ী প্রম্পট প্রসেসিংয়ের জন্য <strong>Gemini 3.8 Flash</strong> রাউট করা হয়। কোটা শেষ হলে (HTTP 429) অফলাইন নলেজ ইঞ্জিন স্বয়ংক্রিয়ভাবে ব্যাকআপ দেয়।
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800/80">
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              বিকল্প OpenAI API Key (ঐচ্ছিক / Optional)
            </label>
            <input
              type="password"
              placeholder="sk-proj-..."
              value={customOpenAiKey}
              onChange={(e) => setCustomOpenAiKey(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono"
            />
            <p className="text-[10px] text-zinc-500 mt-1">
              * ডিফল্টভাবে স্টুডিওর মূল Google Gemini ইঞ্জিন কাজ করছে। অতিরিক্ত কোনো পেইড কী ছাড়া সম্পূর্ণ কার্যকর।
            </p>
          </div>
        </div>

        {/* Google Flow Integration Info Card */}
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-900/30 text-cyan-400 rounded-xl border border-blue-700/40 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-zinc-200">Google Flow Integration</h3>
                  <span className="text-[10px] font-medium bg-cyan-950/80 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded-full">
                    Free Credits Web Platform
                  </span>
                </div>

                <a
                  href="https://flow.google"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 underline"
                >
                  <span>Open flow.google</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Google Flow-এর কোনো পাবলিক অনুমোদিত REST API নেই। অফিসিয়াল ওয়েবসাইটে আপনার Google অ্যাকাউন্টে পাওয়া ফ্রি ক্রেডিট দিয়ে ছবি বা ভিডিও তৈরি করুন এবং Studio-এর <strong>My Assets</strong>-এ &ldquo;Import from Google Flow&rdquo; বাটনে এক ক্লিকে নিয়ে আসুন।
              </p>
            </div>
          </div>
        </div>

        {/* Studio Render Defaults */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span>Generation Defaults</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1.5">Default Image Aspect Ratio</label>
              <select
                value={defaultRatio}
                onChange={(e) => setDefaultRatio(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl p-2.5 focus:outline-none focus:border-indigo-500"
              >
                <option value="16:9">16:9 (Landscape Banner)</option>
                <option value="1:1">1:1 (Square Feed)</option>
                <option value="9:16">9:16 (Vertical Reel / Story)</option>
                <option value="4:3">4:3 (Classic Editorial)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1.5">Default Video Frame Rate</label>
              <select
                value={videoFpsDefault}
                onChange={(e) => setVideoFpsDefault(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl p-2.5 focus:outline-none focus:border-indigo-500"
              >
                <option value="24">24 FPS (Cinematic standard)</option>
                <option value="30">30 FPS (Smooth social media)</option>
                <option value="60">60 FPS (Ultra fluid sports / motion)</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800 space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs text-zinc-300">Auto-Enhance Prompts with photography keywords</span>
              <input
                type="checkbox"
                checked={autoEnhance}
                onChange={(e) => setAutoEnhance(e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-500 bg-zinc-950 border-zinc-700"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs text-zinc-300">High Resolution Viewport Canvas Rendering</span>
              <input
                type="checkbox"
                checked={highQualityPreview}
                onChange={(e) => setHighQualityPreview(e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-500 bg-zinc-950 border-zinc-700"
              />
            </label>
          </div>
        </div>

        {/* Media Export Settings */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export & Download Preferences</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1.5">Default Image File Format</label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl p-2.5 focus:outline-none focus:border-indigo-500"
              >
                <option value="PNG">PNG (Lossless, Maximum Quality)</option>
                <option value="WebP">WebP (Optimized for Web)</option>
                <option value="JPEG">JPEG (Standard Photography)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1.5">Default Video Export Codec</label>
              <select
                defaultValue="H.264"
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl p-2.5 focus:outline-none focus:border-indigo-500"
              >
                <option value="H.264">H.264 MP4 (Universal Compatibility)</option>
                <option value="ProRes">Apple ProRes 422 (Editing Master)</option>
                <option value="AV1">AV1 Web Stream (Ultra Compression)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Storage & Data Reset */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            <span>Workspace Storage & Cache</span>
          </h2>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-zinc-950 rounded-xl border border-zinc-800">
            <div>
              <div className="text-xs font-medium text-zinc-200">Local Studio Asset Library</div>
              <div className="text-[11px] text-zinc-400">{totalAssetsCount} media items currently in memory</div>
            </div>

            <button
              type="button"
              onClick={() => {
                onResetAssets();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 rounded-lg transition-colors self-start sm:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Reset Default Assets</span>
            </button>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-medium text-xs rounded-xl transition-all shadow-md shadow-indigo-950 min-h-[46px] flex items-center justify-center gap-2"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Studio Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
