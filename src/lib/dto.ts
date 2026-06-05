import type { WithId, Document } from 'mongodb';
import type { TimeAccuracy } from '$lib/routing';
import type { EventCategory } from '$lib/types';

// Oeffentliches Ride-DTO — sicher an jeden Client sendbar.
// NIEMALS startLocationExact, startCoords (exact) oder interne IDs hineingeben.
export interface PublicRideDTO {
  _id: string;
  driverId: string;
  driverName: string;
  driverPhoto?: string;
  driverRating?: number;
  eventName: string;
  eventCategory?: EventCategory;
  eventLocation: string;
  eventImage?: string;
  // Stadtebene-Koordinaten des Fahrer-Startorts — fuer Haversine-Vorschau im Browser OK
  startCoordsRough?: { lat: number; lon: number };
  // Event-Koordinaten — oeffentlich (Veranstaltungsort ist bekannt)
  eventLocationCoords?: { lat: number; lon: number };
  startLocation: string; // grobe Stadt, nie exakte Adresse
  departureTime: string;
  estimatedArrivalTime: string;
  seats: number;
  seatsAvailable: number;
  pricePerPerson: number;
  fairplayWindowMinutes: number;
  noShowPolicy: { waitMinutes: number; penaltyPercent: number };
  routeVersion: number;
  status: string;
  // Teilnehmer-Sichtbarkeit (privacy-safe aggregated counts)
  acceptedCount?: number;   // bestaetigte Mitfahrer
  pendingCount?: number;    // offene Anfragen (nur als Zahl, keine Namen)
  // Bestaetigte Mitfahrer: nur Vorname + Initial (Vorname A.) — sichtbar fuer alle Beteiligten
  confirmedPassengers?: Array<{ displayName: string }>;
}

// Was ein Mitfahrer ueber seine eigene Buchung sehen darf
export interface PublicBookingDTO {
  _id: string;
  pickupLocation: string;
  // Zeiten sind nur gesetzt nach driver-accept (status === 'accepted')
  estimatedPickupTime?: string;
  recommendedReadyTime?: string;
  latestReadyTime?: string;
  estimatedArrivalAtEvent?: string;
  bookedPrice?: number;
  cancellationFee?: number;
  timeAccuracy?: TimeAccuracy;
  routeVersion?: number;
  status: string;
  paymentStatus: string;
  noShowPolicySnapshot?: { waitMinutes: number; penaltyPercent: number };
  ride?: {
    _id?: string;
    eventName: string;
    eventLocation: string;
    departureTime: string;
    driverName: string;
    driverId?: string;
    pricePerPerson: number;
    startLocation: string;
  };
}

function toISO(v: unknown): string {
  if (!v) return new Date(0).toISOString();
  if (v instanceof Date) return v.toISOString();
  return new Date(v as string).toISOString();
}

function parseCoords(raw: unknown): { lat: number; lon: number } | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const c = raw as { lat?: unknown; lon?: unknown };
  const lat = parseFloat(String(c.lat ?? ''));
  const lon = parseFloat(String(c.lon ?? ''));
  if (isNaN(lat) || isNaN(lon)) return undefined;
  return { lat, lon };
}

export function toPublicRideDTO(
  r: WithId<Document>,
  opts?: {
    acceptedCount?: number;
    pendingCount?: number;
    confirmedPassengers?: Array<{ displayName: string }>;
  }
): PublicRideDTO {
  const noShowPolicy = (r.noShowPolicy as { waitMinutes: number; penaltyPercent: number } | undefined) ?? {
    waitMinutes: 15,
    penaltyPercent: 100
  };
  return {
    _id: r._id.toString(),
    driverId: r.driverId?.toString() ?? '',
    driverName: r.driverName as string,
    driverPhoto: r.driverPhoto as string | undefined,
    driverRating: r.driverRating as number | undefined,
    eventName: r.eventName as string,
    eventCategory: (r.eventCategory as EventCategory | undefined) ?? 'other',
    eventLocation: r.eventLocation as string,
    eventImage: r.eventImage as string | undefined,
    startLocation: r.startLocation as string,
    startCoordsRough: parseCoords(r.startCoordsRough),
    eventLocationCoords: parseCoords(r.eventLocationCoords),
    departureTime: toISO(r.departureTime),
    estimatedArrivalTime: toISO(r.estimatedArrivalTime),
    seats: r.seats as number,
    seatsAvailable: r.seatsAvailable as number,
    pricePerPerson: r.pricePerPerson as number,
    fairplayWindowMinutes: (r.fairplayWindowMinutes as number) ?? 10,
    noShowPolicy,
    routeVersion: (r.routeVersion as number) ?? 0,
    status: r.status as string,
    acceptedCount: opts?.acceptedCount,
    pendingCount: opts?.pendingCount,
    confirmedPassengers: opts?.confirmedPassengers
  };
}

export function toPublicBookingDTO(
  b: WithId<Document>,
  ride?: WithId<Document> | null
): PublicBookingDTO {
  const noShowSnapshot = b.noShowPolicySnapshot as
    | { waitMinutes: number; penaltyPercent: number }
    | undefined;

  return {
    _id: b._id.toString(),
    pickupLocation: b.pickupLocation as string,
    // Zeiten nur senden wenn vorhanden (nach driver-accept)
    estimatedPickupTime: b.estimatedPickupTime ? toISO(b.estimatedPickupTime) : undefined,
    recommendedReadyTime: b.recommendedReadyTime ? toISO(b.recommendedReadyTime) : undefined,
    latestReadyTime: b.latestReadyTime ? toISO(b.latestReadyTime) : undefined,
    estimatedArrivalAtEvent: b.estimatedArrivalAtEvent ? toISO(b.estimatedArrivalAtEvent) : undefined,
    bookedPrice: b.bookedPrice as number | undefined,
    cancellationFee: b.cancellationFee as number | undefined,
    timeAccuracy: b.timeAccuracy as TimeAccuracy | undefined,
    routeVersion: b.routeVersion as number | undefined,
    status: b.status as string,
    paymentStatus: b.paymentStatus as string,
    noShowPolicySnapshot: noShowSnapshot,
    ride: ride
      ? {
          _id: ride._id.toString(),
          eventName: ride.eventName as string,
          eventLocation: ride.eventLocation as string,
          departureTime: toISO(ride.departureTime),
          driverName: ride.driverName as string,
          driverId: ride.driverId?.toString(),
          pricePerPerson: ride.pricePerPerson as number,
          startLocation: ride.startLocation as string
        }
      : undefined
  };
}
