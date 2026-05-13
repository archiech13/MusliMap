'use client';

import { useActionState, useState } from 'react';
import { updateFanSettings } from '@/lib/fan/actions';
import LocationSearch from '@/components/auth/LocationSearch';
import type { FormState } from '@/types/database';

const RADIUS_OPTS = [0, 5, 10, 25, 50, 100];

interface Props {
  initialLocationName: string;
  initialLat: number | null;
  initialLng: number | null;
  initialRadius: number;
}

const labelClass = 'block text-xs font-bold uppercase tracking-widest text-white/50 mb-1.5';

export default function FanSettingsForm({
  initialLocationName,
  initialLat,
  initialLng,
  initialRadius,
}: Props) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    updateFanSettings,
    null,
  );

  const [location, setLocation] = useState<{ name: string; lat: number; lng: number } | null>(
    initialLat != null && initialLng != null
      ? { name: initialLocationName, lat: initialLat, lng: initialLng }
      : null,
  );

  const safeInitialRadius = RADIUS_OPTS.includes(initialRadius) ? initialRadius : (initialRadius === 0 ? 0 : 25);
  const [radius, setRadius] = useState(safeInitialRadius);

  const sliderIndex = RADIUS_OPTS.indexOf(radius);

  return (
    <form action={formAction} className="space-y-6">

      {/* Home location */}
      <div>
        <label className={labelClass}>Home Location</label>
        <LocationSearch onSelect={setLocation} initialValue={initialLocationName} />
        <input type="hidden" name="home_lat"            value={location?.lat ?? ''} />
        <input type="hidden" name="home_lng"            value={location?.lng ?? ''} />
        <input type="hidden" name="home_location_name"  value={location?.name ?? ''} />
        {location && (
          <p className="mt-1.5 text-xs text-[#39FF14]/70">{location.name}</p>
        )}
      </div>

      {/* Notification radius */}
      <div>
        <label className={labelClass}>
          Notification Radius
          <span className="ml-2 normal-case text-white/30 tracking-normal font-normal">
            {radius === 0 ? '— off (followed bands only)' : `— within ${radius} miles`}
          </span>
        </label>

        {/* Slider — mapped 0–4 to RADIUS_OPTS */}
        <input
          type="range"
          min={0}
          max={5}
          step={1}
          value={sliderIndex}
          onChange={e => setRadius(RADIUS_OPTS[parseInt(e.target.value)])}
          className="w-full h-1.5 appearance-none cursor-pointer rounded-full"
          style={{
            background: `linear-gradient(to right, #39FF14 0%, #39FF14 ${sliderIndex * 20}%, rgba(255,255,255,0.1) ${sliderIndex * 20}%, rgba(255,255,255,0.1) 100%)`,
            accentColor: '#39FF14',
          }}
        />

        {/* Preset labels */}
        <div className="flex justify-between mt-2 px-0.5">
          {RADIUS_OPTS.map((r, i) => (
            <button
              key={r}
              type="button"
              onClick={() => setRadius(r)}
              className={`text-xs font-bold uppercase tracking-widest transition-colors ${
                radius === r
                  ? 'text-[#39FF14]'
                  : 'text-white/25 hover:text-white/50'
              }`}
              style={i === 0 ? { marginLeft: 0 } : i === RADIUS_OPTS.length - 1 ? { marginRight: 0 } : {}}
            >
              {r === 0 ? 'Off' : `${r}mi`}
            </button>
          ))}
        </div>

        <input type="hidden" name="notification_radius_miles" value={radius} />
      </div>

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

      <button
        type="submit"
        disabled={isPending || !location}
        className="w-full py-3 font-bold uppercase tracking-widest text-black text-sm disabled:opacity-50 transition-all"
        style={{ background: '#39FF14', boxShadow: '0 0 16px rgba(57,255,20,0.3)' }}
      >
        {isPending ? 'Saving…' : 'Save Settings'}
      </button>

    </form>
  );
}
