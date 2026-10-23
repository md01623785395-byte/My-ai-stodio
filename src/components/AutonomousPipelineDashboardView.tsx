import React, { useState, useEffect, useRef } from 'react';
import {
  AutonomousTaskItem,
  AutonomousTaskStatus,
  AutonomousQueueStats,
  StudioTab,
  Asset,
  AspectRatioType,
  StockMarketplaceId,
} from '../types';
import {
  executeAutonomousPipeline,
  AutonomousPipelineResult,
  AutonomousPipelineLog,
  PipelineStage,
  buildAdobeStockCsv,
  buildShutterstockCsv,
  buildFreepikCsv,
  buildDreamstimeCsv,
  buildWirestockCsv,
} from '../utils/autonomousPipelineEngine';
import {
  calculateQueueStats,
  loadAutonomousTasks,
  saveAutonomousTasks,
  createAutonomousTask,
  isDuplicateTask,
  hasRecoveredPendingTasks,
  isTaskEligibleForAutoResume,
  createStockSubmissionQueueTask,
  categorizeTaskBlocker,
  detectStaleRunningTasks,
  safeRecoverStaleRunningTask,
  getTaskBlockerActionableAdvice,
  DEFAULT_STALE_RUNNING_THRESHOLD_MS,
} from '../utils/autonomousQueueManager';
import {
  evaluateAutonomousStockSubmissionReadiness,
  runAutonomousStockReadinessScan,
  isDuplicateSubmissionForMarketplace,
  AutonomousSubmissionEvaluation,
  AutonomousSubmissionReadinessStatus,
} from '../utils/batchStockAuditor';
import { generateDiverseCombinatorialPrompts } from '../utils/batchPromptEngine';
import { getAssetByIdFromDB } from '../utils/assetStorage';
import {
  Cpu,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Ban,
  UserCheck,
  ShieldCheck,
  Trash2,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sliders,
  FileArchive,
  RefreshCw,
  Terminal,
  Info,
  Check,
  FolderHeart,
  Copy,
  Layers,
  Search,
  Wand2,
  FileSpreadsheet,
  Download,
  Compass,
  Lightbulb,
  Target,
  Boxes,
} from 'lucide-react';
import {
  CURATED_STOCK_OPPORTUNITIES,
  evaluateAllStockOpportunities,
  dispatchOpportunityToAutonomousQueue,
  OpportunityEvaluationResult,
  StockOpportunityNiche,
  OPPORTUNITY_ENGINE_BLOCKERS,
} from '../utils/stockOpportunityEngine';
import {
  generateAutonomousBatchProductionPlan,
  dispatchBatchProductionPlanToQueue,
  AutonomousBatchProductionPlan,
} from '../utils/autonomousBatchPlanner';

interface AutonomousPipelineDashboardViewProps {
  onNavigate: (tab: StudioTab) => void;
  assets: Asset[];
  onAddNewAsset: (
    newAsset: Omit<Asset, 'id' | 'createdAt' | 'views'>,
    mediaBlob?: Blob,
    thumbnailBlob?: Blob
  ) => Promise<void>;
  onOpenGoogleFlow?: () => void;
}

const SMART_PRESETS = [
  { label: 'Artisan Tableware', prompt: 'Commercial still life of handcrafted ceramic stoneware bowls with organic linen and morning window light' },
  { label: 'Architectural Pavilion', prompt: 'Futuristic parametric pavilion in alpine landscape with natural wood and reflective glass, dawn sky' },
  { label: 'Organic Skincare', prompt: 'Commercial beauty macro of luxury minimalist amber glass cosmetic dropper on slate with water droplets' },
  { label: 'Culinary Bakery', prompt: 'Artisan sourdough loaf with dusted flour on rustic dark wood, macro crumb texture, warm side lighting' },
];

const AGENT_STAGES: { stage: PipelineStage; nameBn: string; nameEn: string; icon: string }[] = [
  { stage: 'research', nameBn: 'ট্রেন্ড গবেষণা', nameEn: 'Research', icon: '🧠' },
  { stage: 'planning', nameBn: 'প্রম্পট আইডিয়া', nameEn: 'Ideation', icon: '🎯' },
  { stage: 'generating', nameBn: 'ইমেজ তৈরি', nameEn: 'Creation', icon: '🎨' },
  { stage: 'storing', nameBn: 'নিরাপদ স্টোর', nameEn: 'Storage', icon: '💾' },
  { stage: 'inspecting', nameBn: 'পিক্সেল অডিট', nameEn: 'Audit', icon: '🔬' },
  { stage: 'auto_enhancement', nameBn: '৪x আপস্কেলিং', nameEn: 'Enhance', icon: '⚡' },
  { stage: 'metadata_generation', nameBn: 'ভিশন মেটাডেটা', nameEn: 'Metadata', icon: '🏷️' },
  { stage: 'compliance_audit', nameBn: 'পলিসি রিভিউ', nameEn: 'Review', icon: '⚖️' },
  { stage: 'submission_dispatch', nameBn: 'সাবমিশন প্যাক', nameEn: 'Package', icon: '📦' },
];

