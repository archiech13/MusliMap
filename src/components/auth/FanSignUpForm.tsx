'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { signUpFan } from '@/lib/auth/actions';
import LocationSearch from './LocationSearch';
import type { FormState } from '@/types/database';

const inputClass =
  'w-full bg-[#0d0d0d] border border-white/10 px-4 py-3 text-sm text-white ' +
  'placeholder:text-white/30 outline-none transition-all ' +
  'focus:border-[#39FF14] focus:shadow-[0_0_0_1px_#39FF14]';

const labelClass = 'block text-xs font-bold uppercase tracking-widest text-white/50 mb-1.5';

export default function FanSignUpForm() {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    signUpFan,
    null,
  );

  const [location, setLocation] = useState<{
    name: string;
    lat: number;
    lng: number;
  } | null>(null);

  return (
    <form action={formAction} className="space-y-5">

      {/* Display name */}
      <div>
        <label htmlFor="display_name" className={labelClass}>Display Name</label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          required
          placeholder="How should we call you?"
          className={inputClass}
        />
      </div>

      {/* Email */}
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

      {/* Password */}
      <div>
        <label htmlFor="password" className={labelClass}>Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Minimum 8 characters"
          className={inputClass}
        />
      </div>

      {/* Home location */}
      <div>
        <label className={labelClass}>
          Home Location
          <span className="ml-2 normal-case text-white/30 tracking-normal font-normal">
            (optional — used for gig alerts)
          </span>
        </label>
        <LocationSearch
          onSelect={place => setLocation(place)}
        />
        {/* Hidden inputs carry the values through the form submission */}
        <input type="hidden" name="home_lat"          value={location?.lat ?? ''} />
        <input type="hidden" name="home_lng"          value={location?.lng ?? ''} />
        <input type="hidden" name="home_location_name" value={location?.name ?? ''} />
        {location && (
          <p className="mt-1.5 text-xs text-[#39FF14]/70">{location.name}</p>
        )}
      </div>

      {/* Feedback */}
      {state?.error && (
        <p className="text-sm text-[#FF6600] border border-[#FF6600]/30 bg-[#FF6600]/5 px-4 py-3">
          {state.error}
        </p>
      )}
      {state?.message && (
        <p className="text-sm text-[#39FF14] border border-[#39FF14]/30 bg-[#39FF14]/5 px-4 py-3">
          {state.message}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3.5 font-bold uppercase tracking-widest text-black text-sm transition-all disabled:opacity-50"
        style={{
          background: '#39FF14',
          boxShadow: '0 0 20px rgba(57,255,20,0.35)',
        }}
      >
        {isPending ? 'Creating account…' : 'Create Fan Account'}
      </button>

      <p className="text-center text-xs text-white/40">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-[#39FF14] hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
