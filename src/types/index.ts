export type StudioTab = 'dashboard' | 'autonomous-pipeline' | 'account-manager' | 'batch-planner' | 'create-image' | 'create-video' | 'my-assets' | 'marketing-ai' | 'chatgpt' | 'settings';

export * from './accountManager';
export * from './salesAnalytics';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface DeviceInfo {
  deviceType: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  orientation: 'portrait' | 'landscape';
  screenWidth: number;
  screenHeight: number;
}

export type AssetType = 'image' | 'video' | 'marketing';

export type AspectRatioType = '1:1' | '16:9' | '9:16' | '4:3' | '3:2' | '21:9';

export interface Asset {
  id: string;
  title: string;
  type: AssetType;
  prompt: string;
  negativePrompt?: string;
  style: string;
  aspectRatio: AspectRatioType;
  dimensions: string;
  duration?: string; // For videos (e.g., '6s')
  fps?: number;
  url: string;
  thumbnailUrl: string;
  createdAt: string;
  isFavorite: boolean;
  model: string;
  views?: number;
  source?: 'Google Flow' | 'Studio' | 'MiniMax' | 'Gemini' | 'Imported';
  sourceUrl?: string;
  fileSize?: string;
  fileFormat?: string;
  license?: string;
  preparedMetadata?: PreparedStockMetadata;
}

export interface GenerationSettings {
  aspectRatio: AspectRatioType;
  style: string;
  quality: 'draft' | 'high' | 'ultra-4k';
  numOutputs: number;
  guidanceScale: number;
  seed: number;
  negativePrompt: string;
  cameraMovement?: string;
  videoDuration?: '4s' | '8s' | '16s';
  fps?: 24 | 30 | 60;
  motionIntensity?: number;
}

export interface MarketingCampaign {
  id: string;
  brandName: string;
  productName: string;
  platform: 'instagram' | 'tiktok' | 'linkedin' | 'facebook';
  tone: string;
  generatedHeadline: string;
  caption: string;
  suggestedPrompt: string;
  imageUrl: string;
  createdAt: string;
}

export interface MarketingChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  category?: 'niche' | 'concept' | 'metadata' | 'advice' | 'general';
  metadata?: {
    title?: string;
    description?: string;
    keywords?: string[];
    prompt?: string;
    mediaType?: 'image' | 'video';
    niche?: string;
  };
}

export interface StockNicheTrend {
  id: string;
  title: string;
  category: string;
  demand: 'High' | 'Very High' | 'Top Trending';
  competition: 'Low' | 'Medium' | 'Emerging';
  growth: string;
  bestFor: 'Image' | 'Video' | 'Both';
  description: string;
  keywords: string[];
  samplePrompt: string;
}

export interface MarketplacePolicy {
  id: string;
  name: string;
  logoText: string;
  badge: 'অনুমোদিত' | 'শর্তসাপেক্ষ' | 'নিষিদ্ধ';
  badgeColor: 'green' | 'amber' | 'red';
  aiAccepted: boolean;
  aiPolicyBangla: string;
  technicalRequirements: string;
  exclusivityRule: string;
  crossPostingSupported: boolean;
  bestFor: string;
  demandRating: string;
  // Rigorous verification categories
  peoplePolicy?: string;
  animalPolicy?: string;
  brandsLogosPolicy?: string;
  celebrityCopyrightPolicy?: string;
  releaseRequirements?: string;
  commercialUseRestrictions?: string;
}

export interface StockConceptIdea {
  id: string;
  conceptNumber: number;
  banglaTitle: string;
  commercialValue: string;
  prompt: string;
  videoPrompt?: string;
  stockTitle: string;
  stockTitleBangla?: string;
  description: string;
  keywords: string[]; // 40 relevant keywords
  category: string;
  recommendedFormat: string;
  aspectRatio?: string;
  // Subject & Human Presence Hierarchy
  subjectType?: 'no-humans' | 'minimal-humans' | 'animals';
  priorityBadge?: string;
  humanPresenceNote?: string;
  complianceChecklist?: {
    aiPolicyChecked: boolean;
    peopleRule: string;
    animalRule?: string;
    brandsAndLogosFree: boolean;
    celebrityAndCopyrightFree: boolean;
    releasesRequired: string;
    commercialUseStatus: string;
  };
  bestMarketplaces?: Array<{
    name: string;
    suitability: 'Top Choice' | 'Recommended' | 'Not Allowed';
    note: string;
  }>;
  crossPostingNote?: string;
}

