/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { StudioTab, Asset, AspectRatioType } from './types';
import { INITIAL_ASSETS } from './data/mockAssets';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { CreateImageView } from './components/CreateImageView';
import { CreateVideoView } from './components/CreateVideoView';
import { MyAssetsView } from './components/MyAssetsView';
import { MarketingAIView } from './components/MarketingAIView';
import { ChatGPTAssistantView } from './components/ChatGPTAssistantView';
import { BatchPromptPlannerView } from './components/BatchPromptPlannerView';
import { AutonomousPipelineDashboardView } from './components/AutonomousPipelineDashboardView';
import { AccountManagerView } from './components/AccountManagerView';
import { GoogleFlowModal } from './components/GoogleFlowModal';
import { SettingsView } from './components/SettingsView';
import { AssetDetailModal } from './components/AssetDetailModal';
import { GeminiDiagnosticsModal } from './components/GeminiDiagnosticsModal';
import { useDevice } from './hooks/useDevice';
import {
  LayoutDashboard,
  Image as ImageIcon,
  Video,
  FolderHeart,
  Megaphone,
  Settings as SettingsIcon,
  Bot,
  AlertCircle,
  Cpu,
} from 'lucide-react';
import {
  saveAssetToDB,
  loadAllAssetsFromDB,
  updateAssetInDB,
  deleteAssetFromDB,
  clearAllAssetsFromDB,
  migrateFromLocalStorage,
} from './utils/assetStorage';

