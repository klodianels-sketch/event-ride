# EventRide – Projektübersicht

Mitfahrgelegenheits-Plattform für Events in der Schweiz.  
Stack: SvelteKit 5 (Runes), TypeScript, Tailwind CSS v4, MongoDB Atlas, bcrypt.

---

## Verzeichnisstruktur (`src/`)

```
src/
├── app.css
├── app.d.ts
├── app.html
├── hooks.server.ts
├── lib/
│   ├── auth.ts
│   ├── db.ts
│   ├── time.ts
│   ├── types.ts
│   └── components/
│       ├── BottomNav.svelte
│       ├── BookingCard.svelte
│       ├── CommunityCircle.svelte
│       ├── RideCard.svelte
│       ├── StarRating.svelte
│       └── TimelineDisplay.svelte
└── routes/
    ├── +layout.server.ts
    ├── +layout.svelte
    ├── +page.server.ts
    ├── +page.svelte
    ├── auth/
    │   ├── login/
    │   ├── logout/
    │   └── register/
    ├── my/
    │   ├── bookings/
    │   ├── notifications/
    │   ├── profile/
    │   └── rides/
    ├── rides/
    │   ├── new/
    │   └── [id]/
    │       ├── book/
    │       ├── publish-success/
    │       └── success/
    └── search/
```

---

## Globale Styles

### `src/app.css`

```css
@import "tailwindcss";

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

---

## Typen & Infrastruktur

### `src/app.d.ts`

```typescript
import type { SessionUser } from '$lib/types';

declare global {
  namespace App {
    interface Locals {
      user: SessionUser | null;
    }
  }
}

export {};
```

### `src/hooks.server.ts`

```typescript
import type { Handle } from '@sveltejs/kit';
import { getSessionUser } from '$lib/auth';

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('sessionToken');
  event.locals.user = null;
  if (token) {
    event.locals.user = await getSessionUser(token);
  }
  return resolve(event);
};
```

### `src/lib/types.ts`

```typescript
import type { ObjectId } from 'mongodb';

export interface User {
  _id: ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  profilePicture?: string;
  rating: number;
  totalRatings: number;
  createdAt: Date;
}

export interface Session {
  _id: ObjectId;
  userId: ObjectId;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface Ride {
  _id: ObjectId;
  driverId: ObjectId;
  driverName: string;
  driverPhoto?: string;
  eventName: string;
  eventLocation: string;
  eventImage?: string;
  startLocation: string;
  departureTime: Date;
  estimatedArrivalTime: Date;
  seats: number;
  seatsAvailable: number;
  pricePerPerson: number;
  fairplayWindowMinutes: number;
  status: 'active' | 'cancelled' | 'completed';
  createdAt: Date;
}

export interface Booking {
  _id: ObjectId;
  rideId: ObjectId;
  passengerId: ObjectId;
  passengerName: string;
  pickupLocation: string;
  estimatedPickupTime: Date;
  mustArriveBy: Date;
  latestArrivalTime: Date;
  status: 'pending' | 'confirmed' | 'cancelled' | 'no-show' | 'completed';
  cancellationReason?: string;
  cancelledAt?: Date;
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'forfeited';
  createdAt: Date;
}

export interface Rating {
  _id: ObjectId;
  rideId: ObjectId;
  fromUserId: ObjectId;
  toUserId: ObjectId;
  role: 'driver' | 'passenger';
  stars: number;
  comment?: string;
  createdAt: Date;
}

export interface SessionUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePicture?: string;
}
```

### `src/lib/db.ts`

```typescript
import { MongoClient } from 'mongodb';
import { MONGODB_URI } from '$env/static/private';

let client: MongoClient | null = null;

async function getClient(): Promise<MongoClient> {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
  }
  return client;
}

export async function getDb() {
  const c = await getClient();
  return c.db('event-ride');
}
```

### `src/lib/auth.ts`

```typescript
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';
import { randomUUID } from 'crypto';
import type { SessionUser } from '$lib/types';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export async function createSession(userId: ObjectId): Promise<string> {
  const db = await getDb();
  const token = randomUUID();
  await db.collection('sessions').insertOne({
    userId,
    token,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS)
  });
  return token;
}

export async function getSessionUser(token: string): Promise<SessionUser | null> {
  const db = await getDb();
  const session = await db.collection('sessions').findOne({
    token,
    expiresAt: { $gt: new Date() }
  });
  if (!session) return null;

  const user = await db.collection('users').findOne({ _id: session.userId });
  if (!user) return null;

  return {
    id: user._id.toString(),
    firstName: user.firstName as string,
    lastName: user.lastName as string,
    email: user.email as string,
    profilePicture: user.profilePicture as string | undefined
  };
}

export async function deleteSession(token: string): Promise<void> {
  const db = await getDb();
  await db.collection('sessions').deleteOne({ token });
}
```

### `src/lib/time.ts`

```typescript
export function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)}, ${formatTime(date)}`;
}

export function calcPickupTimes(departureTime: Date) {
  const estimatedPickupTime = new Date(departureTime.getTime() + 20 * 60 * 1000);
  const mustArriveBy = new Date(estimatedPickupTime.getTime() - 5 * 60 * 1000);
  const latestArrivalTime = new Date(mustArriveBy.getTime() + 10 * 60 * 1000);
  return { estimatedPickupTime, mustArriveBy, latestArrivalTime };
}
```

---

## Komponenten

### `src/lib/components/BottomNav.svelte`

```svelte
<script lang="ts">
  import { page } from '$app/state';

  const tabs = [
    { href: '/', icon: 'home', label: 'Home' },
    { href: '/search', icon: 'search', label: 'Suche' },
    { href: '/rides/new', icon: 'plus', label: 'Anbieten' },
    { href: '/my/notifications', icon: 'bell', label: 'Benachrichtigungen' },
    { href: '/my/profile', icon: 'user', label: 'Profil' }
  ];

  function isActive(href: string) {
    if (href === '/') return page.url.pathname === '/';
    return page.url.pathname.startsWith(href);
  }
</script>

<nav class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 flex items-center justify-around px-2 py-2 z-50">
  {#each tabs as tab}
    <a href={tab.href} class="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors {isActive(tab.href) ? 'text-rose-600' : 'text-gray-400'}">
      {#if tab.icon === 'home'}
        <svg class="w-6 h-6" fill={isActive(tab.href) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline stroke-linecap="round" stroke-linejoin="round" points="9 22 9 12 15 12 15 22"/>
        </svg>
      {:else if tab.icon === 'search'}
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
          <circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="m21 21-4.35-4.35"/>
        </svg>
      {:else if tab.icon === 'plus'}
        <div class="w-10 h-10 rounded-full bg-rose-600 flex items-center justify-center -mt-5 shadow-lg">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14"/>
          </svg>
        </div>
      {:else if tab.icon === 'bell'}
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6 6 0 0 0-5-5.917V4a1 1 0 1 0-2 0v1.083A6 6 0 0 0 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"/>
        </svg>
      {:else if tab.icon === 'user'}
        <svg class="w-6 h-6" fill={isActive(tab.href) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      {/if}
      {#if tab.icon !== 'plus'}
        <span class="text-[10px] font-medium">{tab.label}</span>
      {/if}
    </a>
  {/each}
</nav>
```

