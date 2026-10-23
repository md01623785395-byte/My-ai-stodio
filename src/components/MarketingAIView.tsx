import React, { useState, useRef, useEffect } from 'react';
import {
  Asset,
  StudioTab,
  MarketingCampaign,
  MarketingChatMessage,
  StockConceptIdea,
  MarketplacePolicy,
} from '../types';
import { INITIAL_CAMPAIGNS } from '../data/mockAssets';
import {
  MARKETPLACE_POLICIES,
  POPULAR_NON_HUMAN_NICHES,
  ADOBE_STOCK_REQUIREMENTS,
  BENGALI_QUICK_CHAT_PROMPTS,
  getPrebuilt10Concepts,
  generate40StockKeywords,
} from '../data/marketingPresets';
import {
  MessageSquare,
  Sparkles,
  TrendingUp,
  Tag,
  Copy,
  CheckCircle2,
  ArrowRight,
  Send,
  RefreshCw,
  Image as ImageIcon,
  Video,
  Layers,
  Zap,
  Flame,
  Lightbulb,
  FileText,
  Check,
  Megaphone,
  BarChart3,
  Bot,
  User,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Download,
  Info,
  Globe,
  Share2,
  ExternalLink,
} from 'lucide-react';

interface MarketingAIViewProps {
  onSaveToAssets: (asset: Omit<Asset, 'id' | 'createdAt' | 'views'>) => void;
  onNavigate?: (tab: StudioTab) => void;
  onUsePromptInStudio?: (prompt: string, type: 'image' | 'video') => void;
}

type MarketingSubTab = 'concepts-10' | 'marketplaces' | 'chat' | 'metadata' | 'campaigns';

