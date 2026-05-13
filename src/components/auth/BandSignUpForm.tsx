'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { signUpBand } from '@/lib/auth/actions';
import GenreCheckboxes from '@/components/GenreCheckboxes';
import type { FormState } from '@/types/database';

const inputClass =
  'w-full bg-[#0d0d0d] border border-white/10 px-4 py-3 text-sm text-white ' +
  'placeholder:text-white/30 outline-none transition-all ' +
  'focus:border-[#39FF14] focus:shadow-[0_0_0_1px_#39FF14]';

const labelClass = 'block text-xs font-bold uppercase tracking-widest text-white/50 mb-1.5';

export default function BandSignUpForm() {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    signUpBand,
    null,
  );

  const [genres, setGenres] = useState<string[]>([]);

  return (
    <form action={formAction} className="space-y-5">

      {/* Band name */}
      <div>
        <label htmlFor="display_name" className={labelClass}>Band Name</label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          required
          placeholder="Your band name"
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
          placeholder="band@example.com"
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

      {/* Genres */}
      <div>
        <label className={labelClass}>
          Genres
          <span className="ml-2 normal-case text-white/30 tracking-normal font-normal">
            — select all that apply
          </span>
        </label>
        <GenreCheckboxes selected={genres} onChange={setGenres} />
      </div>

      {/* Social links */}
      <fieldset>
        <legend className={`${labelClass} mb-3`}>
          Social Links
          <span className="ml-2 normal-case text-white/30 tracking-normal font-normal">
            (at least one required)
          </span>
        </legend>
        <div className="space-y-3">
          {[
            { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourband' },
            { key: 'spotify',   label: 'Spotify',   placeholder: 'https://open.spotify.com/artist/…' },
            { key: 'facebook',  label: 'Facebook',  placeholder: 'https://facebook.com/yourband' },
            { key: 'website',   label: 'Website',   placeholder: 'https://yourband.com' },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="w-20 text-xs font-bold uppercase tracking-wider text-white/40 shrink-0">
                {label}
              </span>
              <input
                name={`social_${key}`}
                type="url"
                placeholder={placeholder}
                className={`${inputClass} flex-1`}
              />
            </div>
          ))}
        </div>
      </fieldset>

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
        style={{ background: '#39FF14', boxShadow: '0 0 20px rgba(57,255,20,0.35)' }}
      >
        {isPending ? 'Creating account…' : 'Create Band Account'}
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
