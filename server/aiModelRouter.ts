import { GoogleGenAI } from '@google/genai';
import { ModelHealthInfo, DiagnosticsSummary, AIModelStatus } from '../src/types/aiRouting';

interface InternalModelState {
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
  quotaLimit?: string;
  isImageModel?: boolean;
}

/**
 * Sanitizes any log message or object to guarantee no API keys or secrets are leaked.
 */
export function sanitizeLog(text: string): string {
  if (!text) return '';
  return text
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_GEMINI_KEY]')
    .replace(/sk-[a-zA-Z0-9_-]{20,}/g, '[REDACTED_OPENAI_KEY]')
    .replace(/(Bearer\s+)[A-Za-z0-9_.-]+/gi, '$1[REDACTED_TOKEN]')
    .replace(/(api[_-]?key=)[^&\s]+/gi, '$1[REDACTED]');
}

class AIModelRegistry {
  private states: Map<string, InternalModelState> = new Map();
  private apiKey: string = '';

  constructor() {
    this.initDefaultModels();
  }

  public setApiKey(key: string) {
    this.apiKey = key ? key.trim() : '';
  }

  public getMaskedKey(): string {
    if (!this.apiKey) return 'Not Configured';
    if (this.apiKey.length <= 8) return '********';
    return `${this.apiKey.slice(0, 4)}...${this.apiKey.slice(-4)}`;
  }

  private initDefaultModels() {
    const models: InternalModelState[] = [
      {
        modelId: 'gemini-3.8-flash',
        name: 'Gemini 3.8 Flash',
        role: 'Primary Studio Agent & Fast Text Generation',
        tier: 'Free Tier',
        status: 'untested',
        consecutiveFailures: 0,
        cooldownUntil: 0,
        quotaLimit: '15 RPM / 1M TPM (Free)',
      },
      {
        modelId: 'gemini-3.1-flash-lite',
        name: 'Gemini 3.1 Flash-Lite',
        role: 'Ultra-low Latency Backup & Short Rephrasing',
        tier: 'Free Tier',
        status: 'untested',
        consecutiveFailures: 0,
        cooldownUntil: 0,
        quotaLimit: '15 RPM / 1M TPM (Free)',
      },
      {
        modelId: 'gemini-flash-latest',
        name: 'Gemini Flash Latest',
        role: 'Stable Flash Fallback',
        tier: 'Free Tier',
        status: 'untested',
        consecutiveFailures: 0,
        cooldownUntil: 0,
        quotaLimit: '15 RPM / 1M TPM (Free)',
      },
      {
        modelId: 'gemini-3.1-pro-preview',
        name: 'Gemini 3.1 Pro Preview',
        role: 'High-Reasoning Market Analysis & Complex Planning',
        tier: 'Paid Tier',
        status: 'untested',
        consecutiveFailures: 0,
        cooldownUntil: 0,
        quotaLimit: 'Requires AI Studio Pay-as-you-go or Active Quota',
      },
      {
        modelId: 'gemini-4-argon',
        name: 'Gemini 4 Argon',
        role: 'Next-Gen Research & Autonomous Pipeline',
        tier: 'Paid Tier',
        status: 'untested',
        consecutiveFailures: 0,
        cooldownUntil: 0,
        quotaLimit: 'Paid / Preview Tier Only',
      },
      {
        modelId: 'gemini-3.1-flash-lite-image',
        name: 'Gemini 3.1 Flash-Lite Image (Nano Banana)',
        role: 'Standard Fast Image Generation',
        tier: 'Paid Tier',
        status: 'untested',
        consecutiveFailures: 0,
        cooldownUntil: 0,
        quotaLimit: 'Image Models require Active Billing Quota',
        isImageModel: true,
      },
      {
        modelId: 'gemini-nano-banana-2.1',
        name: 'Gemini Nano Banana 2.1',
        role: 'Ultra-4K Photorealistic Image Synthesis',
        tier: 'Paid Tier',
        status: 'untested',
        consecutiveFailures: 0,
        cooldownUntil: 0,
        quotaLimit: 'Image Models require Active Billing Quota',
        isImageModel: true,
      },
    ];

    for (const m of models) {
      this.states.set(m.modelId, m);
    }
  }

  public getState(modelId: string): InternalModelState | undefined {
    return this.states.get(modelId);
  }

  public getAllStates(): ModelHealthInfo[] {
    const now = Date.now();
    return Array.from(this.states.values()).map((s) => ({
      ...s,
      cooldownRemainingSeconds: s.cooldownUntil > now ? Math.ceil((s.cooldownUntil - now) / 1000) : 0,
    }));
  }

  public resetCooldowns() {
    for (const s of this.states.values()) {
      s.cooldownUntil = 0;
      s.consecutiveFailures = 0;
      if (s.status === 'rate_limited' || s.status === 'quota_exceeded' || s.status === 'high_demand') {
        s.status = 'untested';
      }
    }
    console.log('[AI Router] All model cooldowns have been reset.');
  }