### `src/lib/components/RideCard.svelte`

```svelte
<script lang="ts">
  import { formatTime } from '$lib/time';

  let { ride, eventId } = $props<{
    ride: {
      _id: string;
      driverName: string;
      driverPhoto?: string;
      seatsAvailable: number;
      departureTime: Date | string;
      estimatedArrivalTime: Date | string;
      pricePerPerson: number;
      startLocation: string;
    };
    eventId?: string;
  }>();

  function initials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
</script>

<div class="bg-white rounded-2xl shadow-md p-4 flex flex-col gap-3">
  <div class="flex items-start justify-between">
    <div class="flex items-center gap-3">
      {#if ride.driverPhoto}
        <img src={ride.driverPhoto} alt={ride.driverName} class="w-12 h-12 rounded-full object-cover" />
      {:else}
        <div class="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-sm">
          {initials(ride.driverName)}
        </div>
      {/if}
      <div>
        <p class="font-semibold text-gray-900">{ride.driverName}</p>
        <p class="text-sm text-gray-500">{ride.startLocation}</p>
      </div>
    </div>
    <span class="flex items-center gap-1 bg-rose-50 text-rose-600 text-xs font-semibold px-2 py-1 rounded-full">
      <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
      </svg>
      {ride.seatsAvailable} Plätze frei
    </span>
  </div>

  <div class="bg-gray-50 rounded-xl p-3 flex flex-col gap-2">
    <div class="flex items-center justify-between text-sm">
      <span class="text-gray-500">Start</span>
      <span class="font-semibold text-gray-800">{formatTime(ride.departureTime)}</span>
    </div>
    <div class="flex items-center justify-between text-sm">
      <span class="text-gray-500">Holt dich ab</span>
      <span class="font-semibold text-gray-800">ca. {formatTime(new Date(new Date(ride.departureTime).getTime() + 20 * 60 * 1000))}</span>
    </div>
    <div class="flex items-center justify-between text-sm">
      <span class="text-gray-500">Späteste Ankunft</span>
      <span class="font-semibold text-gray-800">{formatTime(ride.estimatedArrivalTime)}</span>
    </div>
  </div>

  <div class="flex items-center justify-between">
    <span class="font-bold text-gray-900">CHF {ride.pricePerPerson.toFixed(2)}</span>
    <a
      href={eventId ? `/rides/${eventId}/book?rideId=${ride._id}` : `/rides/${ride._id}/book`}
      class="bg-rose-600 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-rose-700 transition-colors"
    >
      Mitfahren
    </a>
  </div>
</div>
```

### `src/lib/components/BookingCard.svelte`

```svelte
<script lang="ts">
  import { formatTime, formatDate } from '$lib/time';

  let { booking } = $props<{
    booking: {
      _id: string;
      pickupLocation: string;
      estimatedPickupTime: Date | string;
      mustArriveBy: Date | string;
      latestArrivalTime: Date | string;
      status: string;
      paymentStatus: string;
      ride?: {
        eventName: string;
        eventLocation: string;
        departureTime: Date | string;
        estimatedArrivalTime: Date | string;
        driverName: string;
        pricePerPerson: number;
      };
    };
  }>();

  const statusLabels: Record<string, string> = {
    pending: 'Ausstehend',
    confirmed: 'Bestätigt',
    cancelled: 'Storniert',
    'no-show': 'Nicht erschienen',
    completed: 'Abgeschlossen'
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    'no-show': 'bg-gray-100 text-gray-600',
    completed: 'bg-blue-100 text-blue-700'
  };
</script>

<div class="bg-white rounded-2xl shadow-md p-4 flex flex-col gap-3">
  {#if booking.ride}
    <div class="flex items-start justify-between">
      <div>
        <p class="font-semibold text-gray-900">{booking.ride.eventName}</p>
        <p class="text-sm text-gray-500">{booking.ride.eventLocation}</p>
      </div>
      <span class="text-xs font-semibold px-2 py-1 rounded-full {statusColors[booking.status] || 'bg-gray-100 text-gray-600'}">
        {statusLabels[booking.status] || booking.status}
      </span>
    </div>

    <div class="bg-gray-50 rounded-xl p-3 flex flex-col gap-2">
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500">Fahrer</span>
        <span class="font-medium text-gray-800">{booking.ride.driverName}</span>
      </div>
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500">Abfahrt</span>
        <span class="font-medium text-gray-800">{formatTime(booking.ride.departureTime)}</span>
      </div>
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500">Sei bereit bis</span>
        <span class="font-semibold text-rose-600">{formatTime(booking.mustArriveBy)}</span>
      </div>
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500">Fahrer kommt ca.</span>
        <span class="font-medium text-gray-800">{formatTime(booking.estimatedPickupTime)}</span>
      </div>
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500">Dein Abholort</span>
        <span class="font-medium text-gray-800 text-right max-w-[160px]">{booking.pickupLocation}</span>
      </div>
    </div>

    <div class="flex items-center justify-between text-sm">
      <span class="text-gray-500">Preis</span>
      <span class="font-bold text-gray-900">CHF {booking.ride.pricePerPerson.toFixed(2)}</span>
    </div>
  {/if}
</div>
```

### `src/lib/components/TimelineDisplay.svelte`

```svelte
<script lang="ts">
  import { formatTime } from '$lib/time';

  let { mustArriveBy, estimatedPickupTime, latestArrivalTime, estimatedEventArrival } = $props<{
    mustArriveBy: Date | string;
    estimatedPickupTime: Date | string;
    latestArrivalTime: Date | string;
    estimatedEventArrival: Date | string;
  }>();
</script>

<div class="bg-rose-50 rounded-2xl p-4 flex flex-col gap-3">
  <p class="font-semibold text-gray-900 text-sm">Dein Zeitplan</p>
  <div class="flex flex-col gap-2">
    <div class="flex items-start gap-3">
      <div class="w-8 h-8 rounded-full bg-rose-600 flex items-center justify-center flex-shrink-0">
        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
      </div>
      <div>
        <p class="text-xs text-gray-500">Sei bis spätestens</p>
        <p class="font-bold text-gray-900">{formatTime(mustArriveBy)} Uhr an deinem Treffpunkt</p>
      </div>
    </div>
    <div class="ml-4 w-0.5 h-4 bg-rose-200"></div>
    <div class="flex items-start gap-3">
      <div class="w-8 h-8 rounded-full bg-white border-2 border-rose-300 flex items-center justify-center flex-shrink-0">
        <svg class="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
        </svg>
      </div>
      <div>
        <p class="text-xs text-gray-500">Fahrer kommt ca.</p>
        <p class="font-bold text-gray-900">{formatTime(estimatedPickupTime)} Uhr</p>
      </div>
    </div>
    <div class="ml-4 w-0.5 h-4 bg-rose-200"></div>
    <div class="flex items-start gap-3">
      <div class="w-8 h-8 rounded-full bg-white border-2 border-rose-300 flex items-center justify-center flex-shrink-0">
        <svg class="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <div>
        <p class="text-xs text-gray-500">Fahrer darf ab</p>
        <p class="font-bold text-gray-900">{formatTime(latestArrivalTime)} Uhr weiterfahren</p>
      </div>
    </div>
    <div class="ml-4 w-0.5 h-4 bg-rose-200"></div>
    <div class="flex items-start gap-3">
      <div class="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 3l14 9-14 9V3z"/>
        </svg>
      </div>
      <div>
        <p class="text-xs text-gray-500">Geschätzte Ankunft am Event</p>
        <p class="font-bold text-gray-900">{formatTime(estimatedEventArrival)} Uhr</p>
      </div>
    </div>
  </div>
</div>
```

