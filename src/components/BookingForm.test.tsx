import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BookingForm from './BookingForm';
import { eventBus } from 'authApp/EventBus';

// Mock the eventBus
jest.mock('authApp/EventBus', () => ({
  eventBus: {
    subscribe: jest.fn(),
    publish: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

// Mock localStorage and sessionStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
  removeItem: jest.fn(),
};
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
  removeItem: jest.fn(),
};

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

describe('BookingForm', () => {
  const mockUser = {
    userId: 'test-user',
    role: 'customer',
    permissions: ['book_tickets'],
  };

  const mockAdminUser = {
    userId: 'admin-user',
    role: 'admin',
    permissions: ['book_tickets', 'view_all_bookings'],
  };

  const mockBookings = [
    { userId: 'user1', seats: [1, 2, 3], timestamp: Date.now() },
    { userId: 'user2', seats: [10, 11], timestamp: Date.now() },
  ];

  const mockReservedSeats = {
    5: { userId: 'other-user', expiresAt: Date.now() + 30000 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    sessionStorageMock.getItem.mockClear();

    // Mock eventBus.subscribe to return unsubscribe function
    (eventBus.subscribe as jest.Mock).mockImplementation((event, callback) => {
      return () => {}; // mock unsubscribe function
    });
  });

  test('renders login message when user is not logged in', async () => {
    sessionStorageMock.getItem.mockReturnValue(null);
    localStorageMock.getItem.mockReturnValue(JSON.stringify([]));
    
    render(<BookingForm />);
    
    await waitFor(() => {
      expect(screen.getByText('Please log in to book tickets.')).toBeInTheDocument();
    });
    expect(screen.queryByText('Welcome')).not.toBeInTheDocument();
  });


  test('shows permission error when user lacks book_tickets permission', async () => {
    const userWithoutPermission = { ...mockUser, permissions: [] };
    sessionStorageMock.getItem.mockReturnValue(JSON.stringify(userWithoutPermission));
    localStorageMock.getItem.mockReturnValue(JSON.stringify([]));
    
    render(<BookingForm />);
    
    await waitFor(() => {
      expect(screen.getByText('You do not have permission to book tickets.')).toBeInTheDocument();
    });
  });

  test('displays seating grid with correct number of seats', async () => {
    sessionStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));
    localStorageMock.getItem.mockReturnValue(JSON.stringify([]));
    
    render(<BookingForm />);
    
    await waitFor(() => {
      const seatButtons = screen.getAllByRole('button', { name: /^\d+$/ });
      expect(seatButtons).toHaveLength(50); // TOTAL_SEATS = 50
    });
  });

  test('marks booked seats as disabled', async () => {
    sessionStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));
    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockBookings));
    
    render(<BookingForm />);
    
    await waitFor(() => {
      // Seats 1, 2, 3, 10, 11 should be booked and disabled
      expect(screen.getByText('1')).toBeDisabled();
      expect(screen.getByText('2')).toBeDisabled();
      expect(screen.getByText('3')).toBeDisabled();
      expect(screen.getByText('10')).toBeDisabled();
      expect(screen.getByText('11')).toBeDisabled();
    });
  });

  test('allows seat selection for available seats', async () => {
    sessionStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));
    localStorageMock.getItem.mockReturnValue(JSON.stringify([]));
    
    render(<BookingForm />);
    
    await waitFor(() => {
      const seat4 = screen.getByText('4');
      const seat6 = screen.getByText('6');
      
      // Select seats
      fireEvent.click(seat4);
      fireEvent.click(seat6);
      
      // Check if seats are selected
      expect(seat4).toHaveClass('selected');
      expect(seat6).toHaveClass('selected');
      
      // Check if book button is enabled
      expect(screen.getByText('Book 2 Seat(s)')).toBeEnabled();
    });
  });

  test('handles successful booking', async () => {
    sessionStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));
    localStorageMock.getItem.mockReturnValue(JSON.stringify([]));
    
    render(<BookingForm />);
    
    await waitFor(() => {
      // Select seats
      fireEvent.click(screen.getByText('4'));
      fireEvent.click(screen.getByText('6'));
    });
    
    // Click book button
    fireEvent.click(screen.getByText('Book 2 Seat(s)'));
    
    await waitFor(() => {
      // Check if localStorage was updated
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'bookings',
        expect.stringContaining('"userId":"test-user"')
      );
      
      // Check if event was published
      expect(eventBus.publish).toHaveBeenCalledWith('ticketBooked', {
        userId: 'test-user',
        seats: [4, 6],
        timestamp: expect.any(Number),
      });
      
      // Check if success notification was sent
      expect(eventBus.publish).toHaveBeenCalledWith('notification', {
        message: expect.stringContaining('Booking successful for seats: 4, 6'),
        type: 'success',
      });
    });
  });

  test('releases seat after timeout', async () => {
    jest.useFakeTimers();
    
    sessionStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));
    localStorageMock.getItem.mockReturnValue(JSON.stringify([]));
    
    render(<BookingForm />);
    
    await waitFor(() => {
      // Select a seat
      fireEvent.click(screen.getByText('4'));
      expect(screen.getByText('4')).toHaveClass('selected');
    });
    
    // Advance timers by reservation timeout
    act(() => {
      jest.advanceTimersByTime(30000);
    });
    
    await waitFor(() => {
      // Seat should be released
      expect(screen.getByText('4')).not.toHaveClass('selected');
      expect(eventBus.publish).toHaveBeenCalledWith('seatReleased', {
        seatId: 4,
        userId: 'test-user',
      });
    });
    
    jest.useRealTimers();
  });

  test('cleans up expired reservations', async () => {
    jest.useFakeTimers();
    
    const expiredReservation = {
      7: { userId: 'other-user', expiresAt: Date.now() - 1000 }, // already expired
    };
    
    sessionStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));
    localStorageMock.getItem
      .mockReturnValueOnce(JSON.stringify([])) // bookings
      .mockReturnValueOnce(JSON.stringify(expiredReservation)); // reserved seats
    
    render(<BookingForm />);
    
    // Advance time to trigger cleanup
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    await waitFor(() => {
      // Expired reservation should be cleaned up
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'reservedSeats',
        '{}'
      );
    });
    
    jest.useRealTimers();
  });

  test('handles event bus subscriptions and unsubscriptions', async () => {
    const unsubscribeMock = jest.fn();
    (eventBus.subscribe as jest.Mock).mockReturnValue(unsubscribeMock);
    
    sessionStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));
    localStorageMock.getItem.mockReturnValue(JSON.stringify([]));
    
    const { unmount } = render(<BookingForm />);
    
    await waitFor(() => {
      // Should subscribe to events
      expect(eventBus.subscribe).toHaveBeenCalledWith('userLoggedIn', expect.any(Function));
      expect(eventBus.subscribe).toHaveBeenCalledWith('userLoggedOut', expect.any(Function));
      expect(eventBus.subscribe).toHaveBeenCalledWith('seatSelecting', expect.any(Function));
      expect(eventBus.subscribe).toHaveBeenCalledWith('seatReleased', expect.any(Function));
      expect(eventBus.subscribe).toHaveBeenCalledWith('ticketBooked', expect.any(Function));
      expect(eventBus.subscribe).toHaveBeenCalledWith('seatConflict', expect.any(Function));
    });
    
    unmount();
    
    // Should unsubscribe from all events (6 subscriptions)
    expect(unsubscribeMock).toHaveBeenCalledTimes(6);
  });
});