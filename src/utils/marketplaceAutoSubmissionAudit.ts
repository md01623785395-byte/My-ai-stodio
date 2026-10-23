/**
 * Verified Auto-Submission Marketplace Audit Engine
 * Priority 7.2: Rigorous Contributor API & Submission Workflow Audit
 *
 * Grounded in Official Platform Documentation & Contributor Realities:
 * - Adobe Stock Contributor Guidelines: https://helpx.adobe.com/stock/contributor/help/generative-ai-content.html
 * - Adobe Stock SFTP Upload: https://helpx.adobe.com/stock/contributor/help/upload-process.html
 * - Adobe Stock Developer API (Buyer/Search only): https://developer.adobe.com/stock/docs/
 * - Shutterstock Contributor Portal: https://submit.shutterstock.com
 * - Shutterstock Generative AI FAQ: https://support.submit.shutterstock.com/s/article/Generative-AI-FAQ
 * - Shutterstock Developers (Enterprise Ingestion API only): https://www.shutterstock.com/developers/documentation
 * - Freepik Contributor Portal: https://contributor.freepik.com
 * - Freepik AI Guidelines: https://support.freepik.com/s/article/Artificial-Intelligence-content
 * - Freepik API (Search/Download only): https://docs.freepik.com/
 * - Dreamstime Contributor Terms & Guidelines: https://www.dreamstime.com/terms#guidelines
 * - Dreamstime FTP Upload: https://www.dreamstime.com/ftp-details
 * - Wirestock Terms of Use: https://wirestock.io/terms-of-use
 * - Wirestock Help Center: https://intercom.help/wirestock/en/
 * - Fiverr Terms of Service: https://www.fiverr.com/legal/terms-of-service
 *
 * Core Guarantees:
 * 1. Strict distinction between Search/Licensing APIs, SFTP/FTP file staging, and TRUE end-to-end auto-submission.
 * 2. If a contributor must visit a web portal to toggle AI disclosure, select categories, or click "Submit",
 *    it is classified as NOT FULL AUTO-SUBMISSION.
 * 3. Zero fake/mock auto-submission integrations.
 * 4. Zero scraping, session-cookie hijacking, 2FA bypass, or unauthorized password storage.
 */

import { StockMarketplaceId } from '../types';

export type SubmissionWorkflowClassification =
  | 'FULL_AUTO_SUBMIT_API'         // 100% automated API submission end-to-end (0 platforms currently qualify for individual accounts)
  | 'ASSISTED_SFTP_STAGING'        // SFTP/FTP upload puts files in draft staging buffer; manual portal submit required
  | 'POLICY_BLOCKED'               // Platform terms strictly prohibit external 3rd-party AI or require enterprise partner contract
  | 'DROP_PACKAGE_MANUAL_PORTAL'   // Web browser upload / drop package (ZIP + RFC 4180 CSV) manual flow
  | 'MANUAL_SERVICE_PACKAGE';      // Freelance service custom package (Fiverr)

export type SubmissionBlockerCategory =
  | 'no_contributor_submission_api'
  | 'staging_buffer_only'
  | 'ai_policy_prohibition'
  | 'enterprise_partner_agreement_required'
  | 'manual_portal_action_required'
  | 'manual_service_workflow';

export interface ContributorEligibilityRequirements {
  minAge: number;
  taxFormRequired: boolean;
  idVerificationRequired: boolean;
  enterpriseContractRequired: boolean;
  summaryBn: string;
  summaryEn: string;
}

export interface PlatformAuthenticationAudit {
  authMethod: 'oauth_user' | 'sftp_credentials' | 'enterprise_api_key' | 'web_portal_login' | 'none';
  supportsHeadlessSubmission: boolean;
  securityBoundaryNoteBn: string;
  securityBoundaryNoteEn: string;
}

export interface PlatformUploadAudit {
  webPortalUploadSupported: boolean;
  sftpFtpSupported: boolean;
  sftpHost?: string;
  apiUploadSupported: boolean;
  apiUploadTarget: 'none' | 'staging_draft_buffer' | 'buyer_search_only' | 'enterprise_only';
  uploadNoteBn: string;
  uploadNoteEn: string;
}

export interface PlatformFinalSubmissionAudit {
  canSubmitViaApi: boolean;
  requiresPortalInteraction: boolean;
  mandatoryPortalActionsBn: string[];
  mandatoryPortalActionsEn: string[];
}

