'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import type { Gig } from '@/types/database';

const GENRES = ['All', 'Rock', 'Pop', 'Jazz', 'Hip-Hop', 'Electronic', 'Folk', 'Classical', 'Metal', 'R&B', 'Indie'] as const;
type Genre = typeof GENRES[number];

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const UK_CENTER: [number, number] = [-2.5, 54.0];
const UK_ZOOM = 5.5;

const GIGS_SOURCE = 'gigs-source';

// ── Helpers ──────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatGigDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatGigTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/** Approximate GeoJSON circle polygon for a geographic radius. */
function makeRadiusGeoJSON(lat: number, lng: number, radiusMiles: number) {
  const km     = radiusMiles * 1.60934;
  const points = 64;
  const coords: [number, number][] = [];

  for (let i = 0; i < points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx    = (km / 111.32) / Math.cos((lat * Math.PI) / 180) * Math.cos(angle);
    const dy    = (km / 110.574) * Math.sin(angle);
    coords.push([lng + dx, lat + dy]);
  }
  coords.push(coords[0]); // close ring

  return {
    type: 'Feature' as const,
    geometry: { type: 'Polygon' as const, coordinates: [coords] },
    properties: {},
  };
}

function gigsToGeoJSON(gigs: Gig[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: gigs.map(g => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [g.lng, g.lat] },
      properties: { gigId: g.id },
    })),
  };
}

// ── Marker / popup builders ───────────────────────────────────

function createClusterEl(count: number): HTMLElement {
  // All styles are inline so they can't be overridden by the CSS cascade
  // or Mapbox GL's own stylesheet applied to .mapboxgl-marker.

  const el = document.createElement('div');
  el.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer;';

  const pin = document.createElement('div');
  pin.style.cssText = [
    'width:48px', 'height:48px', 'border-radius:50%',
    'border:2.5px solid #39FF14', 'background:#0a0a0a',
    'box-shadow:0 0 14px rgba(57,255,20,0.5),0 2px 8px rgba(0,0,0,0.6)',
    'display:flex', 'align-items:center', 'justify-content:center',
    'transition:transform 0.15s ease,box-shadow 0.15s ease',
  ].join(';');

  const countSpan = document.createElement('span');
  // Keep class so syncMarkers can find and update the text
  countSpan.className = 'cluster-count';
  countSpan.style.cssText = 'font-size:15px;font-weight:700;color:#39FF14;line-height:1;font-family:system-ui,sans-serif;';
  countSpan.textContent = String(count);
  pin.appendChild(countSpan);

  // SVG tail — same proportions as the CSS-border triangle on gig markers
  // (12px wide × 8px tall, pointing downward)
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '12');
  svg.setAttribute('height', '8');
  svg.setAttribute('viewBox', '0 0 12 8');
  svg.style.cssText = 'display:block;margin-top:-1px;filter:drop-shadow(0 2px 4px rgba(57,255,20,0.4));';
  const tri = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  tri.setAttribute('points', '0,0 12,0 6,8');
  tri.setAttribute('fill', '#39FF14');
  svg.appendChild(tri);

  // Hover: scale pin up, matching gig marker behaviour
  el.addEventListener('mouseenter', () => {
    pin.style.transform = 'scale(1.12)';
    pin.style.boxShadow = '0 0 22px rgba(57,255,20,0.75),0 4px 12px rgba(0,0,0,0.7)';
  });
  el.addEventListener('mouseleave', () => {
    pin.style.transform = '';
    pin.style.boxShadow = '0 0 14px rgba(57,255,20,0.5),0 2px 8px rgba(0,0,0,0.6)';
  });

  el.appendChild(pin);
  el.appendChild(svg);
  return el;
}

