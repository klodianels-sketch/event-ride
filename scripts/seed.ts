/**
 * EventRide Seed-Script — Phase 5
 * Fuegt realistische Schweizer Testdaten ein (idempotent via _seeded:true).
 *
 * Starten: npm run seed
 * Mit eigenem Admin: SEED_ADMIN_EMAIL=ich@x.ch SEED_ADMIN_PASSWORD=MeinPW! npm run seed
 */

import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import { readFileSync } from 'fs';

function loadEnvFile(path: string): void {
  try {
    const lines = readFileSync(path, 'utf-8').split('\n');
    for (const line of lines) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 0) continue;
      const k = t.slice(0, i).trim();
      const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
      if (k && !(k in process.env)) process.env[k] = v;
    }
  } catch { /* Datei fehlt — kein Fehler */ }
}
loadEnvFile('.env.local');
loadEnvFile('.env');

const MONGODB_URI    = process.env.MONGODB_URI    ?? 'mongodb://localhost:27017';
const ADMIN_EMAIL    = process.env.SEED_ADMIN_EMAIL    ?? 'admin@eventride.ch';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? '12345678';

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────

function daysFromNow(days: number, h = 14, m = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(h, m, 0, 0);
  return d;
}
function addHours(d: Date, h: number): Date { return new Date(d.getTime() + h * 3_600_000); }
function addMinutes(d: Date, m: number): Date { return new Date(d.getTime() + m * 60_000); }
function subDays(d: Date, n: number): Date { return new Date(d.getTime() - n * 86_400_000); }

const POLICY = { waitMinutes: 15, penaltyPercent: 80 };

// Pravatar-URL: konsistenter Avatar basierend auf der E-Mail
const av = (email: string) => `https://i.pravatar.cc/150?u=${email}`;