export interface MarketplaceAutoSubmissionAuditProfile {
  platformId: StockMarketplaceId | 'fiverr';
  platformName: string;
  officialDocumentationUrl: string;
  officialApiPortalUrl: string;
  classification: SubmissionWorkflowClassification;
  isFullAutoSubmitPossible: boolean;
  contributorEligibility: ContributorEligibilityRequirements;
  authentication: PlatformAuthenticationAudit;
  upload: PlatformUploadAudit;
  finalSubmission: PlatformFinalSubmissionAudit;
  blockerCategory: SubmissionBlockerCategory;
  honestBlockerSummaryBn: string;
  honestBlockerSummaryEn: string;
  recommendedWorkflowBn: string;
  recommendedWorkflowEn: string;
  lastAuditDate: string;
}

export const MARKETPLACE_AUTO_SUBMISSION_REGISTRY: Record<
  StockMarketplaceId | 'fiverr',
  MarketplaceAutoSubmissionAuditProfile
> = {
  'adobe-stock': {
    platformId: 'adobe-stock',
    platformName: 'Adobe Stock',
    officialDocumentationUrl: 'https://helpx.adobe.com/stock/contributor/help/generative-ai-content.html',
    officialApiPortalUrl: 'https://developer.adobe.com/stock/docs/',
    classification: 'ASSISTED_SFTP_STAGING',
    isFullAutoSubmitPossible: false,
    contributorEligibility: {
      minAge: 18,
      taxFormRequired: true,
      idVerificationRequired: true,
      enterpriseContractRequired: false,
      summaryBn: '১৮+ বছর বয়স, বৈধ Adobe ID, ট্যাক্স ফর্ম ও সরকার অনুমোদিত ফটো আইডি ভেরিফিকেশন।',
      summaryEn: '18+ years of age, valid Adobe ID, approved tax form, and government photo ID verification.',
    },
    authentication: {
      authMethod: 'sftp_credentials',
      supportsHeadlessSubmission: false,
      securityBoundaryNoteBn: 'Adobe ID দিয়ে SFTP পাসওয়ার্ড তৈরি করা যায়, কিন্তু সেটি শুধুমাত্র ফাইল আপলোড বাফার করে; ফাইনাল সাবমিশন নয়।',
      securityBoundaryNoteEn: 'SFTP credentials buffer files into draft storage; cannot trigger final curator submission.',
    },
    upload: {
      webPortalUploadSupported: true,
      sftpFtpSupported: true,
      sftpHost: 'sftp.contributor.adobestock.com',
      apiUploadSupported: false,
      apiUploadTarget: 'buyer_search_only',
      uploadNoteBn: 'অফিসিয়াল SFTP সার্ভার (port 22) অথবা কন্ট্রিবিউটর ড্র্যাগ অ্যান্ড ড্রপ ওয়েব পোর্টালে ফাইল আপলোড করা যায়।',
      uploadNoteEn: 'Official SFTP server (port 22) or contributor web portal drag-and-drop.',
    },
    finalSubmission: {
      canSubmitViaApi: false,
      requiresPortalInteraction: true,
      mandatoryPortalActionsBn: [
        'কন্ট্রিবিউটর পোর্টালে (contributor.stock.adobe.com) লগইন করা',
        '"Uploaded Files" সেকশনে ফাইল নির্বাচন করা',
        'বাধ্যতামূলক "Created using generative AI tools" চেকবক্সে টিক দেওয়া',
        'বাস্তব মানুষ/সম্পত্তির রিলিজ আছে কি না তা নিশ্চিত করা',
        'ম্যানুয়ালি "Submit for Review" বাটনে ক্লিক করা',
      ],
      mandatoryPortalActionsEn: [
        'Log in to contributor portal (contributor.stock.adobe.com)',
        'Select uploaded files in "Uploaded Files" staging area',
        'Mandatory check: "Created using generative AI tools"',
        'Declare whether real people or property releases are present',
        'Manually click "Submit for Review" button',
      ],
    },
    blockerCategory: 'staging_buffer_only',
    honestBlockerSummaryBn:
      'Adobe Stock-এর পাবলিক ডেভেলপার API শুধুমাত্র ক্রেতাদের ছবি খোঁজা ও লাইসেন্স করার জন্য (Search & Licensing API)। সাধারণ কন্ট্রিবিউটরদের জন্য স্বয়ংক্রিয় সাবমিশন এপিআই নেই। SFTP দিয়ে ফাইল পাঠানো হলেও তা "Uploaded Files" ড্রাফটে জমা থাকে; কন্ট্রিবিউটরকে নিজে পোর্টালে ঢুকে "Generative AI" চেকবক্স দিয়ে "Submit" বাটনে চাপতে হয়।',
    honestBlockerSummaryEn:
      'Adobe Stock public API is buyer-facing only (search & license). SFTP uploads only stage files in "Uploaded Files". Contributors must manually log into the portal, toggle the mandatory "Created using generative AI tools" checkbox, and click "Submit for Review".',
    recommendedWorkflowBn: 'ড্রপ প্যাকেজ (স্ট্যান্ডার্ড JPEG + RFC 4180 CSV) ডাউনলোড করে পোর্টালে আপলোড ও সাবমিশন।',
    recommendedWorkflowEn: 'Export Drop Package (JPEG + RFC 4180 CSV), then perform assisted manual submission via portal.',
    lastAuditDate: '2026-10-22',
  },

  'shutterstock': {
    platformId: 'shutterstock',
    platformName: 'Shutterstock',
    officialDocumentationUrl: 'https://support.submit.shutterstock.com/s/article/Generative-AI-FAQ',
    officialApiPortalUrl: 'https://www.shutterstock.com/developers/documentation',
    classification: 'POLICY_BLOCKED',
    isFullAutoSubmitPossible: false,
    contributorEligibility: {
      minAge: 18,
      taxFormRequired: true,
      idVerificationRequired: true,
      enterpriseContractRequired: true,
      summaryBn: '১৮+ বছর বয়স, ট্যাক্স ফর্ম অনুমোদন এবং কন্টেন্ট ইনজেশন API ব্যবহারের জন্য বিশেষ এন্টারপ্রাইজ পার্টনারশিপ চুক্তি বাধ্যতামূলক।',
      summaryEn: '18+ age, approved tax form. Contributor Ingestion API strictly requires custom Enterprise Partner agreement.',
    },
    authentication: {
      authMethod: 'enterprise_api_key',
      supportsHeadlessSubmission: false,
      securityBoundaryNoteBn: 'পাবলিক ডেভেলপারদের জন্য সাধারণ কন্ট্রিবিউটর এপিআই অ্যাক্সেস বন্ধ; শুধুমাত্র বড় বাণিজ্যিক অংশীদারদের জন্য উন্মুক্ত।',
      securityBoundaryNoteEn: 'Public individual contributor API access is restricted; open only to negotiated enterprise partners.',
    },
    upload: {
      webPortalUploadSupported: true,
      sftpFtpSupported: true,
      sftpHost: 'ftps.shutterstock.com',
      apiUploadSupported: false,
      apiUploadTarget: 'enterprise_only',
      uploadNoteBn: 'FTPS (port 21) বা ওয়েব পোর্টাল আপলোড বিদ্যমান, কিন্তু ড্রাফট থেকে সাবমিট করার জন্য পোর্টাল ইন্টারঅ্যাকশন প্রয়োজন।',
      uploadNoteEn: 'FTPS (port 21) or web portal staging upload.',
    },
    finalSubmission: {
      canSubmitViaApi: false,
      requiresPortalInteraction: true,
      mandatoryPortalActionsBn: [
        'Shutterstock Contributor পোর্টালে প্রবেশ করা',
        'ক্যাটাগরি ১ ও ক্যাটাগরি ২ নির্বাচন করা',
        'ইলাস্ট্রেশন এবং পরিপক্ক কন্টেন্ট ফ্ল্যাগ সেট করা',
        'ম্যানুয়ালি "Submit" বাটনে ক্লিক করা',
      ],
      mandatoryPortalActionsEn: [
        'Log in to submit.shutterstock.com',
        'Select mandatory primary and secondary categories',
        'Set illustration and mature content flags',
        'Manually click "Submit"',
      ],
    },
    blockerCategory: 'ai_policy_prohibition',
    honestBlockerSummaryBn:
      '১. কঠোর পলিসি ব্লকার: Shutterstock বাহ্যিক থার্ড-পার্টি জেনারেটিভ এআই ছবি (Midjourney, DALL-E, Imagen ইত্যাদি) সম্পূর্ণ নিষিদ্ধ করেছে। শুধুমাত্র তাদের নিজস্ব বিল্ট-ইন এআই টুল দিয়ে তৈরি ছবি প্ল্যাটফর্মে গ্রাহ্য হয়।\n২. এপিআই ব্লকার: সাধারণ কন্ট্রিবিউটরের জন্য স্বয়ংক্রিয় সাবমিশন এপিআই উন্মুক্ত নয় (শুধুমাত্র এন্টারপ্রাইজ পার্টনার)।',
    honestBlockerSummaryEn:
      'Strict Policy Blocker: Shutterstock explicitly bans external third-party generative AI imagery. Contributor Content Ingestion API is also restricted exclusively to contracted Enterprise Partners.',
    recommendedWorkflowBn: 'নন-এআই বা এডিটরিয়াল কন্টেন্টের জন্য ড্রপ প্যাকেজ (JPEG + RFC 4180 CSV); এআই কন্টেন্ট সাবমিট না করা।',
    recommendedWorkflowEn: 'Drop Package export only for compliant non-AI/editorial content; do not submit third-party AI assets.',
    lastAuditDate: '2026-10-22',
  },

  'freepik': {
    platformId: 'freepik',
    platformName: 'Freepik',
    officialDocumentationUrl: 'https://support.freepik.com/s/article/Artificial-Intelligence-content',
    officialApiPortalUrl: 'https://docs.freepik.com/',
    classification: 'DROP_PACKAGE_MANUAL_PORTAL',
    isFullAutoSubmitPossible: false,
    contributorEligibility: {
      minAge: 18,
      taxFormRequired: true,
      idVerificationRequired: true,
      enterpriseContractRequired: false,
      summaryBn: '১৮+ বছর বয়স, জাতীয় পরিচয়পত্র বা পাসপোর্ট যাচাই এবং লেভেলভিত্তিক কন্ট্রিবিউটর অনুমোদন।',
      summaryEn: '18+ age, national ID/passport verification, and tier-based contributor approval.',
    },
    authentication: {
      authMethod: 'web_portal_login',
      supportsHeadlessSubmission: false,
      securityBoundaryNoteBn: 'ফ্রিপিকের পাবলিক এপিআই কি দিয়ে কন্ট্রিবিউটর অ্যাকাউন্টে ফাইল সাবমিট করা যায় না।',
      securityBoundaryNoteEn: 'Freepik developer API keys do not grant contributor upload or submission privileges.',
    },
    upload: {
      webPortalUploadSupported: true,
      sftpFtpSupported: true,
      sftpHost: 'ftp.freepik.com',
      apiUploadSupported: false,
      apiUploadTarget: 'buyer_search_only',
      uploadNoteBn: 'FTP (ftp.freepik.com) বা ড্যাশবোর্ড ড্র্যাগ অ্যান্ড ড্রপ। ফাইল সরাসরি "Under Revision" ড্রাফট ট্যাবে জমা হয়।',
      uploadNoteEn: 'FTP (ftp.freepik.com) or web dashboard drag-and-drop into "Under Revision" draft tab.',
    },
    finalSubmission: {
      canSubmitViaApi: false,
      requiresPortalInteraction: true,
      mandatoryPortalActionsBn: [
        'ফ্রিপিক কন্ট্রিবিউটর প্যানেলে (contributor.freepik.com) লগইন করা',
        'ফাইল বা CSV মেটাডেটা যাচাই করা',
        'AI ট্যাগে "_ai_generated" বা প্রম্পট ফিল্ড নিশ্চিত করা',
        'ম্যানুয়ালি "Send to Revision" বাটনে ক্লিক করা',
      ],
      mandatoryPortalActionsEn: [
        'Log in to contributor.freepik.com',
        'Review files and CSV metadata associations',
        'Verify "_ai_generated" tag or prompt declaration',
        'Manually click "Send to Revision" (Submit)',
      ],
    },
    blockerCategory: 'no_contributor_submission_api',
    honestBlockerSummaryBn:
      'Freepik-এর কোনো কন্ট্রিবিউটর সাবমিশন এপিআই নেই (তাদের ডেভেলপার এপিআই শুধুমাত্র গ্রাহকদের ছবি অনুসন্ধান ও ডাউনলোডের জন্য)। এফটিপি বা ওয়েব আপলোডের পর ব্যবহারকারীকে পোর্টালে ঢুকে নিজে "Send to Revision" বাটনে ক্লিক করতে হয়।',
    honestBlockerSummaryEn:
      'Freepik provides no contributor submission API (developer API is for search & download only). Contributor must manually click "Send to Revision" in the contributor panel.',
    recommendedWorkflowBn: 'ড্রপ প্যাকেজ (JPEG + RFC 4180 CSV মেটাডেটা) তৈরি করে পোর্টালে আপলোড।',
    recommendedWorkflowEn: 'Drop Package export (JPEG + RFC 4180 CSV), upload via FTP or portal, then manual revision dispatch.',
    lastAuditDate: '2026-10-22',
  },

  'dreamstime': {
    platformId: 'dreamstime',
    platformName: 'Dreamstime',
    officialDocumentationUrl: 'https://www.dreamstime.com/terms#guidelines',
    officialApiPortalUrl: 'https://www.dreamstime.com/api',
    classification: 'ASSISTED_SFTP_STAGING',
    isFullAutoSubmitPossible: false,
    contributorEligibility: {
      minAge: 18,
      taxFormRequired: true,
      idVerificationRequired: true,
      enterpriseContractRequired: false,
      summaryBn: '১৮+ বয়স, একক কন্ট্রিবিউটর একাউন্ট, ট্যাক্স আইডেন্টিটি ভেরিফিকেশন।',
      summaryEn: '18+ age, single contributor account, tax ID verification.',
    },
    authentication: {
      authMethod: 'sftp_credentials',
      supportsHeadlessSubmission: false,
      securityBoundaryNoteBn: 'FTP ক্রেডেনশিয়াল শুধুমাত্র ড্রাফট ফোল্ডারে ফাইল আপলোড করে; স্বয়ংক্রিয় সাবমিশন বা ক্যাটাগরি ম্যাপিং সম্ভব নয়।',
      securityBoundaryNoteEn: 'FTP credentials only transfer raw files to staging drafts; cannot bypass manual categorization.',
    },
    upload: {
      webPortalUploadSupported: true,
      sftpFtpSupported: true,
      sftpHost: 'ftp.dreamstime.com',
      apiUploadSupported: false,
      apiUploadTarget: 'buyer_search_only',
      uploadNoteBn: 'FTP (ftp.dreamstime.com) বা ড্রিমস্টাইম ওয়েব পোর্টাল আপলোড।',
      uploadNoteEn: 'FTP (ftp.dreamstime.com) or web portal staging upload.',
    },
    finalSubmission: {
      canSubmitViaApi: false,
      requiresPortalInteraction: true,
      mandatoryPortalActionsBn: [
        'ড্রিমস্টাইম "Commercial Unfinished" সেকশনে লগইন করা',
        'Illustrations / AI-generated ক্যাটাগরি চয়ন করা',
        'মডেল ও প্রপার্টি রিলিজ স্ট্যাটাস নিশ্চিত করা',
        'ম্যানুয়ালি "Submit" বাটনে ক্লিক করা',
      ],
      mandatoryPortalActionsEn: [
        'Log in to "Commercial Unfinished" staging section',
        'Select "Illustrations / AI-generated" categories',
        'Confirm model/property release status',
        'Manually click "Submit"',
      ],
    },
    blockerCategory: 'staging_buffer_only',
    honestBlockerSummaryBn:
      'Dreamstime-এর কোনো উন্মুক্ত কন্ট্রিবিউটর সাবমিশন এপিআই নেই। এফটিপিতে পাঠানো ফাইলগুলো "Commercial Unfinished" ট্যাবে আটকে থাকে; ব্যবহারকারী নিজে ক্যাটাগরি নির্বাচন করে "Submit" না করা পর্যন্ত কোনো ফাইল কিউরেশনে যায় না।',
    honestBlockerSummaryEn:
      'Dreamstime has no open contributor submission API. Files uploaded via FTP remain in "Commercial Unfinished" until the contributor manually selects categories and clicks "Submit".',
    recommendedWorkflowBn: 'ড্রপ প্যাকেজ (JPEG + RFC 4180 CSV) ডাউনলোড করে পোর্টালে সাবমিশন।',
    recommendedWorkflowEn: 'Drop Package export (JPEG + RFC 4180 CSV), upload to FTP, then complete category assignment on portal.',
    lastAuditDate: '2026-10-22',
  },

  'wirestock': {
    platformId: 'wirestock',
    platformName: 'Wirestock',
    officialDocumentationUrl: 'https://wirestock.io/terms-of-use',
    officialApiPortalUrl: 'https://intercom.help/wirestock/en/',
    classification: 'DROP_PACKAGE_MANUAL_PORTAL',
    isFullAutoSubmitPossible: false,
    contributorEligibility: {
      minAge: 18,
      taxFormRequired: true,
      idVerificationRequired: true,
      enterpriseContractRequired: false,
      summaryBn: '১৮+ বছর বয়স, একক ওয়্যারস্টক অ্যাকাউন্ট, ভেরিফাইড ইমেইল।',
      summaryEn: '18+ age, single Wirestock account, verified email.',
    },
    authentication: {
      authMethod: 'web_portal_login',
      supportsHeadlessSubmission: false,
      securityBoundaryNoteBn: 'ওয়্যারস্টকের কোনো উন্মুক্ত থার্ড-পার্টি কন্ট্রিবিউটর এপিআই নেই; শুধুমাত্র নিজস্ব ওয়েব ড্যাশবোর্ড ও মোবাইল অ্যাপ রয়েছে।',
      securityBoundaryNoteEn: 'Wirestock offers no open third-party contributor API; interactions are via web dashboard and mobile app.',
    },
    upload: {
      webPortalUploadSupported: true,
      sftpFtpSupported: false,
      apiUploadSupported: false,
      apiUploadTarget: 'none',
      uploadNoteBn: 'ওয়্যারস্টক ড্যাশবোর্ড বা মোবাইল অ্যাপের মাধ্যমে ড্র্যাগ অ্যান্ড ড্রপ ফাইল আপলোড।',
      uploadNoteEn: 'Drag-and-drop web dashboard or official mobile app upload.',
    },
    finalSubmission: {
      canSubmitViaApi: false,
      requiresPortalInteraction: true,
      mandatoryPortalActionsBn: [
        'ওয়্যারস্টক ড্যাশবোর্ডে লগইন করা',
        'ছবি আপলোড করার পর "AI-generated content" টগল সক্রিয় করা',
        'লাইসেন্সিং চ্যানেল ও ডিস্ট্রিবিউশন অপশন নির্বাচন করা',
        'ম্যানুয়ালি "Post" / "Submit" বাটনে ক্লিক করা',
      ],
      mandatoryPortalActionsEn: [
        'Log in to Wirestock creator dashboard',
        'Activate "AI-generated content" toggle for asset',
        'Select licensing channels and distribution options',
        'Manually click "Post" / "Submit"',
      ],
    },
    blockerCategory: 'no_contributor_submission_api',
    honestBlockerSummaryBn:
      'Wirestock একটি ডিস্ট্রিবিউটর/অ্যাগ্রিগেটর প্ল্যাটফর্ম। সাধারণ ব্যবহারকারীদের জন্য কোনো ওপেন এপিআই বা এসএফটিপি নেই। সমস্ত সাবমিশন তাদের ওয়েব ড্যাশবোর্ডে লগইন করে "AI Content" টগল চালু করে ম্যানুয়ালি সম্পন্ন করতে হয়।',
    honestBlockerSummaryEn:
      'Wirestock is a distribution aggregator with no open third-party developer API. Creators must log into the web dashboard, enable the AI toggle, and click submit manually.',
    recommendedWorkflowBn: 'ড্রপ প্যাকেজ (৬+ মেগাপিক্সেল JPEG + সিন্ডিকেশন মেটাডেটা) দিয়ে ড্যাশবোর্ড আপলোড।',
    recommendedWorkflowEn: 'Drop Package export (6+ MP JPEG + syndication metadata), then upload via dashboard.',
    lastAuditDate: '2026-10-22',
  },

  'fiverr': {
    platformId: 'fiverr',
    platformName: 'Fiverr',
    officialDocumentationUrl: 'https://www.fiverr.com/legal/terms-of-service',
    officialApiPortalUrl: 'https://www.fiverr.com/community/standards',
    classification: 'MANUAL_SERVICE_PACKAGE',
    isFullAutoSubmitPossible: false,
    contributorEligibility: {
      minAge: 18,
      taxFormRequired: true,
      idVerificationRequired: true,
      enterpriseContractRequired: false,
      summaryBn: '১৮+ বছর বয়স, একক ফ্রিল্যান্সার অ্যাকাউন্ট (মাল্টি-অ্যাকাউন্ট সম্পূর্ণ নিষিদ্ধ)।',
      summaryEn: '18+ age, single freelancer profile strictly enforced.',
    },
    authentication: {
      authMethod: 'web_portal_login',
      supportsHeadlessSubmission: false,
      securityBoundaryNoteBn: 'Fiverr টার্মস অফ সার্ভিস অনুযায়ী যে কোনো ধরনের বট বা স্বয়ংক্রিয় স্ক্র্যাপিং অ্যাকাউন্ট সাসপেনশনের কারণ।',
      securityBoundaryNoteEn: 'Fiverr Terms strictly ban unauthorized bots, scrapers, or browser-automation tools.',
    },
    upload: {
      webPortalUploadSupported: true,
      sftpFtpSupported: false,
      apiUploadSupported: false,
      apiUploadTarget: 'none',
      uploadNoteBn: 'গিগ তৈরি ও ক্লায়েন্ট অর্ডার ডেলিভারি সরাসরি Fiverr ওয়েব/অ্যাপ্লিকেশনের মাধ্যমে করতে হয়।',
      uploadNoteEn: 'Gig creation and order delivery must occur directly on Fiverr web/mobile app.',
    },
    finalSubmission: {
      canSubmitViaApi: false,
      requiresPortalInteraction: true,
      mandatoryPortalActionsBn: [
        'Fiverr ড্যাশবোর্ডে লগইন করা',
        'গিগ ক্রিয়েশন বা ক্লায়েন্ট অর্ডারে "Deliver Now" পেজে যাওয়া',
        'কাস্টম ডেলিভারি ফাইল ও কমার্শিয়াল রাইটস নোট সংযুক্ত করা',
        'ম্যানুয়ালি সাবমিট বা সেন্ড বাটনে ক্লিক করা',
      ],
      mandatoryPortalActionsEn: [
        'Log in to Fiverr freelancer dashboard',
        'Navigate to Gig creation or Order "Deliver Now" screen',
        'Attach custom deliverables and commercial rights declaration',
        'Manually click submit/deliver',
      ],
    },
    blockerCategory: 'manual_service_workflow',
    honestBlockerSummaryBn:
      'Fiverr একটি ফ্রিল্যান্স সেবা মার্কেটপ্লেস, কোনো স্টক লাইব্রেরি নয়। গিগ তৈরি বা ক্লায়েন্ট ডেলিভারির কোনো পাবলিক এপিআই নেই। সিস্টেম সম্পূর্ণ কমার্শিয়াল ক্লায়েন্ট ডেলিভারি প্যাকেজ প্রস্তুত করে দেয় যা নিরাপদভাবে ম্যানুয়ালি ব্যবহার করা যায়।',
    honestBlockerSummaryEn:
      'Fiverr is a freelance services platform, not a stock library. There is no public gig creation or automated order delivery API. The Studio prepares commercial delivery packages for manual publishing.',
    recommendedWorkflowBn: 'ক্লায়েন্ট ডেলিভারি প্যাকেজ (হাই-রেজোলিউশন অ্যাসেট + কমার্শিয়াল লাইসেন্স নোট) প্রস্তুত ও ম্যানুয়াল ডেলিভারি।',
    recommendedWorkflowEn: 'Client Deliverable Packager (High-res asset + commercial rights statement) for safe manual delivery.',
    lastAuditDate: '2026-10-22',
  },

  'other': {
    platformId: 'other',
    platformName: 'Other Agency',
    officialDocumentationUrl: '',
    officialApiPortalUrl: '',
    classification: 'DROP_PACKAGE_MANUAL_PORTAL',
    isFullAutoSubmitPossible: false,
    contributorEligibility: {
      minAge: 18,
      taxFormRequired: true,
      idVerificationRequired: true,
      enterpriseContractRequired: false,
      summaryBn: 'সংশ্লিষ্ট প্ল্যাটফর্মের কন্ট্রিবিউটর নির্দেশিকা যাচাই আবশ্যক।',
      summaryEn: 'Independent review of target platform guidelines required.',
    },
    authentication: {
      authMethod: 'web_portal_login',
      supportsHeadlessSubmission: false,
      securityBoundaryNoteBn: 'অযাচাইকৃত প্ল্যাটফর্মে কোনো অটোমেশন চালানো আইনত ঝুঁকিপূর্ণ।',
      securityBoundaryNoteEn: 'Running unverified automation on third-party services presents legal and security risks.',
    },
    upload: {
      webPortalUploadSupported: true,
      sftpFtpSupported: false,
      apiUploadSupported: false,
      apiUploadTarget: 'none',
      uploadNoteBn: 'ম্যানুয়াল ওয়েব আপলোড প্রযোজ্য।',
      uploadNoteEn: 'Manual web upload only.',
    },
    finalSubmission: {
      canSubmitViaApi: false,
      requiresPortalInteraction: true,
      mandatoryPortalActionsBn: ['সংশ্লিষ্ট এজেন্সির ড্যাশবোর্ডে ম্যানুয়াল রিভিউ ও সাবমিশন।'],
      mandatoryPortalActionsEn: ['Manual portal submission on target agency dashboard.'],
    },
    blockerCategory: 'no_contributor_submission_api',
    honestBlockerSummaryBn: 'কাস্টম এজেন্সির জন্য কোনো যাচাইকৃত অটো-সাবমিশন এপিআই নেই; শুধুমাত্র ড্রপ প্যাকেজ সমর্থিত।',
    honestBlockerSummaryEn: 'No verified contributor submission API for generic agencies; drop package only.',
    recommendedWorkflowBn: 'মাস্টার RFC 4180 CSV ও JPEG ড্রপ প্যাকেজ।',
    recommendedWorkflowEn: 'Master RFC 4180 CSV and standard JPEG drop package.',
    lastAuditDate: '2026-10-22',
  },
};

