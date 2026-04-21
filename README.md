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

## Tools Used

### Development Tools
- Git and GitHub for version control and repository hosting.
- PowerShell for local development commands on Windows.
- npm for dependency installation and project scripts.
- Expo Go for running and testing the mobile app on a physical phone.

### Frontend Tools
- React Native with Expo SDK 54 for the mobile application.
- expo-router for file-based navigation.
- expo-secure-store for secure JWT storage on the device.
- Axios for API calls to the backend.
- TypeScript for frontend type checking.

### Backend and Database Tools
- Node.js and Express for the REST API.
- MariaDB 12.2 for relational data storage.
- mysql2 for the MariaDB connection pool.
- JSON Web Tokens (`jsonwebtoken`) for authentication.
- bcryptjs for password hashing.
- multer for admin show image uploads.

### Verification Tools
- `node --check` for backend JavaScript syntax checks.
- `npx tsc --noEmit` for TypeScript validation.
- `npx expo install --check` for Expo package compatibility checks.

### Development Assistance
- Codex was used for coding support, debugging, Git checks, README edits, and final testing preparation.
- Claude Code / T3 Code-style checkpoint tooling appears in local development refs under `refs/t3/checkpoints/...`, mainly as intermediate local snapshots and QA/checkpoint history.
- The submitted `master` branch commits are authored by `Teo542`.

---

## Features

- **Authentication** — Register and login with email/password. JWT stored securely on device via `expo-secure-store`. Auto-redirect on 401.
- **Browse Shows** — List all theatre shows with search by show title, theatre name, or location. Filter by genre (Τραγωδία / Κωμωδία / Σύγχρονο / Αρχαίο) — genre pills call the API with a `?genre=` param, combined with search. Show poster cards with uploaded images, theatre name, location, duration.
- **Show Detail** — Full show info, uploaded show image hero, horizontal date picker strip, showtimes with availability indicators (available / almost full / sold out).
- **Seat Map** — Visual seat grid (rows A–L, 12 columns) with color-coded categories: 🟡 VIP, 🔴 Standard, 🟢 Student. Tap to select individual seats. Aisle gap at center.
- **Booking** — Atomic reservation with DB transaction — locks the selected seat rows, checks availability, reserves the exact seats, and updates availability counts.
- **Tickets tab** — Ticket-stub UI showing upcoming and past bookings. Cancel future reservations or edit them by selecting exact seats on the chair map.
- **Profile tab** — User avatar, booking stats (total / upcoming / cancelled), account info, quick navigation shortcuts.
- **Settings** — Accessible via gear icon in the profile header. Includes local notification/privacy toggles and account action placeholders for demonstration.
- **Pull to Refresh** — Data screens support mobile pull-to-refresh with a visible refresh spinner.
- **Admin Panel** — Browser-based dashboard at `http://localhost:3000/admin/` for viewing stats, users, reservations, theatres, shows and showtimes. Admins can create shows, upload/change show pictures, and manage schedule data.

---

## Database Schema

