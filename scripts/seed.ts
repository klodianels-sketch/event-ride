/**
 * EventRide Seed-Script
 * Realistische Schweizer Testdaten: 10 User, 22 Rides, Bookings, Chats, Ratings, Notifications
 * Idempotent: loescht _seeded:true Dokumente und fuegt neu ein.
 *
 * Starten: npm run seed
 */

import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
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
  } catch { /* Datei fehlt */ }
}
loadEnvFile('.env.local');
loadEnvFile('.env');

const MONGODB_URI    = process.env.MONGODB_URI    ?? 'mongodb://localhost:27017';
const ADMIN_EMAIL    = process.env.SEED_ADMIN_EMAIL    ?? 'admin@eventride.ch';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin1234!';

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
const av = (email: string) => `https://i.pravatar.cc/150?u=${email}`;
const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=800&q=80&fit=crop&auto=format`;

const IMAGES = {
  festival1:  img('1506157786151-b8491531f063'),
  festival2:  img('1459749411175-04bf5292ceea'),
  festival3:  img('1533174072545-7a4b6ad7a6c3'),
  festival4:  img('1429962714451-bb934ecdc4ec'),
  music1:     img('1470229722913-7c0e2dbbafd3'),
  music2:     img('1501386761578-eac5c94b800a'),
  music3:     img('1493225457124-a3eb161ffa5f'),
  music4:     img('1516450360452-9312f5e86fc7'),
  nightlife1: img('1566737236500-c8ac43014a67'),
  nightlife2: img('1514525253161-7a46d19cd819'),
  nightlife3: img('1574271143515-5cddf8da19be'),
  sport1:     img('1461896836934-ffe607ba8211'),
  sport2:     img('1571019613454-1cb2f99b2d8b'),
  sport3:     img('1517649763962-0c623066013b'),
  hiking1:    img('1551632811-561732d1e306'),
  hiking2:    img('1506905925346-21bda4d32df4'),
  hiking3:    img('1519904981063-b0cf448d479e'),
  culture1:   img('1551818255-e6e10975bc17'),
  culture2:   img('1578662996442-48f60103fc96'),
  culture3:   img('1518998053901-5348d3961a04'),
};

// ── Hauptlogik ───────────────────────────────────────────────────────────────

async function seed() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('event-ride');

  console.log('\n🌱  EventRide Seeding startet...\n');

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

  // ── Admin ─────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const existingAdmin = await db.collection('users').findOne({ email: ADMIN_EMAIL });
  let adminId: ObjectId;

  if (existingAdmin) {
    adminId = existingAdmin._id as ObjectId;
    await db.collection('users').updateOne(
      { _id: adminId },
      { $set: { role: 'admin', isDisabled: false } }
    );
    console.log(`✅  Admin aktualisiert: ${ADMIN_EMAIL}`);
  } else {
    const r = await db.collection('users').insertOne({
      firstName: 'Admin', lastName: 'EventRide',
      email: ADMIN_EMAIL, passwordHash: adminHash,
      role: 'admin', rating: 0, totalRatings: 0, isDisabled: false,
      avatarUrl: av(ADMIN_EMAIL), bio: 'EventRide Administrator', region: 'Zürich',
      interests: [],
      notificationSettings: { newBookingRequest: true, bookingStatusChange: true, newMessage: true, rideUpdates: true },
      _seeded: true, createdAt: subDays(new Date(), 60)
    });
    adminId = r.insertedId;
    console.log(`✅  Admin angelegt: ${ADMIN_EMAIL}  /  ${ADMIN_PASSWORD}`);
  }

  // ── Test-User (10 Personen) ───────────────────────────────────────────────
  const userHash = await bcrypt.hash('Test1234!', 12);

  const usersData = [
    // Fahrer mit hohem Rating
    {
      firstName: 'Marco',  lastName: 'Bernasconi',
      email: 'marco@seed.eventride.ch',
      avatarUrl: av('marco@seed.eventride.ch'),
      bio: 'Leidenschaftlicher Fahrer und Festival-Fan aus Winterthur. Gute Musik, entspannte Fahrten.',
      region: 'Winterthur', interests: ['Festival', 'Musik', 'Sport'],
      rating: 4.8, totalRatings: 18, createdAt: subDays(new Date(), 180)
    },
    // Outdoor-Fahrerin
    {
      firstName: 'Alina',  lastName: 'Keller',
      email: 'alina@seed.eventride.ch',
      avatarUrl: av('alina@seed.eventride.ch'),
      bio: 'Outdoor-Enthusiastin und Fotografin. Fahre gerne in die Berge und zu Kulturevents.',
      region: 'Wil SG', interests: ['Wandern', 'Ski', 'Natur', 'Fotografie'],
      rating: 4.6, totalRatings: 9, createdAt: subDays(new Date(), 150)
    },
    // Student/Mitfahrer
    {
      firstName: 'Stefan', lastName: 'Müller',
      email: 'stefan@seed.eventride.ch',
      avatarUrl: av('stefan@seed.eventride.ch'),
      bio: 'ZHAW-Student, Skater, Konzertgänger. Kurze Wege, gute Gespräche, liebe Mitfahrgelegenheiten.',
      region: 'Wetzikon', interests: ['Konzerte', 'Sport', 'Film'],
      rating: 4.9, totalRatings: 5, createdAt: subDays(new Date(), 90)
    },
    // Kulturliebhaberin
    {
      firstName: 'Leila',  lastName: 'Ahmadi',
      email: 'leila@seed.eventride.ch',
      avatarUrl: av('leila@seed.eventride.ch'),
      bio: 'Kulturliebhaberin, Tänzerin, Food-Enthusiastin. Schätze gute Unterhaltung auf gemeinsamen Fahrten.',
      region: 'Zürich', interests: ['Tanz', 'Kultur', 'Festival', 'Food'],
      rating: 5.0, totalRatings: 7, createdAt: subDays(new Date(), 60)
    },
    // Nightlife
    {
      firstName: 'Noah',   lastName: 'Zimmermann',
      email: 'noah@seed.eventride.ch',
      avatarUrl: av('noah@seed.eventride.ch'),
      bio: 'Musikproduzent und Nightlife-Liebhaber aus Basel. Kenne die besten Clubs der Schweiz.',
      region: 'Basel', interests: ['Musik', 'Nightlife', 'Festival', 'DJing'],
      rating: 4.7, totalRatings: 12, createdAt: subDays(new Date(), 45)
    },
    // Sport-Fahrerin
    {
      firstName: 'Yasmin', lastName: 'Bürki',
      email: 'yasmin@seed.eventride.ch',
      avatarUrl: av('yasmin@seed.eventride.ch'),
      bio: 'Halbmarathon-Läuferin und Volleyball-Spielerin. Fahre gerne zu Sportevents in der ganzen Schweiz.',
      region: 'Bern', interests: ['Sport', 'Laufen', 'Volleyball', 'Fitness'],
      rating: 4.9, totalRatings: 6, createdAt: subDays(new Date(), 70)
    },
    // Junger Musikfan
    {
      firstName: 'Luca',   lastName: 'Romano',
      email: 'luca@seed.eventride.ch',
      avatarUrl: av('luca@seed.eventride.ch'),
      bio: 'Gitarrist und Konzertgänger aus Lugano. Reise viel für Live-Musik durch die Schweiz.',
      region: 'Lugano', interests: ['Musik', 'Gitarre', 'Reisen', 'Konzerte'],
      rating: 4.5, totalRatings: 4, createdAt: subDays(new Date(), 55)
    },
    // Wandererin
    {
      firstName: 'Jana',   lastName: 'Schäfer',
      email: 'jana@seed.eventride.ch',
      avatarUrl: av('jana@seed.eventride.ch'),
      bio: 'Bergwanderin und Alpinistin aus Chur. Organisiere Gruppenfahrten zu Bergtouren und Skigebieten.',
      region: 'Chur', interests: ['Wandern', 'Klettern', 'Ski', 'Natur'],
      rating: 4.8, totalRatings: 14, createdAt: subDays(new Date(), 200)
    },
    // Nightlife-Mitfahrerin
    {
      firstName: 'Mia',    lastName: 'Widmer',
      email: 'mia@seed.eventride.ch',
      avatarUrl: av('mia@seed.eventride.ch'),
      bio: 'Studentin in Zürich, Nightlife-Fan und Festival-Gängerin. Suche immer Mitfahrmöglichkeiten.',
      region: 'Zürich', interests: ['Nightlife', 'Festival', 'Tanzen', 'Techno'],
      rating: 4.4, totalRatings: 3, createdAt: subDays(new Date(), 30)
    },
    // Kulturmensch
    {
      firstName: 'David',  lastName: 'Flück',
      email: 'david@seed.eventride.ch',
      avatarUrl: av('david@seed.eventride.ch'),
      bio: 'Theater- und Kinoliebhaber aus Bern. Fahre regelmässig zu Kulturevents in der ganzen Schweiz.',
      region: 'Bern', interests: ['Theater', 'Kino', 'Literatur', 'Kultur'],
      rating: 4.7, totalRatings: 8, createdAt: subDays(new Date(), 120)
    }
  ];

  const userIds: ObjectId[] = [];
  for (const u of usersData) {
    const existing = await db.collection('users').findOne({ email: u.email });
    if (existing) {
      await db.collection('users').updateOne(
        { _id: existing._id },
        { $set: { avatarUrl: u.avatarUrl, bio: u.bio, region: u.region, interests: u.interests, rating: u.rating, totalRatings: u.totalRatings } }
      );
      userIds.push(existing._id as ObjectId);
    } else {
      const r = await db.collection('users').insertOne({
        ...u, passwordHash: userHash, role: 'user', isDisabled: false,
        notificationSettings: { newBookingRequest: true, bookingStatusChange: true, newMessage: true, rideUpdates: true },
        _seeded: true
      });
      userIds.push(r.insertedId);
    }
  }

  const [marcoId, alinaId, stefanId, leilaId, noahId, yasminId, lucaId, janaId, miaId, davidId] = userIds;
  console.log(`✅  ${usersData.length} Test-User bereit`);

  // ── Departures ────────────────────────────────────────────────────────────
  const dep = {
    d1:  daysFromNow(1, 19, 30),   // morgen Abend
    d2:  daysFromNow(2, 13, 0),    // übermorgen Mittag
    d3:  daysFromNow(3, 10, 0),    // in 3 Tagen Morgen
    d4:  daysFromNow(4, 8, 0),     // in 4 Tagen früh
    d5:  daysFromNow(5, 7, 30),    // in 5 Tagen früh
    d6:  daysFromNow(5, 21, 0),    // in 5 Tagen Abend
    d7:  daysFromNow(6, 11, 0),    // in 6 Tagen
    d8:  daysFromNow(7, 14, 0),    // in 7 Tagen
    d9:  daysFromNow(8, 9, 0),     // in 8 Tagen
    d10: daysFromNow(9, 20, 0),    // in 9 Tagen Abend
    d11: daysFromNow(10, 18, 0),   // in 10 Tagen
    d12: daysFromNow(12, 13, 0),   // in 12 Tagen
    d13: daysFromNow(14, 10, 30),  // in 14 Tagen
    d14: daysFromNow(2, 21, 30),   // in 2 Tagen Abend
    d15: addHours(new Date(), 5),   // in 5 Stunden (fast heute)
    // Vergangene Fahrten
    past1: daysFromNow(-2, 20, 0),
    past2: daysFromNow(-5, 13, 0),
    past3: daysFromNow(-10, 19, 0),
  };

  // ── Rides (22 Fahrten) ────────────────────────────────────────────────────
  const rides = [
    // ── KOMMENDE FAHRTEN ──────────────────────────────────────────────────

    // 1 — Imagine Dragons Hallenstadion (fast voll)
    {
      driverId: marcoId, driverName: 'Marco Bernasconi', driverRating: 4.8,
      driverPhoto: av('marco@seed.eventride.ch'),
      eventName: 'Imagine Dragons – Hallenstadion', eventCategory: 'music',
      eventLocation: 'Hallenstadion, Zürich',
      eventImage: IMAGES.music2,
      eventLocationCoords: { lat: '47.4097', lon: '8.5436' },
      startLocation: 'Winterthur', startLocationExact: 'Technikumstrasse 9, 8400 Winterthur',
      startCoords: { lat: '47.5001', lon: '8.7238' }, startCoordsRough: { lat: '47.5001', lon: '8.7238' },
      departureTime: dep.d1, estimatedArrivalTime: addHours(dep.d1, 0.75),
      seats: 3, seatsAvailable: 1, pricePerPerson: 15,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 1, status: 'active',
      _seeded: true, createdAt: subDays(new Date(), 3)
    },
    // 2 — Openair Frauenfeld (2 Plätze)
    {
      driverId: marcoId, driverName: 'Marco Bernasconi', driverRating: 4.8,
      driverPhoto: av('marco@seed.eventride.ch'),
      eventName: 'Openair Frauenfeld', eventCategory: 'festival',
      eventLocation: 'Openair Frauenfeld, Frauenfeld',
      eventImage: IMAGES.festival1,
      eventLocationCoords: { lat: '47.5607', lon: '8.8993' },
      startLocation: 'Winterthur', startLocationExact: 'Technikumstrasse 9, 8400 Winterthur',
      startCoords: { lat: '47.5001', lon: '8.7238' }, startCoordsRough: { lat: '47.5001', lon: '8.7238' },
      departureTime: dep.d2, estimatedArrivalTime: addHours(dep.d2, 1),
      seats: 4, seatsAvailable: 2, pricePerPerson: 12,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 2, status: 'active',
      _seeded: true, createdAt: subDays(new Date(), 4)
    },
    // 3 — Street Parade Zürich (Alina, 2 Plätze offen)
    {
      driverId: alinaId, driverName: 'Alina Keller', driverRating: 4.6,
      driverPhoto: av('alina@seed.eventride.ch'),
      eventName: 'Street Parade Zürich', eventCategory: 'music',
      eventLocation: 'Bellevue, Zürich',
      eventImage: IMAGES.music1,
      eventLocationCoords: { lat: '47.3668', lon: '8.5441' },
      startLocation: 'Wil SG', startLocationExact: 'Toggenburgerstrasse 1, 9500 Wil',
      startCoords: { lat: '47.4614', lon: '9.0470' }, startCoordsRough: { lat: '47.4614', lon: '9.0470' },
      departureTime: dep.d8, estimatedArrivalTime: addHours(dep.d8, 1),
      seats: 4, seatsAvailable: 2, pricePerPerson: 20,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 1, status: 'active',
      _seeded: true, createdAt: subDays(new Date(), 6)
    },
    // 4 — Gurten Festival Bern (Stefan, 3 Plätze)
    {
      driverId: stefanId, driverName: 'Stefan Müller', driverRating: 4.9,
      driverPhoto: av('stefan@seed.eventride.ch'),
      eventName: 'Gurten Festival', eventCategory: 'festival',
      eventLocation: 'Gurten, Bern',
      eventImage: IMAGES.festival2,
      eventLocationCoords: { lat: '46.9221', lon: '7.4378' },
      startLocation: 'Wetzikon', startLocationExact: 'Bahnhofstrasse 10, 8620 Wetzikon',
      startCoords: { lat: '47.3250', lon: '8.8008' }, startCoordsRough: { lat: '47.3250', lon: '8.8008' },
      departureTime: dep.d3, estimatedArrivalTime: addHours(dep.d3, 2),
      seats: 4, seatsAvailable: 3, pricePerPerson: 35,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 0, status: 'active',
      _seeded: true, createdAt: subDays(new Date(), 2)
    },
    // 5 — Paleo Festival Nyon (Leila, 4 Plätze)
    {
      driverId: leilaId, driverName: 'Leila Ahmadi', driverRating: 5.0,
      driverPhoto: av('leila@seed.eventride.ch'),
      eventName: 'Paleo Festival Nyon', eventCategory: 'festival',
      eventLocation: 'Paleo, Nyon',
      eventImage: IMAGES.festival3,
      eventLocationCoords: { lat: '46.3749', lon: '6.2381' },
      startLocation: 'Zürich', startLocationExact: 'Bahnhofplatz 1, 8001 Zürich',
      startCoords: { lat: '47.3779', lon: '8.5403' }, startCoordsRough: { lat: '47.3769', lon: '8.5417' },
      departureTime: dep.d7, estimatedArrivalTime: addHours(dep.d7, 1.5),
      seats: 4, seatsAvailable: 4, pricePerPerson: 22,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 0, status: 'active',
      _seeded: true, createdAt: subDays(new Date(), 3)
    },
    // 6 — Supermarket Club Night (Noah, Basel → Zürich)
    {
      driverId: noahId, driverName: 'Noah Zimmermann', driverRating: 4.7,
      driverPhoto: av('noah@seed.eventride.ch'),
      eventName: 'Supermarket Club Night', eventCategory: 'nightlife',
      eventLocation: 'Supermarket, Zürich',
      eventImage: IMAGES.nightlife1,
      eventLocationCoords: { lat: '47.3760', lon: '8.5426' },
      startLocation: 'Basel', startLocationExact: 'Centralbahnstrasse 10, 4051 Basel',
      startCoords: { lat: '47.5476', lon: '7.5898' }, startCoordsRough: { lat: '47.5476', lon: '7.5898' },
      departureTime: dep.d6, estimatedArrivalTime: addHours(dep.d6, 1.25),
      seats: 4, seatsAvailable: 3, pricePerPerson: 15,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 0, status: 'active',
      _seeded: true, createdAt: subDays(new Date(), 2)
    },
    // 7 — Pizol Ski Day (Marco, St. Gallen → Bad Ragaz)
    {
      driverId: marcoId, driverName: 'Marco Bernasconi', driverRating: 4.8,
      driverPhoto: av('marco@seed.eventride.ch'),
      eventName: 'Pizol Ski Day', eventCategory: 'hiking',
      eventLocation: 'Pizol Skiarena, Bad Ragaz',
      eventImage: IMAGES.hiking2,
      eventLocationCoords: { lat: '46.9523', lon: '9.3940' },
      startLocation: 'Winterthur', startLocationExact: 'Technikumstrasse 9, 8400 Winterthur',
      startCoords: { lat: '47.5001', lon: '8.7238' }, startCoordsRough: { lat: '47.5001', lon: '8.7238' },
      departureTime: dep.d5, estimatedArrivalTime: addHours(dep.d5, 1.5),
      seats: 5, seatsAvailable: 4, pricePerPerson: 25,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 0, status: 'active',
      _seeded: true, createdAt: subDays(new Date(), 7)
    },
    // 8 — Flumserberg Wandertag (Alina)
    {
      driverId: alinaId, driverName: 'Alina Keller', driverRating: 4.6,
      driverPhoto: av('alina@seed.eventride.ch'),
      eventName: 'Wandertag Flumserberg', eventCategory: 'hiking',
      eventLocation: 'Flumserberg, Flums',
      eventImage: IMAGES.hiking1,
      eventLocationCoords: { lat: '47.1012', lon: '9.3421' },
      startLocation: 'Wil SG', startLocationExact: 'Toggenburgerstrasse 1, 9500 Wil',
      startCoords: { lat: '47.4614', lon: '9.0470' }, startCoordsRough: { lat: '47.4614', lon: '9.0470' },
      departureTime: dep.d4, estimatedArrivalTime: addHours(dep.d4, 1),
      seats: 4, seatsAvailable: 3, pricePerPerson: 8,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 0, status: 'active',
      _seeded: true, createdAt: subDays(new Date(), 3)
    },
    // 9 — ZHAW Diplomfeier (Stefan)
    {
      driverId: stefanId, driverName: 'Stefan Müller', driverRating: 4.9,
      driverPhoto: av('stefan@seed.eventride.ch'),
      eventName: 'ZHAW Diplomfeier 2025', eventCategory: 'culture',
      eventLocation: 'ZHAW Campus, Winterthur',
      eventImage: IMAGES.culture2,
      eventLocationCoords: { lat: '47.4970', lon: '8.7224' },
      startLocation: 'Wetzikon', startLocationExact: 'Bahnhofstrasse 10, 8620 Wetzikon',
      startCoords: { lat: '47.3250', lon: '8.8008' }, startCoordsRough: { lat: '47.3250', lon: '8.8008' },
      departureTime: dep.d2, estimatedArrivalTime: addHours(dep.d2, 0.75),
      seats: 3, seatsAvailable: 2, pricePerPerson: 18,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 0, status: 'active',
      _seeded: true, createdAt: subDays(new Date(), 1)
    },
    // 10 — Zürich Film Festival (Stefan)
    {
      driverId: stefanId, driverName: 'Stefan Müller', driverRating: 4.9,
      driverPhoto: av('stefan@seed.eventride.ch'),
      eventName: 'Zürich Film Festival', eventCategory: 'culture',
      eventLocation: 'Kino Corso, Zürich',
      eventImage: IMAGES.culture1,
      eventLocationCoords: { lat: '47.3701', lon: '8.5390' },
      startLocation: 'Wetzikon', startLocationExact: 'Bahnhofstrasse 10, 8620 Wetzikon',
      startCoords: { lat: '47.3250', lon: '8.8008' }, startCoordsRough: { lat: '47.3250', lon: '8.8008' },
      departureTime: dep.d12, estimatedArrivalTime: addHours(dep.d12, 0.75),
      seats: 3, seatsAvailable: 3, pricePerPerson: 10,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 0, status: 'active',
      _seeded: true, createdAt: subDays(new Date(), 5)
    },
    // 11 — Zürich Marathon (Yasmin, Bern → Zürich)
    {
      driverId: yasminId, driverName: 'Yasmin Bürki', driverRating: 4.9,
      driverPhoto: av('yasmin@seed.eventride.ch'),
      eventName: 'Zürich Marathon', eventCategory: 'sport',
      eventLocation: 'Seefeld, Zürich',
      eventImage: IMAGES.sport1,
      eventLocationCoords: { lat: '47.3543', lon: '8.5556' },
      startLocation: 'Bern', startLocationExact: 'Bahnhofplatz 1, 3011 Bern',
      startCoords: { lat: '46.9480', lon: '7.4474' }, startCoordsRough: { lat: '46.9480', lon: '7.4474' },
      departureTime: dep.d9, estimatedArrivalTime: addHours(dep.d9, 1.5),
      seats: 4, seatsAvailable: 3, pricePerPerson: 20,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 0, status: 'active',
      _seeded: true, createdAt: subDays(new Date(), 4)
    },
    // 12 — Lucerne Marathon (Yasmin)
    {
      driverId: yasminId, driverName: 'Yasmin Bürki', driverRating: 4.9,
      driverPhoto: av('yasmin@seed.eventride.ch'),
      eventName: 'Luzern Marathon', eventCategory: 'sport',
      eventLocation: 'Inseli Park, Luzern',
      eventImage: IMAGES.sport2,
      eventLocationCoords: { lat: '47.0521', lon: '8.3071' },
      startLocation: 'Bern', startLocationExact: 'Bahnhofplatz 1, 3011 Bern',
      startCoords: { lat: '46.9480', lon: '7.4474' }, startCoordsRough: { lat: '46.9480', lon: '7.4474' },
      departureTime: dep.d13, estimatedArrivalTime: addHours(dep.d13, 1.25),
      seats: 3, seatsAvailable: 2, pricePerPerson: 18,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 0, status: 'active',
      _seeded: true, createdAt: subDays(new Date(), 3)
    },
    // 13 — Lake Parade Genf (Noah, lange Strecke)
    {
      driverId: noahId, driverName: 'Noah Zimmermann', driverRating: 4.7,
      driverPhoto: av('noah@seed.eventride.ch'),
      eventName: 'Lake Parade Genf', eventCategory: 'nightlife',
      eventLocation: 'Lac Léman, Genf',
      eventImage: IMAGES.nightlife2,
      eventLocationCoords: { lat: '46.2044', lon: '6.1432' },
      startLocation: 'Basel', startLocationExact: 'Centralbahnstrasse 10, 4051 Basel',
      startCoords: { lat: '47.5476', lon: '7.5898' }, startCoordsRough: { lat: '47.5476', lon: '7.5898' },
      departureTime: dep.d11, estimatedArrivalTime: addHours(dep.d11, 2.5),
      seats: 4, seatsAvailable: 2, pricePerPerson: 30,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 0, status: 'active',
      _seeded: true, createdAt: subDays(new Date(), 4)
    },
    // 14 — Kilchberg Kilbi (Luca, Lugano → Kilchberg, sehr beliebt)
    {
      driverId: lucaId, driverName: 'Luca Romano', driverRating: 4.5,
      driverPhoto: av('luca@seed.eventride.ch'),
      eventName: 'Kilchberg Kilbi', eventCategory: 'culture',
      eventLocation: 'Kilchberg, Zürich',
      eventImage: IMAGES.culture3,
      eventLocationCoords: { lat: '47.3218', lon: '8.5417' },
      startLocation: 'Lugano', startLocationExact: 'Piazza Cioccaro 5, 6900 Lugano',
      startCoords: { lat: '46.0037', lon: '8.9511' }, startCoordsRough: { lat: '46.0037', lon: '8.9511' },
      departureTime: dep.d3, estimatedArrivalTime: addHours(dep.d3, 2),
      seats: 4, seatsAvailable: 3, pricePerPerson: 28,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 0, status: 'active',
      _seeded: true, createdAt: subDays(new Date(), 2)
    },
    // 15 — Albanifest Winterthur (Marco, lokales Event)
    {
      driverId: marcoId, driverName: 'Marco Bernasconi', driverRating: 4.8,
      driverPhoto: av('marco@seed.eventride.ch'),
      eventName: 'Albanifest Winterthur', eventCategory: 'festival',
      eventLocation: 'Altstadt, Winterthur',
      eventImage: IMAGES.festival4,
      eventLocationCoords: { lat: '47.4979', lon: '8.7242' },
      startLocation: 'Zürich', startLocationExact: 'Bahnhofstrasse 50, 8001 Zürich',
      startCoords: { lat: '47.3769', lon: '8.5417' }, startCoordsRough: { lat: '47.3769', lon: '8.5417' },
      departureTime: dep.d14, estimatedArrivalTime: addHours(dep.d14, 0.5),
      seats: 3, seatsAvailable: 2, pricePerPerson: 8,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 0, status: 'active',
      _seeded: true, createdAt: subDays(new Date(), 1)
    },
    // 16 — Jungfrau Marathon (Jana, Chur → Interlaken)
    {
      driverId: janaId, driverName: 'Jana Schäfer', driverRating: 4.8,
      driverPhoto: av('jana@seed.eventride.ch'),
      eventName: 'Jungfrau Marathon', eventCategory: 'sport',
      eventLocation: 'Interlaken, BE',
      eventImage: IMAGES.sport3,
      eventLocationCoords: { lat: '46.6863', lon: '7.8632' },
      startLocation: 'Chur', startLocationExact: 'Bahnhofplatz 1, 7000 Chur',
      startCoords: { lat: '46.8508', lon: '9.5319' }, startCoordsRough: { lat: '46.8508', lon: '9.5319' },
      departureTime: dep.d13, estimatedArrivalTime: addHours(dep.d13, 2),
      seats: 4, seatsAvailable: 3, pricePerPerson: 22,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 0, status: 'active',
      _seeded: true, createdAt: subDays(new Date(), 5)
    },
    // 17 — Rigi Wandertag (Jana, 5h heute)
    {
      driverId: janaId, driverName: 'Jana Schäfer', driverRating: 4.8,
      driverPhoto: av('jana@seed.eventride.ch'),
      eventName: 'Rigi Wandertag', eventCategory: 'hiking',
      eventLocation: 'Rigi Kulm, Küssnacht',
      eventImage: IMAGES.hiking3,
      eventLocationCoords: { lat: '47.0561', lon: '8.4879' },
      startLocation: 'Chur', startLocationExact: 'Bahnhofplatz 1, 7000 Chur',
      startCoords: { lat: '46.8508', lon: '9.5319' }, startCoordsRough: { lat: '46.8508', lon: '9.5319' },
      departureTime: dep.d15, estimatedArrivalTime: addHours(dep.d15, 1.5),
      seats: 3, seatsAvailable: 1, pricePerPerson: 15,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 1, status: 'active',
      _seeded: true, createdAt: subDays(new Date(), 1)
    },
    // 18 — David fährt zum Theater Basel
    {
      driverId: davidId, driverName: 'David Flück', driverRating: 4.7,
      driverPhoto: av('david@seed.eventride.ch'),
      eventName: 'Theater Basel – Othello', eventCategory: 'culture',
      eventLocation: 'Theater Basel, Basel',
      eventImage: IMAGES.culture2,
      eventLocationCoords: { lat: '47.5575', lon: '7.5870' },
      startLocation: 'Bern', startLocationExact: 'Kramgasse 10, 3011 Bern',
      startCoords: { lat: '46.9480', lon: '7.4474' }, startCoordsRough: { lat: '46.9480', lon: '7.4474' },
      departureTime: dep.d10, estimatedArrivalTime: addHours(dep.d10, 1),
      seats: 3, seatsAvailable: 2, pricePerPerson: 12,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 0, status: 'active',
      _seeded: true, createdAt: subDays(new Date(), 3)
    },
    // 19 — Stornierte Fahrt (Marco, World Club Dome — wurde storniert)
    {
      driverId: marcoId, driverName: 'Marco Bernasconi', driverRating: 4.8,
      driverPhoto: av('marco@seed.eventride.ch'),
      eventName: 'World Club Dome Zürich', eventCategory: 'nightlife',
      eventLocation: 'Samsung Hall, Zürich',
      eventImage: IMAGES.nightlife3,
      eventLocationCoords: { lat: '47.4065', lon: '8.5502' },
      startLocation: 'Winterthur', startLocationExact: 'Technikumstrasse 9, 8400 Winterthur',
      startCoords: { lat: '47.5001', lon: '8.7238' }, startCoordsRough: { lat: '47.5001', lon: '8.7238' },
      departureTime: daysFromNow(-1, 20), estimatedArrivalTime: addHours(daysFromNow(-1, 20), 0.5),
      seats: 4, seatsAvailable: 4, pricePerPerson: 20,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 0,
      status: 'cancelled', moderationReason: 'Admin: Verdächtiger Inhalt',
      _seeded: true, createdAt: subDays(new Date(), 8)
    },

    // ── VERGANGENE FAHRTEN (für Ratings/History) ──────────────────────────

    // 20 — Vergangene Fahrt: Leila fuhr zum Montreux Jazz (abgeschlossen)
    {
      driverId: leilaId, driverName: 'Leila Ahmadi', driverRating: 5.0,
      driverPhoto: av('leila@seed.eventride.ch'),
      eventName: 'Montreux Jazz Festival', eventCategory: 'music',
      eventLocation: 'Stravinski Auditorium, Montreux',
      eventImage: IMAGES.music3,
      eventLocationCoords: { lat: '46.4312', lon: '6.9107' },
      startLocation: 'Zürich', startLocationExact: 'Langstrasse 30, 8004 Zürich',
      startCoords: { lat: '47.3769', lon: '8.5305' }, startCoordsRough: { lat: '47.3769', lon: '8.5417' },
      departureTime: dep.past1, estimatedArrivalTime: addHours(dep.past1, 1.5),
      seats: 3, seatsAvailable: 0, pricePerPerson: 25,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 2, status: 'completed',
      _seeded: true, createdAt: subDays(new Date(), 10)
    },
    // 21 — Vergangene Fahrt: Noah fuhr zum Baloise Session Basel
    {
      driverId: noahId, driverName: 'Noah Zimmermann', driverRating: 4.7,
      driverPhoto: av('noah@seed.eventride.ch'),
      eventName: 'Baloise Session Basel', eventCategory: 'music',
      eventLocation: 'Messe Basel, Basel',
      eventImage: IMAGES.music4,
      eventLocationCoords: { lat: '47.5548', lon: '7.5980' },
      startLocation: 'Basel', startLocationExact: 'Centralbahnstrasse 10, 4051 Basel',
      startCoords: { lat: '47.5476', lon: '7.5898' }, startCoordsRough: { lat: '47.5476', lon: '7.5898' },
      departureTime: dep.past2, estimatedArrivalTime: addHours(dep.past2, 0.5),
      seats: 4, seatsAvailable: 1, pricePerPerson: 18,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 1, status: 'completed',
      _seeded: true, createdAt: subDays(new Date(), 12)
    },
    // 22 — Vergangene Fahrt: Jana fuhr zur Harder Kulm Wanderung
    {
      driverId: janaId, driverName: 'Jana Schäfer', driverRating: 4.8,
      driverPhoto: av('jana@seed.eventride.ch'),
      eventName: 'Harder Kulm Wanderung', eventCategory: 'hiking',
      eventLocation: 'Harder Kulm, Interlaken',
      eventImage: IMAGES.hiking3,
      eventLocationCoords: { lat: '46.7002', lon: '7.8698' },
      startLocation: 'Chur', startLocationExact: 'Bahnhofplatz 1, 7000 Chur',
      startCoords: { lat: '46.8508', lon: '9.5319' }, startCoordsRough: { lat: '46.8508', lon: '9.5319' },
      departureTime: dep.past3, estimatedArrivalTime: addHours(dep.past3, 2),
      seats: 4, seatsAvailable: 1, pricePerPerson: 20,
      fairplayWindowMinutes: 15, noShowPolicy: POLICY, routeVersion: 1, status: 'completed',
      _seeded: true, createdAt: subDays(new Date(), 18)
    }
  ];

  const rideResult = await db.collection('rides').insertMany(rides);
  const rideIds = Object.values(rideResult.insertedIds);
  const [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, , r20, r21, r22] = rideIds;
  console.log(`✅  ${rides.length} Fahrten eingefügt`);

  // ── Conversations + Bookings (zusammen um IDs zu verknüpfen) ─────────────
  const now = new Date();
  const pt = (dep: Date, min: number) => addMinutes(dep, min);

  // Conv 1: Stefan ↔ Marco über Imagine Dragons (r1)
  const conv1Res = await db.collection('conversations').insertOne({
    rideId: r1, participantIds: [stefanId, marcoId],
    lastMessageText: 'Kein Problem, ich nehme dich bei der Technikumstrasse mit.',
    lastMessageAt: subDays(now, 0.2), lastMessageSenderId: marcoId,
    createdAt: subDays(now, 2), updatedAt: subDays(now, 0.2), _seeded: true
  });
  const conv1 = conv1Res.insertedId;

  // Conv 2: Leila ↔ Marco über Imagine Dragons (r1)
  const conv2Res = await db.collection('conversations').insertOne({
    rideId: r1, participantIds: [leilaId, marcoId],
    lastMessageText: 'Perfekt, ich bin in Uster. Bis dann!',
    lastMessageAt: subDays(now, 0.5), lastMessageSenderId: leilaId,
    createdAt: subDays(now, 1), updatedAt: subDays(now, 0.5), _seeded: true
  });
  const conv2 = conv2Res.insertedId;

  // Conv 3: Leila ↔ Alina über Street Parade (r3) — ungelesene Nachricht
  const conv3Res = await db.collection('conversations').insertOne({
    rideId: r3, participantIds: [leilaId, alinaId],
    lastMessageText: 'Wo ist der Treffpunkt in Wil genau?',
    lastMessageAt: subDays(now, 0.05), lastMessageSenderId: leilaId,
    createdAt: subDays(now, 1), updatedAt: subDays(now, 0.05), _seeded: true
  });
  const conv3 = conv3Res.insertedId;

  // Conv 4: Noah ↔ Leila über Supermarket Night (r6)
  const conv4Res = await db.collection('conversations').insertOne({
    rideId: r6, participantIds: [miaId, noahId],
    lastMessageText: 'Wir fahren ab Basel HB, Abfahrt pünktlich!',
    lastMessageAt: subDays(now, 0.3), lastMessageSenderId: noahId,
    createdAt: subDays(now, 0.8), updatedAt: subDays(now, 0.3), _seeded: true
  });
  const conv4 = conv4Res.insertedId;

  // Conv 5: Stefan ↔ Jana über Rigi (r17)
  const conv5Res = await db.collection('conversations').insertOne({
    rideId: r17, participantIds: [stefanId, janaId],
    lastMessageText: 'Super, ich bin dabei! Soll ich einen Rucksack mitbringen?',
    lastMessageAt: subDays(now, 0.1), lastMessageSenderId: stefanId,
    createdAt: subDays(now, 0.5), updatedAt: subDays(now, 0.1), _seeded: true
  });
  const conv5 = conv5Res.insertedId;

  // ── Bookings (mit korrekten conversationIds) ──────────────────────────────
  const bookings = [
    // Stefan bucht Imagine Dragons bei Marco (r1) → accepted
    {
      rideId: r1, passengerId: stefanId, passengerName: 'Stefan Müller',
      pickupLocation: 'Töss, Winterthur',
      pickupCoords: { lat: '47.5082', lon: '8.6994' },
      bookedPrice: 15, status: 'accepted', paymentStatus: 'pending',
      estimatedPickupTime: pt(dep.d1, 10), recommendedReadyTime: pt(dep.d1, 5),
      latestReadyTime: pt(dep.d1, 25), estimatedArrivalAtEvent: pt(dep.d1, 45),
      timeAccuracy: 'exact', routeVersion: 1,
      noShowPolicySnapshot: POLICY, conversationId: conv1,
      _seeded: true, createdAt: subDays(new Date(), 2)
    },
    // Leila bucht Imagine Dragons bei Marco (r1) → accepted (Fahrt fast voll)
    {
      rideId: r1, passengerId: leilaId, passengerName: 'Leila Ahmadi',
      pickupLocation: 'Nänikon, Uster',
      pickupCoords: { lat: '47.3511', lon: '8.7294' },
      bookedPrice: 15, status: 'accepted', paymentStatus: 'pending',
      estimatedPickupTime: pt(dep.d1, 22), recommendedReadyTime: pt(dep.d1, 17),
      latestReadyTime: pt(dep.d1, 37), estimatedArrivalAtEvent: pt(dep.d1, 50),
      timeAccuracy: 'exact', routeVersion: 1,
      noShowPolicySnapshot: POLICY, conversationId: conv2,
      _seeded: true, createdAt: subDays(new Date(), 1)
    },
    // Leila bucht Street Parade bei Alina (r3) → pending
    {
      rideId: r3, passengerId: leilaId, passengerName: 'Leila Ahmadi',
      pickupLocation: 'Zürich HB, Zürich',
      pickupCoords: { lat: '47.3779', lon: '8.5405' },
      bookedPrice: 20, status: 'pending', paymentStatus: 'pending',
      noShowPolicySnapshot: POLICY, conversationId: conv3,
      _seeded: true, createdAt: subDays(new Date(), 1)
    },
    // Stefan bucht Street Parade bei Alina (r3) → pending
    {
      rideId: r3, passengerId: stefanId, passengerName: 'Stefan Müller',
      pickupLocation: 'Wülflingen, Winterthur',
      pickupCoords: { lat: '47.5095', lon: '8.6889' },
      bookedPrice: 20, status: 'pending', paymentStatus: 'pending',
      noShowPolicySnapshot: POLICY,
      _seeded: true, createdAt: subDays(new Date(), 0.5)
    },
    // Stefan bucht Gurten Festival bei Stefan (r4) — eigene Testbuchung
    {
      rideId: r4, passengerId: leilaId, passengerName: 'Leila Ahmadi',
      pickupLocation: 'Eschenmoser, Wetzikon',
      pickupCoords: { lat: '47.3220', lon: '8.7980' },
      bookedPrice: 35, status: 'pending', paymentStatus: 'pending',
      noShowPolicySnapshot: POLICY,
      _seeded: true, createdAt: subDays(new Date(), 0.25)
    },
    // Mia bucht Supermarket Club Night bei Noah (r6)
    {
      rideId: r6, passengerId: miaId, passengerName: 'Mia Widmer',
      pickupLocation: 'Zürich HB, Zürich',
      pickupCoords: { lat: '47.3779', lon: '8.5405' },
      bookedPrice: 15, status: 'pending', paymentStatus: 'pending',
      noShowPolicySnapshot: POLICY, conversationId: conv4,
      _seeded: true, createdAt: subDays(new Date(), 0.5)
    },
    // Stefan bucht Rigi Wandertag bei Jana (r17) → pending
    {
      rideId: r17, passengerId: stefanId, passengerName: 'Stefan Müller',
      pickupLocation: 'Wetzikon, Bahnhof',
      pickupCoords: { lat: '47.3250', lon: '8.8008' },
      bookedPrice: 15, status: 'pending', paymentStatus: 'pending',
      noShowPolicySnapshot: POLICY, conversationId: conv5,
      _seeded: true, createdAt: subDays(new Date(), 0.2)
    },
    // David bucht Jungfrau Marathon bei Yasmin (r12) → pending
    {
      rideId: r12, passengerId: davidId, passengerName: 'David Flück',
      pickupLocation: 'Bern Hbf, Bern',
      pickupCoords: { lat: '46.9480', lon: '7.4474' },
      bookedPrice: 18, status: 'pending', paymentStatus: 'pending',
      noShowPolicySnapshot: POLICY,
      _seeded: true, createdAt: subDays(new Date(), 0.1)
    },
    // Vergangene akzeptierte Buchung: Stefan bei Leila (Montreux, r20)
    {
      rideId: r20, passengerId: stefanId, passengerName: 'Stefan Müller',
      pickupLocation: 'Zürich HB, Zürich',
      pickupCoords: { lat: '47.3779', lon: '8.5405' },
      bookedPrice: 25, status: 'completed', paymentStatus: 'paid',
      estimatedPickupTime: pt(dep.past1, 15), recommendedReadyTime: pt(dep.past1, 10),
      latestReadyTime: pt(dep.past1, 30), estimatedArrivalAtEvent: pt(dep.past1, 90),
      timeAccuracy: 'exact', routeVersion: 2,
      noShowPolicySnapshot: POLICY,
      _seeded: true, createdAt: subDays(new Date(), 10)
    },
    // Mia bei Leila (Montreux, r20) → completed
    {
      rideId: r20, passengerId: miaId, passengerName: 'Mia Widmer',
      pickupLocation: 'Hardbrücke, Zürich',
      pickupCoords: { lat: '47.3851', lon: '8.5205' },
      bookedPrice: 25, status: 'completed', paymentStatus: 'paid',
      noShowPolicySnapshot: POLICY,
      _seeded: true, createdAt: subDays(new Date(), 10)
    },
    // Abgelehnte Buchung: Noah bei Alina (Street Parade r3) — Demo-Fall
    {
      rideId: r3, passengerId: noahId, passengerName: 'Noah Zimmermann',
      pickupLocation: 'Hardbrücke, Zürich',
      pickupCoords: { lat: '47.3851', lon: '8.5205' },
      bookedPrice: 20, status: 'rejected', paymentStatus: 'pending',
      noShowPolicySnapshot: POLICY,
      _seeded: true, createdAt: subDays(new Date(), 3)
    },
    // Yasmin bucht Paleo Festival bei Leila (r5) → pending
    {
      rideId: r5, passengerId: yasminId, passengerName: 'Yasmin Bürki',
      pickupLocation: 'Laupenstrasse 6, Bern',
      pickupCoords: { lat: '46.9490', lon: '7.4330' },
      bookedPrice: 22, status: 'pending', paymentStatus: 'pending',
      noShowPolicySnapshot: POLICY,
      _seeded: true, createdAt: subDays(new Date(), 0.3)
    }
  ];

  await db.collection('bookings').insertMany(bookings);
  console.log(`✅  ${bookings.length} Buchungen eingefügt`);

  // ── Messages ──────────────────────────────────────────────────────────────
  await db.collection('messages').insertMany([
    // Conv 1: Stefan ↔ Marco (Imagine Dragons)
    { conversationId: conv1, senderId: stefanId, text: 'Hallo Marco! Kannst du mich in Töss abholen?', readBy: [stefanId, marcoId], createdAt: subDays(now, 2), _seeded: true },
    { conversationId: conv1, senderId: marcoId, text: 'Klar, das liegt auf dem Weg. Wo genau in Töss?', readBy: [stefanId, marcoId], createdAt: subDays(now, 1.9), _seeded: true },
    { conversationId: conv1, senderId: stefanId, text: 'Kreuzstrasse 5, direkt beim Bahnhof Töss.', readBy: [stefanId, marcoId], createdAt: subDays(now, 1.8), _seeded: true },
    { conversationId: conv1, senderId: marcoId, text: 'Kein Problem, ich nehme dich bei der Technikumstrasse mit.', readBy: [stefanId, marcoId], createdAt: subDays(now, 0.2), _seeded: true },

    // Conv 2: Leila ↔ Marco (Imagine Dragons, Uster)
    { conversationId: conv2, senderId: leilaId, text: 'Hi Marco! Ich bin in Nänikon, Uster. Passt das?', readBy: [leilaId, marcoId], createdAt: subDays(now, 1), _seeded: true },
    { conversationId: conv2, senderId: marcoId, text: 'Ja, Uster liegt auf dem Weg nach Zürich. Komme gegen 19:30 Uhr.', readBy: [leilaId, marcoId], createdAt: subDays(now, 0.9), _seeded: true },
    { conversationId: conv2, senderId: leilaId, text: 'Perfekt, ich bin in Uster. Bis dann!', readBy: [leilaId, marcoId], createdAt: subDays(now, 0.5), _seeded: true },

    // Conv 3: Leila ↔ Alina (Street Parade — ungelesen bei Alina)
    { conversationId: conv3, senderId: alinaId, text: 'Hallo Leila! Deine Anfrage für die Street Parade habe ich gesehen.', readBy: [alinaId, leilaId], createdAt: subDays(now, 1), _seeded: true },
    { conversationId: conv3, senderId: leilaId, text: 'Super! Kann ich in Zürich zusteigen statt Wil?', readBy: [alinaId, leilaId], createdAt: subDays(now, 0.9), _seeded: true },
    { conversationId: conv3, senderId: alinaId, text: 'Zürich liegt leider nicht auf dem Weg. Aber ich halte kurz am Bahnhof Wil!', readBy: [alinaId, leilaId], createdAt: subDays(now, 0.8), _seeded: true },
    { conversationId: conv3, senderId: leilaId, text: 'Wo ist der Treffpunkt in Wil genau?', readBy: [leilaId], createdAt: subDays(now, 0.05), _seeded: true }, // Alina ungelesen

    // Conv 4: Mia ↔ Noah (Supermarket Club Night)
    { conversationId: conv4, senderId: miaId, text: 'Hi Noah! Kann ich in Zürich HB zusteigen?', readBy: [miaId, noahId], createdAt: subDays(now, 0.8), _seeded: true },
    { conversationId: conv4, senderId: noahId, text: 'Klar, Zürich HB ist ein guter Zwischenstopp!', readBy: [miaId, noahId], createdAt: subDays(now, 0.7), _seeded: true },
    { conversationId: conv4, senderId: miaId, text: 'Und bringst du gute Musik mit? :)', readBy: [miaId, noahId], createdAt: subDays(now, 0.4), _seeded: true },
    { conversationId: conv4, senderId: noahId, text: 'Wir fahren ab Basel HB, Abfahrt pünktlich!', readBy: [noahId], createdAt: subDays(now, 0.3), _seeded: true }, // Mia ungelesen

    // Conv 5: Stefan ↔ Jana (Rigi)
    { conversationId: conv5, senderId: stefanId, text: 'Hallo Jana! Ich interessiere mich für den Rigi-Wandertag.', readBy: [stefanId, janaId], createdAt: subDays(now, 0.5), _seeded: true },
    { conversationId: conv5, senderId: janaId, text: 'Super! Ich hole dich in Wetzikon ab, ca. um 7:30 Uhr.', readBy: [stefanId, janaId], createdAt: subDays(now, 0.4), _seeded: true },
    { conversationId: conv5, senderId: stefanId, text: 'Super, ich bin dabei! Soll ich einen Rucksack mitbringen?', readBy: [stefanId], createdAt: subDays(now, 0.1), _seeded: true }, // Jana ungelesen
  ]);
  console.log(`✅  Conversations und Messages eingefügt`);

  // ── Ratings ───────────────────────────────────────────────────────────────
  const ratings = [
    { rideId: r20, bookingId: new ObjectId(), fromUserId: stefanId, toUserId: leilaId, fromRole: 'passenger', stars: 5, comment: 'Top Fahrerin, pünktlich und entspannt. Gerne wieder!', _seeded: true, createdAt: subDays(new Date(), 2) },
    { rideId: r20, bookingId: new ObjectId(), fromUserId: leilaId, toUserId: stefanId, fromRole: 'driver', stars: 5, comment: 'Stefan war genau zur Zeit bereit. Toller Mitfahrer.', _seeded: true, createdAt: subDays(new Date(), 2) },
    { rideId: r20, bookingId: new ObjectId(), fromUserId: miaId, toUserId: leilaId, fromRole: 'passenger', stars: 5, comment: 'Mega angenehme Fahrt, sehr empfehlenswert!', _seeded: true, createdAt: subDays(new Date(), 2) },
    { rideId: r21, bookingId: new ObjectId(), fromUserId: miaId, toUserId: noahId, fromRole: 'passenger', stars: 4, comment: 'Gute Musik, etwas spät abgefahren. Insgesamt gut!', _seeded: true, createdAt: subDays(new Date(), 5) },
    { rideId: r21, bookingId: new ObjectId(), fromUserId: noahId, toUserId: miaId, fromRole: 'driver', stars: 5, comment: 'Sehr angenehme Mitfahrerin, immer pünktlich.', _seeded: true, createdAt: subDays(new Date(), 5) },
    { rideId: r22, bookingId: new ObjectId(), fromUserId: yasminId, toUserId: janaId, fromRole: 'passenger', stars: 5, comment: 'Jana kennt die Routen perfekt! Sehr empfehlenswert.', _seeded: true, createdAt: subDays(new Date(), 10) },
    { rideId: r22, bookingId: new ObjectId(), fromUserId: janaId, toUserId: yasminId, fromRole: 'driver', stars: 4, comment: 'Angenehme Mitfahrerin, gute Gesellschaft.', _seeded: true, createdAt: subDays(new Date(), 10) },
    { rideId: new ObjectId(), bookingId: new ObjectId(), fromUserId: lucaId, toUserId: marcoId, fromRole: 'passenger', stars: 5, comment: 'Beste Fahrt ever! Marco ist super locker und pünktlich.', _seeded: true, createdAt: subDays(new Date(), 15) },
    { rideId: new ObjectId(), bookingId: new ObjectId(), fromUserId: davidId, toUserId: alinaId, fromRole: 'passenger', stars: 5, comment: 'Sehr angenehme Fahrt, Alina ist sehr freundlich.', _seeded: true, createdAt: subDays(new Date(), 20) },
  ];

  await db.collection('ratings').insertMany(ratings);
  console.log(`✅  ${ratings.length} Ratings eingefügt`);

  // ── Notifications ─────────────────────────────────────────────────────────
  const notifications = [
    { userId: marcoId, type: 'booking_received', isRead: false, title: 'Stefan Müller möchte mitfahren', message: 'Neue Anfrage für „Imagine Dragons". Abholort: Töss, Winterthur', rideId: r1, _seeded: true, createdAt: subDays(now, 2) },
    { userId: marcoId, type: 'booking_received', isRead: false, title: 'Leila Ahmadi möchte mitfahren', message: 'Neue Anfrage für „Imagine Dragons". Abholort: Nänikon, Uster', rideId: r1, _seeded: true, createdAt: subDays(now, 1) },
    { userId: stefanId, type: 'booking_accepted', isRead: false, title: 'Anfrage angenommen!', message: 'Deine Anfrage für „Imagine Dragons – Hallenstadion" wurde bestätigt. Spätestens abholbereit: 19:40 Uhr.', rideId: r1, _seeded: true, createdAt: subDays(now, 1.5) },
    { userId: leilaId, type: 'booking_accepted', isRead: true, title: 'Anfrage angenommen!', message: 'Deine Anfrage für „Imagine Dragons – Hallenstadion" wurde bestätigt. Abholung ca. 19:52 Uhr.', rideId: r1, _seeded: true, createdAt: subDays(now, 0.8) },
    { userId: alinaId, type: 'booking_received', isRead: false, title: 'Leila Ahmadi möchte mitfahren', message: 'Neue Anfrage für „Street Parade Zürich". Abholort: Zürich HB', rideId: r3, _seeded: true, createdAt: subDays(now, 1) },
    { userId: alinaId, type: 'booking_received', isRead: false, title: 'Stefan Müller möchte mitfahren', message: 'Neue Anfrage für „Street Parade Zürich". Abholort: Wülflingen', rideId: r3, _seeded: true, createdAt: subDays(now, 0.5) },
    { userId: noahId, type: 'booking_rejected', isRead: false, title: 'Anfrage abgelehnt', message: 'Leider wurde deine Anfrage für die Street Parade abgelehnt.', rideId: r3, _seeded: true, createdAt: subDays(now, 3) },
    { userId: alinaId, type: 'new_message', isRead: false, title: 'Neue Nachricht von Leila Ahmadi', message: 'Wo ist der Treffpunkt in Wil genau?', conversationId: conv3, _seeded: true, createdAt: subDays(now, 0.05) },
    { userId: miaId, type: 'new_message', isRead: false, title: 'Neue Nachricht von Noah Zimmermann', message: 'Wir fahren ab Basel HB, Abfahrt pünktlich!', conversationId: conv4, _seeded: true, createdAt: subDays(now, 0.3) },
    { userId: janaId, type: 'new_message', isRead: false, title: 'Neue Nachricht von Stefan Müller', message: 'Super, ich bin dabei! Soll ich einen Rucksack mitbringen?', conversationId: conv5, _seeded: true, createdAt: subDays(now, 0.1) },
    { userId: janaId, type: 'booking_received', isRead: false, title: 'Stefan Müller möchte mitfahren', message: 'Neue Anfrage für „Rigi Wandertag". Abholort: Wetzikon, Bahnhof', rideId: r17, _seeded: true, createdAt: subDays(now, 0.2) },
    { userId: leilaId, type: 'booking_received', isRead: false, title: 'Yasmin Bürki möchte mitfahren', message: 'Neue Anfrage für „Paleo Festival Nyon". Abholort: Laupenstrasse 6, Bern', rideId: r5, _seeded: true, createdAt: subDays(now, 0.3) },
    { userId: stefanId, type: 'rating_pending', isRead: false, title: 'Fahrt abgeschlossen — Bewertung ausstehend', message: 'Wie war deine Fahrt zum Montreux Jazz Festival mit Leila? Jetzt bewerten!', rideId: r20, _seeded: true, createdAt: subDays(now, 2) },
  ];

  await db.collection('notifications').insertMany(notifications);
  console.log(`✅  ${notifications.length} Notifications eingefügt`);

  // ── Zusammenfassung ───────────────────────────────────────────────────────
  console.log('\n🎉  Seeding abgeschlossen!\n');
  console.log('📋  Zugangsdaten (alle Passwörter: Test1234!):\n');
  console.log(`    Admin:      ${ADMIN_EMAIL}  /  ${ADMIN_PASSWORD}`);
  for (const u of usersData) {
    console.log(`    ${u.firstName.padEnd(8)} ${u.lastName.padEnd(12)} ${u.email.padEnd(36)} /  Test1234!  (${u.region})`);
  }
  console.log('');

  await client.close();
}

seed().catch(err => {
  console.error('\n❌  Seeding fehlgeschlagen:', err);
  process.exit(1);
});
