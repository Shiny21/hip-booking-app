# Booking Micro-Frontend

## Overview
The Booking Micro-Frontend is a **React-based application** that provides **seat reservation and booking functionality** within a micro-frontend architecture. It integrates with the **Auth Micro-Frontend** for user authentication and authorization.

---

## Features
- **Seat Selection:** Interactive seating grid with real-time availability  
- **Reservation System:** Temporary seat holds with automatic expiration  
- **Role-Based Access:** Different permissions for customers and administrators  
- **Real-time Updates:** Event-driven communication with other micro-frontends  
- **Local Storage:** Persistent booking data storage  
- **Conflict Handling:** Prevents double-booking and seat conflicts  

---

## Data Flow
- **User Authentication:** Integrates with Auth Micro-Frontend via event bus  
- **Seat Reservation:** Temporary holds with 30-second expiration  
- **Booking Confirmation:** Permanent bookings stored in `localStorage`  
- **Event Communication:** Real-time updates across micro-frontends  

---

## Integration Points

### Event Bus Communication
The Booking Micro-Frontend **subscribes to and publishes** events for coordination with other micro-frontends.

#### Subscribed Events
- `userLoggedIn`: User authentication successful  
- `userLoggedOut`: User session ended  
- `ticketBooked`: New booking created (for real-time updates)  
- `seatSelecting`: Seat being reserved by another user  
- `seatReleased`: Seat reservation released  
- `seatConflict`: Seat selection conflict detected  

#### Published Events
- `seatSelecting`: Notify others of seat reservation  
- `seatReleased`: Notify others of seat release  
- `ticketBooked`: Notify others of completed booking  
- `seatConflict`: Notify of booking conflicts  
- `notification`: System notifications for user feedback  
