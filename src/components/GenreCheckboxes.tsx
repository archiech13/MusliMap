'use client';

import { GENRES } from '@/lib/genres';

interface Props {
  selected: string[];
  onChange: (genres: string[]) => void;
}

export default function GenreCheckboxes({ selected, onChange }: Props) {
  function toggle(genre: string) {
    onChange(
      selected.includes(genre)
        ? selected.filter(g => g !== genre)
        : [...selected, genre],
    );
  }

  return (
    <div className="grid grid-cols-2 gap-y-1 gap-x-6">
      {GENRES.map(genre => {
        const active = selected.includes(genre);
        return (
          <label
            key={genre}
            className="flex items-center gap-3 py-2 cursor-pointer select-none"
          >
            {/* Hidden real checkbox — picked up by FormData */}
            <input
              type="checkbox"
              name="genres"
              value={genre}
              checked={active}
              onChange={() => toggle(genre)}
              className="sr-only"
            />
            {/* Visual checkbox */}
            <span
              className="w-4 h-4 shrink-0 border flex items-center justify-center transition-colors"
              style={{
                borderColor: active ? '#39FF14' : '#444',
                background: 'transparent',
              }}
            >
              {active && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="#39FF14" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-white/60">
              {genre}
            </span>
          </label>
        );
      })}
    </div>
  );
}
