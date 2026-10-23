/**
 * Priority 6.5: Autonomous Batch Production Planner Engine
 * 
 * Capabilities:
 * 1. Prioritized Batch Production Plan using Stock Opportunity Scores, Asset Library,
 *    Duplicate checks, Technical Quality, and Marketplace Rules.
 * 2. Transparent cost and blocker declaration: zero hypothetical cost inflation.
 * 3. Smart Asset Reuse: reuses existing matching assets without re-generation (0 credits).
 * 4. Rigorous Duplicate Prevention across prompts, existing library assets, and active queue tasks.
 * 5. Strict User-Approved Quantity ceiling (never executes or plans beyond user authorization).
 * 6. Graceful halt on blockers (Quota, Asset Missing, Model, Storage, Unauthorized Integration).
 * 7. Anti-hype integrity: transparent offline data source, no baseless sales guarantees.
 */

import { Asset, StockMarketplaceId, AutonomousTaskItem, AspectRatioType, TaskBlockerCategory } from '../types';
import {
  CURATED_STOCK_OPPORTUNITIES,
  scoreAssetForStockOpportunity,
  evaluateAllStockOpportunities,
  OpportunityCategory,
  OPPORTUNITY_ENGINE_BLOCKERS,
} from './stockOpportunityEngine';
import { generateDiverseCombinatorialPrompts } from './batchPromptEngine';
import {
  createAutonomousTask,
  createPromptDuplicateHash,
  isDuplicateTask,
} from './autonomousQueueManager';
import { isDuplicateSubmissionForMarketplace } from './batchStockAuditor';

export interface BatchProductionItem {
  id: string;
  opportunityId: string;
  nicheNameBn: string;
  nicheNameEn: string;
  category: OpportunityCategory;
  targetMarketplace: StockMarketplaceId;
  prompt: string;
  aspectRatio: AspectRatioType;
  style: string;
  isReusedAsset: boolean;
  reusedAssetId?: string;
  reusedAssetTitle?: string;
  reusedAssetThumbnailUrl?: string;
  priorityScore: number;
  priorityRank: 'High Commercial' | 'Moderate' | 'Low' | 'Skip';
  expectedCreditCost: number;
  costExplanationBn: string;
  duplicateHash: string;
  isDuplicate: boolean;
  duplicateReasonBn?: string;
  blockerCategory?: TaskBlockerCategory;
  blockerDetailsBn?: string;
}

export interface AutonomousBatchProductionPlan {
  id: string;
  createdAt: number;
  userApprovedQuantity: number; // Strict ceiling
  targetMarketplace: StockMarketplaceId;
  totalPlannedItems: number;
  reusedAssetsCount: number;
  newGenerationsCount: number;
  totalCreditCost: number;
  costTransparencyBn: string;
  items: BatchProductionItem[];
  blockersIdentified: string[];
  isSafeToExecute: boolean;
  dataSourceBn: string;
  liveTrendStatusBn: string;
  disclaimerBn: string;
  nextActionAdviceBn: string;
}

/**
 * Creates an autonomous, prioritized batch production plan respecting user-approved ceiling.
 */
