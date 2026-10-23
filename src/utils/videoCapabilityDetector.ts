/**
 * Video Generation Capability Detector
 * Priority 2.5: Generation Capability Detection & Honest Status
 *
 * Truthfully determines whether an authorized real video-generation provider is configured.
 * When unconfigured, provides clear truthful status and official manual workflow instructions.
 * Strictly avoids faking generation or simulating progress.
 */

export interface VideoProviderStatus {
  isConfigured: boolean;
  providerStatus: 'configured' | 'unconfigured';
  statusBadgeBn: string;
  statusBadgeEn: string;
  activeProviderName: string | null;
  explanationBn: string;
  explanationEn: string;
  supportedWorkflow: 'honest_manual_import';
  officialPortals: Array<{
    name: string;
    url: string;
    type: string;
    notesBn: string;
  }>;
  timestamp: string;
}

export const DEFAULT_UNCONFIGURED_STATUS: VideoProviderStatus = {
  isConfigured: false,
  providerStatus: 'unconfigured',
  statusBadgeBn: 'Generation provider not configured (জেনারেটর কনফিগার করা নেই)',
  statusBadgeEn: 'Generation provider not configured',
  activeProviderName: null,
  explanationBn:
    'সার্ভারে কোনো অটোমেটেড পেইড ভিডিও এআই এপিআই (Google Veo, Runway, Luma ইত্যাদি) কনফিগার করা নেই। ব্যবহারকারীর অনুমতি ছাড়া কোনো পেইড সার্ভিস বা বিলিং চালু করা হয় না। কোনো কৃত্রিম প্রগ্রেস বা ফেক ভিডিও তৈরি করা হয় না। সততা ভিত্তিক ৩-ধাপের ম্যানুয়াল ওয়ার্কফ্লো সক্রিয় রয়েছে।',
  explanationEn:
    'No automated video generation provider is configured on the server. Paid APIs and billing are not enabled automatically. The studio never fakes generation progress. Honest 3-step manual workflow is active.',
  supportedWorkflow: 'honest_manual_import',
  officialPortals: [
    {
      name: 'Google Flow',
      url: 'https://flow.google',
      type: 'Official Web Platform',
      notesBn: 'বিনামূল্যে ক্রেডিট সহ ব্রাউজারে আসল ভিডিও তৈরি করা যায়।',
    },
    {
      name: 'Google Labs FX',
      url: 'https://labs.google/fx/',
      type: 'Official Web Platform',
      notesBn: 'গুগল ল্যাবসের অফিসিয়াল ভিডিও এক্সপেরিমেন্ট পোর্টাল।',
    },
  ],
  timestamp: new Date().toISOString(),
};

let cachedStatus: VideoProviderStatus | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60_000; // 1 minute cache

/**
 * Fetches the truthful video provider capability status from backend
 */
export async function detectVideoGenerationCapability(): Promise<VideoProviderStatus> {
  const now = Date.now();
  if (cachedStatus && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedStatus;
  }

  if (typeof window === 'undefined' || typeof fetch === 'undefined') {
    cachedStatus = DEFAULT_UNCONFIGURED_STATUS;
    return DEFAULT_UNCONFIGURED_STATUS;
  }

  try {
    const res = await fetch('/api/video/provider-status', {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      const statusResult: VideoProviderStatus = {
        ...DEFAULT_UNCONFIGURED_STATUS,
        ...data,
      };
      cachedStatus = statusResult;
      lastFetchTime = now;
      return statusResult;
    }
  } catch (err) {
    console.warn('Could not query /api/video/provider-status, using truthful default unconfigured state:', err);
  }

  cachedStatus = DEFAULT_UNCONFIGURED_STATUS;
  lastFetchTime = now;
  return cachedStatus;
}