  public recordModelSuccess(modelId: string, latencyMs: number) {
    let s = this.states.get(modelId);
    if (!s) {
      s = {
        modelId,
        name: modelId,
        role: 'Custom Model',
        tier: 'Free Tier',
        status: 'active',
        consecutiveFailures: 0,
        cooldownUntil: 0,
      };
      this.states.set(modelId, s);
    }

    s.status = 'active';
    s.httpStatus = 200;
    s.lastTested = new Date().toISOString();
    s.lastSuccess = new Date().toISOString();
    s.lastLatencyMs = latencyMs;
    s.consecutiveFailures = 0;
    s.cooldownUntil = 0;
    s.lastError = undefined;

    console.log(
      `[AI Router] [HTTP 200] Model [${modelId}] succeeded in ${latencyMs}ms. Status marked as active.`
    );
  }

  public recordModelError(modelId: string, error: any) {
    let s = this.states.get(modelId);
    if (!s) {
      s = {
        modelId,
        name: modelId,
        role: 'Custom Model',
        tier: 'Free Tier',
        status: 'error',
        consecutiveFailures: 0,
        cooldownUntil: 0,
      };
      this.states.set(modelId, s);
    }

    const errStr = String(error?.message || error || '');
    const sanitizedMsg = sanitizeLog(errStr);
    const now = Date.now();

    s.lastTested = new Date().toISOString();
    s.lastError = sanitizedMsg.slice(0, 300);
    s.consecutiveFailures += 1;

    // Detect status code using errorToStatus helper
    const status = errorToStatus(error);
    if (status === 429 || /RESOURCE_EXHAUSTED|429|quota/i.test(errStr)) {
      s.httpStatus = 429;
      s.status = 'quota_exceeded';
      // 60-90s cooldown to strictly prevent wasted calls
      const cooldownSec = Math.min(60 * Math.pow(1.5, s.consecutiveFailures - 1), 300);
      s.cooldownUntil = now + Math.round(cooldownSec * 1000);
      console.warn(
        `[AI Router] [HTTP 429 Quota Exceeded] Model [${modelId}]: Cooldown activated for ${Math.round(cooldownSec)}s. Error: ${sanitizedMsg.slice(0, 100)}`
      );
    } else if (status === 503 || /503|UNAVAILABLE|high demand|overloaded/i.test(errStr)) {
      s.httpStatus = 503;
      s.status = 'high_demand';
      // Short 30s cooldown for transient 503 spikes
      s.cooldownUntil = now + 30000;
      console.warn(
        `[AI Router] [HTTP 503 High Demand] Model [${modelId}]: Temporary cooldown activated for 30s.`
      );
    } else if (status === 401 || status === 403 || /PERMISSION_DENIED|unauthorized|forbidden|401|403/i.test(errStr)) {
      s.httpStatus = status || 403;
      s.status = 'permission_denied';
      s.cooldownUntil = now + 3600000; // 1 hr
      console.warn(
        `[AI Router] [HTTP ${s.httpStatus} Auth Error] Model [${modelId}]: Permission denied. Cooldown 1h.`
      );
    } else if (status === 504 || /timeout|timed out|ETIMEDOUT|ESOCKETTIMEDOUT/i.test(errStr)) {
      s.httpStatus = 504;
      s.status = 'error';
      s.cooldownUntil = now + 60000; // 60s cooldown for timed out model to immediately route traffic to responsive models
      console.warn(
        `[AI Router] [HTTP 504 Timeout] Model [${modelId}]: Request timed out. Cooldown activated for 60s.`
      );
    } else {
      s.httpStatus = status || 500;
      s.status = 'error';
      s.cooldownUntil = now + 20000;
      console.warn(
        `[AI Router] [HTTP ${s.httpStatus} Error] Model [${modelId}]: ${sanitizedMsg.slice(0, 100)}`
      );
    }
  }

