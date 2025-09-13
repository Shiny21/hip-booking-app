// types/eventbus.d.ts
declare module 'authApp/EventBus' {
  export type EventMap = {
    userLoggedIn: { userId: string; role: string; permissions: string[] };
    userLoggedOut: undefined;
    notification: { message: string; type: 'success' | 'error' | 'warning' | 'info' };
    seatSelecting: { seatId: number; userId: string; timestamp: number ; expiresAt: number};
    seatReserved: { seatId: number; userId: string; expiresAt: number };
    seatReleased: { seatId: number; userId: string };
    seatConflict: { seatId: number };
    ticketBooked: { userId: string; seats: number[]; timestamp: number };
    bookingFailed: { errorMessage: string };
  };

  class EventBus {
    subscribe<K extends keyof EventMap>(
      event: K,
      listener: (payload: EventMap[K]) => void
    ): () => void;

    publish<K extends keyof EventMap>(
      event: K,
      payload: EventMap[K]
    ): void;
  }

  export const eventBus: EventBus;
}