export default function App() {
  const { isMobile, isTablet, isDesktop } = useDevice();
  const [currentTab, setCurrentTab] = useState<StudioTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [googleFlowModalOpen, setGoogleFlowModalOpen] = useState(false);
  const [geminiDiagnosticsOpen, setGeminiDiagnosticsOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [credits, setCredits] = useState<number>(248);
  const [isQuickGenerating, setIsQuickGenerating] = useState(false);
  const [quickProgress, setQuickProgress] = useState(0);
  const [studioPrompt, setStudioPrompt] = useState<string>('');

  const handleUsePromptInStudio = (prompt: string, type: 'image' | 'video' = 'image') => {
    setStudioPrompt(prompt);
    setCurrentTab(type === 'image' ? 'create-image' : 'create-video');
  };

  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
  const [storageErrorBanner, setStorageErrorBanner] = useState<string | null>(null);

  // Initialize and load safe IndexedDB asset storage
  useEffect(() => {
    async function initStorage() {
      try {
        const migrationResult = await migrateFromLocalStorage(INITIAL_ASSETS);
        if (!migrationResult.success && migrationResult.error) {
          setStorageErrorBanner(migrationResult.error);
        }
        const loaded = await loadAllAssetsFromDB();
        if (loaded && loaded.length > 0) {
          setAssets(loaded);
        }
      } catch (err: unknown) {
        console.error('Failed to initialize asset storage:', err);
        setStorageErrorBanner('IndexedDB স্টোরেজ ইনিশিয়ালাইজ করতে সমস্যা হয়েছে। ডেটা মেমোরি মোডে রাখা হচ্ছে।');
      }
    }
    initStorage();
  }, []);

  // Asset handlers
  const handleToggleFavorite = async (id: string) => {
    const target = assets.find((item) => item.id === id);
    if (!target) return;
    const newFav = !target.isFavorite;

    setAssets((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isFavorite: newFav } : item))
    );
    if (selectedAsset && selectedAsset.id === id) {
      setSelectedAsset((prev) => (prev ? { ...prev, isFavorite: newFav } : null));
    }
    try {
      await updateAssetInDB(id, { isFavorite: newFav });
    } catch (err) {
      console.warn('Could not update favorite in IndexedDB:', err);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    setAssets((prev) => prev.filter((item) => item.id !== id));
    if (selectedAsset && selectedAsset.id === id) {
      setSelectedAsset(null);
    }
    try {
      await deleteAssetFromDB(id);
    } catch (err) {
      console.warn('Could not delete asset from IndexedDB:', err);
    }
  };

  const handleAddNewAsset = async (
    newAsset: Omit<Asset, 'id' | 'createdAt' | 'views'>,
    mediaBlob?: Blob,
    thumbnailBlob?: Blob
  ) => {
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })} · ${now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })}`;

    const fullAsset: Asset = {
      ...newAsset,
      id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: formattedDate,
      views: 1,
    };

    try {
      const saved = await saveAssetToDB(fullAsset, mediaBlob, thumbnailBlob);
      setAssets((prev) => [saved, ...prev]);
    } catch (err: unknown) {
      console.error('Failed to save to IndexedDB:', err);
      setAssets((prev) => [fullAsset, ...prev]);
      if (err instanceof Error) {
        setStorageErrorBanner(err.message);
      }
    }
    // Only deduct generation credits for newly synthesized studio creations, not imported files or external Flow imports
    if (newAsset.source !== 'Google Flow' && newAsset.source !== 'Imported') {
      setCredits((prev) => Math.max(0, prev - (newAsset.type === 'video' ? 3 : 1)));
    }
  };

  const handleUpdateAssetThumbnail = async (assetId: string, newThumbnailUrl: string, newThumbnailBlob?: Blob) => {
    setAssets((prev) =>
      prev.map((item) => (item.id === assetId ? { ...item, thumbnailUrl: newThumbnailUrl } : item))
    );
    if (selectedAsset && selectedAsset.id === assetId) {
      setSelectedAsset((prev) => (prev ? { ...prev, thumbnailUrl: newThumbnailUrl } : null));
    }
    try {
      await updateAssetInDB(assetId, { thumbnailUrl: newThumbnailUrl });
    } catch (err) {
      console.warn('Could not update thumbnail in IndexedDB:', err);
    }
  };

  const handleResetAssets = async () => {
    try {
      await clearAllAssetsFromDB();
      for (const item of INITIAL_ASSETS) {
        await saveAssetToDB(item);
      }
      const reloaded = await loadAllAssetsFromDB();
      setAssets(reloaded);
    } catch {
      setAssets(INITIAL_ASSETS);
    }
  };

  // Quick generate triggered from Dashboard
  const handleQuickGenerate = async (prompt: string, type: 'image' | 'video', aspectRatio: AspectRatioType) => {
    setIsQuickGenerating(true);
    setQuickProgress(15);

    if (type === 'image') {
      const interval = setInterval(() => {
        setQuickProgress((p) => (p >= 85 ? 85 : p + 15));
      }, 500);

      try {
        const response = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            aspectRatio,
            style: 'Photorealistic',
            quality: 'high',
            provider: 'gemini',
            autoFallback: true,
          }),
        });

        clearInterval(interval);
        setQuickProgress(100);

        const data = await response.json();

        if (data.success && data.imageUrl) {
          const titleWords = prompt.split(' ').slice(0, 4).join(' ');
          handleAddNewAsset({
            title: titleWords ? titleWords.charAt(0).toUpperCase() + titleWords.slice(1) : (data.provider === 'minimax' ? 'MiniMax Image' : 'Gemini Visual Asset'),
            type: 'image',
            prompt,
            style: 'Photorealistic',
            aspectRatio,
            dimensions: data.dimensions || '1280 × 720',
            url: data.imageUrl,
            thumbnailUrl: data.imageUrl,
            isFavorite: false,
            model: data.model || (data.provider === 'minimax' ? 'MiniMax image-01' : 'Gemini Nano Banana'),
          });
          setIsQuickGenerating(false);
          setQuickProgress(0);
          return;
        }

        // Navigate to create-image studio tab with prompt so user can view real status/error & add reference image
        setCurrentTab('create-image');
        setStudioPrompt(prompt);
      } catch {
        // Navigate to studio tab so user can review details
        setCurrentTab('create-image');
        setStudioPrompt(prompt);
      } finally {
        setIsQuickGenerating(false);
        setQuickProgress(0);
      }
      return;
    }

    // Honest video workflow: redirect directly to Video Studio with prompt preloaded (no fake Unsplash photos)
    setIsQuickGenerating(false);
    setQuickProgress(0);
    setStudioPrompt(prompt);
    setCurrentTab('create-video');
  };

  const handleRemix = (asset: Asset, targetTab: 'create-image' | 'create-video') => {
    setCurrentTab(targetTab);
  };

  return (
    <div className="w-full min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Responsive Top Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        credits={credits}
        onOpenGoogleFlow={() => setGoogleFlowModalOpen(true)}
        onOpenGeminiDiagnostics={() => setGeminiDiagnosticsOpen(true)}
      />

      <div className="relative w-full flex-1">
        {/* Sidebar Navigation */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          totalAssetsCount={assets.length}
          onOpenGoogleFlow={() => setGoogleFlowModalOpen(true)}
        />

        {/* Main Content Area */}
        <main className="w-full md:ml-64 min-w-0 pb-32 md:pb-8">
          {storageErrorBanner && (
            <div className="bg-amber-950/80 border-b border-amber-800/80 text-amber-200 px-4 py-2.5 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{storageErrorBanner}</span>
              </div>
              <button
                onClick={() => setStorageErrorBanner(null)}
                className="text-amber-400 hover:text-amber-200 text-xs font-semibold px-2 py-0.5"
              >
                বন্ধ করুন
              </button>
            </div>
          )}

          {currentTab === 'dashboard' && (
            <DashboardView
              onNavigate={setCurrentTab}
              assets={assets}
              onSelectAsset={setSelectedAsset}
              onToggleFavorite={handleToggleFavorite}
              onQuickGenerate={handleQuickGenerate}
              isGenerating={isQuickGenerating}
              generationProgress={quickProgress}
            />
          )}

          {currentTab === 'autonomous-pipeline' && (
            <AutonomousPipelineDashboardView
              onNavigate={setCurrentTab}
              assets={assets}
              onAddNewAsset={handleAddNewAsset}
              onOpenGoogleFlow={() => setGoogleFlowModalOpen(true)}
            />
          )}

          {currentTab === 'account-manager' && (
            <AccountManagerView
              assets={assets}
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'batch-planner' && (
            <BatchPromptPlannerView
              onNavigate={setCurrentTab}
              onSaveToAssets={handleAddNewAsset}
              onUsePromptInStudio={handleUsePromptInStudio}
            />
          )}

          {currentTab === 'create-image' && (
            <CreateImageView
              onGenerateImage={handleAddNewAsset}
              recentImages={assets.filter((a) => a.type === 'image')}
              onSelectAsset={setSelectedAsset}
              initialPrompt={studioPrompt}
              onClearInitialPrompt={() => setStudioPrompt('')}
            />
          )}

          {currentTab === 'create-video' && (
            <CreateVideoView
              onGenerateVideo={handleAddNewAsset}
              recentVideos={assets.filter((a) => a.type === 'video')}
              onSelectAsset={setSelectedAsset}
              initialPrompt={studioPrompt}
              onClearInitialPrompt={() => setStudioPrompt('')}
              onNavigateToAssets={() => setCurrentTab('my-assets')}
            />
          )}

          {currentTab === 'my-assets' && (
            <MyAssetsView
              assets={assets}
              onSelectAsset={setSelectedAsset}
              onToggleFavorite={handleToggleFavorite}
              onDeleteAsset={handleDeleteAsset}
              onAddCustomAsset={handleAddNewAsset}
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'chatgpt' && (
            <ChatGPTAssistantView
              onUsePromptInStudio={handleUsePromptInStudio}
              onNavigate={setCurrentTab}
              onSaveToAssets={handleAddNewAsset}
              onOpenGeminiDiagnostics={() => setGeminiDiagnosticsOpen(true)}
            />
          )}

          {currentTab === 'marketing-ai' && (
            <MarketingAIView
              onSaveToAssets={handleAddNewAsset}
              onNavigate={setCurrentTab}
              onUsePromptInStudio={handleUsePromptInStudio}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              onResetAssets={handleResetAssets}
              totalAssetsCount={assets.length}
              onOpenGeminiDiagnostics={() => setGeminiDiagnosticsOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar for quick thumb access */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/90 px-1 py-1 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] flex items-center justify-around shadow-2xl">
        <button
          onClick={() => setCurrentTab('dashboard')}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[10px] font-medium transition-all active:scale-95 min-h-[48px] ${
            currentTab === 'dashboard' ? 'text-indigo-400 font-semibold bg-indigo-500/10' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 mb-1" />
          <span>Home</span>
        </button>

        <button
          onClick={() => setCurrentTab('create-image')}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[10px] font-medium transition-all active:scale-95 min-h-[48px] ${
            currentTab === 'create-image' ? 'text-indigo-400 font-semibold bg-indigo-500/10' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <ImageIcon className="w-4 h-4 mb-1" />
          <span>Image</span>
        </button>

        <button
          onClick={() => setCurrentTab('create-video')}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[10px] font-medium transition-all active:scale-95 min-h-[48px] ${
            currentTab === 'create-video' ? 'text-indigo-400 font-semibold bg-indigo-500/10' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Video className="w-4 h-4 mb-1" />
          <span>Video</span>
        </button>

        <button
          onClick={() => setCurrentTab('chatgpt')}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[10px] font-medium transition-all active:scale-95 min-h-[48px] ${
            currentTab === 'chatgpt' ? 'text-indigo-400 font-semibold bg-indigo-500/10' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Bot className="w-4 h-4 mb-1" />
          <span>Gemini AI</span>
        </button>

        <button
          onClick={() => setCurrentTab('my-assets')}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[10px] font-medium transition-all active:scale-95 min-h-[48px] ${
            currentTab === 'my-assets' ? 'text-indigo-400 font-semibold bg-indigo-500/10' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <FolderHeart className="w-4 h-4 mb-1" />
          <span>Assets</span>
        </button>

        <button
          onClick={() => setCurrentTab('settings')}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[10px] font-medium transition-all active:scale-95 min-h-[48px] ${
            currentTab === 'settings' ? 'text-indigo-400 font-semibold bg-indigo-500/10' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <SettingsIcon className="w-4 h-4 mb-1" />
          <span>Settings</span>
        </button>
      </nav>

      {/* Global Google Flow Modal */}
      <GoogleFlowModal
        isOpen={googleFlowModalOpen}
        onClose={() => setGoogleFlowModalOpen(false)}
        onImportAsset={handleAddNewAsset}
        onNavigateToAssets={() => setCurrentTab('my-assets')}
      />

      {/* Asset Detail Lightbox Modal */}
      <AssetDetailModal
        asset={selectedAsset}
        onClose={() => setSelectedAsset(null)}
        onToggleFavorite={handleToggleFavorite}
        onDeleteAsset={handleDeleteAsset}
        onRemix={handleRemix}
        onSaveEnhancedAsset={handleAddNewAsset}
        onUpdateAssetThumbnail={handleUpdateAssetThumbnail}
        onSaveNewTrimmedAsset={handleAddNewAsset}
      />

      {/* Gemini AI Quota & Model Health Diagnostics Modal */}
      <GeminiDiagnosticsModal
        isOpen={geminiDiagnosticsOpen}
        onClose={() => setGeminiDiagnosticsOpen(false)}
      />
    </div>
  );
}
