'use client';

import { useEffect, useRef, useState } from 'react';

interface Suggestion {
  place_name: string;
  center: [number, number]; // [lng, lat]
}

interface Props {
  onSelect: (place: { name: string; lat: number; lng: number }) => void;
  initialValue?: string;
  placeholder?: string;
}

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export default function LocationSearch({ onSelect, initialValue = '', placeholder = 'Search your city or town…' }: Props) {
  const [query, setQuery]           = useState(initialValue);
  const [results, setResults]       = useState<Suggestion[]>([]);
  const [open, setOpen]             = useState(false);
  const [selected, setSelected]     = useState(!!initialValue);
  const debounceRef                 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef                = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    setSelected(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) { setResults([]); setOpen(false); return; }

    debounceRef.current = setTimeout(async () => {
      try {
        const url =
          `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
          `${encodeURIComponent(value)}.json` +
          `?access_token=${TOKEN}&types=place,locality,neighborhood,postcode&limit=5`;
        const res  = await fetch(url);
        const json = await res.json();
        setResults(json.features ?? []);
        setOpen(true);
      } catch {
        // silently ignore network errors during search
      }
    }, 300);
  }

  function handleSelect(s: Suggestion) {
    setQuery(s.place_name);
    setSelected(true);
    setOpen(false);
    setResults([]);
    onSelect({
      name: s.place_name,
      lat: s.center[1],
      lng: s.center[0],
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={`w-full bg-[#0d0d0d] border px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-all ${
          selected
            ? 'border-[#39FF14] shadow-[0_0_0_1px_#39FF14]'
            : 'border-white/10 focus:border-[#39FF14] focus:shadow-[0_0_0_1px_#39FF14]'
        }`}
      />
      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-[#111] border border-white/10 divide-y divide-white/5 shadow-2xl">
          {results.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={() => handleSelect(s)}
                className="w-full text-left px-4 py-3 text-sm text-white/80 hover:bg-[#39FF14]/10 hover:text-white transition-colors"
              >
                {s.place_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
