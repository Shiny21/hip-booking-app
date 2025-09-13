// BookingForm.tsx
import { eventBus } from 'authApp/EventBus';
import React, { useState, useEffect } from 'react';
import '../styles/BookingForm.css';

interface User {
  userId: string;
  role: string;
  permissions?: string[];
}

interface Booking {
  userId: string;
  seats: number[];
  timestamp: number;   // 🔹 new field for reporting
}

interface ReservedSeat {
  userId: string;
  expiresAt: number;
}

const BOOKING_STORAGE_KEY = 'bookings';
const RESERVED_STORAGE_KEY = 'reservedSeats';
const TOTAL_SEATS = 50;
const RESERVATION_TIMEOUT = 30000; // 30s temporary hold

const BookingForm = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [bookedSeats, setBookedSeats] = useState<number[]>([]);
  const [reservedSeats, setReservedSeats] = useState<{ [seatId: number]: ReservedSeat }>({});

  // ---------- helpers ----------
  const saveReservedSeats = (data: { [seatId: number]: ReservedSeat }) => {
    localStorage.setItem(RESERVED_STORAGE_KEY, JSON.stringify(data));
  };

  const loadReservedSeats = (): { [seatId: number]: ReservedSeat } => {
    const saved = localStorage.getItem(RESERVED_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  };

  // ---------- setup ----------
  useEffect(() => {
    // 1. Load current session user
    const savedUser = sessionStorage.getItem('user');
    if (savedUser) {
      try {
        const parsed: User = JSON.parse(savedUser);
        setIsLoggedIn(true);
        setUser(parsed);
      } catch (err) {
        console.error('Failed to parse user from sessionStorage', err);
      }
    }

    // 2. Load booked seats
    const savedBookings = localStorage.getItem(BOOKING_STORAGE_KEY);
    if (savedBookings) {
      const parsed: Booking[] = JSON.parse(savedBookings);
      const allBooked = parsed.flatMap((b) => b.seats);
      setBookedSeats(allBooked);
    }

    // 3. Load reserved seats
    setReservedSeats(loadReservedSeats());

    // 4. Subscribe to login/logout
    const unsubLogin = eventBus.subscribe('userLoggedIn', (payload: User) => {
      setIsLoggedIn(true);
      setUser(payload);
    });

    const unsubLogout = eventBus.subscribe('userLoggedOut', () => {
      setIsLoggedIn(false);
      setUser(null);
      setSelectedSeats([]);
    });

    // 5. Subscribe to reservation events
    const unsubSelecting = eventBus.subscribe('seatSelecting', ({ seatId, userId, expiresAt }) => {
      setReservedSeats((prev) => {
        const updated = { ...prev, [seatId]: { userId, expiresAt } };
        saveReservedSeats(updated);
        return updated;
      });
    });

    const unsubReleased = eventBus.subscribe('seatReleased', ({ seatId }) => {
      setReservedSeats((prev) => {
        const updated = { ...prev };
        delete updated[seatId];
        saveReservedSeats(updated);
        return updated;
      });
    });

    const unsubBooked = eventBus.subscribe('ticketBooked', ({ seats }) => {
      setBookedSeats((prev) => [...prev, ...seats]);
      setReservedSeats((prev) => {
        const updated = { ...prev };
        seats.forEach((s) => delete updated[s]);
        saveReservedSeats(updated);
        return updated;
      });
    });

    const unsubConflict = eventBus.subscribe('seatConflict', ({ seatId }) => {
      eventBus.publish('notification', {
        message: `Seat ${seatId} is already reserved by another user`,
        type: 'warning',
      });
    });

    // 6. Expiry cleanup loop
    const interval = setInterval(() => {
      setReservedSeats((prev) => {
        const now = Date.now();
        const updated = { ...prev };
        let changed = false;
        Object.keys(updated).forEach((seatId) => {
          if (updated[+seatId].expiresAt < now) {
            delete updated[+seatId];
            changed = true;
          }
        });
        if (changed) saveReservedSeats(updated);
        return updated;
      });
    }, 1000);

    return () => {
      unsubLogin();
      unsubLogout();
      unsubSelecting();
      unsubReleased();
      unsubBooked();
      unsubConflict();
      clearInterval(interval);
    };
  }, []);

  // ---------- utils ----------
  const hasPermission = (permission: string): boolean =>
    user?.permissions?.includes(permission) || false;

  const toggleSeat = (seat: number) => {
    if (!user) return;
    if (bookedSeats.includes(seat) || !hasPermission('book_tickets')) return;

    const isSelected = selectedSeats.includes(seat);

    if (isSelected) {
      setSelectedSeats((prev) => prev.filter((s) => s !== seat));
      eventBus.publish('seatReleased', { seatId: seat, userId: user.userId });
    } else {
      if (reservedSeats[seat] && reservedSeats[seat].userId !== user.userId) {
        eventBus.publish('seatConflict', { seatId: seat });
        return;
      }

      const expiresAt = Date.now() + RESERVATION_TIMEOUT;
      setSelectedSeats((prev) => [...prev, seat]);
      eventBus.publish('seatSelecting', { seatId: seat, userId: user.userId, timestamp: Date.now(), expiresAt });

      // auto-release after timeout
      const seatId = seat;
      setTimeout(() => {
        setSelectedSeats((prev) => prev.filter((s) => s !== seatId));
        eventBus.publish('seatReleased', { seatId, userId: user.userId });
      }, RESERVATION_TIMEOUT);
    }
  };

const handleBookTickets = () => {
  if (!user || selectedSeats.length === 0 || !hasPermission('book_tickets')) return;

  // 🔄 Reload latest bookings and reserved seats (simulate backend check)
  const savedBookings = localStorage.getItem(BOOKING_STORAGE_KEY);
  const currentBookings: Booking[] = savedBookings ? JSON.parse(savedBookings) : [];
  const bookedNow = currentBookings.flatMap((b) => b.seats);

  const latestReserved = loadReservedSeats();

  // 🚫 Check for conflicts
  const conflictSeats = selectedSeats.filter(
    (s) =>
      bookedNow.includes(s) || // already booked
      (latestReserved[s] && latestReserved[s].userId !== user.userId) // reserved by another user
  );

  if (conflictSeats.length > 0) {
    eventBus.publish('notification', {
      message: `Booking failed. Seats ${conflictSeats.join(', ')} are already taken.`,
      type: 'error',
    });
    setSelectedSeats([]); // reset user’s selection
    return;
  }

  // ✅ No conflicts → proceed
  const newBooking: Booking = {
    userId: user.userId || 'anonymous', // fallback in case userId is null
    seats: selectedSeats,
    timestamp: Date.now(),
  };

  const saved = localStorage.getItem(BOOKING_STORAGE_KEY);
  const existing = saved ? JSON.parse(saved) : [];
  const updated = [...existing, newBooking];
  localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(updated));

  const updatedBookings = [...currentBookings, newBooking];
  localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(updatedBookings));

  // publish booking (include timestamp for reporting consistency)
  eventBus.publish('ticketBooked', {
    userId: newBooking.userId,
    seats: selectedSeats,
    timestamp: newBooking.timestamp,
  });

  // update local state
  setBookedSeats((prev) => [...prev, ...selectedSeats]);
  setSelectedSeats([]);

  eventBus.publish('notification', {
    message: `Booking successful for seats: ${newBooking.seats.join(', ')}`,
    type: 'success',
  });
};

  // ---------- render ----------
  return (
    <div>
      <h1>Booking App</h1>
      <p>This component is loaded from the booking micro-frontend.</p>

      {isLoggedIn && user ? (
        <>
          <p>Welcome, {user.userId}! (Role: {user.role})</p>
          {hasPermission('book_tickets') ? (
            <>
              <div className="seating-grid">
                {Array.from({ length: TOTAL_SEATS }, (_, i) => i + 1).map((seat) => {
                  const isBooked = bookedSeats.includes(seat);
                  const isSelected = selectedSeats.includes(seat);
                  const isReserved = reservedSeats[seat] && reservedSeats[seat].userId !== user?.userId;

                  return (
                    <button
                      key={seat}
                      className={`seat 
                        ${isBooked ? 'booked' :
                        isReserved ? 'reserved' :
                        isSelected ? 'selected' : ''}`}
                      disabled={isBooked || isReserved}
                      onClick={() => toggleSeat(seat)}
                    >
                      {seat}
                    </button>
                  );
                })}
              </div>
              <button
                className="book-btn"
                onClick={handleBookTickets}
                disabled={selectedSeats.length === 0}
              >
                Book {selectedSeats.length} Seat(s)
              </button>
            </>
          ) : (
            <p style={{ color: 'red', marginTop: '10px' }}>You do not have permission to book tickets.</p>
          )}
        </>
      ) : (
        <p style={{ color: 'red', marginTop: '10px' }}>Please log in to book tickets.</p>
      )}
    </div>
  );
};

export default BookingForm;
