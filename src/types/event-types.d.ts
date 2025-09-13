// types/event-types.ts
export type EventMap = {
  userLoggedIn: { userId: string; role: string; permissions: string[] };
  userLoggedOut: undefined;

  // Notifications
  notification: { message: string; type: 'success' | 'error' | 'warning' | 'info' };

  // Booking concurrency
  seatSelecting: { seatId: number; userId: string; timestamp: number };
  seatReserved: { seatId: number; userId: string; expiresAt: number };
  seatReleased: { seatId: number; userId: string };
  seatConflict: { seatId: number };
  ticketBooked: { userId: string; seats: number[] };
  bookingFailed: { errorMessage: string };
};
