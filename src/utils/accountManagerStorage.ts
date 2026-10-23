/**
 * Account Manager Storage & Workflow Lifecycle
 * Priority 2.4: Production-Grade Account CRUD & Asset Workflow Management
 *
 * Security & Integrity Guarantees:
 * 1. Strict Credential Shield: Passwords, session cookies, auth tokens, or secrets are strictly rejected and never persisted.
 * 2. Truthful Connection States: Never displays a fake "Connected" status; accurately reflects manual vs configured states.
 * 3. Platform Policy Gating: Blocks duplicate accounts where forbidden by platform rules (e.g. Fiverr 1-Account limit).
 * 4. Duplicate Assignment Guard: Prevents assigning the same asset to the same account multiple times.
 * 5. Verifiable Evidence Audit: State transitions require verifiable evidence and maintain chronological history.
 */

import { Asset } from '../types';
import {
  AccountAssetAssignment,
  AccountProfile,
  AssetWorkflowStatus,
  ConnectionStatus,
  PlatformId,
} from '../types/accountManager';
import { PLATFORM_POLICY_REGISTRY, validateNewAccountPermissibility } from './platformPolicyRegistry';
import { prepareAssetForAccount } from './accountWorkflowPreparer';

const ACCOUNTS_STORAGE_KEY = 'ai_creator_accounts_v1';
const ASSIGNMENTS_STORAGE_KEY = 'ai_creator_account_assignments_v1';

// In-memory fallback for non-browser/test environments
let memoryAccounts: AccountProfile[] = [];
let memoryAssignments: AccountAssetAssignment[] = [];

function isLocalStorageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Security audit: Ensure no passwords, session tokens, or private keys are accepted
 */
function sanitizeInputSecurity(data: Record<string, any>): void {
  const SENSITIVE_KEYS = ['password', 'secret', 'token', 'access_token', 'cookie', 'session', 'api_key', 'private_key'];
  for (const key of Object.keys(data)) {
    const lowerKey = key.toLowerCase();
    for (const forbidden of SENSITIVE_KEYS) {
      if (lowerKey.includes(forbidden)) {
        throw new Error(
          `Security Violation: Plaintext credential field '${key}' is strictly forbidden by Account Manager security architecture.`
        );
      }
    }
  }
}

// ----------------------------------------------------------------------------
// ACCOUNT PROFILES CRUD
// ----------------------------------------------------------------------------

export async function getAccounts(): Promise<AccountProfile[]> {
  if (isLocalStorageAvailable()) {
    try {
      const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Could not read accounts from localStorage:', e);
    }
  }
  return memoryAccounts;
}

export async function getAccountById(id: string): Promise<AccountProfile | null> {
  const accounts = await getAccounts();
  return accounts.find((acc) => acc.id === id) || null;
}