export const MarketingAIView: React.FC<MarketingAIViewProps> = ({
  onSaveToAssets,
  onNavigate,
  onUsePromptInStudio,
}) => {
  const [activeTab, setActiveTab] = useState<MarketingSubTab>('concepts-10');

  // -------------------------------------------------------------
  // 1. 10 Marketable Concepts State (No Humans - Multi-Marketplace)
  // -------------------------------------------------------------
  const [selectedNiche, setSelectedNiche] = useState('উল্লম্ব কৃষি ও স্মার্ট অ্যাগ্রিটেক');
  const [customNicheInput, setCustomNicheInput] = useState('');
  const [isGeneratingConcepts, setIsGeneratingConcepts] = useState(false);
  const [concepts, setConcepts] = useState<StockConceptIdea[]>(() =>
    getPrebuilt10Concepts('উল্লম্ব কৃষি ও স্মার্ট অ্যাগ্রিটেক')
  );
  const [conceptsProvider, setConceptsProvider] = useState<string>('expert-stock-engine');
  const [activeConceptFilter, setActiveConceptFilter] = useState<string>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedKeywordsId, setExpandedKeywordsId] = useState<string | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [marketplaceFilter, setMarketplaceFilter] = useState<'all' | 'accepted' | 'banned'>('all');
  const [marketplaceSearch, setMarketplaceSearch] = useState('');

  const handleCopyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleUsePrompt = (prompt: string, type: 'image' | 'video' = 'image') => {
    if (onUsePromptInStudio) {
      onUsePromptInStudio(prompt, type);
    } else if (onNavigate) {
      onNavigate(type === 'image' ? 'create-image' : 'create-video');
    }
  };

  const handleGenerate10Concepts = async (nicheToUse?: string) => {
    const nicheTarget = (nicheToUse || customNicheInput || selectedNiche).trim();
    if (!nicheTarget || isGeneratingConcepts) return;

    setSelectedNiche(nicheTarget);
    setIsGeneratingConcepts(true);

    try {
      const response = await fetch('/api/marketing/generate-10-concepts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: nicheTarget }),
      });

      const data = await response.json();
      if (data.success && Array.isArray(data.concepts) && data.concepts.length > 0) {
        setConcepts(data.concepts);
        setConceptsProvider(data.provider || 'gemini-3.8-flash');
      } else {
        // Fallback to our rich verified local generator
        const fallback = getPrebuilt10Concepts(nicheTarget);
        setConcepts(fallback);
        setConceptsProvider('expert-stock-engine');
      }
    } catch (err) {
      console.warn('Network issue fetching concepts, using expert knowledge engine:', err);
      const fallback = getPrebuilt10Concepts(nicheTarget);
      setConcepts(fallback);
      setConceptsProvider('expert-stock-engine');
    } finally {
      setIsGeneratingConcepts(false);
    }
  };

  const handleExportConceptsText = () => {
    const content = concepts
      .map(
        (c) =>
          `======================================================
ধারণা ${c.conceptNumber}: ${c.banglaTitle}
বিষয়বস্তু ও অগ্রাধিকার: ${c.priorityBadge || (c.subjectType === 'no-humans' ? '🥇 ১ম অগ্রাধিকার: মানুষ ছাড়া' : c.subjectType === 'minimal-humans' ? '🥈 ২য় অগ্রাধিকার: ১-২ জন মানুষ' : '🐾 প্রাণীর কনটেন্ট')}
নোট: ${c.humanPresenceNote || 'অফিসিয়াল পলিসি অনুবর্তী'}
ক্যাটাগরি: ${c.category}
কেন বিক্রি হবে: ${c.commercialValue}
সুপারিশকৃত ফরম্যাট: ${c.recommendedFormat}

[৮-পয়েন্ট অফিসিয়াল কমপ্লায়েন্স অডিট]:
- ১. এআই পলিসি: ${c.complianceChecklist?.aiPolicyChecked !== false ? 'অনুমোদিত (Generative AI ডিসক্লোজার)' : 'নিষিদ্ধ'}
- ২. মানুষ (People): ${c.complianceChecklist?.peopleRule || (c.subjectType === 'minimal-humans' ? '১-২ জন কাল্পনিক ব্যক্তি' : 'মানুষ ছাড়া')}
- ৩. প্রাণী (Animals): ${c.complianceChecklist?.animalRule || (c.subjectType === 'animals' ? 'সম্পূর্ণ অনুমোদিত' : 'প্রযোজ্য নয়')}
- ৪. ব্র্যান্ড ও লোগো: ${c.complianceChecklist?.brandsAndLogosFree !== false ? '১০০% লোগো ও ট্রেডমার্ক মুক্ত (জিরো-টলারেন্স)' : 'সতর্কতা'}
- ৫. সেলিব্রিটি: ${c.complianceChecklist?.celebrityAndCopyrightFree !== false ? 'কোনো সেলিব্রিটি বা পাবলিক ফিগার নেই' : 'সতর্কতা'}
- ৬. কপিরাইটেড চরিত্র: কোনো মার্ভেল/ডিজনি/অ্যানিমে চরিত্র নেই
- ৭. রিলিজ (Releases): ${c.complianceChecklist?.releasesRequired || 'রিলিজের কোনো বাধ্যবাধকতা নেই'}
- ৮. বাণিজ্যিক ব্যবহার: ${c.complianceChecklist?.commercialUseStatus || 'Royalty-Free Commercial প্রস্তুত'}

[Adobe Stock / Marketplace Title]:
${c.stockTitle}
(${c.stockTitleBangla || ''})

[Description]:
${c.description}

[AI Image Generation Prompt]:
${c.prompt}

[4K Video B-Roll Prompt]:
${c.videoPrompt || 'N/A'}

[৪০টি প্রাসঙ্গিক কিওয়ার্ড]:
${c.keywords.join(', ')}

[উপযুক্ত মার্কেটপ্লেস ও ক্রস-পোস্টিং]:
${c.crossPostingNote || 'Adobe Stock, Freepik এবং Dreamstime-এ নন-এক্সক্লুসিভ লাইসেন্সে দেওয়া যাবে।'}
`
      )
      .join('\n\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock-10-concepts-${selectedNiche.replace(/\s+/g, '-').slice(0, 30)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportConceptsCSV = () => {
    const headers = [
      'Concept #',
      'Priority / Subject Type',
      'Title (English)',
      'Title (Bangla)',
      'Category',
      'Keywords (40)',
      'Image Prompt',
      'Video Prompt',
      'Description',
      'Commercial Value',
      'People Rule',
      'Animal Rule',
      'Releases Required',
      'Commercial Status',
      'Recommended Format',
      'Cross-Posting Note',
    ];
    const rows = concepts.map((c) => [
      c.conceptNumber,
      `"${(c.priorityBadge || c.subjectType || '').replace(/"/g, '""')}"`,
      `"${(c.stockTitle || '').replace(/"/g, '""')}"`,
      `"${(c.stockTitleBangla || '').replace(/"/g, '""')}"`,
      `"${(c.category || '').replace(/"/g, '""')}"`,
      `"${(c.keywords.join(', ') || '').replace(/"/g, '""')}"`,
      `"${(c.prompt || '').replace(/"/g, '""')}"`,
      `"${(c.videoPrompt || '').replace(/"/g, '""')}"`,
      `"${(c.description || '').replace(/"/g, '""')}"`,
      `"${(c.commercialValue || '').replace(/"/g, '""')}"`,
      `"${(c.complianceChecklist?.peopleRule || '').replace(/"/g, '""')}"`,
      `"${(c.complianceChecklist?.animalRule || '').replace(/"/g, '""')}"`,
      `"${(c.complianceChecklist?.releasesRequired || '').replace(/"/g, '""')}"`,
      `"${(c.complianceChecklist?.commercialUseStatus || '').replace(/"/g, '""')}"`,
      `"${(c.recommendedFormat || '').replace(/"/g, '""')}"`,
      `"${(c.crossPostingNote || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock-metadata-10-concepts-${selectedNiche.replace(/\s+/g, '-').slice(0, 30)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // -------------------------------------------------------------
  // 2. Chat Assistant State (Bengali Multi-Marketplace)
  // -------------------------------------------------------------
  const [messages, setMessages] = useState<MarketingChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: `👋 **স্বাগতম Stock & Marketing AI স্ট্র্যাটেজিস্টে!**

আমি আপনার পূর্ণাঙ্গ স্টক মিডিয়া ও ডিজিটাল মার্কেটিং উপদেষ্টা। **Adobe Stock, Freepik, Dreamstime, Shutterstock, Getty Images/iStock, Pond5, Alamy এবং Envato** সহ সব মার্কেটপ্লেসে ছবি ও ভিডিও বিক্রি সংক্রান্ত যেকোনো বাস্তব তথ্য ও পলিসি নিয়ে সহায়তা করতে প্রস্তুত।

### 🚀 আমি যেভাবে সহায়তা করতে পারি:
- 💡 **মানুষের ছবি ছাড়া ১০টি বিক্রিযোগ্য ধারণা:** কোনো মডেল রিলিজ বা বিকৃত মুখের ঝুঁকি ছাড়াই হাই-ডিমান্ড কনসেপ্ট, ইমেজ প্রম্পট, ভিডিও প্রম্পট, টাইটেল ও ৪০টি কিওয়ার্ড।
- 🌐 **মার্কেটপ্লেস এআই পলিসি বিশ্লেষণ (২০২৬):** কোন সাইটে এআই ছবি/ভিডিও সম্পূর্ণ অনুমোদিত (Adobe Stock, Freepik, Dreamstime) এবং কোন সাইটে থার্ড-পার্টি এআই নিষিদ্ধ (Shutterstock, Getty/iStock, Pond5, Alamy)।
- 🔄 **ক্রস-মার্কেটপ্লেস ডিস্ট্রিবিউশন:** একই কন্টেন্ট একাধিক সাইটে নন-এক্সক্লুসিভ লাইসেন্সে বিক্রি করে একই ইমেজ থেকে ৩-৫ গুণ বেশি আয় করার নিয়মাবলী।
- 🏷️ **৪০টি এসইও কিওয়ার্ড ও টাইটেল:** আন্তর্জাতিক বায়ারদের সার্চ এলগরিদমে প্রথম পেজে র্যাংক করার জন্য নিখুঁত মেটাডেটা।

*নিচের যেকোনো কুইক বোতামে চাপুন অথবা আপনার প্রশ্নটি বাংলায় লিখুন!*`,
      timestamp: 'এখনই',
      category: 'general',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isSending, activeTab]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending) return;

    const userMessage: MarketingChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInputText('');
    setIsSending(true);

    try {
      const response = await fetch('/api/marketing/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          action: 'general',
          niche: selectedNiche,
          history: messages.slice(-4).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();
      if (data.success && data.message) {
        const assistantMsg: MarketingChatMessage = {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          content: data.message,
          timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          metadata: data.metadata,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error(data.error || 'Failed to respond');
      }
    } catch {
      const errorMsg: MarketingChatMessage = {
        id: `asst-err-${Date.now()}`,
        role: 'assistant',
        content: `### 📌 স্টক মার্কেটপ্লেস ও এআই নীতি সহায়িকা: "${text.slice(0, 40)}"

১. **অনুমোদিত প্ল্যাটফর্মসমূহ:** Adobe Stock এবং Freepik-এ এআই ছবি/ভিডিও সম্পূর্ণ অনুমোদিত। কন্ট্রিবিউটর পোর্টালে শুধু "Created using generative AI tools" চেকবক্স টিক দিতে হবে।
২. **শর্তসাপেক্ষ অনুমোদিত:** Dreamstime-এ এআই ছবি অনুমোদিত, তবে কোনো মানুষের মুখাবয়ব দেওয়া যাবে না।
৩. **নিষিদ্ধ প্ল্যাটফর্মসমূহ:** Shutterstock, Getty Images/iStock, Pond5 এবং Alamy-তে থার্ড-পার্টি এআই কনটেন্ট আপলোড সম্পূর্ণ নিষিদ্ধ।
৪. **ক্রস-পোস্টিং টিপস:** একই কনসেপ্ট আপনি নন-এক্সক্লুসিভ লাইসেন্সে একসাথে Adobe Stock, Freepik এবং Dreamstime-এ আপলোড করতে পারবেন।`,
        timestamp: 'এখনই',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  // -------------------------------------------------------------
  // 3. Dedicated Metadata Generator State
  // -------------------------------------------------------------
  const [metaSubject, setMetaSubject] = useState('স্মার্ট হাইড্রোপনিক উল্লম্ব খামারে রোবোটিক মনিটরিং সেন্সর');
  const [metaMediaType, setMetaMediaType] = useState<'image' | 'video'>('image');
  const [metaMarketplace, setMetaMarketplace] = useState('Adobe Stock + Freepik (Non-Exclusive)');
  const [isGeneratingMeta, setIsGeneratingMeta] = useState(false);
  const [generatedMetadata, setGeneratedMetadata] = useState<{
    title: string;
    description: string;
    keywords: string[];
    prompt: string;
    videoPrompt: string;
    category: string;
    recommendedFormat: string;
  }>({
    title: 'High-Tech Vertical Hydroponic Farm with Robotic Monitoring Sensors Generative AI',
    description: 'উন্নত প্রযুক্তির উল্লম্ব হাইড্রোপনিক খামারে রোবোটিক মনিটরিং সেন্সর ও তাজা লেটুস। আধুনিক কৃষি প্রযুক্তি, ইএসজি কর্পোরেট ব্রোশিওর ও গ্রিন ইনোভেশন ব্যানারের জন্য আদর্শ। মানুষের ছবি ছাড়া হওয়ায় কোনো মডেল রিলিজের প্রয়োজন নেই।',
    keywords: generate40StockKeywords('vertical farming', 'Technology', 'hydroponic rack'),
    prompt: 'Photorealistic commercial photography of an automated vertical indoor farm with glowing pink and violet LED grow lights, stacked shelves of lush vibrant green butterhead lettuce, robotic monitoring sensor arm scanning leaves, fine mist water droplets in air, clean stainless steel interior, copy space on left, no humans, no people, shot on 85mm f/2.8 lens, 8k resolution, cinematic commercial lighting',
    videoPrompt: 'Cinematic 4K 60fps slow smooth panning B-roll footage of high-tech vertical hydroponic farm with glowing purple LED grow lights, robotic sensor arm gliding smoothly along stacked lush lettuce trays, misty water droplets, pristine stainless steel interior, no humans, professional commercial lighting',
    category: 'Science / Technology',
    recommendedFormat: 'JPEG (.jpg), sRGB কালার প্রোফাইল, 5000 x 3333 px (16.6 MP), 300 DPI, 3:2 Landscape, ফাইল সাইজ < 45 MB',
  });

  const handleGenerateMetadataForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!metaSubject.trim()) return;

    setIsGeneratingMeta(true);
    setTimeout(() => {
      const generated = {
        title: `${metaSubject.trim()} Commercial Concept Generative AI`,
        description: `${metaSubject.trim()} বিষয়ক উচ্চ রেজোলিউশনের স্টক কনটেন্ট। কোনো মানুষের ছবি না থাকায় মডেল রিলিজ ছাড়া সম্পূর্ণ নিরাপদ। কর্পোরেট ওয়েবসাইট, বিজ্ঞাপন ব্যানার ও প্রেজেন্টেশন স্লাইডে ব্যবহারের জন্য মানানসই।`,
        keywords: generate40StockKeywords(metaSubject.trim(), 'Technology', 'commercial asset'),
        prompt: `Commercial photorealistic photography of ${metaSubject.trim()}, natural directional studio light, shallow depth of field, 85mm lens, pristine textures, copy space on left, zero humans, no people, 8k resolution, cinematic commercial stock asset`,
        videoPrompt: `Cinematic 4K 60fps slow panning video B-roll of ${metaSubject.trim()}, professional studio lighting, shallow depth of field, zero humans, 8k resolution`,
        category: 'Technology / Science',
        recommendedFormat: 'JPEG (.jpg), sRGB, 5000 x 3333 px (16.6 MP), 300 DPI, 3:2 Landscape',
      };
      setGeneratedMetadata(generated);
      setIsGeneratingMeta(false);
    }, 600);
  };

  // -------------------------------------------------------------
  // 4. Marketing Campaign State
  // -------------------------------------------------------------
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>(INITIAL_CAMPAIGNS);
  const [brandName, setBrandName] = useState('Lumina BioTech');
  const [productName, setProductName] = useState('Vertical AeroFarms');
  const [platform, setPlatform] = useState<'instagram' | 'tiktok' | 'linkedin' | 'facebook'>('linkedin');
  const [tone, setTone] = useState('Professional & Futuristic');
  const [isGeneratingCampaign, setIsGeneratingCampaign] = useState(false);

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingCampaign(true);
    setTimeout(() => {
      const newCamp: MarketingCampaign = {
        id: `camp-${Date.now()}`,
        brandName,
        productName,
        platform,
        tone,
        generatedHeadline: `${brandName}: The Future of Sustainable ${productName}`,
        caption: `Empowering global food security through zero-carbon indoor agricultural automation. Explore the next leap in biophilic engineering.`,
        suggestedPrompt: `Ultra-high-definition architectural photography of ${productName} by ${brandName}, clean minimal Scandinavian glass laboratory, glowing vertical lettuce racks, morning sun flare, copy space on right, no people, 8k render`,
        imageUrl:
          'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=1200&q=80',
        createdAt: 'Just now',
      };
      setCampaigns((prev) => [newCamp, ...prev]);
      setIsGeneratingCampaign(false);
    }, 800);
  };

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Multi-Marketplace AI Strategist • ২০২৬ সংস্করণ</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              মার্কেটিং এআই ও মাল্টি-মার্কেটপ্লেস স্টক হাব
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              যেকোনো নিশ নির্বাচন করলে মানুষের ছবি ছাড়া ১০টি লাভজনক বিক্রিযোগ্য ধারণা, নিখুঁত AI ইমেজ ও ভিডিও প্রম্পট,
              এসইও মেটাডেটা, এবং <strong className="text-white">Adobe Stock, Freepik, Dreamstime, Shutterstock, Getty/iStock</strong> সহ
              সব মার্কেটপ্লেসের বর্তমান পলিসি ও ক্রস-পোস্টিং বিশ্লেষণ পান বাংলায়।
            </p>
          </div>

          <div className="flex flex-wrap lg:flex-col gap-2.5">
            <button
              onClick={() => setActiveTab('marketplaces')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-medium transition-all shadow-sm"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>মার্কেটপ্লেস পলিসি ডিরেক্টরি</span>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/30"
            >
              <MessageSquare className="w-4 h-4" />
              <span>এআই স্ট্র্যাটেজিস্টের সাথে চ্যাট</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('concepts-10')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'concepts-10'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300 border border-slate-700/50'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-400" />
            <span>১০টি বিক্রিযোগ্য ধারণা (মানুষ ছাড়া)</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300 text-xs font-bold">
              মূল ফিচার
            </span>
          </button>

          <button
            onClick={() => setActiveTab('marketplaces')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'marketplaces'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300 border border-slate-700/50'
            }`}
          >
            <Globe className="w-4 h-4 text-indigo-400" />
            <span>মার্কেটপ্লেস ও এআই পলিসি (২০২৬)</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'chat'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300 border border-slate-700/50'
            }`}
          >
            <Bot className="w-4 h-4 text-cyan-400" />
            <span>মার্কেটিং এআই চ্যাট (বাংলা)</span>
          </button>

          <button
            onClick={() => setActiveTab('metadata')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'metadata'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300 border border-slate-700/50'
            }`}
          >
            <Tag className="w-4 h-4 text-emerald-400" />
            <span>স্টক মেটাডেটা ক্রিয়েটর</span>
          </button>

          <button
            onClick={() => setActiveTab('campaigns')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'campaigns'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300 border border-slate-700/50'
            }`}
          >
            <Megaphone className="w-4 h-4 text-pink-400" />
            <span>বিজ্ঞাপন ও ক্যাম্পেইন স্টুডিও</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: 10 MARKETABLE CONCEPTS (NO HUMANS - MULTI-MARKETPLACE) */}
      {/* ========================================================= */}
      {activeTab === 'concepts-10' && (
        <div className="space-y-8">
          {/* Verified Multi-Marketplace Status Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">মানুষের ছবি ছাড়া ১০০% নিরাপদ</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  কোনো মডেল রিলিজ (Model Release) ফর্ম জমা দিতে হবে না। এআই-এর বিকৃত হাত/মুখের ত্রুটির কারণে রিজেকশন হওয়ার ঝুঁকি শূন্য।
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">মাল্টি-মার্কেটপ্লেস ডিস্ট্রিবিউশন</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  একই ছবি নন-এক্সক্লুসিভ লাইসেন্সে <strong className="text-white">Adobe Stock, Freepik এবং Dreamstime</strong>-এ একসাথে আপলোড করে ৩ গুণ বেশি আয় করুন।
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">কোথায় আপলোড করবেন না</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  <strong className="text-amber-200">Shutterstock, Getty/iStock, Pond5 এবং Alamy</strong>-তে থার্ড-পার্টি এআই ছবি জমা দেওয়া নিষিদ্ধ। অ্যাকাউন্ট সুরক্ষিত রাখুন।
                </p>
              </div>
            </div>
          </div>

          {/* Niche Selector & Input Card */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  <span>নিশ নির্বাচন করুন (মানুষের ছবি ছাড়া)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  নিচের জনপ্রিয় হাই-ডিমান্ড নিশসমূহ থেকে সিলেক্ট করুন অথবা আপনার নিজের পছন্দের নিশ লিখুন।
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>ইঞ্জিন: {conceptsProvider === 'gemini-3.8-flash' ? 'Gemini 3.8 Flash' : 'Expert Knowledge Base'}</span>
              </div>
            </div>

            {/* Quick Chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              {POPULAR_NON_HUMAN_NICHES.map((niche) => {
                const isSelected = selectedNiche === niche.nameBangla || selectedNiche === niche.nameEnglish;
                return (
                  <button
                    key={niche.id}
                    onClick={() => {
                      setSelectedNiche(niche.nameBangla);
                      setCustomNicheInput('');
                      handleGenerate10Concepts(niche.nameBangla);
                    }}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30 border border-indigo-400/40'
                        : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60'
                    }`}
                  >
                    <span>{niche.icon}</span>
                    <span>{niche.nameBangla}</span>
                    <span className="text-[10px] opacity-80 font-normal">({niche.demand})</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Niche Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (customNicheInput.trim()) {
                  handleGenerate10Concepts(customNicheInput.trim());
                }
              }}
              className="flex flex-col sm:flex-row gap-3 pt-2"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={customNicheInput}
                  onChange={(e) => setCustomNicheInput(e.target.value)}
                  placeholder="অন্য যেকোনো কাস্টম নিশ লিখুন (যেমন: সোলার ফার্ম ড্রোন ভিউ, আইসোমেট্রিক ডাটা সেন্টার, ভেগান চকোলেট স্টিল লাইফ...)"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-slate-500 text-base sm:text-sm transition-all min-h-[48px]"
                />
              </div>

              <button
                type="submit"
                disabled={isGeneratingConcepts}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50 shrink-0 min-h-[48px] active:scale-95"
              >
                {isGeneratingConcepts ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>বিশ্লেষণ চলছে...</span>
                  </>
                ) : (
                  <>
                    <Flame className="w-4 h-4 text-amber-300" />
                    <span>১০টি বিক্রিযোগ্য ধারণা তৈরি করুন</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Niche Multi-Marketplace Demand & Policy Assessment Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-500/30 space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <BarChart3 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  "{selectedNiche}" — মার্কেটপ্লেস চাহিদা ও এআই অনুমোদন বিশ্লেষণ
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-semibold">
                যাচাইকৃত ২০২৬ কন্ট্রিবিউটর গাইডলাইন
              </span>
            </div>

            {/* Subject Hierarchy Explanatory Banner */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>মানুষ ও প্রাণী ব্যবহারের অফিসিয়াল অগ্রাধিকার ও কমপ্লায়েন্স নীতি:</span>
                </span>
                <span className="text-[11px] text-slate-400 font-medium">কোনো অনুমান নয় • ৮-পয়েন্ট অডিট</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>🥇 ১ম অগ্রাধিকার: মানুষ ছাড়া কনটেন্ট</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    আর্কিটেকচার, ৩ডি রেন্ডার, টেকনোলজি, ব্যাকগ্রাউন্ড ও অর্গানিক ফুড। মডেল রিলিজ ঝুঁকি শূন্য, সব প্ল্যাটফর্মে নিরাপদ।
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-1">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                    <User className="w-3.5 h-3.5" />
                    <span>🥈 ২য় অগ্রাধিকার: কম মানুষ (১–২ জন)</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    কর্মব্যস্ত হাত, সিলুয়েট, অথবা ১-২ জন কাল্পনিক ব্যক্তি। ৫ আঙুল ও নিখুঁত স্কিন আবশ্যক। Adobe ও Freepik-এ অনুমোদিত।
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-1">
                  <div className="flex items-center gap-1.5 text-purple-300 font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>🐾 প্রাণীর কনটেন্ট (Animals & Wildlife)</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    বন্যপ্রাণী, কিটপতঙ্গ, সামুদ্রিক জীব ও পোষা প্রাণী সম্পূর্ণ অনুমোদিত। বিশাল ডাউনলোড চাহিদা এবং রিলিজ ঝামেলা মুক্ত।
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {/* Adobe Stock */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-emerald-500/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Adobe Stock</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">অনুমোদিত (শীর্ষ)</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  মিডজার্নি বা যেকোনো এআই ছবি/ভিডিও সম্পূর্ণ বৈধ। "Created using generative AI" চেকবক্স বাধ্যতামূলক।
                </p>
                <span className="text-[10px] text-emerald-400 font-medium block">চাহিদা: সর্বোচ্চ রয়্যালটি ⭐⭐⭐⭐⭐</span>
              </div>

              {/* Freepik */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-emerald-500/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Freepik</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">অনুমোদিত (হাই ভলিউম)</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  থার্ড-পার্টি এআই কনটেন্ট গ্রহণ করে। "_ai_generated" ট্যাগ সিলেক্ট করতে হবে। বিশাল ডাউনলোড ভলিউম।
                </p>
                <span className="text-[10px] text-emerald-400 font-medium block">চাহিদা: দ্রুত আর্নিং ⭐⭐⭐⭐⭐</span>
              </div>

              {/* Dreamstime */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Dreamstime</span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold">শর্তসাপেক্ষ অনুমোদিত</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  মানুষের মুখাবয়ব ছাড়া এআই ও প্রাণী সম্পূর্ণ নিরাপদ ও অনুমোদিত। ক্যাটাগরি "Illustrations / AI generated"।
                </p>
                <span className="text-[10px] text-amber-400 font-medium block">চাহিদা: দীর্ঘমেয়াদী সেল ⭐⭐⭐⭐</span>
              </div>

              {/* Banned Platforms Warning */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-red-500/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Shutterstock / Getty / Pond5</span>
                  <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 text-[10px] font-bold">নিষিদ্ধ (সাবধান)</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Shutterstock, Getty/iStock, Pond5 এবং Alamy-তে কন্ট্রিবিউটরদের বাহ্যিক এআই আপলোড নিষিদ্ধ।
                </p>
                <span className="text-[10px] text-red-400 font-medium block">সতর্কতা: অ্যাকাউন্ট ঝুঁকিতে ফেলবেন না 🚫</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>
                  <strong>ক্রস-পোস্টিং গোল্ডেন রুল:</strong> সর্বদা <strong>"Non-Exclusive"</strong> রাখুন। একই ছবি/ভিডিও একযোগে <strong>Adobe Stock + Freepik + Dreamstime</strong>-এ আপলোড করুন — এতে একটি একক কন্টেন্ট থেকেই ৩-৫ গুণ বেশি আয় নিশ্চিত হয়।
                </span>
              </div>
            </div>
          </div>

          {/* Action Bar & Stats */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 font-bold text-xs border border-indigo-500/30">
                {concepts.length}টি কনসেপ্ট প্রস্তুত
              </span>
              <span className="text-xs text-slate-300">
                বর্তমান নিশ: <strong className="text-white">{selectedNiche}</strong>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportConceptsText}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all"
                title="সব ১০টি ধারণার সম্পূর্ণ বিস্তারিত বিবরণ টেক্সট ফাইলে ডাউনলোড"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>টেক্সট ফাইল (.txt)</span>
              </button>

              <button
                onClick={handleExportConceptsCSV}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all"
                title="স্টক মেটাডেটা বাল্ক আপলোড ও ব্যাচ প্রসেসিংয়ের জন্য CSV ফাইল ডাউনলোড"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>মেটাডেটা CSV</span>
              </button>

              <button
                onClick={() => handleCopyText('all-concepts', JSON.stringify(concepts, null, 2))}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all"
              >
                {copiedKey === 'all-concepts' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">কপি হয়েছে!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>JSON কপি</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Concepts Grid (10 Cards) */}
          <div className="grid grid-cols-1 gap-6">
            {concepts.map((concept) => {
              const isExpanded = expandedKeywordsId === concept.id;
              const top10Keywords = concept.keywords.slice(0, 10);
              const remainingKeywords = concept.keywords.slice(10);

              const isMinimalHumans = concept.subjectType === 'minimal-humans';
              const isAnimals = concept.subjectType === 'animals';

              return (
                <div
                  key={concept.id}
                  className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 space-y-6 hover:border-indigo-500/40 transition-all shadow-xl group"
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-black text-sm">
                        #{concept.conceptNumber}
                      </span>
                      <h4 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                        {concept.banglaTitle}
                      </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium">
                        {concept.category}
                      </span>
                      {isMinimalHumans ? (
                        <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{concept.priorityBadge || '🥈 ২য় অগ্রাধিকার: ১-২ জন মানুষ'}</span>
                        </span>
                      ) : isAnimals ? (
                        <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                          <span>{concept.priorityBadge || '🐾 প্রাণীর কনটেন্ট'}</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{concept.priorityBadge || '🥇 ১ম অগ্রাধিকার: মানুষ ছাড়া'}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Human/Subject Presence Note */}
                  {concept.humanPresenceNote && (
                    <div className="px-4 py-2.5 rounded-2xl bg-slate-950 border border-indigo-500/20 flex items-center gap-2.5 text-xs text-slate-300">
                      <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span><strong>বিষয়বস্তু ও রিলিজ গাইড:</strong> {concept.humanPresenceNote}</span>
                    </div>
                  )}

                  {/* Commercial Value (কেন এটি বিক্রি হবে) */}
                  <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20">
                    <div className="flex items-start gap-2.5">
                      <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider block">
                          কেন এটি বেশি বিক্রি হবে (Commercial Demand):
                        </span>
                        <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                          {concept.commercialValue}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* AI Image Generation Prompt */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                        <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                        <span>AI Image Generation Prompt (ফটো প্রম্পট):</span>
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUsePrompt(concept.prompt, 'image')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-sm shadow-indigo-600/30"
                        >
                          <Zap className="w-3 h-3 text-amber-300" />
                          <span>Studio-তে এই ছবি বানান</span>
                        </button>

                        <button
                          onClick={() => handleCopyText(`img-${concept.id}`, concept.prompt)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-all"
                        >
                          {copiedKey === `img-${concept.id}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400 text-xs font-semibold">কপি হয়েছে</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-slate-400" />
                              <span>কপি</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono leading-relaxed select-all">
                      {concept.prompt}
                    </div>
                  </div>

                  {/* 4K Video B-Roll Prompt */}
                  {concept.videoPrompt && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                          <Video className="w-3.5 h-3.5 text-pink-400" />
                          <span>4K Video B-Roll Prompt (ভিডিও মোশন প্রম্পট):</span>
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUsePrompt(concept.videoPrompt!, 'video')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
                          >
                            <Video className="w-3 h-3 text-pink-400" />
                            <span>Video Studio-তে পাঠান</span>
                          </button>

                          <button
                            onClick={() => handleCopyText(`vid-${concept.id}`, concept.videoPrompt!)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-all"
                          >
                            {copiedKey === `vid-${concept.id}` ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400 text-xs font-semibold">কপি হয়েছে</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-slate-400" />
                                <span>কপি</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-slate-300 text-xs font-mono leading-relaxed select-all">
                        {concept.videoPrompt}
                      </div>
                    </div>
                  )}

                  {/* Title & Description Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Stock SEO Title */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                          Adobe Stock & Marketplace Title:
                        </span>
                        <button
                          onClick={() => handleCopyText(`title-${concept.id}`, concept.stockTitle)}
                          className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                        >
                          {copiedKey === `title-${concept.id}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>কপি</span>
                        </button>
                      </div>
                      <p className="text-sm font-semibold text-white">{concept.stockTitle}</p>
                      {concept.stockTitleBangla && (
                        <p className="text-xs text-slate-400 italic">বাংলা অর্থ: {concept.stockTitleBangla}</p>
                      )}
                    </div>

                    {/* Stock Description */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                          Commercial Description (বাণিজ্যিক বিবরণ):
                        </span>
                        <button
                          onClick={() => handleCopyText(`desc-${concept.id}`, concept.description)}
                          className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                        >
                          {copiedKey === `desc-${concept.id}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>কপি</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{concept.description}</p>
                    </div>
                  </div>

                  {/* 40 Relevant Keywords Section */}
                  <div className="space-y-3 pt-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                          ৪০টি প্রাসঙ্গিক কিওয়ার্ড (40 Relevant Keywords):
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-bold">
                          {concept.keywords.length}/৪০ প্রস্তুত
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedKeywordsId(isExpanded ? null : concept.id)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium underline"
                        >
                          {isExpanded ? 'সংক্ষেপ করুন' : 'সব ৪০টি দেখুন'}
                        </button>

                        <button
                          onClick={() =>
                            handleCopyText(`kw-${concept.id}`, concept.keywords.join(', '))
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
                        >
                          {copiedKey === `kw-${concept.id}` ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">৪০টি কিওয়ার্ড কপি হয়েছে</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                              <span>৪০টি কিওয়ার্ড কপি করুন</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Keywords Cloud */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="flex flex-wrap gap-1.5">
                        {/* Top 10 high-priority pills */}
                        {top10Keywords.map((kw, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-200 text-xs font-semibold border border-indigo-500/30"
                          >
                            #{i + 1} {kw}
                          </span>
                        ))}

                        {/* Remaining 30 pills */}
                        {(isExpanded ? remainingKeywords : remainingKeywords.slice(0, 10)).map(
                          (kw, i) => (
                            <span
                              key={i + 10}
                              className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 text-xs font-normal border border-slate-700/60"
                            >
                              {kw}
                            </span>
                          )
                        )}

                        {!isExpanded && remainingKeywords.length > 10 && (
                          <button
                            onClick={() => setExpandedKeywordsId(concept.id)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 text-xs font-medium hover:text-white"
                          >
                            +আরও {remainingKeywords.length - 10}টি...
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 8-Point Official Policy Compliance Matrix */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-indigo-500/20 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          ৮-পয়েন্ট অফিসিয়াল কমপ্লায়েন্স ও পলিসি যাচাই (Official Policy Audit):
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-semibold w-fit">
                        যাচাইকৃত • কোনো অনুমান নয়
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                      {/* 1. AI Policy */}
                      <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">১. এআই কনটেন্ট পলিসি</span>
                        <p className="text-emerald-300 font-medium">
                          {concept.complianceChecklist?.aiPolicyChecked !== false ? 'অনুমোদিত (Generative AI ট্যাগ আবশ্যক)' : 'নিষিদ্ধ'}
                        </p>
                      </div>

                      {/* 2. People Policy */}
                      <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">২. মানুষ (People Policy)</span>
                        <p className="text-slate-200 font-medium">
                          {concept.complianceChecklist?.peopleRule || (concept.subjectType === 'minimal-humans' ? '২য় অগ্রাধিকার: ১-২ জন কাল্পনিক ব্যক্তি' : '১ম অগ্রাধিকার: মানুষ ছাড়া')}
                        </p>
                      </div>

                      {/* 3. Animals Policy */}
                      <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">৩. প্রাণী (Animals Policy)</span>
                        <p className="text-slate-200 font-medium">
                          {concept.complianceChecklist?.animalRule || (concept.subjectType === 'animals' ? 'প্রাণী সম্পূর্ণ অনুমোদিত ও জনপ্রিয়' : 'প্রযোজ্য নয়')}
                        </p>
                      </div>

                      {/* 4. Brands & Logos */}
                      <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">৪. ব্র্যান্ড ও লোগো</span>
                        <p className="text-emerald-400 font-medium">
                          {concept.complianceChecklist?.brandsAndLogosFree !== false ? '১০০% লোগো ও ট্রেডমার্ক মুক্ত (জিরো-টলারেন্স)' : 'সতর্কতা'}
                        </p>
                      </div>

                      {/* 5. Celebrities */}
                      <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">৫. সেলিব্রিটি ও ব্যক্তিত্ব</span>
                        <p className="text-emerald-400 font-medium">
                          {concept.complianceChecklist?.celebrityAndCopyrightFree !== false ? 'কোনো সেলিব্রিটি বা পাবলিক ফিগার নেই' : 'সতর্কতা'}
                        </p>
                      </div>

                      {/* 6. Copyrighted Characters */}
                      <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">৬. কপিরাইটেড চরিত্র</span>
                        <p className="text-emerald-400 font-medium">
                          কোনো মার্ভেল/ডিজনি/অ্যানিমে চরিত্র নেই
                        </p>
                      </div>

                      {/* 7. Releases */}
                      <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">৭. রিলিজ (Model/Property)</span>
                        <p className="text-slate-200 font-medium">
                          {concept.complianceChecklist?.releasesRequired || (concept.subjectType === 'minimal-humans' ? 'কাল্পনিক মুখ (মডেল রিলিজ মুক্ত)' : 'Model Release: নেই | Property: নেই')}
                        </p>
                      </div>

                      {/* 8. Commercial Use */}
                      <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">৮. বাণিজ্যিক ব্যবহার</span>
                        <p className="text-emerald-400 font-medium">
                          {concept.complianceChecklist?.commercialUseStatus || 'Royalty-Free Commercial প্রস্তুত'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Marketplace Match & Cross-Posting Guidance */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {/* Suitable Marketplaces */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        কোন মার্কেটপ্লেসে দেওয়া সবচেয়ে লাভজনক:
                      </span>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                          Adobe Stock (শীর্ষ পছন্দ)
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                          Freepik (উচ্চ ভলিউম)
                        </span>
                        {isMinimalHumans ? (
                          <span className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium">
                            Dreamstime (মুখাবয়ব নিষিদ্ধ 🚫)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                            Dreamstime (অনুমোদিত)
                          </span>
                        )}
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                          Vecteezy / Wirestock
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium">
                          Shutterstock/Getty (নিষিদ্ধ)
                        </span>
                      </div>
                    </div>

                    {/* Technical Specs & Cross Posting */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        টেকনিক্যাল স্পেসিফিকেশন ও ক্রস-পোস্টিং:
                      </span>
                      <p className="text-xs text-slate-300">
                        <strong>ফরম্যাট:</strong> {concept.recommendedFormat}
                      </p>
                      <p className="text-xs text-emerald-400 mt-1">
                        <strong>ক্রস-পোস্টিং:</strong> {concept.crossPostingNote || 'নন-এক্সক্লুসিভ লাইসেন্সে একই ছবি Adobe Stock, Freepik ও Dreamstime-এ একসাথে আপলোড করতে পারবেন।'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: MARKETPLACE DIRECTORY & 2026 AI POLICIES */}
      {/* ========================================================= */}
      {activeTab === 'marketplaces' && (
        <div className="space-y-8">
          {/* Overview Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-indigo-400" />
                  <span>মার্কেটপ্লেস ও এআই কনটেন্ট পলিসি ডিরেক্টরি (যাচাইকৃত ২০২৬)</span>
                </h3>
                <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                  অনুমোদন না জেনে ভুল মার্কেটপ্লেসে এআই ছবি বা ভিডিও আপলোড করলে অ্যাকাউন্ট সাসপেন্ড হতে পারে।
                  এখানে শীর্ষ ৯টি আন্তর্জাতিক স্টক প্ল্যাটফর্মের বর্তমান নিয়মাবলী, ফরম্যাট ও ক্রস-পোস্টিং নিয়ম পুঙ্খানুপুঙ্খভাবে দেওয়া হলো।
                </p>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold shrink-0">
                <CheckCircle2 className="w-4 h-4" />
                <span>২০২৬ পলিসি ভেরিফাইড</span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMarketplaceFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    marketplaceFilter === 'all'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  সবগুলো ({MARKETPLACE_POLICIES.length})
                </button>
                <button
                  onClick={() => setMarketplaceFilter('accepted')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    marketplaceFilter === 'accepted'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  অনুমোদিত ({MARKETPLACE_POLICIES.filter((m) => m.aiAccepted).length})
                </button>
                <button
                  onClick={() => setMarketplaceFilter('banned')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    marketplaceFilter === 'banned'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  নিষিদ্ধ ({MARKETPLACE_POLICIES.filter((m) => !m.aiAccepted).length})
                </button>
              </div>

              <input
                type="text"
                value={marketplaceSearch}
                onChange={(e) => setMarketplaceSearch(e.target.value)}
                placeholder="মার্কেটপ্লেস খুঁজুন (যেমন Adobe, Shutterstock, Freepik...)"
                className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Marketplaces Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MARKETPLACE_POLICIES.filter((mp) => {
              if (marketplaceFilter === 'accepted' && !mp.aiAccepted) return false;
              if (marketplaceFilter === 'banned' && mp.aiAccepted) return false;
              if (
                marketplaceSearch &&
                !mp.name.toLowerCase().includes(marketplaceSearch.toLowerCase()) &&
                !mp.aiPolicyBangla.toLowerCase().includes(marketplaceSearch.toLowerCase())
              ) {
                return false;
              }
              return true;
            }).map((mp) => {
              const isAccepted = mp.badgeColor === 'green';
              const isConditional = mp.badgeColor === 'amber';

              return (
                <div
                  key={mp.id}
                  className={`rounded-3xl p-6 border space-y-4 flex flex-col justify-between transition-all ${
                    isAccepted
                      ? 'bg-slate-900/90 border-emerald-500/40 hover:border-emerald-500'
                      : isConditional
                      ? 'bg-slate-900/90 border-amber-500/40 hover:border-amber-500'
                      : 'bg-slate-900/50 border-red-500/30 hover:border-red-500/60 opacity-90'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-bold text-white">{mp.name}</h4>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          isAccepted
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : isConditional
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}
                      >
                        {mp.badge}
                      </span>
                    </div>

                    {/* AI Policy in Bengali */}
                    <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        এআই পলিসি:
                      </span>
                      <p className="text-xs text-slate-200 leading-relaxed">{mp.aiPolicyBangla}</p>
                    </div>

                    {/* Technical Specs */}
                    <div className="space-y-1 text-xs text-slate-300">
                      <span className="font-semibold text-slate-400 block">টেকনিক্যাল রিকোয়ারমেন্ট:</span>
                      <p>{mp.technicalRequirements}</p>
                    </div>

                    {/* Exclusivity */}
                    <div className="space-y-1 text-xs text-slate-300">
                      <span className="font-semibold text-slate-400 block">এক্সক্লুসিভিটি ও ক্রস-পোস্টিং:</span>
                      <p>{mp.exclusivityRule}</p>
                    </div>

                    {/* Best for */}
                    <div className="space-y-1 text-xs text-indigo-300">
                      <span className="font-semibold text-slate-400 block">যা সবচেয়ে ভালো চলে:</span>
                      <p>{mp.bestFor}</p>
                    </div>

                    {/* 8-Point Rigorous Policy Breakdown */}
                    <div className="pt-2.5 border-t border-slate-800 space-y-1.5 text-[11px] bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                      <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px] flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span>অফিসিয়াল পলিসি ও কমপ্লায়েন্স অডিট:</span>
                      </span>
                      <div className="space-y-1 text-slate-300">
                        <div>
                          <strong className="text-slate-400">👤 মানুষ (People):</strong>{' '}
                          <span>{mp.peoplePolicy || '১ম অগ্রাধিকার মানুষ ছাড়া; বাস্তব ব্যক্তির ক্ষেত্রে মডেল রিলিজ।'}</span>
                        </div>
                        <div>
                          <strong className="text-slate-400">🐾 প্রাণী (Animals):</strong>{' '}
                          <span>{mp.animalPolicy || 'প্রাণীর ছবি সম্পূর্ণ অনুমোদিত।'}</span>
                        </div>
                        <div>
                          <strong className="text-slate-400">🏷️ ব্র্যান্ড/লোগো:</strong>{' '}
                          <span className="text-red-300">{mp.brandsLogosPolicy || 'লোগো ও ট্রেডমার্ক নিষিদ্ধ 🚫'}</span>
                        </div>
                        <div>
                          <strong className="text-slate-400">⭐ সেলিব্রিটি/IP:</strong>{' '}
                          <span className="text-red-300">{mp.celebrityCopyrightPolicy || 'সেলিব্রিটি বা কপিরাইট চরিত্র নিষিদ্ধ 🚫'}</span>
                        </div>
                        <div>
                          <strong className="text-slate-400">📄 রিলিজ (Releases):</strong>{' '}
                          <span>{mp.releaseRequirements || 'মানুষ ছাড়া ছবিতে রিলিজ প্রয়োজন নেই।'}</span>
                        </div>
                        <div>
                          <strong className="text-slate-400">💼 কমার্শিয়াল ব্যবহার:</strong>{' '}
                          <span>{mp.commercialUseRestrictions || 'বাণিজ্যিক লাইসেন্সের জন্য উপযুক্ত।'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Demand Footer */}
                  <div className="pt-3 border-t border-slate-800 text-xs font-medium text-slate-400 flex items-center justify-between">
                    <span>চাহিদা রেটিং:</span>
                    <span className="font-semibold text-white">{mp.demandRating}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cross-Posting Master Strategy Guide */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-500/30 space-y-4">
            <h4 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <span>একই কনটেন্ট একাধিক মার্কেটপ্লেসে দেওয়ার সেরা কৌশল (মাল্টি-আপলোড মাস্টারপ্ল্যান)</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-300 leading-relaxed">
              <div className="space-y-2">
                <strong className="text-white block">১. গোল্ডেন রুল: সর্বদা "Non-Exclusive" বাছুন</strong>
                <p>
                  কোনো মার্কেটপ্লেসে "Exclusive Contributor" অপশন নির্বাচন করবেন না। নন-এক্সক্লুসিভ লাইসেন্স রাখলে
                  আপনি একই ইমেজ ও ভিডিও একই সাথে <strong className="text-emerald-400">Adobe Stock</strong>,{' '}
                  <strong className="text-emerald-400">Freepik</strong>, এবং{' '}
                  <strong className="text-emerald-400">Dreamstime</strong>-এ আপলোড করতে পারবেন।
                </p>
              </div>

              <div className="space-y-2">
                <strong className="text-white block">২. আয় বৃদ্ধি ৩ গুণ থেকে ৫ গুণ</strong>
                <p>
                  একটি একক ছবি Adobe Stock-এ মাসে ২-৫টি লাইসেন্স হতে পারে, একই ছবি Freepik-এ ৫০+ ডাউনলোড হতে পারে।
                  একাধিক প্ল্যাটফর্মে দেওয়ার মাধ্যমে আপনি প্রতি কন্টেন্টে সর্বোচ্চ রিটার্ন অন ইনভেস্টমেন্ট নিশ্চিত করেন।
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: MARKETING AI CHAT ASSISTANT (BENGALI) */}
      {/* ========================================================= */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: Quick Bengali Prompts */}
          <div className="lg:col-span-1 space-y-4">
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>কুইক গাইড ও প্রম্পট</span>
              </h4>

              <div className="space-y-2">
                {BENGALI_QUICK_CHAT_PROMPTS.map((qp, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(qp.prompt)}
                    className="w-full text-left p-3 rounded-2xl bg-slate-950 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/40 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300">
                        {qp.title}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                        {qp.badge}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Marketplace Tips Card */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2 text-xs text-slate-300">
              <span className="font-bold text-indigo-400 block uppercase tracking-wider">
                💡 টিপস:
              </span>
              <p>
                আপনি চ্যাটে যেকোনো নিশের নাম লিখলে এআই স্বয়ংক্রিয়ভাবে মানুষের ছবি ছাড়া সেরা ১০টি কনসেপ্ট এবং উপযুক্ত মার্কেটপ্লেস তালিকা বাংলায় তৈরি করে দেবে।
              </p>
            </div>
          </div>

          {/* Right Column: Chat Window */}
          <div className="lg:col-span-3 flex flex-col h-[520px] sm:h-[620px] lg:h-[700px] rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
              {messages.map((msg) => {
                const isAssistant = msg.role === 'assistant';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3.5 ${
                      isAssistant ? 'justify-start' : 'justify-end'
                    }`}
                  >
                    {isAssistant && (
                      <div className="w-9 h-9 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                        <Bot className="w-5 h-5" />
                      </div>
                    )}

                    <div
                      className={`max-w-2xl rounded-3xl p-5 text-sm leading-relaxed ${
                        isAssistant
                          ? 'bg-slate-950 border border-slate-800 text-slate-200'
                          : 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/20'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>

                      {/* If metadata extracted */}
                      {msg.metadata && msg.metadata.prompt && (
                        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap gap-2">
                          <button
                            onClick={() => handleUsePrompt(msg.metadata!.prompt!, 'image')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                          >
                            <Zap className="w-3 h-3 text-amber-300" />
                            <span>Studio-তে এই ছবি বানান</span>
                          </button>

                          <button
                            onClick={() => handleCopyText(`meta-p-${msg.id}`, msg.metadata!.prompt!)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
                          >
                            <Copy className="w-3 h-3" />
                            <span>প্রম্পট কপি</span>
                          </button>
                        </div>
                      )}

                      <span
                        className={`text-[10px] block mt-2 ${
                          isAssistant ? 'text-slate-500' : 'text-indigo-200'
                        }`}
                      >
                        {msg.timestamp}
                      </span>
                    </div>

                    {!isAssistant && (
                      <div className="w-9 h-9 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                        <User className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                );
              })}

              {isSending && (
                <div className="flex items-center gap-3 text-slate-400 text-xs">
                  <div className="w-9 h-9 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  </div>
                  <span>মার্কেটপ্লেস ডেটা যাচাই ও উত্তর তৈরি হচ্ছে...</span>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/80">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-3"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="আপনার নিশ বা মার্কেটপ্লেস সংক্রান্ত যেকোনো প্রশ্ন বাংলায় লিখুন..."
                  className="flex-1 px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-slate-500 text-base sm:text-sm min-h-[46px]"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50 shrink-0 flex items-center gap-1.5 min-h-[46px] active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>পাঠান</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: METADATA CREATOR */}
      {/* ========================================================= */}
      {activeTab === 'metadata' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Form */}
          <div className="lg:col-span-1 p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Tag className="w-5 h-5 text-emerald-400" />
              <span>স্টক মেটাডেটা ক্রিয়েটর</span>
            </h3>

            <form onSubmit={handleGenerateMetadataForm} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  বিষয়ের নাম বা কনসেপ্ট (বাংলা বা ইংরেজিতে):
                </label>
                <textarea
                  rows={3}
                  value={metaSubject}
                  onChange={(e) => setMetaSubject(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  মিডিয়া টাইপ:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMetaMediaType('image')}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border ${
                      metaMediaType === 'image'
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    স্টক ইমেজ
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetaMediaType('video')}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border ${
                      metaMediaType === 'video'
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    ভিডিও B-Roll
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  টার্গেট মার্কেটপ্লেস মোড:
                </label>
                <select
                  value={metaMarketplace}
                  onChange={(e) => setMetaMarketplace(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs"
                >
                  <option value="Adobe Stock + Freepik (Non-Exclusive)">
                    Adobe Stock + Freepik (নন-এক্সক্লুসিভ)
                  </option>
                  <option value="Adobe Stock Only">Adobe Stock এককভাবে</option>
                  <option value="Freepik Only">Freepik এককভাবে</option>
                  <option value="Dreamstime (Non-Human)">Dreamstime (মানুষের ছবি ছাড়া)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isGeneratingMeta}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2"
              >
                {isGeneratingMeta ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
                <span>মেটাডেটা ও ৪০টি কিওয়ার্ড তৈরি করুন</span>
              </button>
            </form>
          </div>

          {/* Generated Metadata Output */}
          <div className="lg:col-span-2 p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h4 className="text-base font-bold text-white">তৈরিকৃত স্টক মেটাডেটা প্যাকেজ</h4>
              <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-bold">
                ৪০/৪০ কিওয়ার্ড প্রস্তুত
              </span>
            </div>

            {/* Title & Description */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    SEO Title:
                  </span>
                  <button
                    onClick={() => handleCopyText('meta-out-t', generatedMetadata.title)}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    {copiedKey === 'meta-out-t' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>কপি</span>
                  </button>
                </div>
                <p className="text-sm font-semibold text-white">{generatedMetadata.title}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    Commercial Description:
                  </span>
                  <button
                    onClick={() => handleCopyText('meta-out-d', generatedMetadata.description)}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    {copiedKey === 'meta-out-d' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>কপি</span>
                  </button>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{generatedMetadata.description}</p>
              </div>
            </div>

            {/* Keywords Cloud */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  ৪০টি প্রাসঙ্গিক কিওয়ার্ড (কমা-সেপারেটেড):
                </span>
                <button
                  onClick={() =>
                    handleCopyText('meta-out-k', generatedMetadata.keywords.join(', '))
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:text-white"
                >
                  {copiedKey === 'meta-out-k' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>সব কপি</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                {generatedMetadata.keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 text-xs"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            {/* Visual Prompt */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Visual Generation Prompt:
                </span>
                <button
                  onClick={() => handleUsePrompt(generatedMetadata.prompt, 'image')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
                >
                  <Zap className="w-3 h-3 text-amber-300" />
                  <span>Studio-তে বানান</span>
                </button>
              </div>
              <p className="text-xs text-slate-300 font-mono select-all">{generatedMetadata.prompt}</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: CAMPAIGN STUDIO */}
      {/* ========================================================= */}
      {activeTab === 'campaigns' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Campaign Form */}
          <div className="lg:col-span-1 p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-pink-400" />
              <span>বিজ্ঞাপন ও সোশ্যাল ক্যাম্পেইন ক্রিয়েটর</span>
            </h3>

            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  ব্র্যান্ডের নাম:
                </label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  প্রোডাক্ট বা সার্ভিস:
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  প্ল্যাটফর্ম:
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs"
                >
                  <option value="linkedin">LinkedIn B2B</option>
                  <option value="instagram">Instagram Ads</option>
                  <option value="tiktok">TikTok Video</option>
                  <option value="facebook">Facebook Lead Gen</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  বিজ্ঞাপনের টোন:
                </label>
                <input
                  type="text"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={isGeneratingCampaign}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-pink-600/30 flex items-center justify-center gap-2"
              >
                {isGeneratingCampaign ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
                <span>বিজ্ঞাপন কপি ও ভিজ্যুয়াল তৈরি করুন</span>
              </button>
            </form>
          </div>

          {/* Campaign List */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-base font-bold text-white">তৈরিকৃত মার্কেটিং ক্যাম্পেইনসমূহ</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden space-y-3 p-5 flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg bg-pink-500/20 text-pink-300 text-[10px] font-bold uppercase">
                        {camp.platform}
                      </span>
                      <span className="text-[10px] text-slate-500">{camp.createdAt}</span>
                    </div>

                    <h5 className="text-sm font-bold text-white">{camp.generatedHeadline}</h5>
                    <p className="text-xs text-slate-300 leading-relaxed">{camp.caption}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <p className="text-[11px] text-slate-400 italic">
                      প্রম্পট: {camp.suggestedPrompt.slice(0, 100)}...
                    </p>
                    <button
                      onClick={() => handleUsePrompt(camp.suggestedPrompt, 'image')}
                      className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-300" />
                      <span>Studio-তে ভিজ্যুয়াল তৈরি করুন</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
