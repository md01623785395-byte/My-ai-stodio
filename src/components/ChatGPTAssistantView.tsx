import React, { useState, useEffect, useRef } from 'react';
import { StudioTab, Asset } from '../types';
import { AutonomousBusinessPipeline } from './AutonomousBusinessPipeline';
import {
  Bot,
  Send,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Image as ImageIcon,
  Video,
  KeyRound,
  ShieldCheck,
  Tag,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Sliders,
  User,
  Zap,
  Info,
  Layers,
  BrainCircuit,
  MessageSquare,
  Activity,
} from 'lucide-react';

interface ChatGPTAssistantViewProps {
  onUsePromptInStudio?: (prompt: string, type: 'image' | 'video') => void;
  onNavigate?: (tab: StudioTab) => void;
  onSaveToAssets?: (asset: Omit<Asset, 'id' | 'createdAt' | 'views'>) => void;
  onOpenGeminiDiagnostics?: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
  model?: string;
  tierNote?: string;
  costEstimate?: string;
  timestamp: string;
  metadata?: {
    title?: string;
    description?: string;
    keywords?: string[];
    prompt?: string;
  };
}

interface GeminiAgentStatus {
  configured: boolean;
  model: string;
  geminiProModel?: string;
  geminiFlashModel?: string;
  officialWebUrl: string;
  hasGeminiFallback: boolean;
  costInfo: {
    pricing: string;
    officialWeb: string;
    studioGemini: string;
  };
}

const QUICK_PROMPT_PILLARS = [
  {
    id: 'deep-strategy',
    label: '🧠 ৫০-১০০ প্রম্পট ও বাণিজ্যিক কৌশল (Gemini Pro)',
    category: 'strategy',
    icon: Sparkles,
    prompt: 'আমার জন্য একটি নতুন বাণিজ্যিক থিমের ৫০-১০০টি বৈচিত্র্যময় ছবির গভীর পরিকল্পনা, কোন নিশে প্রতিযোগিতা কম এবং Adobe Stock ও Freepik-এ সর্বোচ্চ রয়্যালটি পাওয়া যাবে তার একটি সমন্বিত স্ট্র্যাটেজি তৈরি করো।',
  },
  {
    id: 'safawi-dates',
    label: '⚡ ফাস্ট কমার্শিয়াল প্রম্পট (Gemini Flash)',
    category: 'prompt',
    icon: ImageIcon,
    prompt: 'সাফাওয়ী খেজুরের (Safawi dates) প্রিমিয়াম কমার্শিয়াল বিজ্ঞাপন ছবির জন্য দ্রুত একটি নিখুঁত প্রম্পট তৈরি করে দাও। সাথে ফটো রিয়েলিস্টিক লাইটিং ও ক্যামেরা লেন্সের বিবরণ দেবে।',
  },
  {
    id: 'stock-keywords',
    label: '🏷️ ৪৫টি স্টক কিওয়ার্ড ও টাইটেল',
    category: 'metadata',
    icon: Tag,
    prompt: 'অ্যাডোবি স্টক ও ফ্রিপিকের জন্য একটি লাক্সারি পারফিউম বোতলের কমার্শিয়াল টাইটেল, এসইও ডেসক্রিপশন এবং ৪৫টি হাই-সার্চ কমা-সেপারেটেড কিওয়ার্ড দাও।',
  },
  {
    id: 'marketplace-rules',
    label: '🛡️ মার্কেটপ্লেস এআই পলিসি ২০২৬',
    category: 'policy',
    icon: ShieldCheck,
    prompt: 'Adobe Stock, Freepik, Dreamstime এবং Shutterstock-এ এআই দিয়ে তৈরি ছবি ও ভিডিও জমা দেওয়ার অফিসিয়াল নিয়মাবলী ও কোনগুলোতে নিষিদ্ধ তা পরিষ্কারভাবে জানাও।',
  },
  {
    id: 'sales-strategy',
    label: '💰 স্টক বিক্রির লাভজনক নিশ (No People)',
    category: 'monetization',
    icon: DollarSign,
    prompt: 'মানুষের ছবি ছাড়া (No People) কোন কোন বিষয়ে এআই ছবি ও ভিডিও তৈরি করলে রিজেকশন ছাড়া সবচেয়ে বেশি ডাউনলোড ও আয় পাওয়া যায়?',
  },
  {
    id: 'cinematic-video',
    label: '🎬 সিনেমাটিক ভিডিও প্রম্পট',
    category: 'prompt',
    icon: Video,
    prompt: 'একটি ড্রোন পুশ-ইন শট সিনেমাটিক ভিডিওর প্রম্পট তৈরি করো যাতে ক্যামেরা মুভমেন্ট, ২৪ এফপিএস এবং গোল্ডেন আওয়ারের লাইটিং থাকে।',
  },
];