function createMarkerEl(gig: Gig): HTMLElement {
  const el = document.createElement('div');
  el.className = 'gig-marker';

  const imgHtml = gig.image_url
    ? `<img src="${esc(gig.image_url)}" alt="${esc(gig.band?.display_name ?? '')}" class="gig-marker-img" />`
    : `<span class="gig-marker-icon">🎸</span>`;

  el.innerHTML = `
    <div class="gig-marker-pin">${imgHtml}</div>
    <div class="gig-marker-tail"></div>
  `;
  return el;
}

function createHomeMarkerEl(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'fan-home-marker';
  el.innerHTML = `<div class="fan-home-pulse"></div>`;
  return el;
}

function createPopupHTML(gig: Gig, isFollowing: boolean, isFan: boolean): string {
  const bandName   = esc(gig.band?.display_name ?? 'Band');
  const bandId     = esc(gig.band_id);
  const venue      = esc(gig.venue_name);
  const dateStr    = esc(formatGigDate(gig.starts_at));
  const timeStr    = esc(formatGigTime(gig.starts_at));
  const genres     = (gig.genres ?? []).map(esc);
  const desc       = gig.description  ? esc(gig.description)  : null;
  const imgSrc     = gig.image_url    ? esc(gig.image_url)    : null;
  const avatarSrc  = gig.band?.avatar_url ? esc(gig.band.avatar_url) : null;

  const followBtn = isFan ? `
    <button
      class="gig-follow-btn${isFollowing ? ' gig-follow-btn--active' : ''}"
      data-band-id="${bandId}"
      data-following="${isFollowing ? '1' : '0'}"
    >
      ${isFollowing ? '★ Following' : '+ Follow This Band'}
    </button>
  ` : '';

  const bandHeader = `
    <div class="gig-popup-band-row">
      ${avatarSrc
        ? `<img src="${avatarSrc}" alt="${bandName}" class="gig-popup-avatar" />`
        : `<div class="gig-popup-avatar gig-popup-avatar--placeholder">🎸</div>`}
      <a href="/bands/${bandId}" class="gig-popup-band">${bandName}</a>
    </div>
  `;

  return `
    <div class="gig-popup">
      ${imgSrc ? `<div class="gig-popup-img-wrap"><img src="${imgSrc}" alt="${bandName}" class="gig-popup-img" /></div>` : ''}
      <div class="gig-popup-body">
        ${bandHeader}
        <p class="gig-popup-venue">📍 ${venue}</p>
        <p class="gig-popup-datetime">🗓 ${dateStr} &nbsp;·&nbsp; ${timeStr}</p>
        ${genres.length > 0 ? `<div class="gig-popup-genres">${genres.map(g => `<span class="gig-popup-genre">${g}</span>`).join('')}</div>` : ''}
        ${desc  ? `<p class="gig-popup-desc">${desc}</p>`         : ''}
        ${followBtn}
      </div>
    </div>
  `;
}

// ── Date-picker helpers ───────────────────────────────────────

