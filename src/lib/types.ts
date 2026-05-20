import type { ObjectId } from 'mongodb';
import type { TimeAccuracy } from '$lib/routing';

export type { TimeAccuracy };

export interface Coords {
  lat: string;
  lon: string;
}

export interface NoShowPolicy {
  waitMinutes: number;    // wie lange Fahrer nach estimatedPickupTime wartet
  penaltyPercent: number; // 0-100: wieviel % des Preises einbehalten werden
}

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
  eventLocation: string;         // oeffentlich
  eventImage?: string;
  eventLocationCoords?: Coords;  // oeffentlich (Event-Ort ist bekannt)
  startLocation: string;         // oeffentlich: grobe Stadt
  startLocationExact?: string;   // PRIVAT: exakte Adresse, nie an Client
  startCoords?: Coords;          // PRIVAT: exakte Koordinaten, nie an Client
  startCoordsRough?: Coords;     // semi-oeffentlich: Stadtebene fuer Vorschau-Berechnung
  departureTime: Date;
  estimatedArrivalTime: Date;    // Direkte Route; wird nach jeder Buchung neu berechnet
  seats: number;
  seatsAvailable: number;
  pricePerPerson: number;
  fairplayWindowMinutes: number;
  noShowPolicy: NoShowPolicy;
  routeVersion: number;          // wird bei jeder Route-Aenderung erhoeht
  status: 'active' | 'cancelled' | 'completed';
  createdAt: Date;
}

export interface Booking {
  _id: ObjectId;
  rideId: ObjectId;
  passengerId: ObjectId;
  passengerName: string;
  pickupLocation: string;
  pickupCoords?: Coords;
  estimatedPickupTime: Date;
  recommendedReadyTime: Date;    // estimatedPickupTime - 8 Min (rechtzeitig bereit sein)
  latestReadyTime: Date;         // estimatedPickupTime + fairplayWindowMinutes (Fahrer faehrt spaetestens dann)
  estimatedArrivalAtEvent: Date;
  bookedPrice: number;
  routeVersion: number;          // Route-Version zum Buchungszeitpunkt
  timeAccuracy: TimeAccuracy;
  noShowPolicySnapshot: NoShowPolicy; // Regel zum Buchungszeitpunkt eingefroren
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