/**
 * Retrieves the auto-submission audit profile for a specific platform
 */
export function getMarketplaceAutoSubmissionAudit(
  platformId: StockMarketplaceId | 'fiverr' | string
): MarketplaceAutoSubmissionAuditProfile {
  if (platformId in MARKETPLACE_AUTO_SUBMISSION_REGISTRY) {
    return MARKETPLACE_AUTO_SUBMISSION_REGISTRY[platformId as StockMarketplaceId | 'fiverr'];
  }
  return MARKETPLACE_AUTO_SUBMISSION_REGISTRY['other'];
}

/**
 * Returns all audited marketplace profiles
 */
export function getAllMarketplaceAutoSubmissionAudits(): MarketplaceAutoSubmissionAuditProfile[] {
  return Object.values(MARKETPLACE_AUTO_SUBMISSION_REGISTRY);
}

/**
 * Returns list of platforms where full automated submission via individual contributor API is verified.
 * TRUTHFUL GUARANTEE: Returns [] because ZERO stock agencies currently support end-to-end individual auto-submit!
 */
export function getVerifiedAutoSubmissionPlatforms(): MarketplaceAutoSubmissionAuditProfile[] {
  return getAllMarketplaceAutoSubmissionAudits().filter((p) => p.isFullAutoSubmitPossible);
}

