'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { requestPasswordReset } from '@/lib/auth/actions';
import type { FormState } from '@/types/database';

const inputClass =
  'w-full bg-[#0d0d0d] border border-white/10 px-4 py-3 text-sm text-white ' +
  'placeholder:text-white/30 outline-none transition-all ' +
  'focus:border-[#39FF14] focus:shadow-[0_0_0_1px_#39FF14]';

const labelClass = 'block text-xs font-bold uppercase tracking-widest text-white/50 mb-1.5';

export default function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    requestPasswordReset,
    null,
  );

  if (state?.message) {
    return (
      <div className="space-y-5">
        <div className="px-4 py-4 border border-[#39FF14]/30 bg-[#39FF14]/5">
          <p className="text-sm text-[#39FF14]">{state.message}</p>
        </div>
        <p className="text-center text-xs text-white/30">
          <Link href="/auth/login" className="text-[#39FF14] hover:underline">
            Back to log in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="email" className={labelClass}>Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className={inputClass}
        />
      </div>

      {state?.error && (
        <p className="text-sm text-[#FF6600] border border-[#FF6600]/30 bg-[#FF6600]/5 px-4 py-3">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3.5 font-bold uppercase tracking-widest text-black text-sm transition-all disabled:opacity-50"
        style={{ background: '#39FF14', boxShadow: '0 0 20px rgba(57,255,20,0.35)' }}
      >
        {isPending ? 'Sending…' : 'Send Reset Link'}
      </button>

      <p className="text-center text-xs text-white/30">
        Remembered it?{' '}
        <Link href="/auth/login" className="text-[#39FF14] hover:underline">
          Back to log in
        </Link>
      </p>
    </form>
  );
}