/** Return "YYYY-MM-DD" in the user's local timezone for a gig ISO string. */
function gigLocalDate(iso: string): string {
  const d = new Date(iso);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_HEADERS = ['Mo','Tu','We','Th','Fr','Sa','Su'];

/** Return an array of day numbers (1-based) padded with nulls to fill a Mon-first grid. */
function buildCalendarCells(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = firstDow === 0 ? 6 : firstDow - 1; // shift to Mon=0
  const cells: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// ── Component ─────────────────────────────────────────────────

interface FanHome {
  lat: number;
  lng: number;
  radiusMiles: number;
}

interface Props {
  gigs: Gig[];
  fanHome: FanHome | null;
  fanFollowedBandIds: string[];
  isFan: boolean;
  isLoggedIn: boolean;
}

export default function Map({ gigs, fanHome, fanFollowedBandIds, isFan, isLoggedIn }: Props) {
  const [selectedGenre, setSelectedGenre] = useState<Genre>('All');

  // ── Date filter state ──────────────────────────────────────
  const today = new Date();
  const [selectedDate, setSelectedDate]   = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen]   = useState(false);
  const [calYear,  setCalYear]            = useState(today.getFullYear());
  const [calMonth, setCalMonth]           = useState(today.getMonth());
  const calendarRef = useRef<HTMLDivElement>(null);

  const navigateMonth = useCallback((delta: number) => {
    setCalMonth(m => {
      const next = m + delta;
      if (next < 0)  { setCalYear(y => y - 1); return 11; }
      if (next > 11) { setCalYear(y => y + 1); return 0; }
      return next;
    });
  }, []);

  const selectDay = useCallback((day: number) => {
    const ds = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    setSelectedDate(prev => prev === ds ? null : ds);
  }, [calYear, calMonth]);

  // ── My Location state ──────────────────────────────────────
  const [geoLocating, setGeoLocating] = useState(false);
  const [geoError,    setGeoError]    = useState<string | null>(null);

  // Auto-dismiss the error message after 4 s
  useEffect(() => {
    if (!geoError) return;
    const t = setTimeout(() => setGeoError(null), 4000);
    return () => clearTimeout(t);
  }, [geoError]);

  function handleMyLocation() {
    if (!navigator.geolocation) {
      setGeoError("Your browser doesn't support geolocation.");
      return;
    }
    setGeoLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGeoLocating(false);
        map.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 13,
          speed: 1.6,
          essential: true,
        });
      },
      err => {
        setGeoLocating(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? 'Location access was denied. Enable it in your browser settings.'
            : 'Unable to detect your location. Please try again.',
        );
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  }

  // Close calendar on outside click
  useEffect(() => {
    if (!calendarOpen) return;
    function onDown(e: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [calendarOpen]);

  // Combined genre + date filter
  const filteredGigs = gigs.filter(g => {
    const genreOk = selectedGenre === 'All' ||
      g.genres?.some(genre => genre.toLowerCase() === selectedGenre.toLowerCase());
    const dateOk  = !selectedDate || gigLocalDate(g.starts_at) === selectedDate;
    return genreOk && dateOk;
  });

  // Dates that have gigs matching the current genre (for calendar dot highlights)
  const gigDates = new Set(
    gigs
      .filter(g => selectedGenre === 'All' ||
        g.genres?.some(genre => genre.toLowerCase() === selectedGenre.toLowerCase()))
      .map(g => gigLocalDate(g.starts_at)),
  );

  const todayStr = gigLocalDate(today.toISOString());

  const mapContainer  = useRef<HTMLDivElement>(null);
  const map           = useRef<mapboxgl.Map | null>(null);
  const geocoder      = useRef<MapboxGeocoder | null>(null);
  // Individual gig markers keyed by gig ID
  const markerMap      = useRef<Record<string, mapboxgl.Marker>>({});
  // Cluster HTML markers keyed by cluster_id (string)
  const clusterMarkers = useRef<Record<string, mapboxgl.Marker>>({});
  const homeMarker    = useRef<mapboxgl.Marker | null>(null);
  const mapReady      = useRef(false);
  const mapReadyCbs   = useRef<(() => void)[]>([]);

  // Live set of followed band IDs — updated by follow/unfollow without React re-renders
  const followedIds   = useRef<Set<string>>(new Set(fanFollowedBandIds));

  // Sync followedIds ref when prop changes (e.g., on navigation)
  useEffect(() => {
    followedIds.current = new Set(fanFollowedBandIds);
  }, [fanFollowedBandIds]);

  // ── Helper: run after map style is ready ──────────────────
  function whenReady(fn: () => void) {
    if (mapReady.current) { fn(); return; }
    mapReadyCbs.current.push(fn);
  }

  // ── Sync all map markers against current cluster state ───────
  // Called on every map render frame so pins appear/disappear as
  // clusters break apart during zoom, and cluster pins update live.
  function syncMarkers() {
    const m = map.current;
    if (!m || !mapReady.current) return;
    if (!m.isSourceLoaded(GIGS_SOURCE)) return;

    // ── Individual gig pins: show only unclustered ones ────────
    const unclusteredFeatures = m.querySourceFeatures(GIGS_SOURCE, {
      filter: ['!', ['has', 'point_count']],
    });
    const visibleGigIds = new Set(
      unclusteredFeatures
        .map(f => f.properties?.gigId as string | undefined)
        .filter((id): id is string => Boolean(id)),
    );
    Object.entries(markerMap.current).forEach(([gigId, marker]) => {
      marker.getElement().style.display = visibleGigIds.has(gigId) ? '' : 'none';
    });

    // ── Cluster pins: create / update / remove ─────────────────
    const clusterFeatures = m.querySourceFeatures(GIGS_SOURCE, {
      filter: ['has', 'point_count'],
    });

    const seenIds = new Set<string>();

    clusterFeatures.forEach(feature => {
      const props     = feature.properties!;
      const cid       = String(props.cluster_id as number);
      const count     = props.point_count as number;
      const coords    = (feature.geometry as GeoJSON.Point).coordinates as [number, number];

      seenIds.add(cid);

      if (cid in clusterMarkers.current) {
        // Update count text if it changed (e.g. during filter changes)
        const countEl = clusterMarkers.current[cid].getElement().querySelector('.cluster-count');
        if (countEl && countEl.textContent !== String(count)) {
          countEl.textContent = String(count);
        }
      } else {
        // Create new cluster pin
        const el = createClusterEl(count);
        el.addEventListener('click', () => {
          const clusterId = props.cluster_id as number;
          const existing  = clusterMarkers.current[String(clusterId)];
          if (!existing || !map.current) return;
          (map.current.getSource(GIGS_SOURCE) as mapboxgl.GeoJSONSource)
            .getClusterExpansionZoom(clusterId, (err, zoom) => {
              if (err || zoom == null || !map.current) return;
              map.current.easeTo({ center: existing.getLngLat(), zoom: zoom + 0.5 });
            });
        });
        clusterMarkers.current[cid] = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat(coords)
          .addTo(m);
      }
    });

    // Remove cluster pins that no longer exist
    Object.entries(clusterMarkers.current).forEach(([cid, marker]) => {
      if (!seenIds.has(cid)) {
        marker.remove();
        delete clusterMarkers.current[cid];
      }
    });
  }

  // ── Init map once ──────────────────────────────────────────
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: UK_CENTER,
      zoom: UK_ZOOM,
      minZoom: 2,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    geocoder.current = new MapboxGeocoder({
      accessToken: MAPBOX_TOKEN,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mapboxgl: mapboxgl as any,
      placeholder: 'Search for a location...',
      marker: false,
      flyTo: { speed: 1.4, curve: 1.4, essential: true },
    });

    const geocoderContainer = document.getElementById('geocoder-container');
    if (geocoderContainer) {
      geocoderContainer.appendChild(geocoder.current.onAdd(map.current));
    }

    map.current.on('style.load', () => {
      const m = map.current!;

      // ── Fan radius layers ──────────────────────────────────
      m.addSource('fan-radius', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      m.addLayer({
        id: 'fan-radius-fill',
        type: 'fill',
        source: 'fan-radius',
        paint: { 'fill-color': '#39FF14', 'fill-opacity': 0.06 },
      });
      m.addLayer({
        id: 'fan-radius-line',
        type: 'line',
        source: 'fan-radius',
        paint: {
          'line-color': '#39FF14',
          'line-opacity': 0.35,
          'line-width': 1.5,
          'line-dasharray': [4, 4],
        },
      });

      // ── Gig cluster source (data injected by the gig effect) ─
      m.addSource(GIGS_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 14,   // individual pins appear at zoom ≥ 15
        clusterRadius: 50,    // pixels within which points cluster
      });

      // Ghost layer for unclustered individual points.
      // Visually invisible but required: without a layer referencing
      // GIGS_SOURCE at individual-point level, Mapbox never loads the
      // high-zoom tiles that contain unclustered features, so
      // querySourceFeatures always returns an empty array.
      m.addLayer({
        id: 'unclustered-points',
        type: 'circle',
        source: GIGS_SOURCE,
        filter: ['!', ['has', 'point_count']],
        paint: { 'circle-radius': 1, 'circle-opacity': 0 },
      });

      // ── Keep all markers in sync with cluster state ────────
      m.on('render', syncMarkers);

      mapReady.current = true;
      mapReadyCbs.current.forEach(fn => fn());
      mapReadyCbs.current = [];
    });

    return () => {
      Object.values(markerMap.current).forEach(m => m.remove());
      markerMap.current = {};
      Object.values(clusterMarkers.current).forEach(m => m.remove());
      clusterMarkers.current = {};
      homeMarker.current?.remove();
      homeMarker.current = null;
      geocoder.current?.onRemove();
      map.current?.remove();
      map.current = null;
      mapReady.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Radius circle + home marker ────────────────────────────
  useEffect(() => {
    whenReady(() => {
      if (!map.current) return;

      const source = map.current.getSource('fan-radius') as mapboxgl.GeoJSONSource | undefined;
      if (source) {
        if (fanHome) {
          source.setData(makeRadiusGeoJSON(fanHome.lat, fanHome.lng, fanHome.radiusMiles));
        } else {
          source.setData({ type: 'FeatureCollection', features: [] });
        }
      }

      homeMarker.current?.remove();
      homeMarker.current = null;

      if (fanHome) {
        const el = createHomeMarkerEl();
        homeMarker.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([fanHome.lng, fanHome.lat])
          .addTo(map.current!);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fanHome]);

  // ── Gig markers ────────────────────────────────────────────
  useEffect(() => {
    whenReady(() => {
      if (!map.current) return;

      const currentIds = new Set(filteredGigs.map(g => g.id));

      // Remove markers for gigs no longer in the filtered set
      Object.entries(markerMap.current).forEach(([id, marker]) => {
        if (!currentIds.has(id)) {
          marker.remove();
          delete markerMap.current[id];
        }
      });

      // Add markers for newly visible gigs (hidden — syncMarkerVisibility reveals them)
      filteredGigs.forEach(gig => {
        if (gig.id in markerMap.current) return; // already present

        const isFollowing = followedIds.current.has(gig.band_id);
        const el = createMarkerEl(gig);
        el.style.display = 'none'; // hidden until cluster sync decides

        const popup = new mapboxgl.Popup({
          offset: 8,
          closeButton: true,
          maxWidth: '300px',
          className: 'gig-popup-wrapper',
        }).setHTML(createPopupHTML(gig, isFollowing, isFan));

        if (isFan) {
          popup.on('open', () => {
            const btn = popup.getElement()?.querySelector('.gig-follow-btn') as HTMLButtonElement | null;
            if (!btn) return;

            btn.addEventListener('click', async () => {
              const bandId       = btn.dataset.bandId!;
              const wasFollowing = btn.dataset.following === '1';

              btn.disabled    = true;
              btn.textContent = wasFollowing ? 'Unfollowing…' : 'Following…';

              try {
                const res = await fetch('/api/follows', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    bandId,
                    action: wasFollowing ? 'unfollow' : 'follow',
                  }),
                });

                if (res.ok) {
                  const nowFollowing = !wasFollowing;
                  btn.dataset.following = nowFollowing ? '1' : '0';
                  btn.textContent       = nowFollowing ? '★ Following' : '+ Follow This Band';
                  btn.classList.toggle('gig-follow-btn--active', nowFollowing);

                  if (nowFollowing) {
                    followedIds.current.add(bandId);
                  } else {
                    followedIds.current.delete(bandId);
                  }
                } else {
                  btn.textContent = wasFollowing ? '★ Following' : '+ Follow This Band';
                }
              } catch {
                btn.textContent = wasFollowing ? '★ Following' : '+ Follow This Band';
              } finally {
                btn.disabled = false;
              }
            });
          });
        }

        const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([gig.lng, gig.lat])
          .setPopup(popup)
          .addTo(map.current!);

        markerMap.current[gig.id] = marker;
      });

      // Push updated positions into the cluster source
      const source = map.current.getSource(GIGS_SOURCE) as mapboxgl.GeoJSONSource | undefined;
      source?.setData(gigsToGeoJSON(filteredGigs));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredGigs, isFan]);

  return (
    <div className="relative w-full h-full">
      {/*
        Search bar wrapper — centred, same as the original geocoder container.
        When isFan the wrapper is widened by exactly (gap + button) so the
        geocoder keeps its original 416 px input width on all screen sizes.
        The My Location button is absolute-positioned inside the wrapper's
        right-side padding zone, completely separate from the geocoder DOM.
      */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          width: '100%',
          // base max-width matches original max-w-md (28rem = 448px);
          // for fans add gap (8px) + button width (38px) = 46px extra
          maxWidth: isLoggedIn ? 'calc(28rem + 46px)' : '28rem',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}
      >
        {/* geocoder appended here by mapbox-gl-geocoder */}
        <div
          id="geocoder-container"
          style={{ marginRight: isLoggedIn ? '46px' : 0 }}
        />

        {/* My Location button — lives in the right-side margin carved above */}
        {isLoggedIn && (
          <div style={{ position: 'absolute', top: 0, right: '16px' }}>
            <button
              onClick={handleMyLocation}
              disabled={geoLocating}
              title="Use my location"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                background: 'rgba(13,13,13,0.92)',
                border: geoError
                  ? '1.5px solid rgba(255,80,80,0.6)'
                  : '1.5px solid rgba(57,255,20,0.5)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 0 20px rgba(57,255,20,0.08), 0 4px 24px rgba(0,0,0,0.6)',
                color: geoLocating ? 'rgba(57,255,20,0.4)' : '#39FF14',
                cursor: geoLocating ? 'wait' : 'pointer',
                borderRadius: '4px',
                transition: 'border-color 0.15s, color 0.15s',
              }}
            >
              {geoLocating ? (
                <svg
                  width="15" height="15" viewBox="0 0 15 15" fill="none"
                  style={{ animation: 'spin 0.9s linear infinite', transformOrigin: 'center' }}
                >
                  <circle cx="7.5" cy="7.5" r="5.5"
                    stroke="currentColor" strokeWidth="1.5"
                    strokeDasharray="22 12" strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <circle cx="7.5" cy="7.5" r="3" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M7.5 1v2.5M7.5 11.5V14M1 7.5h2.5M11.5 7.5H14"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                  />
                </svg>
              )}
            </button>

            {/* Error tooltip — auto-dismissed after 4 s */}
            {geoError && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '210px',
                  padding: '8px 12px',
                  fontSize: '11px',
                  lineHeight: '1.4',
                  background: 'rgba(10,10,10,0.97)',
                  border: '1px solid rgba(255,80,80,0.35)',
                  color: 'rgba(255,140,140,0.9)',
                  backdropFilter: 'blur(10px)',
                  zIndex: 20,
                }}
              >
                {geoError}
              </div>
            )}
          </div>
        )}
      </div>
      <div ref={mapContainer} className="w-full h-full" />

      {/* Map disclaimer */}
      <p className="absolute top-[60px] left-4 z-10 max-w-[220px] text-[10px] leading-snug pointer-events-none"
        style={{ color: 'rgba(255,255,255,0.28)' }}
      >
        Gig locations are approximate. Search the venue name and postcode in Google Maps or Apple Maps for exact directions.
      </p>

      {/* Filter bar + date-picker — wrapped so the calendar can sit above */}
      <div
        ref={calendarRef}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center"
      >
        {/* ── Calendar dropdown ──────────────────────────────── */}
        {calendarOpen && (
          <div
            className="mb-2 select-none"
            style={{
              width: '272px',
              background: 'rgba(10,10,10,0.97)',
              border: '1px solid rgba(57,255,20,0.25)',
              backdropFilter: 'blur(14px)',
              padding: '16px',
            }}
          >
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => navigateMonth(-1)}
                className="flex items-center justify-center w-7 h-7 transition-colors"
                style={{ color: 'rgba(255,255,255,0.4)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#39FF14')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
              >
                <svg width="7" height="11" viewBox="0 0 7 11" fill="none">
                  <path d="M6 1L1 5.5L6 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <span
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.85)' }}
              >
                {MONTH_NAMES[calMonth]} {calYear}
              </span>
              <button
                onClick={() => navigateMonth(1)}
                className="flex items-center justify-center w-7 h-7 transition-colors"
                style={{ color: 'rgba(255,255,255,0.4)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#39FF14')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
              >
                <svg width="7" height="11" viewBox="0 0 7 11" fill="none">
                  <path d="M1 1L6 5.5L1 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_HEADERS.map(d => (
                <div
                  key={d}
                  className="text-center text-[10px] font-bold uppercase tracking-widest pb-1"
                  style={{ color: 'rgba(57,255,20,0.45)' }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-y-0.5">
              {buildCalendarCells(calYear, calMonth).map((day, i) => {
                if (!day) return <div key={i} />;
                const ds         = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const isSelected = ds === selectedDate;
                const isToday    = ds === todayStr;
                const hasGig     = gigDates.has(ds);
                return (
                  <button
                    key={i}
                    onClick={() => selectDay(day)}
                    className="relative flex flex-col items-center justify-center h-8 text-xs font-semibold transition-all"
                    style={{
                      color: isSelected
                        ? '#000'
                        : isToday
                          ? '#39FF14'
                          : 'rgba(255,255,255,0.75)',
                      background: isSelected ? '#39FF14' : 'transparent',
                      outline: isToday && !isSelected ? '1px solid rgba(57,255,20,0.4)' : 'none',
                    }}
                  >
                    {day}
                    {/* Dot for days with gigs */}
                    {hasGig && (
                      <span
                        className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                        style={{ background: isSelected ? '#000' : '#39FF14', opacity: isSelected ? 0.5 : 0.7 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Clear button */}
            {selectedDate && (
              <button
                onClick={() => setSelectedDate(null)}
                className="mt-3 w-full py-1.5 text-[11px] font-bold uppercase tracking-widest transition-colors"
                style={{
                  color: 'rgba(255,255,255,0.4)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = '#39FF14';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(57,255,20,0.35)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)';
                }}
              >
                Clear date filter
              </button>
            )}
          </div>
        )}

        {/* ── Filter pill bar ────────────────────────────────── */}
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-full shadow-xl overflow-x-auto max-w-[calc(100vw-2rem)] scrollbar-none"
          style={{
            background: 'rgba(15,15,15,0.88)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {GENRES.map(genre => {
            const active = genre === selectedGenre;
            return (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150"
                style={active
                  ? { background: '#39FF14', color: '#0a0a0a' }
                  : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.65)' }
                }
              >
                {genre}
              </button>
            );
          })}

          {/* Divider */}
          <div
            className="flex-shrink-0 self-stretch w-px mx-0.5"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          />

          {/* Date picker toggle */}
          <button
            onClick={() => setCalendarOpen(o => !o)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150"
            style={
              selectedDate || calendarOpen
                ? { background: '#39FF14', color: '#0a0a0a' }
                : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.65)' }
            }
          >
            {/* Calendar icon */}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
              <rect x="0.75" y="1.75" width="10.5" height="9.5" rx="1" stroke="currentColor" strokeWidth="1.25"/>
              <path d="M0.75 4.75h10.5" stroke="currentColor" strokeWidth="1.25"/>
              <path d="M3.5 0.75v2M8.5 0.75v2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
            </svg>
            {selectedDate
              ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
              : 'Date'
            }
          </button>
        </div>
      </div>
    </div>
  );
}
