"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { fetchBuyerBillingHistory, type BillingRecord } from '@/lib/billing/fetchBillingHistory';
import { uploadMarketplaceFile } from '@/lib/storage/upload';
import SettingsAlert from '@/components/buyer/settings/SettingsAlert';
import Image from '@/components/RemoteImage';
import Link from 'next/link';

type SettingsTab = 'profile' | 'billing' | 'security' | 'notifications';

type BuyerProfile = {
  id: string;
  full_name: string | null;
  location: string | null;
  bio: string | null;
  avatar_url: string | null;
  email?: string | null;
};

type NotificationPreferences = {
  direct_messages_email: boolean;
  milestones_email: boolean;
  purchases_email: boolean;
  disputes_email: boolean;
  marketing_email: boolean;
};

type MfaFactor = {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
};

type SecurityModal = 'email' | 'password' | 'mfa' | 'delete' | null;

const DEFAULT_PREFERENCES: NotificationPreferences = {
  direct_messages_email: true,
  milestones_email: true,
  purchases_email: true,
  disputes_email: true,
  marketing_email: false,
};

const AVATAR_MAX_BYTES = 10 * 1024 * 1024;
const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

function hasEmailPasswordIdentity(user: User | null) {
  return Boolean(user?.identities?.some((identity) => identity.provider === 'email'));
}

