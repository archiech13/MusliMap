'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface BandResult {
  id: string;
  display_name: string;
  genre: string | null;
  avatar_url: string | null;
}

export default function BandSearch() {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<BandResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(val: string) {
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, genre, avatar_url')
        .eq('role', 'band')
        .ilike('display_name', `%${val.trim()}%`)
        .order('display_name')
        .limit(8);
      setResults(data ?? []);
      setSearched(true);
      setLoading(false);
    }, 300);
  }

  return (
    <div className="space-y-3">
      {/* Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => handleChange(e.target.value)}
          placeholder="Search bands by name…"
          autoComplete="off"
          className="w-full bg-[#0d0d0d] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-all focus:border-[#39FF14] focus:shadow-[0_0_0_1px_#39FF14]"
        />
        {loading && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 text-xs animate-pulse">
            Searching…
          </span>
        )}
      </div>

      {/* Results */}
      {searched && results.length === 0 && !loading && (
        <p className="text-white/30 text-xs px-1">No bands found for &ldquo;{query}&rdquo;.</p>
      )}

      {results.length > 0 && (
        <div className="divide-y divide-white/5 border border-white/10">
          {results.map(band => (
            <Link
              key={band.id}
              href={`/bands/${band.id}`}
              className="flex items-center gap-3 px-4 py-3 bg-[#0a0a0a] hover:bg-[#111] transition-colors group"
            >
              {/* Avatar */}
              <div className="shrink-0 w-10 h-10 rounded-full overflow-hidden bg-[#1a1a1a] border border-white/10 flex items-center justify-center">
                {band.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={band.avatar_url} alt={band.display_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm">🎸</span>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p
                  className="text-white text-sm font-bold uppercase tracking-wide truncate group-hover:text-[#39FF14] transition-colors"
                  style={{ fontFamily: 'var(--font-anton)', letterSpacing: '0.05em' }}
                >
                  {band.display_name}
                </p>
                {band.genre && (
                  <p className="text-white/40 text-xs mt-0.5">{band.genre}</p>
                )}
              </div>

              <span className="text-white/20 group-hover:text-[#39FF14]/60 transition-colors text-xs shrink-0">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
