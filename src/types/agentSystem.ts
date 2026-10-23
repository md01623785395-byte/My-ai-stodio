export type SpecialistAgentId =
  | 'orchestrator'
  | 'prompt-planner'
  | 'visual-inspector'
  | 'qa-auditor'
  | 'stock-metadata'
  | 'market-research'
  | 'sales-revenue';

export interface SpecialistAgentProfile {
  id: SpecialistAgentId;
  nameBn: string;
  nameEn: string;
  roleBn: string;
  roleEn: string;
  modelTier: 'Gemini 3.1 Pro' | 'Gemini 3.8 Flash';
  whyThisModel: string;
  responsibilities: string[];
  requiredInputs: string[];
  directOutputs: string[];
  handoffTo: SpecialistAgentId[];
  handoffRuleBn: string;
  antiWastePolicyBn: string;
}

export interface PipelineExecutionPlan {
  id: string;
  topic: string;
  requestedPromptCount: 10 | 50 | 100;
  marketplaces: string[];
  createdAt: string;
  status: 'planning' | 'running' | 'completed' | 'failed';
  currentAgentStep?: SpecialistAgentId;

  // Agent 1: Orchestrator
  orchestrator: {
    intentAnalysisBn: string;
    clarifyingQuestionsBn: string[];
    executionSteps: {
      stepNumber: number;
      agentId: SpecialistAgentId;
      titleBn: string;
      descriptionBn: string;
      status: 'pending' | 'in-progress' | 'completed';
    }[];
    priorityLevel: 'High Commercial' | 'Standard' | 'Niche Specialist';
  };

  // Agent 2: Market Research & Trends
  marketResearch: {
    trendScore: number; // 0-100
    lowCompetitionNiches: string[];
    recommendedStyleBn: string;
    commercialDemandIndex: 'Very High' | 'High' | 'Moderate';
    bestPlatforms: string[];
    noPeopleAdvantageBn: string;
  };

  // Agent 3: Prompt Planner
  promptPlanner: {
    totalPlanned: number;
    varietySummaryBn: string;
    samplePrompts: {
      id: string;
      title: string;
      prompt: string;
      scene: string;
      composition: string;
      lighting: string;
      cameraAngle: string;
      background: string;
    }[];
  };

  // Agent 4: Visual & Motion Inspector
  visualInspector: {
    sharpnessRuleBn: string;
    lightingGuidelinesBn: string;
    resolutionTarget: string;
    motionSpecsBn?: string;
    colorGradingNoteBn: string;
  };

  // Agent 5: QA & Policy Auditor
  qualityAssurance: {
    complianceScore: number; // 0-100
    passedChecks: string[];
    warningOrFlags: string[];
    marketplacePolicyVerified: boolean;
    rejectionRiskLevel: 'Very Low' | 'Low' | 'Medium';
  };

  // Agent 6: Stock Metadata Specialist
  stockMetadata: {
    title: string; // 50-70 chars
    description: string; // 2 clean sentences
    keywords: string[]; // 45 comma separated verified keywords
    category: string;
  };

  // Agent 7: Sales & Revenue Analyst
  salesAnalyst: {
    estimatedMonthlyDownloads: string;
    estimatedRoyaltyRange: string;
    portfolioPackagingGuideBn: string;
    nextActionRecommendationBn: string;
  };

  engineUsed: string;
  tierUsed: string;
  costInfoBn: string;
  apiQuotaNotice?: string;
  isOfflineFallback?: boolean;
}

export interface CreatorMemoryItem {
  id: string;
  type: 'preference' | 'past-decision' | 'success-log' | 'failure-lesson';
  topicOrTitle: string;
  notesBn: string;
  appliedDate: string;
  tags: string[];
}

export interface CreatorMemoryLedger {
  preferences: {
    favoriteNiches: string[];
    avoidPeople: boolean;
    preferredLighting: string;
    defaultPromptCount: 10 | 50 | 100;
  };
  items: CreatorMemoryItem[];
}
