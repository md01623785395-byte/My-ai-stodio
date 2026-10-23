/**
 * Account Manager View
 * Priority 2.4: Professional Account Manager Module
 *
 * Integrated with:
 * - Adobe Stock (Stock Marketplace Workflow)
 * - Fiverr (Freelance Service Gig & Client Deliverable Workflow)
 * - Verified Platform Policy Gates & Multi-Account Integrity
 */

import React, { useState, useEffect } from 'react';
import { Asset, StudioTab } from '../types';
import {
  AccountAssetAssignment,
  AccountProfile,
  AssetWorkflowStatus,
  ConnectionStatus,
  PlatformId,
} from '../types/accountManager';
import {
  getAccounts,
  saveAccount,
  updateAccount,
  deleteAccount,
  getAssignments,
  assignAssetToAccount,
  updateAssignmentWorkflowStatus,
  removeAssignment,
} from '../utils/accountManagerStorage';
import { PLATFORM_POLICY_REGISTRY, validateNewAccountPermissibility } from '../utils/platformPolicyRegistry';
import { getMarketplaceAutoSubmissionAudit } from '../utils/marketplaceAutoSubmissionAudit';
import {
  UserCheck,
  Briefcase,
  Plus,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trash2,
  Edit2,
  Copy,
  Check,
  ChevronRight,
  Sparkles,
  Info,
  Clock,
  Layers,
  ArrowRight,
  X,
  FileText,
  BarChart3,
} from 'lucide-react';
import { AdobeSalesAnalyticsView } from './AdobeSalesAnalyticsView';

interface AccountManagerViewProps {
  assets: Asset[];
  onNavigate: (tab: StudioTab) => void;
}

