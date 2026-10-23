/**
 * Platform Policy Registry
 * Priority 2.4: Official Contributor Terms & Multi-Account Integrity Architecture
 *
 * Grounded in Official Documentation:
 * - Adobe Stock Contributor Guidelines: https://helpx.adobe.com/stock/contributor/help/generative-ai-content.html
 * - Adobe Terms of Use: https://www.adobe.com/legal/terms.html
 * - Fiverr Terms of Service: https://www.fiverr.com/legal/terms-of-service
 * - Fiverr Community Standards: https://www.fiverr.com/community/standards
 */

import { PlatformId, PlatformPolicyProfile } from '../types/accountManager';

export const PLATFORM_POLICY_REGISTRY: Record<PlatformId, PlatformPolicyProfile> = {
  'adobe-stock': {
    platformId: 'adobe-stock',
    platformName: 'Adobe Stock',
    platformType: 'stock_marketplace',
    officialTermsUrl: 'https://helpx.adobe.com/stock/contributor/help/generative-ai-content.html',
    lastVerifiedAt: '2026-10-15',
    verificationStatus: 'verified',
    evidenceSummary:
      'Adobe Stock permits contributors with valid Adobe IDs. Multiple IDs are allowed under legitimate business separation (e.g. personal vs LLC/agency), but strictly forbidden for evading rejections or spamming identical content.',
    multipleAccountsAllowed: true,
    maxAccountsPerUser: 3,
    multipleAccountsRuleSummaryBn:
      'ব্যক্তিগত ও প্রাতিষ্ঠানিক কাজের পৃথকীকরণের জন্য আলাদা Adobe ID অনুমোদিত। তবে রিজেকশন এড়াতে বা একই কন্টেন্ট একাধিক অ্যাকাউন্টে ডুপ্লিকেট সাবমিট করা সম্পূর্ণ নিষিদ্ধ।',
    multipleAccountsRuleSummaryEn:
      'Separate Adobe IDs are permitted for legitimate business entity separation, but strictly prohibited for evading moderation rejections or duplicate asset spam.',
    automatedPublishingAllowed: false,
    automatedPublishingStatus: 'unsupported_no_public_api',
    automationBoundaryNoteBn:
      'Adobe Stock-এর পাবলিক ডেভেলপার এপিআই শুধুমাত্র ক্রেতাদের ছবি অনুসন্ধান ও লাইসেন্স করার জন্য (Search & Licensing API)। সাধারণ কন্ট্রিবিউটরদের জন্য স্বয়ংক্রিয় সাবমিশন এপিআই নেই। SFTP দিয়ে ফাইল পাঠানো হলেও তা "Uploaded Files" ড্রাফটে জমা থাকে; কন্ট্রিবিউটরকে নিজে পোর্টালে ঢুকে "Generative AI" চেকবক্স দিয়ে "Submit" বাটনে চাপতে হয়।',
    automationBoundaryNoteEn:
      'Adobe Stock public developer API is buyer-facing only (search & license). SFTP uploads only stage files in "Uploaded Files". Contributors must manually log into the portal, toggle the mandatory "Created using generative AI tools" checkbox, and click "Submit for Review".',
    aiContentPolicySummaryBn:
      'জেনারেটিভ এআই ছবি ও ভিডিও আইনত অনুমোদিত। আপলোডকালে "Created using generative AI tools" চেকবক্স বাধ্যতামূলক এবং শূন্য দৃশ্যমান ট্রেডমার্ক লোগো নিশ্চিত হতে হবে।',
    aiContentPolicySummaryEn:
      'Generative AI is legally permitted with mandatory AI checkbox disclosure; requires zero visible trademark logos and 4+ MP resolution.',
  },

  'fiverr': {
    platformId: 'fiverr',
    platformName: 'Fiverr',
    platformType: 'freelance_service',
    officialTermsUrl: 'https://www.fiverr.com/legal/terms-of-service',
    lastVerifiedAt: '2026-10-15',
    verificationStatus: 'verified',
    evidenceSummary:
      'Fiverr Terms of Service explicitly mandate: "To prevent fraud and abuse, users are limited to one active Fiverr account and one active Fiverr Business account. Any additional account... will be disabled."',
    multipleAccountsAllowed: false,
    maxAccountsPerUser: 1,
    multipleAccountsRuleSummaryBn:
      'কঠোর নিষেধাজ্ঞা: Fiverr-এ একজন ফ্রিল্যান্সারের জন্য শুধুমাত্র ১টি সক্রিয় অ্যাকাউন্ট অনুমোদিত। একাধিক অ্যাকাউন্ট খোলা Fiverr নীতিমালার সরাসরি লঙ্ঘন এবং স্থায়ী অ্যাকাউন্ট ব্যান ঘটায়।',
    multipleAccountsRuleSummaryEn:
      'Strict Prohibition: Fiverr strictly enforces one account per individual user. Operating multiple accounts violates Terms of Service and results in permanent account suspension.',
    automatedPublishingAllowed: false,
    automatedPublishingStatus: 'unsupported_no_public_api',
    automationBoundaryNoteBn:
      'Fiverr-এ গিগ স্বয়ংক্রিয় তৈরি বা প্রকাশের কোনো উন্মুক্ত পাবলিক API নেই। বট দিয়ে স্বয়ংক্রিয় লিস্টিং বা মেসেজিং Fiverr Terms Section "User Conduct"-এর পরিপন্থী। সিস্টেম ম্যানুয়াল গিগ প্যাকেজ প্রস্তুত করে দেয়।',
    automationBoundaryNoteEn:
      'Fiverr provides no public third-party API for automated gig creation or publishing. Unofficial automated actions violate User Conduct rules. The Studio prepares packages for safe manual publishing.',
    aiContentPolicySummaryBn:
      'AI জেনারেটেড ক্রিয়েটিভ সেবা (AI Art, Concept Generation) অনুমোদিত, তবে ক্রেতাকে কাজের প্রকৃতি স্বচ্ছভাবে জানাতে হবে এবং ডেলিভারিতে বাণিজ্যিক অধিকার সুরক্ষিত রাখতে হবে।',
    aiContentPolicySummaryEn:
      'AI creative services are permitted in relevant categories provided sellers maintain full commercial rights, disclose AI tools where required, and deliver authentic custom client work.',
  },

  'freepik': {
    platformId: 'freepik',
    platformName: 'Freepik',
    platformType: 'stock_marketplace',
    officialTermsUrl: 'https://support.freepik.com/s/article/Artificial-Intelligence-content',
    lastVerifiedAt: '2026-10-15',
    verificationStatus: 'verified',
    evidenceSummary:
      'Freepik contributors must submit verified identification. Operating multiple contributor profiles under the same individual requires explicit Freepik support approval.',
    multipleAccountsAllowed: false,
    maxAccountsPerUser: 1,
    multipleAccountsRuleSummaryBn:
      'ফ্রিপিক একজন কন্ট্রিবিউটরের জন্য একটিমাত্র অ্যাকাউন্ট সমর্থন করে। ভিন্ন অ্যাকাউন্টের জন্য কাস্টমার সাপোর্টের পূর্বানুমতি ছাড়া মাল্টি-অ্যাকাউন্ট অনুমোদিত নয়।',
    multipleAccountsRuleSummaryEn:
      'Freepik limits individual contributors to one verified profile unless special written permission is granted by support.',
    automatedPublishingAllowed: false,
    automatedPublishingStatus: 'unsupported_no_public_api',
    automationBoundaryNoteBn:
      'ফ্রিপিক পোর্টাল ম্যানুয়াল ওয়েব আপলোড এবং CSV বাল্ক মেটাডেটা প্রসেসিং সমর্থন করে; সরাসরি থার্ড-পার্টি পুশ এপিআই উন্মুক্ত নয়।',
    automationBoundaryNoteEn:
      'Freepik supports web portal upload and CSV bulk tagging. No public programmatic push API is currently documented for direct submissions.',
    aiContentPolicySummaryBn:
      'এআই ছবি গ্রহণযোগ্য; ড্যাশবোর্ডে চেকবক্স বা CSV-তে "_ai_generated" ট্যাগ বাধ্যতামূলক।',
    aiContentPolicySummaryEn:
      'AI images accepted with mandatory "_ai_generated" tag or dashboard toggle.',
  },

  'shutterstock': {
    platformId: 'shutterstock',
    platformName: 'Shutterstock',
    platformType: 'stock_marketplace',
    officialTermsUrl: 'https://support.submit.shutterstock.com/s/article/Generative-AI-FAQ',
    lastVerifiedAt: '2026-10-15',
    verificationStatus: 'verified',
    evidenceSummary:
      'Shutterstock prohibits submissions created with external third-party generative AI models. Contributor accounts are limited to one per legal tax identity.',
    multipleAccountsAllowed: false,
    maxAccountsPerUser: 1,
    multipleAccountsRuleSummaryBn:
      'একটি ট্যাক্স আইডেন্টিটির অধীনে একটি কন্ট্রিবিউটর অ্যাকাউন্ট অনুমোদিত। বাহ্যিক এআই ছবি সম্পূর্ণ নিষিদ্ধ।',
    multipleAccountsRuleSummaryEn:
      'Single contributor profile per legal entity. External third-party generative AI submissions are strictly prohibited.',
    automatedPublishingAllowed: false,
    automatedPublishingStatus: 'prohibited',
    automationBoundaryNoteBn:
      'Shutterstock বাহ্যিক জেনারেটিভ এআই ছবি সম্পূর্ণ নিষিদ্ধ করেছে। কন্টেন্ট ইনজেশন এপিআই শুধুমাত্র বিশেষ চুক্তিবদ্ধ এন্টারপ্রাইজ পার্টনারদের জন্য সীমাবদ্ধ; সাধারণ কন্ট্রিবিউটরদের জন্য স্বয়ংক্রিয় সাবমিশন অনুমোদিত নয়।',
    automationBoundaryNoteEn:
      'Shutterstock strictly bans external third-party generative AI. Contributor ingestion API is restricted exclusively to contracted Enterprise Partners.',
    aiContentPolicySummaryBn:
      'বাহ্যিক এআই কন্টেন্ট নিষিদ্ধ।',
    aiContentPolicySummaryEn:
      'Third-party generative AI content is prohibited.',
  },

  'dreamstime': {
    platformId: 'dreamstime',
    platformName: 'Dreamstime',
    platformType: 'stock_marketplace',
    officialTermsUrl: 'https://www.dreamstime.com/terms#guidelines',
    lastVerifiedAt: '2026-10-15',
    verificationStatus: 'verified',
    evidenceSummary:
      'Dreamstime accepts AI-generated illustrations with minimum 3 MP JPEG. One active contributor account per legal individual.',
    multipleAccountsAllowed: false,
    maxAccountsPerUser: 1,
    multipleAccountsRuleSummaryBn:
      'একক কন্ট্রিবিউটর প্রোফাইল অনুমোদিত। বাস্তবমুখী কৃত্রিম মানুষের মুখ নিষিদ্ধ।',
    multipleAccountsRuleSummaryEn:
      'Single contributor profile. AI with photorealistic human faces is prohibited.',
    automatedPublishingAllowed: false,
    automatedPublishingStatus: 'unsupported_no_public_api',
    automationBoundaryNoteBn:
      'ড্রিমস্টাইম-এ কোনো উন্মুক্ত স্বয়ংক্রিয় সাবমিশন এপিআই নেই। FTP শুধুমাত্র "Commercial Unfinished" সেকশনে ফাইল বাফার করে; পোর্টালে ঢুকে ম্যানুয়ালি ক্যাটাগরি ও রিলিজ নির্ধারণ করে Submit করতে হয়।',
    automationBoundaryNoteEn:
      'No public automated submission API. FTP only uploads to "Commercial Unfinished" staging drafts; manual category selection and submission via portal is required.',
    aiContentPolicySummaryBn:
      'Illustrations / AI-generated ক্যাটাগরিতে আপলোড বাধ্যতামূলক; বাস্তব মানুষের মুখ নিষিদ্ধ।',
    aiContentPolicySummaryEn:
      'Mandatory AI-generated illustration category; no realistic synthetic human faces.',
  },

  'wirestock': {
    platformId: 'wirestock',
    platformName: 'Wirestock',
    platformType: 'stock_marketplace',
    officialTermsUrl: 'https://wirestock.io/terms-of-use',
    lastVerifiedAt: '2026-10-15',
    verificationStatus: 'verified',
    evidenceSummary:
      'Wirestock syndicates assets across stock platforms. Single Wirestock account manages syndication.',
    multipleAccountsAllowed: false,
    maxAccountsPerUser: 1,
    multipleAccountsRuleSummaryBn:
      'একক Wirestock অ্যাকাউন্টের মাধ্যমে একাধিক পার্টনার এজেন্সিতে সিন্ডিকেশন পরিচালিত হয়।',
    multipleAccountsRuleSummaryEn:
      'Single Wirestock account manages distribution across multiple agency partners.',
    automatedPublishingAllowed: false,
    automatedPublishingStatus: 'unsupported_no_public_api',
    automationBoundaryNoteBn:
      'ওয়্যারস্টক ড্যাশবোর্ড ভিত্তিক আপলোড প্রক্রিয়া সমর্থন করে।',
    automationBoundaryNoteEn:
      'Dashboard-driven upload process with manual AI Content toggle.',
    aiContentPolicySummaryBn:
      'ড্যাশবোর্ডে AI Content টগল অন করা বাধ্যতামূলক; ৬ MP রেজোলিউশন সুপারিশকৃত।',
    aiContentPolicySummaryEn:
      'AI toggle mandatory on upload dashboard; 6 MP resolution recommended for full syndication.',
  },

  'other': {
    platformId: 'other',
    platformName: 'Other Agency',
    platformType: 'stock_marketplace',
    officialTermsUrl: '',
    lastVerifiedAt: '2026-10-15',
    verificationStatus: 'uncertain_needs_verification',
    evidenceSummary: 'Unverified custom platform. Contributor guidelines must be independently confirmed.',
    multipleAccountsAllowed: false,
    multipleAccountsRuleSummaryBn: 'মার্কেটপ্লেসের নিজস্ব টার্মস অনুযায়ী নীতি প্রযোজ্য।',
    multipleAccountsRuleSummaryEn: 'Terms depend on individual platform policy.',
    automatedPublishingAllowed: false,
    automatedPublishingStatus: 'unsupported_no_public_api',
    automationBoundaryNoteBn: 'অটোমেশন সমর্থিত নয়; ম্যানুয়াল সাবমিশন গাইড প্রযোজ্য।',
    automationBoundaryNoteEn: 'Automation unsupported; manual submission workflow required.',
    aiContentPolicySummaryBn: 'সংশ্লিষ্ট প্ল্যাটফর্মের এআই নীতিমালা যাচাই করুন।',
    aiContentPolicySummaryEn: 'Please verify the target platform AI policy before submission.',
  },
};

