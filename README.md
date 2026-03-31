# 🎭 TheatreBooking

> CN6035 — Mobile & Distributed Systems
> Σχολή Αρχιτεκτονικής, Πληροφορικής και Μηχανικής

A full-stack mobile application for booking theatre seats, built as a university assignment demonstrating a distributed system: mobile client → REST API → relational database.

---

## Screenshots

| Login | Home | Show Detail |
|-------|------|-------------|
| 🔐 JWT Auth | 🎭 Show listings | 📅 Date strip + showtimes |

| Seat Map | Booking | Profile |
|----------|---------|---------|
| 🪑 Interactive grid | 🎟 Confirm order | 📋 Ticket-stub history |

---

## Architecture

```
┌─────────────────────────────────┐
│   React Native App (Expo Go)    │
│   iOS / Android                 │
└────────────────┬────────────────┘
                 │ HTTP/REST + JWT
                 │ Bearer Token Auth
┌────────────────▼────────────────┐
│   Node.js / Express API         │
│   localhost:3000                │
└────────────────┬────────────────┘
                 │ mysql2 connection pool
┌────────────────▼────────────────┐
│   MariaDB 12.2                  │
│   localhost:3306                │
└─────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile Frontend | React Native + Expo SDK 54 |
| Routing | expo-router v6 (file-based) |
| Secure Storage | expo-secure-store |
| HTTP Client | Axios (with JWT interceptor) |
| Backend | Node.js + Express |
| Authentication | JWT (HS256) + bcryptjs |
| Database | MariaDB 12.2 |
| DB Driver | mysql2 (connection pool) |

---

## Features

- **Authentication** — Register and login with email/password. JWT stored securely on device via `expo-secure-store`. Auto-redirect on 401.
- **Browse Shows** — List all theatre shows with search by title. Filter by genre. Show poster cards with theatre name, location, duration.
- **Show Detail** — Full show info, horizontal date picker strip, showtimes with availability indicators (available / almost full / sold out).
- **Seat Map** — Visual seat grid (rows A–L, 12 columns) with color-coded categories: 🟡 VIP, 🔴 Standard, 🟢 Student. Tap to select individual seats. Aisle gap at center.
- **Booking** — Atomic reservation with DB transaction — checks availability and decrements seat count in a single locked operation.
- **Tickets tab** — Ticket-stub UI showing upcoming and past bookings. Cancel future reservations (restores seats).
- **Profile tab** — User avatar, booking stats (total / upcoming / cancelled), account info, quick navigation shortcuts.
- **Settings** — Accessible via gear icon in the profile header. Notification preferences, privacy controls, app info, account management (change password, delete account).

---

## Database Schema

```
users
  user_id PK │ name │ email UNIQUE │ password_hash │ created_at

theatres
  theatre_id PK │ name │ location │ description

shows
  show_id PK │ theatre_id FK → theatres │ title │ description │ duration │ age_rating

showtimes
  showtime_id PK │ show_id FK → shows │ date │ time │ hall │ total_seats │ available_seats

seat_categories
  category_id PK │ showtime_id FK → showtimes │ name │ price │ total_seats │ available_seats

reservations
  reservation_id PK │ user_id FK → users │ showtime_id FK → showtimes │ status │ created_at

reservation_items
  item_id PK │ reservation_id FK → reservations │ category_id FK → seat_categories │ quantity │ unit_price
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| `POST` | `/register` | — | Create account, returns JWT |
| `POST` | `/login` | — | Login, returns JWT |
| `GET` | `/theatres` | — | List all theatres (search: `?search=`) |
| `GET` | `/shows` | — | List shows (filters: `?theatreId=`, `?title=`, `?date=`) |
| `GET` | `/shows/:id` | — | Show detail |
| `GET` | `/showtimes` | — | Showtimes for a show (`?showId=`) |
| `GET` | `/seats` | ✅ | Seat categories for a showtime (`?showtimeId=`) |
| `POST` | `/reservations` | ✅ | Create reservation (DB transaction) |
| `PUT` | `/reservations/:id` | ✅ | Modify reservation |
| `DELETE` | `/reservations/:id` | ✅ | Cancel reservation |
| `GET` | `/user/reservations` | ✅ | Current user's booking history |

