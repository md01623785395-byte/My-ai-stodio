export type GeminiModelId =
  | 'gemini-3.8-flash'
  | 'gemini-3.1-flash-lite'
  | 'gemini-flash-latest'
  | 'gemini-3.1-pro-preview'
  | 'gemini-4-argon'
  | 'gemini-3.1-flash-lite-image'
  | 'gemini-nano-banana-2.1';

export type AIModelStatus =
  | 'active'
  | 'quota_exceeded'
  | 'rate_limited'
  | 'high_demand'
  | 'permission_denied'
  | 'error'
  | 'untested';

export interface ModelHealthInfo {
  modelId: string;
  name: string;
  role: string;
  tier: 'Free Tier' | 'Paid Tier' | 'Experimental';
  status: AIModelStatus;
  httpStatus?: number;
  lastTested?: string;
  lastSuccess?: string;
  lastError?: string;
  lastLatencyMs?: number;
  consecutiveFailures: number;
  cooldownUntil: number; // timestamp in ms
  cooldownRemainingSeconds: number;
  quotaLimit?: string;
  isImageModel?: boolean;
}

export interface DiagnosticsSummary {
  timestamp: string;
  apiKeyPresent: boolean;
  apiKeyMasked: string;
  activeModelsCount: number;
  quotaExceededCount: number;
  highDemandCount: number;
  overallStatus: 'all_operational' | 'partial_quota_limited' | 'high_demand_spikes' | 'no_key';
  models: ModelHealthInfo[];
  recommendationBn: string;
}
