'use client';

import { useActionState, useRef, useState } from 'react';
import { updateBandProfile } from '@/lib/band/actions';
import GenreCheckboxes from '@/components/GenreCheckboxes';
import type { FormState, Profile } from '@/types/database';

const inputClass =
  'w-full bg-[#0d0d0d] border border-white/10 px-4 py-3 text-sm text-white ' +
  'placeholder:text-white/30 outline-none transition-all ' +
  'focus:border-[#39FF14] focus:shadow-[0_0_0_1px_#39FF14]';

const labelClass = 'block text-xs font-bold uppercase tracking-widest text-white/50 mb-1.5';

const SOCIAL_FIELDS = [
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourband' },
  { key: 'spotify',   label: 'Spotify',   placeholder: 'https://open.spotify.com/artist/…' },
  { key: 'facebook',  label: 'Facebook',  placeholder: 'https://facebook.com/yourband' },
  { key: 'website',   label: 'Website',   placeholder: 'https://yourband.com' },
];

interface Props {
  profile: Pick<Profile, 'display_name' | 'genres' | 'bio' | 'based_in' | 'avatar_url' | 'social_links'>;
}

export default function BandProfileForm({ profile }: Props) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    updateBandProfile,
    null,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(profile.avatar_url ?? null);
  const [genres, setGenres] = useState<string[]>(profile.genres ?? []);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPreviewUrl(URL.createObjectURL(file));
  }

  const socialLinks = profile.social_links ?? {};

  return (
    <form action={formAction} className="space-y-6">

      {/* Avatar */}
      <div>
        <label className={labelClass}>
          Profile Picture
          <span className="ml-2 normal-case text-white/30 tracking-normal font-normal">(optional)</span>
        </label>
        <div className="flex items-center gap-5">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 hover:border-[#39FF14]/50 transition-colors cursor-pointer shrink-0 bg-[#111] flex items-center justify-center"
          >
            {previewUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Avatar preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-full">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Change</span>
                </div>
              </>
            ) : (
              <span className="text-3xl select-none">🎸</span>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-white border border-white/20 hover:border-white/50 transition-colors"
            >
              {previewUrl ? 'Replace Photo' : 'Upload Photo'}
            </button>
            <p className="text-xs text-white/25 mt-1.5">JPG, PNG, WEBP — max 8 MB</p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          name="avatar"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>

      {/* Band name */}
      <div>
        <label htmlFor="display_name" className={labelClass}>Band Name</label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          required
          defaultValue={profile.display_name}
          placeholder="Your band name"
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

      {/* Based in */}
      <div>
        <label htmlFor="based_in" className={labelClass}>
          Based in
          <span className="ml-2 normal-case text-white/30 tracking-normal font-normal">(optional)</span>
        </label>
        <input
          id="based_in"
          name="based_in"
          type="text"
          defaultValue={profile.based_in ?? ''}
          placeholder="e.g. Manchester, UK"
          className={inputClass}
        />
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="bio" className={labelClass}>
          Bio
          <span className="ml-2 normal-case text-white/30 tracking-normal font-normal">(optional)</span>
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={4}
          defaultValue={profile.bio ?? ''}
          placeholder="Tell fans about your band…"
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Social links */}
      <fieldset>
        <legend className={`${labelClass} mb-3`}>Social Links</legend>
        <div className="space-y-3">
          {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="w-20 text-xs font-bold uppercase tracking-wider text-white/40 shrink-0">
                {label}
              </span>
              <input
                name={`social_${key}`}
                type="url"
                defaultValue={(socialLinks as Record<string, string>)[key] ?? ''}
                placeholder={placeholder}
                className={`${inputClass} flex-1`}
              />
            </div>
          ))}
        </div>
      </fieldset>

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
        {isPending ? 'Saving…' : 'Save Profile'}
      </button>

    </form>
  );
}