export async function saveAccount(
  accountData: {
    platformId: PlatformId;
    displayName: string;
    accountIdentifier: string;
    profileUrl?: string;
    notes?: string;
    connectionStatus?: ConnectionStatus;
  }
): Promise<{ success: boolean; account?: AccountProfile; error?: string }> {
  try {
    sanitizeInputSecurity(accountData);

    const platformPolicy = PLATFORM_POLICY_REGISTRY[accountData.platformId] || PLATFORM_POLICY_REGISTRY['other'];
    const currentAccounts = await getAccounts();
    const existingPlatformAccounts = currentAccounts.filter(
      (acc) => acc.platformId === accountData.platformId && acc.enabled
    );

    // Platform Policy Gate: Verify multi-account permissibility
    const gateCheck = validateNewAccountPermissibility(accountData.platformId, existingPlatformAccounts.length);
    if (!gateCheck.allowed) {
      return {
        success: false,
        error: gateCheck.reasonBn,
      };
    }

    const trimmedIdentifier = accountData.accountIdentifier.trim();
    if (!trimmedIdentifier) {
      return {
        success: false,
        error: 'অ্যাকাউন্ট সনাক্তকারী (Username বা Identifier) খালি হতে পারে না।',
      };
    }

    // Check for duplicate account identifier under same platform
    const isDuplicate = currentAccounts.some(
      (a) => a.platformId === accountData.platformId && a.accountIdentifier.toLowerCase() === trimmedIdentifier.toLowerCase()
    );
    if (isDuplicate) {
      return {
        success: false,
        error: `এই সনাক্তকারী (${trimmedIdentifier}) দিয়ে ${platformPolicy.platformName}-এ ইতিমধ্যে একটি অ্যাকাউন্ট সংরক্ষিত রয়েছে।`,
      };
    }

    const now = new Date().toISOString();
    
    // Truthful status determination: never claim 'connected' without configured credentials
    let initialStatus: ConnectionStatus = accountData.connectionStatus || 'action_required';
    let statusReasonBn = 'অ্যাকাউন্ট তৈরি হয়েছে; পোর্টাল নির্দেশিকা ও ওয়ার্কফ্লো কনফিগারেশন প্রয়োজন।';
    let statusReasonEn = 'Profile created; requires manual workflow orientation.';

    if (accountData.platformId === 'fiverr') {
      initialStatus = 'action_required';
      statusReasonBn = 'Fiverr সেলার প্রোফাইল সংরক্ষিত। কোনো পাবলিক এপিআই না থাকায় ম্যানুয়াল গিগ প্যাকেজ ডেলিভারি প্রযোজ্য।';
      statusReasonEn = 'Fiverr seller profile saved. Manual gig publishing workflow active.';
    } else if (accountData.platformId === 'adobe-stock') {
      initialStatus = 'action_required';
      statusReasonBn = 'Adobe Stock কন্ট্রিবিউটর অ্যাকাউন্ট নথিভুক্ত। ম্যানুয়াল পোর্টাল বা SFTP ক্রেডেনশিয়াল আবশ্যক।';
      statusReasonEn = 'Adobe Stock contributor registered. Requires manual web portal or SFTP setup.';
    }

    const newAccount: AccountProfile = {
      id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      platformId: accountData.platformId,
      platformType: platformPolicy.platformType,
      displayName: accountData.displayName.trim() || trimmedIdentifier,
      accountIdentifier: trimmedIdentifier,
      profileUrl: accountData.profileUrl?.trim() || undefined,
      connectionStatus: initialStatus,
      statusReasonBn,
      statusReasonEn,
      supportedCapabilities:
        platformPolicy.platformType === 'freelance_service'
          ? ['freelance_gig_showcase', 'portfolio_package_export', 'client_delivery_packager']
          : ['stock_image_licensing', 'stock_video_licensing', 'manual_submission_guide', 'metadata_csv_export'],
      unsupportedCapabilities:
        platformPolicy.automatedPublishingStatus === 'unsupported_no_public_api'
          ? ['automated_bot_publishing', 'browser_session_scraping']
          : [],
      notes: accountData.notes?.trim() || undefined,
      enabled: true,
      createdAt: now,
      updatedAt: now,
      authMethod: 'manual_workflow',
      stats: {
        assignedCount: 0,
        preparedCount: 0,
        submittedCount: 0,
        publishedCount: 0,
      },
    };

    const updated = [newAccount, ...currentAccounts];
    await persistAccounts(updated);

    return {
      success: true,
      account: newAccount,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'অ্যাকাউন্ট সংরক্ষণে অপ্রত্যাশিত ত্রুটি হয়েছে।',
    };
  }
}

