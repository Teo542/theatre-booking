require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const db = require('./src/db');

const SEAT_ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
const SEAT_COLS = 12;
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads', 'shows');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

async function ensureSchema() {
  await db.query("ALTER TABLE shows ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) NULL AFTER genre");
}

async function populateSeats() {
  const [unpopulated] = await db.query(`
    SELECT st.showtime_id FROM showtimes st
    LEFT JOIN seats s ON st.showtime_id = s.showtime_id
    WHERE s.seat_id IS NULL GROUP BY st.showtime_id
  `);
  if (unpopulated.length === 0) return;

  for (const { showtime_id } of unpopulated) {
    const [categories] = await db.query(
      'SELECT * FROM seat_categories WHERE showtime_id = ? ORDER BY price DESC',
      [showtime_id]
    );
    let rowIdx = 0;
    const inserts = [];
    for (const cat of categories) {
      const neededRows = Math.ceil(cat.total_seats / SEAT_COLS);
      const catRows = SEAT_ROWS.slice(rowIdx, rowIdx + neededRows);
      rowIdx += neededRows;
      for (const row of catRows) {
        for (let col = 1; col <= SEAT_COLS; col++) {
          inserts.push([showtime_id, row, col, cat.category_id]);
        }
      }
    }
    if (inserts.length > 0) {
      await db.query(
        'INSERT IGNORE INTO seats (showtime_id, row, col, category_id) VALUES ?',
        [inserts]
      );
    }
  }
  console.log(`Seats populated for ${unpopulated.length} showtimes`);
}

const authRoutes = require('./src/routes/auth');
const theatreRoutes = require('./src/routes/theatres');
const showRoutes = require('./src/routes/shows');
const showtimeRoutes = require('./src/routes/showtimes');
const seatRoutes = require('./src/routes/seats');
const reservationRoutes = require('./src/routes/reservations');
const userRoutes = require('./src/routes/users');
const adminRoutes = require('./src/routes/admin');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/admin', express.static(path.join(__dirname, 'public', 'admin')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Auth (POST /register, POST /login)
app.use('/', authRoutes);

// Resources
app.use('/theatres', theatreRoutes);
app.use('/shows', showRoutes);
app.use('/showtimes', showtimeRoutes);
app.use('/seats', seatRoutes);
app.use('/reservations', reservationRoutes);
app.use('/user', userRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  try { await ensureSchema(); } catch (e) { console.error('Schema update error:', e.message); }
  try { await populateSeats(); } catch (e) { console.error('Seat population error:', e.message); }
});