export type ImageProvider = 'gemini' | 'minimax' | 'flow' | 'huggingface' | 'cloudflare';

export interface ImageGenerationResponse {
  success: boolean;
  imageUrl?: string;
  id?: string;
  model?: string;
  provider?: ImageProvider;
  prompt?: string;
  fullPrompt?: string;
  style?: string;
  aspectRatio?: AspectRatioType;
  dimensions?: string;
  quality?: string;
  created?: number;
  error?: string;
  code?: string;
}

export interface ApiStatus {
  status: string;
  defaultProvider?: ImageProvider;
  geminiConfigured?: boolean;
  minimaxConfigured: boolean;
  huggingfaceConfigured?: boolean;
  cloudflareConfigured?: boolean;
  model: string;
  providers?: {
    gemini: {
      id: string;
      name: string;
      model: string;
      configured: boolean;
      supportsReferenceImage?: boolean;
    };
    minimax: {
      id: string;
      name: string;
      model: string;
      configured: boolean;
      supportsReferenceImage?: boolean;
    };
    huggingface?: {
      id: string;
      name: string;
      model: string;
      configured: boolean;
      supportsReferenceImage?: boolean;
      license?: string;
      tier?: string;
    };
    cloudflare?: {
      id: string;
      name: string;
      model: string;
      configured: boolean;
      supportsReferenceImage?: boolean;
      license?: string;
      tier?: string;
      dailyFreeQuota?: string;
    };
  };
  supportedAspectRatios: string[];
}

export type StockMarketplaceId = 'adobe-stock' | 'freepik' | 'dreamstime' | 'shutterstock' | 'wirestock' | 'other';

export interface PreparedStockMetadata {
  title: string;
  description: string;
  keywords: string[];
  marketplace: StockMarketplaceId;
  marketplaceName: string;
  category: string;
  visualSubjectDescription?: string;
  aiDisclosure?: string;
  aiPolicyStatus: 'allowed' | 'conditional' | 'prohibited';
  aiPolicyBadge: string;
  aiPolicyColor: 'green' | 'amber' | 'red';
  officialPolicyNote: string;
  officialPolicyUrl?: string;
  verificationDate?: string;
  isPolicyVerified: boolean;
  labelingRequirement: string;
  humanPresenceCompliance: string;
  trademarkCompliance: string;
  technicalRequirements: string;
  factualSubjectSummary: string;
  // Technical Inspection Criteria
  techInspection?: {
    pixelCheckPassed: boolean;
    pixelDimensionsNote: string;
    formatCheckPassed: boolean;
    formatNote: string;
    sizeCheckPassed: boolean;
    sizeNote: string;
    allTechPassed: boolean;
    warnings: string[];
  };
  pixelAnalyzed?: boolean;
  analysisMethod?: 'vision-pixel' | 'user-description' | 'domain-knowledge';
  titleRule?: {
    minChars: number;
    maxChars: number;
    recommendedChars: string;
    notes: string;
  };
  groundedVerification?: {
    isGrounded: boolean;
    removedFillerWordsCount: number;
    visualConfidence: string;
    note: string;
  };
  validationAudit?: {
    marketplace: string;
    ruleTitle: string;
    checks: {
      titleWordCount: { actual: number; requiredMin: number; pass: boolean };
      titleCharacterLength: { actual: number; minRecommended: number; maxRecommended: number; maxAllowed: number; pass: boolean };
      titleSyntaxAndSuffix: { pass: boolean; details: string };
      keywordCount: { actual: number; minRequired: number; maxAllowed: number; pass: boolean };
      noProhibitedFluff: { pass: boolean; removedCount: number };
      noUnobservableIngredients: { pass: boolean };
      noTrademarkBrands: { pass: boolean; detectedBrands: string[] };
      aiDisclosureSeparation: { pass: boolean };
      noPromptArtifacts?: { pass: boolean; detectedArtifacts: string[] };
      noRepetitiveKeywords?: { pass: boolean; detectedRepetitive: string[] };
      noContradictoryKeywords?: { pass: boolean; detectedPairs: Array<{ termA: string; termB: string; conflict: string }> };
    };
    overallTechnicalPass: boolean;
    policyScopeAudit: {
      verifiedByCode: string[];
      unverifiableByCodeAlone: string[];
      disclaimerBn: string;
      deterministicSoftwareVerified?: string[];
      heuristicEstimates?: string[];
      manualVisualReviewRequired?: string[];
    };
    keywordAnomalyAudit?: {
      irrelevantCount: number;
      repetitiveCount: number;
      contradictoryCount: number;
      promptArtifactsCount: number;
      detectedIrrelevant: string[];
      detectedPromptArtifacts: string[];
      detectedRepetitive: string[];
      detectedContradictions: Array<{ termA: string; termB: string; conflict: string; explanation: string }>;
      correctionFlags: Array<{
        type: 'prompt_artifact' | 'repetitive' | 'contradictory' | 'irrelevant';
        term: string;
        reason: string;
        suggestedFix: string;
      }>;
    };
  };
}