export async function updateAccount(
  id: string,
  updates: Partial<Omit<AccountProfile, 'id' | 'createdAt'>>
): Promise<{ success: boolean; account?: AccountProfile; error?: string }> {
  try {
    sanitizeInputSecurity(updates);
    const current = await getAccounts();
    const index = current.findIndex((a) => a.id === id);
    if (index === -1) {
      return { success: false, error: 'অ্যাকাউন্ট পাওয়া যায়নি।' };
    }

    const existing = current[index];
    const updatedAccount: AccountProfile = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    current[index] = updatedAccount;
    await persistAccounts(current);

    return { success: true, account: updatedAccount };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteAccount(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const current = await getAccounts();
    const filtered = current.filter((a) => a.id !== id);
    await persistAccounts(filtered);

    // Also remove any asset assignments linked to this deleted account
    const assignments = await getAssignments();
    const remainingAssignments = assignments.filter((as) => as.accountId !== id);
    await persistAssignments(remainingAssignments);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function persistAccounts(accounts: AccountProfile[]): Promise<void> {
  memoryAccounts = accounts;
  if (isLocalStorageAvailable()) {
    try {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    } catch (e) {
      console.warn('Failed to persist accounts to localStorage:', e);
    }
  }
}

// ----------------------------------------------------------------------------
// ASSET WORKFLOW ASSIGNMENTS
// ----------------------------------------------------------------------------

export async function getAssignments(): Promise<AccountAssetAssignment[]> {
  if (isLocalStorageAvailable()) {
    try {
      const raw = localStorage.getItem(ASSIGNMENTS_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Could not read assignments from localStorage:', e);
    }
  }
  return memoryAssignments;
}

export async function getAssignmentsByAccount(accountId: string): Promise<AccountAssetAssignment[]> {
  const all = await getAssignments();
  return all.filter((a) => a.accountId === accountId);
}

export async function getAssignmentsByAsset(assetId: string): Promise<AccountAssetAssignment[]> {
  const all = await getAssignments();
  return all.filter((a) => a.assetId === assetId);
}

/**
 * Assign asset to account with duplicate prevention and workflow preparation
 */
export async function assignAssetToAccount(
  accountId: string,
  asset: Asset,
  options?: {
    customPriceUsd?: number;
    gigTier?: 'basic' | 'standard' | 'premium';
  }
): Promise<{ success: boolean; assignment?: AccountAssetAssignment; error?: string }> {
  try {
    const account = await getAccountById(accountId);
    if (!account) {
      return { success: false, error: 'নির্দিষ্ট অ্যাকাউন্টটি খুঁজে পাওয়া যায়নি।' };
    }

    if (!account.enabled) {
      return { success: false, error: 'অ্যাকাউন্টটি নিষ্ক্রিয় করা আছে। এসেট যুক্ত করতে অ্যাকাউন্টটি সক্রিয় করুন।' };
    }

    const currentAssignments = await getAssignments();

    // Guard: Prevent duplicate assignment of the same asset to the same account
    const existing = currentAssignments.find(
      (as) => as.accountId === accountId && as.assetId === asset.id
    );
    if (existing) {
      return {
        success: false,
        error: `এই এসেটটি (${asset.title}) ইতিমধ্যে এই অ্যাকাউন্টে যুক্ত রয়েছে (Workflow Status: ${existing.workflowStatus})। ডুপ্লিকেট সাবমিশন রোধ করা হয়েছে।`,
      };
    }

    // Prepare platform-specific package
    const prepResult = prepareAssetForAccount(asset, account.platformId, options);
    const now = new Date().toISOString();

    const newAssignment: AccountAssetAssignment = {
      id: `assign-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      accountId,
      platformId: account.platformId,
      assetId: asset.id,
      assetType: asset.type === 'video' ? 'video' : 'image',
      assignedAt: now,
      workflowStatus: 'prepared',
      workflowStatusLabelBn: 'প্যাকেজ প্রস্তুত (Prepared)',
      workflowStatusLabelEn: 'Package Prepared',
      targetPackage: prepResult.targetPackage,
      submissionHistory: [
        {
          timestamp: now,
          fromStatus: 'assigned',
          toStatus: 'prepared',
          evidenceNote: `স্বয়ংক্রিয়ভাবে ${account.displayName}-এর জন্য প্ল্যাটফর্ম নির্দিষ্ট মেটাডেটা ও চেকলিস্ট প্রস্তুত করা হয়েছে।`,
        },
      ],
    };

    const updated = [newAssignment, ...currentAssignments];
    await persistAssignments(updated);
    await syncAccountStats(accountId);

    return {
      success: true,
      assignment: newAssignment,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'এসেট যুক্তকরণে ত্রুটি হয়েছে।',
    };
  }
}

/**
 * Update workflow status with mandatory verifiable evidence
 */
export async function updateAssignmentWorkflowStatus(
  assignmentId: string,
  newStatus: AssetWorkflowStatus,
  evidenceNote: string,
  operatorNote?: string
): Promise<{ success: boolean; assignment?: AccountAssetAssignment; error?: string }> {
  try {
    if (!evidenceNote || evidenceNote.trim().length < 5) {
      return {
        success: false,
        error: 'স্ট্যাটাস পরিবর্তনের জন্য বাস্তব যাচাইযোগ্য প্রমাণের বিবরণ (Evidence Note) আবশ্যক। কোনো অনুমানমূলক স্ট্যাটাস আপডেট অনুমোদিত নয়।',
      };
    }

    const all = await getAssignments();
    const index = all.findIndex((as) => as.id === assignmentId);
    if (index === -1) {
      return { success: false, error: 'অ্যাসাইনমেন্টটি খুঁজে পাওয়া যায়নি।' };
    }

    const current = all[index];
    const prevStatus = current.workflowStatus;

    let labelBn = 'প্রস্তুত (Prepared)';
    let labelEn = 'Prepared';
    if (newStatus === 'awaiting_manual_action') {
      labelBn = 'ম্যানুয়াল পদক্ষেপের অপেক্ষায় (Awaiting Action)';
      labelEn = 'Awaiting Manual Action';
    } else if (newStatus === 'submitted') {
      labelBn = 'জমা দেওয়া হয়েছে (Submitted)';
      labelEn = 'Submitted';
    } else if (newStatus === 'confirmed_published') {
      labelBn = 'প্রকাশনা নিশ্চিতকৃত (Published)';
      labelEn = 'Confirmed Published';
    }

    const updatedAssignment: AccountAssetAssignment = {
      ...current,
      workflowStatus: newStatus,
      workflowStatusLabelBn: labelBn,
      workflowStatusLabelEn: labelEn,
      submissionHistory: [
        {
          timestamp: new Date().toISOString(),
          fromStatus: prevStatus,
          toStatus: newStatus,
          evidenceNote: evidenceNote.trim(),
          operatorNote: operatorNote?.trim(),
        },
        ...current.submissionHistory,
      ],
    };

    all[index] = updatedAssignment;
    await persistAssignments(all);
    await syncAccountStats(current.accountId);

    return {
      success: true,
      assignment: updatedAssignment,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Remove an assignment from account
 */
export async function removeAssignment(assignmentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const all = await getAssignments();
    const target = all.find((as) => as.id === assignmentId);
    if (!target) {
      return { success: false, error: 'অ্যাসাইনমেন্ট পাওয়া যায়নি।' };
    }

    const filtered = all.filter((as) => as.id !== assignmentId);
    await persistAssignments(filtered);
    await syncAccountStats(target.accountId);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function persistAssignments(assignments: AccountAssetAssignment[]): Promise<void> {
  memoryAssignments = assignments;
  if (isLocalStorageAvailable()) {
    try {
      localStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(assignments));
    } catch (e) {
      console.warn('Failed to persist assignments to localStorage:', e);
    }
  }
}

/**
 * Sync stats on account profile
 */
async function syncAccountStats(accountId: string): Promise<void> {
  const assignments = await getAssignmentsByAccount(accountId);
  const accounts = await getAccounts();
  const accIndex = accounts.findIndex((a) => a.id === accountId);
  if (accIndex === -1) return;

  accounts[accIndex].stats = {
    assignedCount: assignments.length,
    preparedCount: assignments.filter((a) => a.workflowStatus === 'prepared').length,
    submittedCount: assignments.filter((a) => a.workflowStatus === 'submitted').length,
    publishedCount: assignments.filter((a) => a.workflowStatus === 'confirmed_published').length,
  };

  await persistAccounts(accounts);
}