export const ChatGPTAssistantView: React.FC<ChatGPTAssistantViewProps> = ({
  onUsePromptInStudio,
  onNavigate,
  onSaveToAssets,
  onOpenGeminiDiagnostics,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: `স্বাগতম! আমি আপনার **Google Gemini AI Agent (Creator Studio)**।

আমি আপনার বাণিজ্যিক কনটেন্ট ব্যবসার পুরো কর্মপ্রবাহ পরিচালনা করতে প্রস্তুত:
১. 🧠 **Gemini Pro মোড:** গভীর ব্যবসায়িক বিশ্লেষণ, ৫০–১০০টি ছবির সমন্বিত পরিকল্পনা এবং উচ্চপর্যায়ের স্ট্র্যাটেজি।
২. ⚡ **Gemini Flash মোড:** তাৎক্ষণিক প্রম্পট নিখুঁতকরণ, দ্রুত মেটাডেটা ও সাশ্রয়ী অপারেশন।
৩. 🏷️ **ছবি বিশ্লেষণ ও সত্যনিষ্ঠ মেটাডেটা:** বাস্তব দৃশ্যমান উপাদানের ভিত্তিতে ৫০-৭০ ক্যারেক্টারের টাইটেল, ২ বাক্যের ডেসক্রিপশন ও ৪৫টি ভেরিফাইড কিওয়ার্ড।
৪. 🛡️ **স্টক মার্কেটপ্লেস পলিসি (২০২৬):** Adobe Stock, Freepik, Dreamstime-এর অফিসিয়াল নিয়ম ও রিজেকশন রোধ।
৫. 💰 **বিক্রির অগ্রগতি ও লাভজনক নিশ:** মানুষের মুখ ছাড়া নিরাপদ কনটেন্ট দিয়ে স্থায়ী রয়্যালটি নিশ্চিত করা।

💡 **কোটা ও ব্যবহার নীতি:**
- আপনার Google AI Pro সাবস্ক্রিপশন ও AI Studio কোটা অনুসারে মডেল স্বয়ংক্রিয়ভাবে সর্বোত্তম গতিতে পরিচালিত হয়।
- কোনো কাজ বাস্তবে সফল না হলে বা মার্কেটপ্লেস সংযোগ না থাকলে মিথ্যা দাবি করা হবে না।`,
        provider: 'Google Gemini AI Agent',
        model: 'gemini-3.1-pro-preview / gemini-3.8-flash',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const [viewMode, setViewMode] = useState<'pipeline' | 'chat'>('pipeline');
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [enginePreference, setEnginePreference] = useState<'auto' | 'gemini-pro' | 'gemini-flash' | 'openai'>('auto');
  const [apiStatus, setApiStatus] = useState<GeminiAgentStatus | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [customKey, setCustomKey] = useState<string>(() => {
    return localStorage.getItem('openai_user_key') || '';
  });
  const [showKeyInput, setShowKeyInput] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load status on mount
  useEffect(() => {
    fetch('/api/chatgpt/status')
      .then((res) => res.json())
      .then((data) => setApiStatus(data))
      .catch(() => {
        setApiStatus({
          configured: false,
          model: 'gemini-3.1-pro-preview / gemini-3.8-flash',
          geminiProModel: 'gemini-3.1-pro-preview',
          geminiFlashModel: 'gemini-3.8-flash',
          officialWebUrl: 'https://aistudio.google.com',
          hasGeminiFallback: true,
          costInfo: {
            pricing: 'Google Gemini Pro / Flash: AI Studio কোটা ও সাবস্ক্রিপশন পরিচালিত',
            officialWeb: 'Google AI Studio: aistudio.google.com',
            studioGemini: 'Google Gemini Studio: লাইভ ইন্টিগ্রেটেড',
          },
        });
      });
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSaveCustomKey = (key: string) => {
    setCustomKey(key);
    if (key.trim()) {
      localStorage.setItem('openai_user_key', key.trim());
    } else {
      localStorage.removeItem('openai_user_key');
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chatgpt/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          customApiKey: customKey || undefined,
          preferredEngine: enginePreference,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          content: data.message,
          provider: data.provider,
          model: data.model,
          tierNote: data.tierNote,
          costEstimate: data.costEstimate,
          metadata: data.metadata,
          timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        // Clear truthful error display
        const errorContent = `⚠️ **${data.error || 'অনুরোধটি সম্পন্ন করা যায়নি।'}**

${
  data.code === 'NO_AI_ENGINE_CONFIGURED' || data.code === 'MISSING_GEMINI_KEY'
    ? `📌 **করণীয়:**
1. AI Studio Secrets-এ GEMINI_API_KEY সক্রিয় রয়েছে কি না যাচাই করুন।
2. অথবা **[Google AI Studio](${data.officialWebUrl || 'https://aistudio.google.com'})** থেকে আপনার অনুমোদিত API Key নিশ্চিত করুন।
3. আপনি উপরের **"Gemini Flash"** বা **"Auto"** মোড নির্বাচন করতে পারেন।`
    : `অনুগ্রহ করে প্রম্পটটি পুনরায় চেষ্টা করুন বা ভিন্ন শব্দ প্রয়োগ করুন।`
}`;

        const errorMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: errorContent,
          provider: 'System Notice',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err: any) {
      const networkErrorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `সংযোগ ত্রুটি: ${err.message || 'সার্ভারের সাথে যোগাযোগ করা যায়নি।'} অনুগ্রহ করে পুনরায় চেষ্টা করুন।`,
        provider: 'Network Error',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, networkErrorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUsePromptInImage = (promptText: string) => {
    if (onUsePromptInStudio) {
      onUsePromptInStudio(promptText, 'image');
    } else if (onNavigate) {
      onNavigate('create-image');
    }
  };

  const handleUsePromptInVideo = (promptText: string) => {
    if (onUsePromptInStudio) {
      onUsePromptInStudio(promptText, 'video');
    } else if (onNavigate) {
      onNavigate('create-video');
    }
  };

  const hasConfiguredOpenAi = !!(apiStatus?.configured || customKey.trim().length > 10);

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
      {/* Top Banner / Engine Status & Official Link */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Title & Engine details */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-950/50 shrink-0">
              <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                <Bot className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Google Gemini AI Agent
                </h1>
                <span className="text-[10px] font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Gemini 3.1 Pro & 3.8 Flash Active
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                জটিল বাণিজ্যিক পরিকল্পনা, ৫০–১০০ প্রম্পট প্রস্তুতি, ভিশন মেটাডেটা ও মার্কেটপ্লেস বিক্রির সহকারী
              </p>
            </div>
          </div>

          {/* Quick External Actions & Official Link */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {onNavigate && (
              <button
                onClick={() => onNavigate('batch-planner')}
                className="inline-flex items-center gap-1.5 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/80 text-indigo-300 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>ব্যাচ প্রম্পট প্ল্যানার (৫০–১০০)</span>
              </button>
            )}

            {/* Gemini Quota & Health Diagnostics Button */}
            {onOpenGeminiDiagnostics && (
              <button
                onClick={onOpenGeminiDiagnostics}
                className="inline-flex items-center gap-1.5 bg-violet-950/80 hover:bg-violet-900 border border-violet-700/80 text-violet-300 text-xs font-semibold px-3 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
                title="Gemini Quota & Diagnostics"
              >
                <Activity className="w-3.5 h-3.5 text-violet-400" />
                <span>কোটা ও হেলথ ডায়াগনস্টিকস</span>
              </button>
            )}

            {/* Official Google AI Studio link */}
            <a
              href="https://aistudio.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium px-3.5 py-2 rounded-xl border border-zinc-700/80 transition-all active:scale-95 shadow-sm"
              title="Open Google AI Studio"
            >
              <span>Google AI Studio</span>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
            </a>

            {/* OpenAI Key Optional Toggle Button */}
            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="inline-flex items-center gap-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs px-3 py-2 rounded-xl border border-zinc-800 transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>{customKey ? 'OpenAI Key Set' : 'Custom Keys'}</span>
            </button>
          </div>
        </div>

        {/* Optional Custom API Key input drawer */}
        {showKeyInput && (
          <div className="mt-4 pt-3 border-t border-zinc-800/80 text-xs space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                আপনার নিজস্ব OpenAI API Key (ঐচ্ছিক / Optional)
              </span>
              <span className="text-[10px] text-zinc-500">ব্রাউজার লোকাল স্টোরেজে সংরক্ষিত থাকবে</span>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="sk-proj-..."
                value={customKey}
                onChange={(e) => handleSaveCustomKey(e.target.value)}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono"
              />
              {customKey && (
                <button
                  onClick={() => handleSaveCustomKey('')}
                  className="px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-950/40 rounded-xl transition-colors border border-red-900/40"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-[11px] text-zinc-400">
              * ডিফল্টভাবে আপনার Google AI Pro ও AI Studio-র মূল <strong>Gemini Pro ও Flash</strong> মডেলসমূহ সক্রিয় রয়েছে।
            </p>
          </div>
        )}

        {/* Engine Switcher Tabs */}
        <div className="mt-3 pt-3 border-t border-zinc-800/60 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800/80">
            <button
              onClick={() => setEnginePreference('auto')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-medium text-[11px] ${
                enginePreference === 'auto'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Auto (Smart Routing)
            </button>
            <button
              onClick={() => setEnginePreference('gemini-pro')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-medium text-[11px] flex items-center gap-1 ${
                enginePreference === 'gemini-pro'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sparkles className="w-3 h-3 text-purple-300" />
              <span>Gemini Pro (জটিল পরিকল্পনা ও কৌশল)</span>
            </button>
            <button
              onClick={() => setEnginePreference('gemini-flash')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-medium text-[11px] flex items-center gap-1 ${
                enginePreference === 'gemini-flash'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Zap className="w-3 h-3 text-emerald-300" />
              <span>Gemini Flash (দ্রুত ও সাশ্রয়ী)</span>
            </button>
          </div>

          <div className="text-[11px] text-zinc-400 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-zinc-500" />
            <span>Google AI Pro / Studio কোটা দ্বারা সরাসরি পরিচালিত</span>
          </div>
        </div>
      </div>

      {/* Main Mode Toggle: Autonomous Business Pipeline vs Conversational Chat */}
      <div className="flex items-center gap-2 p-1.5 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-sm">
        <button
          onClick={() => setViewMode('pipeline')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            viewMode === 'pipeline'
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
          }`}
        >
          <BrainCircuit className="w-4 h-4 text-indigo-300" />
          <span>⚡ স্বয়ংক্রিয় বিজনেস পাইপলাইন (৭টি বিশেষজ্ঞ এজেন্ট)</span>
        </button>

        <button
          onClick={() => setViewMode('chat')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            viewMode === 'chat'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-emerald-300" />
          <span>💬 এআই সহকারী ও চ্যাট (Gemini Chat)</span>
        </button>
      </div>

      {viewMode === 'pipeline' ? (
        <AutonomousBusinessPipeline
          onNavigate={onNavigate}
          onUsePromptInStudio={onUsePromptInStudio}
        />
      ) : (
        <>
          {/* Quick Bengali Pillars / Starters */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          দ্রুত প্রশ্ন ও নির্দেশনার টেমপ্লেট (Quick Starters):
        </p>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {QUICK_PROMPT_PILLARS.map((pill) => {
            const Icon = pill.icon;
            return (
              <button
                key={pill.id}
                onClick={() => handleSendMessage(pill.prompt)}
                disabled={isLoading}
                className="shrink-0 flex items-center gap-1.5 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white px-3 py-1.5 rounded-xl text-xs transition-all active:scale-95"
              >
                <Icon className="w-3.5 h-3.5 text-indigo-400" />
                <span>{pill.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chat Conversation Box */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col h-[520px] sm:h-[580px] shadow-2xl overflow-hidden">
        {/* Messages Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center shrink-0 shadow-md">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed space-y-3 ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-sm shadow-md shadow-indigo-950/40'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-sm'
                  }`}
                >
                  {/* Message Content */}
                  <div className="whitespace-pre-wrap font-sans space-y-2">
                    {msg.content}
                  </div>

                  {/* Assistant Extra Metadata & 1-Click Action Buttons */}
                  {!isUser && (
                    <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400">
                      <div className="flex items-center gap-2 flex-wrap">
                        {msg.provider && (
                          <span className="bg-zinc-800/80 border border-zinc-700/60 px-2 py-0.5 rounded text-[10px] text-zinc-300">
                            {msg.provider}
                          </span>
                        )}
                        {msg.tierNote && (
                          <span className="bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 px-2 py-0.5 rounded text-[10px]">
                            {msg.tierNote}
                          </span>
                        )}
                        {msg.costEstimate && (
                          <span className="text-[10px] text-emerald-400">
                            {msg.costEstimate}
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-500">{msg.timestamp}</span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Copy entire answer */}
                        <button
                          onClick={() => copyToClipboard(msg.content, msg.id)}
                          className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors flex items-center gap-1 text-[11px]"
                          title="Copy full answer"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                        </button>

                        {/* Open in Google AI Studio */}
                        <a
                          href="https://aistudio.google.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors flex items-center gap-1 text-[11px]"
                          title="Open Google AI Studio"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>AI Studio</span>
                        </a>

                        {/* If prompt extracted, button to use in Create Image / Video */}
                        {msg.metadata?.prompt && (
                          <>
                            <button
                              onClick={() => handleUsePromptInImage(msg.metadata!.prompt!)}
                              className="px-2 py-0.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded border border-indigo-700/60 flex items-center gap-1 text-[10px] font-medium transition-colors"
                            >
                              <ImageIcon className="w-3 h-3" />
                              <span>Use in Image</span>
                            </button>
                            <button
                              onClick={() => handleUsePromptInVideo(msg.metadata!.prompt!)}
                              className="px-2 py-0.5 bg-violet-600/30 hover:bg-violet-600/50 text-violet-300 rounded border border-violet-700/60 flex items-center gap-1 text-[10px] font-medium transition-colors"
                            >
                              <Video className="w-3 h-3" />
                              <span>Use in Video</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-md">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-sm p-4 text-xs text-zinc-400 flex items-center gap-2.5">
                <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
                <span>Google Gemini AI Agent উত্তর প্রস্তুত করছে...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-zinc-900/60 border-t border-zinc-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end gap-2"
          >
            <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-2 focus-within:border-indigo-500 transition-colors">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={2}
                placeholder="বাংলায় বা ইংরেজিতে লিখুন (যেমন: সাফাওয়ী খেজুরের বিজ্ঞাপন প্রম্পট, স্টক কিওয়ার্ড বা পলিসি পরীক্ষা)..."
                className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none resize-none leading-relaxed"
              />
              <div className="flex items-center justify-between pt-1 border-t border-zinc-900 text-[10px] text-zinc-500">
                <span>Enter = পাঠান · Shift+Enter = নতুন লাইন</span>
                <span>বাংলা ও ইংরেজি উভয় ভাষা সমর্থিত</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl shadow-lg shadow-indigo-950/50 transition-all active:scale-95 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
      </>
      )}
    </div>
  );
};
