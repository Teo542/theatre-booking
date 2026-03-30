# TheatreBooking — CN6035

Εφαρμογή κινητού για κράτηση θέσεων σε θεατρικές παραστάσεις.

**Stack:** React Native (Expo) · Node.js/Express · MariaDB · JWT

---

## Αρχιτεκτονική

```
Mobile App (Expo/React Native)
       ↕  HTTP/REST + JWT
REST API (Node.js/Express :3000)
       ↕  SQL
Database (MariaDB :3306)
```

---

## Εγκατάσταση

### 1. Βάση Δεδομένων (MariaDB)

```bash
# Εκκίνηση MariaDB (αν δεν τρέχει ως service)
"C:\Program Files\MariaDB 12.2\bin\mysqld.exe" --defaults-file="C:\Program Files\MariaDB 12.2\data\my.ini" --console

# Δημιουργία βάσης & φόρτωση δεδομένων
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env    # συμπλήρωσε DB_PASS και JWT_SECRET
npm install
npm start               # http://localhost:3000
```

### 3. Frontend

```bash
cd frontend
npm install
npx expo start
```

Σκανάρισε το QR code με την εφαρμογή **Expo Go** στο κινητό σου.

> **Σημαντικό:** Στο αρχείο `frontend/lib/api.ts` άλλαξε το `API_BASE`:
> - Android Emulator: `http://10.0.2.2:3000`
> - Φυσική συσκευή: `http://<IP-του-υπολογιστή>:3000`

---

## API Endpoints

| Method | Path | Auth | Περιγραφή |
|--------|------|------|-----------|
| POST | /register | — | Εγγραφή χρήστη |
| POST | /login | — | Σύνδεση, επιστρέφει JWT |
| GET | /theatres | — | Λίστα θεάτρων |
| GET | /shows | — | Λίστα παραστάσεων (φίλτρα: theatreId, title, date) |
| GET | /shows/:id | — | Λεπτομέρειες παράστασης |
| GET | /showtimes?showId= | — | Χρόνοι παράστασης |
| GET | /seats?showtimeId= | JWT | Κατηγορίες θέσεων |
| POST | /reservations | JWT | Νέα κράτηση |
| PUT | /reservations/:id | JWT | Τροποποίηση κράτησης |
| DELETE | /reservations/:id | JWT | Ακύρωση κράτησης |
| GET | /user/reservations | JWT | Ιστορικό χρήστη |

---

## Λειτουργικότητα

- **Εγγραφή / Σύνδεση** με email & κωδικό (bcrypt + JWT)
- **Ασφαλής αποθήκευση** token με `expo-secure-store`
- **Λίστα παραστάσεων** με αναζήτηση
- **Λεπτομέρειες παράστασης** & διαθέσιμοι χρόνοι
- **Κράτηση θέσεων** ανά κατηγορία (VIP, Κανονική, Φοιτητική)
- **Ιστορικό κρατήσεων** & ακύρωση μελλοντικών κρατήσεων
- **Ταυτόχρονη ασφάλεια** με DB transactions (FOR UPDATE)

---

## Δομή Project

```
theatre-booking/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/auth.js
│   │   ├── routes/
│   │   └── db.js
│   └── app.js
├── frontend/
│   ├── app/
│   │   ├── (auth)/login.tsx & register.tsx
│   │   ├── (tabs)/index.tsx & profile.tsx
│   │   ├── show/[id].tsx
│   │   └── booking/[showtimeId].tsx
│   └── lib/api.ts & auth.ts
└── database/
    ├── schema.sql
    └── seed.sql
```