export function generateAutonomousBatchProductionPlan(params: {
  assets: Asset[];
  existingTasks: AutonomousTaskItem[];
  targetMarketplace?: StockMarketplaceId;
  userApprovedQuantity?: number; // Strict ceiling: default 10, max 100
}): AutonomousBatchProductionPlan {
  const {
    assets,
    existingTasks,
    targetMarketplace = 'adobe-stock',
    userApprovedQuantity = 10,
  } = params;

  // Strict User Authorization Guard (Max ceiling cannot exceed user-approved quantity)
  const ceiling = Math.min(100, Math.max(1, Math.floor(userApprovedQuantity)));
  const planId = `batch-plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const plannedItems: BatchProductionItem[] = [];
  const blockersIdentified: string[] = [];
  const usedAssetIds = new Set<string>();
  const seenDuplicateHashes = new Set<string>();

  // Collect existing task hashes for duplicate prevention
  existingTasks.forEach((t) => {
    if (t.duplicateHash) seenDuplicateHashes.add(t.duplicateHash);
  });

  // Step 1: Evaluate opportunities and smart-match reusable assets
  const opportunityEvaluations = evaluateAllStockOpportunities(assets, existingTasks, targetMarketplace);

  // Sort opportunities by highest commercial demand score
  const sortedOpportunities = [...opportunityEvaluations].sort(
    (a, b) => b.opportunity.demandScore - a.opportunity.demandScore
  );

  // Priority 1: Fill batch with qualified reusable library assets first (0 credit deduction)
  for (const evalResult of sortedOpportunities) {
    if (plannedItems.length >= ceiling) break;

    if (evalResult.reuseExistingAsset && evalResult.matchingAsset && evalResult.matchingScore) {
      const asset = evalResult.matchingAsset;
      if (usedAssetIds.has(asset.id)) continue;

      const dupCheck = isDuplicateSubmissionForMarketplace(asset.id, targetMarketplace, existingTasks);
      if (dupCheck.isDuplicate) continue;

      const hash = createPromptDuplicateHash(asset.prompt, 'image', asset.aspectRatio);
      if (seenDuplicateHashes.has(hash)) continue;

      seenDuplicateHashes.add(hash);
      usedAssetIds.add(asset.id);

      plannedItems.push({
        id: `plan-item-${Date.now()}-${plannedItems.length + 1}`,
        opportunityId: evalResult.opportunity.id,
        nicheNameBn: evalResult.opportunity.nicheNameBn,
        nicheNameEn: evalResult.opportunity.nicheName,
        category: evalResult.opportunity.category,
        targetMarketplace,
        prompt: asset.prompt,
        aspectRatio: asset.aspectRatio,
        style: asset.style || 'Photorealistic',
        isReusedAsset: true,
        reusedAssetId: asset.id,
        reusedAssetTitle: asset.title,
        reusedAssetThumbnailUrl: asset.thumbnailUrl || asset.url,
        priorityScore: evalResult.matchingScore.overallScore,
        priorityRank: evalResult.matchingScore.priorityRank,
        expectedCreditCost: 0,
        costExplanationBn: 'বিদ্যমান লাইব্রেরি অ্যাসেট পুনঃব্যবহার (০ ক্রেডিট খরচ)',
        duplicateHash: hash,
        isDuplicate: false,
      });
    }
  }

  // Priority 2: If ceiling not reached, generate diverse combinatorial prompts for highest-opportunity niches
  let oppIndex = 0;
  while (plannedItems.length < ceiling && oppIndex < sortedOpportunities.length * 5) {
    const oppEval = sortedOpportunities[oppIndex % sortedOpportunities.length];
    oppIndex++;

    const opp = oppEval.opportunity;
    // Generate diverse prompts for this niche
    const combinatorialPrompts = generateDiverseCombinatorialPrompts(opp.nicheName, 5, 'বাণিজ্যিক স্টক (Commercial Stock)');

    for (const promptItem of combinatorialPrompts) {
      if (plannedItems.length >= ceiling) break;

      const hash = createPromptDuplicateHash(promptItem.prompt, 'image', promptItem.suggestedAspectRatio);
      if (seenDuplicateHashes.has(hash)) continue;

      // Duplicate check against existing active tasks
      const isTaskDup = existingTasks.some(
        (t) => t.duplicateHash === hash || (t.prompt.trim().toLowerCase() === promptItem.prompt.trim().toLowerCase() && t.status !== 'failed')
      );
      if (isTaskDup) continue;

      seenDuplicateHashes.add(hash);

      plannedItems.push({
        id: `plan-item-${Date.now()}-${plannedItems.length + 1}`,
        opportunityId: opp.id,
        nicheNameBn: opp.nicheNameBn,
        nicheNameEn: opp.nicheName,
        category: opp.category,
        targetMarketplace,
        prompt: promptItem.prompt,
        aspectRatio: promptItem.suggestedAspectRatio,
        style: 'Photorealistic',
        isReusedAsset: false,
        priorityScore: opp.demandScore,
        priorityRank: opp.demandScore >= 90 ? 'High Commercial' : 'Moderate',
        expectedCreditCost: 0,
        costExplanationBn: 'Google AI Studio কোটা / ফ্রি টিয়ার অন্তর্ভুক্ত (০ অতিরিক্ত খরচ)',
        duplicateHash: hash,
        isDuplicate: false,
      });
    }
  }

  // Safety & Blocker Audit for the Batch
  // Check if live trend scraper is absent
  blockersIdentified.push(OPPORTUNITY_ENGINE_BLOCKERS.LIVE_TREND_SCRAPER_ABSENT.titleBn);

  // Check quota or integration limits
  const hasQuotaBlockedTask = existingTasks.some(
    (t) => t.status === 'blocked' && t.blockerCategory === 'image_generation_quota'
  );
  if (hasQuotaBlockedTask) {
    blockersIdentified.push('পূর্ববর্তী টাস্কে ইমেজ জেনারেশন কোটা লিমিট (HTTP 429) শনাক্ত হয়েছে');
  }

  const reusedCount = plannedItems.filter((i) => i.isReusedAsset).length;
  const newCount = plannedItems.filter((i) => !i.isReusedAsset).length;

  // Cost Transparency Explanation: Never claim imaginary costs or charge users
  const costTransparencyBn =
    reusedCount === plannedItems.length
      ? `সকল ${reusedCount}টি আইটেম বিদ্যমান লাইব্রেরি থেকে পুনঃব্যবহারযোগ্য (মোট খরচ: ০ ক্রেডিট)।`
      : `${reusedCount}টি পুনঃব্যবহারযোগ্য (০ ক্রেডিট) এবং ${newCount}টি নতুন প্রম্পট অন্তর্ভুক্ত। কোনো পেইড বিলিং নেই। খরচ নিশ্চিত জানা না থাকলে অনুমানকে বাস্তব মূল্য হিসেবে দেখানো নিষিদ্ধ।`;

  const nextActionAdviceBn = hasQuotaBlockedTask
    ? 'কোটা ব্লকার শনাক্ত হওয়ায় শুধুমাত্র পুনঃব্যবহারযোগ্য অ্যাসেট চালু করুন অথবা কোটা রিসেট হওয়া পর্যন্ত নতুন জেনারেশন স্থগিত রাখুন।'
    : 'ব্যাচটি পর্যালোচনার জন্য প্রস্তুত। অনুমোদন সাপেক্ষে এক ক্লিকে অটোনোমাস কিউতে যুক্ত করা যাবে।';

  return {
    id: planId,
    createdAt: Date.now(),
    userApprovedQuantity: ceiling,
    targetMarketplace,
    totalPlannedItems: plannedItems.length,
    reusedAssetsCount: reusedCount,
    newGenerationsCount: newCount,
    totalCreditCost: 0, // Invariant: 0 credit policy on free studio/Google Flow/reused assets
    costTransparencyBn,
    items: plannedItems,
    blockersIdentified,
    isSafeToExecute: !hasQuotaBlockedTask || reusedCount > 0,
    dataSourceBn: 'অভ্যন্তরীণ ২০২৬ বাণিজ্যিক স্টক প্যাটার্ন রেজিস্ট্রি (অফলাইন ভেরিফাইড)',
    liveTrendStatusBn: 'লাইভ থার্ড-পার্টি কন্ট্রিবিউটর স্ক্র্যাপার API অনুপস্থিত (Blocker)',
    disclaimerBn:
      'স্টক প্ল্যাটফর্মের অ্যালগরিদম ও ক্রেতার চাহিদার ওপর ডাউনলোড নির্ভরশীল; বিক্রির কোনো কৃত্রিম গ্যারান্টি দেওয়া হয় না।',
    nextActionAdviceBn,
  };
}

/**
 * Safely converts an AutonomousBatchProductionPlan into actionable AutonomousTaskItems
 * strictly obeying duplicate prevention and the user-approved limit.
 */
export function dispatchBatchProductionPlanToQueue(
  plan: AutonomousBatchProductionPlan,
  existingTasks: AutonomousTaskItem[] = []
): {
  dispatchedTasks: AutonomousTaskItem[];
  skippedDuplicatesCount: number;
  actualDispatchedCount: number;
} {
  const dispatchedTasks: AutonomousTaskItem[] = [];
  let skippedDuplicatesCount = 0;

  const existingHashes = new Set<string>();
  existingTasks.forEach((t) => {
    if (t.duplicateHash) existingHashes.add(t.duplicateHash);
  });

  for (const item of plan.items) {
    // Exact duplicate hash safety
    if (existingHashes.has(item.duplicateHash)) {
      skippedDuplicatesCount++;
      continue;
    }

    // Never exceed the user-approved quantity limit
    if (dispatchedTasks.length >= plan.userApprovedQuantity) {
      break;
    }

    existingHashes.add(item.duplicateHash);

    const now = Date.now();
    const rand = Math.random().toString(36).slice(2, 7);

    if (item.isReusedAsset && item.reusedAssetId) {
      const task = createAutonomousTask({
        prompt: item.prompt,
        type: 'image',
        aspectRatio: item.aspectRatio,
        style: item.style,
        targetMarketplace: item.targetMarketplace,
        title: item.reusedAssetTitle || item.nicheNameBn,
      });

      dispatchedTasks.push({
        ...task,
        id: `task-batch-reused-${item.reusedAssetId}-${now}-${rand}`,
        assetId: item.reusedAssetId,
        assetThumbnailUrl: item.reusedAssetThumbnailUrl,
        duplicateHash: item.duplicateHash,
        status: 'pending',
        statusLabelBn: 'অপেক্ষমাণ (ব্যাচ পুনঃব্যবহার - ০ ক্রেডিট)',
        statusLabelEn: 'Pending (Batch Reused Asset - 0 Credit)',
        exactReason: `স্বয়ংক্রিয় ব্যাচ প্রোডাকশন প্ল্যান (${plan.id}) থেকে অন্তর্ভুক্ত।`,
      });
    } else {
      const task = createAutonomousTask({
        prompt: item.prompt,
        type: 'image',
        aspectRatio: item.aspectRatio,
        style: item.style,
        targetMarketplace: item.targetMarketplace,
        title: `${item.nicheNameBn} (ব্যাচ)`,
      });

      dispatchedTasks.push({
        ...task,
        id: `task-batch-new-${now}-${rand}`,
        duplicateHash: item.duplicateHash,
        status: 'pending',
        statusLabelBn: 'অপেক্ষমাণ (ব্যাচ নতুন প্রম্পট)',
        statusLabelEn: 'Pending (Batch New Prompt)',
        exactReason: `স্বয়ংক্রিয় ব্যাচ প্রোডাকশন প্ল্যান (${plan.id}) থেকে অন্তর্ভুক্ত।`,
      });
    }
  }

  return {
    dispatchedTasks,
    skippedDuplicatesCount,
    actualDispatchedCount: dispatchedTasks.length,
  };
}
