import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import BookingList from './BookingList';
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

describe('BookingList', () => {
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
    { userId: 'test-user', seats: [1, 2, 3] },
    { userId: 'other-user', seats: [10, 11] },
    { userId: 'another-user', seats: [20, 21, 22] },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockClear();
    sessionStorageMock.getItem.mockClear();

    // Mock eventBus.subscribe to return unsubscribe function
    (eventBus.subscribe as jest.Mock).mockImplementation((event, callback) => {
      return () => {}; // mock unsubscribe function
    });
  });

  test('renders no bookings message when there are no bookings', () => {
    sessionStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));
    localStorageMock.getItem.mockReturnValue(JSON.stringify([]));
    
    render(<BookingList />);
    
    expect(screen.getByText('No bookings yet.')).toBeInTheDocument();
  });


  test('handles event bus subscriptions and unsubscriptions', () => {
    const unsubscribeMock = jest.fn();
    (eventBus.subscribe as jest.Mock).mockReturnValue(unsubscribeMock);
    
    const { unmount } = render(<BookingList />);
    
    // Should subscribe to events
    expect(eventBus.subscribe).toHaveBeenCalledWith('userLoggedIn', expect.any(Function));
    expect(eventBus.subscribe).toHaveBeenCalledWith('userLoggedOut', expect.any(Function));
    expect(eventBus.subscribe).toHaveBeenCalledWith('ticketBooked', expect.any(Function));
    
    unmount();
    
    // Should unsubscribe from all events
    expect(unsubscribeMock).toHaveBeenCalledTimes(3);
  });

});