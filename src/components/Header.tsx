import React from 'react';
import { StudioTab } from '../types';
import { useDevice } from '../hooks/useDevice';
import {
  Menu,
  X,
  Sparkles,
  Plus,
  Image as ImageIcon,
  Video,
  Smartphone,
  Tablet as TabletIcon,
  Monitor,
  Bot,
  ExternalLink,
  Activity,
} from 'lucide-react';

interface HeaderProps {
  currentTab: StudioTab;
  onSelectTab: (tab: StudioTab) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  credits: number;
  onOpenGoogleFlow?: () => void;
  onOpenGeminiDiagnostics?: () => void;
}

const TAB_TITLES: Record<StudioTab, { title: string; subtitle: string }> = {
  dashboard: { title: 'Studio Dashboard', subtitle: 'Manage generative workflows and recent projects' },
  'autonomous-pipeline': { title: 'স্বয়ংক্রিয় এআই পাইপলাইন ও টাস্ক কিউ (Autonomous AI Engine)', subtitle: 'প্রম্পট থেকে ৪x আপস্কেল, ভিশন মেটাডেটা ও ৫-মার্কেটপ্লেস ZIP প্যাকেজ স্বয়ংক্রিয় প্রসেসিং' },
  'account-manager': { title: 'অ্যাকাউন্ট ও সাবমিশন ম্যানেজার (Account Manager)', subtitle: 'Adobe Stock ও Fiverr প্ল্যাটফর্মে প্রোফাইল, এসেট বরাদ্দ ও সাবমিশন প্যাকেজ ব্যবস্থাপনা' },
  'batch-planner': { title: 'ব্যাচ প্রম্পট পরিকল্পনাকারী (Batch Prompt Planner)', subtitle: 'এক ক্লিকে ৫০ বা ১০০টি বৈচিত্র্যময় বাণিজ্যিক প্রম্পট ও স্বয়ংক্রিয় ব্যাচ কিউ' },
  'create-image': { title: 'Create Image', subtitle: 'Text-to-image studio with multi-style diffusion' },
  'create-video': { title: 'Create Video', subtitle: 'Cinematic text-to-video & camera motion engine' },
  'my-assets': { title: 'My Assets', subtitle: 'Organize, preview and export your studio creations' },
  chatgpt: { title: 'Google Gemini AI Agent & স্বয়ংক্রিয় বিজনেস সিস্টেম', subtitle: '৭টি বিশেষজ্ঞ এআই এজেন্ট: পরিকল্পনা, ৫০–১০০ প্রম্পট, মান যাচাই, মেটাডেটা ও বিক্রির অগ্রগতি' },
  'marketing-ai': { title: 'Marketing AI', subtitle: 'Multi-platform social copy, ad concepts & visual mockups' },
  settings: { title: 'Settings', subtitle: 'Studio preferences, rendering defaults and workspace configuration' },
};

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  mobileMenuOpen,
  setMobileMenuOpen,
  credits,
  onOpenGoogleFlow,
  onOpenGeminiDiagnostics,
}) => {
  const currentInfo = TAB_TITLES[currentTab];
  const { deviceType, isMobile, isTablet } = useDevice();

  return (
    <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-3 sm:px-6 py-2.5 sm:py-3 transition-colors">
      <div className="flex items-center justify-between gap-2 sm:gap-4 max-w-7xl mx-auto">
        {/* Left: Mobile hamburger & Logo/Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="md:hidden p-2.5 text-zinc-300 hover:text-white rounded-xl hover:bg-zinc-900 border border-zinc-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 active:scale-95"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-indigo-400" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-950/50 shrink-0">
              <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-semibold text-zinc-100 text-sm sm:text-base tracking-tight truncate">
                  AI Creator Studio
                </span>
                {/* Auto Device Mode Indicator */}
                <span className="hidden xs:inline-flex items-center gap-1 text-[10px] font-medium text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded-full shrink-0">
                  {deviceType === 'mobile' && <Smartphone className="w-3 h-3 text-indigo-400" />}
                  {deviceType === 'tablet' && <TabletIcon className="w-3 h-3 text-indigo-400" />}
                  {deviceType === 'desktop' && <Monitor className="w-3 h-3 text-indigo-400" />}
                  <span className="capitalize">Auto · {deviceType}</span>
                </span>
              </div>
              <p className="hidden md:block text-xs text-zinc-400 truncate max-w-xs lg:max-w-md">
                {currentInfo.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Center / Right: Quick Actions & Credits */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Quick Create Buttons on Tablet/Desktop */}
          <div className="hidden lg:flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
            <button
              onClick={() => onSelectTab('create-image')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                currentTab === 'create-image'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Create Image</span>
            </button>
            <button
              onClick={() => onSelectTab('create-video')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                currentTab === 'create-video'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Create Video</span>
            </button>
            <button
              onClick={() => onSelectTab('chatgpt')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                currentTab === 'chatgpt'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-emerald-400" />
              <span>ChatGPT AI</span>
            </button>
          </div>

          {/* Quick Google Flow Hub Button */}
          {onOpenGoogleFlow && (
            <button
              onClick={onOpenGoogleFlow}
              className="hidden sm:flex items-center gap-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-cyan-300 border border-zinc-800 hover:border-cyan-800/70 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium transition-colors shadow-sm"
              title="Google Flow Free Credits Hub & Import"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Google Flow</span>
              <span className="md:hidden">Flow</span>
            </button>
          )}

          {/* Gemini AI Quota & Model Diagnostics Button */}
          {onOpenGeminiDiagnostics && (
            <button
              onClick={onOpenGeminiDiagnostics}
              className="flex items-center gap-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-violet-300 border border-zinc-800 hover:border-violet-800/70 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium transition-colors shadow-sm cursor-pointer"
              title="Gemini AI কোটা ও মডেল হেলথ ডায়াগনস্টিকস"
            >
              <Activity className="w-3.5 h-3.5 text-violet-400" />
              <span className="hidden md:inline">Gemini Quota</span>
              <span className="md:hidden">Quota</span>
            </button>
          )}

          {/* Credits Counter with Live Indicator */}
          <div className="flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            <span className="font-semibold text-zinc-100">{credits}</span>
            <span className="text-zinc-400 hidden sm:inline">Credits</span>
          </div>

          {/* New Project Action Button */}
          <button
            onClick={() => onSelectTab('create-image')}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-medium px-3 sm:px-3.5 py-2 sm:py-2 rounded-xl transition-all shadow-md shadow-indigo-900/30 min-h-[38px] sm:min-h-[36px]"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Generation</span>
            <span className="sm:hidden font-semibold">Create</span>
          </button>
        </div>
      </div>
    </header>
  );
};