---

## Installation & Setup

### Prerequisites
- Node.js 18+
- MariaDB 12.x
- Expo Go app on your phone ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779))
- Phone and PC on the **same Wi-Fi network**

### 1. Clone the repository

```bash
git clone https://github.com/Teo542/theatre-booking.git
cd theatre-booking
```

### 2. Database setup

Start MariaDB, then run:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

This creates the `theatre_booking` database with 3 theatres, 5 shows, 9 showtimes and sample seat categories.

### 3. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — set DB_PASS and JWT_SECRET
npm install
npm start
# API running at http://localhost:3000
```

### 4. Frontend

```bash
cd frontend
npm install
npx expo start
```

> **No manual IP configuration needed.** The app automatically detects the host machine's IP from the Expo dev server via `expo-constants`. Just make sure your phone and PC are on the same Wi-Fi network.

Scan the QR code in the terminal with **Expo Go**.

---

## Project Structure

```
theatre-booking/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.js        # register, login
│   │   │   ├── theatreController.js     # list theatres
│   │   │   ├── showController.js        # list/detail shows
│   │   │   ├── showtimeController.js    # list showtimes
│   │   │   ├── seatController.js        # seat categories
│   │   │   └── reservationController.js # CRUD + transaction logic
│   │   ├── middleware/
│   │   │   └── auth.js                  # JWT verify middleware
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── theatres.js
│   │   │   ├── shows.js
│   │   │   ├── showtimes.js
│   │   │   ├── seats.js
│   │   │   ├── reservations.js
│   │   │   └── users.js
│   │   └── db.js                        # mysql2 connection pool
│   ├── app.js                           # Express app entry point
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── app/
│   │   ├── _layout.tsx                  # Root layout + auth guard
│   │   ├── (auth)/
│   │   │   ├── login.tsx
│   │   │   └── register.tsx
│   │   ├── (tabs)/
│   │   │   ├── index.tsx                # Home — shows list + search
│   │   │   ├── tickets.tsx             # Ticket-stub booking history
│   │   │   └── profile.tsx             # User profile + stats
│   │   ├── show/[id].tsx               # Show detail + showtimes
│   │   ├── booking/[showtimeId].tsx    # Seat map + booking form
│   │   └── settings.tsx               # App settings (notifications, privacy, account)
│   ├── lib/
│   │   ├── api.ts                       # Axios instance + JWT interceptor
│   │   └── auth.ts                      # SecureStore token helpers
│   └── package.json
│
└── database/
    ├── schema.sql                        # DDL — all tables
    └── seed.sql                          # Sample data
```

---

## Concurrency & Data Integrity

Reservations use a **MariaDB transaction with row-level locks** (`FOR UPDATE`) to prevent double-booking:

```
BEGIN
  SELECT available_seats ... FOR UPDATE   ← locks the row
  CHECK available_seats >= requested
  INSERT reservation
  INSERT reservation_items
  UPDATE available_seats -= quantity
COMMIT
```

If any step fails, the transaction rolls back and no seats are deducted.

---

## Security

- Passwords hashed with **bcrypt** (cost factor 10)
- Authentication via **JWT HS256** tokens (24h expiry)
- Tokens stored in **device secure enclave** via `expo-secure-store`
- All protected routes require `Authorization: Bearer <token>` header
- 401 responses automatically clear the token and redirect to login

---

## Seed Data

| Theatre | Shows |
|---------|-------|
| Εθνικό Θέατρο (Αθήνα) | Αντιγόνη, Ο Κερδοσκόπος |
| Θέατρο Τέχνης (Αθήνα) | Θαλασσινά, Ηλέκτρα |
| Βασιλικό Θέατρο (Θεσσαλονίκη) | Οιδίπους Τύραννος |

Seat categories per showtime: **VIP** (€28–40), **Κανονική** (€15–25), **Φοιτητική** (€8–15)