### `src/lib/components/StarRating.svelte`

```svelte
<script lang="ts">
  let { value = 0, interactive = false, onchange } = $props<{
    value?: number;
    interactive?: boolean;
    onchange?: (stars: number) => void;
  }>();

  let hovered = $state(0);

  function handleClick(star: number) {
    if (interactive && onchange) onchange(star);
  }
</script>

<div class="flex gap-1">
  {#each [1, 2, 3, 4, 5] as star}
    <button
      type="button"
      disabled={!interactive}
      onclick={() => handleClick(star)}
      onmouseenter={() => { if (interactive) hovered = star; }}
      onmouseleave={() => { if (interactive) hovered = 0; }}
      class="text-2xl transition-colors {!interactive ? 'cursor-default' : 'cursor-pointer'} {(hovered || value) >= star ? 'text-yellow-400' : 'text-gray-200'}"
    >
      ★
    </button>
  {/each}
</div>
```

### `src/lib/components/CommunityCircle.svelte`

```svelte
<script lang="ts">
  let { name, initial, color = 'bg-rose-100', textColor = 'text-rose-600' } = $props<{
    name: string;
    initial: string;
    color?: string;
    textColor?: string;
  }>();
</script>

<div class="flex flex-col items-center gap-1.5 flex-shrink-0">
  <div class="w-14 h-14 rounded-full {color} flex items-center justify-center">
    <span class="font-bold text-base {textColor}">{initial}</span>
  </div>
  <span class="text-xs text-gray-600 text-center max-w-[60px] leading-tight">{name}</span>
</div>
```

---

## Layout

### `src/routes/+layout.server.ts`

```typescript
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
  return { user: locals.user };
};
```

### `src/routes/+layout.svelte`

```svelte
<script lang="ts">
  import '../app.css';
  import BottomNav from '$lib/components/BottomNav.svelte';

  let { data, children } = $props();
</script>

<div class="min-h-screen bg-gray-50 flex justify-center">
  <div class="w-full max-w-[430px] bg-white min-h-screen relative pb-20">
    {@render children()}
    {#if data.user}
      <BottomNav />
    {/if}
  </div>
</div>
```

---

## Startseite

### `src/routes/+page.server.ts`

```typescript
import type { PageServerLoad } from './$types';
import { getDb } from '$lib/db';

export const load: PageServerLoad = async ({ url }) => {
  const db = await getDb();
  const search = url.searchParams.get('q') || '';

  const filter: Record<string, unknown> = { status: 'active', seatsAvailable: { $gt: 0 } };
  if (search) {
    filter['$or'] = [
      { eventName: { $regex: search, $options: 'i' } },
      { eventLocation: { $regex: search, $options: 'i' } }
    ];
  }

  const rides = await db
    .collection('rides')
    .find(filter)
    .sort({ departureTime: 1 })
    .limit(20)
    .toArray();

  return {
    rides: rides.map(r => ({
      _id: r._id.toString(),
      driverName: r.driverName as string,
      driverPhoto: r.driverPhoto as string | undefined,
      eventName: r.eventName as string,
      eventLocation: r.eventLocation as string,
      startLocation: r.startLocation as string,
      departureTime: (r.departureTime as Date).toISOString(),
      estimatedArrivalTime: (r.estimatedArrivalTime as Date).toISOString(),
      seats: r.seats as number,
      seatsAvailable: r.seatsAvailable as number,
      pricePerPerson: r.pricePerPerson as number
    })),
    search
  };
};
```

### `src/routes/+page.svelte`

```svelte
<script lang="ts">
  import RideCard from '$lib/components/RideCard.svelte';
  import CommunityCircle from '$lib/components/CommunityCircle.svelte';

  let { data } = $props();

  const communities = [
    { name: 'ZHAW', initial: 'Z', color: 'bg-blue-100', textColor: 'text-blue-600' },
    { name: 'Ski Club', initial: 'S', color: 'bg-sky-100', textColor: 'text-sky-600' },
    { name: 'O.S.G.', initial: 'O', color: 'bg-green-100', textColor: 'text-green-600' },
    { name: 'Wandern', initial: 'W', color: 'bg-emerald-100', textColor: 'text-emerald-600' },
    { name: 'Festival', initial: 'F', color: 'bg-rose-100', textColor: 'text-rose-600' },
    { name: 'Sport', initial: 'SP', color: 'bg-orange-100', textColor: 'text-orange-600' }
  ];

  let searchValue = $state(data.search ?? '');
</script>

<svelte:head>
  <title>EventRide – Mitfahrgelegenheiten für Events</title>
</svelte:head>

<div class="flex flex-col min-h-screen">
  <div class="px-4 pt-12 pb-4">
    <p class="text-gray-500 text-sm">Willkommen bei</p>
    <h1 class="text-2xl font-bold text-gray-900">EventRide 🎵</h1>
  </div>

  <div class="px-4 pb-4">
    <form method="GET" class="flex gap-2">
      <div class="flex-1 relative">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="m21 21-4.35-4.35"/>
        </svg>
        <input
          name="q"
          type="text"
          bind:value={searchValue}
          placeholder="Event oder Ort suchen..."
          class="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
        />
      </div>
      <button type="submit" class="bg-rose-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-rose-700 transition-colors">
        Suchen
      </button>
    </form>
  </div>

  <div class="px-4 pb-4">
    <div class="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
      {#each communities as c}
        <CommunityCircle name={c.name} initial={c.initial} color={c.color} textColor={c.textColor} />
      {/each}
    </div>
  </div>

  <div class="px-4 flex-1">
    <div class="flex items-center justify-between mb-3">
      <h2 class="font-bold text-gray-900 text-lg">Mitfahrgelegenheiten</h2>
      <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
      </svg>
    </div>

    {#if data.rides.length === 0}
      <div class="flex flex-col items-center justify-center py-16 text-center">
        <div class="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25"/>
          </svg>
        </div>
        <p class="text-gray-500 text-sm">Keine Fahrten gefunden</p>
        <a href="/rides/new" class="mt-4 bg-rose-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-rose-700 transition-colors">
          Erste Fahrt anbieten
        </a>
      </div>
    {:else}
      <div class="flex flex-col gap-4 pb-6">
        {#each data.rides as ride}
          <RideCard {ride} eventId={ride._id} />
        {/each}
      </div>
    {/if}
  </div>
</div>
```

---

## Authentifizierung

### `src/routes/auth/register/+page.server.ts`