```
users
  user_id PK │ name │ email UNIQUE │ password_hash │ is_admin │ created_at

theatres
  theatre_id PK │ name │ location │ description

shows
  show_id PK │ theatre_id FK → theatres │ title │ description │ duration │ age_rating │ genre │ image_url

showtimes
  showtime_id PK │ show_id FK → shows │ date │ time │ hall │ total_seats │ available_seats

seat_categories
  category_id PK │ showtime_id FK → showtimes │ name │ price │ total_seats │ available_seats

reservations
  reservation_id PK │ user_id FK → users │ showtime_id FK → showtimes │ status │ created_at

seats
  seat_id PK │ showtime_id FK → showtimes │ row │ col │ category_id FK → seat_categories │ status │ reservation_id

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
| `GET` | `/shows` | — | List shows (filters: `?search=`, `?theatreId=`, `?title=`, `?date=`, `?genre=`) |
| `GET` | `/shows/:id` | — | Show detail |
| `GET` | `/showtimes` | — | Showtimes for a show (`?showId=`) |
| `GET` | `/seats` | ✅ | Seat categories for a showtime (`?showtimeId=`) |
| `POST` | `/reservations` | ✅ | Create reservation (DB transaction) |
| `PUT` | `/reservations/:id` | ✅ | Modify reservation with exact `seat_ids` |
| `DELETE` | `/reservations/:id` | ✅ | Cancel reservation |
| `GET` | `/user/reservations` | ✅ | Current user's booking history |

Admin endpoints are mounted under `/api/admin/*` and require an admin JWT. Important admin actions include:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/stats` | Dashboard totals |
| `GET` | `/api/admin/shows` | List shows with reservation/revenue stats |
| `POST` | `/api/admin/shows` | Create show; accepts multipart image upload in `image` |
| `PUT` | `/api/admin/shows/:id` | Update show fields or upload/change show image |
| `POST` | `/api/admin/showtimes` | Create showtime and generate seats/categories |
| `DELETE` | `/api/admin/reservations/:id` | Admin cancellation |

The seed data creates:

| Email | Password |
|-------|----------|
| `admin@example.com` | `Admin123!` |

Open the browser admin panel at:

```text
http://localhost:3000/admin/
```

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

Existing databases are upgraded automatically on backend startup for the uploaded show image field (`shows.image_url`). The same change is also available as:

```bash
mysql -u root -p < database/migrations/001_add_show_image_url.sql
```

On Windows, if MariaDB is installed but not registered as a service, it can be started manually:

```powershell
& "C:\Program Files\MariaDB 12.2\bin\mysqld.exe" --defaults-file="C:\Program Files\MariaDB 12.2\data\my.ini" --console
```

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
│   │   │   ├── auth.js                  # JWT verify middleware
│   │   │   └── adminAuth.js             # Admin JWT middleware
│   │   ├── routes/
│   │   │   ├── admin.js                 # admin CRUD/stat endpoints
│   │   │   ├── auth.js
│   │   │   ├── theatres.js
│   │   │   ├── shows.js
│   │   │   ├── showtimes.js
│   │   │   ├── seats.js
│   │   │   ├── reservations.js
│   │   │   └── users.js
│   │   └── db.js                        # mysql2 connection pool
│   ├── app.js                           # Express app entry point
│   ├── public/admin/                    # browser admin panel
│   ├── public/uploads/                  # local uploaded show images (gitignored)
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
│   │   ├── edit-reservation/[id].tsx   # Seat map + exact-seat edit flow
│   │   └── settings.tsx               # App settings (local/demo actions)
│   ├── lib/
│   │   ├── api.ts                       # Axios instance + JWT interceptor
│   │   ├── auth.ts                      # SecureStore token helpers
│   │   ├── media.ts                     # converts backend media paths to URLs
│   │   └── refresh.ts                   # pull-to-refresh timing helper
│   ├── components/
│   │   └── RefreshSpinner.tsx           # visible refresh indicator
│   └── package.json
│
└── database/
    ├── schema.sql                       # DDL — all tables
    ├── seed.sql                         # Sample data
    └── migrations/                      # incremental DB changes
```

---

## Concurrency & Data Integrity

Reservations use a **MariaDB transaction with row-level locks** (`FOR UPDATE`) to prevent double-booking. The app reserves exact seats, so the lock is taken on the selected `seats` rows:

```
BEGIN
  SELECT showtime ... FOR UPDATE          ← validates future showtime
  SELECT selected seats ... FOR UPDATE    ← locks exact seat rows
  CHECK each selected seat is available
  INSERT reservation
  INSERT reservation_items
  UPDATE seats SET status = 'reserved'
  UPDATE seat_categories/showtimes counts
COMMIT
```

If any step fails, the transaction rolls back and no seats are deducted.

The same pattern is used when editing a reservation: old seats are released inside the transaction, the newly selected seats are locked and checked, and the reservation totals are recalculated before commit.

---

## Security

- Passwords hashed with **bcrypt** (cost factor 10)
- Authentication via **JWT HS256** tokens (24h expiry)
- Tokens stored in **device secure enclave** via `expo-secure-store`
- All protected routes require `Authorization: Bearer <token>` header
- Admin routes require `is_admin: true` inside the JWT
- 401 responses automatically clear the token and redirect to login

---

## Final Testing Checklist

Use this checklist before submission and live Q&A.

### Command checks

```powershell
cd backend
node --check app.js
node --check src\routes\admin.js
node --check public\admin\admin.js

cd ..\frontend
npx tsc --noEmit
```

### Backend and database

1. Start MariaDB.
2. Start the backend with `npm start` from `backend/`.
3. Confirm the console shows `Server running on http://localhost:3000`.
4. Open `http://localhost:3000/admin/`.
5. Login with `admin@example.com` / `Admin123!`.
6. Create or update a show with a picture.
7. Confirm the picture thumbnail appears in the admin shows table.

### Mobile app

1. Start Expo with `npx expo start` from `frontend/`.
2. Scan the QR code with Expo Go.
3. Register a new user or login.
4. Browse shows and use search/genre filters.
5. Pull down to refresh and confirm the refresh spinner appears.
6. Open a show and confirm uploaded images display in the app.
7. Select a showtime, choose exact seats, and create a booking.
8. Open Tickets, edit the booking, and select different seats on the chair map.
9. Cancel a future booking.
10. Refresh Tickets/Profile and confirm the stats update.

### Live demo flow

1. Show the README architecture section.
2. Show the backend running.
3. Show the admin dashboard and upload/change a show image.
4. Show the mobile app receiving that image.
5. Book seats and explain the MariaDB transaction/row locking.
6. Edit/cancel a booking and show the update in the admin panel.

---

## Seed Data

| Theatre | Shows |
|---------|-------|
| Εθνικό Θέατρο (Αθήνα) | Αντιγόνη, Ο Κερδοσκόπος |
| Θέατρο Τέχνης (Αθήνα) | Θαλασσινά, Ηλέκτρα |
| Βασιλικό Θέατρο (Θεσσαλονίκη) | Οιδίπους Τύραννος |

Seat categories per showtime: **VIP** (€28–40), **Κανονική** (€15–25), **Φοιτητική** (€8–15)

The included showtimes are future-dated for the demo so bookings can be created, edited, and cancelled from the mobile app.