function formatAuthDate(value?: string | null) {
  if (!value) return 'Unknown';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function BuyerSettings() {
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<BuyerProfile>({
    id: '',
    full_name: '',
    location: '',
    bio: '',
    avatar_url: null,
  });
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationPreferences>(DEFAULT_PREFERENCES);

  const [profileSaving, setProfileSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [securitySaving, setSecuritySaving] = useState(false);

  const [profileMessage, setProfileMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [notificationMessage, setNotificationMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [securityMessage, setSecurityMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [securityModal, setSecurityModal] = useState<SecurityModal>(null);
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const [mfaFactors, setMfaFactors] = useState<MfaFactor[]>([]);
  const [mfaEnrollData, setMfaEnrollData] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const [mfaVerifyCode, setMfaVerifyCode] = useState('');

  const emailPasswordUser = hasEmailPasswordIdentity(currentUser);
  const verifiedMfaFactor = mfaFactors.find((factor) => factor.status === 'verified');

  const loadMfaFactors = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) return;
    setMfaFactors((data.totp ?? []) as MfaFactor[]);
  }, []);

  useEffect(() => {
    async function loadSettings() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      setCurrentUser(user);

      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (error) {
        setProfileMessage({ text: 'Failed to load profile.', type: 'error' });
      } else if (data) {
        setProfile({
          id: data.id,
          full_name: data.full_name,
          location: data.location,
          bio: data.bio,
          avatar_url: data.avatar_url,
          email: data.email ?? user.email,
        });
      }

      const history = await fetchBuyerBillingHistory(user.id);
      setBillingRecords(history);

      try {
        const preferencesResponse = await fetch('/api/notification-preferences');
        const preferencesResult = await preferencesResponse.json();
        if (preferencesResponse.ok && preferencesResult.preferences) {
          setNotificationPreferences({
            direct_messages_email: preferencesResult.preferences.direct_messages_email,
            milestones_email: preferencesResult.preferences.milestones_email,
            purchases_email: preferencesResult.preferences.purchases_email,
            disputes_email: preferencesResult.preferences.disputes_email,
            marketing_email: preferencesResult.preferences.marketing_email,
          });
        }
      } catch {
        setNotificationMessage({ text: 'Failed to load notification preferences.', type: 'error' });
      }

      await loadMfaFactors();
      setLoading(false);
    }

    loadSettings();
  }, [router, loadMfaFactors]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const trimmedName = profile.full_name?.trim() ?? '';
    if (!trimmedName) {
      setProfileMessage({ text: 'Full name is required.', type: 'error' });
      return;
    }

    setProfileSaving(true);
    setProfileMessage(null);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: trimmedName,
        location: profile.location?.trim() || null,
        bio: profile.bio?.trim() || null,
      })
      .eq('id', currentUser.id);

    if (error) {
      setProfileMessage({ text: error.message || 'Failed to update profile.', type: 'error' });
    } else {
      setProfile((prev) => ({ ...prev, full_name: trimmedName }));
      setProfileMessage({ text: 'Profile updated successfully.', type: 'success' });
    }
    setProfileSaving(false);
  };

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !currentUser) return;

    if (!AVATAR_TYPES.includes(file.type)) {
      setProfileMessage({ text: 'Avatar must be JPG, PNG, or GIF.', type: 'error' });
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setProfileMessage({ text: 'Avatar must be 10MB or smaller.', type: 'error' });
      return;
    }

    setAvatarUploading(true);
    setProfileMessage(null);

    try {
      const publicUrl = await uploadMarketplaceFile(currentUser.id, 'avatars', file);
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', currentUser.id);

      if (error) throw error;

      setProfile((prev) => ({ ...prev, avatar_url: publicUrl }));
      setProfileMessage({ text: 'Avatar updated successfully.', type: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to upload avatar.';
      setProfileMessage({ text: message, type: 'error' });
    } finally {
      setAvatarUploading(false);
    }
  };

  const updateNotificationPreference = async (
    key: keyof NotificationPreferences,
    value: boolean
  ) => {
    const previous = notificationPreferences;
    const nextPreferences = { ...notificationPreferences, [key]: value };
    setNotificationPreferences(nextPreferences);
    setPreferencesSaving(true);
    setNotificationMessage(null);

    try {
      const response = await fetch('/api/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextPreferences),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update notification preferences');
      setNotificationMessage({ text: 'Notification preferences saved.', type: 'success' });
    } catch (error: unknown) {
      setNotificationPreferences(previous);
      setNotificationMessage({
        text: error instanceof Error ? error.message : 'Failed to update notification preferences',
        type: 'error',
      });
    } finally {
      setPreferencesSaving(false);
    }
  };

  const closeSecurityModal = () => {
    setSecurityModal(null);
    setNewEmail('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setDeleteConfirmation('');
    setMfaEnrollData(null);
    setMfaVerifyCode('');
  };

  const reauthenticate = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error('Current password is incorrect.');
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.email) return;

    const trimmedEmail = newEmail.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setSecurityMessage({ text: 'Enter a valid email address.', type: 'error' });
      return;
    }
    if (newEmail.trim().toLowerCase() === currentUser.email.toLowerCase()) {
      setSecurityMessage({ text: 'Enter a different email address.', type: 'error' });
      return;
    }
    if (!currentPassword) {
      setSecurityMessage({ text: 'Current password is required.', type: 'error' });
      return;
    }

    setSecuritySaving(true);
    setSecurityMessage(null);

    try {
      await reauthenticate(currentUser.email, currentPassword);
      const { error } = await supabase.auth.updateUser({ email: trimmedEmail });
      if (error) throw error;

      await supabase.from('profiles').update({ email: trimmedEmail }).eq('id', currentUser.id);
      setSecurityMessage({
        text: 'Confirmation sent to your new email. Verify it to complete the change.',
        type: 'success',
      });
      closeSecurityModal();
    } catch (error: unknown) {
      setSecurityMessage({
        text: error instanceof Error ? error.message : 'Failed to update email.',
        type: 'error',
      });
    } finally {
      setSecuritySaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.email) return;

    if (newPassword.length < 8) {
      setSecurityMessage({ text: 'Password must be at least 8 characters.', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityMessage({ text: 'New passwords do not match.', type: 'error' });
      return;
    }
    if (!currentPassword) {
      setSecurityMessage({ text: 'Current password is required.', type: 'error' });
      return;
    }

    setSecuritySaving(true);
    setSecurityMessage(null);

    try {
      await reauthenticate(currentUser.email, currentPassword);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setSecurityMessage({ text: 'Password updated successfully.', type: 'success' });
      closeSecurityModal();
    } catch (error: unknown) {
      setSecurityMessage({
        text: error instanceof Error ? error.message : 'Failed to update password.',
        type: 'error',
      });
    } finally {
      setSecuritySaving(false);
    }
  };

  const handleStartMfaEnroll = async () => {
    setSecuritySaving(true);
    setSecurityMessage(null);

    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator app',
      });
      if (error) throw error;
      if (!data?.id || !data.totp?.qr_code) throw new Error('Unable to start 2FA enrollment.');

      setMfaEnrollData({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
      setSecurityModal('mfa');
    } catch (error: unknown) {
      setSecurityMessage({
        text: error instanceof Error ? error.message : 'Failed to start 2FA setup.',
        type: 'error',
      });
    } finally {
      setSecuritySaving(false);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaEnrollData) return;

    const code = mfaVerifyCode.trim();
    if (code.length !== 6) {
      setSecurityMessage({ text: 'Enter the 6-digit code from your authenticator app.', type: 'error' });
      return;
    }

    setSecuritySaving(true);
    setSecurityMessage(null);

    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: mfaEnrollData.factorId,
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaEnrollData.factorId,
        challengeId: challengeData.id,
        code,
      });
      if (verifyError) throw verifyError;

      await loadMfaFactors();
      setSecurityMessage({ text: 'Two-factor authentication enabled.', type: 'success' });
      closeSecurityModal();
    } catch (error: unknown) {
      setSecurityMessage({
        text: error instanceof Error ? error.message : 'Invalid verification code.',
        type: 'error',
      });
    } finally {
      setSecuritySaving(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!verifiedMfaFactor) return;
    if (!window.confirm('Disable two-factor authentication on this account?')) return;

    setSecuritySaving(true);
    setSecurityMessage(null);

    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: verifiedMfaFactor.id });
      if (error) throw error;
      await loadMfaFactors();
      setSecurityMessage({ text: 'Two-factor authentication disabled.', type: 'success' });
    } catch (error: unknown) {
      setSecurityMessage({
        text: error instanceof Error ? error.message : 'Failed to disable 2FA.',
        type: 'error',
      });
    } finally {
      setSecuritySaving(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmation !== 'DELETE') {
      setSecurityMessage({ text: 'Type DELETE to confirm account removal.', type: 'error' });
      return;
    }

    setSecuritySaving(true);
    setSecurityMessage(null);

    try {
      const response = await fetch('/api/account/delete', { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to delete account');

      await supabase.auth.signOut();
      router.push('/');
    } catch (error: unknown) {
      setSecurityMessage({
        text: error instanceof Error ? error.message : 'Failed to delete account.',
        type: 'error',
      });
    } finally {
      setSecuritySaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-black uppercase tracking-widest text-xs text-slate-400 animate-pulse">
        Loading Configuration...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-20 overflow-x-hidden">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <Link
            href="/buyer/dashboard"
            className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 mb-2 inline-flex items-center gap-1 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Account Settings</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Manage your enterprise profile, billing methods, and security preferences.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full flex flex-col lg:flex-row gap-6 lg:gap-12 animate-in fade-in duration-500 min-w-0">
        <aside className="w-full lg:w-64 shrink-0 min-w-0">
          <nav className="flex flex-row lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 lg:overflow-visible lg:sticky lg:top-24 scrollbar-hide -mx-1 px-1 lg:mx-0 lg:px-0">
            {(
              [
                ['profile', 'Profile Identity'],
                ['billing', 'Billing & Tax'],
                ['security', 'Security & Auth'],
                ['notifications', 'Notifications'],
              ] as const
            ).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 text-left px-4 py-3 min-h-[44px] rounded-xl text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex-1 min-w-0">
          {activeTab === 'profile' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                <h2 className="text-lg font-black text-slate-900 mb-6">General Information</h2>
                {profileMessage && <SettingsAlert message={profileMessage.text} type={profileMessage.type} />}

                <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-100">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 relative border border-slate-200 shadow-sm flex items-center justify-center">
                    {profile.avatar_url ? (
                      <Image src={profile.avatar_url} fill sizes="80px" className="object-cover" alt="Profile" />
                    ) : (
                      <span className="text-slate-400 text-xl font-bold">
                        {profile.full_name?.charAt(0) || '?'}
                      </span>
                    )}
                  </div>
                  <div>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif"
                      className="hidden"
                      onChange={handleAvatarSelect}
                    />
                    <button
                      type="button"
                      disabled={avatarUploading}
                      onClick={() => avatarInputRef.current?.click()}
                      className="bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm mb-2 block"
                    >
                      {avatarUploading ? 'Uploading...' : 'Change Avatar'}
                    </button>
                    <p className="text-[10px] font-bold text-slate-400">JPG, GIF or PNG. Max size 10MB.</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={profile.full_name || ''}
                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                        Location / Timezone
                      </label>
                      <input
                        type="text"
                        value={profile.location || ''}
                        onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                        placeholder="e.g., San Francisco, CA"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                      Company Bio / Description
                    </label>
                    <textarea
                      rows={4}
                      value={profile.bio || ''}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 transition-colors resize-none"
                    />
                  </div>
                  <div className="pt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={profileSaving}
                      className="bg-slate-900 hover:bg-blue-600 disabled:opacity-50 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-md"
                    >
                      {profileSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                <h2 className="text-lg font-black text-slate-900 mb-2">Payment Methods</h2>
                <p className="text-sm text-slate-500 font-medium mb-6">
                  Payments are processed securely via Razorpay at checkout. Card details are not stored on Zelance.
                </p>
                <Link
                  href="/buyer/billing"
                  className="inline-flex bg-slate-900 hover:bg-blue-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                >
                  View Full Billing & Invoices
                </Link>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                <h2 className="text-lg font-black text-slate-900 mb-6">Billing History</h2>
                {billingRecords.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      No past invoices found.
                    </p>
                    <p className="text-sm text-slate-400 font-medium mt-2">
                      Your history will appear here after your first purchase.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {billingRecords.slice(0, 5).map((record) => (
                      <div key={record.id} className="py-4 flex justify-between items-center gap-4">
                        <div>
                          <p className="text-sm font-black text-slate-900">{record.description}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            {new Date(record.date).toLocaleDateString()} · {record.status}
                          </p>
                        </div>
                        <p className="text-sm font-black text-slate-900 shrink-0">
                          ${record.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                <h2 className="text-lg font-black text-slate-900 mb-6">Security & Authentication</h2>
                {securityMessage && <SettingsAlert message={securityMessage.text} type={securityMessage.type} />}

                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 border-b border-slate-100">
                    <div>
                      <p className="text-sm font-black text-slate-900">Email Address</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {currentUser?.email}
                      </p>
                      {!emailPasswordUser && (
                        <p className="text-xs font-medium text-slate-500 mt-1">Managed by your linked sign-in provider.</p>
                      )}
                    </div>
                    {emailPasswordUser ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSecurityMessage(null);
                          setSecurityModal('email');
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors w-max"
                      >
                        Change Email
                      </button>
                    ) : null}
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 border-b border-slate-100">
                    <div>
                      <p className="text-sm font-black text-slate-900">Password</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {emailPasswordUser
                          ? `Last updated: ${formatAuthDate(currentUser?.updated_at)}`
                          : 'Not applicable for social sign-in'}
                      </p>
                    </div>
                    {emailPasswordUser ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSecurityMessage(null);
                          setSecurityModal('password');
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors w-max"
                      >
                        Update Password
                      </button>
                    ) : null}
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4">
                    <div>
                      <p className="text-sm font-black text-slate-900 flex items-center gap-2">
                        Two-Factor Authentication
                        {!verifiedMfaFactor && (
                          <span className="bg-green-100 text-green-700 text-[8px] px-2 py-0.5 rounded uppercase tracking-widest">
                            Recommended
                          </span>
                        )}
                        {verifiedMfaFactor && (
                          <span className="bg-emerald-100 text-emerald-700 text-[8px] px-2 py-0.5 rounded uppercase tracking-widest">
                            Enabled
                          </span>
                        )}
                      </p>
                      <p className="text-xs font-medium text-slate-500 mt-1 max-w-sm">
                        Add an extra layer of security to your account by requiring a code from an authenticator app.
                      </p>
                    </div>
                    {verifiedMfaFactor ? (
                      <button
                        type="button"
                        disabled={securitySaving}
                        onClick={handleDisableMfa}
                        className="bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors w-max"
                      >
                        Disable 2FA
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={securitySaving}
                        onClick={handleStartMfaEnroll}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm w-max"
                      >
                        Enable 2FA
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 shadow-sm">
                <h2 className="text-lg font-black text-rose-900 mb-2">Danger Zone</h2>
                <p className="text-xs font-medium text-rose-700 mb-6">
                  Permanently delete your account, active projects, and purchased AI Solution licenses. This action cannot be
                  undone.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSecurityMessage(null);
                    setSecurityModal('delete');
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-colors"
                >
                  Delete Account
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                <h2 className="text-lg font-black text-slate-900 mb-6">Notification Preferences</h2>
                {notificationMessage && (
                  <SettingsAlert message={notificationMessage.text} type={notificationMessage.type} />
                )}

                <div className="space-y-6">
                  {(
                    [
                      ['direct_messages_email', 'Direct Messages', 'Receive an email when a freelancer messages you.'],
                      [
                        'milestones_email',
                        'Milestone & Escrow Alerts',
                        'Critical alerts for funded, completed, or disputed milestones.',
                      ],
                      [
                        'purchases_email',
                        'Purchases & Receipts',
                        'AI Solution purchases, service purchases, invoices, and receipts.',
                      ],
                      ['disputes_email', 'Dispute Updates', 'Formal dispute events, evidence requests, and resolutions.'],
                      [
                        'marketing_email',
                        'Product Updates & Marketing',
                        'Receive news about new features and top AI experts.',
                      ],
                    ] as const
                  ).map(([key, title, description], index, items) => (
                    <div
                      key={key}
                      className={`flex justify-between items-center ${
                        index < items.length - 1 ? 'pb-6 border-b border-slate-100' : ''
                      }`}
                    >
                      <div>
                        <p className="text-sm font-black text-slate-900">{title}</p>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">{description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={notificationPreferences[key]}
                          disabled={preferencesSaving}
                          onChange={(e) => updateNotificationPreference(key, e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {securityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            {securityModal === 'email' && (
              <>
                <h3 className="text-lg font-black text-slate-900 mb-2">Change Email</h3>
                <p className="text-sm text-slate-500 font-medium mb-6">
                  A confirmation link will be sent to your new email address.
                </p>
                <form onSubmit={handleChangeEmail} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                      New Email
                    </label>
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                      Current Password
                    </label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeSecurityModal}
                      className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={securitySaving}
                      className="bg-slate-900 hover:bg-blue-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest"
                    >
                      {securitySaving ? 'Saving...' : 'Update Email'}
                    </button>
                  </div>
                </form>
              </>
            )}

            {securityModal === 'password' && (
              <>
                <h3 className="text-lg font-black text-slate-900 mb-2">Update Password</h3>
                <p className="text-sm text-slate-500 font-medium mb-6">Use at least 8 characters.</p>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                      Current Password
                    </label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeSecurityModal}
                      className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={securitySaving}
                      className="bg-slate-900 hover:bg-blue-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest"
                    >
                      {securitySaving ? 'Saving...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </>
            )}

            {securityModal === 'mfa' && mfaEnrollData && (
              <>
                <h3 className="text-lg font-black text-slate-900 mb-2">Enable Two-Factor Authentication</h3>
                <p className="text-sm text-slate-500 font-medium mb-4">
                  Scan this QR code with your authenticator app, then enter the 6-digit code.
                </p>
                <div className="mx-auto mb-4 flex h-44 w-44 items-center justify-center rounded-2xl border border-slate-200 bg-white p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mfaEnrollData.qrCode}
                    alt="Scan to set up authenticator app"
                    className="h-full w-full object-contain"
                  />
                </div>
                <p className="mb-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Manual key: {mfaEnrollData.secret}
                </p>
                <form onSubmit={handleVerifyMfa} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      required
                      value={mfaVerifyCode}
                      onChange={(e) => setMfaVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 text-center tracking-[0.3em]"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeSecurityModal}
                      className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={securitySaving}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest"
                    >
                      {securitySaving ? 'Verifying...' : 'Verify & Enable'}
                    </button>
                  </div>
                </form>
              </>
            )}

            {securityModal === 'delete' && (
              <>
                <h3 className="text-lg font-black text-rose-900 mb-2">Delete Account</h3>
                <p className="text-sm text-rose-700 font-medium mb-6">
                  This permanently removes your account and associated data. Type DELETE to confirm.
                </p>
                <form onSubmit={handleDeleteAccount} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                      Confirmation
                    </label>
                    <input
                      type="text"
                      required
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      placeholder="DELETE"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-rose-500"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeSecurityModal}
                      className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={securitySaving}
                      className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest"
                    >
                      {securitySaving ? 'Deleting...' : 'Delete Account'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