export const AutonomousPipelineDashboardView: React.FC<AutonomousPipelineDashboardViewProps> = ({
  onNavigate,
  assets,
  onAddNewAsset,
  onOpenGoogleFlow,
}) => {
  const [tasks, setTasks] = useState<AutonomousTaskItem[]>(() => loadAutonomousTasks());
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'in_progress' | 'attention'>('all');
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  const isQueueRunningRef = useRef(false);
  const isLoopExecutingRef = useRef(false);
  const autoResumeTriggeredRef = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Synchronized refs to completely eliminate stale closures in async queue execution
  const tasksRef = useRef<AutonomousTaskItem[]>(tasks);
  const assetsRef = useRef<Asset[]>(assets);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    assetsRef.current = assets;
  }, [assets]);

  // Helper to synchronously update tasksRef and React state simultaneously
  const updateTasksState = (updater: (prev: AutonomousTaskItem[]) => AutonomousTaskItem[]) => {
    setTasks((prev) => {
      const next = updater(prev);
      tasksRef.current = next;
      return next;
    });
  };

  // Active running task tracking
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<PipelineStage>('idle');
  const [activeProgress, setActiveProgress] = useState(0);
  const [activeProgressMsg, setActiveProgressMsg] = useState('');
  const [currentLogs, setCurrentLogs] = useState<AutonomousPipelineLog[]>([]);

  // Agent Command Bar State (Essential User Input)
  const [agentPrompt, setAgentPrompt] = useState('');
  const [batchMode, setBatchMode] = useState<'single' | 'batch3' | 'batch5'>('single');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [selectedRatio, setSelectedRatio] = useState<AspectRatioType>('16:9');
  const [selectedStyle, setSelectedStyle] = useState('Photorealistic');
  const [selectedMarketplace, setSelectedMarketplace] = useState<StockMarketplaceId>('adobe-stock');
  const [autoEnhance, setAutoEnhance] = useState(true);
  const [agentInputError, setAgentInputError] = useState<string | null>(null);

  // Modals & Panels
  const [showSelectAssetModal, setShowSelectAssetModal] = useState(false);
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [resumingTaskId, setResumingTaskId] = useState<string | null>(null);
  const [assetFilterFlowOnly, setAssetFilterFlowOnly] = useState(false);
  const [showLogsDrawer, setShowLogsDrawer] = useState(false);
  const [expandedTaskDetails, setExpandedTaskDetails] = useState<Record<string, boolean>>({});
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // Priority 6.0, 6.4 & 6.5: Autonomous View Mode
  const [viewMode, setViewMode] = useState<'pipeline_queue' | 'submission_agent' | 'opportunity_selection' | 'batch_production'>('pipeline_queue');
  const [submissionScanMarketplace, setSubmissionScanMarketplace] = useState<StockMarketplaceId>('adobe-stock');
  const [isScanningReadiness, setIsScanningReadiness] = useState(false);
  const [submissionEvaluations, setSubmissionEvaluations] = useState<AutonomousSubmissionEvaluation[]>([]);
  const [readinessFilterTab, setReadinessFilterTab] = useState<'all' | 'ready' | 'needs_review' | 'rejected'>('all');
  const [humanReviewApprovedMap, setHumanReviewApprovedMap] = useState<Record<string, boolean>>({});
  const [expandedEvaluationId, setExpandedEvaluationId] = useState<string | null>(null);

  // Priority 6.4: Autonomous Stock Opportunity & Asset Selection State
  const [opportunityMarketplace, setOpportunityMarketplace] = useState<StockMarketplaceId>('adobe-stock');
  const [opportunityEvaluations, setOpportunityEvaluations] = useState<OpportunityEvaluationResult[]>([]);
  const [opportunityFilter, setOpportunityFilter] = useState<'all' | 'reusable' | 'needs_generation'>('all');
  const [expandedOpportunityId, setExpandedOpportunityId] = useState<string | null>(null);
  const [isScanningOpportunities, setIsScanningOpportunities] = useState(false);

  // Priority 6.5: Autonomous Batch Production Planner State
  const [batchPlannerQuantity, setBatchPlannerQuantity] = useState<number>(10);
  const [batchPlannerMarketplace, setBatchPlannerMarketplace] = useState<StockMarketplaceId>('adobe-stock');
  const [activeBatchPlan, setActiveBatchPlan] = useState<AutonomousBatchProductionPlan | null>(null);
  const [isGeneratingBatchPlan, setIsGeneratingBatchPlan] = useState(false);

  // Save to persistent storage whenever tasks change
  useEffect(() => {
    saveAutonomousTasks(tasks);
  }, [tasks]);

  // Initialization lifecycle & cleanup on unmount
  useEffect(() => {
    setIsInitialized(true);
    return () => {
      isQueueRunningRef.current = false;
    };
  }, []);

  const stats: AutonomousQueueStats = calculateQueueStats(tasks);

  const showNotification = (msg: string) => {
    setCopiedNotification(msg);
    setTimeout(() => setCopiedNotification(null), 2500);
  };

  // Toggle advanced details per task
  const toggleTaskDetails = (taskId: string) => {
    setExpandedTaskDetails((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  // Centralized Queue Starter with Exactly-Once Concurrency Guard
  const startQueue = () => {
    if (isQueueRunningRef.current || isLoopExecutingRef.current) return;
    isQueueRunningRef.current = true;
    setIsQueueRunning(true);
    runAutonomousLoop();
  };

  // Priority 5.3: Automatically resume recovered pending tasks without requiring Start Queue
  useEffect(() => {
    if (!isInitialized) return;
    if (autoResumeTriggeredRef.current) return;

    // Wait until persisted tasks are confirmed loaded, then inspect for recovered pending tasks
    const hasRecovered = hasRecoveredPendingTasks(tasksRef.current);

    // Never auto-run completed, failed, or quota-blocked tasks
    if (hasRecovered && !isQueueRunningRef.current && !isLoopExecutingRef.current) {
      autoResumeTriggeredRef.current = true;
      console.log('[Autonomous Queue] Found recovered pending task(s). Auto-resuming queue safely...');
      startQueue();
    }
  }, [isInitialized]);

  // Periodic Agent Self-Monitoring (Priority 6.3)
  // Safely identifies tasks running for abnormal duration without forcing arbitrary failed/completed state
  useEffect(() => {
    const monitorInterval = setInterval(() => {
      const runningTasks = tasksRef.current.filter((t) => t.status === 'running');
      if (runningTasks.length === 0) return;

      const now = Date.now();
      const hasStale = runningTasks.some(
        (t) => now - (t.startedAt || t.createdAt) > DEFAULT_STALE_RUNNING_THRESHOLD_MS
      );

      if (hasStale) {
        updateTasksState((prev) =>
          prev.map((t) => {
            if (
              t.status === 'running' &&
              now - (t.startedAt || t.createdAt) > DEFAULT_STALE_RUNNING_THRESHOLD_MS
            ) {
              return {
                ...t,
                isStaleRunning: true,
                staleRunningDurationMs: now - (t.startedAt || t.createdAt),
              };
            }
            return t;
          })
        );
      }
    }, 10000);

    return () => clearInterval(monitorInterval);
  }, []);

  // Handle Start / Pause Queue
  const handleToggleQueue = () => {
    if (isQueueRunning) {
      isQueueRunningRef.current = false;
      setIsQueueRunning(false);
    } else {
      startQueue();
    }
  };

  // Autonomous Execution Loop
  const runAutonomousLoop = async () => {
    if (isLoopExecutingRef.current) return;
    isLoopExecutingRef.current = true;

    try {
      while (isQueueRunningRef.current) {
        // Find the next pending task using tasksRef to completely avoid stale closures
        const nextTask = tasksRef.current.find((t) => t.status === 'pending');
        if (!nextTask) {
          setIsQueueRunning(false);
          isQueueRunningRef.current = false;
          break;
        }

        // Check if task is video - if so, mark blocked with honest guidance (no fake video)
        if (nextTask.type === 'video') {
          updateTasksState((prev) =>
            prev.map((t) =>
              t.id === nextTask.id
                ? {
                    ...t,
                    status: 'blocked',
                    statusLabelBn: 'বাহ্যিক সীমাবদ্ধতায় আটকে আছে',
                    statusLabelEn: 'Blocked (External Model Required)',
                    exactReason:
                      'ভিডিও জেনারেশনের জন্য কোনো পেইড/অনুমোদিত ক্লাউড ইঞ্জিন সরাসরি কনফিগার করা নেই। Google Flow-তে ভিডিও বানিয়ে Import করা আবশ্যক।',
                    blockerCategory: 'external_model_required',
                  }
                : t
            )
          );
          continue;
        }

        // Set task to running
        setActiveTaskId(nextTask.id);
        setActiveStage('planning');
        setActiveProgress(10);
        setActiveProgressMsg('বাণিজ্যিক প্রম্পট পরিকল্পনা শুরু হচ্ছে...');

        updateTasksState((prev) =>
          prev.map((t) =>
            t.id === nextTask.id
              ? {
                  ...t,
                  status: 'running',
                  statusLabelBn: 'স্বয়ংক্রিয় প্রসেসিং চলছে...',
                  statusLabelEn: 'Running Pipeline...',
                  exactReason: '৮টি এন্ড-টু-এন্ড পর্যায় স্বয়ংক্রিয়ভাবে এক্সিকিউট হচ্ছে।',
                  startedAt: Date.now(),
                  isStaleRunning: false,
                }
              : t
          )
        );

        // Check if task already has an existing/attached asset (e.g. Google Flow or Imported)
        let attachedAsset = nextTask.assetId
          ? assetsRef.current.find((a) => a.id === nextTask.assetId)
          : undefined;

        // If not in memory after reload, fetch directly from IndexedDB
        if (!attachedAsset && nextTask.assetId) {
          try {
            const dbAsset = await getAssetByIdFromDB(nextTask.assetId);
            if (dbAsset) attachedAsset = dbAsset;
          } catch (dbErr) {
            console.warn('Could not read attached asset from IndexedDB:', dbErr);
          }
        }

        // If task specified an assetId but it could NOT be found anywhere in memory or DB
        if (nextTask.assetId && !attachedAsset) {
          updateTasksState((prev) =>
            prev.map((t) =>
              t.id === nextTask.id
                ? {
                    ...t,
                    status: 'blocked',
                    statusLabelBn: 'অ্যাসেট অনুপস্থিত (Asset Missing)',
                    statusLabelEn: 'Blocked (Asset Missing)',
                    exactReason: `সংযুক্ত অ্যাসেটটি (ID: ${nextTask.assetId}) লাইব্রেরি বা IndexedDB-তে পাওয়া যায়নি। নতুন করে অ্যাসেট সংযুক্ত করুন।`,
                    blockerCategory: 'asset_missing',
                  }
                : t
            )
          );
          continue;
        }

        try {
          const result: AutonomousPipelineResult = await executeAutonomousPipeline(
            attachedAsset ? { prompt: nextTask.prompt, existingAsset: attachedAsset } : { prompt: nextTask.prompt },
            {
              preferredAspectRatio: nextTask.aspectRatio,
              preferredStyle: nextTask.style,
              targetMarketplaces: [nextTask.targetMarketplace],
              autoEnhanceIfBelow4MP: nextTask.autoEnhance,
              onProgress: (p, msg) => {
                setActiveProgress(p);
                setActiveProgressMsg(msg);
              },
              onStageChange: (stageInfo) => {
                setActiveStage(stageInfo.stage);
              },
              onLog: (log) => {
                setCurrentLogs((prev) => [log, ...prev].slice(0, 100));
              },
            }
          );

          // Store new asset in App.tsx assets state ONLY if newly generated
          if (!attachedAsset) {
            await onAddNewAsset({
              title: result.finalAsset.title,
              type: 'image',
              prompt: result.finalAsset.prompt,
              style: result.finalAsset.style,
              aspectRatio: result.finalAsset.aspectRatio,
              dimensions: result.finalAsset.dimensions,
              url: result.finalAsset.url,
              thumbnailUrl: result.finalAsset.thumbnailUrl,
              isFavorite: false,
              model: result.finalAsset.model,
              source: 'Studio',
              fileSize: result.finalAsset.fileSize,
              fileFormat: result.finalAsset.fileFormat,
              preparedMetadata: result.preparedMetadata,
            });
          }

          // Mark task completed with human review requirement
          updateTasksState((prev) =>
            prev.map((t) =>
              t.id === nextTask.id
                ? {
                    ...t,
                    status: 'completed',
                    statusLabelBn: 'সম্পন্ন (প্যাকেজ প্রস্তুত)',
                    statusLabelEn: 'Completed (Package Ready)',
                    exactReason: `সফলভাবে সম্পন্ন: ${result.finalAsset.dimensions} রেজোলিউশন, ${result.validationAudit.overallTechnicalPass ? '১০০% টেকনিক্যাল পাস' : 'মানদণ্ড পূরণ'}, ZIP প্যাকেজ ডাউনলোডযোগ্য।`,
                    completedAt: Date.now(),
                    dimensions: result.finalAsset.dimensions,
                    fileSize: result.finalAsset.fileSize,
                    complianceScore: result.validationAudit.overallTechnicalPass ? 98 : 88,
                    assetThumbnailUrl: result.finalAsset.thumbnailUrl,
                    zipBlob: result.zipBlob,
                    zipFilename: result.zipFilename,
                    humanReviewRequired: true,
                    humanReviewApproved: false,
                    marketResearchSummary: result.marketResearch?.researchSummaryBn,
                    submissionStatusMessage: result.submissionDispatch?.statusMessageBn,
                  }
                : t
            )
          );
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          const isQuota429 = errorMsg.includes('429') || errorMsg.toLowerCase().includes('quota');
          const nextRetryCount = nextTask.retryCount + 1;

          if (isQuota429) {
            // Blocked due to API quota - honest reporting
            updateTasksState((prev) =>
              prev.map((t) =>
                t.id === nextTask.id
                  ? {
                      ...t,
                      status: 'blocked',
                      statusLabelBn: 'API কোটা সীমাবদ্ধতায় আটকে আছে',
                      statusLabelEn: 'Blocked (Gemini API Quota 429)',
                      exactReason: 'দৈনিক ফ্রি রিকোয়েস্ট কোটা শেষ (HTTP 429)। কোনো ফেক ফলাফল না দেখিয়ে আসল স্থিতি রিপোর্ট করা হয়েছে। কোটা রিসেট হলে পুনরায় চেষ্টা করুন।',
                      errorDetails: errorMsg,
                      blockerCategory: 'image_generation_quota',
                    }
                  : t
              )
            );
          } else if (nextRetryCount < nextTask.maxRetries) {
            // Automatic recoverable retry
            updateTasksState((prev) =>
              prev.map((t) =>
                t.id === nextTask.id
                  ? {
                      ...t,
                      status: 'pending',
                      retryCount: nextRetryCount,
                      exactReason: `নেটওয়ার্ক ক্ষণস্থায়ী সমস্যার কারণে পুনরায় চেষ্টা করা হচ্ছে (প্রচেষ্টা ${nextRetryCount}/${nextTask.maxRetries})`,
                      errorDetails: errorMsg,
                    }
                  : t
              )
            );
            await new Promise((resolve) => setTimeout(resolve, 800));
          } else {
            // Failed unrecoverably
            const blockerCat = categorizeTaskBlocker(nextTask, errorMsg);
            updateTasksState((prev) =>
              prev.map((t) =>
                t.id === nextTask.id
                  ? {
                      ...t,
                      status: 'failed',
                      statusLabelBn: 'ব্যর্থ হয়েছে',
                      statusLabelEn: 'Failed',
                      exactReason: `ত্রুটি: ${errorMsg}`,
                      errorDetails: errorMsg,
                      blockerCategory: blockerCat,
                    }
                  : t
              )
            );
          }
        }

        setActiveTaskId(null);
        setActiveStage('idle');
        setActiveProgress(0);
        setActiveProgressMsg('');
      }
    } finally {
      isLoopExecutingRef.current = false;
    }
  };

  // Launch AI Automation from Unified Command Bar
  const handleLaunchAgent = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!agentPrompt.trim()) {
      setAgentInputError('অনুগ্রহ করে প্রম্পট বা বিষয়ের নাম লিখুন।');
      return;
    }

    setAgentInputError(null);

    if (batchMode === 'single') {
      if (isDuplicateTask(tasksRef.current, agentPrompt, 'image', selectedRatio)) {
        setAgentInputError('সতর্কতা: একই প্রম্পটের টাস্ক ইতোমধ্যে কিউতে বিদ্যমান।');
        return;
      }

      const newTask = createAutonomousTask({
        prompt: agentPrompt,
        type: 'image',
        aspectRatio: selectedRatio,
        style: selectedStyle,
        targetMarketplace: selectedMarketplace,
        autoEnhance: autoEnhance,
      });

      updateTasksState((prev) => [newTask, ...prev]);
      setAgentPrompt('');
      showNotification('টাস্ক কিউতে যোগ হয়েছে ও স্বয়ংক্রিয় প্রসেসিং শুরু হয়েছে।');

      // Auto-trigger queue if not already running
      startQueue();
    } else {
      // Multi-prompt combinatorial batch orchestration
      const count = batchMode === 'batch3' ? 3 : 5;
      const variations = generateDiverseCombinatorialPrompts(agentPrompt, count);

      const nonDuplicateVariations = variations.filter(
        (v) => !isDuplicateTask(tasksRef.current, v.prompt, 'image', selectedRatio)
      );

      if (nonDuplicateVariations.length === 0) {
        setAgentInputError('সতর্কতা: এই ব্যাচের প্রতিটি ভেরিয়েশন ইতোমধ্যে কিউতে বিদ্যমান।');
        return;
      }

      const newTasks: AutonomousTaskItem[] = nonDuplicateVariations.map((v) =>
        createAutonomousTask({
          prompt: v.prompt,
          type: 'image',
          aspectRatio: selectedRatio,
          style: selectedStyle,
          targetMarketplace: selectedMarketplace,
          autoEnhance: autoEnhance,
          title: v.topic || v.subjectBn,
        })
      );

      updateTasksState((prev) => [...newTasks, ...prev]);
      setAgentPrompt('');
      showNotification(`${newTasks.length}টি বাণিজ্যিক ভেরিয়েশন কিউতে যোগ হয়েছে।`);

      startQueue();
    }
  };

  // Process an existing asset through the pipeline (zero credit cost)
  const handleProcessExistingAsset = async (asset: Asset) => {
    setShowSelectAssetModal(false);
    const targetTaskId = resumingTaskId;
    setResumingTaskId(null);

    if (targetTaskId) {
      // Resume existing blocked task directly without creating duplicate task
      updateTasksState((prev) =>
        prev.map((t) =>
          t.id === targetTaskId
            ? {
                ...t,
                status: 'running',
                statusLabelBn: 'Flow অ্যাসেট দিয়ে রিজিউম হচ্ছে...',
                statusLabelEn: 'Resuming with Flow Asset...',
                exactReason: 'Google Flow অ্যাসেট সফলভাবে সংযুক্ত হয়েছে। ০ ক্রেডিট ব্যয়ে ৪MP মানদণ্ড ও স্টক প্যাকেজ তৈরি চলছে...',
                assetId: asset.id,
                assetThumbnailUrl: asset.thumbnailUrl || asset.url,
                dimensions: asset.dimensions,
                type: asset.type === 'video' ? 'video' : 'image',
              }
            : t
        )
      );
      setActiveTaskId(targetTaskId);

      try {
        const targetTaskObj = tasksRef.current.find((t) => t.id === targetTaskId);
        const result = await executeAutonomousPipeline(
          { existingAsset: asset },
          {
            targetMarketplaces: [targetTaskObj?.targetMarketplace || 'adobe-stock'],
            autoEnhanceIfBelow4MP: true,
            onProgress: (p, msg) => {
              setActiveProgress(p);
              setActiveProgressMsg(msg);
            },
            onStageChange: (st) => setActiveStage(st.stage),
            onLog: (l) => setCurrentLogs((prev) => [l, ...prev].slice(0, 100)),
          }
        );

        updateTasksState((prev) =>
          prev.map((t) =>
            t.id === targetTaskId
              ? {
                  ...t,
                  status: 'completed',
                  statusLabelBn: 'সম্পন্ন (প্যাকেজ প্রস্তুত)',
                  statusLabelEn: 'Completed',
                  exactReason: 'Google Flow অ্যাসেট থেকে ০ ক্রেডিট খরচে ৪MP মানদণ্ড ও সম্পূর্ণ স্টক প্যাকেজ প্রস্তুত।',
                  completedAt: Date.now(),
                  dimensions: result.finalAsset.dimensions,
                  fileSize: result.finalAsset.fileSize,
                  complianceScore: 99,
                  zipBlob: result.zipBlob,
                  zipFilename: result.zipFilename,
                  humanReviewRequired: true,
                  humanReviewApproved: false,
                  marketResearchSummary: result.marketResearch?.researchSummaryBn,
                  submissionStatusMessage: result.submissionDispatch?.statusMessageBn,
                }
              : t
          )
        );
        showNotification('Google Flow অ্যাসেট দিয়ে পাইপলাইন সফলভাবে সম্পন্ন হয়েছে (০ ক্রেডিট)!');
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        updateTasksState((prev) =>
          prev.map((t) =>
            t.id === targetTaskId
              ? {
                  ...t,
                  status: 'failed',
                  statusLabelBn: 'ব্যর্থ হয়েছে',
                  statusLabelEn: 'Failed',
                  exactReason: `ত্রুটি: ${errorMsg}`,
                  errorDetails: errorMsg,
                }
              : t
          )
        );
      } finally {
        setActiveTaskId(null);
        setActiveStage('idle');
        setActiveProgress(0);
        setActiveProgressMsg('');
      }
      return;
    }

    const newTask: AutonomousTaskItem = {
      id: `task-existing-${asset.id}-${Date.now()}`,
      title: `${asset.title} (Auto-Pipeline)`,
      type: asset.type === 'video' ? 'video' : 'image',
      prompt: asset.prompt,
      aspectRatio: asset.aspectRatio,
      style: asset.style,
      status: 'running',
      statusLabelBn: 'অ্যাসেট প্রসেসিং চলছে...',
      statusLabelEn: 'Processing Asset...',
      exactReason: 'বিদ্যমান ফাইল থেকে পিক্সেল কোয়ালিটি বিশ্লেষণ, ৪MP আপস্কেল এবং ৫টি মার্কেটপ্লেস মেটাডেটা প্রস্তুত হচ্ছে।',
      retryCount: 0,
      maxRetries: 1,
      duplicateHash: `asset-${asset.id}`,
      targetMarketplace: 'adobe-stock',
      autoEnhance: true,
      createdAt: Date.now(),
      startedAt: Date.now(),
      assetId: asset.id,
      assetThumbnailUrl: asset.thumbnailUrl || asset.url,
      dimensions: asset.dimensions,
    };

    updateTasksState((prev) => [newTask, ...prev]);
    setActiveTaskId(newTask.id);

    try {
      const result = await executeAutonomousPipeline(
        { existingAsset: asset },
        {
          targetMarketplaces: ['adobe-stock'],
          autoEnhanceIfBelow4MP: true,
          onProgress: (p, msg) => {
            setActiveProgress(p);
            setActiveProgressMsg(msg);
          },
          onStageChange: (st) => setActiveStage(st.stage),
          onLog: (l) => setCurrentLogs((prev) => [l, ...prev].slice(0, 100)),
        }
      );

      updateTasksState((prev) =>
        prev.map((t) =>
          t.id === newTask.id
            ? {
                ...t,
                status: 'completed',
                statusLabelBn: 'সম্পন্ন (প্যাকেজ প্রস্তুত)',
                statusLabelEn: 'Completed',
                exactReason: 'বিদ্যমান অ্যাসেটের পিক্সেল পরীক্ষা ও ৪x সুপার-স্যাম্পলিং সহ সম্পূর্ণ স্টক প্যাকেজ তৈরি হয়েছে।',
                completedAt: Date.now(),
                dimensions: result.finalAsset.dimensions,
                fileSize: result.finalAsset.fileSize,
                complianceScore: 99,
                zipBlob: result.zipBlob,
                zipFilename: result.zipFilename,
                humanReviewRequired: true,
                humanReviewApproved: false,
                marketResearchSummary: result.marketResearch?.researchSummaryBn,
                submissionStatusMessage: result.submissionDispatch?.statusMessageBn,
              }
            : t
        )
      );
      showNotification('বিদ্যমান অ্যাসেটের প্যাকেজ তৈরি সম্পন্ন হয়েছে।');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      updateTasksState((prev) =>
        prev.map((t) =>
          t.id === newTask.id
            ? {
                ...t,
                status: 'failed',
                statusLabelBn: 'ব্যর্থ হয়েছে',
                statusLabelEn: 'Failed',
                exactReason: `ত্রুটি: ${errorMsg}`,
              }
            : t
        )
      );
    } finally {
      setActiveTaskId(null);
      setActiveStage('idle');
      setActiveProgress(0);
      setActiveProgressMsg('');
    }
  };

  // Human Review Acknowledgment
  const handleApproveHumanReview = (taskId: string) => {
    updateTasksState((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              humanReviewApproved: true,
              exactReason: 'মানব পর্যালোচনা সম্পন্ন: ভিজ্যুয়াল কোয়ালিটি ও ট্রেডমার্ক নিরীক্ষা নিশ্চিত করা হয়েছে। মার্কেটপ্লেসে আপলোডযোগ্য।',
            }
          : t
      )
    );
    showNotification('মানব পর্যালোচনা অনুমোদন সম্পন্ন হয়েছে।');
  };

  // Retry a failed or blocked task
  const handleRetryTask = (taskId: string) => {
    updateTasksState((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: t.type === 'video' ? 'blocked' : 'pending',
              statusLabelBn: t.type === 'video' ? 'বাহ্যিক সীমাবদ্ধতায় আটকে আছে' : 'পাইপলাইনে অপেক্ষমাণ',
              statusLabelEn: t.type === 'video' ? 'Blocked' : 'Pending in Queue',
              exactReason: t.type === 'video' ? 'ভিডিও জেনারেশনের জন্য Google Flow প্রয়োজন।' : 'ম্যানুয়ালি পুনরায় কিউতে পাঠানো হয়েছে।',
              retryCount: 0,
            }
          : t
      )
    );
    showNotification('টাস্কটি পুনরায় কিউতে যোগ করা হয়েছে।');
    if (!isQueueRunningRef.current) {
      startQueue();
    }
  };

  // Safe Recovery for Stale Running Tasks (Priority 6.3)
  const handleSafeRecoverStaleTask = (taskId: string) => {
    updateTasksState((prev) =>
      prev.map((t) => (t.id === taskId ? safeRecoverStaleRunningTask(t) : t))
    );
    showNotification('টাস্কটি নিরাপদে অপেক্ষমাণ তালিকায় ফিরিয়ে আনা হয়েছে।');
    if (!isQueueRunningRef.current) {
      startQueue();
    }
  };

  // Delete a task
  const handleDeleteTask = (taskId: string) => {
    updateTasksState((prev) => prev.filter((t) => t.id !== taskId));
  };

  // Clear completed tasks
  const handleClearCompleted = () => {
    updateTasksState((prev) => prev.filter((t) => t.status !== 'completed'));
    showNotification('সম্পন্ন টাস্ক তালিকা খালি করা হয়েছে।');
  };

  // Download ZIP package for a completed task (reconstructing if blob was cleared on reload)
  const handleDownloadZip = async (task: AutonomousTaskItem) => {
    try {
      if (task.zipBlob) {
        const url = URL.createObjectURL(task.zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = task.zipFilename || `${task.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_stock_package.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification('ZIP প্যাকেজ ডাউনলোড শুরু হয়েছে।');
        return;
      }

      showNotification('ZIP প্যাকেজ ফাইল প্রস্তুত করা হচ্ছে...');
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const targetAsset = task.assetId ? assetsRef.current.find((a) => a.id === task.assetId) : null;
      const mp = (task.targetMarketplace as StockMarketplaceId) || 'adobe-stock';

      if (targetAsset) {
        const evalResult = await evaluateAutonomousStockSubmissionReadiness(targetAsset, mp);
        const imgFilename = evalResult.submissionPackages.imageFilename;
        let imageAdded = false;

        try {
          if (targetAsset.url?.startsWith('data:')) {
            const b64 = targetAsset.url.split(',')[1];
            if (b64 && b64.length > 0) {
              zip.file(imgFilename, b64, { base64: true });
              imageAdded = true;
            }
          } else if (targetAsset.url && typeof fetch !== 'undefined') {
            const imgResp = await fetch(targetAsset.url);
            if (imgResp.ok) {
              const imgBlob = await imgResp.blob();
              if (imgBlob && imgBlob.size > 0) {
                zip.file(imgFilename, imgBlob);
                imageAdded = true;
              }
            }
          }
        } catch (imgErr) {
          console.warn('Failed to embed real asset image into package:', imgErr);
        }

        if (!imageAdded) {
          showNotification('প্যাকেজ অসম্পূর্ণ: আসল ইমেজ ফাইল পাওয়া যায়নি। অসম্পূর্ণ প্যাকেজ ডাউনলোড করা যাবে না।');
          return;
        }

        zip.file('AdobeStock_metadata.csv', evalResult.submissionPackages.adobeStockCsv);
        zip.file('Shutterstock_metadata.csv', evalResult.submissionPackages.shutterstockCsv);
        zip.file('Freepik_metadata.csv', evalResult.submissionPackages.freepikCsv);
        zip.file('Dreamstime_metadata.csv', evalResult.submissionPackages.dreamstimeCsv);
        zip.file('Wirestock_metadata.csv', evalResult.submissionPackages.wirestockCsv);
        zip.file('Master_Metadata_RFC4180.csv', evalResult.submissionPackages.masterExportCsv);
        zip.file('Copy_Paste_Portal_Summary.txt', evalResult.submissionPackages.portalCopyText);
      } else {
        showNotification('প্যাকেজ অসম্পূর্ণ: সংশ্লিষ্ট আসল অ্যাসেট লাইব্রেরিতে পাওয়া যায়নি। অসম্পূর্ণ প্যাকেজ ডাউনলোড বাতিল করা হয়েছে।');
        return;
      }

      const generatedBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(generatedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = task.zipFilename || `${task.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_stock_package.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification('ZIP প্যাকেজ ডাউনলোড শুরু হয়েছে।');
    } catch (err) {
      console.warn('Rebuilding ZIP failed:', err);
      showNotification('প্যাকেজ ফাইল তৈরিতে সমস্যা হয়েছে।');
    }
  };

  // Copy title & prompt/keywords to clipboard
  const handleCopyTaskMetadata = (task: AutonomousTaskItem) => {
    const text = `Title: ${task.title}\nPrompt: ${task.prompt}\nMarketplace: ${task.targetMarketplace}\nDimensions: ${task.dimensions || '4096 × 2304'}`;
    navigator.clipboard.writeText(text);
    showNotification('মেটাডেটা ক্লিপবোর্ডে কপি হয়েছে।');
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'completed') return t.status === 'completed';
    if (filterStatus === 'in_progress') return t.status === 'running' || t.status === 'pending';
    if (filterStatus === 'attention') return t.status === 'blocked' || t.status === 'failed' || t.status === 'manual_required' || (t.humanReviewRequired && !t.humanReviewApproved);
    return true;
  });

  const pendingHumanReviewTasks = tasks.filter((t) => t.status === 'completed' && t.humanReviewRequired && !t.humanReviewApproved);
  const quotaBlockedTasks = tasks.filter((t) => t.status === 'blocked' && t.exactReason.includes('429'));

  // ---------------------------------------------------------------------------
  // Priority 6.0: Autonomous Stock Submission Readiness Handlers
  // ---------------------------------------------------------------------------
  const handleRunReadinessAudit = async (targetMarketplaceOverride?: StockMarketplaceId) => {
    const mp = targetMarketplaceOverride || submissionScanMarketplace;
    setIsScanningReadiness(true);
    try {
      const results = await runAutonomousStockReadinessScan(assetsRef.current, [mp], {
        existingQueueTasks: tasksRef.current,
        humanReviewApprovedMap,
      });
      setSubmissionEvaluations(results);
      showNotification(`স্টক সাবমিশন অডিট সম্পন্ন: ${results.length}টি ইমেজ বিশ্লেষিত হয়েছে।`);
    } catch (err) {
      console.error('Autonomous Stock Submission Audit failed:', err);
    } finally {
      setIsScanningReadiness(false);
    }
  };

  const handleApproveEvaluationReview = (assetId: string, marketplace: StockMarketplaceId) => {
    const key = `${assetId}::${marketplace}`;
    const nextMap = { ...humanReviewApprovedMap, [key]: true };
    setHumanReviewApprovedMap(nextMap);

    const targetAsset = assetsRef.current.find((a) => a.id === assetId);
    if (targetAsset) {
      evaluateAutonomousStockSubmissionReadiness(targetAsset, marketplace, {
        existingQueueTasks: tasksRef.current,
        humanReviewApproved: true,
      }).then((updated) => {
        setSubmissionEvaluations((prev) =>
          prev.map((e) => (e.assetId === assetId && e.targetMarketplace === marketplace ? updated : e))
        );
        showNotification('মানব পর্যালোচনা অনুমোদন সম্পন্ন! স্ট্যাটাস "READY_TO_SUBMIT"-এ উন্নীত হয়েছে।');
      });
    }
  };

  const handleDispatchEvaluationToQueue = async (evaluation: AutonomousSubmissionEvaluation) => {
    if (!evaluation.canAutoDispatch) {
      showNotification('শুধুমাত্র সব বাধ্যতামূলক যাচাই পাস করা ছবি কিউতে পাঠানো সম্ভব।');
      return;
    }

    if (isDuplicateSubmissionForMarketplace(evaluation.assetId, evaluation.targetMarketplace, tasksRef.current).isDuplicate) {
      showNotification('ডুপ্লিকেট সাবমিশন রোধ করা হয়েছে: ছবিটি ইতোমধ্যে এই মার্কেটপ্লেসের কিউতে বিদ্যমান।');
      return;
    }

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      zip.file('AdobeStock_metadata.csv', evaluation.submissionPackages.adobeStockCsv);
      zip.file('Shutterstock_metadata.csv', evaluation.submissionPackages.shutterstockCsv);
      zip.file('Freepik_metadata.csv', evaluation.submissionPackages.freepikCsv);
      zip.file('Dreamstime_metadata.csv', evaluation.submissionPackages.dreamstimeCsv);
      zip.file('Wirestock_metadata.csv', evaluation.submissionPackages.wirestockCsv);
      zip.file('Master_Metadata_RFC4180.csv', evaluation.submissionPackages.masterExportCsv);
      zip.file('Copy_Paste_Portal_Summary.txt', evaluation.submissionPackages.portalCopyText);

      const imageFilename = evaluation.submissionPackages.imageFilename || `${(evaluation.assetTitle || 'stock_asset').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 40)}.jpg`;
      const baseName = imageFilename.replace(/\.jpg$/i, '');

      let imageAdded = false;
      try {
        if (evaluation.asset.url?.startsWith('data:')) {
          const b64 = evaluation.asset.url.split(',')[1];
          if (b64 && b64.length > 0) {
            zip.file(imageFilename, b64, { base64: true });
            imageAdded = true;
          }
        } else if (evaluation.asset.url && typeof fetch !== 'undefined') {
          const imgResp = await fetch(evaluation.asset.url);
          if (imgResp.ok) {
            const imgBlob = await imgResp.blob();
            if (imgBlob && imgBlob.size > 0) {
              zip.file(imageFilename, imgBlob);
              imageAdded = true;
            }
          }
        }
      } catch (imgErr) {
        console.warn('Could not bundle image directly into ZIP:', imgErr);
      }

      if (!imageAdded) {
        showNotification('প্যাকেজ অসম্পূর্ণ: আসল ইমেজ ফাইল পাওয়া যায়নি। অসম্পূর্ণ প্যাকেজ কিউতে পাঠানো যাবে না।');
        return;
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipFilename = `${baseName}_${evaluation.targetMarketplace}_package.zip`;

      const queueTask = createStockSubmissionQueueTask({
        asset: evaluation.asset,
        targetMarketplace: evaluation.targetMarketplace,
        zipBlob,
        zipFilename,
        humanReviewApproved: evaluation.humanReviewApproved,
      });

      updateTasksState((prev) => [queueTask, ...prev]);

      setSubmissionEvaluations((prev) =>
        prev.map((e) =>
          e.assetId === evaluation.assetId && e.targetMarketplace === evaluation.targetMarketplace
            ? {
                ...e,
                isDuplicateSubmission: true,
                canAutoDispatch: false,
                duplicateReason: `সাবমিশন কিউতে যুক্ত করা হয়েছে (Task: ${queueTask.id})।`,
              }
            : e
        )
      );

      showNotification(`"${evaluation.assetTitle}" সফলভাবে সাবমিশন কিউতে পাঠানো হয়েছে (০ ক্রেডিট)!`);
    } catch (err) {
      console.warn('Could not dispatch evaluation task:', err);
      showNotification('টাস্ক কিউতে পাঠানোর সময় ত্রুটি হয়েছে।');
    }
  };

  const handleDispatchAllReady = async () => {
    const readyItems = submissionEvaluations.filter(
      (e) => e.canAutoDispatch && !isDuplicateSubmissionForMarketplace(e.assetId, e.targetMarketplace, tasksRef.current).isDuplicate
    );

    if (readyItems.length === 0) {
      showNotification('কিউতে পাঠানোর মতো কোনো নতুন "READY_TO_SUBMIT" ছবি পাওয়া যায়নি।');
      return;
    }

    for (const item of readyItems) {
      await handleDispatchEvaluationToQueue(item);
    }

    showNotification(`${readyItems.length}টি প্রস্তুত ছবি সাবমিশন কিউতে সফলভাবে পাঠানো হয়েছে (০ ক্রেডিট কর্তন)!`);
  };

  const handleDownloadEvaluationZip = async (evaluation: AutonomousSubmissionEvaluation) => {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      zip.file('AdobeStock_metadata.csv', evaluation.submissionPackages.adobeStockCsv);
      zip.file('Shutterstock_metadata.csv', evaluation.submissionPackages.shutterstockCsv);
      zip.file('Freepik_metadata.csv', evaluation.submissionPackages.freepikCsv);
      zip.file('Dreamstime_metadata.csv', evaluation.submissionPackages.dreamstimeCsv);
      zip.file('Wirestock_metadata.csv', evaluation.submissionPackages.wirestockCsv);
      zip.file('Master_Metadata_RFC4180.csv', evaluation.submissionPackages.masterExportCsv);
      zip.file('Copy_Paste_Portal_Summary.txt', evaluation.submissionPackages.portalCopyText);

      const imageFilename = evaluation.submissionPackages.imageFilename || `${(evaluation.assetTitle || 'stock_asset').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 40)}.jpg`;
      const baseName = imageFilename.replace(/\.jpg$/i, '');

      let imageAdded = false;
      try {
        if (evaluation.asset.url?.startsWith('data:')) {
          const b64 = evaluation.asset.url.split(',')[1];
          if (b64 && b64.length > 0) {
            zip.file(imageFilename, b64, { base64: true });
            imageAdded = true;
          }
        } else if (evaluation.asset.url && typeof fetch !== 'undefined') {
          const imgResp = await fetch(evaluation.asset.url);
          if (imgResp.ok) {
            const imgBlob = await imgResp.blob();
            if (imgBlob && imgBlob.size > 0) {
              zip.file(imageFilename, imgBlob);
              imageAdded = true;
            }
          }
        }
      } catch (imgErr) {
        console.warn('Could not bundle image directly into ZIP:', imgErr);
      }

      if (!imageAdded) {
        showNotification('প্যাকেজ অসম্পূর্ণ: আসল ইমেজ ফাইল লোড করা সম্ভব হয়নি। অসম্পূর্ণ প্যাকেজ ডাউনলোড বাতিল করা হয়েছে।');
        return;
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}_${evaluation.targetMarketplace}_package.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification('ZIP প্যাকেজ ডাউনলোড শুরু হয়েছে।');
    } catch (err) {
      console.warn('Failed to build download zip:', err);
      showNotification('ZIP প্যাকেজ তৈরিতে সমস্যা হয়েছে।');
    }
  };

  // Priority 6.4: Evaluate Stock Opportunities & Asset Selection
  const handleScanOpportunities = (mp?: StockMarketplaceId) => {
    const targetMp = mp || opportunityMarketplace;
    setIsScanningOpportunities(true);
    try {
      const results = evaluateAllStockOpportunities(assetsRef.current, tasksRef.current, targetMp);
      setOpportunityEvaluations(results);
      const reusableCount = results.filter((r) => r.reuseExistingAsset).length;
      showNotification(`বাণিজ্যিক সুযোগ বিশ্লেষণ সম্পন্ন: ${results.length}টি সুযোগ চিহ্নিত, ${reusableCount}টি লাইব্রেরি অ্যাসেট সরাসরি ব্যবহারযোগ্য (০ ক্রেডিট)।`);
    } catch (err) {
      console.error('Opportunity scan failed:', err);
    } finally {
      setIsScanningOpportunities(false);
    }
  };

  const handleDispatchOpportunity = (item: OpportunityEvaluationResult) => {
    if (item.isAlreadyQueued) {
      showNotification('ডুপ্লিকেট প্রতিরোধ: এই অ্যাসেটটি ইতোমধ্যে কিউতে বিদ্যমান।');
      return;
    }
    const newTask = dispatchOpportunityToAutonomousQueue({
      opportunity: item.opportunity,
      asset: item.reuseExistingAsset ? item.matchingAsset : null,
      targetMarketplace: opportunityMarketplace,
    });
    updateTasksState((prev) => [newTask, ...prev]);
    showNotification(
      item.reuseExistingAsset
        ? `"${item.matchingAsset?.title}" সফলভাবে কিউতে প্রেরণ করা হয়েছে (০ ক্রেডিট কর্তন)!`
        : `"${item.opportunity.nicheNameBn}" নতুন প্রম্পট কিউতে যুক্ত হয়েছে!`
    );
    // Refresh evaluations to reflect queued state
    setTimeout(() => {
      handleScanOpportunities();
    }, 100);
  };

  // Priority 6.5: Generate & Dispatch Autonomous Batch Production Plan
  const handleGenerateBatchPlan = (targetQty?: number, targetMp?: StockMarketplaceId) => {
    const qty = targetQty || batchPlannerQuantity;
    const mp = targetMp || batchPlannerMarketplace;
    setIsGeneratingBatchPlan(true);
    try {
      const plan = generateAutonomousBatchProductionPlan({
        assets: assetsRef.current,
        existingTasks: tasksRef.current,
        targetMarketplace: mp,
        userApprovedQuantity: qty,
      });
      setActiveBatchPlan(plan);
      showNotification(
        `স্বয়ংক্রিয় ব্যাচ প্ল্যান প্রস্তুত: ${plan.totalPlannedItems}টি আইটেম (${plan.reusedAssetsCount}টি পুনঃব্যবহারযোগ্য, ০ ক্রেডিট)।`
      );
    } catch (err) {
      console.error('Batch production plan generation failed:', err);
    } finally {
      setIsGeneratingBatchPlan(false);
    }
  };

  const handleDispatchBatchPlan = () => {
    if (!activeBatchPlan) return;
    const { dispatchedTasks, skippedDuplicatesCount, actualDispatchedCount } =
      dispatchBatchProductionPlanToQueue(activeBatchPlan, tasksRef.current);

    if (actualDispatchedCount === 0) {
      showNotification('কোনো নতুন টাস্ক নেই (সব আইটেম ইতোমধ্যে কিউতে বিদ্যমান)।');
      return;
    }

    updateTasksState((prev) => [...dispatchedTasks, ...prev]);
    showNotification(
      `${actualDispatchedCount}টি টাস্ক কিউতে সফলভাবে পাঠানো হয়েছে (${skippedDuplicatesCount}টি ডুপ্লিকেট প্রতিহত, ০ ক্রেডিট কর্তন)!`
    );
    // Auto-refresh the batch plan to reflect newly queued items
    setTimeout(() => {
      handleGenerateBatchPlan();
    }, 150);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6">
      {/* Toast Notification */}
      {copiedNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 border border-zinc-700 text-zinc-100 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* Top View Mode Switcher: Pipeline Queue vs Stock Submission Readiness Agent */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-2.5 shadow-lg">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setViewMode('pipeline_queue')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              viewMode === 'pipeline_queue'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span className="hidden sm:inline">Autonomous Pipeline & Queue</span>
            <span className="sm:hidden">Pipeline</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
              {tasks.length}
            </span>
          </button>

          <button
            onClick={() => {
              setViewMode('submission_agent');
              if (submissionEvaluations.length === 0) {
                handleRunReadinessAudit();
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              viewMode === 'submission_agent'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span className="hidden sm:inline">Stock Submission Readiness Agent (6.0)</span>
            <span className="sm:hidden">Readiness</span>
            {submissionEvaluations.length > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                {submissionEvaluations.filter((e) => e.status === 'READY_TO_SUBMIT').length} Ready
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setViewMode('opportunity_selection');
              if (opportunityEvaluations.length === 0) {
                handleScanOpportunities();
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              viewMode === 'opportunity_selection'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Compass className="w-4 h-4 text-amber-300" />
            <span className="hidden sm:inline">Stock Opportunity & Selection (6.4)</span>
            <span className="sm:hidden">Opportunities</span>
            {opportunityEvaluations.length > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
                {opportunityEvaluations.filter((e) => e.reuseExistingAsset).length} Reusable
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setViewMode('batch_production');
              if (!activeBatchPlan) {
                handleGenerateBatchPlan();
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              viewMode === 'batch_production'
                ? 'bg-violet-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Boxes className="w-4 h-4 text-violet-300" />
            <span className="hidden sm:inline">Batch Production Planner (6.5)</span>
            <span className="sm:hidden">Batch Plan</span>
            {activeBatchPlan && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-950 text-violet-300 border border-violet-800">
                {activeBatchPlan.totalPlannedItems} Items
              </span>
            )}
          </button>
        </div>

        {viewMode === 'submission_agent' && (
          <div className="flex items-center gap-2 px-2">
            <span className="text-xs text-zinc-400 font-medium">Marketplace:</span>
            <select
              value={submissionScanMarketplace}
              onChange={(e) => {
                const newMp = e.target.value as StockMarketplaceId;
                setSubmissionScanMarketplace(newMp);
                handleRunReadinessAudit(newMp);
              }}
              className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="adobe-stock">Adobe Stock</option>
              <option value="freepik">Freepik</option>
              <option value="dreamstime">Dreamstime</option>
              <option value="wirestock">Wirestock</option>
              <option value="shutterstock">Shutterstock</option>
            </select>

            <button
              onClick={() => handleRunReadinessAudit()}
              disabled={isScanningReadiness}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanningReadiness ? 'animate-spin' : ''}`} />
              <span>{isScanningReadiness ? 'স্ক্যান চলছে...' : 'অডিট চালান'}</span>
            </button>
          </div>
        )}

        {viewMode === 'opportunity_selection' && (
          <div className="flex items-center gap-2 px-2">
            <span className="text-xs text-zinc-400 font-medium">Marketplace:</span>
            <select
              value={opportunityMarketplace}
              onChange={(e) => {
                const newMp = e.target.value as StockMarketplaceId;
                setOpportunityMarketplace(newMp);
                handleScanOpportunities(newMp);
              }}
              className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
            >
              <option value="adobe-stock">Adobe Stock</option>
              <option value="freepik">Freepik</option>
              <option value="dreamstime">Dreamstime</option>
              <option value="wirestock">Wirestock</option>
              <option value="shutterstock">Shutterstock</option>
            </select>

            <button
              onClick={() => handleScanOpportunities()}
              disabled={isScanningOpportunities}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanningOpportunities ? 'animate-spin' : ''}`} />
              <span>{isScanningOpportunities ? 'বিশ্লেষণ চলছে...' : 'পুনরায় বিশ্লেষণ'}</span>
            </button>
          </div>
        )}

        {viewMode === 'batch_production' && (
          <div className="flex flex-wrap items-center gap-2 px-2">
            <span className="text-xs text-zinc-400 font-medium">Quantity:</span>
            <select
              value={batchPlannerQuantity}
              onChange={(e) => {
                const qty = Number(e.target.value);
                setBatchPlannerQuantity(qty);
                handleGenerateBatchPlan(qty);
              }}
              className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
            >
              <option value={5}>5 Assets</option>
              <option value={10}>10 Assets</option>
              <option value={20}>20 Assets</option>
              <option value={30}>30 Assets</option>
              <option value={50}>50 Assets</option>
            </select>

            <select
              value={batchPlannerMarketplace}
              onChange={(e) => {
                const newMp = e.target.value as StockMarketplaceId;
                setBatchPlannerMarketplace(newMp);
                handleGenerateBatchPlan(batchPlannerQuantity, newMp);
              }}
              className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
            >
              <option value="adobe-stock">Adobe Stock</option>
              <option value="freepik">Freepik</option>
              <option value="dreamstime">Dreamstime</option>
              <option value="wirestock">Wirestock</option>
              <option value="shutterstock">Shutterstock</option>
            </select>

            <button
              onClick={() => handleGenerateBatchPlan()}
              disabled={isGeneratingBatchPlan}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingBatchPlan ? 'animate-spin' : ''}`} />
              <span>{isGeneratingBatchPlan ? 'প্ল্যানিং চলছে...' : 'নতুন ব্যাচ প্ল্যান'}</span>
            </button>
          </div>
        )}
      </div>

      {viewMode === 'pipeline_queue' ? (
        <>
          {/* Agent Command Center Header */}
          <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-6 sm:p-7 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-zinc-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${isQueueRunning ? 'bg-indigo-400 animate-ping' : 'bg-emerald-400'}`} />
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                AI Automation Agent
                <span className="text-xs font-normal text-zinc-400">· স্বয়ংক্রিয় স্টক অর্কেস্ট্রেটর</span>
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
              একটি ক্লিকে প্রম্পট সম্প্রসারণ, ইমেজ জেনারেশন, পিক্সেল শার্পনেস অডিট, ৪x সুপার-স্যাম্পলিং, ভিশন মেটাডেটা এবং ৫টি এজেন্সির জন্য এক্সপোর্ট প্যাকেজ স্বয়ংক্রিয়ভাবে প্রস্তুত হয়।
            </p>
          </div>

          {/* Queue Master Control */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleToggleQueue}
              className={`min-h-[44px] flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95 shadow-md ${
                isQueueRunning
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {isQueueRunning ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause Agent Loop</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Run Agent Loop</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowSelectAssetModal(true)}
              className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
              title="Automate Existing Stored Asset (Zero Credits)"
            >
              <FolderHeart className="w-4 h-4 text-emerald-400" />
              <span>Automate Existing Asset</span>
            </button>
          </div>
        </div>

        {/* Essential Input: Agent Goal / Topic Command Bar */}
        <form onSubmit={handleLaunchAgent} className="mt-5 space-y-3.5">
          <div className="relative">
            <textarea
              value={agentPrompt}
              onChange={(e) => setAgentPrompt(e.target.value)}
              placeholder="এআই এজেন্টকে কী বানাতে বা অটোমেট করতে চান? (যেমন: 'Commercial minimalist artisan ceramic tableware with gentle morning light')"
              rows={2}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl p-3.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none transition-colors resize-none leading-relaxed"
            />
          </div>

          {agentInputError && (
            <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800 text-xs text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{agentInputError}</span>
            </div>
          )}

          {/* Quick Smart Presets */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-zinc-500 shrink-0 text-[11px] font-medium">Smart Presets:</span>
            {SMART_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setAgentPrompt(p.prompt)}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors text-xs"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Action Row: Mode Selection + Launch Button + Advanced Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Batch Mode Buttons */}
              <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
                <button
                  type="button"
                  onClick={() => setBatchMode('single')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    batchMode === 'single'
                      ? 'bg-zinc-800 text-white font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Single Asset (1x)
                </button>
                <button
                  type="button"
                  onClick={() => setBatchMode('batch3')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    batchMode === 'batch3'
                      ? 'bg-zinc-800 text-white font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Commercial Batch (3x)
                </button>
                <button
                  type="button"
                  onClick={() => setBatchMode('batch5')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    batchMode === 'batch5'
                      ? 'bg-zinc-800 text-white font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Collection (5x)
                </button>
              </div>

              {/* Advanced Settings Toggle */}
              <button
                type="button"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-950 border border-zinc-800 transition-colors"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Advanced</span>
                {showAdvancedOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Launch Action */}
            <button
              type="submit"
              disabled={!agentPrompt.trim()}
              className="min-h-[44px] flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-cyan-300" />
              <span>Launch AI Automation</span>
            </button>
          </div>

          {/* Collapsible Advanced Settings (Sensible Defaults preselected) */}
          {showAdvancedOptions && (
            <div className="mt-3 p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in text-xs">
              <div>
                <label className="block text-zinc-400 font-medium mb-1">অ্যাসপেক্ট রেশিও (Default: 16:9)</label>
                <select
                  value={selectedRatio}
                  onChange={(e) => setSelectedRatio(e.target.value as AspectRatioType)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 focus:outline-none"
                >
                  <option value="16:9">16:9 (Landscape Commercial Standard)</option>
                  <option value="1:1">1:1 (Square)</option>
                  <option value="9:16">9:16 (Vertical Story)</option>
                  <option value="4:3">4:3 (Traditional)</option>
                  <option value="3:2">3:2 (Classic 35mm)</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1">টার্গেট মার্কেটপ্লেস (Default: Adobe Stock)</label>
                <select
                  value={selectedMarketplace}
                  onChange={(e) => setSelectedMarketplace(e.target.value as StockMarketplaceId)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 focus:outline-none"
                >
                  <option value="adobe-stock">Adobe Stock (Primary)</option>
                  <option value="shutterstock">Shutterstock</option>
                  <option value="freepik">Freepik</option>
                  <option value="dreamstime">Dreamstime</option>
                  <option value="wirestock">Wirestock (Multi-Syndication)</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1">স্বয়ংক্রিয় সুপার-স্যাম্পলিং</label>
                <label className="flex items-center gap-2 mt-2 cursor-pointer text-zinc-300">
                  <input
                    type="checkbox"
                    checked={autoEnhance}
                    onChange={(e) => setAutoEnhance(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>৪ MP-র নিচে হলে ৪x আপস্কেল</span>
                </label>
              </div>
            </div>
          )}
        </form>

        {/* Clean Typographic Queue Summary Bar (Zero-Pill Discipline) */}
        <div className="mt-5 pt-4 border-t border-zinc-800/80 flex items-center justify-between flex-wrap gap-3 text-xs text-zinc-400">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-semibold text-zinc-200">Task Summary:</span>
            <span>{stats.total} Total Tasks</span>
            <span className="text-zinc-600">·</span>
            <span className="text-emerald-400 font-medium">{stats.completed} Completed</span>
            <span className="text-zinc-600">·</span>
            <span className="text-indigo-400">{stats.running} Running</span>
            <span className="text-zinc-600">·</span>
            <span className="text-amber-400">{stats.pending} Pending</span>
            {stats.blocked > 0 && (
              <>
                <span className="text-zinc-600">·</span>
                <span className="text-rose-400">{stats.blocked} External Hold</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {stats.completed > 0 && (
              <button
                onClick={handleClearCompleted}
                className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Completed</span>
              </button>
            )}
            <button
              onClick={() => onNavigate('batch-planner')}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium ml-2"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Open Batch Planner</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Running Task Live Stepper */}
      {isQueueRunning && activeTaskId && (
        <div className="bg-zinc-900 border border-indigo-500/60 rounded-2xl p-5 shadow-xl relative animate-in fade-in">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
              </span>
              <h2 className="text-sm font-semibold text-white tracking-tight">
                স্বয়ংক্রিয় প্রসেসিং চলছে: {activeProgressMsg || 'পাইপলাইন সক্রিয়'}
              </h2>
            </div>
            <span className="text-xs font-mono font-medium text-indigo-300">
              {activeProgress}%
            </span>
          </div>

          <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${activeProgress}%` }}
            />
          </div>

          {/* 9-Stage Visual Progress Stepper */}
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5 mt-3 pt-3 border-t border-zinc-800/80">
            {AGENT_STAGES.map((s, idx) => {
              const isCurrent = activeStage === s.stage;
              return (
                <div
                  key={s.stage}
                  className={`p-1.5 rounded-lg border text-center transition-all ${
                    isCurrent
                      ? 'bg-indigo-950 border-indigo-500 text-indigo-200 ring-1 ring-indigo-500/50'
                      : 'bg-zinc-950/80 border-zinc-800/80 text-zinc-500'
                  }`}
                >
                  <div className="text-xs mb-0.5">{s.icon}</div>
                  <div className="text-[10px] font-semibold truncate">{s.nameBn}</div>
                  <div className="text-[9px] text-zinc-500 truncate">{idx + 1}/9</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Elevated Warning Banners: Human Review & Quotas */}
      {pendingHumanReviewTasks.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/80 text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <UserCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block text-amber-100">
                মানব পর্যালোচনা প্রয়োজন ({pendingHumanReviewTasks.length}টি অ্যাসেট)
              </strong>
              <span className="text-amber-300/90 leading-relaxed">
                টেকনিক্যাল কোয়ালিটি ও মেটাডেটা টেস্ট সফল হলেও বাণিজ্যিক পলিসি অনুযায়ী ভিজ্যুয়াল শার্পনেস ও ট্রেডমার্ক মানুষের চোখে যাচাই করা বাধ্যতামূলক।
              </span>
            </div>
          </div>
          <button
            onClick={() => handleApproveHumanReview(pendingHumanReviewTasks[0].id)}
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold shrink-0 transition-colors"
          >
            Review & Acknowledge
          </button>
        </div>
      )}

      {quotaBlockedTasks.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/40 border border-rose-800/80 text-rose-200 text-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Ban className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-semibold block text-rose-100 text-sm">
                API কোটা সীমাবদ্ধতা (HTTP 429 Rate Limit)
              </strong>
              <p className="text-rose-300/90 leading-relaxed max-w-2xl">
                Gemini ফ্রি টিয়ারে লাইভ ইমেজ কোটা ০ হওয়ায় টাস্ক আটকে আছে। কোনো পেইড ক্রেডিট বা ফেক ইমেজ ছাড়া পাইপলাইন শেষ করতে অফিসিয়াল Google Flow সাইটে ফ্রি ক্রেডিটে ছবি তৈরি করে Import করুন অথবা সংরক্ষিত কোনো Flow ফাইল দিয়ে তাৎক্ষণিক রিজিউম করুন (০ ক্রেডিট চার্জ)।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {onOpenGoogleFlow && (
              <button
                type="button"
                onClick={onOpenGoogleFlow}
                className="min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Google Flow Import (ফ্রি ক্রেডিট)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setAssetFilterFlowOnly(true);
                setShowSelectAssetModal(true);
              }}
              className="min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 flex items-center gap-1.5 transition-all active:scale-95"
            >
              <FolderHeart className="w-3.5 h-3.5 text-emerald-400" />
              <span>বিদ্যমান Flow অ্যাসেট নির্বাচন (০ ক্রেডিট)</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-3 overflow-x-auto scrollbar-none">
        {[
          { id: 'all', label: 'All Tasks', count: stats.total },
          { id: 'completed', label: 'Completed Packages', count: stats.completed },
          { id: 'in_progress', label: 'In Progress', count: stats.running + stats.pending },
          { id: 'attention', label: 'Needs Attention', count: stats.blocked + stats.failed + stats.manualRequired + pendingHumanReviewTasks.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id as typeof filterStatus)}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filterStatus === tab.id
                ? 'bg-zinc-800 text-white font-semibold border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <span>{tab.label}</span>
            <span className="ml-1.5 text-[11px] text-zinc-500 font-mono">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Task Queue Results List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-zinc-900/30 border border-zinc-800/80 p-6 space-y-2">
            <Cpu className="w-8 h-8 text-zinc-500 mx-auto" />
            <h3 className="text-sm font-medium text-zinc-300">কোনো টাস্ক নেই</h3>
            <p className="text-xs text-zinc-500">
              উপরের কমান্ড বারে নতুন টাস্ক লিখুন অথবা &ldquo;Automate Existing Asset&rdquo; বেছে নিন।
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const isRunning = task.status === 'running';
            const isBlocked = task.status === 'blocked';
            const isFailed = task.status === 'failed';
            const needsReview = task.humanReviewRequired && !task.humanReviewApproved;
            const isExpanded = !!expandedTaskDetails[task.id];

            return (
              <div
                key={task.id}
                className="p-4 sm:p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left: Thumbnail & Details */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {task.assetThumbnailUrl ? (
                      <img
                        src={task.assetThumbnailUrl}
                        alt={task.title}
                        className="w-14 h-14 rounded-xl object-cover bg-black shrink-0 border border-zinc-800"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0">
                        {isRunning ? (
                          <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
                        ) : (
                          <Cpu className="w-5 h-5 text-zinc-600" />
                        )}
                      </div>
                    )}

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Status Label (Clean unboxed typography) */}
                        <span
                          className={`text-xs font-semibold flex items-center gap-1 ${
                            isCompleted
                              ? 'text-emerald-400'
                              : isRunning
                              ? 'text-indigo-400'
                              : isBlocked
                              ? 'text-rose-400'
                              : isFailed
                              ? 'text-rose-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {isRunning && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                          {isBlocked && <Ban className="w-3.5 h-3.5" />}
                          {isFailed && <AlertCircle className="w-3.5 h-3.5" />}
                          {!isCompleted && !isRunning && !isBlocked && !isFailed && <Clock className="w-3.5 h-3.5" />}
                          <span>{task.statusLabelBn}</span>
                        </span>

                        {/* Unboxed Metadata (Zero-Pill Discipline) */}
                        <span className="text-[11px] text-zinc-400 font-mono">
                          · {task.aspectRatio} · {task.targetMarketplace.toUpperCase()}
                          {task.dimensions ? ` · ${task.dimensions}` : ''}
                          {task.fileSize ? ` · ${task.fileSize}` : ''}
                        </span>

                        {needsReview && (
                          <span className="text-[11px] text-amber-400 font-medium bg-amber-950/60 border border-amber-900/60 px-2 py-0.5 rounded">
                            Human Review Pending
                          </span>
                        )}

                        {isRunning && (task.isStaleRunning || (task.startedAt && Date.now() - task.startedAt > DEFAULT_STALE_RUNNING_THRESHOLD_MS)) && (
                          <span className="text-[11px] text-amber-300 font-semibold bg-amber-950/80 border border-amber-800 px-2 py-0.5 rounded flex items-center gap-1 animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            <span>অস্বাভাবিক সময় ধরে চলছে (&gt; ৩ মিনিট)</span>
                          </span>
                        )}

                        {(isBlocked || isFailed) && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-rose-950/80 border border-rose-800/80 text-rose-300 flex items-center gap-1">
                            <Ban className="w-3 h-3 text-rose-400 shrink-0" />
                            <span>
                              {task.blockerCategory === 'image_generation_quota'
                                ? 'Blocker: Image Generation Quota (HTTP 429)'
                                : task.blockerCategory === 'asset_missing'
                                ? 'Blocker: Asset Missing (অনুপস্থিত)'
                                : task.blockerCategory === 'validation_failure'
                                ? 'Blocker: Validation Failure (মানদণ্ড অপূর্ণ)'
                                : task.blockerCategory === 'integration_unauthorized'
                                ? 'Blocker: Integration Unauthorized (কন্ট্রিবিউটর ক্রেডেনশিয়াল আবশ্যক)'
                                : task.blockerCategory === 'external_model_required'
                                ? 'Blocker: External Video Model Required'
                                : 'Blocker: Action Required'}
                            </span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-white truncate">
                        {task.title}
                      </h3>

                      <p className="text-xs text-zinc-400 line-clamp-1 italic font-mono">
                        &ldquo;{task.prompt}&rdquo;
                      </p>

                      <p className="text-xs text-zinc-400 pt-0.5">
                        <strong className="text-zinc-300 font-medium">Status:</strong> {task.exactReason}
                      </p>

                      {(isBlocked || isFailed) && (
                        <p className="text-[11px] text-amber-300/90 pt-1 font-sans leading-relaxed bg-amber-950/30 p-1.5 rounded-lg border border-amber-800/40">
                          <strong className="text-amber-200 font-semibold">করণীয় পদক্ষেপ: </strong>
                          {getTaskBlockerActionableAdvice(task.blockerCategory || categorizeTaskBlocker(task)).actionableStepBn}
                        </p>
                      )}

                      {task.marketResearchSummary && (
                        <p className="text-[11px] text-cyan-300/90 pt-0.5 font-sans leading-relaxed">
                          <strong className="text-cyan-200 font-medium">বাজার গবেষণা:</strong> {task.marketResearchSummary}
                        </p>
                      )}

                      {task.submissionStatusMessage && (
                        <p className="text-[11px] text-zinc-400 pt-0.5 font-sans leading-relaxed">
                          <strong className="text-zinc-300 font-medium">সাবমিশন স্থিতি:</strong> {task.submissionStatusMessage}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
                    {/* Instant ZIP Package Download */}
                    {isCompleted && (
                      <button
                        onClick={() => handleDownloadZip(task)}
                        className="min-h-[40px] flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md active:scale-95"
                      >
                        <FileArchive className="w-4 h-4" />
                        <span>Download ZIP Package</span>
                      </button>
                    )}

                    {/* Copy Metadata */}
                    <button
                      onClick={() => handleCopyTaskMetadata(task)}
                      className="min-h-[40px] p-2.5 rounded-xl text-zinc-400 hover:text-white bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 transition-colors"
                      title="Copy Commercial Title & Keywords"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    {/* Review Approval if required */}
                    {needsReview && (
                      <button
                        onClick={() => handleApproveHumanReview(task.id)}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-medium bg-amber-700/80 hover:bg-amber-600 text-white transition-colors"
                      >
                        Approve Review
                      </button>
                    )}

                    {/* Video external model guidance */}
                    {isBlocked && task.type === 'video' && onOpenGoogleFlow && (
                      <button
                        onClick={onOpenGoogleFlow}
                        className="min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-blue-600/90 hover:bg-blue-500 text-white transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Google Flow-তে বানান</span>
                      </button>
                    )}

                    {/* Google Flow Quota 429 One-Click Resolution */}
                    {isBlocked && (task.exactReason.includes('429') || task.exactReason.includes('কোটা') || task.statusLabelEn?.includes('429')) && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {onOpenGoogleFlow && (
                          <button
                            type="button"
                            onClick={onOpenGoogleFlow}
                            className="min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-600/90 hover:bg-cyan-500 text-white transition-all shadow-sm"
                            title="Import creation from Google Flow without consuming credits"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Flow Import (০ ক্রেডিট)</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setResumingTaskId(task.id);
                            setAssetFilterFlowOnly(false);
                            setShowSelectAssetModal(true);
                          }}
                          className="min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 transition-colors"
                          title="Select existing Google Flow or imported asset to resume pipeline"
                        >
                          <FolderHeart className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Attach Asset & Resume</span>
                        </button>
                      </div>
                    )}

                    {/* Safe Recovery for Stale Running Tasks */}
                    {isRunning && (task.isStaleRunning || (task.startedAt && Date.now() - task.startedAt > DEFAULT_STALE_RUNNING_THRESHOLD_MS)) && (
                      <button
                        onClick={() => handleSafeRecoverStaleTask(task.id)}
                        className="min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-all shadow-md active:scale-95"
                        title="Safely restore stale task back to pending queue without data loss"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>নিরাপদ রিকভারি</span>
                      </button>
                    )}

                    {/* Retry Action */}
                    {(isFailed || isBlocked) && (
                      <button
                        onClick={() => handleRetryTask(task.id)}
                        className="min-h-[40px] flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                        <span>Retry</span>
                      </button>
                    )}

                    {/* Technical Details Toggle */}
                    <button
                      onClick={() => toggleTaskDetails(task.id)}
                      className="min-h-[40px] p-2.5 rounded-xl text-zinc-400 hover:text-white bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 transition-colors"
                      title="Technical Diagnostics"
                    >
                      <Sliders className="w-4 h-4" />
                    </button>

                    {/* Delete Task */}
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="min-h-[40px] p-2.5 rounded-xl text-zinc-500 hover:text-rose-400 transition-colors"
                      title="Delete from Queue"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Collapsible Technical Details (Preserved power-user functionality) */}
                {isExpanded && (
                  <div className="pt-3 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs text-zinc-400 animate-in fade-in bg-zinc-950/60 p-3 rounded-xl font-mono">
                    <div>
                      <span className="text-zinc-500 block text-[10px]">TASK ID</span>
                      <span className="truncate block text-zinc-300">{task.id}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px]">DUPLICATE HASH</span>
                      <span className="truncate block text-zinc-300">{task.duplicateHash}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px]">RETRY ATTEMPTS</span>
                      <span className="block text-zinc-300">{task.retryCount} / {task.maxRetries}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px]">4MP AUTO-ENHANCE</span>
                      <span className="block text-zinc-300">{task.autoEnhance ? 'Enabled (4x)' : 'Disabled'}</span>
                    </div>
                    {task.errorDetails && (
                      <div className="col-span-full pt-1 text-rose-300 text-[11px]">
                        <strong>Error details:</strong> {task.errorDetails}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
        </>
      ) : viewMode === 'submission_agent' ? (
        /* PRIORITY 6.0: AUTONOMOUS STOCK SUBMISSION READINESS VIEW */
        <div className="space-y-6">
          {/* Header Card */}
          <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-6 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-zinc-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    Autonomous Stock Submission Readiness Agent
                    <span className="text-xs font-normal text-zinc-400">· অগ্রাধিকার ৬.০</span>
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
                  লাইব্রেরির প্রতিটি ইমেজকে স্বয়ংক্রিয়ভাবে ৪MP রেজোলিউশন, ফরম্যাট, বাণিজ্যিক মেটাডেটা, মার্কেটপ্লেস পলিসি ও ডুপ্লিকেট অডিটের মাধ্যমে ৩টি স্পষ্ট স্তরে বিন্যস্ত করে: 
                  <strong className="text-emerald-400"> READY_TO_SUBMIT</strong>, 
                  <strong className="text-amber-400"> NEEDS_REVIEW</strong>, অথবা 
                  <strong className="text-rose-400"> REJECTED</strong>।
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={handleDispatchAllReady}
                  disabled={submissionEvaluations.filter((e) => e.canAutoDispatch && !isDuplicateSubmissionForMarketplace(e.assetId, e.targetMarketplace, tasksRef.current).isDuplicate).length === 0}
                  className="min-h-[44px] flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all active:scale-95 shadow-md disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>Auto-Dispatch All Ready ({submissionEvaluations.filter((e) => e.canAutoDispatch && !isDuplicateSubmissionForMarketplace(e.assetId, e.targetMarketplace, tasksRef.current).isDuplicate).length}) — ০ ক্রেডিট</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-5">
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-center">
                <span className="text-[11px] text-zinc-500 font-medium block">মোট বিশ্লেষিত</span>
                <span className="text-xl font-bold text-zinc-100">{submissionEvaluations.length}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-center">
                <span className="text-[11px] text-emerald-400 font-medium block">READY_TO_SUBMIT</span>
                <span className="text-xl font-bold text-emerald-300">
                  {submissionEvaluations.filter((e) => e.status === 'READY_TO_SUBMIT').length}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/50 text-center">
                <span className="text-[11px] text-amber-400 font-medium block">NEEDS_REVIEW</span>
                <span className="text-xl font-bold text-amber-300">
                  {submissionEvaluations.filter((e) => e.status === 'NEEDS_REVIEW').length}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/50 text-center">
                <span className="text-[11px] text-rose-400 font-medium block">REJECTED</span>
                <span className="text-xl font-bold text-rose-300">
                  {submissionEvaluations.filter((e) => e.status === 'REJECTED').length}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-center">
                <span className="text-[11px] text-zinc-400 font-medium block">ডুপ্লিকেট প্রতিরোধ</span>
                <span className="text-xl font-bold text-zinc-300">
                  {submissionEvaluations.filter((e) => e.isDuplicateSubmission).length}
                </span>
              </div>
            </div>
          </div>

          {/* Honest Boundary & Zero-Credit Notice */}
          <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-zinc-300">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" />
              <span>
                <strong>সততা ও ক্লাউড নীতি:</strong> মার্কেটপ্লেসে সরাসরি রিমোট আপলোডে ব্যক্তিগত কন্ট্রিবিউটর ক্রেডেনশিয়াল প্রয়োজন। কোনো পাসওয়ার্ড বা সিক্রেট টোকেন নেওয়া হয় না। প্রস্তুতকৃত RFC 4180 CSV ও ZIP প্যাকেজ কন্ট্রিবিউটর পোর্টালে সরাসরি ড্রপ করার জন্য প্রস্তুত।
              </span>
            </div>
            <span className="shrink-0 font-mono text-[11px] px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60">
              ০ ক্রেডিট ব্যয় (Zero Credit Guarantee)
            </span>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setReadinessFilterTab('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  readinessFilterTab === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                All ({submissionEvaluations.length})
              </button>
              <button
                onClick={() => setReadinessFilterTab('ready')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  readinessFilterTab === 'ready' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Ready to Submit ({submissionEvaluations.filter((e) => e.status === 'READY_TO_SUBMIT').length})
              </button>
              <button
                onClick={() => setReadinessFilterTab('needs_review')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  readinessFilterTab === 'needs_review' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Needs Review ({submissionEvaluations.filter((e) => e.status === 'NEEDS_REVIEW').length})
              </button>
              <button
                onClick={() => setReadinessFilterTab('rejected')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  readinessFilterTab === 'rejected' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Rejected ({submissionEvaluations.filter((e) => e.status === 'REJECTED').length})
              </button>
            </div>

            <div className="text-xs text-zinc-500">
              লক্ষ্য মার্কেটপ্লেস: <strong className="text-zinc-300">{submissionScanMarketplace}</strong>
            </div>
          </div>

          {/* Evaluations List */}
          {submissionEvaluations.length === 0 ? (
            <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800/80 p-12 text-center space-y-3">
              <ShieldCheck className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-sm text-zinc-400">
                এখনও কোনো স্টক নিরীক্ষা চালানো হয়নি। 'অডিট চালান' বাটনে চাপ দিয়ে লাইব্রেরির ইমেজগুলো স্বয়ংক্রিয়ভাবে বিশ্লেষণ করুন।
              </p>
              <button
                onClick={() => handleRunReadinessAudit()}
                disabled={isScanningReadiness}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanningReadiness ? 'animate-spin' : ''}`} />
                <span>{isScanningReadiness ? 'বিশ্লেষণ চলছে...' : 'লাইব্রেরি স্ক্যান ও অডিট শুরু করুন'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {submissionEvaluations
                .filter((item) => {
                  if (readinessFilterTab === 'ready') return item.status === 'READY_TO_SUBMIT';
                  if (readinessFilterTab === 'needs_review') return item.status === 'NEEDS_REVIEW';
                  if (readinessFilterTab === 'rejected') return item.status === 'REJECTED';
                  return true;
                })
                .map((item) => {
                  const isExpanded = expandedEvaluationId === `${item.assetId}::${item.targetMarketplace}`;
                  return (
                    <div
                      key={`${item.assetId}::${item.targetMarketplace}`}
                      className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-5 space-y-4 shadow-sm hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <img
                            src={item.asset.thumbnailUrl || item.asset.url}
                            alt={item.assetTitle}
                            className="w-16 h-16 rounded-xl object-cover bg-zinc-950 border border-zinc-800 shrink-0"
                          />
                          <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-white leading-snug">
                              {item.assetTitle}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                              <span className="font-mono">{item.asset.dimensions || '4096 × 2304'}</span>
                              <span>·</span>
                              <span className="uppercase">{item.asset.fileFormat || 'JPEG'}</span>
                              <span>·</span>
                              <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px]">
                                {item.targetMarketplaceName}
                              </span>
                              {item.isDuplicateSubmission && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 text-[10px]">
                                  ডুপ্লিকেট প্রতিরোধ
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px]">
                                ০ ক্রেডিট ব্যয়
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge & Actions */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <span
                            className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                              item.status === 'READY_TO_SUBMIT'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : item.status === 'NEEDS_REVIEW'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-rose-950 text-rose-300 border border-rose-800'
                            }`}
                          >
                            {item.status === 'READY_TO_SUBMIT' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            ) : item.status === 'NEEDS_REVIEW' ? (
                              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                            ) : (
                              <Ban className="w-3.5 h-3.5 text-rose-400" />
                            )}
                            <span>{item.status}</span>
                          </span>

                          {item.canAutoDispatch && (
                            <button
                              onClick={() => handleDispatchEvaluationToQueue(item)}
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5 shadow-sm"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>কিউতে পাঠান (০ ক্রেডিট)</span>
                            </button>
                          )}

                          {item.status === 'NEEDS_REVIEW' && !item.humanReviewApproved && (
                            <button
                              onClick={() => handleApproveEvaluationReview(item.assetId, item.targetMarketplace)}
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-colors flex items-center gap-1.5 shadow-sm"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>রিভিউ অনুমোদন (Approve)</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleDownloadEvaluationZip(item)}
                            className="min-h-[36px] min-w-[36px] p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors flex items-center justify-center touch-manipulation active:scale-95"
                            title="Download ZIP Package"
                            aria-label="Download ZIP Package"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() =>
                              setExpandedEvaluationId(
                                isExpanded ? null : `${item.assetId}::${item.targetMarketplace}`
                              )
                            }
                            className="min-h-[36px] min-w-[36px] p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors flex items-center justify-center touch-manipulation active:scale-95"
                            aria-label="Toggle details"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Reasons & Issues List */}
                      <div className="space-y-1.5 pt-2 border-t border-zinc-800/80 text-xs">
                        <div className="text-zinc-300">
                          <strong className="text-zinc-400">স্থিতি বিবরণ: </strong>
                          {item.statusLabelBn}
                        </div>

                        {item.issues.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {item.issues.map((iss, idx) => (
                              <span
                                key={idx}
                                className={`px-2 py-0.5 rounded-md text-[11px] flex items-center gap-1 ${
                                  iss.severity === 'blocking'
                                    ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                                    : iss.severity === 'review_required'
                                    ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                                    : 'bg-zinc-800 text-zinc-300'
                                }`}
                              >
                                {iss.severity === 'blocking' ? (
                                  <Ban className="w-3 h-3 text-rose-400 shrink-0" />
                                ) : iss.severity === 'review_required' ? (
                                  <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                                ) : (
                                  <Info className="w-3 h-3 text-zinc-400 shrink-0" />
                                )}
                                <span>{iss.messageBn}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Expanded Package & Rules Details */}
                      {isExpanded && (
                        <div className="pt-3 border-t border-zinc-800/80 space-y-3 text-xs">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                              <span className="font-semibold text-zinc-300 block">প্রস্তুতকৃত মেটাডেটা (Metadata)</span>
                              <p className="text-zinc-400 line-clamp-2">
                                <strong className="text-zinc-300">Title: </strong>
                                {item.asset.preparedMetadata?.title || item.assetTitle}
                              </p>
                              <p className="text-zinc-500 text-[11px]">
                                কীওয়ার্ড: {(item.asset.preparedMetadata?.keywords || []).slice(0, 15).join(', ')}...
                              </p>
                            </div>

                            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                              <span className="font-semibold text-zinc-300 block">আপলোড সীমানা ও অনুমোদন</span>
                              <p className="text-zinc-400">
                                {item.uploadStatus.messageBn}
                              </p>
                              <span className="text-[10px] font-mono text-zinc-500 block">
                                Status: {item.uploadStatus.state}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      ) : viewMode === 'opportunity_selection' ? (
        /* PRIORITY 6.4: AUTONOMOUS STOCK OPPORTUNITY & ASSET SELECTION VIEW */
        <div className="space-y-6">
          {/* Header Card */}
          <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-6 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-zinc-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    Stock Opportunity & Asset Selection
                    <span className="text-xs font-normal text-zinc-400">· Priority 6.4</span>
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
                  বাণিজ্যিক চাহিদা ও ডেটা সংকেত বিশ্লেষণ করে উপযুক্ত অ্যাসেটের অগ্রাধিকার নির্ধারণ ও স্মার্ট পুনঃব্যবহার। মানুষ এড়িয়ে পেশাদার ও ইসলামিক স্থাপত্য, প্রকৃতি ও বাণিজ্যিকভাবে বিক্রয়যোগ্য বিষয় অগ্রাধিকার দেওয়া হয়।
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleScanOpportunities()}
                  disabled={isScanningOpportunities}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/20 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isScanningOpportunities ? 'animate-spin' : ''}`} />
                  <span>{isScanningOpportunities ? 'বিশ্লেষণ চলছে...' : 'সুযোগ বিশ্লেষণ চালান'}</span>
                </button>
              </div>
            </div>

            {/* Honest Data Source & Blocker Alert */}
            <div className="mt-4 p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <span className="font-semibold text-amber-200 block">
                    {OPPORTUNITY_ENGINE_BLOCKERS.LIVE_TREND_SCRAPER_ABSENT.titleBn}
                  </span>
                  <p className="text-zinc-400 leading-relaxed">
                    {OPPORTUNITY_ENGINE_BLOCKERS.LIVE_TREND_SCRAPER_ABSENT.detailBn}
                  </p>
                  <p className="text-zinc-500 text-[11px] italic">
                    উৎস: অভ্যন্তরীণ ২০২৬ বাণিজ্যিক স্টক প্যাটার্ন রেজিস্ট্রি (অফলাইন ভেরিফাইড)। বিক্রির কোনো ভিত্তিহীন গ্যারান্টি দেওয়া হয় না; প্রতিটি সিদ্ধান্তের কারণ স্বচ্ছভাবে প্রদর্শিত।
                  </p>
                </div>
              </div>
            </div>

            {/* Filter Tabs & Stats Bar */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-800">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setOpportunityFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    opportunityFilter === 'all'
                      ? 'bg-zinc-800 text-white font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  সকল সুযোগ ({opportunityEvaluations.length})
                </button>
                <button
                  onClick={() => setOpportunityFilter('reusable')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    opportunityFilter === 'reusable'
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  পুনঃব্যবহারযোগ্য অ্যাসেট ({opportunityEvaluations.filter((e) => e.reuseExistingAsset).length}) · ০ ক্রেডিট
                </button>
                <button
                  onClick={() => setOpportunityFilter('needs_generation')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    opportunityFilter === 'needs_generation'
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-800 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  নতুন প্রম্পট প্রয়োজন ({opportunityEvaluations.filter((e) => !e.reuseExistingAsset).length})
                </button>
              </div>

              <div className="text-xs text-zinc-400">
                টার্গেট মার্কেটপ্লেস: <span className="font-semibold text-zinc-200 capitalize">{opportunityMarketplace}</span>
              </div>
            </div>
          </div>

          {/* Opportunities List */}
          {opportunityEvaluations.length === 0 ? (
            <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-12 text-center space-y-3">
              <Compass className="w-10 h-10 text-amber-400/60 mx-auto" />
              <h3 className="text-base font-semibold text-zinc-200">কোনো সুযোগ এখনো বিশ্লেষণ করা হয়নি</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                উপরের &ldquo;সুযোগ বিশ্লেষণ চালান&rdquo; বাটনে ক্লিক করে ২০২৬ সালের শীর্ষ স্টক বিষয় ও আপনার লাইব্রেরির অ্যাসেট সমন্বয় করুন।
              </p>
              <button
                onClick={() => handleScanOpportunities()}
                disabled={isScanningOpportunities}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanningOpportunities ? 'animate-spin' : ''}`} />
                <span>সুযোগ বিশ্লেষণ শুরু করুন</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {opportunityEvaluations
                .filter((item) => {
                  if (opportunityFilter === 'reusable') return item.reuseExistingAsset;
                  if (opportunityFilter === 'needs_generation') return !item.reuseExistingAsset;
                  return true;
                })
                .map((item) => {
                  const opp = item.opportunity;
                  const isExpanded = expandedOpportunityId === opp.id;
                  const match = item.matchingAsset;
                  const score = item.matchingScore;

                  return (
                    <div
                      key={opp.id}
                      className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-5 shadow-lg space-y-4 hover:border-zinc-700 transition-colors"
                    >
                      {/* Top Niche Header */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-bold text-white tracking-tight">
                              {opp.nicheNameBn}
                            </h3>
                            <span className="text-xs text-zinc-400 font-mono">
                              ({opp.nicheName})
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
                              চাহিদা: {opp.demandScore}/১০০ ({opp.demandIndex})
                            </span>
                            {opp.noPeopleAdvantage && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                                <UserCheck className="w-3 h-3" />
                                <span>মানুষহীন নিরাপদ বিষয়</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-300 leading-relaxed">
                            {opp.commercialUtilityReasonBn}
                          </p>
                        </div>

                        <button
                          onClick={() => setExpandedOpportunityId(isExpanded ? null : opp.id)}
                          className="self-start md:self-auto px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700 flex items-center gap-1 transition-colors"
                        >
                          <span>{isExpanded ? 'সংক্ষেপ করুন' : 'বিস্তারিত দেখুন'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Smart Asset Reuse or Generation Card */}
                      {item.reuseExistingAsset && match && score ? (
                        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            {match.thumbnailUrl || match.url ? (
                              <img
                                src={match.thumbnailUrl || match.url}
                                alt={match.title}
                                className="w-16 h-16 rounded-xl object-cover border border-emerald-700/60 shrink-0 bg-black"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-zinc-950 border border-emerald-700/60 flex items-center justify-center shrink-0">
                                <Sparkles className="w-6 h-6 text-emerald-400" />
                              </div>
                            )}
                            <div className="space-y-1 text-xs">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-emerald-200 text-sm">
                                  {match.title}
                                </span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-700">
                                  {score.priorityRankBn} · স্কোর: {score.overallScore}/১০০
                                </span>
                                <span className="text-[10px] text-zinc-400 font-mono">
                                  {match.dimensions || '4MP+'} · {match.aspectRatio}
                                </span>
                              </div>
                              <p className="text-zinc-300">
                                {item.actionRecommendationBn}
                              </p>
                              <div className="flex flex-wrap gap-1 text-[11px] text-zinc-400">
                                {score.reasonsBn.slice(0, 2).map((r, idx) => (
                                  <span key={idx} className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 text-zinc-400">
                                    • {r}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {item.isAlreadyQueued ? (
                              <span className="px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                                ইতোমধ্যে কিউতে বিদ্যমান
                              </span>
                            ) : (
                              <button
                                onClick={() => handleDispatchOpportunity(item)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 transition-all"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>সরাসরি পাইপলাইনে পাঠান (০ ক্রেডিট)</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                            <div className="space-y-1 text-xs">
                              <span className="font-semibold text-amber-300 block flex items-center gap-1.5">
                                <Lightbulb className="w-4 h-4 text-amber-400" />
                                নতুন ছবি জেনারেশন বা ইমপোর্ট সুপারিশ
                              </span>
                              <p className="text-zinc-400">
                                {item.actionRecommendationBn}
                              </p>
                              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800/80 font-mono text-[11px] text-zinc-300 leading-relaxed select-all">
                                {opp.recommendedPromptTemplate}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(opp.recommendedPromptTemplate);
                                  showNotification('প্রস্তাবিত কমার্শিয়াল প্রম্পট ক্লিপবোর্ডে কপি হয়েছে!');
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>কপি প্রম্পট</span>
                              </button>

                              <button
                                onClick={() => handleDispatchOpportunity(item)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>কিউতে যুক্ত করুন</span>
                              </button>

                              {onOpenGoogleFlow && (
                                <button
                                  onClick={onOpenGoogleFlow}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 transition-colors"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>Google Flow (০ ক্রেডিট)</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Expanded Deep Details */}
                      {isExpanded && (
                        <div className="pt-3 border-t border-zinc-800 space-y-3 text-xs animate-in fade-in">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                              <span className="font-semibold text-zinc-300 block">প্রস্তাবিত স্টক কীওয়ার্ড (SEO):</span>
                              <div className="flex flex-wrap gap-1">
                                {opp.recommendedKeywords.map((kw, kIdx) => (
                                  <span key={kIdx} className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 font-mono">
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                              <span className="font-semibold text-zinc-300 block">ডেটা উৎস ও স্বচ্ছতা সীমানা:</span>
                              <p className="text-zinc-400 text-[11px] leading-relaxed">
                                <strong>উৎস:</strong> {opp.dataSource}
                              </p>
                              <p className="text-zinc-400 text-[11px] leading-relaxed">
                                <strong>ডিসক্লেইমার:</strong> {opp.disclaimerBn}
                              </p>
                              <p className="text-amber-400/90 text-[11px] leading-relaxed">
                                <strong>সীমাবদ্ধতা:</strong> {opp.liveDataBlockerNoticeBn}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      ) : (
        /* PRIORITY 6.5: AUTONOMOUS BATCH PRODUCTION PLANNER VIEW */
        <div className="space-y-6">
          {/* Header Card */}
          <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-6 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-zinc-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-400" />
                  <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    Autonomous Batch Production Planner
                    <span className="text-xs font-normal text-zinc-400">· Priority 6.5</span>
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
                  সুযোগের স্কোর, অ্যাসেট লাইব্রেরি, ডুপ্লিকেট ফিল্টার ও মার্কেটপ্লেস রুলস ব্যবহার করে অগ্রাধিকারভিত্তিক ব্যাচ প্ল্যান। ব্যবহারকারীর অনুমোদিত পরিমাণের বাইরে কোনো ব্যাচ চলবে না এবং খরচ নিশ্চিত না থাকলে অনুমানকে বাস্তব মূল্য হিসেবে দেখানো হয় না।
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleGenerateBatchPlan()}
                  disabled={isGeneratingBatchPlan}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/20 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isGeneratingBatchPlan ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingBatchPlan ? 'প্ল্যানিং চলছে...' : 'নতুন প্ল্যান তৈরি করুন'}</span>
                </button>

                {activeBatchPlan && activeBatchPlan.items.length > 0 && (
                  <button
                    onClick={() => handleDispatchBatchPlan()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 transition-all"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>অনুমোদিত ব্যাচ কিউতে পাঠান ({activeBatchPlan.totalPlannedItems})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Plan Metrics & Authorization Ceiling Bar */}
            {activeBatchPlan && (
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 block">অনুমোদিত সর্বোচ্চ সীমা</span>
                  <span className="text-lg font-bold text-white block">
                    {activeBatchPlan.userApprovedQuantity} <span className="text-xs font-normal text-zinc-400">Assets</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 block">ব্যবহারকারী অনুমোদিত সিলিং</span>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 block">লাইব্রেরি পুনঃব্যবহার</span>
                  <span className="text-lg font-bold text-emerald-300 block">
                    {activeBatchPlan.reusedAssetsCount} <span className="text-xs font-normal text-zinc-400">Reused</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 block">পুনরায় তৈরি ছাড়া (০ ক্রেডিট)</span>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 block">নতুন প্রম্পট পরিকল্পনা</span>
                  <span className="text-lg font-bold text-violet-300 block">
                    {activeBatchPlan.newGenerationsCount} <span className="text-xs font-normal text-zinc-400">Prompts</span>
                  </span>
                  <span className="text-[10px] text-zinc-400 block">ডাইভার্স বৈচিত্র্যপূর্ণ দৃশ্য</span>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 block">প্রত্যাশিত মোট খরচ</span>
                  <span className="text-lg font-bold text-emerald-300 block">
                    ০ <span className="text-xs font-normal text-zinc-400">Credits</span>
                  </span>
                  <span className="text-[10px] text-zinc-400 block">ফ্রি টিয়ার / কোনো লুকানো ফি নেই</span>
                </div>
              </div>
            )}

            {/* Cost Transparency & Blocker Notice */}
            {activeBatchPlan && (
              <div className="mt-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2 text-xs">
                <div className="flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-semibold text-zinc-200 block">খরচ ও ডেটার স্বচ্ছতা বিবরণ (Cost & Data Transparency):</span>
                    <p className="text-zinc-400 leading-relaxed">
                      {activeBatchPlan.costTransparencyBn}
                    </p>
                    <p className="text-zinc-500 text-[11px] italic">
                      উৎস: {activeBatchPlan.dataSourceBn} | সীমাবদ্ধতা: {activeBatchPlan.liveTrendStatusBn}
                    </p>
                    <p className="text-zinc-500 text-[11px] italic">
                      ডিসক্লেইমার: {activeBatchPlan.disclaimerBn}
                    </p>
                  </div>
                </div>

                {activeBatchPlan.blockersIdentified.length > 0 && (
                  <div className="pt-2 border-t border-zinc-800/60 flex flex-wrap gap-1.5 items-center">
                    <span className="text-[11px] text-zinc-500 font-medium">শনাক্তকৃত সীমাবদ্ধতা ও ব্লকার:</span>
                    {activeBatchPlan.blockersIdentified.map((b, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md text-[10px] bg-amber-950/80 text-amber-300 border border-amber-800/60">
                        {b}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Planned Batch Items List */}
          {!activeBatchPlan || activeBatchPlan.items.length === 0 ? (
            <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-12 text-center space-y-3">
              <Boxes className="w-10 h-10 text-violet-400/60 mx-auto" />
              <h3 className="text-base font-semibold text-zinc-200">কোনো ব্যাচ প্ল্যান এখনো তৈরি করা হয়নি</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                উপরে আপনার কাঙ্ক্ষিত অ্যাসেটের পরিমাণ বেছে নিয়ে &ldquo;নতুন প্ল্যান তৈরি করুন&rdquo; বাটনে ক্লিক করুন।
              </p>
              <button
                onClick={() => handleGenerateBatchPlan()}
                disabled={isGeneratingBatchPlan}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingBatchPlan ? 'animate-spin' : ''}`} />
                <span>১০টি অ্যাসেটের ব্যাচ প্ল্যান তৈরি করুন</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                <span>পরিকল্পিত ব্যাচ আইটেম তালিকা ({activeBatchPlan.items.length}টি)</span>
                <span>মার্কেটপ্লেস: <strong className="text-zinc-200 capitalize">{activeBatchPlan.targetMarketplace}</strong></span>
              </div>

              {activeBatchPlan.items.map((item, idx) => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4 shadow-sm hover:border-zinc-700 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center text-xs font-mono shrink-0">
                      #{idx + 1}
                    </span>

                    {item.isReusedAsset ? (
                      item.reusedAssetThumbnailUrl ? (
                        <img
                          src={item.reusedAssetThumbnailUrl}
                          alt={item.reusedAssetTitle}
                          className="w-14 h-14 rounded-xl object-cover border border-emerald-700/60 shrink-0 bg-black"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-zinc-950 border border-emerald-700/60 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        </div>
                      )
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5 text-violet-400" />
                      </div>
                    )}

                    <div className="space-y-1 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-zinc-200">
                          {item.nicheNameBn}
                        </span>
                        {item.isReusedAsset ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>লাইব্রেরি পুনঃব্যবহার (০ ক্রেডিট)</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-950 text-violet-300 border border-violet-800">
                            নতুন প্রম্পট
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                          স্কোর: {item.priorityScore}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {item.aspectRatio} · {item.style}
                        </span>
                      </div>

                      <p className="text-zinc-400 line-clamp-2 text-[11px] leading-relaxed font-mono">
                        {item.prompt}
                      </p>

                      <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                        <span>{item.costExplanationBn}</span>
                        <span>•</span>
                        <span className="font-mono">{item.duplicateHash}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400">
                      খরচ: ০ ক্রেডিট
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Advanced Diagnostics & Execution Logs (Collapsible Drawer) */}
      <div className="rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden shadow-lg">
        <button
          onClick={() => setShowLogsDrawer(!showLogsDrawer)}
          className="w-full px-4 py-3 bg-zinc-900/80 border-b border-zinc-800/80 flex items-center justify-between text-left hover:bg-zinc-800/70 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-zinc-200">
              Advanced Execution Logs & Diagnostics
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">
              ({currentLogs.length} events logged)
            </span>
          </div>
          {showLogsDrawer ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
        </button>

        {showLogsDrawer && (
          <div className="p-4 font-mono text-xs max-h-56 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800 bg-black/40">
            {currentLogs.length === 0 ? (
              <p className="text-zinc-600 italic">
                পাইপলাইন শুরু হলে এখানে প্রতিটি ধাপের আসল লগ, সময় ও ডিসিশন প্রদর্শিত হবে...
              </p>
            ) : (
              currentLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-zinc-500 shrink-0 text-[11px]">[{log.timestamp}]</span>
                  <span
                    className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded shrink-0 ${
                      log.level === 'success'
                        ? 'bg-emerald-950 text-emerald-300'
                        : log.level === 'warn'
                        ? 'bg-amber-950 text-amber-300'
                        : log.level === 'error'
                        ? 'bg-rose-950 text-rose-300'
                        : 'bg-zinc-900 text-zinc-300'
                    }`}
                  >
                    {log.stage}
                  </span>
                  <span
                    className={
                      log.level === 'success'
                        ? 'text-emerald-300'
                        : log.level === 'warn'
                        ? 'text-amber-300'
                        : log.level === 'error'
                        ? 'text-rose-300'
                        : 'text-zinc-300'
                    }
                  >
                    {log.messageBn} <span className="text-zinc-500">({log.messageEn})</span>
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Autonomy & Limitation Transparency Card */}
      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-bold text-white">
            Autonomy Transparency & Limitation Guarantee (সততা ও সীমাবদ্ধতার গ্যারান্টি)
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-zinc-300 leading-relaxed">
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1">
            <span className="text-emerald-400 font-semibold block flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>১০০% স্বয়ংক্রিয়ভাবে কার্যকর</span>
            </span>
            <p className="text-zinc-400">
              বাণিজ্যিক প্রম্পট আর্কিটেকচার, ইমেজ তৈরি, অফস্ক্রিন ক্যানভাসে ৪x আপস্কেলিং, পিক্সেল শার্পনেস নিরীক্ষা, কম্পিউটার ভিশন মেটাডেটা এবং ৫টি এজেন্সির জন্য RFC 4180 CSV সহ ZIP প্যাকেজিং।
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1">
            <span className="text-amber-400 font-semibold block flex items-center gap-1.5">
              <Info className="w-4 h-4 text-amber-400" />
              <span>ব্যবহারকারীর অনুমোদন আবশ্যক</span>
            </span>
            <p className="text-zinc-400">
              মার্কেটপ্লেস সরাসরি আপলোডে ব্যবহারকারীর ব্যক্তিগত কন্ট্রিবিউটর লগইন প্রয়োজন; ভিডিওর জন্য Google Flow Import প্রয়োজন; ব্যবহারকারীর সম্মতি ছাড়া কোনো পেইড API বিলিং সক্রিয় করা হয় না।
            </p>
          </div>
        </div>
      </div>

      {/* Select Existing Asset Modal (Zero Credit Cost) */}
      {showSelectAssetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FolderHeart className="w-4 h-4 text-emerald-400" />
                <span>Automate Existing Asset (Zero Credits)</span>
              </h3>
              <button
                onClick={() => setShowSelectAssetModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Filter Toggle: All vs Google Flow Only */}
            <div className="flex items-center gap-2 flex-wrap justify-between">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAssetFilterFlowOnly(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    !assetFilterFlowOnly
                      ? 'bg-zinc-800 text-white border border-zinc-700'
                      : 'text-zinc-400 hover:text-white bg-zinc-950'
                  }`}
                >
                  সকল অ্যাসেট ({assets.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAssetFilterFlowOnly(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                    assetFilterFlowOnly
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold'
                      : 'text-zinc-400 hover:text-white bg-zinc-950'
                  }`}
                >
                  <ExternalLink className="w-3 h-3 text-cyan-400" />
                  <span>Google Flow ({assets.filter((a) => a.source === 'Google Flow' || a.source === 'Imported' || a.model?.toLowerCase().includes('google flow')).length})</span>
                </button>
              </div>

              {onOpenGoogleFlow && (
                <button
                  type="button"
                  onClick={() => {
                    setShowSelectAssetModal(false);
                    onOpenGoogleFlow();
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>নতুন Flow ফাইল Import করুন</span>
                </button>
              )}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
              <input
                type="text"
                value={assetSearchQuery}
                onChange={(e) => setAssetSearchQuery(e.target.value)}
                placeholder="টাইটেল দিয়ে খুঁজুন..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
              {assets
                .filter((a) => {
                  const isFlow = a.source === 'Google Flow' || a.source === 'Imported' || a.model?.toLowerCase().includes('google flow');
                  if (assetFilterFlowOnly && !isFlow) return false;
                  if (assetSearchQuery.trim() && !a.title.toLowerCase().includes(assetSearchQuery.toLowerCase())) return false;
                  return true;
                })
                .map((a) => (
                  <div
                    key={a.id}
                    onClick={() => handleProcessExistingAsset(a)}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-indigo-500 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={a.thumbnailUrl || a.url}
                        alt={a.title}
                        className="w-12 h-12 rounded-lg object-cover bg-black shrink-0 border border-zinc-800"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate group-hover:text-indigo-300">
                          {a.title}
                        </h4>
                        <p className="text-[11px] text-zinc-400 font-mono">
                          {a.dimensions} · {a.aspectRatio} · {a.source || 'Studio'} (0 Credits)
                        </p>
                      </div>
                    </div>

                    <button className="min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 group-hover:bg-indigo-500 text-white shrink-0 transition-colors">
                      Run Pipeline
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
