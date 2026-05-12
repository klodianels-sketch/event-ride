export interface Ride {
	_id: string;
	eventName: string;
	startLocation: string;
	departureTime: string;
	pickupTime: string;
	arrivalTime: string;
	seats: number;
	seatsAvailable: number;
	pricePerPerson: number;
	driverName: string;
	createdAt: Date;
}
