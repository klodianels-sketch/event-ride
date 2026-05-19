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

export function calcPickupTimes(departureTime: Date) {
  const estimatedPickupTime = new Date(departureTime.getTime() + 20 * 60 * 1000);
  const mustArriveBy = new Date(estimatedPickupTime.getTime() - 5 * 60 * 1000);
  const latestArrivalTime = new Date(mustArriveBy.getTime() + 10 * 60 * 1000);
  return { estimatedPickupTime, mustArriveBy, latestArrivalTime };
}
