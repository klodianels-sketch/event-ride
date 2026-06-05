import { osrmRoute } from '$lib/routing';
import type { TimeAccuracy } from '$lib/routing';

// 2 Minuten Einsteige-Zeit pro Stopp
const STOP_DWELL_SECONDS = 120;
// Mitfahrer soll 5 Minuten vor der geschaetzten Abholzeit bereit sein
const RECOMMENDED_BUFFER_MINUTES = 5;

export interface StopInput {
  bookingId: string;
  coords: { lat: string; lon: string };
  pickupLocation: string;
}

export interface TimedStop extends StopInput {
  estimatedPickupTime: Date;
  recommendedReadyTime: Date;
  latestReadyTime: Date;
  estimatedArrivalAtEvent: Date;
  timeAccuracy: TimeAccuracy;
}

export interface PlanResult {
  stops: TimedStop[];
  rideEstimatedArrivalTime: Date;
  totalDurationSeconds: number;
  timeAccuracy: TimeAccuracy;
}

// Projiziert Punkt P auf Linie A→B, gibt Skalar zurueck (0=A, 1=B)
function projectScalar(
  ax: number, ay: number,
  bx: number, by: number,
  px: number, py: number
): number {
  const abx = bx - ax, aby = by - ay;
  const apx = px - ax, apy = py - ay;
  const ab2 = abx * abx + aby * aby;
  if (ab2 === 0) return 0;
  return (apx * abx + apy * aby) / ab2;
}

// Sortiert Stopps geografisch entlang des Start→Event-Vektors (Projektionsheuristik)
// Stopps naeh am Start kommen zuerst, nahe am Event zuletzt.
// Kein Traveling-Salesman-Problem — pragmatisch und schnell.
export function sortStopsByProjection(
  start: { lat: string; lon: string },
  event: { lat: string; lon: string },
  stops: StopInput[]
): StopInput[] {
  const sx = parseFloat(start.lon), sy = parseFloat(start.lat);
  const ex = parseFloat(event.lon), ey = parseFloat(event.lat);
  return [...stops].sort((a, b) => {
    const pa = projectScalar(sx, sy, ex, ey, parseFloat(a.coords.lon), parseFloat(a.coords.lat));
    const pb = projectScalar(sx, sy, ex, ey, parseFloat(b.coords.lon), parseFloat(b.coords.lat));
    return pa - pb;
  });
}

// Berechnet die vollstaendige Route mit allen Stopps.
// allStops enthaelt ALLE Passagiere (bestehende + neuer).
// Gibt sortierte, zeitberechnete Stopps zurueck.
export async function planRoute(
  startCoords: { lat: string; lon: string },
  eventCoords: { lat: string; lon: string },
  departureTime: Date,
  allStops: StopInput[],
  fairplayWindowMinutes: number
): Promise<PlanResult> {
  const sortedStops = allStops.length > 0
    ? sortStopsByProjection(startCoords, eventCoords, allStops)
    : [];

  const waypoints = [
    { lat: startCoords.lat, lon: startCoords.lon },
    ...sortedStops.map(s => ({ lat: s.coords.lat, lon: s.coords.lon })),
    { lat: eventCoords.lat, lon: eventCoords.lon }
  ];

  const route = await osrmRoute(waypoints);

  if (sortedStops.length === 0) {
    return {
      stops: [],
      rideEstimatedArrivalTime: new Date(departureTime.getTime() + route.totalSeconds * 1000),
      totalDurationSeconds: route.totalSeconds,
      timeAccuracy: route.accuracy
    };
  }

  const timedStops: TimedStop[] = [];
  let elapsedMs = 0;

  for (let i = 0; i < sortedStops.length; i++) {
    elapsedMs += (route.legSeconds[i] ?? 0) * 1000;

    const pickupMs = departureTime.getTime() + elapsedMs;
    const estimatedPickupTime = new Date(pickupMs);
    const recommendedReadyTime = new Date(pickupMs - RECOMMENDED_BUFFER_MINUTES * 60_000);
    const latestReadyTime = new Date(pickupMs + fairplayWindowMinutes * 60_000);

    // Ankunft beim Event: ab diesem Stopp + alle weiteren Legs + Einsteige-Zeit
    let remainingMs = elapsedMs + STOP_DWELL_SECONDS * 1000;
    for (let j = i + 1; j < sortedStops.length; j++) {
      remainingMs += (route.legSeconds[j] ?? 0) * 1000 + STOP_DWELL_SECONDS * 1000;
    }
    remainingMs += (route.legSeconds[sortedStops.length] ?? 0) * 1000;
    const estimatedArrivalAtEvent = new Date(departureTime.getTime() + remainingMs);

    timedStops.push({
      ...sortedStops[i],
      estimatedPickupTime,
      recommendedReadyTime,
      latestReadyTime,
      estimatedArrivalAtEvent,
      timeAccuracy: route.accuracy
    });

    elapsedMs += STOP_DWELL_SECONDS * 1000;
  }

  const finalLegMs = (route.legSeconds[sortedStops.length] ?? 0) * 1000;
  const rideEstimatedArrivalTime = new Date(departureTime.getTime() + elapsedMs + finalLegMs);

  return {
    stops: timedStops,
    rideEstimatedArrivalTime,
    totalDurationSeconds: route.totalSeconds,
    timeAccuracy: route.accuracy
  };
}