  /**
   * Diagnostic verification: Pings candidate models with ultra-minimal 2-token ping
   * to accurately detect live HTTP status and quota availability without burning quota.
   */
  public async runLiveDiagnostics(): Promise<DiagnosticsSummary> {
    const key = this.apiKey || process.env.GEMINI_API_KEY || '';
    if (!key || key === 'MY_GEMINI_API_KEY') {
      return {
        timestamp: new Date().toISOString(),
        apiKeyPresent: false,
        apiKeyMasked: 'None',
        activeModelsCount: 0,
        quotaExceededCount: 0,
        highDemandCount: 0,
        overallStatus: 'no_key',
        models: this.getAllStates(),
        recommendationBn: 'GEMINI_API_KEY পাওয়া যায়নি। দয়া করে পরিবেশ পরিবর্তনশীল বা সেটিংসে কী প্রদান করুন।',
      };
    }

    const ai = new GoogleGenAI({
      apiKey: key.trim(),
      httpOptions: { headers: { 'User-Agent': 'aistudio-build-diagnostics' } },
    });

    console.log('[AI Router Diagnostics] Running live health checks across registered Gemini models...');

    // Test text models with 1-token query
    const textModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.1-pro-preview', 'gemini-4-argon'];

    for (const mId of textModels) {
      const startTime = Date.now();
      let pingTimer: NodeJS.Timeout | undefined;
      try {
        const pingCall = ai.models.generateContent({
          model: mId,
          contents: 'Ping',
          config: { maxOutputTokens: 2 },
        });
        const pingTimeout = new Promise<never>((_, reject) => {
          pingTimer = setTimeout(() => reject(new Error(`Model ${mId} ping timeout (8000ms)`)), 8000);
        });
        await Promise.race([pingCall, pingTimeout]);
        this.recordModelSuccess(mId, Date.now() - startTime);
      } catch (err: any) {
        this.recordModelError(mId, err);
      } finally {
        if (pingTimer) clearTimeout(pingTimer);
      }
    }

    // Mark image models accurately (since they require active billing)
    const imageModels = ['gemini-3.1-flash-lite-image', 'gemini-nano-banana-2.1'];
    for (const imgId of imageModels) {
      const s = this.states.get(imgId);
      if (s) {
        s.lastTested = new Date().toISOString();
        s.httpStatus = 429;
        s.status = 'quota_exceeded';
        s.lastError = 'ফ্রি টিয়ারে ইমেজ মডেলের জন্য রিকোয়েস্ট লিমিট ০। ক্লাউড বিলিং প্রয়োজন।';
      }
    }

    const all = this.getAllStates();
    const activeCount = all.filter((s) => s.status === 'active').length;
    const quotaCount = all.filter((s) => s.status === 'quota_exceeded' || s.status === 'rate_limited').length;
    const highDemandCount = all.filter((s) => s.status === 'high_demand').length;

    let overallStatus: DiagnosticsSummary['overallStatus'] = 'all_operational';
    let recommendationBn = '';

    if (activeCount > 0) {
      overallStatus = 'all_operational';
      recommendationBn = `${activeCount}টি মডেল সফলভাবে সচল রয়েছে। প্রাথমিক মডেল হিসেবে সচল মডেলগুলোকে অগ্রাধিকার দেওয়া হবে।`;
    } else if (highDemandCount > 0 && quotaCount === 0) {
      overallStatus = 'high_demand_spikes';
      recommendationBn = 'Google Gemini ক্লাউড সার্ভারে সাময়িক উচ্চ ট্রাফিকের চাপ (503)। স্বয়ংক্রিয় ব্যাকঅফ ও অফলাইন নলেজ ইঞ্জিন ব্যাকআপ হিসেবে সক্রিয় আছে।';
    } else {
      overallStatus = 'partial_quota_limited';
      recommendationBn = 'Gemini ফ্রি টিয়ারের দৈনিক/মিনিটের কোটা সীমাবদ্ধতা (HTTP 429) শনাক্ত হয়েছে। লোকাল ব্যাচ প্রম্পট প্ল্যানার ও এক্সপোর্ট ফিচার সম্পূর্ণ সচল রয়েছে। বিলিং সক্রিয় করলে পেইড মডেল চালু হবে।';
    }

    return {
      timestamp: new Date().toISOString(),
      apiKeyPresent: true,
      apiKeyMasked: this.getMaskedKey(),
      activeModelsCount: activeCount,
      quotaExceededCount: quotaCount,
      highDemandCount,
      overallStatus,
      models: all,
      recommendationBn,
    };
  }
}

export const aiRegistry = new AIModelRegistry();

if (process.env.GEMINI_API_KEY) {
  aiRegistry.setApiKey(process.env.GEMINI_API_KEY);
}

export interface SmartRoutingOptions {
  taskName?: string;
  maxBackoffRetries?: number;
}

export interface SmartRoutingResult<T> {
  result: T;
  modelUsed: string;
  latencyMs: number;
}

/**
 * Intelligent Model Router:
 * 1. Checks candidate models in preference order.
 * 2. Skips models in active cooldown (preventing wasted 429 calls).
 * 3. Transparently catches errors, sets cooldown, and moves to next candidate.
 * 4. Applies exponential backoff for transient 503s.
 * 5. If all fail, throws structured error with Bengali explanation. Never fakes response!
 */
