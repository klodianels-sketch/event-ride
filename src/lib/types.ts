import type { ObjectId } from 'mongodb';
import type { TimeAccuracy } from '$lib/routing';

export type { TimeAccuracy };

export type EventCategory =
  | 'music'
  | 'festival'
  | 'nightlife'
  | 'sport'
  | 'hiking'
  | 'culture'
  | 'other';

export interface Coords {
  lat: string;
  lon: string;
}

export interface NoShowPolicy {
  waitMinutes: number;
  penaltyPercent: number;
}

export type UserRole = 'user' | 'admin';

export interface NotificationSettings {
  newBookingRequest: boolean;
  bookingStatusChange: boolean;
  newMessage: boolean;
  rideUpdates: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  newBookingRequest: true,
  bookingStatusChange: true,
  newMessage: true,
  rideUpdates: true
};

export interface User {
  _id: ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  avatarUrl?: string;
  bio?: string;
  region?: string;
  phone?: string;
  interests: string[];
  notificationSettings: NotificationSettings;
  profilePicture?: string;
  rating: number;
  totalRatings: number;
  isDisabled: boolean;
  disabledAt?: Date;
  disabledBy?: ObjectId;
  disabledReason?: string;
  createdAt: Date;
  updatedAt?: Date;
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
  driverRating?: number;
  eventName: string;
  eventCategory?: EventCategory;
  eventLocation: string;
  eventImage?: string;
  eventLocationCoords?: Coords;
  startLocation: string;
  startLocationExact?: string;   // PRIVAT — nie an Client senden
  startCoords?: Coords;          // PRIVAT — nie an Client senden
  startCoordsRough?: Coords;
  departureTime: Date;
  estimatedArrivalTime: Date;
  seats: number;
  seatsAvailable: number;
  pricePerPerson: number;
  fairplayWindowMinutes: number;
  noShowPolicy: NoShowPolicy;
  // Optionale Zwischenstopps, die der Fahrer beim Erstellen festgelegt hat
  waypoints?: Array<{ label: string; lat: string; lon: string }>;
  routeVersion: number;
  status: 'active' | 'cancelled' | 'completed';
  moderationReason?: string;
  moderatedAt?: Date;
  moderatedBy?: ObjectId;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Booking {
  _id: ObjectId;
  rideId: ObjectId;
  passengerId: ObjectId;
  passengerName: string;
  pickupLocation: string;
  pickupCoords?: Coords;
  estimatedPickupTime?: Date;
  recommendedReadyTime?: Date;
  latestReadyTime?: Date;
  estimatedArrivalAtEvent?: Date;
  bookedPrice: number;
  routeVersion?: number;
  timeAccuracy?: TimeAccuracy;
  noShowPolicySnapshot: NoShowPolicy;
  conversationId?: ObjectId;
  status:
    | 'pending'
    | 'accepted'
    | 'confirmed'
    | 'rejected'
    | 'cancelled'
    | 'cancelled_by_passenger'
    | 'cancelled_by_driver'
    | 'no-show'
    | 'completed';
  cancellationReason?: string;
  cancellationFee?: number;
  cancelledAt?: Date;
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'forfeited';
  createdAt: Date;
  updatedAt?: Date;
}

export type NotificationType =
  | 'booking_received'
  | 'booking_accepted'
  | 'booking_rejected'
  | 'booking_cancelled_passenger'
  | 'booking_cancelled_driver'
  | 'ride_cancelled'
  | 'times_updated'
  | 'rating_pending'
  | 'new_message';

export interface Notification {
  _id: ObjectId;
  userId: ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  rideId?: ObjectId;
  bookingId?: ObjectId;
  conversationId?: ObjectId;
  isRead: boolean;
  createdAt: Date;
}

export interface Rating {
  _id: ObjectId;
  rideId: ObjectId;
  bookingId: ObjectId;
  fromUserId: ObjectId;
  toUserId: ObjectId;
  fromRole: 'driver' | 'passenger';
  stars: number;
  comment?: string;
  createdAt: Date;
}

export interface Conversation {
  _id: ObjectId;
  rideId?: ObjectId;
  bookingId?: ObjectId;
  participantIds: ObjectId[];
  lastMessageAt?: Date;
  lastMessageText?: string;
  lastMessageSenderId?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  _id: ObjectId;
  conversationId: ObjectId;
  senderId: ObjectId;
  text: string;
  readBy: ObjectId[];
  createdAt: Date;
}

export interface SessionUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  profilePicture?: string;
  role: UserRole;
}