// Unsplash-Event-Bilder (stabile CDN-URLs)
const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=800&q=80&fit=crop&auto=format`;

const IMAGES = {
  festival1:  img('1506157786151-b8491531f063'),
  festival2:  img('1459749411175-04bf5292ceea'),
  festival3:  img('1533174072545-7a4b6ad7a6c3'),
  music1:     img('1470229722913-7c0e2dbbafd3'),
  music2:     img('1501386761578-eac5c94b800a'),
  music3:     img('1493225457124-a3eb161ffa5f'),
  nightlife1: img('1566737236500-c8ac43014a67'),
  nightlife2: img('1514525253161-7a46d19cd819'),
  sport1:     img('1461896836934-ffe607ba8211'),
  sport2:     img('1571019613454-1cb2f99b2d8b'),
  hiking1:    img('1551632811-561732d1e306'),
  hiking2:    img('1506905925346-21bda4d32df4'),
  culture1:   img('1551818255-e6e10975bc17'),
  culture2:   img('1578662996442-48f60103fc96'),
};

// ── Hauptlogik ───────────────────────────────────────────────────────────────

async function seed() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('event-ride');

  console.log('\n🌱  EventRide Seeding startet (Phase 5)...\n');

  // Alte Seed-Daten löschen
  const [rDel, bDel, ratDel, nDel, cDel, mDel] = await Promise.all([
    db.collection('rides').deleteMany({ _seeded: true }),
    db.collection('bookings').deleteMany({ _seeded: true }),
    db.collection('ratings').deleteMany({ _seeded: true }),
    db.collection('notifications').deleteMany({ _seeded: true }),
    db.collection('conversations').deleteMany({ _seeded: true }),
    db.collection('messages').deleteMany({ _seeded: true })
  ]);
  console.log(`🗑️   Gelöscht: ${rDel.deletedCount} Rides, ${bDel.deletedCount} Bookings, ${ratDel.deletedCount} Ratings, ${nDel.deletedCount} Notifications, ${cDel.deletedCount} Conversations, ${mDel.deletedCount} Messages`);

  // ── Admin-User ────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const existingAdmin = await db.collection('users').findOne({ email: ADMIN_EMAIL });
  let adminId: ObjectId;

  if (existingAdmin) {
    adminId = existingAdmin._id as ObjectId;
    // Nur role + isDisabled aktualisieren — Passwort nicht überschreiben!
    await db.collection('users').updateOne(
      { _id: adminId },
      { $set: { role: 'admin', isDisabled: false } }
    );
    console.log(`✅  Admin aktualisiert:  ${ADMIN_EMAIL}  (Passwort unveraendert)`);
  } else {
    const r = await db.collection('users').insertOne({
      firstName: 'Admin', lastName: 'EventRide',
      email: ADMIN_EMAIL, passwordHash: adminHash,
      role: 'admin', rating: 0, totalRatings: 0, isDisabled: false,
      avatarUrl: av(ADMIN_EMAIL),
      bio: 'EventRide Administrator',
      region: 'Zürich',
      interests: [],
      notificationSettings: { newBookingRequest: true, bookingStatusChange: true, newMessage: true, rideUpdates: true },
      _seeded: true, createdAt: subDays(new Date(), 60)
    });
    adminId = r.insertedId;
    console.log(`✅  Admin angelegt:      ${ADMIN_EMAIL}  /  ${ADMIN_PASSWORD}`);
  }

  // ── Test-User ─────────────────────────────────────────────────────────────
  const userHash = await bcrypt.hash('Test1234!', 12);

  const testUsersData = [
    {
      firstName: 'Marco',  lastName: 'Bernasconi',
      email: 'marco@seed.eventride.ch',
      avatarUrl: av('marco@seed.eventride.ch'),
      bio: 'Leidenschaftlicher Fahrer und Festival-Fan. Fahre gerne mit guter Musik und netten Leuten.',
      region: 'Winterthur',
      interests: ['Festival', 'Musik', 'Sport'],
      rating: 4.8, totalRatings: 12,
      createdAt: subDays(new Date(), 180)
    },
    {
      firstName: 'Alina',  lastName: 'Keller',
      email: 'alina@seed.eventride.ch',
      avatarUrl: av('alina@seed.eventride.ch'),
      bio: 'Outdoor-Enthusiastin, Fotografin und Wandererin. Immer auf der Suche nach dem nächsten Abenteuer.',
      region: 'Wil SG',
      interests: ['Wandern', 'Ski', 'Natur', 'Reisen'],
      rating: 4.6, totalRatings: 7,
      createdAt: subDays(new Date(), 120)
    },
    {
      firstName: 'Stefan', lastName: 'Müller',
      email: 'stefan@seed.eventride.ch',
      avatarUrl: av('stefan@seed.eventride.ch'),
      bio: 'ZHAW-Student, leidenschaftlicher Skater und Konzertgänger. Bin meist gut gelaunt auf Langstrecken.',
      region: 'Wetzikon',
      interests: ['Sport', 'Musik', 'Kultur', 'Film'],
      rating: 4.9, totalRatings: 3,
      createdAt: subDays(new Date(), 90)
    },
    {
      firstName: 'Leila',  lastName: 'Ahmadi',
      email: 'leila@seed.eventride.ch',
      avatarUrl: av('leila@seed.eventride.ch'),
      bio: 'Kulturliebhaberin, Tänzerin und passionierte Mitfahrerin. Schätze gute Unterhaltung auf Reisen.',
      region: 'Zürich',
      interests: ['Tanz', 'Kultur', 'Festival', 'Food'],
      rating: 5.0, totalRatings: 5,
      createdAt: subDays(new Date(), 60)
    },
    {
      firstName: 'Noah',   lastName: 'Zimmermann',
      email: 'noah@seed.eventride.ch',
      avatarUrl: av('noah@seed.eventride.ch'),
      bio: 'Musikproduzent und Nightlife-Liebhaber aus Basel. Kenne die besten Clubs der Schweiz.',
      region: 'Basel',
      interests: ['Musik', 'Nightlife', 'Festival'],
      rating: 4.7, totalRatings: 9,
      createdAt: subDays(new Date(), 45)
    }
  ];

  const userIds: ObjectId[] = [];
  for (const u of testUsersData) {
    const existing = await db.collection('users').findOne({ email: u.email });
    if (existing) {
      await db.collection('users').updateOne(
        { _id: existing._id },
        { $set: { avatarUrl: u.avatarUrl, bio: u.bio, region: u.region, interests: u.interests } }
      );
      userIds.push(existing._id as ObjectId);
    } else {
      const r = await db.collection('users').insertOne({
        ...u,
        passwordHash: userHash,
        role: 'user', isDisabled: false,
        notificationSettings: { newBookingRequest: true, bookingStatusChange: true, newMessage: true, rideUpdates: true },
        _seeded: true
      });
      userIds.push(r.insertedId);
    }
  }

  const [marcoId, alinaId, stefanId, leilaId, noahId] = userIds;
  console.log(`✅  ${testUsersData.length} Test-User bereit`);

  // ── Rides ─────────────────────────────────────────────────────────────────
  const dep1  = daysFromNow(2, 13);
  const dep2  = daysFromNow(7, 11);
  const dep3  = daysFromNow(1, 19);
  const dep4  = daysFromNow(3, 10);
  const dep5  = addHours(new Date(), 4);
  const dep6  = daysFromNow(5, 7);
  const dep7  = daysFromNow(4, 8);
  const dep8  = daysFromNow(2, 17);
  const dep9  = daysFromNow(5, 12);
  const dep10 = daysFromNow(6, 22);
  const dep12 = daysFromNow(10, 18);

  const rides = [
    // 1 – Openair Frauenfeld — fast voll (1 Platz)
    {
      driverId: marcoId, driverName: 'Marco Bernasconi', driverRating: 4.8,
      driverPhoto: av('marco@seed.eventride.ch'),
      eventName: 'Openair Frauenfeld', eventCategory: 'festival',
      eventLocation: 'Openair Frauenfeld, Frauenfeld',
      eventImage: IMAGES.festival1,
      eventLocationCoords: { lat: '47.5607', lon: '8.8993' },
      startLocation: 'Winterthur',
      startLocationExact: 'Technikumstrasse 9, 8400 Winterthur',
      startCoords: { lat: '47.5001', lon: '8.7238' },
      startCoordsRough: { lat: '47.5001', lon: '8.7238' },
      departureTime: dep1, estimatedArrivalTime: addHours(dep1, 1),
      seats: 4, seatsAvailable: 1, pricePerPerson: 12,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 2, status: 'active',
      _seeded: true, createdAt: subDays(new Date(), 3)
    },
    // 2 – Street Parade — 2 Plätze frei
    {
      driverId: alinaId, driverName: 'Alina Keller', driverRating: 4.6,
      driverPhoto: av('alina@seed.eventride.ch'),
      eventName: 'Street Parade Zürich', eventCategory: 'music',
      eventLocation: 'Bellevue, Zürich',
      eventImage: IMAGES.music1,
      eventLocationCoords: { lat: '47.3668', lon: '8.5441' },
      startLocation: 'Wil SG',
      startLocationExact: 'Toggenburgerstrasse 1, 9500 Wil',
      startCoords: { lat: '47.4614', lon: '9.0470' },
      startCoordsRough: { lat: '47.4614', lon: '9.0470' },
      departureTime: dep2, estimatedArrivalTime: addHours(dep2, 1),
      seats: 4, seatsAvailable: 2, pricePerPerson: 20,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 1, status: 'active',
      _seeded: true, createdAt: subDays(new Date(), 5)
    },
    // 3 – Imagine Dragons Hallenstadion — morgen Abend, 1 Platz
    {
      driverId: marcoId, driverName: 'Marco Bernasconi', driverRating: 4.8,
      driverPhoto: av('marco@seed.eventride.ch'),
      eventName: 'Imagine Dragons – Hallenstadion', eventCategory: 'music',
      eventLocation: 'Hallenstadion, Zürich',
      eventImage: IMAGES.music2,
      eventLocationCoords: { lat: '47.4097', lon: '8.5436' },
      startLocation: 'Uster',
      startLocationExact: 'Bankstrasse 2, 8610 Uster',
      startCoords: { lat: '47.3469', lon: '8.7197' },
      startCoordsRough: { lat: '47.3469', lon: '8.7197' },
      departureTime: dep3, estimatedArrivalTime: addHours(dep3, 0.5),
      seats: 3, seatsAvailable: 1, pricePerPerson: 15,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 1, status: 'active',
      _seeded: true, createdAt: subDays(new Date(), 2)
    },
    // 4 – Gurten Festival Bern — 3 Plätze, CHF 35
    {
      driverId: stefanId, driverName: 'Stefan Müller', driverRating: 4.9,
      driverPhoto: av('stefan@seed.eventride.ch'),
      eventName: 'Gurten Festival', eventCategory: 'festival',
      eventLocation: 'Gurten, Bern',
      eventImage: IMAGES.festival2,
      eventLocationCoords: { lat: '46.9221', lon: '7.4378' },
      startLocation: 'Wetzikon',
      startLocationExact: 'Bahnhofstrasse 10, 8620 Wetzikon',
      startCoords: { lat: '47.3250', lon: '8.8008' },
      startCoordsRough: { lat: '47.3250', lon: '8.8008' },
      departureTime: dep4, estimatedArrivalTime: addHours(dep4, 2),
      seats: 4, seatsAvailable: 3, pricePerPerson: 35,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 0, status: 'active',
      _seeded: true, createdAt: subDays(new Date(), 1)
    },
    // 5 – Albanian Summer Festival — heute in 4h, 1 Platz
    {
      driverId: leilaId, driverName: 'Leila Ahmadi', driverRating: 5.0,
      driverPhoto: av('leila@seed.eventride.ch'),
      eventName: 'Albanian Summer Festival', eventCategory: 'culture',
      eventLocation: 'Greifensee, Zürich',
      eventImage: IMAGES.culture1,
      eventLocationCoords: { lat: '47.3629', lon: '8.6831' },
      startLocation: 'Zürich',
      startLocationExact: 'Langstrasse 30, 8004 Zürich',
      startCoords: { lat: '47.3769', lon: '8.5305' },
      startCoordsRough: { lat: '47.3769', lon: '8.5417' },
      departureTime: dep5, estimatedArrivalTime: addHours(dep5, 0.75),
      seats: 4, seatsAvailable: 1, pricePerPerson: 10,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 3, status: 'active',
      _seeded: true, createdAt: subDays(new Date(), 4)
    },
    // 6 – Pizol Ski Day — 5 Tage, CHF 25, 4 Plätze
    {
      driverId: marcoId, driverName: 'Marco Bernasconi', driverRating: 4.8,
      driverPhoto: av('marco@seed.eventride.ch'),
      eventName: 'Pizol Ski Day', eventCategory: 'hiking',
      eventLocation: 'Pizol Skiarena, Bad Ragaz',
      eventImage: IMAGES.hiking2,
      eventLocationCoords: { lat: '46.9523', lon: '9.3940' },
      startLocation: 'St. Gallen',
      startLocationExact: 'Vadianstrasse 4, 9000 St. Gallen',
      startCoords: { lat: '47.4245', lon: '9.3767' },
      startCoordsRough: { lat: '47.4245', lon: '9.3767' },
      departureTime: dep6, estimatedArrivalTime: addHours(dep6, 1.25),
      seats: 5, seatsAvailable: 4, pricePerPerson: 25,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 0, status: 'active',
      _seeded: true, createdAt: subDays(new Date(), 6)
    },
    // 7 – Flumserberg Wandertag — 4 Tage, CHF 8, 3 Plätze
    {
      driverId: alinaId, driverName: 'Alina Keller', driverRating: 4.6,
      driverPhoto: av('alina@seed.eventride.ch'),
      eventName: 'Wandertag Flumserberg', eventCategory: 'hiking',
      eventLocation: 'Flumserberg, Flums',
      eventImage: IMAGES.hiking1,
      eventLocationCoords: { lat: '47.1012', lon: '9.3421' },
      startLocation: 'Wil SG',
      startLocationExact: 'Toggenburgerstrasse 1, 9500 Wil',
      startCoords: { lat: '47.4614', lon: '9.0470' },
      startCoordsRough: { lat: '47.4614', lon: '9.0470' },
      departureTime: dep7, estimatedArrivalTime: addHours(dep7, 1),
      seats: 4, seatsAvailable: 3, pricePerPerson: 8,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 0, status: 'active',
      _seeded: true, createdAt: subDays(new Date(), 2)
    },
    // 8 – ZHAW Diplomfeier — übermorgen Abend, CHF 18, 2 Plätze
    {
      driverId: stefanId, driverName: 'Stefan Müller', driverRating: 4.9,
      driverPhoto: av('stefan@seed.eventride.ch'),
      eventName: 'ZHAW Diplomfeier 2025', eventCategory: 'culture',
      eventLocation: 'ZHAW Campus, Winterthur',
      eventImage: IMAGES.culture2,
      eventLocationCoords: { lat: '47.4970', lon: '8.7224' },
      startLocation: 'Wetzikon',
      startLocationExact: 'Bahnhofstrasse 10, 8620 Wetzikon',
      startCoords: { lat: '47.3250', lon: '8.8008' },
      startCoordsRough: { lat: '47.3250', lon: '8.8008' },
      departureTime: dep8, estimatedArrivalTime: addHours(dep8, 0.75),
      seats: 3, seatsAvailable: 2, pricePerPerson: 18,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 0, status: 'active',
      _seeded: true, createdAt: subDays(new Date(), 1)
    },
    // 9 – Paleo Nyon — 5 Tage, CHF 22, 4 Plätze
    {
      driverId: leilaId, driverName: 'Leila Ahmadi', driverRating: 5.0,
      driverPhoto: av('leila@seed.eventride.ch'),
      eventName: 'Paleo Festival Nyon', eventCategory: 'festival',
      eventLocation: 'Paleo, Nyon',
      eventImage: IMAGES.festival3,
      eventLocationCoords: { lat: '46.3749', lon: '6.2381' },
      startLocation: 'Zürich',
      startLocationExact: 'Bahnhofplatz 1, 8001 Zürich',
      startCoords: { lat: '47.3779', lon: '8.5403' },
      startCoordsRough: { lat: '47.3769', lon: '8.5417' },
      departureTime: dep9, estimatedArrivalTime: addHours(dep9, 1.5),
      seats: 4, seatsAvailable: 4, pricePerPerson: 22,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 0, status: 'active',
      _seeded: true, createdAt: subDays(new Date(), 3)
    },
    // 10 – Supermarket Club Night — in 6 Tagen, CHF 15, 3 Plätze
    {
      driverId: noahId, driverName: 'Noah Zimmermann', driverRating: 4.7,
      driverPhoto: av('noah@seed.eventride.ch'),
      eventName: 'Supermarket Club Night', eventCategory: 'nightlife',
      eventLocation: 'Supermarket, Zürich',
      eventImage: IMAGES.nightlife1,
      eventLocationCoords: { lat: '47.3760', lon: '8.5426' },
      startLocation: 'Basel',
      startLocationExact: 'Centralbahnstrasse 10, 4051 Basel',
      startCoords: { lat: '47.5476', lon: '7.5898' },
      startCoordsRough: { lat: '47.5476', lon: '7.5898' },
      departureTime: dep10, estimatedArrivalTime: addHours(dep10, 1.25),
      seats: 4, seatsAvailable: 3, pricePerPerson: 15,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 0, status: 'active',
      _seeded: true, createdAt: subDays(new Date(), 2)
    },
    // 11 – Stornierte Fahrt (Test-Daten)
    {
      driverId: marcoId, driverName: 'Marco Bernasconi', driverRating: 4.8,
      driverPhoto: av('marco@seed.eventride.ch'),
      eventName: 'World Club Dome Zürich', eventCategory: 'nightlife',
      eventLocation: 'Samsung Hall, Zürich',
      eventImage: IMAGES.nightlife2,
      eventLocationCoords: { lat: '47.4065', lon: '8.5502' },
      startLocation: 'Winterthur',
      startLocationExact: 'Technikumstrasse 9, 8400 Winterthur',
      startCoords: { lat: '47.5001', lon: '8.7238' },
      startCoordsRough: { lat: '47.5001', lon: '8.7238' },
      departureTime: daysFromNow(-1, 20), estimatedArrivalTime: addHours(daysFromNow(-1, 20), 0.5),
      seats: 4, seatsAvailable: 4, pricePerPerson: 20,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 0,
      status: 'cancelled', moderationReason: 'Admin-Moderation: Verdächtiger Inhalt',
      _seeded: true, createdAt: subDays(new Date(), 7)
    },
    // 12 – Zürich Film Festival — 10 Tage, CHF 10, 3 Plätze
    {
      driverId: stefanId, driverName: 'Stefan Müller', driverRating: 4.9,
      driverPhoto: av('stefan@seed.eventride.ch'),
      eventName: 'Zürich Film Festival', eventCategory: 'culture',
      eventLocation: 'Kino Corso, Zürich',
      eventImage: IMAGES.culture1,
      eventLocationCoords: { lat: '47.3701', lon: '8.5390' },
      startLocation: 'Wetzikon',
      startLocationExact: 'Bahnhofstrasse 10, 8620 Wetzikon',
      startCoords: { lat: '47.3250', lon: '8.8008' },
      startCoordsRough: { lat: '47.3250', lon: '8.8008' },
      departureTime: dep12, estimatedArrivalTime: addHours(dep12, 0.75),
      seats: 3, seatsAvailable: 3, pricePerPerson: 10,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 0, status: 'active',
      _seeded: true, createdAt: subDays(new Date(), 5)
    }
  ];

  const rideResult = await db.collection('rides').insertMany(rides);
  const rideIds = Object.values(rideResult.insertedIds);
  const [r1, r2, r3, r4, , , , , , r10] = rideIds;
  console.log(`✅  ${rides.length} Fahrten eingefügt`);

  // ── Bookings ──────────────────────────────────────────────────────────────
  const pt = (dep: Date, min: number) => addMinutes(dep, min);

  const bookings = [
    // Stefan bucht Openair Frauenfeld → accepted (1 Platz belegt)
    {
      rideId: r1, passengerId: stefanId, passengerName: 'Stefan Müller',
      pickupLocation: 'Töss, Winterthur',
      pickupCoords: { lat: '47.5082', lon: '8.6994' },
      bookedPrice: 12, status: 'accepted', paymentStatus: 'pending',
      estimatedPickupTime: pt(dep1, 8), recommendedReadyTime: pt(dep1, 3),
      latestReadyTime: pt(dep1, 23), estimatedArrivalAtEvent: pt(dep1, 55),
      timeAccuracy: 'osrm', routeVersion: 2,
      noShowPolicySnapshot: POLICY,
      _seeded: true, createdAt: subDays(new Date(), 2)
    },
    // Leila bucht Street Parade → pending
    {
      rideId: r2, passengerId: leilaId, passengerName: 'Leila Ahmadi',
      pickupLocation: 'Zürich HB, Zürich',
      pickupCoords: { lat: '47.3779', lon: '8.5405' },
      bookedPrice: 20, status: 'pending', paymentStatus: 'pending',
      noShowPolicySnapshot: POLICY,
      _seeded: true, createdAt: subDays(new Date(), 1)
    },
    // Stefan bucht Street Parade → pending
    {
      rideId: r2, passengerId: stefanId, passengerName: 'Stefan Müller',
      pickupLocation: 'Wülflingen, Winterthur',
      pickupCoords: { lat: '47.5095', lon: '8.6889' },
      bookedPrice: 20, status: 'pending', paymentStatus: 'pending',
      noShowPolicySnapshot: POLICY,
      _seeded: true, createdAt: subDays(new Date(), 0.5)
    },
    // Leila bucht Hallenstadion → accepted
    {
      rideId: r3, passengerId: leilaId, passengerName: 'Leila Ahmadi',
      pickupLocation: 'Nänikon, Uster',
      pickupCoords: { lat: '47.3511', lon: '8.7294' },
      bookedPrice: 15, status: 'accepted', paymentStatus: 'pending',
      estimatedPickupTime: pt(dep3, 10), recommendedReadyTime: pt(dep3, 5),
      latestReadyTime: pt(dep3, 25), estimatedArrivalAtEvent: pt(dep3, 40),
      timeAccuracy: 'osrm', routeVersion: 1,
      noShowPolicySnapshot: POLICY,
      _seeded: true, createdAt: subDays(new Date(), 1)
    },
    // Stefan bucht Gurten Festival → pending
    {
      rideId: r4, passengerId: stefanId, passengerName: 'Stefan Müller',
      pickupLocation: 'Eschenmoser, Wetzikon',
      pickupCoords: { lat: '47.3220', lon: '8.7980' },
      bookedPrice: 35, status: 'pending', paymentStatus: 'pending',
      noShowPolicySnapshot: POLICY,
      _seeded: true, createdAt: subDays(new Date(), 0.25)
    },
    // Noah bucht Street Parade → rejected (Demo-Fall)
    {
      rideId: r2, passengerId: noahId, passengerName: 'Noah Zimmermann',
      pickupLocation: 'Hardbrücke, Zürich',
      pickupCoords: { lat: '47.3851', lon: '8.5205' },
      bookedPrice: 20, status: 'rejected', paymentStatus: 'pending',
      noShowPolicySnapshot: POLICY,
      _seeded: true, createdAt: subDays(new Date(), 3)
    },
    // Noah bucht Supermarket → pending (eigene Fahrt für Demo-Zwecke)
    {
      rideId: r10, passengerId: leilaId, passengerName: 'Leila Ahmadi',
      pickupLocation: 'Zürich HB, Zürich',
      pickupCoords: { lat: '47.3779', lon: '8.5405' },
      bookedPrice: 15, status: 'pending', paymentStatus: 'pending',
      noShowPolicySnapshot: POLICY,
      _seeded: true, createdAt: subDays(new Date(), 0.1)
    }
  ];

  await db.collection('bookings').insertMany(bookings);
  console.log(`✅  ${bookings.length} Buchungen eingefügt`);

  // ── Ratings ───────────────────────────────────────────────────────────────
  const ratings = [
    {
      rideId: new ObjectId(), bookingId: new ObjectId(),
      fromUserId: stefanId, toUserId: marcoId,
      fromRole: 'passenger', stars: 5,
      comment: 'Super Fahrer, pünktlich und entspannt!',
      _seeded: true, createdAt: subDays(new Date(), 10)
    },
    {
      rideId: new ObjectId(), bookingId: new ObjectId(),
      fromUserId: marcoId, toUserId: stefanId,
      fromRole: 'driver', stars: 5,
      comment: 'Toller Mitfahrer, genau zur Zeit bereit.',
      _seeded: true, createdAt: subDays(new Date(), 10)
    },
    {
      rideId: new ObjectId(), bookingId: new ObjectId(),
      fromUserId: leilaId, toUserId: alinaId,
      fromRole: 'passenger', stars: 4,
      comment: 'Angenehme Fahrt, gute Unterhaltung.',
      _seeded: true, createdAt: subDays(new Date(), 5)
    },
    {
      rideId: new ObjectId(), bookingId: new ObjectId(),
      fromUserId: alinaId, toUserId: leilaId,
      fromRole: 'driver', stars: 5,
      comment: 'Sehr angenehme Mitfahrerin, pünktlich und freundlich.',
      _seeded: true, createdAt: subDays(new Date(), 5)
    },
    {
      rideId: new ObjectId(), bookingId: new ObjectId(),
      fromUserId: noahId, toUserId: marcoId,
      fromRole: 'passenger', stars: 5,
      comment: 'Gute Musik, schnell am Ziel. Sehr empfehlenswert!',
      _seeded: true, createdAt: subDays(new Date(), 3)
    }
  ];

  await db.collection('ratings').insertMany(ratings);
  console.log(`✅  ${ratings.length} Ratings eingefügt`);

  // ── Conversations & Messages ───────────────────────────────────────────────
  const now = new Date();

  // Conv 1: Stefan ↔ Marco über Openair Frauenfeld (r1) — aktiver Chat
  const conv1 = await db.collection('conversations').insertOne({
    rideId: r1,
    participantIds: [stefanId, marcoId],
    lastMessageText: 'Bis morgen dann, bis 13 Uhr!',
    lastMessageAt: subDays(now, 0.1),
    lastMessageSenderId: marcoId,
    createdAt: subDays(now, 2),
    updatedAt: subDays(now, 0.1),
    _seeded: true
  });

  await db.collection('messages').insertMany([
    {
      conversationId: conv1.insertedId, senderId: stefanId,
      text: 'Hallo Marco! Kann ich auch etwas früher bei mir abgeholt werden?',
      readBy: [stefanId, marcoId],
      createdAt: subDays(now, 2), _seeded: true
    },
    {
      conversationId: conv1.insertedId, senderId: marcoId,
      text: 'Klar, kein Problem! Wo wohnst du genau?',
      readBy: [stefanId, marcoId],
      createdAt: subDays(now, 1.9), _seeded: true
    },
    {
      conversationId: conv1.insertedId, senderId: stefanId,
      text: 'Ich bin in Töss, Winterthur. Kreuzstrasse 5.',
      readBy: [stefanId, marcoId],
      createdAt: subDays(now, 1.8), _seeded: true
    },
    {
      conversationId: conv1.insertedId, senderId: marcoId,
      text: 'Perfekt, das liegt auf dem Weg. Ich komme ca. 13:10 Uhr.',
      readBy: [stefanId, marcoId],
      createdAt: subDays(now, 1.7), _seeded: true
    },
    {
      conversationId: conv1.insertedId, senderId: stefanId,
      text: 'Super! Hast du Platz für meinen Rucksack? Etwa 40 Liter.',
      readBy: [stefanId, marcoId],
      createdAt: subDays(now, 0.5), _seeded: true
    },
    {
      conversationId: conv1.insertedId, senderId: marcoId,
      text: 'Ja, Kofferraum ist frei. Bis morgen dann, bis 13 Uhr!',
      readBy: [stefanId, marcoId],
      createdAt: subDays(now, 0.1), _seeded: true
    }
  ]);

  // Conv 2: Leila ↔ Alina über Street Parade (r2) — ungelesene Nachricht
  const conv2 = await db.collection('conversations').insertOne({
    rideId: r2,
    participantIds: [leilaId, alinaId],
    lastMessageText: 'Wo genau ist der Treffpunkt?',
    lastMessageAt: subDays(now, 0.05),
    lastMessageSenderId: leilaId,
    createdAt: subDays(now, 1),
    updatedAt: subDays(now, 0.05),
    _seeded: true
  });

  await db.collection('messages').insertMany([
    {
      conversationId: conv2.insertedId, senderId: alinaId,
      text: 'Hallo Leila! Deine Anfrage für die Street Parade habe ich gesehen.',
      readBy: [alinaId, leilaId],
      createdAt: subDays(now, 1), _seeded: true
    },
    {
      conversationId: conv2.insertedId, senderId: leilaId,
      text: 'Super, ich freue mich! Ist es okay, wenn ich eine Freundin mitbringe?',
      readBy: [alinaId, leilaId],
      createdAt: subDays(now, 0.9), _seeded: true
    },
    {
      conversationId: conv2.insertedId, senderId: alinaId,
      text: 'Leider habe ich nur noch einen Platz frei. Tut mir leid!',
      readBy: [alinaId, leilaId],
      createdAt: subDays(now, 0.8), _seeded: true
    },
    {
      conversationId: conv2.insertedId, senderId: leilaId,
      text: 'Kein Problem! Wo genau ist der Treffpunkt?',
      readBy: [leilaId],  // Alina hat noch nicht gelesen!
      createdAt: subDays(now, 0.05), _seeded: true
    }
  ]);

  // Conv 3: Noah ↔ Noah (als Fahrer r10) für Demo
  const conv3 = await db.collection('conversations').insertOne({
    rideId: r10,
    participantIds: [leilaId, noahId],
    lastMessageText: 'Gerne, wir fahren ab Basel Hbf!',
    lastMessageAt: subDays(now, 0.3),
    lastMessageSenderId: noahId,
    createdAt: subDays(now, 0.5),
    updatedAt: subDays(now, 0.3),
    _seeded: true
  });

  await db.collection('messages').insertMany([
    {
      conversationId: conv3.insertedId, senderId: leilaId,
      text: 'Hi Noah! Ich interessiere mich für deinen Supermarket Club Night Trip.',
      readBy: [leilaId, noahId],
      createdAt: subDays(now, 0.5), _seeded: true
    },
    {
      conversationId: conv3.insertedId, senderId: noahId,
      text: 'Hey Leila! Super, der Trip wird mega! Wir fahren mit guter Musik.',
      readBy: [leilaId, noahId],
      createdAt: subDays(now, 0.4), _seeded: true
    },
    {
      conversationId: conv3.insertedId, senderId: leilaId,
      text: 'Kann ich auch in Zürich HB zusteigen statt Basel?',
      readBy: [leilaId, noahId],
      createdAt: subDays(now, 0.35), _seeded: true
    },
    {
      conversationId: conv3.insertedId, senderId: noahId,
      text: 'Gerne, wir fahren ab Basel Hbf!',
      readBy: [noahId],  // Leila hat noch nicht gelesen
      createdAt: subDays(now, 0.3), _seeded: true
    }
  ]);

  console.log(`✅  3 Conversations und ${6 + 4 + 4} Messages eingefügt`);

  // ── Notifications ─────────────────────────────────────────────────────────
  const notifications = [
    // Marco erhält Buchungsanfragen
    {
      userId: marcoId, type: 'booking_received', isRead: false,
      title: 'Neue Anfrage: Stefan Müller',
      message: 'Stefan möchte zum Openair Frauenfeld mitfahren.',
      rideId: r1, _seeded: true, createdAt: subDays(now, 2)
    },
    // Leila: Buchung angenommen
    {
      userId: leilaId, type: 'booking_accepted', isRead: false,
      title: 'Anfrage angenommen!',
      message: 'Deine Anfrage für "Imagine Dragons – Hallenstadion" wurde bestätigt. Abholung ca. 19:10 Uhr.',
      rideId: r3, _seeded: true, createdAt: subDays(now, 1)
    },
    // Alina: 2 Buchungsanfragen
    {
      userId: alinaId, type: 'booking_received', isRead: true,
      title: '2 neue Anfragen',
      message: 'Leila Ahmadi und Stefan Müller haben Anfragen für die Street Parade gestellt.',
      rideId: r2, _seeded: true, createdAt: subDays(now, 0.5)
    },
    // Stefan: Buchung abgelehnt
    {
      userId: noahId, type: 'booking_rejected', isRead: false,
      title: 'Anfrage abgelehnt',
      message: 'Leider wurde deine Anfrage für die Street Parade abgelehnt.',
      rideId: r2, _seeded: true, createdAt: subDays(now, 3)
    },
    // Stefan: neue Nachricht von Marco
    {
      userId: stefanId, type: 'new_message', isRead: false,
      title: 'Neue Nachricht von Marco Bernasconi',
      message: 'Ja, Kofferraum ist frei. Bis morgen dann, bis 13 Uhr!',
      conversationId: conv1.insertedId,
      _seeded: true, createdAt: subDays(now, 0.1)
    },
    // Leila: neue Nachricht von Noah
    {
      userId: leilaId, type: 'new_message', isRead: false,
      title: 'Neue Nachricht von Noah Zimmermann',
      message: 'Gerne, wir fahren ab Basel Hbf!',
      conversationId: conv3.insertedId,
      _seeded: true, createdAt: subDays(now, 0.3)
    }
  ];

  await db.collection('notifications').insertMany(notifications);
  console.log(`✅  ${notifications.length} Notifications eingefügt`);

  // ── Zusammenfassung ───────────────────────────────────────────────────────
  console.log('\n🎉  Seeding abgeschlossen!\n');
  console.log('📋  Zugangsdaten:');
  console.log(`    Admin:       ${ADMIN_EMAIL}              /  ${ADMIN_PASSWORD}`);
  console.log('    Fahrer:      marco@seed.eventride.ch     /  Test1234!');
  console.log('    Fahrerin:    alina@seed.eventride.ch     /  Test1234!');
  console.log('    Mitfahrer:   stefan@seed.eventride.ch    /  Test1234!');
  console.log('    Mitfahrerin: leila@seed.eventride.ch     /  Test1234!');
  console.log('    Nightlife:   noah@seed.eventride.ch      /  Test1234!\n');

  await client.close();
}

seed().catch(err => {
  console.error('\n❌  Seeding fehlgeschlagen:', err);
  process.exit(1);
});
