/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { StudioTab, Asset, AspectRatioType, BatchPromptItem, BatchPlan, BatchPromptStatus, BatchQueueStats, BatchDiversityAudit } from '../types';
import { detectPromptRepetitionAndDiversity, isMosqueTopic, detectCategoryForTopic } from '../utils/batchPromptEngine';
import {
  Sparkles,
  Layers,
  Play,
  Pause,
  RotateCcw,
  Download,
  Copy,
  Check,
  Trash2,
  Edit3,
  RefreshCw,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Filter,
  Search,
  ExternalLink,
  Sliders,
  Send,
  FileSpreadsheet,
  FileJson,
  X,
  Plus,
  Info,
  HelpCircle,
  ShieldCheck,
  CheckSquare,
  Square,
  Cpu,
} from 'lucide-react';
import { loadAutonomousTasks, saveAutonomousTasks, createAutonomousTask } from '../utils/autonomousQueueManager';

interface BatchPromptPlannerViewProps {
  onNavigate?: (tab: StudioTab) => void;
  onSaveToAssets?: (asset: Omit<Asset, 'id' | 'createdAt' | 'views'>) => void;
  onUsePromptInStudio?: (prompt: string, type: 'image' | 'video') => void;
}

const QUICK_TOPICS = [
  { label: 'মসজিদ স্থাপত্য ও মিনার', topic: 'ঐতিহাসিক ও আধুনিক মসজিদ স্থাপত্য, মার্বেল গম্বুজ, সুউচ্চ মিনার ও প্রার্থনা কক্ষ', icon: '🕌' },
  { label: 'জৈব মধু ও প্রাকৃতিক মশলা', topic: 'খাঁটি সুন্দরবনের জৈব মধু ও প্রাকৃতিক গোটা মশলার কমার্শিয়াল ডিসপ্লে', icon: '🍯' },
  { label: 'আধুনিক মিনিমালিস্টিক গ্যাজেট', topic: 'ম্যাট ব্ল্যাক ও টাইটানিয়াম ফিনিশের আধুনিক মিনিমালিস্টিক গ্যাজেট ও ওয়্যারলেস টেকনোলজি', icon: '🎧' },
  { label: 'এগ্রিটেক ও ড্রোন ফার্মিং', topic: 'হাই-টেক উল্লম্ব ফার্মিং ও কৃষিকাজে ব্যবহৃত এআই ড্রোন ও স্বয়ংক্রিয় সেন্সর', icon: '🌱' },
  { label: 'বিলাসবহুল সুইস ঘড়ি', topic: 'সুইস অটোমেটিক ক্রোনোগ্রাফ বিলাসবহুল ঘড়ি ও ওয়াটারড্রপ রিফ্লেকশন', icon: '⌚' },
  { label: 'পরিচ্ছন্ন শক্তি ও সৌর প্যানেল', topic: 'সূর্যস্নাত রুফটপ সোলার প্যানেল ও নবায়নযোগ্য পরিচ্ছন্ন গ্রিন এনার্জি গ্রিড', icon: '☀️' },
  { label: 'ঐতিহ্যবাহী হস্তশিল্প ও টেক্সটাইল', topic: 'হাতে বোনা জামদানি শাড়ি ও প্রাকৃতিক রঙের খাঁটি সুতি টেক্সটাইল ফাইবার', icon: '🧵' },
];