/**
 * Returns all platforms with their honest blockers
 */
export function getBlockedAutoSubmissionPlatforms(): MarketplaceAutoSubmissionAuditProfile[] {
  return getAllMarketplaceAutoSubmissionAudits().filter((p) => !p.isFullAutoSubmitPossible);
}

/**
 * Generates structured audit summary
 */
export function getSubmissionReadinessAuditSummary(): {
  totalAudited: number;
  verifiedAutoSubmitCount: number;
  blockedCount: number;
  platforms: Record<
    string,
    {
      name: string;
      classification: SubmissionWorkflowClassification;
      isFullAutoSubmitPossible: boolean;
      officialDocs: string;
      blockerBn: string;
    }
  >;
  honestVerdictBn: string;
  honestVerdictEn: string;
} {
  const all = getAllMarketplaceAutoSubmissionAudits();
  const verified = getVerifiedAutoSubmissionPlatforms();
  const blocked = getBlockedAutoSubmissionPlatforms();

  const platformsSummary: Record<string, any> = {};
  for (const p of all) {
    platformsSummary[p.platformId] = {
      name: p.platformName,
      classification: p.classification,
      isFullAutoSubmitPossible: p.isFullAutoSubmitPossible,
      officialDocs: p.officialDocumentationUrl,
      blockerBn: p.honestBlockerSummaryBn,
    };
  }

  return {
    totalAudited: all.length,
    verifiedAutoSubmitCount: verified.length, // Strictly 0
    blockedCount: blocked.length,
    platforms: platformsSummary,
    honestVerdictBn:
      'অফিসিয়াল ডকুমেন্টেশন ও এপিআই অডিট নিশ্চিত করে: বর্তমানে কোনো স্টক এজেন্সিতে সাধারণ কন্ট্রিবিউটরদের জন্য ১০০% স্বয়ংক্রিয় এপিআই সাবমিশন অনুমোদিত নয়। ড্রপ প্যাকেজ (JPEG + RFC 4180 CSV) এবং কন্ট্রিবিউটর পোর্টালে ম্যানুয়াল সাবমিশনই একমাত্র বৈধ ও নিরাপদ পদ্ধতি।',
    honestVerdictEn:
      'Official documentation and API audit confirms: Zero stock agencies currently support 100% automated API submission for individual contributors. Drop Packages (JPEG + RFC 4180 CSV) and manual portal submission remain the only legitimate, compliant workflow.',
  };
}