```typescript
import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import bcrypt from 'bcrypt';
import { createSession } from '$lib/auth';

export const load: PageServerLoad = ({ locals }) => {
  if (locals.user) redirect(302, '/');
  return {};
};

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const firstName = (data.get('firstName') as string || '').trim();
    const lastName = (data.get('lastName') as string || '').trim();
    const email = (data.get('email') as string || '').trim().toLowerCase();
    const password = data.get('password') as string || '';

    if (!firstName || !lastName || !email || !password) {
      return fail(400, { error: 'Alle Pflichtfelder müssen ausgefüllt sein.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail(400, { error: 'Bitte eine gültige E-Mail-Adresse eingeben.' });
    }
    if (password.length < 8) {
      return fail(400, { error: 'Das Passwort muss mindestens 8 Zeichen lang sein.' });
    }

    const db = await getDb();
    const existing = await db.collection('users').findOne({ email });
    if (existing) {
      return fail(400, { error: 'Diese E-Mail-Adresse ist bereits registriert.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await db.collection('users').insertOne({
      firstName,
      lastName,
      email,
      passwordHash,
      rating: 0,
      totalRatings: 0,
      createdAt: new Date()
    });

    const token = await createSession(result.insertedId);
    cookies.set('sessionToken', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });

    redirect(302, '/');
  }
};
```

### `src/routes/auth/register/+page.svelte`

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';

  let { form } = $props();
  let loading = $state(false);
</script>

<svelte:head>
  <title>Registrieren – EventRide</title>
</svelte:head>

<div class="flex flex-col min-h-screen px-6 pt-16 pb-8">
  <div class="mb-8">
    <a href="/" class="text-gray-400 text-sm">← Zurück</a>
    <h1 class="text-2xl font-bold text-gray-900 mt-4">Konto erstellen</h1>
    <p class="text-gray-500 text-sm mt-1">Werde Teil der EventRide Community</p>
  </div>

  {#if form?.error}
    <div class="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
      {form.error}
    </div>
  {/if}

  <form method="POST" use:enhance={() => { loading = true; return ({ update }) => { loading = false; update(); }; }} class="flex flex-col gap-4">
    <div class="flex gap-3">
      <div class="flex-1">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">Vorname</label>
        <input name="firstName" type="text" required placeholder="Max" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm" />
      </div>
      <div class="flex-1">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">Nachname</label>
        <input name="lastName" type="text" required placeholder="Muster" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm" />
      </div>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1.5">E-Mail</label>
      <input name="email" type="email" required placeholder="max@beispiel.ch" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm" />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1.5">Passwort</label>
      <input name="password" type="password" required placeholder="Mindestens 8 Zeichen" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm" />
    </div>

    <button type="submit" disabled={loading} class="mt-2 w-full bg-gray-900 text-white py-3.5 rounded-2xl font-semibold text-sm hover:bg-gray-800 transition-colors disabled:opacity-60">
      {loading ? 'Wird registriert...' : 'Konto erstellen'}
    </button>
  </form>

  <p class="text-center text-sm text-gray-500 mt-6">
    Bereits ein Konto?
    <a href="/auth/login" class="text-rose-600 font-semibold">Anmelden</a>
  </p>
</div>
```

### `src/routes/auth/login/+page.server.ts`

```typescript
import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import bcrypt from 'bcrypt';
import { createSession } from '$lib/auth';

export const load: PageServerLoad = ({ locals }) => {
  if (locals.user) redirect(302, '/');
  return {};
};

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const email = (data.get('email') as string || '').trim().toLowerCase();
    const password = data.get('password') as string || '';

    if (!email || !password) {
      return fail(400, { error: 'E-Mail und Passwort sind erforderlich.' });
    }

    const db = await getDb();
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      return fail(400, { error: 'E-Mail oder Passwort ist falsch.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash as string);
    if (!valid) {
      return fail(400, { error: 'E-Mail oder Passwort ist falsch.' });
    }

    const token = await createSession(user._id);
    cookies.set('sessionToken', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });

    redirect(302, '/');
  }
};
```

### `src/routes/auth/login/+page.svelte`

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';

  let { form } = $props();
  let loading = $state(false);
</script>

<svelte:head>
  <title>Anmelden – EventRide</title>
</svelte:head>

<div class="flex flex-col min-h-screen px-6 pt-16 pb-8">
  <div class="mb-8">
    <a href="/" class="text-gray-400 text-sm">← Zurück</a>
    <h1 class="text-2xl font-bold text-gray-900 mt-4">Willkommen zurück</h1>
    <p class="text-gray-500 text-sm mt-1">Melde dich an, um Fahrten zu buchen</p>
  </div>

  {#if form?.error}
    <div class="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
      {form.error}
    </div>
  {/if}

  <form method="POST" use:enhance={() => { loading = true; return ({ update }) => { loading = false; update(); }; }} class="flex flex-col gap-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1.5">E-Mail</label>
      <input name="email" type="email" required placeholder="max@beispiel.ch" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm" />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1.5">Passwort</label>
      <input name="password" type="password" required placeholder="Dein Passwort" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm" />
    </div>

    <button type="submit" disabled={loading} class="mt-2 w-full bg-gray-900 text-white py-3.5 rounded-2xl font-semibold text-sm hover:bg-gray-800 transition-colors disabled:opacity-60">
      {loading ? 'Wird angemeldet...' : 'Anmelden'}
    </button>
  </form>

  <p class="text-center text-sm text-gray-500 mt-6">
    Noch kein Konto?
    <a href="/auth/register" class="text-rose-600 font-semibold">Registrieren</a>
  </p>
</div>
```

### `src/routes/auth/logout/+page.server.ts`

```typescript
import type { Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { deleteSession } from '$lib/auth';

export const actions: Actions = {
  default: async ({ cookies }) => {
    const token = cookies.get('sessionToken');
    if (token) {
      await deleteSession(token);
      cookies.delete('sessionToken', { path: '/' });
    }
    redirect(302, '/auth/login');
  }
};
```

---

## Fahrten

### `src/routes/rides/new/+page.server.ts`