export const AccountManagerView: React.FC<AccountManagerViewProps> = ({ assets, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'profiles' | 'assignments' | 'policies' | 'analytics'>('profiles');
  const [accounts, setAccounts] = useState<AccountProfile[]>([]);
  const [assignments, setAssignments] = useState<AccountAssetAssignment[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modals state
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showAssignAssetModal, setShowAssignAssetModal] = useState(false);
  const [viewingAssignment, setViewingAssignment] = useState<AccountAssetAssignment | null>(null);
  const [editingAccount, setEditingAccount] = useState<AccountProfile | null>(null);

  // New account form
  const [newPlatformId, setNewPlatformId] = useState<PlatformId>('adobe-stock');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newAccountIdentifier, setNewAccountIdentifier] = useState('');
  const [newProfileUrl, setNewProfileUrl] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Asset assignment form
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [targetAssignAccountId, setTargetAssignAccountId] = useState<string>('');
  const [fiverrGigTier, setFiverrGigTier] = useState<'basic' | 'standard' | 'premium'>('standard');
  const [customPriceUsd, setCustomPriceUsd] = useState<number>(35);

  // Status transition form inside assignment viewer
  const [statusUpdateEvidence, setStatusUpdateEvidence] = useState('');
  const [statusUpdateOperatorNote, setStatusUpdateOperatorNote] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Load accounts and assignments
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [accs, assns] = await Promise.all([getAccounts(), getAssignments()]);
      setAccounts(accs);
      setAssignments(assns);
    } catch (err: any) {
      setErrorMessage(err.message || 'ডেটা লোড করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  }

  function triggerSuccess(msg: string) {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  }

  const handleCopyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Add account profile
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const result = await saveAccount({
      platformId: newPlatformId,
      displayName: newDisplayName.trim(),
      accountIdentifier: newAccountIdentifier.trim(),
      profileUrl: newProfileUrl.trim() || undefined,
      notes: newNotes.trim() || undefined,
    });

    if (!result.success) {
      setErrorMessage(result.error || 'অ্যাকাউন্ট তৈরি সম্ভব হয়নি।');
      return;
    }

    setShowAddAccountModal(false);
    setNewDisplayName('');
    setNewAccountIdentifier('');
    setNewProfileUrl('');
    setNewNotes('');
    triggerSuccess('অ্যাকাউন্ট প্রোফাইল সফলভাবে তৈরি হয়েছে।');
    await loadData();
  };

  // Delete account profile
  const handleDeleteAccount = async (id: string, name: string) => {
    if (!window.confirm(`আপনি কি সত্যিই "${name}" অ্যাকাউন্ট প্রোফাইল এবং এর সমস্ত অ্যাসাইনমেন্ট ডিলিট করতে চান?`)) {
      return;
    }
    const res = await deleteAccount(id);
    if (res.success) {
      triggerSuccess('অ্যাকাউন্ট মুছে ফেলা হয়েছে।');
      await loadData();
    } else {
      setErrorMessage(res.error || 'অ্যাকাউন্ট ডিলিট করা যায়নি।');
    }
  };

  // Assign asset to account
  const handleAssignAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const targetAsset = assets.find((a) => a.id === selectedAssetId);
    if (!targetAsset) {
      setErrorMessage('একটি এসেট নির্বাচন করুন।');
      return;
    }
    if (!targetAssignAccountId) {
      setErrorMessage('টার্গেট অ্যাকাউন্ট নির্বাচন করুন।');
      return;
    }

    const res = await assignAssetToAccount(targetAssignAccountId, targetAsset, {
      gigTier: fiverrGigTier,
      customPriceUsd,
    });

    if (!res.success) {
      setErrorMessage(res.error || 'এসেট যুক্ত করা যায়নি।');
      return;
    }

    setShowAssignAssetModal(false);
    setSelectedAssetId('');
    triggerSuccess('এসেট সফলভাবে অ্যাকাউন্টে অ্যাসাইন করা হয়েছে এবং প্যাকেজ প্রস্তুত হয়েছে।');
    await loadData();
  };

  // Status transition
  const handleUpdateWorkflowStatus = async (
    assignmentId: string,
    newStatus: AssetWorkflowStatus
  ) => {
    if (!statusUpdateEvidence.trim()) {
      alert('স্ট্যাটাস পরিবর্তনের জন্য বাস্তব প্রমাণ বা রেফারেন্স নোট (Evidence Note) লেখা বাধ্যতামূলক।');
      return;
    }

    const res = await updateAssignmentWorkflowStatus(
      assignmentId,
      newStatus,
      statusUpdateEvidence,
      statusUpdateOperatorNote
    );

    if (res.success && res.assignment) {
      setViewingAssignment(res.assignment);
      setStatusUpdateEvidence('');
      setStatusUpdateOperatorNote('');
      triggerSuccess(`স্ট্যাটাস সফলভাবে '${newStatus}'-এ আপডেট হয়েছে।`);
      await loadData();
    } else {
      setErrorMessage(res.error || 'স্ট্যাটাস আপডেট ব্যর্থ হয়েছে।');
    }
  };

  // Remove assignment
  const handleRemoveAssignment = async (id: string) => {
    if (!window.confirm('এই অ্যাসাইনমেন্টটি তালিকা থেকে সরিয়ে ফেলতে চান?')) return;
    const res = await removeAssignment(id);
    if (res.success) {
      setViewingAssignment(null);
      triggerSuccess('অ্যাসাইনমেন্ট সরানো হয়েছে।');
      await loadData();
    }
  };

  // Filtered assignments
  const filteredAssignments = assignments.filter((a) => {
    if (selectedAccountId === 'all') return true;
    return a.accountId === selectedAccountId;
  });

  // Calculate platform gate permissibility for modal
  const existingForSelected = accounts.filter((a) => a.platformId === newPlatformId && a.enabled);
  const gateCheck = validateNewAccountPermissibility(newPlatformId, existingForSelected.length);
  const selectedPolicy = PLATFORM_POLICY_REGISTRY[newPlatformId] || PLATFORM_POLICY_REGISTRY['other'];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-950 border border-emerald-800 text-emerald-200 px-4 py-3 rounded-lg shadow-xl text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="bg-rose-950/80 border border-rose-800 text-rose-200 px-4 py-3 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-200 font-semibold px-2"
          >
            বন্ধ করুন
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <UserCheck className="w-4 h-4" />
            <span>Priority 2.4: Professional Account Manager</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100">
            অ্যাকাউন্ট ও সাবমিশন ম্যানেজার (Account Manager)
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl leading-relaxed">
            Adobe Stock ও Fiverr প্ল্যাটফর্মে আপনার প্রোফাইল পরিচালনা করুন। প্রতিটি প্ল্যাটফর্মের অফিসিয়াল নীতিমালা মেনে এসেট বরাদ্দ, প্যাকেজিং ও ম্যানুয়াল সাবমিশন গাইড নিশ্চিত করুন।
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowAddAccountModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন প্রোফাইল যোগ করুন</span>
          </button>
          {accounts.length > 0 && assets.length > 0 && (
            <button
              onClick={() => setShowAssignAssetModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold transition-colors border border-zinc-700"
            >
              <Briefcase className="w-4 h-4 text-emerald-400" />
              <span>এসেট এসাইন করুন</span>
            </button>
          )}
        </div>
      </div>

      {/* Functional Navigation Tabs (Buttons as per frontend-design guidelines) */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-xl max-w-fit">
        <button
          onClick={() => setActiveTab('profiles')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'profiles'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>অ্যাকাউন্ট প্রোফাইল ({accounts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('assignments')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'assignments'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>এসেট ওয়ার্কফ্লো ({assignments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('policies')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'policies'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>প্ল্যাটফর্ম নীতি ও সত্যতা অডিট</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'analytics'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Adobe Sales Analytics (CSV)</span>
        </button>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* TAB 1: ACCOUNTS LISTING */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'profiles' && (
        <div className="space-y-4">
          {accounts.length === 0 ? (
            <div className="p-8 text-center bg-zinc-900/50 border border-zinc-800 rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-full bg-zinc-800/80 flex items-center justify-center mx-auto text-zinc-400">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">কোনো অ্যাকাউন্ট প্রোফাইল নেই</h3>
              <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                আপনার Adobe Stock কন্ট্রিবিউটর আইডি বা Fiverr ফ্রিল্যান্স সেলার প্রোফাইল যোগ করে এসেট সাবমিশন ওয়ার্কফ্লো পরিচালনা শুরু করুন।
              </p>
              <button
                onClick={() => setShowAddAccountModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>প্রথম অ্যাকাউন্ট যোগ করুন</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((acc) => {
                const policy = PLATFORM_POLICY_REGISTRY[acc.platformId] || PLATFORM_POLICY_REGISTRY['other'];
                const isFiverr = acc.platformId === 'fiverr';

                return (
                  <div
                    key={acc.id}
                    className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-3 flex flex-col justify-between hover:border-zinc-700 transition-colors"
                  >
                    <div>
                      {/* Platform header */}
                      <div className="flex items-start justify-between gap-2 border-b border-zinc-800/70 pb-2.5">
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
                            <span>{acc.displayName}</span>
                            {isFiverr ? (
                              <span className="text-[10px] text-emerald-400 font-normal">· Freelance</span>
                            ) : (
                              <span className="text-[10px] text-indigo-400 font-normal">· Stock Agency</span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                            @{acc.accountIdentifier}
                          </div>
                        </div>

                        {/* Truthful Connection Status Label (Clean unboxed text) */}
                        <div className="text-right">
                          <span
                            className={`text-[11px] font-semibold flex items-center gap-1 justify-end ${
                              acc.connectionStatus === 'connected'
                                ? 'text-emerald-400'
                                : acc.connectionStatus === 'action_required'
                                ? 'text-amber-400'
                                : 'text-zinc-400'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {acc.connectionStatus === 'connected'
                              ? 'সংযুক্ত (Connected)'
                              : acc.connectionStatus === 'action_required'
                              ? 'পদক্ষেপ প্রয়োজন'
                              : 'সংযুক্ত নয়'}
                          </span>
                        </div>
                      </div>

                      {/* Policy & Guidance Note */}
                      <p className="text-[11px] text-zinc-400 mt-2.5 leading-relaxed">
                        {acc.statusReasonBn}
                      </p>

                      {/* Capabilities List */}
                      <div className="mt-3 pt-2.5 border-t border-zinc-800/50 space-y-1 text-[11px]">
                        <span className="text-zinc-500 block font-medium">সমর্থিত সক্ষমতা:</span>
                        <div className="text-zinc-300 space-y-0.5">
                          {acc.supportedCapabilities.map((cap) => (
                            <div key={cap} className="flex items-center gap-1.5">
                              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span className="font-mono text-[10px]">
                                {cap.replace(/_/g, ' ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Stats Overview */}
                      <div className="grid grid-cols-4 gap-1 mt-3.5 p-2 bg-zinc-950/70 border border-zinc-800/60 rounded-lg text-center text-[10px]">
                        <div>
                          <div className="text-zinc-500">অ্যাসাইন</div>
                          <div className="font-bold text-zinc-200 mt-0.5">{acc.stats.assignedCount}</div>
                        </div>
                        <div>
                          <div className="text-zinc-500">প্রস্তুত</div>
                          <div className="font-bold text-amber-300 mt-0.5">{acc.stats.preparedCount}</div>
                        </div>
                        <div>
                          <div className="text-zinc-500">জমা</div>
                          <div className="font-bold text-indigo-300 mt-0.5">{acc.stats.submittedCount}</div>
                        </div>
                        <div>
                          <div className="text-zinc-500">প্রকাশিত</div>
                          <div className="font-bold text-emerald-400 mt-0.5">{acc.stats.publishedCount}</div>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-2.5 border-t border-zinc-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {acc.profileUrl && (
                          <a
                            href={acc.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1 text-[11px]"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>প্রোফাইল</span>
                          </a>
                        )}
                        <a
                          href={policy.officialTermsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[11px]"
                        >
                          <Info className="w-3 h-3" />
                          <span>টার্মস</span>
                        </a>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedAccountId(acc.id);
                            setActiveTab('assignments');
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                        >
                          এসেট দেখুন
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(acc.id, acc.displayName)}
                          className="p-1 text-zinc-500 hover:text-rose-400 rounded transition-colors"
                          title="অ্যাকাউন্ট ডিলিট করুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 2: ASSET ASSIGNMENTS & WORKFLOW */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 font-medium">অ্যাকাউন্ট অনুযায়ী ফিল্টার:</span>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1 text-zinc-200 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">সমস্ত অ্যাকাউন্ট ({assignments.length})</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.displayName} ({acc.platformId})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowAssignAssetModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>নতুন এসেট এসাইন করুন</span>
            </button>
          </div>

          {filteredAssignments.length === 0 ? (
            <div className="p-8 text-center bg-zinc-900/50 border border-zinc-800 rounded-2xl space-y-2">
              <Layers className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-xs text-zinc-400">এই ফিল্টারে কোনো এসেট অ্যাসাইনমেন্ট পাওয়া যায়নি।</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAssignments.map((assn) => {
                const targetAsset = assets.find((a) => a.id === assn.assetId);
                const account = accounts.find((a) => a.id === assn.accountId);

                return (
                  <div
                    key={assn.id}
                    className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {targetAsset?.thumbnailUrl ? (
                        <img
                          src={targetAsset.thumbnailUrl}
                          alt={targetAsset.title}
                          className="w-14 h-14 object-cover rounded-lg border border-zinc-700 shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                          <FileText className="w-6 h-6 text-zinc-500" />
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-200 text-sm">
                            {targetAsset?.title || 'শিরোনামহীন এসেট'}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {targetAsset?.dimensions} · {targetAsset?.type}
                          </span>
                        </div>

                        <div className="text-xs text-zinc-400 flex items-center gap-2">
                          <span>টার্গেট: <strong className="text-zinc-200">{account?.displayName || assn.platformId}</strong></span>
                          <span>·</span>
                          <span
                            className={`font-semibold ${
                              assn.workflowStatus === 'confirmed_published'
                                ? 'text-emerald-400'
                                : assn.workflowStatus === 'submitted'
                                ? 'text-indigo-400'
                                : 'text-amber-400'
                            }`}
                          >
                            {assn.workflowStatusLabelBn}
                          </span>
                        </div>

                        <p className="text-[11px] text-zinc-500 line-clamp-1 max-w-xl">
                          {assn.targetPackage.title}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => setViewingAssignment(assn)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1 transition-colors border border-zinc-700"
                      >
                        <span>প্যাকেজ ও চেকলিস্ট</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemoveAssignment(assn.id)}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 rounded transition-colors"
                        title="অ্যাসাইনমেন্ট মুছুন"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 3: PLATFORM POLICIES & TRUTHFULNESS AUDIT */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'policies' && (
        <div className="space-y-4">
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>প্ল্যাটফর্ম কন্ট্রিবিউটর ও ফ্রিল্যান্স নীতিমালা অডিট</span>
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              সিস্টেম কোনো প্ল্যাটফর্মের কৃত্রিম সংযোগ (fake connected state) প্রদর্শন করে না এবং কোনো পাসওয়ার্ড বা কুকি সংরক্ষণ করে না। নিচে অফিসিয়াল ডকুমেন্টেশন এবং স্বয়ংক্রিয়তার আইনি সীমাবদ্ধতা স্পষ্টভাবে দেখানো হলো:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.values(PLATFORM_POLICY_REGISTRY)
              .filter((p) =>
                ['adobe-stock', 'shutterstock', 'freepik', 'dreamstime', 'wirestock', 'fiverr'].includes(
                  p.platformId
                )
              )
              .map((policy) => {
                const auditProfile = getMarketplaceAutoSubmissionAudit(policy.platformId);
                const isAutoPossible = auditProfile.isFullAutoSubmitPossible;

                let classificationBadgeLabel = 'ড্রপ প্যাকেজ (ম্যানুয়াল পোর্টাল)';
                let classificationBadgeClass = 'bg-zinc-800 text-zinc-300 border-zinc-700';

                if (auditProfile.classification === 'ASSISTED_SFTP_STAGING') {
                  classificationBadgeLabel = 'SFTP বাফার (ম্যানুয়াল সাবমিশন আবশ্যক)';
                  classificationBadgeClass = 'bg-amber-950/60 text-amber-300 border-amber-800/60';
                } else if (auditProfile.classification === 'POLICY_BLOCKED') {
                  classificationBadgeLabel = 'পলিসি ব্লকড (বাহ্যিক AI নিষিদ্ধ / এন্টারপ্রাইজ)';
                  classificationBadgeClass = 'bg-rose-950/60 text-rose-300 border-rose-800/60';
                } else if (auditProfile.classification === 'MANUAL_SERVICE_PACKAGE') {
                  classificationBadgeLabel = 'ম্যানুয়াল সার্ভিস ডেলিভারি প্যাকেজ';
                  classificationBadgeClass = 'bg-purple-950/60 text-purple-300 border-purple-800/60';
                }

                return (
                  <div
                    key={policy.platformId}
                    className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-200">{policy.platformName}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {policy.platformType === 'freelance_service' ? 'Freelance Service' : 'Stock Microstock'}
                        </span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${classificationBadgeClass}`}>
                        {classificationBadgeLabel}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="p-2 rounded bg-zinc-950/80 border border-zinc-800/80">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-semibold text-zinc-300">স্বয়ংক্রিয় এপিআই সাবমিশন:</span>
                          <span className="text-rose-400 font-bold">
                            {isAutoPossible ? 'সমর্থিত' : 'অসমর্থিত (ম্যানুয়াল আবশ্যক)'}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          {auditProfile.honestBlockerSummaryBn}
                        </p>
                      </div>

                      <div>
                        <strong className="text-zinc-300 block text-[11px]">মাল্টি-অ্যাকাউন্ট নীতিমালা:</strong>
                        <p className="text-zinc-400 text-[11px] mt-0.5 leading-snug">
                          {policy.multipleAccountsRuleSummaryBn}
                        </p>
                      </div>

                      <div>
                        <strong className="text-zinc-300 block text-[11px]">এআই কন্টেন্ট নীতিমালা:</strong>
                        <p className="text-zinc-400 text-[11px] mt-0.5 leading-snug">
                          {policy.aiContentPolicySummaryBn}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
                        <span className="text-zinc-500">যাচাইয়ের তারিখ: {policy.lastVerifiedAt}</span>
                        <a
                          href={policy.officialTermsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                        >
                          <span>অফিসিয়াল টার্মস</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 4: ADOBE STOCK SALES ANALYTICS & CSV IMPORT */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'analytics' && (
        <AdobeSalesAnalyticsView
          assets={assets}
          onNavigate={onNavigate}
        />
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: ADD ACCOUNT PROFILE */}
      {/* --------------------------------------------------------------------- */}
      {showAddAccountModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-400" />
                <span>নতুন অ্যাকাউন্ট প্রোফাইল যোগ করুন</span>
              </h3>
              <button
                onClick={() => setShowAddAccountModal(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4 text-xs">
              {/* Platform Selector */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">প্ল্যাটফর্ম নির্বাচন করুন:</label>
                <select
                  value={newPlatformId}
                  onChange={(e) => setNewPlatformId(e.target.value as PlatformId)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="adobe-stock">Adobe Stock (Stock Microstock)</option>
                  <option value="fiverr">Fiverr (Freelance Services & Gigs)</option>
                  <option value="freepik">Freepik (Stock Assets)</option>
                  <option value="wirestock">Wirestock (Syndication)</option>
                  <option value="dreamstime">Dreamstime (Stock Agency)</option>
                  <option value="shutterstock">Shutterstock (Internal AI only)</option>
                </select>
              </div>

              {/* Platform Policy Warning Gate */}
              {!gateCheck.allowed ? (
                <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[11px]">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>পলিসি বাধা: একাধিক প্রোফাইল নিষিদ্ধ</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-rose-300">
                    {gateCheck.reasonBn}
                  </p>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800 text-zinc-400 space-y-1 text-[11px]">
                  <span className="text-zinc-300 font-semibold block">প্ল্যাটফর্ম নীতিমালা সারসংক্ষেপ:</span>
                  <p>{selectedPolicy.multipleAccountsRuleSummaryBn}</p>
                </div>
              )}

              {/* Profile Name */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">
                  প্রদর্শন নাম (Display Name):
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: My Studio Stock বা Pro AI Visuals"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Account Identifier (Public Username) */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">
                  ইউজারনেম বা আইডি (Public Identifier):
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: your_fiverr_username বা adobe_contributor_id"
                  value={newAccountIdentifier}
                  onChange={(e) => setNewAccountIdentifier(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  নিরাপত্তা নিশ্চয়তা: কোনো প্রকার পাসওয়ার্ড, এপিআই কি বা সেশন টোকেন এখানে ইনপুট দেওয়া নিষিদ্ধ ও অপ্রয়োজনীয়।
                </span>
              </div>

              {/* Profile URL */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">
                  প্রোফাইল লিংক (ঐচ্ছিক):
                </label>
                <input
                  type="url"
                  placeholder="https://fiverr.com/your_profile বা stock.adobe.com/contributor/..."
                  value={newProfileUrl}
                  onChange={(e) => setNewProfileUrl(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">নোট বা কাজের ক্ষেত্র:</label>
                <textarea
                  rows={2}
                  placeholder="যেমন: AI Concept Art & Game Illustration ফোকাস..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  className="px-3.5 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={!gateCheck.allowed}
                  className={`px-4 py-2 rounded-lg font-semibold text-white transition-colors ${
                    gateCheck.allowed
                      ? 'bg-indigo-600 hover:bg-indigo-500'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  প্রোফাইল সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: ASSIGN ASSET TO ACCOUNT */}
      {/* --------------------------------------------------------------------- */}
      {showAssignAssetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-400" />
                <span>অ্যাকাউন্টে এসেট এসাইন করুন</span>
              </h3>
              <button
                onClick={() => setShowAssignAssetModal(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignAsset} className="space-y-4 text-xs">
              {/* Asset Select */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">এসেট নির্বাচন করুন:</label>
                <select
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">-- এসেট বাছাই করুন ({assets.length}টি উপলব্ধ) --</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} ({a.type}, {a.dimensions || 'HD'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Account Select */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">টার্গেট অ্যাকাউন্ট:</label>
                <select
                  value={targetAssignAccountId}
                  onChange={(e) => setTargetAssignAccountId(e.target.value)}
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">-- অ্যাকাউন্ট বাছাই করুন --</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.displayName} ({acc.platformId})
                    </option>
                  ))}
                </select>
              </div>

              {/* Conditional Fiverr Configuration */}
              {accounts.find((a) => a.id === targetAssignAccountId)?.platformId === 'fiverr' && (
                <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-3">
                  <span className="font-semibold text-emerald-400 block text-[11px]">
                    Fiverr গিগ কনফিগারেশন:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-zinc-400 text-[10px] mb-1">গিগ প্যাকেজ টিয়ার:</label>
                      <select
                        value={fiverrGigTier}
                        onChange={(e) => setFiverrGigTier(e.target.value as any)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-200"
                      >
                        <option value="basic">Basic ($15)</option>
                        <option value="standard">Standard ($35)</option>
                        <option value="premium">Premium ($75)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-zinc-400 text-[10px] mb-1">প্রস্তাবিত মূল্য ($ USD):</label>
                      <input
                        type="number"
                        min={5}
                        max={500}
                        value={customPriceUsd}
                        onChange={(e) => setCustomPriceUsd(Number(e.target.value))}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-200"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAssignAssetModal(false)}
                  className="px-3.5 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                >
                  অ্যাসাইন ও প্রস্তুত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* DRAWER / MODAL: VIEW ASSIGNMENT DETAILS & CHECKLIST */}
      {/* --------------------------------------------------------------------- */}
      {viewingAssignment && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">
                  {viewingAssignment.platformId.toUpperCase()} WORKFLOW PACKAGE
                </span>
                <h3 className="font-bold text-base text-zinc-100 mt-0.5">
                  {viewingAssignment.targetPackage.title}
                </h3>
              </div>
              <button
                onClick={() => setViewingAssignment(null)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status indicator bar */}
            <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">বর্তমান স্ট্যাটাস:</span>
                <span
                  className={`font-bold ${
                    viewingAssignment.workflowStatus === 'confirmed_published'
                      ? 'text-emerald-400'
                      : viewingAssignment.workflowStatus === 'submitted'
                      ? 'text-indigo-400'
                      : 'text-amber-400'
                  }`}
                >
                  {viewingAssignment.workflowStatusLabelBn}
                </span>
              </div>

              <div className="text-[10px] text-zinc-500 font-mono">
                Assigned: {new Date(viewingAssignment.assignedAt).toLocaleDateString()}
              </div>
            </div>

            {/* Package Details: Title & Description */}
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-zinc-300">প্রস্তুতকৃত টাইটেল:</span>
                  <button
                    onClick={() => handleCopyText('pkg-title', viewingAssignment.targetPackage.title)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                  >
                    {copiedKey === 'pkg-title' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>কপি টাইটেল</span>
                  </button>
                </div>
                <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 font-mono text-[11px]">
                  {viewingAssignment.targetPackage.title}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-zinc-300">বিবরণ (Description / Gig Scope):</span>
                  <button
                    onClick={() => handleCopyText('pkg-desc', viewingAssignment.targetPackage.description)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                  >
                    {copiedKey === 'pkg-desc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>কপি বিবরণ</span>
                  </button>
                </div>
                <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 whitespace-pre-line text-[11px] max-h-36 overflow-y-auto">
                  {viewingAssignment.targetPackage.description}
                </div>
              </div>

              {/* Keywords / Tags */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-zinc-300">
                    কীওয়ার্ড / ট্যাগসমূহ ({viewingAssignment.targetPackage.keywords.length}টি):
                  </span>
                  <button
                    onClick={() => handleCopyText('pkg-tags', viewingAssignment.targetPackage.keywords.join(', '))}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                  >
                    {copiedKey === 'pkg-tags' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>কমা-সেপারেটেড কপি</span>
                  </button>
                </div>
                <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-[11px] text-zinc-400 flex flex-wrap gap-1.5">
                  {viewingAssignment.targetPackage.keywords.map((kw, i) => (
                    <span key={i} className="text-zinc-300 font-mono">
                      #{kw}{i < viewingAssignment.targetPackage.keywords.length - 1 ? ' ·' : ''}
                    </span>
                  ))}
                </div>
              </div>

              {/* Verification Checklist */}
              <div className="pt-2 border-t border-zinc-800 space-y-2">
                <span className="font-bold text-zinc-200 block text-[11px]">
                  📋 সাবমিশন চেকলিস্ট ও পলিসি সম্মতি:
                </span>
                <div className="space-y-1.5">
                  {viewingAssignment.targetPackage.checklist.map((item) => (
                    <div
                      key={item.id}
                      className="p-2 bg-zinc-950/70 border border-zinc-800/80 rounded-lg flex items-center justify-between text-[11px]"
                    >
                      <span className="text-zinc-300">{item.labelBn}</span>
                      <span className="text-zinc-500 font-mono text-[10px]">
                        {item.completed ? 'উত্তীর্ণ' : 'যাচাই করুন'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Verifiable Status Transition Form */}
              <div className="pt-3 border-t border-zinc-800 space-y-2 bg-zinc-950/90 p-3 rounded-xl border border-zinc-800">
                <span className="font-bold text-zinc-200 block text-[11px]">
                  🔄 স্ট্যাটাস পরিবর্তন (প্রমাণ আবশ্যক):
                </span>
                <p className="text-[10px] text-zinc-500">
                  সততা নীতি: কোনো এসেটকে প্রমাণ ছাড়া স্বয়ংক্রিয়ভাবে 'Submitted' বা 'Published' করা নিষিদ্ধ। সাবমিশনের বাস্তব রেফারেন্স লিখুন:
                </p>
                <input
                  type="text"
                  placeholder="যেমন: Adobe Contributor পোর্টালে আপলোড সম্পন্ন, ফাইল আইডি #99482..."
                  value={statusUpdateEvidence}
                  onChange={(e) => setStatusUpdateEvidence(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-zinc-200 text-xs focus:outline-none"
                />

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleUpdateWorkflowStatus(viewingAssignment.id, 'submitted')}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
                  >
                    জমা হিসেবে চিহ্নিত করুন (Mark Submitted)
                  </button>
                  <button
                    onClick={() => handleUpdateWorkflowStatus(viewingAssignment.id, 'confirmed_published')}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
                  >
                    প্রকাশিত নিশ্চিত করুন (Mark Published)
                  </button>
                </div>
              </div>

              {/* Chronological History Log */}
              {viewingAssignment.submissionHistory.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="font-semibold text-zinc-400 block text-[10px]">
                    ইতিহাস ও অডিট ট্রেইল (Audit Trail):
                  </span>
                  <div className="space-y-1 max-h-28 overflow-y-auto text-[10px] text-zinc-500 font-mono">
                    {viewingAssignment.submissionHistory.map((h, i) => (
                      <div key={i} className="p-1.5 bg-zinc-950 rounded border border-zinc-800/60">
                        <span className="text-zinc-400 font-bold">{h.toStatus}</span> ·{' '}
                        <span>{new Date(h.timestamp).toLocaleTimeString()}</span> · {h.evidenceNote}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
