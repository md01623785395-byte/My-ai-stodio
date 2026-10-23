/**
 * Adobe Stock Sales Analytics & CSV Import Types
 * Priority 7.0 & 7.0.1: Client-Side Contributor Analytics
 */

export interface AdobeSaleRecord {
  id: string; // Unique record ID e.g. "adobe_sale_1729000000000_abc"
  assetId: string; // Actual Adobe Media ID / Asset ID (e.g. "582910394")
  saleDate: string; // ISO date format YYYY-MM-DD
  license: string; // License type e.g. "Subscription", "Standard", "Extended"
  royalty: number; // Royalty earned in currency (numeric, e.g. 0.33, 1.65, 3.30)
  currency: string; // Default "USD"
  title?: string; // Optional: Only if present in CSV (no fake titles)
  assetType?: string; // Optional: e.g. "Photo", "Illustration", "Vector" if present
  country?: string; // Optional: Customer country if present
  dedupeKey: string; // Deterministic hash/key for duplicate detection
  rawRowNumber: number; // 1-indexed row number from CSV
  importedAt: number; // Epoch ms timestamp of import
}

export interface SalesMonthlyTrend {
  month: string; // YYYY-MM
  downloads: number;
  earnings: number;
}

export interface LicenseMetric {
  license: string;
  downloads: number;
  earnings: number;
  percentage: number;
}

export interface AssetPerformanceSummary {
  assetId: string;
  title?: string;
  downloads: number;
  totalEarnings: number;
  topLicense: string;
  firstSaleDate: string;
  lastSaleDate: string;
  matchedStudioAssetId?: string;
  matchedStudioAssetTitle?: string;
}

export type DemandConfidenceStatus =
  | 'NO_DATA'
  | 'INSUFFICIENT_SAMPLE_SIZE'
  | 'STATISTICALLY_CONFIDENT_DEMAND';

export interface OpportunityAssessment {
  status: DemandConfidenceStatus;
  totalSalesAnalyzed: number;
  isReliableForBatchPlanner: boolean;
  sampleThresholdRequired: number; // Standard: 10 sales
  reliabilityScorePercent: number; // 0 - 100%
  titleBn: string;
  explanationBn: string;
  actionableRecommendationBn: string;
  topPerformingThemes: string[];
}

export interface SalesAnalyticsSummary {
  totalEarnings: number;
  totalDownloads: number;
  uniqueAssetsCount: number;
  averageRoyalty: number;
  currency: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  licenseBreakdown: LicenseMetric[];
  monthlyTrends: SalesMonthlyTrend[];
  topAssets: AssetPerformanceSummary[];
  opportunityAssessment: OpportunityAssessment;
}

export interface ColumnMappingOverride {
  assetIdCol: number;
  dateCol: number;
  royaltyCol: number;
  licenseCol?: number;
  titleCol?: number;
  hasHeaderRow?: boolean;
}

export interface ParseSalesCSVResult {
  success: boolean;
  records: AdobeSaleRecord[];
  totalRows: number;
  validRows: number;
  skippedRows: number;
  detectedHeaders: {
    assetIdHeader: string;
    dateHeader: string;
    licenseHeader: string;
    royaltyHeader: string;
    titleHeader?: string;
    assetTypeHeader?: string;
    countryHeader?: string;
  };
  warnings: string[];
  errors: { row: number; error: string; raw?: string }[];
  rawHeaders?: string[];
  rawColumnsCount?: number;
  previewRows?: string[][];
  isHeaderless?: boolean;
  isAmbiguous?: boolean;
  activeMapping?: {
    assetIdCol: number;
    dateCol: number;
    royaltyCol: number;
    licenseCol: number;
    titleCol: number;
    hasHeaderRow: boolean;
  };
}

export interface ImportSalesResult {
  success: boolean;
  totalProvided: number;
  importedCount: number;
  duplicateCount: number;
  duplicatesSkipped: string[];
  totalStoredAfterImport: number;
}

