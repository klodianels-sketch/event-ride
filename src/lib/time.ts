export function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)}, ${formatTime(date)}`;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

// recommendedReadyTime: 5 Min vor der geschaetzten Abholzeit bereit sein
// latestReadyTime: Fahrer wartet maximal 15 Min nach Abholzeit
export function calcReadyTimes(
  estimatedPickupTime: Date,
  fairplayWindowMinutes = 15
): { recommendedReadyTime: Date; latestReadyTime: Date } {
  return {
    recommendedReadyTime: addMinutes(estimatedPickupTime, -5),
    latestReadyTime: addMinutes(estimatedPickupTime, fairplayWindowMinutes)
  };
}
