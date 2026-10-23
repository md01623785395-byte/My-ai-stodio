/**
 * Account Manager Type Definitions
 * Priority 2.4: Professional Account Manager Module
 */

export type PlatformId =
  | 'adobe-stock'
  | 'fiverr'
  | 'freepik'
  | 'shutterstock'
  | 'dreamstime'
  | 'wirestock'
  | 'other';

export type PlatformType = 'stock_marketplace' | 'freelance_service';

export type ConnectionStatus =
  | 'connected'
  | 'not_connected'
  | 'action_required'
  | 'error'
  | 'unsupported';

export type PlatformCapability =
  | 'stock_image_licensing'
  | 'stock_video_licensing'
  | 'freelance_gig_showcase'
  | 'portfolio_package_export'
  | 'metadata_csv_export'
  | 'sftp_bulk_upload'
  | 'manual_submission_guide'
  | 'client_delivery_packager';

export interface AccountProfile {
  id: string;
  platformId: PlatformId;
  platformType: PlatformType;
  displayName: string;
  accountIdentifier: string; // Public username, profile slug, or email identifier (NO passwords/secrets)
  profileUrl?: string;
  connectionStatus: ConnectionStatus;
  statusReasonBn: string;
  statusReasonEn: string;
  supportedCapabilities: PlatformCapability[];
  unsupportedCapabilities: string[];
  notes?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  authMethod: 'manual_workflow' | 'official_oauth' | 'official_sftp' | 'none';
  stats: {
    assignedCount: number;
    preparedCount: number;
    submittedCount: number;
    publishedCount: number;
  };
}

export interface PlatformPolicyProfile {
  platformId: PlatformId;
  platformName: string;
  platformType: PlatformType;
  officialTermsUrl: string;
  evidenceSummary: string;
  lastVerifiedAt: string;
  verificationStatus: 'verified' | 'uncertain_needs_verification';
  multipleAccountsAllowed: boolean;
  maxAccountsPerUser?: number;
  multipleAccountsRuleSummaryBn: string;
  multipleAccountsRuleSummaryEn: string;
  automatedPublishingAllowed: boolean;
  automatedPublishingStatus: 'prohibited' | 'unsupported_no_public_api' | 'official_api_only';
  automationBoundaryNoteBn: string;
  automationBoundaryNoteEn: string;
  aiContentPolicySummaryBn: string;
  aiContentPolicySummaryEn: string;
}

export type AssetWorkflowStatus =
  | 'assigned'
  | 'prepared'
  | 'awaiting_manual_action'
  | 'submitted'
  | 'confirmed_published';

export interface WorkflowChecklistItem {
  id: string;
  labelBn: string;
  labelEn: string;
  completed: boolean;
  required: boolean;
}

export interface AccountAssetAssignment {
  id: string;
  accountId: string;
  platformId: PlatformId;
  assetId: string;
  assetType: 'image' | 'video';
  assignedAt: string;
  workflowStatus: AssetWorkflowStatus;
  workflowStatusLabelBn: string;
  workflowStatusLabelEn: string;
  targetPackage: {
    title: string;
    description: string;
    keywords: string[];
    category?: string;
    // Fiverr specific fields
    gigTitle?: string;
    gigTier?: 'basic' | 'standard' | 'premium';
    suggestedPriceUsd?: number;
    deliveryTimeDays?: number;
    scopeOfWorkBn?: string;
    scopeOfWorkEn?: string;
    deliverableFormat?: string;
    // Adobe Stock specific fields
    minMegapixelsRequired?: number;
    aiDisclosureRequired?: boolean;
    technicalCheckPassed?: boolean;
    // Checklist
    checklist: WorkflowChecklistItem[];
  };
  submissionHistory: {
    timestamp: string;
    fromStatus: AssetWorkflowStatus;
    toStatus: AssetWorkflowStatus;
    evidenceNote: string;
    operatorNote?: string;
  }[];
  lastError?: string;
}
