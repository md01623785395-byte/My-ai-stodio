import React, { useState, useEffect } from 'react';
import {
  PipelineExecutionPlan,
  SpecialistAgentId,
  CreatorMemoryLedger,
  CreatorMemoryItem,
} from '../types/agentSystem';
import { SPECIALIST_AGENTS } from '../utils/specialistAgentsData';
import { StudioTab } from '../types';
import {
  Sparkles,
  Zap,
  Play,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Copy,
  Check,
  TrendingUp,
  ShieldCheck,
  Tag,
  DollarSign,
  ArrowRight,
  Layers,
  BrainCircuit,
  Eye,
  Sliders,
  RefreshCw,
  FolderPlus,
  HelpCircle,
  Download,
  BookOpen,
} from 'lucide-react';

interface AutonomousBusinessPipelineProps {
  onNavigate?: (tab: StudioTab) => void;
  onUsePromptInStudio?: (prompt: string, type: 'image' | 'video') => void;
  onSendToBatchPlanner?: (topic: string, count: number) => void;
}

const DEFAULT_MEMORY: CreatorMemoryLedger = {
  preferences: {
    favoriteNiches: ['Commercial Product Photography', 'Still Life (No People)', 'Ramadan & Eid Luxury Packaging'],
    avoidPeople: true,
    preferredLighting: 'Commercial studio softbox, clean highlights, no blown-out whites',
    defaultPromptCount: 50,
  },
  items: [
    {
      id: 'mem-1',
      type: 'preference',
      topicOrTitle: 'মানুষ ছাড়া নিরাপদ বাণিজ্যিক বিষয় (No People Policy)',
      notesBn: 'মডেল রিলিজের জটিলতা ও আইনি জটিলতা এড়াতে মানুষের মুখ ছাড়া প্রোডাক্ট ও স্টিল লাইফে ফোকাস রাখা।',
      appliedDate: '2026-03-01',
      tags: ['NoPeople', 'Commercial', 'Safe'],
    },
    {
      id: 'mem-2',
      type: 'failure-lesson',
      topicOrTitle: 'অতিরিক্ত আলো ও ব্লার টেক্সচার বর্জন',
      notesBn: 'আগে অতিরিক্ত হাইলাইট ও নয়েজ রিডাকশনের জন্য পারফিউম ছবি রিজেক্ট হয়েছিল। এখন ১০০% শার্পনেস ও রিচ শ্যাডো নিশ্চিত করা হয়।',
      appliedDate: '2026-03-15',
      tags: ['RejectionFixed', 'Lighting', 'Sharpness'],
    },
    {
      id: 'mem-3',
      type: 'success-log',
      topicOrTitle: 'সাফাওয়ী খেজুর ও ইসলামিক ডেকোরেশন হ্যাম্পার',
      notesBn: 'অ্যাডোবি স্টক ও ফ্রিপিকে সর্বোচ্চ ডাউনলোড হয়েছে। এই প্যাটার্ন অন্যান্য বাণিজ্যিক প্রোডাক্টে অনুসরণীয়।',
      appliedDate: '2026-03-28',
      tags: ['TopSeller', 'EidTheme', 'StockSuccess'],
    },
  ],
};

