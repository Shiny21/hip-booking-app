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
}

const BOOKING_STORAGE_KEY = 'bookings';

const BookingList = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // Load current user
    const savedUser = sessionStorage.getItem('user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }

    // Load bookings
    const loadBookings = () => {
      const savedBookings = localStorage.getItem(BOOKING_STORAGE_KEY);
      return savedBookings ? JSON.parse(savedBookings) : [];
    };
    setBookings(loadBookings());

    // Subscribe to login/logout
    const unsubLogin = eventBus.subscribe('userLoggedIn', (payload: User) => {
      setCurrentUser(payload);
    });

    const unsubLogout = eventBus.subscribe('userLoggedOut', () => {
      setCurrentUser(null);
    });

    // Subscribe to bookings
    const unsubBooked = eventBus.subscribe('ticketBooked', ({ userId, seats }) => {
      setBookings((prev) => [...prev, { userId, seats }]);
    });

    return () => {
      unsubLogin();
      unsubLogout();
      unsubBooked();
    };
  }, []);

  // Filter bookings based on role
  const visibleBookings =
    currentUser?.role === 'customer'
      ? bookings.filter((b) => b.userId === currentUser.userId)
      : bookings;

  return (
    <div style={{ marginTop: '20px' }}>
      <h2>Bookings</h2>
      {visibleBookings.length === 0 ? (
        <p>No bookings yet.</p>
      ) : (
        <ul className="booking-list">
          {visibleBookings.map((booking, index) => (
            <li key={index} className="booking-item">
              <strong>User:</strong> {booking.userId} | <strong>Seats:</strong>{' '}
              {booking.seats.join(', ')}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default BookingList;
