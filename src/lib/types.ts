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
