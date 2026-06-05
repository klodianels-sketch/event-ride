// Zentrale Storno-Policy — alle Werte hier konfigurieren, nie im UI hart einbrennen.

export const CANCELLATION_POLICY = {
  // Kostenlose Stornierung bis N Stunden vor Abfahrt
  freeCancellationWindowHours: 24,

  // Mitfahrer storniert nach Ablauf des Fensters
  passengerLate: {
    type: 'percentage' as const,
    value: 20  // 20 % des Fahrpreises
  },

  // Mitfahrer erscheint nicht (No-Show): einbehalten
  noShow: {
    type: 'percentage' as const,
    value: 80  // 80 % des Fahrpreises
  }
} as const;

export interface CancellationFeeResult {
  fee: number;                  // CHF, gerundet auf 2 Stellen
  isFree: boolean;
  hoursUntilDeparture: number;
}

export function calcPassengerCancellationFee(
  bookedPrice: number,
  departureTime: Date,
  now = new Date()
): CancellationFeeResult {
  const hoursUntilDeparture =
    (departureTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilDeparture >= CANCELLATION_POLICY.freeCancellationWindowHours) {
    return { fee: 0, isFree: true, hoursUntilDeparture };
  }

  const { type, value } = CANCELLATION_POLICY.passengerLate;
  const rawFee =
    type === 'percentage'
      ? bookedPrice * (value / 100)
      : Math.min(value, bookedPrice);

  return {
    fee: Math.round(rawFee * 100) / 100,
    isFree: false,
    hoursUntilDeparture
  };
}

export function calcNoShowFee(bookedPrice: number): number {
  const { type, value } = CANCELLATION_POLICY.noShow;
  const rawFee =
    type === 'percentage'
      ? bookedPrice * (value / 100)
      : Math.min(value, bookedPrice);
  return Math.round(rawFee * 100) / 100;
}