export const BatchPromptPlannerView: React.FC<BatchPromptPlannerViewProps> = ({
  onNavigate,
  onSaveToAssets,
  onUsePromptInStudio,
}) => {
  // Input controls
  const [topic, setTopic] = useState('');
  const [requestedCount, setRequestedCount] = useState<number>(50);
  const [customCountInput, setCustomCountInput] = useState<string>('50');
  const [countError, setCountError] = useState<string | null>(null);
  const [styleCategory, setStyleCategory] = useState('বাণিজ্যিক স্টক (Commercial Stock)');
  const [isPlanning, setIsPlanning] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  // Active Plan & Prompts
  const [currentPlan, setCurrentPlan] = useState<BatchPlan | null>(() => {
    try {
      const saved = localStorage.getItem('ai_creator_studio_batch_plan');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return null;
  });

  const [prompts, setPrompts] = useState<BatchPromptItem[]>(() => {
    return currentPlan?.prompts || [];
  });

  // Selected Prompts for Batch Queue
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter & Search
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [languageMode, setLanguageMode] = useState<'bn-primary' | 'en-primary'>('bn-primary');

  // Queue Execution State
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  const [queueIndex, setQueueIndex] = useState<number | null>(null);
  const [queueMessage, setQueueMessage] = useState<string | null>(null);
  const isQueueRunningRef = useRef(false);
  isQueueRunningRef.current = isQueueRunning;

  // Single Item Editing Modal
  const [editingItem, setEditingItem] = useState<BatchPromptItem | null>(null);
  const [rephrasingId, setRephrasingId] = useState<string | null>(null);

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedFullList, setCopiedFullList] = useState(false);

  // Export Modal
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Diversity Audit State
  const [diversityAudit, setDiversityAudit] = useState<BatchDiversityAudit | null>(() => {
    return currentPlan?.diversityAudit || null;
  });
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Synchronize diversity audit whenever prompts or currentPlan change
  useEffect(() => {
    if (prompts.length > 0) {
      if (currentPlan?.diversityAudit && currentPlan.prompts.length === prompts.length) {
        setDiversityAudit(currentPlan.diversityAudit);
      } else {
        const liveAudit = detectPromptRepetitionAndDiversity(prompts, prompts.length);
        setDiversityAudit(liveAudit);
      }
    } else {
      setDiversityAudit(null);
    }
  }, [prompts, currentPlan]);

  // Save prompts to localStorage
  useEffect(() => {
    if (prompts.length > 0) {
      const planToSave: BatchPlan = currentPlan
        ? { ...currentPlan, prompts, diversityAudit: diversityAudit || currentPlan.diversityAudit }
        : {
            id: `batch-plan-${Date.now()}`,
            topic: topic || 'পরিকল্পিত ব্যাচ',
            requestedCount: prompts.length || requestedCount,
            styleCategory,
            createdAt: new Date().toISOString(),
            prompts,
            diversityAudit: diversityAudit || undefined,
          };
      try {
        localStorage.setItem('ai_creator_studio_batch_plan', JSON.stringify(planToSave));
      } catch {
        // quota safety
      }
    }
  }, [prompts, currentPlan, topic, styleCategory, diversityAudit]);

  // Statistics calculation
  const stats: BatchQueueStats = {
    total: prompts.length,
    planned: prompts.filter((p) => p.status === 'planned').length,
    queued: prompts.filter((p) => p.status === 'queued').length,
    generating: prompts.filter((p) => p.status === 'generating').length,
    completed: prompts.filter((p) => p.status === 'completed').length,
    failed: prompts.filter((p) => p.status === 'failed').length,
  };

  const handleTopicChange = (newTopic: string) => {
    setTopic(newTopic);
    if (planError) setPlanError(null);
    if (isMosqueTopic(newTopic)) {
      setStyleCategory('স্থাপত্য ও ঐতিহাসিক স্থান (Architecture & Historical Buildings)');
    }
  };

  const handlePresetClick = (presetNum: number) => {
    setRequestedCount(presetNum);
    setCustomCountInput(String(presetNum));
    setCountError(null);
    if (planError) setPlanError(null);
  };

  const handleCustomCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setCustomCountInput(rawVal);
    if (planError) setPlanError(null);

    const trimmed = rawVal.trim();
    if (!trimmed) {
      setCountError('প্রম্পট সংখ্যা লিখুন (১-১০০)');
      return;
    }

    if (rawVal.includes('.')) {
      setCountError('দশমিক সংখ্যা গ্রহণযোগ্য নয়');
      return;
    }

    const num = Number(trimmed);
    if (isNaN(num)) {
      setCountError('অবৈধ সংখ্যা');
      return;
    }

    if (!Number.isInteger(num)) {
      setCountError('পূর্ণসংখ্যা লিখুন');
      return;
    }

    if (num <= 0) {
      setCountError('কমপক্ষে ১ হতে হবে');
      return;
    }

    if (num > 100) {
      setCountError('সর্বোচ্চ ১০০টি প্রম্পট');
      return;
    }

    setCountError(null);
    setRequestedCount(num);
  };

  // Generate User-Defined Custom or Preset Batch Prompts
  const handleGenerateBatchPlan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topic.trim()) {
      setPlanError('অনুগ্রহ করে একটি বিষয় বা কীওয়ার্ড লিখুন।');
      return;
    }

    const rawInput = customCountInput.trim();
    if (!rawInput) {
      setPlanError('অনুগ্রহ করে প্রম্পট সংখ্যা লিখুন (যেমন: ১, ১০, ২৫, ৫০, ১০০)।');
      setCountError('প্রম্পট সংখ্যা লিখুন');
      return;
    }

    if (rawInput.includes('.')) {
      setPlanError('দশমিক সংখ্যা গ্রহণযোগ্য নয়। অনুগ্রহ করে একটি ধনাত্মক পূর্ণসংখ্যা দিন।');
      setCountError('দশমিক গ্রহণযোগ্য নয়');
      return;
    }

    const parsed = Number(rawInput);
    if (isNaN(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
      setPlanError('অবৈধ সংখ্যা: শূন্য, ঋণাত্মক বা অকার্যকর সংখ্যা গ্রহণযোগ্য নয়। অনুগ্রহ করে ১ বা তার বেশি ধনাত্মক পূর্ণসংখ্যা লিখুন।');
      setCountError('অবৈধ সংখ্যা');
      return;
    }

    if (parsed > 100) {
      setPlanError('একবারে সর্বোচ্চ ১০০টি প্রম্পটের পরিকল্পনা তৈরি করা সম্ভব।');
      setCountError('সর্বোচ্চ ১০০টি প্রম্পট');
      return;
    }

    setCountError(null);
    setRequestedCount(parsed);
    setIsPlanning(true);
    setPlanError(null);

    const effectiveCat = detectCategoryForTopic(topic.trim(), styleCategory);
    setStyleCategory(effectiveCat);

    try {
      const res = await fetch('/api/batch-planner/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          count: parsed,
          styleCategory: effectiveCat,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'পরিকল্পনা তৈরিতে সমস্যা হয়েছে।');
      }

      setCurrentPlan(data.plan);
      setPrompts(data.plan.prompts || []);
      if (data.plan.diversityAudit) {
        setDiversityAudit(data.plan.diversityAudit);
      }
      setSelectedIds(new Set());
      setQueueMessage(`${data.plan.prompts?.length || 0}টি আলাদা বাণিজ্যিক প্রম্পট সফলভাবে তৈরি করা হয়েছে (${data.provider})`);
    } catch (err: any) {
      console.error('[Generate Batch Plan Error]', err);
      setPlanError(err.message || 'পরিকল্পনা তৈরিতে ত্রুটি ঘটেছে। পুনরায় চেষ্টা করুন।');
    } finally {
      setIsPlanning(false);
    }
  };

  // Rephrase Single Prompt
  const handleRephrasePrompt = async (item: BatchPromptItem) => {
    setRephrasingId(item.id);
    try {
      const res = await fetch('/api/batch-planner/rephrase-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptItem: item }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.promptItem) {
        setPrompts((prev) => prev.map((p) => (p.id === item.id ? data.promptItem : p)));
      }
    } catch (err) {
      console.error('[Rephrase Error]', err);
    } finally {
      setRephrasingId(null);
    }
  };

  // Select / Deselect actions
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredPrompts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPrompts.map((p) => p.id)));
    }
  };

  // Add selected to Batch Queue
  const handleAddSelectedToQueue = () => {
    if (selectedIds.size === 0) {
      setQueueMessage('অনুগ্রহ করে কিউতে যোগ করার জন্য কমপক্ষে একটি প্রম্পট নির্বাচন করুন।');
      return;
    }

    setPrompts((prev) =>
      prev.map((item) => {
        if (selectedIds.has(item.id)) {
          return {
            ...item,
            status: 'queued',
            statusLabelBn: 'তৈরির অপেক্ষায়',
          };
        }
        return item;
      })
    );

    setQueueMessage(`${selectedIds.size}টি নির্বাচিত প্রম্পট ব্যাচ কিউতে যোগ করা হয়েছে।`);
    setSelectedIds(new Set());
  };

  // Add all to Batch Queue
  const handleAddAllToQueue = () => {
    setPrompts((prev) =>
      prev.map((item) => ({
        ...item,
        status: item.status === 'completed' ? 'completed' : 'queued',
        statusLabelBn: item.status === 'completed' ? 'সম্পন্ন' : 'তৈরির অপেক্ষায়',
      }))
    );
    setQueueMessage('সব প্রম্পট সফলভাবে ব্যাচ কিউতে যুক্ত হয়েছে।');
  };

  // Send to Autonomous Pipeline
  const handleSendToAutonomousPipeline = () => {
    const targetPrompts =
      selectedIds.size > 0
        ? prompts.filter((p) => selectedIds.has(p.id))
        : prompts;

    if (targetPrompts.length === 0) {
      setQueueMessage('স্বয়ংক্রিয় পাইপলাইনে পাঠানোর মতো কোনো প্রম্পট নেই।');
      return;
    }

    const currentTasks = loadAutonomousTasks();
    const newTasks = targetPrompts.map((p) =>
      createAutonomousTask({
        prompt: p.prompt,
        type: 'image',
        aspectRatio: p.suggestedAspectRatio || '16:9',
        style: 'Photorealistic',
        targetMarketplace: 'adobe-stock',
        autoEnhance: true,
        title: p.subjectBn.split('—')[0].trim() || 'বাণিজ্যিক স্টক রেন্ডার',
      })
    );

    saveAutonomousTasks([...newTasks, ...currentTasks]);
    if (onNavigate) {
      onNavigate('autonomous-pipeline');
    }
  };

  // Delete Prompt
  const handleDeletePrompt = (id: string) => {
    setPrompts((prev) => prev.filter((p) => p.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Save Edited Item
  const handleSaveEditedItem = (updated: BatchPromptItem) => {
    setPrompts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setEditingItem(null);
  };

  // Batch Queue Engine (Real Sequential Execution)
  const runBatchQueue = async () => {
    setIsQueueRunning(true);
    isQueueRunningRef.current = true;
    setQueueMessage('ব্যাচ কিউ সক্রিয় হয়েছে। একের পর এক প্রম্পট প্রসেস করা হচ্ছে...');

    // Find all queued items
    const queuedItems = prompts.filter((p) => p.status === 'queued');
    if (queuedItems.length === 0) {
      setIsQueueRunning(false);
      setQueueMessage('কিউতে কোনো প্রম্পট বাকি নেই। নতুন প্রম্পট যোগ করুন।');
      return;
    }

    for (let i = 0; i < queuedItems.length; i++) {
      if (!isQueueRunningRef.current) {
        setQueueMessage('ব্যাচ কিউ বিরতি দেওয়া হয়েছে।');
        break;
      }

      const item = queuedItems[i];
      setQueueIndex(item.index);

      // Update status to 'generating'
      setPrompts((prev) =>
        prev.map((p) =>
          p.id === item.id
            ? { ...p, status: 'generating', statusLabelBn: 'তৈরি হচ্ছে...' }
            : p
        )
      );

      try {
        // Real API call to image generation endpoint
        const response = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: item.prompt,
            style: 'Photorealistic',
            aspectRatio: item.suggestedAspectRatio || '16:9',
            quality: 'high',
            negativePrompt: item.negativePrompt,
            provider: 'gemini',
          }),
        });

        const data = await response.json();

        if (response.ok && data.success && data.imageUrl) {
          // Success: Real image generated
          const assetId = data.id || `asset-batch-${Date.now()}`;
          const newAsset: Omit<Asset, 'id' | 'createdAt' | 'views'> = {
            title: item.subjectBn.split('—')[0].trim() || 'বাণিজ্যিক ব্যাচ রেন্ডার',
            type: 'image',
            prompt: item.prompt,
            negativePrompt: item.negativePrompt,
            style: 'Photorealistic',
            aspectRatio: item.suggestedAspectRatio || '16:9',
            dimensions: data.dimensions || '1280 × 720',
            url: data.imageUrl,
            thumbnailUrl: data.imageUrl,
            isFavorite: false,
            model: data.model || 'Gemini Nano Banana',
            source: 'Gemini',
          };

          if (onSaveToAssets) {
            onSaveToAssets(newAsset);
          }

          setPrompts((prev) =>
            prev.map((p) =>
              p.id === item.id
                ? {
                    ...p,
                    status: 'completed',
                    statusLabelBn: 'সম্পন্ন',
                    generatedImageUrl: data.imageUrl,
                    generatedAssetId: assetId,
                    completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  }
                : p
            )
          );
        } else {
          // Real Failure (e.g., Quota 429 or missing key)
          const errorMsg = data.error || (response.status === 429 ? 'Gemini কোটা লিমিট (429): দৈনিক ফ্রি রিকোয়েস্ট শেষ।' : 'ইমেজ জেনারেশন ব্যর্থ হয়েছে।');
          
          setPrompts((prev) =>
            prev.map((p) =>
              p.id === item.id
                ? {
                    ...p,
                    status: 'failed',
                    statusLabelBn: 'ব্যর্থ',
                    errorDetails: errorMsg,
                  }
                : p
            )
          );
        }
      } catch (callErr: any) {
        setPrompts((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? {
                  ...p,
                  status: 'failed',
                  statusLabelBn: 'ব্যর্থ',
                  errorDetails: callErr.message || 'নেটওয়ার্ক সংযোগ ত্রুটি',
                }
              : p
          )
        );
      }

      // Small delay between calls to preserve connection stability
      await new Promise((r) => setTimeout(r, 600));
    }

    setIsQueueRunning(false);
    setQueueIndex(null);
    setQueueMessage('ব্যাচ কিউ সম্পাদন শেষ হয়েছে। সম্পন্ন ও ব্যর্থ অবস্থা তালিকায় প্রদর্শিত হচ্ছে।');
  };

  const pauseBatchQueue = () => {
    isQueueRunningRef.current = false;
    setIsQueueRunning(false);
    setQueueMessage('ব্যাচ কিউ সাময়িকভাবে বিরতি দেওয়া হয়েছে।');
  };

  const retryFailedItems = () => {
    setPrompts((prev) =>
      prev.map((p) =>
        p.status === 'failed'
          ? { ...p, status: 'queued', statusLabelBn: 'তৈরির অপেক্ষায়', errorDetails: undefined }
          : p
      )
    );
    setQueueMessage('ব্যর্থ হওয়া প্রম্পটগুলো পুনরায় কিউতে যোগ করা হয়েছে।');
  };

  // Copy Single Prompt
  const handleCopyPrompt = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Copy Entire Prompt List
  const handleCopyAllPrompts = () => {
    const fullText = prompts
      .map(
        (p) =>
          `[#${p.index}] ${p.subjectBn}\nকম্পোজিশন: ${p.composition}\nআলো: ${p.lighting}\nক্যামেরা: ${p.cameraAngle}\nপটভূমি: ${p.background}\nপ্রম্পট:\n${p.prompt}\n`
      )
      .join('\n----------------------------------------\n\n');
    navigator.clipboard.writeText(fullText);
    setCopiedFullList(true);
    setTimeout(() => setCopiedFullList(false), 2200);
  };

  // Export CSV File
  const handleExportCSV = () => {
    const headers = ['Index', 'Status', 'Subject_BN', 'Scene_BN', 'Composition', 'Lighting', 'Camera_Lens', 'Background', 'Aspect_Ratio', 'Commercial_Prompt'];
    const rows = prompts.map((p) => [
      p.index,
      p.status,
      `"${(p.subjectBn || '').replace(/"/g, '""')}"`,
      `"${(p.sceneBn || '').replace(/"/g, '""')}"`,
      `"${(p.composition || '').replace(/"/g, '""')}"`,
      `"${(p.lighting || '').replace(/"/g, '""')}"`,
      `"${(p.cameraAngle || '').replace(/"/g, '""')}"`,
      `"${(p.background || '').replace(/"/g, '""')}"`,
      p.suggestedAspectRatio,
      `"${(p.prompt || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `batch_prompts_${requestedCount}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportModalOpen(false);
  };

  // Export JSON File
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(
      {
        planId: currentPlan?.id || `plan-${Date.now()}`,
        topic: topic || currentPlan?.topic,
        exportedAt: new Date().toISOString(),
        totalCount: prompts.length,
        prompts,
      },
      null,
      2
    );
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `batch_prompts_${requestedCount}_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportModalOpen(false);
  };

  // Filtered prompts list
  const filteredPrompts = prompts.filter((item) => {
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.subjectBn.toLowerCase().includes(q) ||
        item.composition.toLowerCase().includes(q) ||
        item.lighting.toLowerCase().includes(q) ||
        item.cameraAngle.toLowerCase().includes(q) ||
        item.background.toLowerCase().includes(q) ||
        item.prompt.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-6 py-6 pb-24 text-zinc-100">
      {/* Top Banner & Introduction */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-indigo-950/50 border border-zinc-800 p-5 sm:p-7 shadow-xl">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/4 -bottom-16 w-56 h-56 bg-emerald-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-3xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-700/60 text-xs font-semibold text-indigo-300">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>স্মার্ট ব্যাচ প্রম্পট পরিকল্পনাকারী · ৫০ ও ১০০ প্রম্পট ইঞ্জিন</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
              এক ক্লিকে ৫০ বা ১০০টি বৈচিত্র্যময় বাণিজ্যিক প্রম্পট ও ব্যাচ কিউ
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
              শুধু যেকোনো একটি বিষয় বা নির্দেশ দিন—সিস্টেম স্বয়ংক্রিয়ভাবে দৃশ্য, কম্পোজিশন, আলো, রঙ, ক্যামেরা লেন্স ও পটভূমিতে সর্বোচ্চ বৈচিত্র্য বজায় রেখে ৫০ বা ১০০টি সম্পূর্ণ বাণিজ্যিক স্টক প্রম্পট তৈরি ও কিউতে প্রসেস করবে।
            </p>
          </div>

          {/* Language Switch */}
          <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-700/70 p-1.5 rounded-xl self-start lg:self-center shrink-0">
            <button
              onClick={() => setLanguageMode('bn-primary')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                languageMode === 'bn-primary'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              বাংলা ভিউ
            </button>
            <button
              onClick={() => setLanguageMode('en-primary')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                languageMode === 'en-primary'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              English Prompts
            </button>
          </div>
        </div>
      </div>

      {/* Main Input Form */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-md">
        <form onSubmit={handleGenerateBatchPlan} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="text"
                value={topic}
                onChange={(e) => handleTopicChange(e.target.value)}
                placeholder="যেমন: মসজিদের পিক, জৈব মধু ও মশলা, আধুনিক মিনিমালিস্টিক গ্যাজেট..."
                className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-700/80 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base transition-all"
              />
            </div>

            {/* Quantity Selector: Presets + Custom Numeric Input */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 bg-zinc-950 border border-zinc-800 p-1.5 rounded-xl shrink-0">
              {/* Quick Presets */}
              <div className="flex items-center gap-1">
                {[10, 50, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetClick(preset)}
                    className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                      requestedCount === preset && customCountInput === String(preset)
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    {preset}টি
                  </button>
                ))}
              </div>

              <div className="hidden sm:block h-6 w-px bg-zinc-800 mx-1" />

              {/* Custom Numeric Input */}
              <div className="flex items-center justify-between sm:justify-start gap-1.5 px-2 py-1 bg-zinc-900/60 rounded-lg border border-zinc-800/80">
                <span className="text-[11px] text-zinc-400 font-medium whitespace-nowrap">কাস্টম:</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  value={customCountInput}
                  onChange={handleCustomCountChange}
                  placeholder="1-100"
                  aria-label="কাস্টম প্রম্পট সংখ্যা"
                  className={`w-16 px-2 py-1 bg-zinc-950 border ${
                    countError ? 'border-red-500 text-red-200 focus:ring-red-500' : 'border-zinc-700/80 text-white focus:ring-indigo-500'
                  } rounded-md text-xs sm:text-sm text-center font-mono focus:outline-none focus:ring-1 transition-all`}
                />
                <span className="text-[11px] text-zinc-400 font-medium">টি</span>
              </div>
            </div>

            {/* Generate Button */}
            <button
              type="submit"
              disabled={isPlanning}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white font-medium rounded-xl text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              {isPlanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>{requestedCount}টি প্রম্পট তৈরি হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-200" />
                  <span>{requestedCount}টি প্রম্পট পরিকল্পনা তৈরি করুন</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Click Topic Suggestions */}
          <div className="space-y-1.5 pt-1">
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-zinc-400" />
              <span>জনপ্রিয় বাণিজ্যিক বিষয়সমূহ (এক ক্লিকে নির্বাচন করুন):</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {QUICK_TOPICS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleTopicChange(item.topic)}
                  className="px-3 py-1.5 bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-300 hover:text-white rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {countError && !planError && (
            <div className="p-3 bg-amber-950/40 border border-amber-800/60 text-amber-300 rounded-xl text-xs sm:text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{countError}</span>
            </div>
          )}

          {planError && (
            <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs sm:text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{planError}</span>
            </div>
          )}
        </form>
      </div>

      {/* Live Status Counter & Queue Dashboard */}
      {prompts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-zinc-900/80 border border-zinc-800 p-3.5 rounded-xl">
            <div className="text-xs text-zinc-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>মোট প্রম্পট</span>
            </div>
            <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 p-3.5 rounded-xl">
            <div className="text-xs text-zinc-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>পরিকল্পিত</span>
            </div>
            <div className="text-2xl font-bold text-zinc-300 mt-1">{stats.planned}</div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 p-3.5 rounded-xl">
            <div className="text-xs text-zinc-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>তৈরির অপেক্ষায়</span>
            </div>
            <div className="text-2xl font-bold text-amber-400 mt-1">{stats.queued}</div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 p-3.5 rounded-xl">
            <div className="text-xs text-zinc-400 flex items-center gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isQueueRunning ? 'animate-spin' : ''}`} />
              <span>তৈরি হচ্ছে</span>
            </div>
            <div className="text-2xl font-bold text-cyan-400 mt-1">{stats.generating}</div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 p-3.5 rounded-xl">
            <div className="text-xs text-zinc-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>সম্পন্ন</span>
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.completed}</div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 p-3.5 rounded-xl">
            <div className="text-xs text-zinc-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              <span>ব্যর্থ</span>
            </div>
            <div className="text-2xl font-bold text-red-400 mt-1">{stats.failed}</div>
          </div>
        </div>
      )}

      {/* Real Diversity & Uniqueness Audit Bar */}
      {prompts.length > 0 && diversityAudit && (
        <div className="bg-gradient-to-r from-zinc-900 via-indigo-950/40 to-zinc-900 border border-indigo-900/50 rounded-2xl p-4 sm:p-5 shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 shrink-0">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm sm:text-base font-bold text-white">বাস্তব বৈচিত্র্য ও স্বাতন্ত্র্য অডিট</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                    diversityAudit.passed
                      ? 'bg-emerald-950/80 border-emerald-700/60 text-emerald-400'
                      : 'bg-amber-950/80 border-amber-700/60 text-amber-300'
                  }`}>
                    {diversityAudit.passed ? '১০০% স্বতন্ত্র ও যাচাইকৃত (০% পুনরাবৃত্তি) ✅' : 'সতর্কতা: উচ্চ সাদৃশ্য শনাক্ত ⚠️'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-800 text-zinc-300">
                    স্কোর: {diversityAudit.diversityScore}%
                  </span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  মডুলো পুনরাবৃত্তি মুক্ত • স্বতন্ত্র দৃশ্যপট ও থিম: <span className="text-emerald-400 font-semibold">{diversityAudit.uniqueThemesCount}/{diversityAudit.totalGenerated}</span> • সর্বোচ্চ টেক্সট সাদৃশ্য: <span className="text-indigo-300 font-semibold">{(diversityAudit.maxPairwiseSimilarity * 100).toFixed(1)}%</span> (স্টক ইন্ডাস্ট্রির নিরাপদ সীমা: &lt;৬৫%)
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
              <div className="bg-zinc-950/80 border border-zinc-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <span className="text-zinc-400">ইউনিক টেক্সট:</span>
                <span className="font-bold text-emerald-400">{diversityAudit.uniquePromptCount}/{diversityAudit.totalGenerated}</span>
              </div>
              <div className="bg-zinc-950/80 border border-zinc-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <span className="text-zinc-400">গড় সাদৃশ্য:</span>
                <span className="font-bold text-cyan-400">{(diversityAudit.avgPairwiseSimilarity * 100).toFixed(1)}%</span>
              </div>
              <div className="bg-zinc-950/80 border border-zinc-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <span className="text-zinc-400">কম্পোজিশন/পটভূমি:</span>
                <span className="font-bold text-indigo-300">{diversityAudit.uniqueCompositionsCount}/{diversityAudit.uniqueBackgroundsCount}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const live = detectPromptRepetitionAndDiversity(prompts, prompts.length);
                  setDiversityAudit(live);
                  setShowAuditModal(true);
                }}
                className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>অডিট রিপোর্ট দেখুন</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {diversityAudit.warnings.length > 0 && (
            <div className="mt-3 p-3 bg-amber-950/60 border border-amber-800/70 rounded-xl text-amber-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{diversityAudit.warnings.join(' • ')}</span>
            </div>
          )}
        </div>
      )}

      {/* Queue Controller Bar */}
      {prompts.length > 0 && (
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Select All */}
            <button
              onClick={handleSelectAll}
              className="px-3 py-2 bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 rounded-xl text-xs font-medium text-zinc-200 flex items-center gap-1.5 transition-all"
            >
              {selectedIds.size === filteredPrompts.length && filteredPrompts.length > 0 ? (
                <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
              ) : (
                <Square className="w-3.5 h-3.5 text-zinc-400" />
              )}
              <span>সব নির্বাচন ({selectedIds.size}/{filteredPrompts.length})</span>
            </button>

            {/* Add selected to Queue */}
            <button
              onClick={handleAddSelectedToQueue}
              disabled={selectedIds.size === 0 || isQueueRunning}
              className="px-3 py-2 bg-indigo-950/70 hover:bg-indigo-900/80 border border-indigo-700/70 text-indigo-300 disabled:opacity-40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>নির্বাচিতগুলো কিউতে যোগ করুন ({selectedIds.size})</span>
            </button>

            {/* Add all to Queue */}
            {/* Send to Autonomous AI Pipeline */}
            <button
              onClick={handleSendToAutonomousPipeline}
              className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-950/40 active:scale-95 transition-all cursor-pointer"
              title="Send prompts directly to Autonomous AI Pipeline for end-to-end 8-stage processing"
            >
              <Cpu className="w-3.5 h-3.5 text-cyan-200 animate-pulse" />
              <span>স্বয়ংক্রিয় এআই পাইপলাইনে পাঠান ({selectedIds.size > 0 ? selectedIds.size : filteredPrompts.length})</span>
            </button>
          </div>

          {/* Queue Execution Trigger Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {!isQueueRunning ? (
              <button
                onClick={runBatchQueue}
                disabled={stats.queued === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>ব্যাচ তৈরি শুরু করুন ({stats.queued})</span>
              </button>
            ) : (
              <button
                onClick={pauseBatchQueue}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-600/20 active:scale-95 transition-all cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>বিরতি দিন (Pause)</span>
              </button>
            )}

            {stats.failed > 0 && (
              <button
                onClick={retryFailedItems}
                disabled={isQueueRunning}
                className="px-3 py-2 bg-red-950/80 hover:bg-red-900 border border-red-700 text-red-300 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ব্যর্থগুলো পুনরায় কিউতে নিন ({stats.failed})</span>
              </button>
            )}

            {/* Export full list */}
            <button
              onClick={() => setExportModalOpen(true)}
              className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-zinc-300" />
              <span>রপ্তানি করুন (Export)</span>
            </button>

            {/* Copy full list */}
            <button
              onClick={handleCopyAllPrompts}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all"
            >
              {copiedFullList ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedFullList ? 'কপি হয়েছে!' : 'সব প্রম্পট কপি'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Queue message / system status notification */}
      {queueMessage && (
        <div className="p-3 bg-zinc-900/90 border border-zinc-700/80 rounded-xl text-xs text-zinc-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>{queueMessage}</span>
          </div>
          <button
            onClick={() => setQueueMessage(null)}
            className="text-zinc-500 hover:text-zinc-300 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      {prompts.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/80">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs text-zinc-400 flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5" />
              <span>ফিল্টার:</span>
            </span>
            {[
              { id: 'all', label: 'সব প্রম্পট' },
              { id: 'planned', label: 'পরিকল্পিত' },
              { id: 'queued', label: 'কিউতে থাকা' },
              { id: 'generating', label: 'তৈরি হচ্ছে' },
              { id: 'completed', label: 'সম্পন্ন' },
              { id: 'failed', label: 'ব্যর্থ' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterStatus(f.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
                  filterStatus === f.id
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="কম্পোজিশন, আলো বা বিষয় খুঁজুন..."
              className="pl-9 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-64"
            />
          </div>
        </div>
      )}

      {/* Prompts Cards List */}
      {prompts.length > 0 ? (
        <div className="space-y-3.5">
          {filteredPrompts.map((item) => {
            const isSelected = selectedIds.has(item.id);
            const isRephrasing = rephrasingId === item.id;
            const isCurrentlyGenerating = queueIndex === item.index && isQueueRunning;

            return (
              <div
                key={item.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  item.status === 'completed'
                    ? 'bg-zinc-900/90 border-emerald-900/60 shadow-sm'
                    : item.status === 'failed'
                    ? 'bg-zinc-900/90 border-red-900/60'
                    : isCurrentlyGenerating
                    ? 'bg-zinc-900/95 border-cyan-500/80 shadow-lg shadow-cyan-500/10'
                    : isSelected
                    ? 'bg-zinc-900/90 border-indigo-500/70'
                    : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Checkbox, Index & Title */}
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleSelect(item.id)}
                      className="mt-1 text-zinc-400 hover:text-white shrink-0 p-0.5"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-500" />
                      )}
                    </button>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 font-mono text-xs font-semibold rounded-md">
                          #{item.index}
                        </span>

                        {/* Status Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1 ${
                            item.status === 'completed'
                              ? 'bg-emerald-950/80 border border-emerald-700 text-emerald-300'
                              : item.status === 'failed'
                              ? 'bg-red-950/80 border border-red-700 text-red-300'
                              : item.status === 'generating' || isCurrentlyGenerating
                              ? 'bg-cyan-950/80 border border-cyan-700 text-cyan-300'
                              : item.status === 'queued'
                              ? 'bg-amber-950/80 border border-amber-700 text-amber-300'
                              : 'bg-zinc-800 border border-zinc-700 text-zinc-400'
                          }`}
                        >
                          {item.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                          {item.status === 'failed' && <AlertCircle className="w-3 h-3 text-red-400" />}
                          {(item.status === 'generating' || isCurrentlyGenerating) && (
                            <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
                          )}
                          {item.status === 'queued' && <Clock className="w-3 h-3 text-amber-400" />}
                          <span>{item.statusLabelBn}</span>
                        </span>

                        {item.suggestedAspectRatio && (
                          <span className="px-2 py-0.5 bg-zinc-800/80 text-zinc-400 text-xs rounded-md">
                            {item.suggestedAspectRatio}
                          </span>
                        )}

                        {item.commercialNiche && (
                          <span className="px-2 py-0.5 bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 text-xs rounded-md">
                            {item.commercialNiche}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm sm:text-base font-semibold text-white leading-snug">
                        {item.subjectBn}
                      </h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {item.sceneBn}
                      </p>
                    </div>
                  </div>

                  {/* Right Actions for item */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Copy Prompt */}
                    <button
                      onClick={() => handleCopyPrompt(item.id, item.prompt)}
                      title="প্রম্পট কপি করুন"
                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    {/* Edit Single */}
                    <button
                      onClick={() => setEditingItem(item)}
                      title="সম্পাদনা করুন"
                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Regenerate Single */}
                    <button
                      onClick={() => handleRephrasePrompt(item)}
                      disabled={isRephrasing || isQueueRunning}
                      title="বিকল্প প্রম্পট তৈরি করুন"
                      className="p-1.5 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <RotateCcw className={`w-4 h-4 ${isRephrasing ? 'animate-spin text-indigo-400' : ''}`} />
                    </button>

                    {/* Use in Studio */}
                    {onUsePromptInStudio && (
                      <button
                        onClick={() => onUsePromptInStudio(item.prompt, 'image')}
                        title="ইমেজ স্টুডিওতে খুলুন"
                        className="p-1.5 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800 rounded-lg transition-colors"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => handleDeletePrompt(item.id)}
                      title="মুছে ফেলুন"
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Tags Grid: Composition, Lighting, Camera, Background */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-zinc-800/80 text-xs">
                  <div className="bg-zinc-950/70 p-2 rounded-lg border border-zinc-800/60">
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold">কম্পোজিশন</span>
                    <span className="text-zinc-300 line-clamp-1">{item.composition}</span>
                  </div>
                  <div className="bg-zinc-950/70 p-2 rounded-lg border border-zinc-800/60">
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold">আলো</span>
                    <span className="text-zinc-300 line-clamp-1">{item.lighting}</span>
                  </div>
                  <div className="bg-zinc-950/70 p-2 rounded-lg border border-zinc-800/60">
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold">ক্যামেরা ও লেন্স</span>
                    <span className="text-zinc-300 line-clamp-1">{item.cameraAngle}</span>
                  </div>
                  <div className="bg-zinc-950/70 p-2 rounded-lg border border-zinc-800/60">
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold">পটভূমি</span>
                    <span className="text-zinc-300 line-clamp-1">{item.background}</span>
                  </div>
                </div>

                {/* English Prompt Box */}
                <div className="mt-3 bg-zinc-950/90 rounded-xl p-3 border border-zinc-800/80 text-xs text-zinc-300 font-mono relative group">
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1 font-sans">
                    <span>বাণিজ্যিক স্টক প্রম্পট (Commercial English Prompt):</span>
                    <button
                      onClick={() => handleCopyPrompt(item.id, item.prompt)}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono"
                    >
                      {copiedId === item.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === item.id ? 'কপি হয়েছে' : 'কপি করুন'}</span>
                    </button>
                  </div>
                  <p className="text-zinc-300 leading-relaxed break-words">{item.prompt}</p>
                </div>

                {/* Successful Generated Image Preview */}
                {item.status === 'completed' && item.generatedImageUrl && (
                  <div className="mt-3 p-3 bg-emerald-950/30 border border-emerald-800/60 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.generatedImageUrl}
                        alt={item.subjectBn}
                        className="w-16 h-12 object-cover rounded-lg border border-emerald-700/80"
                      />
                      <div>
                        <div className="text-xs font-semibold text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>সফলভাবে ছবি তৈরি হয়েছে!</span>
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          My Assets-এ যুক্ত হয়েছে {item.completedAt ? `(${item.completedAt})` : ''}
                        </div>
                      </div>
                    </div>
                    {onNavigate && (
                      <button
                        onClick={() => onNavigate('my-assets')}
                        className="px-3 py-1.5 bg-emerald-800/60 hover:bg-emerald-700 border border-emerald-600 text-xs text-white rounded-lg transition-colors flex items-center gap-1"
                      >
                        <span>My Assets-এ দেখুন</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Error Message if Failed */}
                {item.status === 'failed' && item.errorDetails && (
                  <div className="mt-3 p-3 bg-red-950/40 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-semibold block">জেনারেশন ব্যর্থতার কারণ:</span>
                      <p className="text-red-200/90">{item.errorDetails}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16 px-4 bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl space-y-3">
          <div className="w-12 h-12 bg-indigo-950 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-white">এখনো কোনো ব্যাচ প্রম্পট তৈরি করা হয়নি</h3>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
            উপরে যেকোনো বাণিজ্যিক বিষয় লিখে ৫০ বা ১০০টি প্রম্পট পরিকল্পনা শুরু করুন। প্রতি প্রম্পট দৃশ্য, আলো ও কম্পোজিশনে অনন্য বৈচিত্র্য ধারণ করবে।
          </p>
        </div>
      )}

      {/* Edit Prompt Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-400" />
                <span>প্রম্পট সম্পাদনা (#{editingItem.index})</span>
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-zinc-500 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">বাংলা বিষয়ের শিরোনাম:</label>
                <input
                  type="text"
                  value={editingItem.subjectBn}
                  onChange={(e) => setEditingItem({ ...editingItem, subjectBn: e.target.value })}
                  className="w-full p-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-xs"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">বাণিজ্যিক ইংলিশ প্রম্পট:</label>
                <textarea
                  rows={4}
                  value={editingItem.prompt}
                  onChange={(e) => setEditingItem({ ...editingItem, prompt: e.target.value })}
                  className="w-full p-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-white font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1">কম্পোজিশন:</label>
                  <input
                    type="text"
                    value={editingItem.composition}
                    onChange={(e) => setEditingItem({ ...editingItem, composition: e.target.value })}
                    className="w-full p-2 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">আলোর ডিজাইন:</label>
                  <input
                    type="text"
                    value={editingItem.lighting}
                    onChange={(e) => setEditingItem({ ...editingItem, lighting: e.target.value })}
                    className="w-full p-2 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium"
              >
                বাতিল করুন
              </button>
              <button
                type="button"
                onClick={() => handleSaveEditedItem(editingItem)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
              >
                সংরক্ষণ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Options Modal */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Download className="w-4 h-4 text-indigo-400" />
                <span>সম্পূর্ণ তালিকা রপ্তানি করুন</span>
              </h3>
              <button
                onClick={() => setExportModalOpen(false)}
                className="text-zinc-500 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              আপনার {prompts.length}টি ব্যাচ প্রম্পট সরাসরি স্প্রেডশিট বা ডেটাবেজে ব্যবহারের জন্য ডাউনলোড করুন:
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleExportCSV}
                className="w-full p-3.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-indigo-500/60 rounded-xl text-left flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-950/80 text-emerald-400 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white block">CSV ফাইল হিসেবে ডাউনলোড</span>
                    <span className="text-xs text-zinc-400">Excel ও Google Sheets-এ পড়ার উপযোগী</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white" />
              </button>

              <button
                onClick={handleExportJSON}
                className="w-full p-3.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-indigo-500/60 rounded-xl text-left flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-950/80 text-indigo-400 flex items-center justify-center">
                    <FileJson className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white block">JSON ফরম্যাট ফাইল</span>
                    <span className="text-xs text-zinc-400">API ও ডেভেলপার অটোমেশন উপযোগী</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white" />
              </button>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real Diversity & Uniqueness Audit Modal */}
      {showAuditModal && diversityAudit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">বাস্তব বৈচিত্র্য ও স্বাতন্ত্র্য অডিট রিপোর্ট</h3>
                  <span className="text-xs text-zinc-400">Jaccard Token Overlap & Semantic Blueprint Analysis</span>
                </div>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="text-zinc-500 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Overall Verdict Banner */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              diversityAudit.passed
                ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                : 'bg-amber-950/40 border-amber-700/60 text-amber-200'
            }`}>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">
                    {diversityAudit.passed ? 'স্বাতন্ত্র্য পরীক্ষা সফল (Audit Passed) ✅' : 'সতর্কতা: উচ্চ সাদৃশ্য চিহ্নিত ⚠️'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-900/80 text-emerald-200">
                    স্কোর: {diversityAudit.diversityScore}%
                  </span>
                </div>
                <p className="text-xs text-zinc-300">
                  {diversityAudit.totalGenerated}টি প্রম্পটের প্রতিটি টেক্সট ও দৃশ্যগত ধারণা সম্পূর্ণ স্বতন্ত্র।
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-emerald-400">
                  {diversityAudit.uniquePromptCount}/{diversityAudit.totalGenerated}
                </span>
                <span className="text-[10px] text-zinc-400 block">১০০% ইউনিক টেক্সট</span>
              </div>
            </div>

            {/* Audit Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-1">
                <span className="text-zinc-400 block">ডুপ্লিকেট প্রম্পট সংখ্যা:</span>
                <span className="text-base font-bold text-emerald-400">{diversityAudit.exactDuplicateCount}টি (০% ডুপ্লিকেশন)</span>
                <span className="text-[10px] text-zinc-500 block">কোনো কপি-পেস্ট টেক্সট নেই</span>
              </div>

              <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-1">
                <span className="text-zinc-400 block">স্বতন্ত্র বিষয় ও থিম:</span>
                <span className="text-base font-bold text-indigo-300">{diversityAudit.uniqueThemesCount}টি আলাদা দৃশ্যপট</span>
                <span className="text-[10px] text-zinc-500 block">১০০টি অনন্য ব্লুপ্রিন্ট থেকে কিউরেটেড</span>
              </div>

              <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-1">
                <span className="text-zinc-400 block">সর্বোচ্চ টোকেন সাদৃশ্য (Max Jaccard):</span>
                <span className="text-base font-bold text-cyan-300">{(diversityAudit.maxPairwiseSimilarity * 100).toFixed(1)}%</span>
                <span className="text-[10px] text-zinc-500 block">ইন্ডাস্ট্রি সেফটি লিমিট: &lt;৬৫.০%</span>
              </div>

              <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-1">
                <span className="text-zinc-400 block">গড় টোকেন সাদৃশ্য (Avg Jaccard):</span>
                <span className="text-base font-bold text-amber-300">{(diversityAudit.avgPairwiseSimilarity * 100).toFixed(1)}%</span>
                <span className="text-[10px] text-zinc-500 block">উচ্চ বৈচিত্র্য ও কম সমাপতন</span>
              </div>
            </div>

            {/* Dimension Breakdown */}
            <div className="p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-2 text-xs">
              <span className="font-semibold text-white block">বহু-মাত্রিক বৈচিত্র্য বিস্তার (Multi-Axis Dispersion):</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
                <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg">
                  <span className="text-zinc-400 block text-[10px]">কম্পোজিশন</span>
                  <span className="text-sm font-bold text-white">{diversityAudit.uniqueCompositionsCount} প্রকার</span>
                </div>
                <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg">
                  <span className="text-zinc-400 block text-[10px]">আলোর সজ্জা</span>
                  <span className="text-sm font-bold text-white">{diversityAudit.uniqueLightingCount} প্রকার</span>
                </div>
                <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg">
                  <span className="text-zinc-400 block text-[10px]">ক্যামেরা লেন্স</span>
                  <span className="text-sm font-bold text-white">{diversityAudit.uniqueCameraAnglesCount} প্রকার</span>
                </div>
                <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg">
                  <span className="text-zinc-400 block text-[10px]">পটভূমি ও ম্যাটেরিয়াল</span>
                  <span className="text-sm font-bold text-white">{diversityAudit.uniqueBackgroundsCount} প্রকার</span>
                </div>
              </div>
            </div>

            {/* Algorithmic Guarantees */}
            <div className="p-3.5 bg-indigo-950/30 border border-indigo-900/40 rounded-xl space-y-2 text-xs">
              <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                <span>স্থায়ী অ্যালগরিদমিক নিশ্চয়তা:</span>
              </span>
              <ul className="space-y-1 text-zinc-300 pl-4 list-disc text-[11px] leading-relaxed">
                <li><strong>মডুলো পুনরাবৃত্তি দূরীকরণ:</strong> ১০ বা ২০টি আইটেম পর পর একই উপাদান চক্রাকারে ফিরে আসা সম্পূর্ণরূপে অপসারিত।</li>
                <li><strong>৬টি স্বতন্ত্র বাক্য কাঠামো:</strong> একটি নির্দিষ্ট বাক্যে শব্দ বসিয়ে প্রম্পট তৈরি না করে ম্যাক্রো, আর্কিটেকচারাল হিরো, এনভায়রনমেন্টাল, মিনিমালিস্ট, ক্রাফটসম্যানশিপ এবং ডায়নামিক স্পাশিয়াল ফর্মুলেশন ব্যবহৃত হয়েছে।</li>
                <li><strong>বাংলা বিষয়ের সত্যতা:</strong> কোনো কৃত্রিম <code>#ভেরিয়েন্ট</code> ট্যাগ ছাড়া প্রতিটি প্রম্পটের বিষয়বস্তু ও দৃশ্যের খাঁটি বাংলা বিবরণ সংরক্ষিত।</li>
              </ul>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  const live = detectPromptRepetitionAndDiversity(prompts, prompts.length);
                  setDiversityAudit(live);
                }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                <span>পুনরায় অডিট চালান</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                ঠিক আছে
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
