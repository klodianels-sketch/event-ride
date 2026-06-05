import type { EventCategory } from '$lib/types';

// Unsplash-Bilder pro Event-Kategorie (stabile CDN-URLs, kein API-Key nötig)
// Format: photo-[ID]?w=800&q=80&fit=crop&auto=format
const BASE = 'https://images.unsplash.com/photo-';
const Q = '?w=800&q=80&fit=crop&auto=format';

export const CATEGORY_IMAGES: Record<EventCategory, string[]> = {
  festival: [
    `${BASE}1506157786151-b8491531f063${Q}`,
    `${BASE}1459749411175-04bf5292ceea${Q}`,
    `${BASE}1533174072545-7a4b6ad7a6c3${Q}`,
    `${BASE}1429962714451-bb934ecdc4ec${Q}`,
  ],
  music: [
    `${BASE}1470229722913-7c0e2dbbafd3${Q}`,
    `${BASE}1501386761578-eac5c94b800a${Q}`,
    `${BASE}1493225457124-a3eb161ffa5f${Q}`,
    `${BASE}1516450360452-9312f5e86fc7${Q}`,
  ],
  nightlife: [
    `${BASE}1566737236500-c8ac43014a67${Q}`,
    `${BASE}1514525253161-7a46d19cd819${Q}`,
    `${BASE}1574271143515-5cddf8da19be${Q}`,
    `${BASE}1528495612343-9ca542153bbf${Q}`,
  ],
  sport: [
    `${BASE}1461896836934-ffe607ba8211${Q}`,
    `${BASE}1571019613454-1cb2f99b2d8b${Q}`,
    `${BASE}1517649763962-0c623066013b${Q}`,
    `${BASE}1535131323745-b5d4e8d9a7a7${Q}`,
  ],
  hiking: [
    `${BASE}1551632811-561732d1e306${Q}`,
    `${BASE}1506905925346-21bda4d32df4${Q}`,
    `${BASE}1519904981063-b0cf448d479e${Q}`,
    `${BASE}1476514525535-07fb3b4ae5f1${Q}`,
  ],
  culture: [
    `${BASE}1551818255-e6e10975bc17${Q}`,
    `${BASE}1578662996442-48f60103fc96${Q}`,
    `${BASE}1518998053901-5348d3961a04${Q}`,
    `${BASE}1460661419201-fd4cecdf8a8b${Q}`,
  ],
  other: [
    `${BASE}1492684223066-81342ee5ff30${Q}`,
    `${BASE}1531058020387-3be344556be6${Q}`,
    `${BASE}1540575467537-6ebe7af3a9cd${Q}`,
  ],
};

// Gibt das primäre Bild für eine Kategorie zurück
export function getCategoryImage(category: EventCategory | string | undefined, index = 0): string {
  const cat = (category as EventCategory) ?? 'other';
  const images = CATEGORY_IMAGES[cat] ?? CATEGORY_IMAGES.other;
  return images[index % images.length];
}

// Gibt 3 Bilder für eine Collage zurück (rotierend falls weniger vorhanden)
export function getCategoryCollage(category: EventCategory | string | undefined): [string, string, string] {
  const cat = (category as EventCategory) ?? 'other';
  const imgs = CATEGORY_IMAGES[cat] ?? CATEGORY_IMAGES.other;
  return [
    imgs[0],
    imgs[1 % imgs.length],
    imgs[2 % imgs.length],
  ];
}

// Gradient-Farben pro Kategorie (für Fallback ohne Bild)
export const CATEGORY_GRADIENT: Record<EventCategory | 'other', string> = {
  music:     'from-rose-500 to-pink-600',
  festival:  'from-amber-400 to-orange-500',
  nightlife: 'from-purple-600 to-violet-700',
  sport:     'from-blue-500 to-cyan-500',
  hiking:    'from-green-500 to-emerald-600',
  culture:   'from-indigo-500 to-blue-600',
  other:     'from-gray-500 to-slate-600',
};

export const CATEGORY_EMOJI: Record<EventCategory | 'other', string> = {
  music:     '🎵',
  festival:  '🎪',
  nightlife: '🌙',
  sport:     '⚡',
  hiking:    '🏔️',
  culture:   '🎭',
  other:     '✨',
};

export const CATEGORY_LABEL: Record<EventCategory | 'other', string> = {
  music:     'Musik',
  festival:  'Festival',
  nightlife: 'Nightlife',
  sport:     'Sport',
  hiking:    'Outdoor',
  culture:   'Kultur',
  other:     'Event',
};