```typescript
import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';

export const load: PageServerLoad = ({ locals }) => {
  if (!locals.user) redirect(302, '/auth/login');
  return {};
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    if (!locals.user) redirect(302, '/auth/login');

    const data = await request.formData();
    const eventName = (data.get('eventName') as string || '').trim();
    const eventLocation = (data.get('eventLocation') as string || '').trim();
    const startLocation = (data.get('startLocation') as string || '').trim();
    const departureDatetime = data.get('departureTime') as string || '';
    const arrivalDatetime = data.get('estimatedArrivalTime') as string || '';
    const seatsRaw = parseInt(data.get('seats') as string || '0');
    const priceRaw = parseFloat(data.get('pricePerPerson') as string || '0');

    if (!eventName || !eventLocation || !startLocation || !departureDatetime || !arrivalDatetime) {
      return fail(400, { error: 'Alle Pflichtfelder müssen ausgefüllt sein.' });
    }

    const departureTime = new Date(departureDatetime);
    const estimatedArrivalTime = new Date(arrivalDatetime);

    if (isNaN(departureTime.getTime()) || isNaN(estimatedArrivalTime.getTime())) {
      return fail(400, { error: 'Ungültige Zeitangaben.' });
    }

    if (departureTime.getTime() - Date.now() < 60 * 60 * 1000) {
      return fail(400, { error: 'Die Abfahrtszeit muss mindestens 1 Stunde in der Zukunft liegen.' });
    }

    if (seatsRaw < 1 || seatsRaw > 8) {
      return fail(400, { error: 'Bitte 1 bis 8 Sitzplätze angeben.' });
    }

    if (priceRaw < 1 || priceRaw > 200) {
      return fail(400, { error: 'Der Preis muss zwischen CHF 1 und CHF 200 liegen.' });
    }

    const db = await getDb();
    const result = await db.collection('rides').insertOne({
      driverId: new ObjectId(locals.user.id),
      driverName: `${locals.user.firstName} ${locals.user.lastName}`,
      driverPhoto: locals.user.profilePicture,
      eventName,
      eventLocation,
      startLocation,
      departureTime,
      estimatedArrivalTime,
      seats: seatsRaw,
      seatsAvailable: seatsRaw,
      pricePerPerson: priceRaw,
      fairplayWindowMinutes: 10,
      status: 'active',
      createdAt: new Date()
    });

    redirect(302, `/rides/${result.insertedId}/publish-success`);
  }
};
```

### `src/routes/rides/new/+page.svelte`

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';

  let { form } = $props();
  let loading = $state(false);
</script>

<svelte:head>
  <title>Fahrt anbieten – EventRide</title>
</svelte:head>

