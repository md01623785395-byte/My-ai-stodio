import React from 'react';
import { StudioTab } from '../types';
import { useDevice } from '../hooks/useDevice';
import {
  LayoutDashboard,
  Image as ImageIcon,
  Video,
  FolderHeart,
  Megaphone,
  Settings as SettingsIcon,
  Sparkles,
  Zap,
  X,
  Bot,
  ExternalLink,
  Layers,
  Cpu,
  UserCheck,
} from 'lucide-react';

interface SidebarProps {
  currentTab: StudioTab;
  onSelectTab: (tab: StudioTab) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  totalAssetsCount: number;
  onOpenGoogleFlow?: () => void;
}

interface NavItem {
  id: StudioTab;
  label: string;
  shortLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  description: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  mobileMenuOpen,
  setMobileMenuOpen,
  totalAssetsCount,
  onOpenGoogleFlow,
}) => {
  const { deviceType } = useDevice();

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      shortLabel: 'Home',
      icon: LayoutDashboard,
      description: 'Studio overview & recent runs',
    },
    {
      id: 'autonomous-pipeline',
      label: 'স্বয়ংক্রিয় এআই এজেন্ট',
      shortLabel: 'AI Agent',
      icon: Cpu,
      badge: 'Agent',
      description: '৮-পর্যায়ের স্বয়ংক্রিয় স্টক অর্কেস্ট্রেশন',
    },
    {
      id: 'account-manager',
      label: 'অ্যাকাউন্ট ম্যানেজার',
      shortLabel: 'Accounts',
      icon: UserCheck,
      badge: 'Adobe/Fiverr',
      description: 'অ্যাকাউন্ট প্রোফাইল ও এসেট সাবমিশন',
    },
    {
      id: 'batch-planner',
      label: 'ব্যাচ প্রম্পট প্ল্যানার',
      shortLabel: 'প্ল্যানার',
      icon: Layers,
      badge: '৫০-১০০',
      description: '৫০ বা ১০০টি বাণিজ্যিক প্রম্পট ও ব্যাচ কিউ',
    },
    {
      id: 'create-image',
      label: 'Create Image',
      shortLabel: 'Image',
      icon: ImageIcon,
      badge: 'Pro',
      description: 'Text & image diffusion studio',
    },
    {
      id: 'create-video',
      label: 'Create Video',
      shortLabel: 'Video',
      icon: Video,
      badge: 'Cine',
      description: 'AI camera & motion generation',
    },
    {
      id: 'my-assets',
      label: 'My Assets',
      shortLabel: 'Assets',
      icon: FolderHeart,
      badge: totalAssetsCount > 0 ? String(totalAssetsCount) : undefined,
      description: 'Gallery, media & exports',
    },
    {
      id: 'chatgpt',
      label: 'Gemini AI Agent',
      shortLabel: 'Gemini AI',
      icon: Bot,
      badge: '৭ Agents',
      description: '৭ বিশেষজ্ঞ এজেন্ট ও স্বয়ংক্রিয় বিজনেস পাইপলাইন',
    },
    {
      id: 'marketing-ai',
      label: 'Marketing AI',
      shortLabel: 'Marketing',
      icon: Megaphone,
      badge: 'New',
      description: 'Social copy & ad concepts',
    },
    {
      id: 'settings',
      label: 'Settings',
      shortLabel: 'Settings',
      icon: SettingsIcon,
      description: 'Preferences & render output',
    },
  ];

  const handleNavClick = (tabId: StudioTab) => {
    onSelectTab(tabId);
    setMobileMenuOpen(false);
  };

  // Navigation Content used in both desktop fixed sidebar and mobile drawer
  const navContent = (
    <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800/80 p-4">
      {/* Studio Header on Desktop */}
      <div className="hidden md:flex items-center gap-2.5 pb-6 pt-2 border-b border-zinc-900">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-950/40">
          <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
        </div>
        <div>
          <h1 className="font-bold text-zinc-100 text-sm tracking-tight">AI Creator Studio</h1>
          <p className="text-[11px] text-zinc-400 flex items-center gap-1">
            <span>Media Generation Suite</span>
          </p>
        </div>
      </div>

      {/* Mobile Top Bar inside drawer */}
      <div className="flex md:hidden items-center justify-between pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <span className="font-semibold text-zinc-100 text-sm block">AI Creator Studio</span>
            <span className="text-[10px] text-indigo-400">Mobile Navigation</span>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 border border-zinc-800 active:scale-95 transition-all"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Primary Navigation Buttons */}
      <div className="py-4 space-y-1.5 flex-1 overflow-y-auto">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 px-3 mb-2 flex items-center justify-between">
          <span>Workspace</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
            {deviceType.toUpperCase()}
          </span>
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 sm:py-2.5 rounded-xl text-sm font-medium transition-all group text-left min-h-[44px] ${
                isActive
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-indigo-400' : 'text-zinc-400 group-hover:text-zinc-200'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-md shrink-0 ${
                    isActive
                      ? 'bg-indigo-500/20 text-indigo-300'
                      : 'bg-zinc-800/80 text-zinc-400 group-hover:text-zinc-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Studio Fast-Render Card */}
      <div className="mt-auto pt-4 border-t border-zinc-900">
        {/* Google Flow Quick Access Card */}
        <div className="mb-3 p-3 rounded-xl bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-900/40">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-blue-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Google Flow
            </span>
            <span className="text-[10px] text-cyan-300 font-medium bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/60">
              Free
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed mb-2.5">
            অফিসিয়াল সাইটে ফ্রি ক্রেডিট ব্যবহার করে ইমেজ/ভিডিও তৈরি ও ইমপোর্ট করুন।
          </p>
          <div className="flex items-center gap-1.5">
            <a
              href="https://flow.google"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 transition-colors shadow-sm"
            >
              <span>Open Flow</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            {onOpenGoogleFlow && (
              <button
                type="button"
                onClick={onOpenGoogleFlow}
                className="py-1.5 px-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-[11px] font-medium transition-colors"
              >
                Import
              </button>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-b from-zinc-900 to-zinc-900/60 border border-zinc-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Fast Render Pipeline
            </span>
            <span className="text-[10px] text-emerald-400 font-medium bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60">
              Ready
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">
            Multi-model engine active. Fast AI image diffusion & multi-marketplace compliance verified.
          </p>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-indigo-500 h-full rounded-full w-3/4"></div>
          </div>
          <div className="flex justify-between items-center mt-2 text-[10px] text-zinc-400">
            <span>Storage: 1.2 GB / 10 GB</span>
            <span className="text-indigo-400 font-medium">75%</span>
          </div>
        </div>

        {/* Quick Footer Links */}
        <div className="mt-3 px-2 flex items-center justify-between text-[11px] text-zinc-400">
          <button
            onClick={() => handleNavClick('settings')}
            className="hover:text-zinc-300 transition-colors"
          >
            Studio v1.0
          </button>
          <span>·</span>
          <button
            onClick={() => handleNavClick('my-assets')}
            className="hover:text-zinc-300 transition-colors"
          >
            {totalAssetsCount} Assets Saved
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop & Tablet Sidebar (Fixed Left on md and wider screens) */}
      <aside className="hidden md:flex w-64 flex-col shrink-0 fixed inset-y-0 left-0 z-40">
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay (< 768px only when opened) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-80 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200 flex flex-col">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
