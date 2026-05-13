'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const inputClass =
  'w-full bg-[#0d0d0d] border border-white/10 px-4 py-3 text-sm text-white ' +
  'placeholder:text-white/30 outline-none transition-all ' +
  'focus:border-[#39FF14] focus:shadow-[0_0_0_1px_#39FF14]';

const labelClass = 'block text-xs font-bold uppercase tracking-widest text-white/50 mb-1.5';

type Stage = 'exchanging' | 'ready' | 'success' | 'error';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const supabase     = createClient();

  const [stage, setStage]       = useState<Stage>('exchanging');
  const [stageError, setStageError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [formError, setFormError] = useState('');
  const [isPending, setIsPending] = useState(false);

  // Exchange the one-time code from the email link for a live session
  useEffect(() => {
    const code = searchParams.get('code');

    if (!code) {
      setStageError('Invalid or missing reset link. Please request a new one.');
      setStage('error');
      return;
    }

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setStageError('This reset link has expired or already been used. Please request a new one.');
        setStage('error');
      } else {
        setStage('ready');
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setFormError('Passwords do not match.');
      return;
    }

    setIsPending(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsPending(false);

    if (error) {
      setFormError(error.message);
    } else {
      setStage('success');
      setTimeout(() => router.push('/auth/login'), 3000);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1
          className="text-3xl md:text-4xl text-white mb-2"
          style={{ fontFamily: 'var(--font-anton)', textTransform: 'uppercase', letterSpacing: '0.04em' }}
        >
          New Password
        </h1>
        <p className="text-white/40 text-sm">Choose a new password for your account.</p>
      </div>

      <div className="h-px mb-8" style={{ background: 'linear-gradient(90deg, transparent, #39FF14 50%, transparent)' }} />

      <div className="bg-[#0a0a0a] border border-white/10 p-8">

        {stage === 'exchanging' && (
          <p className="text-sm text-white/40 text-center animate-pulse">Verifying reset link…</p>
        )}

        {stage === 'error' && (
          <div className="space-y-5">
            <div className="px-4 py-4 border border-[#FF6600]/30 bg-[#FF6600]/5">
              <p className="text-sm text-[#FF6600]">{stageError}</p>
            </div>
            <p className="text-center text-xs text-white/30">
              <Link href="/auth/forgot-password" className="text-[#39FF14] hover:underline">
                Request a new reset link
              </Link>
            </p>
          </div>
        )}

        {stage === 'success' && (
          <div className="space-y-5">
            <div className="px-4 py-4 border border-[#39FF14]/30 bg-[#39FF14]/5">
              <p className="text-sm text-[#39FF14]">
                Password updated. Redirecting you to log in…
              </p>
            </div>
          </div>
        )}

        {stage === 'ready' && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="password" className={labelClass}>New Password</label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="confirm" className={labelClass}>Confirm Password</label>
              <input
                id="confirm"
                type="password"
                required
                placeholder="Repeat your new password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className={inputClass}
              />
            </div>

            {formError && (
              <p className="text-sm text-[#FF6600] border border-[#FF6600]/30 bg-[#FF6600]/5 px-4 py-3">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3.5 font-bold uppercase tracking-widest text-black text-sm transition-all disabled:opacity-50"
              style={{ background: '#39FF14', boxShadow: '0 0 20px rgba(57,255,20,0.35)' }}
            >
              {isPending ? 'Updating…' : 'Set New Password'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