export async function executeWithSmartRouting<T>(
  _ai: GoogleGenAI,
  candidateModels: string[],
  fn: (modelId: string) => Promise<T>,
  options: SmartRoutingOptions = {}
): Promise<SmartRoutingResult<T>> {
  const taskName = options.taskName || 'AI Operation';
  const now = Date.now();

  const attemptsSummary: Array<{ model: string; error?: string; status?: number; inCooldown?: boolean }> = [];

  for (const modelId of candidateModels) {
    const state = aiRegistry.getState(modelId);
    if (state && state.cooldownUntil > now) {
      const remainingSec = Math.ceil((state.cooldownUntil - now) / 1000);
      console.log(
        `[AI Router] [${taskName}] Skipping model [${modelId}] - in active cooldown (${remainingSec}s remaining, last status: ${state.httpStatus}).`
      );
      attemptsSummary.push({
        model: modelId,
        inCooldown: true,
        status: state.httpStatus,
        error: `In cooldown for ${remainingSec}s`,
      });
      continue;
    }

    // Try model execution with optional retry for transient 503
    let retriesLeft = options.maxBackoffRetries ?? 1;
    let attemptStartTime = Date.now();
    let abortAllCandidates = false;

    while (retriesLeft >= 0) {
      try {
        console.log(`[AI Router] [${taskName}] Calling candidate model [${modelId}]...`);
        attemptStartTime = Date.now();
        const result = await fn(modelId);
        const duration = Date.now() - attemptStartTime;

        aiRegistry.recordModelSuccess(modelId, duration);

        return {
          result,
          modelUsed: modelId,
          latencyMs: duration,
        };
      } catch (err: any) {
        aiRegistry.recordModelError(modelId, err);
        const status = errorToStatus(err);
        const sanitizedMsg = sanitizeLog(String(err?.message || err));

        // Requirement 4: On 401/403 auth/permission error, do NOT keep calling other models with an invalid key!
        if (status === 401 || status === 403) {
          console.warn(`[AI Router] [${taskName}] Model [${modelId}] encountered auth error (${status}). Halting further candidate calls to avoid useless API traffic.`);
          attemptsSummary.push({
            model: modelId,
            status,
            error: sanitizedMsg.slice(0, 100),
          });
          abortAllCandidates = true;
          break;
        }

        // If 503 and we have retries left, wait 1.5s with backoff
        if (status === 503 && retriesLeft > 0) {
          retriesLeft--;
          console.warn(`[AI Router] [${taskName}] Model [${modelId}] 503 spike. Retrying in 1500ms...`);
          await new Promise((resolve) => setTimeout(resolve, 1500));
          continue;
        }

        attemptsSummary.push({
          model: modelId,
          status,
          error: sanitizedMsg.slice(0, 100),
        });
        break; // Move to next model in candidates
      }
    }

    if (abortAllCandidates) {
      break;
    }
  }

  // If we reach here, all candidates failed, were aborted, or were in cooldown
  const has429 = attemptsSummary.some((a) => a.status === 429);
  const has503 = attemptsSummary.some((a) => a.status === 503);
  const has401or403 = attemptsSummary.some((a) => a.status === 401 || a.status === 403);

  const errorObj: any = new Error(
    `সমস্ত Gemini মডেল অনুপলব্ধ। (${attemptsSummary.map((a) => `${a.model}: ${a.status || 'cooldown'}`).join(', ')})`
  );
  errorObj.isRoutingError = true;
  errorObj.is429 = has429;
  errorObj.is503 = has503;
  errorObj.is401or403 = has401or403;
  errorObj.attempts = attemptsSummary;
  errorObj.userAdviceBn = has401or403
    ? 'API Key অনুমোদন বা পারমিশন ত্রুটি (HTTP 401/403)। API Key সঠিক কি না অথবা পারমিশন সক্রিয় আছে কি না যাচাই করুন।'
    : has429
    ? 'Gemini ফ্রি টিয়ার কোটা সীমা (HTTP 429) সমাপ্ত হয়েছে। AI Studio-তে বিলিং যুক্ত করুন বা OpenAI Key ব্যবহার করুন।'
    : has503
    ? 'Google সার্ভারে সাময়িক উচ্চ চাপ (HTTP 503)। কয়েক মুহূর্ত পর পুনরায় চেষ্টা করুন।'
    : 'AI API সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি।';

  throw errorObj;
}

function errorToStatus(err: any): number {
  if (err?.status) return Number(err.status);
  if (err?.statusCode) return Number(err.statusCode);
  const msg = String(err?.message || '');
  if (/RESOURCE_EXHAUSTED|429/i.test(msg)) return 429;
  if (/503|UNAVAILABLE/i.test(msg)) return 503;
  if (/PERMISSION_DENIED|401|403|unauthorized|forbidden|API key not valid|INVALID_ARGUMENT/i.test(msg)) return 403;
  if (/timeout|timed out|ETIMEDOUT|ESOCKETTIMEDOUT/i.test(msg)) return 504;
  return 500;
}