export type BatchPromptStatus = 'planned' | 'queued' | 'generating' | 'completed' | 'failed';

export interface BatchPromptItem {
  id: string;
  index: number;
  topic: string;
  subjectBn: string;
  sceneBn: string;
  composition: string;
  lighting: string;
  colorPalette: string;
  cameraAngle: string;
  background: string;
  prompt: string;
  negativePrompt?: string;
  suggestedAspectRatio: AspectRatioType;
  commercialNiche: string;
  status: BatchPromptStatus;
  statusLabelBn: string;
  generatedAssetId?: string;
  generatedImageUrl?: string;
  errorDetails?: string;
  completedAt?: string;
}

export interface BatchDiversityAudit {
  totalRequested: number;
  totalGenerated: number;
  uniquePromptCount: number;
  uniqueSubjectBnCount: number;
  exactDuplicateCount: number;
  maxPairwiseSimilarity: number;
  avgPairwiseSimilarity: number;
  uniqueCompositionsCount: number;
  uniqueLightingCount: number;
  uniqueCameraAnglesCount: number;
  uniqueBackgroundsCount: number;
  uniqueThemesCount: number;
  diversityScore: number;
  passed: boolean;
  warnings: string[];
  auditTimestamp: string;
}

export interface BatchPlan {
  id: string;
  topic: string;
  requestedCount: number;
  styleCategory: string;
  createdAt: string;
  prompts: BatchPromptItem[];
  diversityAudit?: BatchDiversityAudit;
}

export interface BatchQueueStats {
  total: number;
  planned: number;
  queued: number;
  generating: number;
  completed: number;
  failed: number;
}

export type AutonomousTaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'blocked' | 'manual_required';

export interface AutonomousTaskItem {
  id: string;
  title: string;
  type: 'image' | 'video';
  prompt: string;
  negativePrompt?: string;
  aspectRatio: AspectRatioType;
  style: string;
  status: AutonomousTaskStatus;
  statusLabelBn: string;
  statusLabelEn: string;
  exactReason: string;
  retryCount: number;
  maxRetries: number;
  duplicateHash: string;
  targetMarketplace: StockMarketplaceId;
  autoEnhance: boolean;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  assetId?: string;
  assetThumbnailUrl?: string;
  dimensions?: string;
  fileSize?: string;
  zipBlob?: Blob;
  zipFilename?: string;
  errorDetails?: string;
  complianceScore?: number;
  humanReviewRequired?: boolean;
  humanReviewApproved?: boolean;
  marketResearchSummary?: string;
  submissionStatusMessage?: string;
  blockerCategory?: TaskBlockerCategory;
  isStaleRunning?: boolean;
  staleRunningDurationMs?: number;
}

export type TaskBlockerCategory =
  | 'image_generation_quota'
  | 'asset_missing'
  | 'validation_failure'
  | 'integration_unauthorized'
  | 'external_model_required'
  | 'other';

export interface AutonomousQueueStats {
  total: number;
  completed: number;
  running: number;
  pending: number;
  blocked: number;
  manualRequired: number;
  failed: number;
}

