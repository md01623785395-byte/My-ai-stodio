import React, { useState } from 'react';
import { StudioTab, Asset, AspectRatioType } from '../types';
import { useDevice } from '../hooks/useDevice';
import {
  Sparkles,
  Image as ImageIcon,
  Video,
  FolderHeart,
  Megaphone,
  Settings as SettingsIcon,
  Play,
  ArrowRight,
  Zap,
  TrendingUp,
  Clock,
  Layers,
  Wand2,
  Copy,
  Heart,
  CheckCircle2,
  Sliders,
  Cpu,
} from 'lucide-react';
import { PRESET_IMAGE_PROMPTS } from '../data/mockAssets';
import {
  createAutonomousTask,
  loadAutonomousTasks,
  saveAutonomousTasks,
} from '../utils/autonomousQueueManager';

interface DashboardViewProps {
  onNavigate: (tab: StudioTab) => void;
  assets: Asset[];
  onSelectAsset: (asset: Asset) => void;
  onToggleFavorite: (id: string) => void;
  onQuickGenerate: (prompt: string, type: 'image' | 'video', aspectRatio: AspectRatioType) => void;
  isGenerating: boolean;
  generationProgress: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  assets,
  onSelectAsset,
  onToggleFavorite,
  onQuickGenerate,
  isGenerating,
  generationProgress,
}) => {
  const [quickPrompt, setQuickPrompt] = useState('');
  const [quickType, setQuickType] = useState<'image' | 'video'>('image');
  const [quickRatio, setQuickRatio] = useState<AspectRatioType>('16:9');
  const [recentFilter, setRecentFilter] = useState<'all' | 'image' | 'video' | 'marketing'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleLaunchAgentFromDashboard = () => {
    if (!quickPrompt.trim()) return;
    const currentTasks = loadAutonomousTasks();
    const newTask = createAutonomousTask({
      prompt: quickPrompt.trim(),
      type: quickType,
      aspectRatio: quickRatio,
      style: 'Photorealistic',
      targetMarketplace: 'adobe-stock',
      autoEnhance: true,
    });
    saveAutonomousTasks([newTask, ...currentTasks]);
    onNavigate('autonomous-pipeline');
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPrompt.trim()) return;
    onQuickGenerate(quickPrompt.trim(), quickType, quickRatio);
  };

  const handleUsePreset = (preset: string) => {
    setQuickPrompt(preset);
  };

  const handleCopyPrompt = (e: React.MouseEvent, id: string, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const filteredAssets = assets.filter((asset) => {
    if (recentFilter === 'all') return true;
    return asset.type === recentFilter;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-20">
      {/* Studio Banner & Welcome */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-indigo-950/40 border border-zinc-800 p-6 sm:p-8">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 w-56 h-56 bg-cyan-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-700/60 text-xs font-medium text-indigo-300 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI Creator Studio · Core Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight">
            Design next-generation visuals & cinematic videos
          </h1>
          <p className="mt-2 text-sm sm:text-base text-zinc-400 leading-relaxed">
            Generate high-resolution images, cinematic motion clips, and marketing campaigns in one unified studio. No external API configuration required to explore.
          </p>
        </div>

        {/* Action Navigation Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mt-6 pt-6 border-t border-zinc-800/80">
          {/* Button -1: Autonomous AI Pipeline */}
          <button
            onClick={() => onNavigate('autonomous-pipeline')}
            className="flex flex-col items-start p-3.5 bg-gradient-to-br from-indigo-900/80 via-indigo-950 to-zinc-900 hover:from-indigo-800/90 hover:to-zinc-800 border border-indigo-500/60 hover:border-indigo-400 rounded-xl transition-all group text-left shadow-md shadow-indigo-950/40 relative overflow-hidden"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-500/30 text-indigo-200 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform ring-1 ring-indigo-400/40">
              <Cpu className="w-4 h-4 text-cyan-300 animate-pulse" />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-cyan-300 flex items-center gap-1">
              স্বয়ংক্রিয় পাইপলাইন
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400" />
            </span>
            <span className="text-[10px] text-cyan-300/90 mt-0.5 line-clamp-1 font-medium">এন্ড-টু-এন্ড ৮-পর্যায়</span>
          </button>

          {/* Button 0: Batch Prompt Planner (৫০-১০০ প্রম্পট) */}
          <button
            onClick={() => onNavigate('batch-planner')}
            className="flex flex-col items-start p-3.5 bg-gradient-to-br from-indigo-950/60 to-zinc-900/80 hover:bg-zinc-800/90 border border-indigo-700/60 hover:border-indigo-400 rounded-xl transition-all group text-left shadow-sm relative overflow-hidden"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <Layers className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="text-xs font-semibold text-white group-hover:text-indigo-300 flex items-center gap-1">
              ব্যাচ প্ল্যানার
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
            <span className="text-[11px] text-indigo-300/80 mt-0.5 line-clamp-1">৫০–১০০ প্রম্পট কিউ</span>
          </button>

          {/* Button 1: Create Image */}
          <button
            onClick={() => onNavigate('create-image')}
            className="flex flex-col items-start p-3.5 bg-zinc-900/70 hover:bg-zinc-800/80 border border-zinc-800 hover:border-indigo-500/50 rounded-xl transition-all group text-left shadow-sm"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <ImageIcon className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-zinc-100 group-hover:text-indigo-300 flex items-center gap-1">
              Create Image
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
            <span className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">Text-to-image studio</span>
          </button>

          {/* Button 2: Create Video */}
          <button
            onClick={() => onNavigate('create-video')}
            className="flex flex-col items-start p-3.5 bg-zinc-900/70 hover:bg-zinc-800/80 border border-zinc-800 hover:border-indigo-500/50 rounded-xl transition-all group text-left shadow-sm"
          >
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 text-violet-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <Video className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-zinc-100 group-hover:text-violet-300 flex items-center gap-1">
              Create Video
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
            <span className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">Cinematic motion engine</span>
          </button>

          {/* Button 3: My Assets */}
          <button
            onClick={() => onNavigate('my-assets')}
            className="flex flex-col items-start p-3.5 bg-zinc-900/70 hover:bg-zinc-800/80 border border-zinc-800 hover:border-emerald-500/50 rounded-xl transition-all group text-left shadow-sm"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <FolderHeart className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-zinc-100 group-hover:text-emerald-300 flex items-center gap-1">
              My Assets
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
            <span className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">{assets.length} stored files</span>
          </button>

          {/* Button 4: Marketing AI */}
          <button
            onClick={() => onNavigate('marketing-ai')}
            className="flex flex-col items-start p-3.5 bg-zinc-900/70 hover:bg-zinc-800/80 border border-zinc-800 hover:border-cyan-500/50 rounded-xl transition-all group text-left shadow-sm"
          >
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <Megaphone className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-zinc-100 group-hover:text-cyan-300 flex items-center gap-1">
              Marketing AI
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
            <span className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">Ad copy & campaigns</span>
          </button>

          {/* Button 5: Settings */}
          <button
            onClick={() => onNavigate('settings')}
            className="col-span-2 sm:col-span-1 flex flex-col items-start p-3.5 bg-zinc-900/70 hover:bg-zinc-800/80 border border-zinc-800 hover:border-amber-500/50 rounded-xl transition-all group text-left shadow-sm"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <SettingsIcon className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-zinc-100 group-hover:text-amber-300 flex items-center gap-1">
              Settings
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
            <span className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">Studio & render configs</span>
          </button>
        </div>
      </div>

      {/* Quick Interactive Studio Generator Bar */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-zinc-100">Quick Generator</h2>
            <span className="text-[11px] text-zinc-400 hidden xs:inline">· Instant render to your asset library</span>
          </div>

          {/* Type Selector (Image / Video) */}
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 w-fit">
            <button
              type="button"
              onClick={() => setQuickType('image')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                quickType === 'image'
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Image</span>
            </button>
            <button
              type="button"
              onClick={() => setQuickType('video')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                quickType === 'video'
                  ? 'bg-violet-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Video</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleQuickSubmit} className="space-y-3">
          <div className="relative">
            <textarea
              value={quickPrompt}
              onChange={(e) => setQuickPrompt(e.target.value)}
              placeholder={
                quickType === 'image'
                  ? 'Describe any image (e.g., "Futuristic architectural pavilion in the Swiss Alps with morning mist, photorealistic 8k...")'
                  : 'Describe camera motion & scene (e.g., "Smooth drone flight orbiting around a neon lit futuristic hypercar at dusk...")'
              }
              rows={2}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl p-3.5 text-base sm:text-sm text-zinc-100 placeholder-zinc-400 focus:outline-none transition-colors resize-none leading-relaxed"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Aspect Ratio Picker */}
            <div className="flex items-center gap-1.5 text-xs overflow-x-auto no-scrollbar py-0.5">
              <span className="text-zinc-400 mr-1 hidden sm:inline">Ratio:</span>
              {(['1:1', '16:9', '9:16', '4:3'] as AspectRatioType[]).map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => setQuickRatio(ratio)}
                  className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-colors min-h-[38px] flex items-center justify-center ${
                    quickRatio === ratio
                      ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <button
                type="button"
                onClick={handleLaunchAgentFromDashboard}
                disabled={!quickPrompt.trim()}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs py-2.5 px-5 rounded-xl transition-all shadow-md shadow-indigo-950 min-h-[44px]"
              >
                <Cpu className="w-4 h-4 text-cyan-300" />
                <span>Run AI Automation Agent</span>
              </button>

              <button
                type="submit"
                disabled={isGenerating || !quickPrompt.trim()}
                className="flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-200 font-medium text-xs py-2.5 px-4 rounded-xl border border-zinc-700 transition-all min-h-[44px]"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>{isGenerating ? 'Synthesizing...' : 'Direct Render'}</span>
              </button>
            </div>
          </div>

          {/* Generation Progress Simulation Bar */}
          {isGenerating && (
            <div className="mt-3 p-3 bg-zinc-950 border border-indigo-500/30 rounded-xl animate-in fade-in">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="text-indigo-300 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
                  {generationProgress < 40
                    ? 'Connecting to MiniMax Image-01 API...'
                    : generationProgress < 80
                    ? 'Synthesizing neural latents...'
                    : 'Finalizing high-res image & saving to assets...'}
                </span>
                <span className="text-zinc-400 font-mono">{generationProgress}%</span>
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
            </div>
          )}
        </form>

        {/* Preset Prompt Suggestions */}
        <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
          <span className="text-zinc-400 shrink-0 text-[11px]">Try preset:</span>
          {PRESET_IMAGE_PROMPTS.slice(0, 3).map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleUsePreset(prompt)}
              className="shrink-0 bg-zinc-950/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80 px-2.5 py-1 rounded-lg text-xs truncate max-w-xs transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Studio Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs">Total Assets</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white">{assets.length}</div>
          <span className="text-[11px] text-zinc-400 mt-1 block">In studio storage</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs">Video Renders</span>
            <Video className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white">
            {assets.filter((a) => a.type === 'video').length}
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">Cinematic clips saved</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs">Fast Pipeline</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400">Active</div>
          <span className="text-[11px] text-zinc-400 mt-1 block">Server-side proxy ready</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs">MiniMax Model</span>
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white">image-01</div>
          <span className="text-[11px] text-emerald-400 mt-1 block">Official API Integrated</span>
        </div>
      </div>

      {/* Recent Studio Generations Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Recent Studio Generations</h2>
            <p className="text-xs text-zinc-400">Click any creation to view prompt details, remix, or download</p>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 self-stretch sm:self-auto overflow-x-auto no-scrollbar text-xs">
            {(['all', 'image', 'video', 'marketing'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setRecentFilter(filter)}
                className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-colors ${
                  recentFilter === filter
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {filter === 'all' ? 'All' : `${filter}s`}
              </button>
            ))}
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              onClick={() => onSelectAsset(asset)}
              className="group bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 shadow-sm flex flex-col"
            >
              {/* Media Container */}
              <div className="relative aspect-video bg-zinc-950 overflow-hidden">
                <img
                  src={asset.thumbnailUrl}
                  alt={asset.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Video Play Overlay */}
                {asset.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white">
                      <Play className="w-4 h-4 fill-white translate-x-0.5" />
                    </div>
                  </div>
                )}

                {/* Top Badges */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider bg-black/70 backdrop-blur-md text-zinc-200 px-2 py-0.5 rounded border border-white/10">
                    {asset.type}
                  </span>
                  <span className="text-[10px] bg-black/70 backdrop-blur-md text-zinc-300 px-1.5 py-0.5 rounded border border-white/10 font-mono">
                    {asset.aspectRatio}
                  </span>
                </div>

                {/* Top Right Favorite Button */}
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
                  aria-label="Toggle favorite"
                >
                  <Heart className={`w-3.5 h-3.5 ${asset.isFavorite ? 'fill-rose-400' : ''}`} />
                </button>
              </div>

              {/* Card Body */}
              <div className="p-3.5 flex flex-col justify-between flex-1">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-indigo-300 transition-colors line-clamp-1">
                    {asset.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                    {asset.prompt}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-zinc-800/60 text-[11px] text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span>{asset.createdAt}</span>
                    <span>·</span>
                    <span>{asset.style}</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleCopyPrompt(e, asset.id, asset.prompt)}
                    className="hover:text-zinc-200 p-1 rounded hover:bg-zinc-800 transition-colors flex items-center gap-1"
                    title="Copy prompt"
                  >
                    {copiedId === asset.id ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredAssets.length === 0 && (
          <div className="text-center py-12 bg-zinc-900/40 rounded-xl border border-zinc-800">
            <p className="text-zinc-400 text-sm">No creations found in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
};