/**
 * Gate check: Validate whether adding a new account for a platform is permissible
 */
export function validateNewAccountPermissibility(
  platformId: PlatformId,
  existingActiveAccountsCount: number
): {
  allowed: boolean;
  reasonBn: string;
  reasonEn: string;
  policyUrl: string;
} {
  const policy = PLATFORM_POLICY_REGISTRY[platformId] || PLATFORM_POLICY_REGISTRY['other'];

  if (!policy.multipleAccountsAllowed && existingActiveAccountsCount >= (policy.maxAccountsPerUser || 1)) {
    return {
      allowed: false,
      reasonBn: `${policy.platformName}-এর অফিসিয়াল নীতিমালা অনুযায়ী একজন ব্যবহারকারীর জন্য সর্বোচ্চ ${policy.maxAccountsPerUser || 1}টি অ্যাকাউন্ট অনুমোদিত। একাধিক অ্যাকাউন্ট খোলা টার্মস অব সার্ভিস লঙ্ঘন (${policy.multipleAccountsRuleSummaryBn})।`,
      reasonEn: `According to ${policy.platformName}'s official terms, users are restricted to ${policy.maxAccountsPerUser || 1} active account. Creating duplicate accounts violates terms: ${policy.multipleAccountsRuleSummaryEn}`,
      policyUrl: policy.officialTermsUrl,
    };
  }

  if (policy.multipleAccountsAllowed && policy.maxAccountsPerUser && existingActiveAccountsCount >= policy.maxAccountsPerUser) {
    return {
      allowed: false,
      reasonBn: `${policy.platformName}-এ সর্বোচ্চ ${policy.maxAccountsPerUser}টি প্রোফাইল পরিচালনার সীমা পূর্ণ হয়েছে।`,
      reasonEn: `Maximum account limit (${policy.maxAccountsPerUser}) reached for ${policy.platformName}.`,
      policyUrl: policy.officialTermsUrl,
    };
  }

  return {
    allowed: true,
    reasonBn: `${policy.platformName}-এ নতুন প্রোফাইল যোগ করা নীতিগতভাবে বৈধ।`,
    reasonEn: `Adding a profile for ${policy.platformName} is policy-compliant.`,
    policyUrl: policy.officialTermsUrl,
  };
}