export const AutonomousBusinessPipeline: React.FC<AutonomousBusinessPipelineProps> = ({
  onNavigate,
  onUsePromptInStudio,
  onSendToBatchPlanner,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'pipeline' | 'agents' | 'memory'>('pipeline');
  const [topic, setTopic] = useState('');
  const [promptCount, setPromptCount] = useState<10 | 50 | 100>(50);
  const [avoidPeople, setAvoidPeople] = useState(true);
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>([
    'Adobe Stock',
    'Freepik',
    'Dreamstime',
  ]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<PipelineExecutionPlan | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [memory, setMemory] = useState<CreatorMemoryLedger>(() => {
    try {
      const saved = localStorage.getItem('creator_studio_memory_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_MEMORY;
  });

  // New Memory Note state
  const [newNoteTopic, setNewNoteTopic] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteType, setNewNoteType] = useState<CreatorMemoryItem['type']>('preference');

  // Save memory on change
  useEffect(() => {
    try {
      localStorage.setItem('creator_studio_memory_v1', JSON.stringify(memory));
    } catch {
      // ignore
    }
  }, [memory]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExecutePipeline = async (overrideTopic?: string) => {
    const targetTopic = overrideTopic || topic;
    if (!targetTopic.trim()) {
      setErrorMsg('অনুগ্রহ করে একটি বাণিজ্যিক বিষয় বা নির্দেশনা লিখুন।');
      return;
    }
    setErrorMsg(null);
    setIsExecuting(true);

    try {
      const response = await fetch('/api/agents/autonomous-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: targetTopic.trim(),
          requestedPromptCount: promptCount,
          marketplaces: selectedMarketplaces,
          pastDecisions: memory.items,
          avoidPeople,
          preferredLighting: memory.preferences.preferredLighting,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'পাইপলাইন সম্পন্ন করা যায়নি।');
      }

      setCurrentPlan(data.plan);
    } catch (err: any) {
      setErrorMsg(err.message || 'নেটওয়ার্ক বা সার্ভার ত্রুটি হয়েছে।');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleAddMemoryNote = () => {
    if (!newNoteTopic.trim() || !newNoteContent.trim()) return;
    const newItem: CreatorMemoryItem = {
      id: `mem-${Date.now()}`,
      type: newNoteType,
      topicOrTitle: newNoteTopic.trim(),
      notesBn: newNoteContent.trim(),
      appliedDate: new Date().toISOString().split('T')[0],
      tags: ['UserNote'],
    };
    setMemory((prev) => ({
      ...prev,
      items: [newItem, ...prev.items],
    }));
    setNewNoteTopic('');
    setNewNoteContent('');
  };

  const handleDeleteMemoryNote = (id: string) => {
    setMemory((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  };

  const exportPlanAsJson = () => {
    if (!currentPlan) return;
    const blob = new Blob([JSON.stringify(currentPlan, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `autonomous_pipeline_${currentPlan.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12">
      {/* Top Banner / Navigation */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-indigo-950/40 border border-zinc-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  স্বয়ংক্রিয় এআই ডিজিটাল কনটেন্ট ব্যবসায়িক সিস্টেম
                </h2>
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs px-2.5 py-0.5 rounded-full font-medium">
                  ৭টি বিশেষজ্ঞ এজেন্ট সমন্বিত
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                শুধু একটি বিষয় বাংলায় লিখুন—সিস্টেম পরিকল্পনা, ৫০-১০০ প্রম্পট, আসল ফাইল বিশ্লেষণ, মান যাচাই, মেটাডেটা ও বিক্রির অগ্রগতি পরিচালনা করবে।
              </p>
            </div>
          </div>

          {/* Sub-tab Switcher */}
          <div className="flex items-center bg-zinc-950/80 p-1 rounded-lg border border-zinc-800 self-start md:self-auto">
            <button
              onClick={() => setActiveSubTab('pipeline')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeSubTab === 'pipeline'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>বিজনেস পাইপলাইন</span>
            </button>
            <button
              onClick={() => setActiveSubTab('agents')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeSubTab === 'agents'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>৭ বিশেষজ্ঞ এজেন্ট হাব</span>
            </button>
            <button
              onClick={() => setActiveSubTab('memory')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeSubTab === 'memory'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>মেমরি ও অতীত সিদ্ধান্ত</span>
              {memory.items.length > 0 && (
                <span className="bg-zinc-800 text-zinc-300 text-[10px] px-1.5 py-0.2 rounded-full">
                  {memory.items.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 1. PIPELINE TAB */}
      {activeSubTab === 'pipeline' && (
        <div className="flex flex-col gap-6">
          {/* Input & Parameters Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  বাণিজ্যিক বিষয় বা ক্লায়েন্ট ব্রিফ (বাংলায় লিখুন)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isExecuting) handleExecutePipeline();
                    }}
                    placeholder="যেমন: রমজান ও ঈদের প্রিমিয়াম ড্রাইড ফ্রুটস ও এরাবিক গিফট হ্যাম্পার প্যাকেজিং..."
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg pl-3.5 pr-28 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <button
                      onClick={() => handleExecutePipeline()}
                      disabled={isExecuting || !topic.trim()}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold px-3.5 py-1.5 rounded-md transition-colors flex items-center gap-1.5 shadow"
                    >
                      {isExecuting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>পরিচালনা হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>পাইপলাইন চালান</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Sample Topic Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-zinc-400 font-medium">জনপ্রিয় উদাহরণ:</span>
                {[
                  'সাফাওয়ী খেজুর ও প্রিমিয়াম অলিভ অয়েল কমার্শিয়াল শট',
                  'লাক্সারি ওউদ পারফিউম বোতল ও গোল্ডেন মার্বেল পেডেস্টাল',
                  'স্মার্ট হোম আইওটি অটোমেশন ডিভাইস ও মিনিমাল কিচেন',
                  'অর্গানিক স্কিনকেয়ার সিরাম ও ভেষজ উপাদান',
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setTopic(sample);
                      handleExecutePipeline(sample);
                    }}
                    className="bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 text-zinc-300 text-[11px] px-2.5 py-1 rounded-full transition-colors"
                  >
                    {sample}
                  </button>
                ))}
              </div>

              {/* Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-zinc-800">
                {/* Prompt Count */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">
                    পরিকল্পিত প্রম্পটের সংখ্যা
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {([10, 50, 100] as const).map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setPromptCount(cnt)}
                        className={`py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                          promptCount === cnt
                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        {cnt}টি প্রম্পট
                      </button>
                    ))}
                  </div>
                </div>

                {/* No People Policy */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">
                    মডেল রিলিজ ও রিজেকশন সুরক্ষা
                  </label>
                  <button
                    type="button"
                    onClick={() => setAvoidPeople(!avoidPeople)}
                    className={`w-full py-1.5 px-3 text-xs font-medium rounded-lg border transition-colors flex items-center justify-between ${
                      avoidPeople
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <span>মানুষ ছাড়া (No People) নিরাপদ নিশ</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                      {avoidPeople ? 'সক্রিয়' : 'বন্ধ'}
                    </span>
                  </button>
                </div>

                {/* Model Tier Note */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">
                    Gemini কোঅর্ডিনেটেড টায়ার
                  </label>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 px-3 text-xs text-zinc-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Pro (প্ল্যান) + Flash (টাস্ক)</span>
                    </span>
                    <span className="text-[10px] text-zinc-400">AI Pro অন্তর্ভুক্ত</span>
                  </div>
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Current Execution Results View */}
          {currentPlan ? (
            <div className="flex flex-col gap-6">
              {/* Plan Header & Meta */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      সম্পূর্ণ ব্যবসায়িক পাইপলাইন প্রস্তুত
                    </span>
                    <span className="text-xs text-zinc-400">
                      ইঞ্জিন: <span className="text-zinc-200 font-medium">{currentPlan.engineUsed}</span>
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1.5">
                    বিষয়: {currentPlan.topic} ({currentPlan.requestedPromptCount}টি প্রম্পট প্ল্যান)
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {currentPlan.costInfoBn}
                  </p>
                  {currentPlan.apiQuotaNotice && (
                    <div className="mt-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>{currentPlan.apiQuotaNotice}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={exportPlanAsJson}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs px-3 py-1.5 rounded-lg border border-zinc-700 transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>JSON রপ্তানি</span>
                  </button>
                  {onNavigate && (
                    <button
                      onClick={() => onNavigate('batch-planner')}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>ব্যাচ প্রম্পট প্ল্যানারে খুলুন</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 7-Agent Integrated Output Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Agent 1: Chief Orchestrator (4 Cols) */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  {/* Orchestrator Card */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">👑</span>
                        <h4 className="text-sm font-bold text-white">
                          প্রধান সমন্বয়কারী (Chief Orchestrator)
                        </h4>
                      </div>
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded">
                        Gemini 3.1 Pro
                      </span>
                    </div>

                    <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-lg p-3 text-xs text-zinc-300 leading-relaxed mb-4">
                      <p className="font-semibold text-zinc-200 mb-1">উদ্দেশ্য বিশ্লেষণ:</p>
                      <p>{currentPlan.orchestrator.intentAnalysisBn}</p>
                    </div>

                    {/* Clarifying Questions */}
                    {currentPlan.orchestrator.clarifyingQuestionsBn.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 mb-2">
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>পরবর্তী উন্নতির জন্য পরামর্শমূলক প্রশ্ন:</span>
                        </div>
                        <ul className="space-y-1.5 text-xs text-zinc-300">
                          {currentPlan.orchestrator.clarifyingQuestionsBn.map((q, idx) => (
                            <li key={idx} className="bg-zinc-950/50 border border-zinc-800/60 rounded p-2 flex items-start gap-2">
                              <span className="text-amber-400 font-bold shrink-0">{idx + 1}.</span>
                              <span>{q}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Step-by-Step Roadmap */}
                    <div>
                      <p className="text-xs font-semibold text-zinc-300 mb-2">৭টি কাজের বিভাজন ও স্থিতি:</p>
                      <div className="space-y-2">
                        {currentPlan.orchestrator.executionSteps.map((step) => (
                          <div
                            key={step.stepNumber}
                            className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/60 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                                {step.stepNumber}
                              </span>
                              <div>
                                <p className="font-medium text-zinc-200">{step.titleBn}</p>
                                <p className="text-[11px] text-zinc-400">{step.descriptionBn}</p>
                              </div>
                            </div>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Agent 2: Market Research Card */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📊</span>
                        <h4 className="text-sm font-bold text-white">
                          মার্কেট রিসার্চ ও ট্রেন্ড বিশ্লেষক
                        </h4>
                      </div>
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded">
                        Gemini 3.1 Pro
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-zinc-950/80 p-3 rounded-lg border border-zinc-800/80">
                        <span className="text-[11px] text-zinc-400 block mb-0.5">২০২৬ ট্রেন্ড স্কোর</span>
                        <span className="text-xl font-black text-emerald-400">
                          {currentPlan.marketResearch.trendScore}/১০০
                        </span>
                      </div>
                      <div className="bg-zinc-950/80 p-3 rounded-lg border border-zinc-800/80">
                        <span className="text-[11px] text-zinc-400 block mb-0.5">চাহিদার মাত্রা</span>
                        <span className="text-sm font-bold text-indigo-300">
                          {currentPlan.marketResearch.commercialDemandIndex}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-zinc-300">
                      <div>
                        <span className="font-semibold text-zinc-200 block mb-1">স্বল্প প্রতিযোগিতার সাব-নিশ:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {currentPlan.marketResearch.lowCompetitionNiches.map((n, i) => (
                            <span key={i} className="bg-zinc-800/80 text-zinc-300 px-2 py-0.5 rounded text-[11px] border border-zinc-700/60">
                              {n}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/60 mt-2">
                        <span className="font-semibold text-emerald-400 block mb-0.5 text-[11px]">নো-পিপল পলিসির লাভ:</span>
                        <p className="text-[11px] text-zinc-400">{currentPlan.marketResearch.noPeopleAdvantageBn}</p>
                      </div>
                    </div>
                  </div>

                  {/* Agent 7: Sales & Revenue Card */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">💰</span>
                        <h4 className="text-sm font-bold text-white">
                          বিক্রয় ও আয় বিশ্লেষক (Sales Analyst)
                        </h4>
                      </div>
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded">
                        Gemini 3.1 Pro
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-zinc-950/80 p-3 rounded-lg border border-zinc-800/80">
                        <span className="text-[10px] text-zinc-400 block">মাসিক ডাউনলোড প্রক্ষেপণ</span>
                        <span className="text-xs font-bold text-zinc-200">
                          {currentPlan.salesAnalyst.estimatedMonthlyDownloads}
                        </span>
                      </div>
                      <div className="bg-zinc-950/80 p-3 rounded-lg border border-zinc-800/80">
                        <span className="text-[10px] text-zinc-400 block">সম্ভাব্য রয়্যালটি রেঞ্জ</span>
                        <span className="text-xs font-bold text-emerald-400">
                          {currentPlan.salesAnalyst.estimatedRoyaltyRange}
                        </span>
                      </div>
                    </div>

                    <div className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/60 text-xs text-zinc-300 space-y-2">
                      <p>
                        <span className="font-semibold text-zinc-200">পোর্টফোলিও প্যাকেজিং: </span>
                        {currentPlan.salesAnalyst.portfolioPackagingGuideBn}
                      </p>
                      <p>
                        <span className="font-semibold text-indigo-300">পরবর্তী সেরা পদক্ষেপ: </span>
                        {currentPlan.salesAnalyst.nextActionRecommendationBn}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Side: Agents 3, 4, 5, 6 (7 Cols) */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  {/* Agent 3: Prompt Planner Card */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📝</span>
                        <div>
                          <h4 className="text-sm font-bold text-white">
                            প্রম্পট পরিকল্পনাকারী ({currentPlan.promptPlanner.totalPlanned}টি প্রম্পট আর্কিটেকচার)
                          </h4>
                          <p className="text-[11px] text-zinc-400">
                            {currentPlan.promptPlanner.varietySummaryBn}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded shrink-0">
                        Gemini 3.1 Pro
                      </span>
                    </div>

                    {/* Sample Prompts List */}
                    <div className="space-y-3 mt-4">
                      {currentPlan.promptPlanner.samplePrompts.map((p, idx) => (
                        <div
                          key={p.id || idx}
                          className="bg-zinc-950 border border-zinc-800/90 rounded-lg p-3.5 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="font-semibold text-indigo-300">
                              #{idx + 1}. {p.title}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => copyToClipboard(p.prompt, `prompt-${idx}`)}
                                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded text-[11px] transition-colors flex items-center gap-1"
                              >
                                {copiedKey === `prompt-${idx}` ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span>কপি হয়েছে</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>প্রম্পট কপি</span>
                                  </>
                                )}
                              </button>
                              {onUsePromptInStudio && (
                                <button
                                  onClick={() => onUsePromptInStudio(p.prompt, 'image')}
                                  className="bg-indigo-600/80 hover:bg-indigo-600 text-white px-2 py-1 rounded text-[11px] transition-colors flex items-center gap-1"
                                >
                                  <Sparkles className="w-3 h-3" />
                                  <span>ইমেজে বানান</span>
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="bg-zinc-900/90 p-2.5 rounded border border-zinc-800 font-mono text-[11px] text-zinc-300 leading-relaxed mb-2 select-all">
                            {p.prompt}
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] text-zinc-400">
                            <div className="bg-zinc-900/60 p-1.5 rounded">
                              <span className="text-zinc-500 block">কম্পোজিশন:</span>
                              <span className="text-zinc-300 font-medium">{p.composition}</span>
                            </div>
                            <div className="bg-zinc-900/60 p-1.5 rounded">
                              <span className="text-zinc-500 block">আলো:</span>
                              <span className="text-zinc-300 font-medium">{p.lighting}</span>
                            </div>
                            <div className="bg-zinc-900/60 p-1.5 rounded">
                              <span className="text-zinc-500 block">ক্যামেরা অ্যাঙ্গেল:</span>
                              <span className="text-zinc-300 font-medium">{p.cameraAngle}</span>
                            </div>
                            <div className="bg-zinc-900/60 p-1.5 rounded">
                              <span className="text-zinc-500 block">ব্যাকগ্রাউন্ড:</span>
                              <span className="text-zinc-300 font-medium">{p.background}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Batch Action Banner */}
                    <div className="mt-4 p-3 bg-indigo-950/30 border border-indigo-800/50 rounded-lg flex items-center justify-between">
                      <div className="text-xs text-indigo-300">
                        <span className="font-semibold block">ব্যাচ কিউ ইন্টিগ্রেশন:</span>
                        <span>এই বিষয়ের সম্পূর্ণ {currentPlan.promptPlanner.totalPlanned}টি বাণিজ্যিক প্রম্পট স্বয়ংক্রিয় ব্যাচ কিউতে পরিচালনা করুন।</span>
                      </div>
                      {onNavigate && (
                        <button
                          onClick={() => onNavigate('batch-planner')}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors shrink-0 flex items-center gap-1 shadow"
                        >
                          <span>ব্যাচ প্ল্যানারে যান</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Agents 4 & 5 Grid: Visual Inspector + QA Auditor */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Visual Inspector */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🔍</span>
                            <h4 className="text-sm font-bold text-white">
                              ছবি ও ভিডিও বিশ্লেষক
                            </h4>
                          </div>
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded">
                            Gemini 3.8 Flash
                          </span>
                        </div>

                        <div className="space-y-2.5 text-xs text-zinc-300">
                          <div className="bg-zinc-950/60 p-2.5 rounded border border-zinc-800/60">
                            <span className="text-[10px] text-zinc-400 font-medium block mb-0.5">শার্পনেস নিয়ম:</span>
                            <p className="text-[11px] text-zinc-200">{currentPlan.visualInspector.sharpnessRuleBn}</p>
                          </div>
                          <div className="bg-zinc-950/60 p-2.5 rounded border border-zinc-800/60">
                            <span className="text-[10px] text-zinc-400 font-medium block mb-0.5">লাইটিং ও কালার:</span>
                            <p className="text-[11px] text-zinc-200">{currentPlan.visualInspector.lightingGuidelinesBn}</p>
                          </div>
                          <div className="bg-zinc-950/60 p-2 rounded border border-zinc-800/60 flex items-center justify-between text-[11px]">
                            <span className="text-zinc-400">টার্গেট রেজোলিউশন:</span>
                            <span className="text-indigo-300 font-semibold">{currentPlan.visualInspector.resolutionTarget}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* QA Auditor */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🛡️</span>
                            <h4 className="text-sm font-bold text-white">
                              মান যাচাইকারী (QA Auditor)
                            </h4>
                          </div>
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded">
                            Gemini 3.8 Flash
                          </span>
                        </div>

                        <div className="flex items-center justify-between bg-zinc-950/80 p-2.5 rounded border border-zinc-800 mb-3">
                          <span className="text-xs text-zinc-400">কমপ্লায়েন্স স্কোর:</span>
                          <span className="text-base font-black text-emerald-400">
                            {currentPlan.qualityAssurance.complianceScore}%
                          </span>
                        </div>

                        <div className="space-y-1.5 text-[11px] text-zinc-300">
                          {currentPlan.qualityAssurance.passedChecks.map((chk, idx) => (
                            <div key={idx} className="flex items-start gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{chk}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-zinc-800 flex items-center justify-between text-[11px]">
                        <span className="text-zinc-400">রিজেকশন ঝুঁকি:</span>
                        <span className="text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10">
                          {currentPlan.qualityAssurance.rejectionRiskLevel}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Agent 6: Stock Metadata Specialist */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🏷️</span>
                        <h4 className="text-sm font-bold text-white">
                          স্টক-মেটাডেটা বিশেষজ্ঞ (Stock Metadata Specialist)
                        </h4>
                      </div>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded">
                        Gemini 3.8 Flash
                      </span>
                    </div>

                    {/* Title */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-zinc-400 font-medium">
                          বাণিজ্যিক শিরোনাম ({currentPlan.stockMetadata.title.length} অক্ষরের অপ্টিমাইজড)
                        </span>
                        <button
                          onClick={() => copyToClipboard(currentPlan.stockMetadata.title, 'meta-title')}
                          className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                        >
                          {copiedKey === 'meta-title' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>কপি</span>
                        </button>
                      </div>
                      <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800 text-xs text-zinc-200 font-medium">
                        {currentPlan.stockMetadata.title}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-zinc-400 font-medium">এসইও ডেসক্রিপশন (২ বাক্য)</span>
                        <button
                          onClick={() => copyToClipboard(currentPlan.stockMetadata.description, 'meta-desc')}
                          className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                        >
                          {copiedKey === 'meta-desc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>কপি</span>
                        </button>
                      </div>
                      <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800 text-xs text-zinc-300 leading-relaxed">
                        {currentPlan.stockMetadata.description}
                      </div>
                    </div>

                    {/* Keywords */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-zinc-400 font-medium">
                          ৪৫টি কমা-সেপারেটেড ভেরিফাইড কিওয়ার্ড ({currentPlan.stockMetadata.keywords.length}টি প্রস্তুত)
                        </span>
                        <button
                          onClick={() => copyToClipboard(currentPlan.stockMetadata.keywords.join(', '), 'meta-kw')}
                          className="bg-indigo-600/80 hover:bg-indigo-600 text-white text-[11px] px-2.5 py-1 rounded transition-colors flex items-center gap-1"
                        >
                          {copiedKey === 'meta-kw' ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>সব কপি হয়েছে</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>সব কিওয়ার্ড কপি</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="bg-zinc-950 p-3 rounded border border-zinc-800 max-h-36 overflow-y-auto flex flex-wrap gap-1.5">
                        {currentPlan.stockMetadata.keywords.map((kw, i) => (
                          <span
                            key={i}
                            className="bg-zinc-800/80 text-zinc-300 px-2 py-0.5 rounded text-[11px] border border-zinc-700/60"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="bg-zinc-900/60 border border-dashed border-zinc-800 rounded-xl p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                <BrainCircuit className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                এখনো কোনো পাইপলাইন পরিচালনা করা হয়নি
              </h3>
              <p className="text-xs text-zinc-400 max-w-md leading-relaxed mb-6">
                উপরে আপনার বাণিজ্যিক বিষয় বা ব্রিফ বাংলায় লিখে “পাইপলাইন চালান” বাটনে ক্লিক করুন। আমাদের ৭টি বিশেষজ্ঞ এআই এজেন্ট তাৎক্ষণিকভাবে সমন্বয় করে সম্পূর্ণ রোডম্যাপ ও সম্পদ প্রস্তুত করবে।
              </p>
              <button
                onClick={() => {
                  const defaultSample = 'রমজান ও ঈদের প্রিমিয়াম ড্রাইড ফ্রুটস ও এরাবিক গিফট হ্যাম্পার প্যাকেজিং';
                  setTopic(defaultSample);
                  handleExecutePipeline(defaultSample);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow"
              >
                <Sparkles className="w-4 h-4" />
                <span>নমুনা ব্যবসায়িক পাইপলাইন দেখুন</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. AGENTS MATRIX TAB */}
      {activeSubTab === 'agents' && (
        <div className="flex flex-col gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-base font-bold text-white mb-1">
              ৭টি বিশেষজ্ঞ AI এজেন্টের আর্কিটেকচার ও দায়িত্ব ম্যাট্রিক্স
            </h3>
            <p className="text-xs text-zinc-400">
              প্রত্যেক এজেন্টের দায়িত্ব, প্রয়োজনীয় ইনপুট, প্রত্যাশিত আউটপুট এবং পরবর্তী এজেন্টের কাছে হস্তান্তরের নিয়ম নির্ধারিত রয়েছে। অপ্রয়োজনীয় AI কল রোধ করতে সমন্বিত মডেল ক্যাশিং নীতি প্রয়োগ করা হয়।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SPECIALIST_AGENTS.map((agent) => (
              <div
                key={agent.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-white">{agent.nameBn}</h4>
                      <p className="text-xs text-indigo-300 font-mono mt-0.5">{agent.nameEn}</p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${
                        agent.modelTier.includes('Pro')
                          ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {agent.modelTier}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed mb-3 bg-zinc-950/60 p-2.5 rounded border border-zinc-800/60">
                    {agent.roleBn}
                  </p>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="font-semibold text-zinc-200 block mb-1">মূল দায়িত্বসমূহ:</span>
                      <ul className="space-y-1 text-zinc-400">
                        {agent.responsibilities.map((r, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-indigo-400 font-bold">•</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80">
                      <div>
                        <span className="font-semibold text-zinc-300 text-[11px] block mb-0.5">প্রয়োজনীয় ইনপুট:</span>
                        <ul className="text-[11px] text-zinc-400 space-y-0.5">
                          {agent.requiredInputs.map((inp, idx) => (
                            <li key={idx}>- {inp}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="font-semibold text-emerald-400 text-[11px] block mb-0.5">সরাসরি আউটপুট:</span>
                        <ul className="text-[11px] text-zinc-400 space-y-0.5">
                          {agent.directOutputs.map((out, idx) => (
                            <li key={idx}>✓ {out}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800 space-y-1.5 text-[11px]">
                  <div className="flex items-start gap-1.5 text-zinc-300">
                    <ArrowRight className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span><strong className="text-zinc-200">হস্তান্তর নিয়ম:</strong> {agent.handoffRuleBn}</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-emerald-400/90">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span><strong className="text-emerald-300">খরচ নিয়ন্ত্রণ:</strong> {agent.antiWastePolicyBn}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. MEMORY & PAST DECISIONS TAB */}
      {activeSubTab === 'memory' && (
        <div className="flex flex-col gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-base font-bold text-white mb-1">
              স্টুডিও মেমরি ও লার্নিং হিস্ট্রি (Creator Memory Ledger)
            </h3>
            <p className="text-xs text-zinc-400">
              সিস্টেম আপনার ব্যক্তিগত পছন্দ, আগের সিদ্ধান্ত, সফল ও ব্যর্থ কাজ এবং রিজেকশন থেকে অর্জিত শিক্ষা স্থায়ীভাবে সংরক্ষণ করে যাতে পরবর্তী প্রতিটি পাইপলাইনে স্বয়ংক্রিয়ভাবে তার উন্নতি প্রতিফলিত হয়।
            </p>
          </div>

          {/* Add New Memory Note Form */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider mb-3">
              নতুন অভিজ্ঞতা বা সিদ্ধান্ত সংরক্ষণ করুন
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">ধরণ</label>
                <select
                  value={newNoteType}
                  onChange={(e) => setNewNoteType(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none"
                >
                  <option value="preference">পছন্দ (Preference)</option>
                  <option value="past-decision">আগের সিদ্ধান্ত (Past Decision)</option>
                  <option value="success-log">সফল কাজের নোট (Success Log)</option>
                  <option value="failure-lesson">ভুল বা রিজেকশন শিক্ষা (Failure Lesson)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] text-zinc-400 mb-1">বিষয় বা শিরোনাম</label>
                <input
                  type="text"
                  value={newNoteTopic}
                  onChange={(e) => setNewNoteTopic(e.target.value)}
                  placeholder="যেমন: জুয়েলারি ছবিতে অতিরিক্ত শ্যাডো পরিহার..."
                  className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none"
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-[11px] text-zinc-400 mb-1">শিক্ষা বা বিস্তারিত নোট</label>
              <textarea
                rows={2}
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="পরবর্তী কাজের সময় সিস্টেম যাতে এই ভুলটি না করে বা এই পছন্দ বজায় রাখে..."
                className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg p-2.5 text-xs text-zinc-200 focus:outline-none"
              />
            </div>
            <button
              onClick={handleAddMemoryNote}
              disabled={!newNoteTopic.trim() || !newNoteContent.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>মেমরিতে যোগ করুন</span>
            </button>
          </div>

          {/* Memory Items List */}
          <div className="space-y-3">
            {memory.items.map((item) => (
              <div
                key={item.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        item.type === 'failure-lesson'
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          : item.type === 'success-log'
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                      }`}
                    >
                      {item.type === 'failure-lesson'
                        ? 'ভুল বা রিজেকশন শিক্ষা'
                        : item.type === 'success-log'
                        ? 'সফল কাজের নোট'
                        : item.type === 'preference'
                        ? 'পছন্দ'
                        : 'আগের সিদ্ধান্ত'}
                    </span>
                    <h5 className="font-bold text-zinc-100">{item.topicOrTitle}</h5>
                    <span className="text-[10px] text-zinc-500">{item.appliedDate}</span>
                  </div>
                  <p className="text-zinc-300 leading-relaxed">{item.notesBn}</p>
                </div>

                <button
                  onClick={() => handleDeleteMemoryNote(item.id)}
                  className="text-zinc-500 hover:text-red-400 text-xs px-2 py-1 rounded transition-colors self-end sm:self-auto"
                >
                  মুছে ফেলুন
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
