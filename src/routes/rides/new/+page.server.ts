import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';
import { geocode } from '$lib/geocoding';
import { osrmRoute } from '$lib/routing';

// 15 Min Wartefenster, 80 % Einbehalt bei No-Show (fair und konfigurierbar)
const DEFAULT_NO_SHOW_POLICY = { waitMinutes: 15, penaltyPercent: 80 };

export const load: PageServerLoad = ({ locals }) => {
  if (!locals.user) throw redirect(302, '/auth/login');
  return {};
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    if (!locals.user) throw redirect(302, '/auth/login');

    const VALID_CATEGORIES = ['music', 'festival', 'nightlife', 'sport', 'hiking', 'culture', 'other'];
    const data = await request.formData();
    const eventName          = (data.get('eventName')       as string ?? '').trim();
    const eventLocation      = (data.get('eventLocation')   as string ?? '').trim();
    const exactStartLocation = (data.get('startLocation')   as string ?? '').trim();
    const departureDatetime  =  data.get('departureTime')   as string ?? '';
    const seatsRaw           = parseInt(data.get('seats')   as string ?? '0');
    const priceRaw           = parseFloat(data.get('pricePerPerson') as string ?? '0');
    const eventCategoryRaw   = (data.get('eventCategory')   as string ?? 'other').trim();
    const eventCategory      = VALID_CATEGORIES.includes(eventCategoryRaw) ? eventCategoryRaw : 'other';

    // Optionale Zwischenstopps (vom Client als JSON serialisiert)
    type WaypointInput = { label: string; lat: number | string; lon: number | string };
    let waypointsList: WaypointInput[] = [];
    try {
      const raw = data.get('waypoints') as string ?? '[]';
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        waypointsList = (parsed as WaypointInput[]).filter(
          w => w && typeof w.label === 'string' && w.lat != null && w.lon != null
        );
      }
    } catch { /* ungültiges JSON → keine Zwischenstopps */ }

    if (!eventName || !eventLocation || !exactStartLocation || !departureDatetime) {
      return fail(400, { error: 'Alle Pflichtfelder muessen ausgefuellt sein.' });
    }

    const departureTime = new Date(departureDatetime);
    if (isNaN(departureTime.getTime())) {
      return fail(400, { error: 'Ungueltige Zeitangabe.' });
    }
    if (departureTime.getTime() - Date.now() < 60 * 60 * 1000) {
      return fail(400, { error: 'Die Abfahrtszeit muss mindestens 1 Stunde in der Zukunft liegen.' });
    }
    if (seatsRaw < 1 || seatsRaw > 8) {
      return fail(400, { error: 'Bitte 1 bis 8 Sitzplaetze angeben.' });
    }
    if (priceRaw < 1 || priceRaw > 200) {
      return fail(400, { error: 'Der Preis muss zwischen CHF 1 und CHF 200 liegen.' });
    }

    // Koordinaten beider Orte ermitteln
    const [startResult, eventResult] = await Promise.all([
      geocode(exactStartLocation),
      geocode(eventLocation)
    ]);

    // startLocation = oeffentliche grobe Stadt; startLocationExact = privat
    const roughStartLocation = startResult?.roughCity ?? exactStartLocation.split(',')[0].trim();

    // startCoordsRough = Stadtebene-Koordinaten (oeffentlich fuer Vorschau)
    // Wir geocodieren die grobe Stadt separat, damit die Koordinaten wirklich stadtgenau sind.
    const roughCityResult = roughStartLocation !== exactStartLocation
      ? await geocode(roughStartLocation)
      : startResult;

    // Route inkl. Zwischenstopps berechnen (für estimatedArrivalTime)
    let durationInSeconds = 75 * 60;
    if (startResult && eventResult) {
      const routeWaypoints = [
        startResult,
        ...waypointsList
          .filter(w => w.lat != null && w.lon != null)
          .map(w => ({ lat: String(w.lat), lon: String(w.lon) })),
        eventResult
      ];
      const route = await osrmRoute(routeWaypoints);
      durationInSeconds = route.totalSeconds;
    }

    const estimatedArrivalTime = new Date(departureTime.getTime() + durationInSeconds * 1000);

    const db = await getDb();
    const result = await db.collection('rides').insertOne({
      driverId: new ObjectId(locals.user.id),
      driverName: `${locals.user.firstName} ${locals.user.lastName}`,
      driverPhoto: locals.user.profilePicture ?? null,
      eventName,
      eventCategory,
      eventLocation,
      // Koordinaten: eventLocationCoords oeffentlich, startCoords privat
      eventLocationCoords: eventResult ? { lat: eventResult.lat, lon: eventResult.lon } : null,
      startLocation: roughStartLocation,
      startLocationExact: exactStartLocation,
      startCoords: startResult ? { lat: startResult.lat, lon: startResult.lon } : null,
      startCoordsRough: roughCityResult ? { lat: roughCityResult.lat, lon: roughCityResult.lon } : null,
      departureTime,
      estimatedArrivalTime,
      seats: seatsRaw,
      seatsAvailable: seatsRaw,
      pricePerPerson: priceRaw,
      // Zwischenstopps werden gespeichert (für Routenanzeige auf Detailseite)
      waypoints: waypointsList.map(w => ({
        label: w.label,
        lat: String(w.lat),
        lon: String(w.lon)
      })),
      fairplayWindowMinutes: 15,
      noShowPolicy: DEFAULT_NO_SHOW_POLICY,
      routeVersion: 0,
      status: 'active',
      createdAt: new Date()
    });

    throw redirect(302, `/rides/${result.insertedId}/publish-success`);
  }
};
