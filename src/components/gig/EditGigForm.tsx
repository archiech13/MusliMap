'use client';

import { useActionState, useRef, useState } from 'react';
import { updateGig } from '@/lib/gigs/actions';
import LocationSearch from '@/components/auth/LocationSearch';
import GenreCheckboxes from '@/components/GenreCheckboxes';
import type { FormState, Gig } from '@/types/database';

const inputClass =
  'w-full bg-[#0d0d0d] border border-white/10 px-4 py-3 text-sm text-white ' +
  'placeholder:text-white/30 outline-none transition-all ' +
  'focus:border-[#39FF14] focus:shadow-[0_0_0_1px_#39FF14]';

const labelClass = 'block text-xs font-bold uppercase tracking-widest text-white/50 mb-1.5';

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface Props {
  gig: Gig;
}

export default function EditGigForm({ gig }: Props) {
  const boundAction = updateGig.bind(null, gig.id);
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    boundAction,
    null,
  );

  const [location, setLocation] = useState<{ name: string; lat: number; lng: number } | null>({
    name: gig.venue_name,
    lat: gig.lat,
    lng: gig.lng,
  });

  const existingDate = new Date(gig.starts_at);
  const [startsAtUTC, setStartsAtUTC] = useState(gig.starts_at);
  const [datetimeLocalVal] = useState(toDatetimeLocal(existingDate));

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (val) setStartsAtUTC(new Date(val).toISOString());
    else setStartsAtUTC('');
  }

  const [genres, setGenres] = useState<string[]>(gig.genres ?? []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(gig.image_url ?? null);
  const [hasNewImage, setHasNewImage] = useState(false);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) { setPreviewUrl(URL.createObjectURL(file)); setHasNewImage(true); }
  }

  const now     = new Date();
  const minDate = toDatetimeLocal(new Date(now.getTime() + 30 * 60 * 1000));
  const maxDate = toDatetimeLocal(new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000));

  return (
    <form action={formAction} className="space-y-6">

      {/* Venue name */}
      <div>
        <label htmlFor="venue_name" className={labelClass}>Venue Name</label>
        <input
          id="venue_name"
          name="venue_name"
          type="text"
          required
          defaultValue={gig.venue_name}
          placeholder="e.g. The Roundhouse, London"
          className={inputClass}
        />
      </div>

      {/* Venue location */}
      <div>
        <label className={labelClass}>
          Venue Location
          <span className="ml-2 normal-case text-white/30 tracking-normal font-normal">
            (search and select from results)
          </span>
        </label>
        <LocationSearch onSelect={setLocation} initialValue={gig.venue_name} />
        <input type="hidden" name="lat" value={location?.lat ?? ''} />
        <input type="hidden" name="lng" value={location?.lng ?? ''} />
        {location && (
          <p className="mt-1.5 text-xs text-[#39FF14]/70">{location.name}</p>
        )}
      </div>

      {/* Date and time */}
      <div>
        <label htmlFor="datetime" className={labelClass}>
          Date &amp; Time
          <span className="ml-2 normal-case text-white/30 tracking-normal font-normal">
            (up to 14 days in advance)
          </span>
        </label>
        <input
          id="datetime"
          type="datetime-local"
          min={minDate}
          max={maxDate}
          required
          defaultValue={datetimeLocalVal}
          onChange={handleDateChange}
          className={`${inputClass} [color-scheme:dark]`}
        />
        <input type="hidden" name="starts_at" value={startsAtUTC} />
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

      {/* Description */}
      <div>
        <label htmlFor="description" className={labelClass}>
          Description
          <span className="ml-2 normal-case text-white/30 tracking-normal font-normal">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={gig.description ?? undefined}
          placeholder="Tell fans what to expect…"
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Gig image */}
      <div>
        <label className={labelClass}>
          Gig Image
          <span className="ml-2 normal-case text-white/30 tracking-normal font-normal">(optional)</span>
        </label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="relative border border-dashed border-white/20 hover:border-[#39FF14]/50 transition-colors cursor-pointer overflow-hidden"
          style={{ minHeight: previewUrl ? 'auto' : '120px' }}
        >
          {previewUrl ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Gig image preview" className="w-full object-cover max-h-48" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <span className="text-xs font-bold uppercase tracking-widest text-white">
                  {hasNewImage ? 'Change image' : 'Replace image'}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[120px] gap-2">
              <span className="text-2xl">🎸</span>
              <span className="text-xs text-white/30 uppercase tracking-wider">Click to upload a gig image</span>
              <span className="text-xs text-white/20">JPG, PNG, WEBP — max 8 MB</span>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleImageChange}
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
        {isPending ? 'Saving changes…' : 'Save Changes'}
      </button>

    </form>
  );
}