<div class="flex flex-col min-h-screen px-4 pt-12 pb-8">
  <div class="mb-6">
    <a href="/" class="text-gray-400 text-sm">← Zurück</a>
    <h1 class="text-2xl font-bold text-gray-900 mt-4">Fahrt anbieten</h1>
    <p class="text-gray-500 text-sm mt-1">Biete anderen eine Mitfahrgelegenheit an</p>
  </div>

  {#if form?.error}
    <div class="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
      {form.error}
    </div>
  {/if}

  <form method="POST" use:enhance={() => { loading = true; return ({ update }) => { loading = false; update(); }; }} class="flex flex-col gap-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1.5">Event Name</label>
      <div class="relative">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
        </svg>
        <input name="eventName" type="text" required placeholder="z.B. Openair Frauenfeld" class="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm" />
      </div>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1.5">Event Ort</label>
      <input name="eventLocation" type="text" required placeholder="z.B. Frauenfeld, TG" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm" />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1.5">Dein Startort</label>
      <input name="startLocation" type="text" required placeholder="z.B. Zürich HB" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm" />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1.5">Abfahrtsdatum und -zeit</label>
      <input name="departureTime" type="datetime-local" required class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm" />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1.5">Geschätzte Ankunftszeit am Event</label>
      <input name="estimatedArrivalTime" type="datetime-local" required class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm" />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1.5">Freie Sitzplätze</label>
      <input name="seats" type="number" min="1" max="8" required placeholder="z.B. 3" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm" />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1.5">Kostenbeteiligung p.P. (CHF)</label>
      <div class="relative">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">CHF</span>
        <input name="pricePerPerson" type="number" min="1" max="200" step="0.5" required placeholder="20.00" class="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm" />
      </div>
    </div>

    <button type="submit" disabled={loading} class="mt-4 w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-sm hover:bg-gray-800 transition-colors disabled:opacity-60">
      {loading ? 'Wird veröffentlicht...' : 'Fahrt jetzt veröffentlichen'}
    </button>
  </form>
</div>
```

### `src/routes/rides/[id]/+page.server.ts`

```typescript
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';

export const load: PageServerLoad = async ({ params }) => {
  const db = await getDb();

  let rideId: ObjectId;
  try {
    rideId = new ObjectId(params.id);
  } catch {
    error(404, 'Fahrt nicht gefunden');
  }

  const ride = await db.collection('rides').findOne({ _id: rideId });
  if (!ride) error(404, 'Fahrt nicht gefunden');

  const allRides = await db
    .collection('rides')
    .find({ eventName: ride.eventName, status: 'active', seatsAvailable: { $gt: 0 } })
    .sort({ departureTime: 1 })
    .toArray();

  return {
    ride: {
      _id: ride._id.toString(),
      driverName: ride.driverName as string,
      driverPhoto: ride.driverPhoto as string | undefined,
      eventName: ride.eventName as string,
      eventLocation: ride.eventLocation as string,
      eventImage: ride.eventImage as string | undefined,
      startLocation: ride.startLocation as string,
      departureTime: (ride.departureTime as Date).toISOString(),
      estimatedArrivalTime: (ride.estimatedArrivalTime as Date).toISOString(),
      seats: ride.seats as number,
      seatsAvailable: ride.seatsAvailable as number,
      pricePerPerson: ride.pricePerPerson as number,
      status: ride.status as string
    },
    allRides: allRides.map(r => ({
      _id: r._id.toString(),
      driverName: r.driverName as string,
      driverPhoto: r.driverPhoto as string | undefined,
      startLocation: r.startLocation as string,
      departureTime: (r.departureTime as Date).toISOString(),
      estimatedArrivalTime: (r.estimatedArrivalTime as Date).toISOString(),
      seats: r.seats as number,
      seatsAvailable: r.seatsAvailable as number,
      pricePerPerson: r.pricePerPerson as number
    }))
  };
};
```

### `src/routes/rides/[id]/+page.svelte`

```svelte
<script lang="ts">
  import RideCard from '$lib/components/RideCard.svelte';
  import { formatDate } from '$lib/time';

  let { data } = $props();
</script>

<svelte:head>
  <title>{data.ride.eventName} – EventRide</title>
</svelte:head>

<div class="flex flex-col min-h-screen">
  <div class="relative">
    {#if data.ride.eventImage}
      <img src={data.ride.eventImage} alt={data.ride.eventName} class="w-full h-52 object-cover rounded-b-3xl" />
    {:else}
      <div class="w-full h-52 bg-gradient-to-br from-rose-400 to-rose-600 rounded-b-3xl flex items-center justify-center">
        <span class="text-white text-5xl">🎵</span>
      </div>
    {/if}
    <a href="/" class="absolute top-4 left-4 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow">
      <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
      </svg>
    </a>
    <button class="absolute top-4 right-4 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow">
      <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
      </svg>
    </button>
  </div>

  <div class="px-4 pt-4">
    <h1 class="text-xl font-bold text-gray-900">{data.ride.eventName}</h1>
    <p class="text-sm text-gray-500 mt-0.5">{data.ride.eventLocation} · {formatDate(data.ride.departureTime)}</p>
  </div>

  <div class="px-4 mt-4">
    <div class="relative">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
      </svg>
      <input type="text" placeholder="Dein Abholstandort" class="w-full pl-9 pr-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
    </div>
  </div>

  <div class="px-4 mt-6">
    <h2 class="font-bold text-gray-900 text-lg mb-3">Aktuelle Mitfahrgelegenheiten</h2>
    {#if data.allRides.length === 0}
      <p class="text-gray-500 text-sm text-center py-8">Noch keine Fahrten für diesen Event</p>
    {:else}
      <div class="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {#each data.allRides as ride}
          <div class="min-w-[280px]">
            <RideCard {ride} eventId={data.ride._id} />
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="px-4 mt-6 flex flex-col items-center gap-3">
    <div class="flex items-center gap-3 w-full">
      <div class="flex-1 h-px bg-gray-200"></div>
      <span class="text-gray-400 text-sm">Oder</span>
      <div class="flex-1 h-px bg-gray-200"></div>
    </div>
    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
    </svg>
    <a href="/rides/new" class="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-sm text-center hover:bg-gray-800 transition-colors">
      Mitfahrgelegenheit anbieten
    </a>
  </div>

  <div class="h-8"></div>
</div>
```

### `src/routes/rides/[id]/book/+page.server.ts`

```typescript
import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';
import { calcPickupTimes } from '$lib/time';

export const load: PageServerLoad = async ({ params, locals, url }) => {
  if (!locals.user) redirect(302, `/auth/login?redirect=/rides/${params.id}/book`);

  const db = await getDb();
  const rideIdStr = url.searchParams.get('rideId') || params.id;

  let rideId: ObjectId;
  try {
    rideId = new ObjectId(rideIdStr);
  } catch {
    error(404, 'Fahrt nicht gefunden');
  }

  const ride = await db.collection('rides').findOne({ _id: rideId, status: 'active' });
  if (!ride) error(404, 'Fahrt nicht gefunden oder nicht mehr verfügbar');

  return {
    ride: {
      _id: ride._id.toString(),
      driverName: ride.driverName as string,
      driverPhoto: ride.driverPhoto as string | undefined,
      eventName: ride.eventName as string,
      eventLocation: ride.eventLocation as string,
      startLocation: ride.startLocation as string,
      departureTime: (ride.departureTime as Date).toISOString(),
      estimatedArrivalTime: (ride.estimatedArrivalTime as Date).toISOString(),
      seats: ride.seats as number,
      seatsAvailable: ride.seatsAvailable as number,
      pricePerPerson: ride.pricePerPerson as number
    },
    eventId: params.id
  };
};

export const actions: Actions = {
  default: async ({ request, params, locals, url }) => {
    if (!locals.user) redirect(302, '/auth/login');

    const data = await request.formData();
    const pickupLocation = (data.get('pickupLocation') as string || '').trim();
    const agreeTerms = data.get('agreeTerms');
    const rideIdStr = (data.get('rideId') as string) || url.searchParams.get('rideId') || params.id;

    if (!pickupLocation) {
      return fail(400, { error: 'Bitte gib deinen Abholort an.' });
    }
    if (!agreeTerms) {
      return fail(400, { error: 'Du musst den AGB zustimmen.' });
    }

    const db = await getDb();
    let rideId: ObjectId;
    try {
      rideId = new ObjectId(rideIdStr);
    } catch {
      return fail(400, { error: 'Ungültige Fahrt.' });
    }

    const ride = await db.collection('rides').findOne({ _id: rideId, status: 'active' });
    if (!ride) return fail(400, { error: 'Fahrt nicht gefunden.' });

    const departureTime = ride.departureTime as Date;
    if (Date.now() + 30 * 60 * 1000 > departureTime.getTime()) {
      return fail(400, { error: 'Diese Fahrt startet in weniger als 30 Minuten. Eine Buchung ist nicht mehr möglich.' });
    }

    if ((ride.seatsAvailable as number) <= 0) {
      return fail(400, { error: 'Keine freien Plätze mehr verfügbar.' });
    }

    if (ride.driverId.toString() === locals.user.id) {
      return fail(400, { error: 'Du kannst deine eigene Fahrt nicht buchen.' });
    }

    const passengerId = new ObjectId(locals.user.id);
    const existingBooking = await db.collection('bookings').findOne({
      rideId,
      passengerId,
      status: { $nin: ['cancelled'] }
    });
    if (existingBooking) {
      return fail(400, { error: 'Du hast diese Fahrt bereits gebucht.' });
    }

    if (pickupLocation.toLowerCase() === (ride.startLocation as string).toLowerCase()) {
      return fail(400, { error: 'Dein Abholort darf nicht gleich dem Startort des Fahrers sein.' });
    }

    const { estimatedPickupTime, mustArriveBy, latestArrivalTime } = calcPickupTimes(departureTime);

    await db.collection('bookings').insertOne({
      rideId,
      passengerId,
      passengerName: `${locals.user.firstName} ${locals.user.lastName}`,
      pickupLocation,
      estimatedPickupTime,
      mustArriveBy,
      latestArrivalTime,
      status: 'confirmed',
      paymentStatus: 'pending',
      createdAt: new Date()
    });

    await db.collection('rides').updateOne({ _id: rideId }, { $inc: { seatsAvailable: -1 } });

    redirect(302, `/rides/${params.id}/success?rideId=${rideIdStr}`);
  }
};
```

### `src/routes/rides/[id]/book/+page.svelte`

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  import { formatTime, formatDate } from '$lib/time';

  let { data, form } = $props();
  let loading = $state(false);
  let agreed = $state(false);

  function initials(name: string) {
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }
</script>

<svelte:head>
  <title>Mitfahren – {data.ride.eventName}</title>
</svelte:head>

<div class="flex flex-col min-h-screen px-4 pt-12 pb-8">
  <div class="mb-6">
    <a href="/rides/{data.eventId}" class="text-gray-400 text-sm">← Zurück</a>
    <h1 class="text-2xl font-bold text-gray-900 mt-4">Mitfahrt buchen</h1>
  </div>

  <div class="bg-white rounded-2xl shadow-md p-4 mb-4">
    <div class="flex items-center gap-3 mb-3">
      {#if data.ride.driverPhoto}
        <img src={data.ride.driverPhoto} alt={data.ride.driverName} class="w-14 h-14 rounded-full object-cover" />
      {:else}
        <div class="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold">
          {initials(data.ride.driverName)}
        </div>
      {/if}
      <div>
        <p class="font-semibold text-gray-900">{data.ride.driverName}</p>
        <span class="flex items-center gap-1 bg-rose-50 text-rose-600 text-xs font-semibold px-2 py-0.5 rounded-full w-fit mt-0.5">
          {data.ride.seatsAvailable} Plätze frei
        </span>
      </div>
    </div>
    <div class="bg-gray-50 rounded-xl p-3 flex flex-col gap-2">
      <div class="flex justify-between text-sm">
        <span class="text-gray-500">Event</span>
        <span class="font-medium text-gray-800">{data.ride.eventName}</span>
      </div>
      <div class="flex justify-between text-sm">
        <span class="text-gray-500">Start</span>
        <span class="font-medium text-gray-800">{formatTime(data.ride.departureTime)} · {data.ride.startLocation}</span>
      </div>
      <div class="flex justify-between text-sm">
        <span class="text-gray-500">Datum</span>
        <span class="font-medium text-gray-800">{formatDate(data.ride.departureTime)}</span>
      </div>
      <div class="flex justify-between text-sm">
        <span class="text-gray-500">Preis</span>
        <span class="font-bold text-gray-900">CHF {data.ride.pricePerPerson.toFixed(2)}</span>
      </div>
    </div>
  </div>

  {#if form?.error}
    <div class="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
      {form.error}
    </div>
  {/if}

  <form method="POST" use:enhance={() => { loading = true; return ({ update }) => { loading = false; update(); }; }} class="flex flex-col gap-4">
    <input type="hidden" name="rideId" value={data.ride._id} />

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1.5">Dein Abholort</label>
      <div class="relative">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
        </svg>
        <input name="pickupLocation" type="text" required placeholder="z.B. Winterthur Bahnhof" class="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm" />
      </div>
    </div>

    <div class="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <p class="text-sm font-semibold text-amber-800 mb-1">Wichtiger Hinweis</p>
      <p class="text-xs text-amber-700 leading-relaxed">
        Fairplay-Regel: Sei pünktlich an deinem Abholort. Der Fahrer wartet maximal 10 Minuten.
        Bei Nichterscheinen behält der Fahrer den vollen Betrag. Bei Stornierung weniger als
        2 Stunden vor Abfahrt werden 50% einbehalten.
      </p>
    </div>

    <label class="flex items-start gap-3 cursor-pointer">
      <input type="checkbox" name="agreeTerms" bind:checked={agreed} class="mt-0.5 w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-300" />
      <span class="text-sm text-gray-600">Ich akzeptiere die <a href="#" class="text-rose-600 underline">AGB</a> und die Fairplay-Regel</span>
    </label>

    <button type="submit" disabled={loading || !agreed} class="mt-2 w-full bg-rose-600 text-white py-4 rounded-2xl font-bold text-sm hover:bg-rose-700 transition-colors disabled:opacity-50">
      {loading ? 'Wird gebucht...' : 'Mitfahrgelegenheit buchen'}
    </button>
  </form>
</div>
```

### `src/routes/rides/[id]/success/+page.svelte`

```svelte
<svelte:head>
  <title>Buchung erfolgreich – EventRide</title>
</svelte:head>

<div class="flex flex-col min-h-screen items-center justify-center px-6 text-center">
  <div class="text-7xl mb-6">✓</div>
  <h1 class="text-2xl font-bold text-gray-900">Mitfahrt erfolgreich!</h1>
  <p class="text-gray-500 text-sm mt-3 leading-relaxed max-w-xs">
    Deine Buchung wurde bestätigt. Achte auf die Zeitangaben und sei pünktlich an deinem Abholort.
  </p>
  <a href="/my/bookings" class="mt-8 text-rose-600 font-semibold text-sm">
    Meine Buchungen anzeigen →
  </a>
</div>
```

### `src/routes/rides/[id]/publish-success/+page.svelte`

```svelte
<svelte:head>
  <title>Fahrt veröffentlicht – EventRide</title>
</svelte:head>

<div class="flex flex-col min-h-screen items-center justify-center px-6 text-center">
  <div class="text-7xl mb-6">✓</div>
  <h1 class="text-2xl font-bold text-gray-900">Fahrt erfolgreich veröffentlicht!</h1>
  <p class="text-gray-500 text-sm mt-3 leading-relaxed max-w-xs">
    Deine Fahrt ist jetzt sichtbar und andere können mitfahren.
  </p>
  <a href="/my/rides" class="mt-8 text-rose-600 font-semibold text-sm">
    Meine Fahrten anzeigen →
  </a>
</div>
```

---

## Mein Bereich

### `src/routes/my/rides/+page.server.ts`

```typescript
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(302, '/auth/login');

  const db = await getDb();
  const rides = await db
    .collection('rides')
    .find({ driverId: new ObjectId(locals.user.id) })
    .sort({ departureTime: -1 })
    .toArray();

  return {
    rides: rides.map(r => ({
      _id: r._id.toString(),
      eventName: r.eventName as string,
      eventLocation: r.eventLocation as string,
      startLocation: r.startLocation as string,
      departureTime: (r.departureTime as Date).toISOString(),
      estimatedArrivalTime: (r.estimatedArrivalTime as Date).toISOString(),
      seats: r.seats as number,
      seatsAvailable: r.seatsAvailable as number,
      pricePerPerson: r.pricePerPerson as number,
      status: r.status as string
    }))
  };
};
```

### `src/routes/my/rides/+page.svelte`

```svelte
<script lang="ts">
  import { formatDate, formatTime } from '$lib/time';

  let { data } = $props();

  const statusLabels: Record<string, string> = {
    active: 'Aktiv',
    cancelled: 'Storniert',
    completed: 'Abgeschlossen'
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700'
  };
</script>

<svelte:head>
  <title>Meine Fahrten – EventRide</title>
</svelte:head>

<div class="flex flex-col min-h-screen px-4 pt-12 pb-8">
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-2xl font-bold text-gray-900">Meine Fahrten</h1>
    <a href="/rides/new" class="bg-rose-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
      + Neue Fahrt
    </a>
  </div>

  {#if data.rides.length === 0}
    <div class="flex flex-col items-center justify-center py-16 text-center">
      <p class="text-gray-500 text-sm mb-4">Du hast noch keine Fahrten angeboten</p>
      <a href="/rides/new" class="bg-rose-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold">
        Erste Fahrt anbieten
      </a>
    </div>
  {:else}
    <div class="flex flex-col gap-4">
      {#each data.rides as ride}
        <div class="bg-white rounded-2xl shadow-md p-4">
          <div class="flex items-start justify-between mb-2">
            <div>
              <p class="font-semibold text-gray-900">{ride.eventName}</p>
              <p class="text-sm text-gray-500">{ride.eventLocation}</p>
            </div>
            <span class="text-xs font-semibold px-2 py-1 rounded-full {statusColors[ride.status] || 'bg-gray-100 text-gray-600'}">
              {statusLabels[ride.status] || ride.status}
            </span>
          </div>
          <div class="bg-gray-50 rounded-xl p-3 flex flex-col gap-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Abfahrt</span>
              <span class="font-medium">{formatDate(ride.departureTime)}, {formatTime(ride.departureTime)}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Startort</span>
              <span class="font-medium">{ride.startLocation}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Plätze</span>
              <span class="font-medium">{ride.seatsAvailable}/{ride.seats} frei</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Preis p.P.</span>
              <span class="font-bold">CHF {ride.pricePerPerson.toFixed(2)}</span>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
```

### `src/routes/my/bookings/+page.server.ts`

```typescript
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(302, '/auth/login');

  const db = await getDb();
  const bookings = await db
    .collection('bookings')
    .find({ passengerId: new ObjectId(locals.user.id) })
    .sort({ createdAt: -1 })
    .toArray();

  const enriched = await Promise.all(
    bookings.map(async b => {
      const ride = await db.collection('rides').findOne({ _id: b.rideId });
      return {
        _id: b._id.toString(),
        pickupLocation: b.pickupLocation as string,
        estimatedPickupTime: (b.estimatedPickupTime as Date).toISOString(),
        mustArriveBy: (b.mustArriveBy as Date).toISOString(),
        latestArrivalTime: (b.latestArrivalTime as Date).toISOString(),
        status: b.status as string,
        paymentStatus: b.paymentStatus as string,
        ride: ride ? {
          eventName: ride.eventName as string,
          eventLocation: ride.eventLocation as string,
          departureTime: (ride.departureTime as Date).toISOString(),
          estimatedArrivalTime: (ride.estimatedArrivalTime as Date).toISOString(),
          driverName: ride.driverName as string,
          pricePerPerson: ride.pricePerPerson as number
        } : undefined
      };
    })
  );

  return { bookings: enriched };
};
```

### `src/routes/my/bookings/+page.svelte`

```svelte
<script lang="ts">
  import BookingCard from '$lib/components/BookingCard.svelte';

  let { data } = $props();
</script>

<svelte:head>
  <title>Meine Buchungen – EventRide</title>
</svelte:head>

<div class="flex flex-col min-h-screen px-4 pt-12 pb-8">
  <h1 class="text-2xl font-bold text-gray-900 mb-6">Meine Buchungen</h1>

  {#if data.bookings.length === 0}
    <div class="flex flex-col items-center justify-center py-16 text-center">
      <p class="text-gray-500 text-sm mb-4">Du hast noch keine Fahrten gebucht</p>
      <a href="/" class="bg-rose-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold">
        Fahrten entdecken
      </a>
    </div>
  {:else}
    <div class="flex flex-col gap-4">
      {#each data.bookings as booking}
        <BookingCard {booking} />
      {/each}
    </div>
  {/if}
</div>
```

### `src/routes/my/profile/+page.server.ts`

```typescript
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(302, '/auth/login');

  const db = await getDb();
  const user = await db.collection('users').findOne({ _id: new ObjectId(locals.user.id) });

  const ratings = await db
    .collection('ratings')
    .find({ toUserId: new ObjectId(locals.user.id) })
    .sort({ createdAt: -1 })
    .toArray();

  const ridesCount = await db.collection('rides').countDocuments({ driverId: new ObjectId(locals.user.id) });
  const bookingsCount = await db.collection('bookings').countDocuments({ passengerId: new ObjectId(locals.user.id) });

  return {
    profile: {
      firstName: user?.firstName as string,
      lastName: user?.lastName as string,
      email: user?.email as string,
      profilePicture: user?.profilePicture as string | undefined,
      rating: user?.rating as number || 0,
      totalRatings: user?.totalRatings as number || 0,
      createdAt: (user?.createdAt as Date)?.toISOString()
    },
    ratings: ratings.map(r => ({
      _id: r._id.toString(),
      stars: r.stars as number,
      comment: r.comment as string | undefined,
      role: r.role as string,
      createdAt: (r.createdAt as Date).toISOString()
    })),
    stats: { ridesCount, bookingsCount }
  };
};
```

### `src/routes/my/profile/+page.svelte`

```svelte
<script lang="ts">
  import StarRating from '$lib/components/StarRating.svelte';
  import { formatDate } from '$lib/time';
  import { enhance } from '$app/forms';

  let { data } = $props();

  function initials(firstName: string, lastName: string) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
</script>

<svelte:head>
  <title>Mein Profil – EventRide</title>
</svelte:head>

<div class="flex flex-col min-h-screen px-4 pt-12 pb-8">
  <h1 class="text-2xl font-bold text-gray-900 mb-6">Profil</h1>

  <div class="bg-white rounded-2xl shadow-md p-6 flex flex-col items-center mb-6">
    {#if data.profile.profilePicture}
      <img src={data.profile.profilePicture} alt="Profilbild" class="w-20 h-20 rounded-full object-cover mb-3" />
    {:else}
      <div class="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-2xl mb-3">
        {initials(data.profile.firstName, data.profile.lastName)}
      </div>
    {/if}
    <p class="font-bold text-gray-900 text-lg">{data.profile.firstName} {data.profile.lastName}</p>
    <p class="text-sm text-gray-500">{data.profile.email}</p>
    {#if data.profile.totalRatings > 0}
      <div class="flex items-center gap-2 mt-2">
        <StarRating value={Math.round(data.profile.rating)} />
        <span class="text-sm text-gray-500">({data.profile.totalRatings} Bewertungen)</span>
      </div>
    {/if}
  </div>

  <div class="grid grid-cols-2 gap-4 mb-6">
    <a href="/my/rides" class="bg-white rounded-2xl shadow-md p-4 text-center">
      <p class="text-2xl font-bold text-gray-900">{data.stats.ridesCount}</p>
      <p class="text-sm text-gray-500 mt-1">Angebotene Fahrten</p>
    </a>
    <a href="/my/bookings" class="bg-white rounded-2xl shadow-md p-4 text-center">
      <p class="text-2xl font-bold text-gray-900">{data.stats.bookingsCount}</p>
      <p class="text-sm text-gray-500 mt-1">Buchungen</p>
    </a>
  </div>

  {#if data.ratings.length > 0}
    <h2 class="font-bold text-gray-900 mb-3">Bewertungen</h2>
    <div class="flex flex-col gap-3 mb-6">
      {#each data.ratings as rating}
        <div class="bg-white rounded-2xl shadow-sm p-4">
          <div class="flex items-center justify-between mb-1">
            <StarRating value={rating.stars} />
            <span class="text-xs text-gray-400">{formatDate(rating.createdAt)}</span>
          </div>
          {#if rating.comment}
            <p class="text-sm text-gray-600 mt-1">"{rating.comment}"</p>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <form method="POST" action="/auth/logout" use:enhance>
    <button type="submit" class="w-full border border-gray-200 text-gray-600 py-3.5 rounded-2xl font-semibold text-sm hover:bg-gray-50 transition-colors">
      Abmelden
    </button>
  </form>
</div>
```

### `src/routes/my/notifications/+page.server.ts`

```typescript
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = ({ locals }) => {
  if (!locals.user) redirect(302, '/auth/login');
  return {};
};
```

### `src/routes/my/notifications/+page.svelte`

```svelte
<svelte:head>
  <title>Benachrichtigungen – EventRide</title>
</svelte:head>

<div class="flex flex-col min-h-screen px-4 pt-12 pb-8">
  <h1 class="text-2xl font-bold text-gray-900 mb-6">Benachrichtigungen</h1>
  <div class="flex flex-col items-center justify-center py-16 text-center">
    <p class="text-gray-500 text-sm">Keine neuen Benachrichtigungen</p>
  </div>
</div>
```

---

## Suche

### `src/routes/search/+page.svelte`

```svelte
<script lang="ts">
  let query = $state('');
</script>

<svelte:head>
  <title>Suchen – EventRide</title>
</svelte:head>

<div class="flex flex-col min-h-screen px-4 pt-12 pb-8">
  <h1 class="text-2xl font-bold text-gray-900 mb-4">Suchen</h1>
  <form method="GET" action="/">
    <div class="relative">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="m21 21-4.35-4.35"/>
      </svg>
      <input name="q" type="text" bind:value={query} placeholder="Event oder Ort suchen..." autofocus class="w-full pl-9 pr-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
    </div>
    <button type="submit" class="mt-3 w-full bg-rose-600 text-white py-3 rounded-xl font-semibold text-sm">Suchen</button>
  </form>
</div>
```
