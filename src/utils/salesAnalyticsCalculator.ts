/**
 * Adobe Stock Sales Analytics Calculator
 * Priority 7.0 & 7.0.1: Rigorous analytics and statistical demand verification
 *
 * Implements:
 * - Aggregations (Total earnings, downloads, unique assets, average royalty)
 * - License breakdown and monthly trends
 * - Asset-level performance table with Studio asset reconciliation
 * - Strict statistical sample size gating before declaring verified market demand
 */

import { Asset } from '../types';
import {
  AdobeSaleRecord,
  AssetPerformanceSummary,
  LicenseMetric,
  OpportunityAssessment,
  SalesAnalyticsSummary,
  SalesMonthlyTrend,
} from '../types/salesAnalytics';

const STATISTICAL_SAMPLE_THRESHOLD = 10;

/**
 * Calculates comprehensive analytics and statistical demand from sales records
 */
export function calculateSalesAnalytics(
  records: AdobeSaleRecord[],
  studioAssets: Asset[] = []
): SalesAnalyticsSummary {
  if (!records || records.length === 0) {
    return {
      totalEarnings: 0,
      totalDownloads: 0,
      uniqueAssetsCount: 0,
      averageRoyalty: 0,
      currency: 'USD',
      dateRange: {
        startDate: 'N/A',
        endDate: 'N/A',
      },
      licenseBreakdown: [],
      monthlyTrends: [],
      topAssets: [],
      opportunityAssessment: {
        status: 'NO_DATA',
        totalSalesAnalyzed: 0,
        isReliableForBatchPlanner: false,
        sampleThresholdRequired: STATISTICAL_SAMPLE_THRESHOLD,
        reliabilityScorePercent: 0,
        titleBn: 'কোনো বিক্রয় তথ্য নেই (No Sales Data)',
        explanationBn:
          'বিশ্লেষণের জন্য প্রথমে Adobe Stock Contributor Insights থেকে ডাউনলোড করা আসল সেলস CSV ফাইল ইমপোর্ট করুন।',
        actionableRecommendationBn:
          'contributor.stock.adobe.com/insights থেকে Insights CSV ডাউনলোড করে এখানে ড্রপ করুন।',
        topPerformingThemes: [],
      },
    };
  }

  // 1. Totals & Core KPIs
  let totalEarnings = 0;
  const uniqueAssetIds = new Set<string>();
  const licenseMap = new Map<string, { downloads: number; earnings: number }>();
  const monthlyMap = new Map<string, { downloads: number; earnings: number }>();
  const assetMap = new Map<
    string,
    {
      downloads: number;
      earnings: number;
      licenses: Map<string, number>;
      firstDate: string;
      lastDate: string;
      title?: string;
    }
  >();

  let earliestDate = records[0].saleDate || '9999-99-99';
  let latestDate = records[0].saleDate || '0000-00-00';

  for (const record of records) {
    totalEarnings += record.royalty;
    uniqueAssetIds.add(record.assetId);

    // Track date ranges
    if (record.saleDate) {
      if (record.saleDate < earliestDate) earliestDate = record.saleDate;
      if (record.saleDate > latestDate) latestDate = record.saleDate;
    }

    // License grouping
    const licenseName = record.license || 'Standard';
    const lEntry = licenseMap.get(licenseName) || { downloads: 0, earnings: 0 };
    lEntry.downloads += 1;
    lEntry.earnings += record.royalty;
    licenseMap.set(licenseName, lEntry);

    // Monthly trend grouping (YYYY-MM)
    const monthKey = record.saleDate ? record.saleDate.slice(0, 7) : 'Unknown';
    const mEntry = monthlyMap.get(monthKey) || { downloads: 0, earnings: 0 };
    mEntry.downloads += 1;
    mEntry.earnings += record.royalty;
    monthlyMap.set(monthKey, mEntry);

    // Asset-level grouping
    const aEntry = assetMap.get(record.assetId) || {
      downloads: 0,
      earnings: 0,
      licenses: new Map<string, number>(),
      firstDate: record.saleDate,
      lastDate: record.saleDate,
      title: record.title,
    };
    aEntry.downloads += 1;
    aEntry.earnings += record.royalty;
    if (record.title && !aEntry.title) aEntry.title = record.title;
    if (record.saleDate < aEntry.firstDate) aEntry.firstDate = record.saleDate;
    if (record.saleDate > aEntry.lastDate) aEntry.lastDate = record.saleDate;
    aEntry.licenses.set(licenseName, (aEntry.licenses.get(licenseName) || 0) + 1);
    assetMap.set(record.assetId, aEntry);
  }

  const totalDownloads = records.length;
  const roundedTotalEarnings = Math.round(totalEarnings * 100) / 100;
  const averageRoyalty =
    totalDownloads > 0 ? Math.round((totalEarnings / totalDownloads) * 100) / 100 : 0;

  // 2. License Breakdown
  const licenseBreakdown: LicenseMetric[] = Array.from(licenseMap.entries()).map(
    ([license, data]) => ({
      license,
      downloads: data.downloads,
      earnings: Math.round(data.earnings * 100) / 100,
      percentage: Math.round((data.downloads / totalDownloads) * 100),
    })
  );
  licenseBreakdown.sort((a, b) => b.earnings - a.earnings);

  // 3. Monthly Trends
  const monthlyTrends: SalesMonthlyTrend[] = Array.from(monthlyMap.entries())
    .map(([month, data]) => ({
      month,
      downloads: data.downloads,
      earnings: Math.round(data.earnings * 100) / 100,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // 4. Studio Assets Reconciliation Map
  const studioAssetLookup = new Map<string, Asset>();
  studioAssets.forEach((a) => {
    studioAssetLookup.set(a.id, a);
    if (a.title) studioAssetLookup.set(a.title.toLowerCase().trim(), a);
  });

  // 5. Asset-Level Performance
  const topAssets: AssetPerformanceSummary[] = Array.from(assetMap.entries()).map(
    ([assetId, data]) => {
      // Find top license
      let topLicense = 'Standard';
      let maxLicenseCount = 0;
      data.licenses.forEach((cnt, lic) => {
        if (cnt > maxLicenseCount) {
          maxLicenseCount = cnt;
          topLicense = lic;
        }
      });

      // Attempt matching with Studio Assets
      let matchedStudio: Asset | undefined = studioAssetLookup.get(assetId);
      if (!matchedStudio && data.title) {
        matchedStudio = studioAssetLookup.get(data.title.toLowerCase().trim());
      }

      return {
        assetId,
        title: data.title,
        downloads: data.downloads,
        totalEarnings: Math.round(data.earnings * 100) / 100,
        topLicense,
        firstSaleDate: data.firstDate,
        lastSaleDate: data.lastDate,
        matchedStudioAssetId: matchedStudio?.id,
        matchedStudioAssetTitle: matchedStudio?.title,
      };
    }
  );
  topAssets.sort((a, b) => b.totalEarnings - a.totalEarnings);

  // 6. Opportunity Engine Assessment (Strict Sample Size Requirement)
  const isSufficientSample = totalDownloads >= STATISTICAL_SAMPLE_THRESHOLD;
  const reliabilityScore = isSufficientSample
    ? Math.min(100, Math.round(70 + (totalDownloads / 30) * 30))
    : Math.round((totalDownloads / STATISTICAL_SAMPLE_THRESHOLD) * 60);

  // Derive high-performing themes from top sold assets
  const topThemes: string[] = [];
  topAssets.slice(0, 5).forEach((item) => {
    if (item.matchedStudioAssetTitle) {
      topThemes.push(item.matchedStudioAssetTitle);
    } else if (item.title) {
      topThemes.push(item.title);
    } else {
      topThemes.push(`Asset #${item.assetId}`);
    }
  });

  const opportunityAssessment: OpportunityAssessment = {
    status: isSufficientSample ? 'STATISTICALLY_CONFIDENT_DEMAND' : 'INSUFFICIENT_SAMPLE_SIZE',
    totalSalesAnalyzed: totalDownloads,
    isReliableForBatchPlanner: isSufficientSample,
    sampleThresholdRequired: STATISTICAL_SAMPLE_THRESHOLD,
    reliabilityScorePercent: reliabilityScore,
    titleBn: isSufficientSample
      ? '✅ নির্ভরযোগ্য বাজার চাহিদা (Statistical Demand Confirmed)'
      : '⚠️ অপ্রতুল নমুনা (Insufficient Sample Size)',
    explanationBn: isSufficientSample
      ? `মোট ${totalDownloads}টি বিক্রির রেকর্ড পরিসংখ্যানগতভাবে যথেষ্ট নমুনা প্রদান করে। প্রাপ্ত মেট্রিক নির্ভরযোগ্য বাজার ট্রেন্ড নির্দেশ করছে।`
      : `বর্তমানে মাত্র ${totalDownloads}টি বিক্রির রেকর্ড পাওয়া গেছে (ন্যূনতম ${STATISTICAL_SAMPLE_THRESHOLD}টি প্রয়োজন)। অল্প বা বিচ্ছিন্ন বিক্রির ওপর ভিত্তি করে নিশ্চিত বাণিজ্যিক বাজার-চাহিদা দাবি করা যায় না।`,
    actionableRecommendationBn: isSufficientSample
      ? `শীর্ষ বিক্রিত অ্যাসেটের স্টাইল (${licenseBreakdown[0]?.license || 'Standard'} লাইসেন্স অগ্রাধিকার) অনুযায়ী Batch Planner-এ নতুন ব্যাচ প্ল্যানে অগ্রাধিকার দিন।`
      : `আরও কয়েকটি সেলস CSV ডাটা যুক্ত করে মোট বিক্রির সংখ্যা ১০-এর বেশি হওয়া পর্যন্ত অপেক্ষা করুন। বর্তমান অল্প বিক্রিকে পরীক্ষামূলক সিগন্যাল হিসেবে রাখুন।`,
    topPerformingThemes: topThemes,
  };

  return {
    totalEarnings: roundedTotalEarnings,
    totalDownloads,
    uniqueAssetsCount: uniqueAssetIds.size,
    averageRoyalty,
    currency: 'USD',
    dateRange: {
      startDate: earliestDate === '9999-99-99' ? 'N/A' : earliestDate,
      endDate: latestDate === '0000-00-00' ? 'N/A' : latestDate,
    },
    licenseBreakdown,
    monthlyTrends,
    topAssets,
    opportunityAssessment,
  };
}
