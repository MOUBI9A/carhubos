"use client";

import React, { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  MailCheck,
  MailWarning,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  LogOut,
  Clock,
  Sparkles,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useToast } from '@/lib/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { user, refreshUser, logout } = useAuth();
  const { showToast } = useToast();

  const [status, setStatus] = useState<
    'IDLE' | 'VERIFYING' | 'SUCCESS' | 'ALREADY_VERIFIED' | 'EXPIRED' | 'INVALID'
  >('IDLE');
  const [errorMessage, setErrorMessage] = useState('');
  const [emailInput, setEmailInput] = useState(user?.email || '');
  const [cooldown, setCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const verificationAttemptedRef = useRef(false);

  // Sync email from auth user if loaded later
  useEffect(() => {
    if (user?.email && !emailInput) {
      setEmailInput(user.email);
    }
  }, [user, emailInput]);

  // Handle countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // If a token was supplied in the URL query, verify it immediately
  useEffect(() => {
    if (!token || verificationAttemptedRef.current) return;
    verificationAttemptedRef.current = true;

    let isMounted = true;
    const verifyToken = async () => {
      setStatus('VERIFYING');
      try {
        const { data } = await api.post('/auth/verify-email', { token });
        if (!isMounted) return;

        if (data.verified || data.alreadyVerified) {
          setStatus(data.alreadyVerified ? 'ALREADY_VERIFIED' : 'SUCCESS');
          showToast('success', 'Email Verified', 'Your account has been successfully verified.');
          await refreshUser();
          setTimeout(() => {
            if (data.nextStep === 'ONBOARDING' || user?.role === 'OWNER') {
              router.push('/onboarding');
            } else {
              router.push('/dashboard');
            }
          }, 1800);
        }
      } catch (err: any) {
        if (!isMounted) return;
        const errData = err?.response?.data;
        const code = errData?.code;
        const msg = errData?.message || 'Verification failed.';

        if (code === 'ALREADY_VERIFIED') {
          setStatus('ALREADY_VERIFIED');
          refreshUser();
        } else if (code === 'TOKEN_EXPIRED') {
          setStatus('EXPIRED');
          setErrorMessage('This verification link has expired (links expire after 24 hours).');
        } else {
          setStatus('INVALID');
          setErrorMessage(msg || 'This verification link is invalid or has already been used.');
        }
      }
    };

    verifyToken();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Handle resend verification link
  const handleResend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (cooldown > 0 || isResending) return;

    const targetEmail = emailInput.trim() || user?.email;
    if (!targetEmail) {
      showToast('danger', 'Email Required', 'Please enter your account email to resend.');
      return;
    }

    setIsResending(true);
    setResendSuccess(false);

    try {
      const { data } = await api.post('/auth/resend-verification', {
        email: targetEmail,
      });

      if (data.alreadyVerified) {
        setStatus('ALREADY_VERIFIED');
        showToast('info', 'Already Verified', 'Your email is already verified.');
        await refreshUser();
        return;
      }

      setCooldown(data.coolDownSeconds || 60);
      setResendSuccess(true);
      showToast(
        'success',
        'Verification Email Sent',
        'Check your inbox and spam folder for the link.',
      );
    } catch (err: any) {
      const errData = err?.response?.data;
      if (errData?.code === 'COOLDOWN_ACTIVE' && errData?.retryAfterSeconds) {
        setCooldown(errData.retryAfterSeconds);
        showToast('warning', 'Cooldown Active', `Please wait ${errData.retryAfterSeconds}s.`);
      } else {
        showToast('danger', 'Error', errData?.message || 'Could not send verification email.');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <div className="absolute top-6 end-6">
        <LocaleSwitcher variant="pills" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-surface border border-hairline rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden"
      >
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -end-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        {/* ── STATE 1: VERIFYING IN PROGRESS ── */}
        {status === 'VERIFYING' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mx-auto flex items-center justify-center mb-6">
              <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            </div>
            <h1 className="font-display text-2xl font-semibold text-foreground tracking-tight">
              Verifying your email…
            </h1>
            <p className="text-sm text-text-muted mt-2 max-w-sm mx-auto">
              Please wait while we confirm your security credentials.
            </p>
          </div>
        )}

        {/* ── STATE 2: VERIFICATION SUCCESS ── */}
        {status === 'SUCCESS' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 mx-auto flex items-center justify-center mb-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Verified & Secured
            </span>
            <h1 className="font-display text-2xl md:text-3xl font-semibold text-foreground tracking-tight">
              Email Verified Successfully!
            </h1>
            <p className="text-sm text-text-muted mt-3 max-w-md mx-auto leading-relaxed">
              Your identity is verified. Setting up your dedicated workspace now…
            </p>
            <div className="mt-8">
              <Button
                variant="primary"
                className="w-full justify-center py-3.5 rounded-xl font-medium"
                onClick={() => router.push(user?.role === 'OWNER' ? '/onboarding' : '/dashboard')}
              >
                <span>Continue to Onboarding</span>
                <ArrowRight className="w-4 h-4 ms-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STATE 3: ALREADY VERIFIED ── */}
        {status === 'ALREADY_VERIFIED' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/25 mx-auto flex items-center justify-center mb-6">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-semibold text-foreground tracking-tight">
              Email Already Verified
            </h1>
            <p className="text-sm text-text-muted mt-3 max-w-md mx-auto leading-relaxed">
              Your account has already been verified. You can proceed directly to your setup.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <Button
                variant="primary"
                className="w-full justify-center py-3.5 rounded-xl font-medium"
                onClick={() => router.push(user?.role === 'OWNER' ? '/onboarding' : '/dashboard')}
              >
                <span>Continue to Setup</span>
                <ArrowRight className="w-4 h-4 ms-2" />
              </Button>
              <Button
                variant="outline"
                className="w-full justify-center py-3.5 rounded-xl"
                onClick={() => router.push('/dashboard')}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        )}

        {/* ── STATE 4: EXPIRED OR INVALID TOKEN ── */}
        {(status === 'EXPIRED' || status === 'INVALID') && (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/25 mx-auto flex items-center justify-center mb-6">
              <MailWarning className="w-8 h-8 text-amber-400" />
            </div>
            <h1 className="font-display text-2xl font-semibold text-foreground tracking-tight">
              {status === 'EXPIRED' ? 'Verification Link Expired' : 'Invalid Verification Link'}
            </h1>
            <p className="text-sm text-text-muted mt-3 max-w-md mx-auto leading-relaxed">
              {errorMessage}
            </p>

            <div className="mt-8 p-5 rounded-2xl bg-surface-raised border border-hairline text-start">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">
                Send a fresh verification link
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="your.email@agency.com"
                  className="flex-1 bg-surface border border-hairline rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-text-faint outline-none focus:border-primary"
                />
                <Button
                  variant="primary"
                  onClick={handleResend}
                  disabled={cooldown > 0 || isResending}
                  className="rounded-xl px-5 py-2.5 font-medium whitespace-nowrap"
                >
                  {isResending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : cooldown > 0 ? (
                    <span className="flex items-center gap-1.5 text-xs">
                      <Clock className="w-3.5 h-3.5" /> {cooldown}s
                    </span>
                  ) : (
                    'Resend Link'
                  )}
                </Button>
              </div>
              {resendSuccess && (
                <p className="text-xs text-emerald-400 mt-2.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Fresh link sent! Please check your inbox.
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => logout()}
                className="inline-flex items-center gap-1.5 text-xs text-text-faint hover:text-foreground transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign in with another account
              </button>
            </div>
          </div>
        )}

        {/* ── STATE 5: DEFAULT WAITING / "CHECK YOUR INBOX" ── */}
        {status === 'IDLE' && (
          <div>
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mx-auto flex items-center justify-center mb-5">
                <MailCheck className="w-8 h-8 text-primary" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-surface-raised text-text-muted border border-hairline mb-3">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Action Required
              </span>
              <h1 className="font-display text-2xl md:text-3xl font-semibold text-foreground tracking-tight">
                Verify Your Email
              </h1>
              <p className="text-sm text-text-muted mt-3 leading-relaxed max-w-sm mx-auto">
                We sent a secure verification link to:
              </p>
              <div className="inline-block mt-2 px-3.5 py-1.5 rounded-lg bg-surface-raised border border-hairline text-sm font-semibold text-foreground">
                {user?.email || emailInput || 'your registered email'}
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-surface-raised/70 border border-hairline text-xs text-text-muted leading-relaxed space-y-2">
                <p>
                  <strong>Why verify?</strong> To protect agency fleet and cross-tenant trust
                  reputation, all agency workspaces must confirm identity before activation.
                </p>
                <p>
                  Please click the link in your email to unlock agency onboarding and dashboard
                  tools. The link is valid for 24 hours.
                </p>
              </div>

              {resendSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Fresh verification email sent. Check spam if not found within 1 minute.</span>
                </div>
              )}

              <div className="pt-2">
                <Button
                  variant="primary"
                  onClick={handleResend}
                  disabled={cooldown > 0 || isResending}
                  className="w-full justify-center py-3.5 rounded-xl font-medium"
                >
                  {isResending ? (
                    <RefreshCw className="w-4 h-4 animate-spin ms-2" />
                  ) : cooldown > 0 ? (
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Resend available in {cooldown}s
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" /> Resend Verification Email
                    </span>
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => refreshUser()}
                  className="text-xs text-text-muted hover:text-foreground transition-colors underline underline-offset-4"
                >
                  I've verified in another tab
                </button>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="inline-flex items-center gap-1.5 text-xs text-text-faint hover:text-foreground transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
