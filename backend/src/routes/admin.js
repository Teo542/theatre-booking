const router = require('express').Router();
const adminAuth = require('../middleware/adminAuth');
const db = require('../db');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

const SEAT_ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
const SEAT_COLS = 12;
const SHOW_UPLOAD_DIR = path.join(__dirname, '..', '..', 'public', 'uploads', 'shows');

fs.mkdirSync(SHOW_UPLOAD_DIR, { recursive: true });

const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, SHOW_UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeBase = path.basename(file.originalname, ext)
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase()
        .slice(0, 40) || 'show';
      cb(null, `${Date.now()}-${safeBase}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    if (!allowedTypes.has(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, WebP, or GIF images are allowed'));
    }
    cb(null, true);
  },
});

function showImageUrl(file) {
  return file ? `/uploads/shows/${file.filename}` : null;
}

router.use(adminAuth);

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [[{ total_users }]] = await db.query('SELECT COUNT(*) AS total_users FROM users');
    const [[{ total_shows }]] = await db.query('SELECT COUNT(*) AS total_shows FROM shows');
    const [[{ total_reservations }]] = await db.query('SELECT COUNT(*) AS total_reservations FROM reservations');
    const [[{ total_revenue }]] = await db.query(
      "SELECT COALESCE(SUM(ri.unit_price * ri.quantity), 0) AS total_revenue FROM reservation_items ri JOIN reservations r ON ri.reservation_id = r.reservation_id WHERE r.status = 'confirmed'"
    );
    const [[{ upcoming_shows }]] = await db.query(
      "SELECT COUNT(*) AS upcoming_shows FROM showtimes WHERE CONCAT(date,' ',time) > NOW()"
    );
    const [[occ]] = await db.query(
      'SELECT COALESCE(SUM(total_seats - available_seats) / NULLIF(SUM(total_seats), 0) * 100, 0) AS occupancy FROM showtimes'
    );
    res.json({
      total_users,
      total_shows,
      total_reservations,
      total_revenue: parseFloat(total_revenue),
      upcoming_shows,
      occupancy: parseFloat(occ.occupancy).toFixed(1),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// SHOWS
// ---------------------------------------------------------------------------

// GET /api/admin/shows
router.get('/shows', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        s.show_id, s.title, s.description, s.duration, s.age_rating, s.genre, s.image_url,
        s.theatre_id,
        t.name AS theatre_name,
        COUNT(DISTINCT r.reservation_id) AS reservation_count,
        COALESCE(SUM(ri.unit_price * ri.quantity), 0) AS revenue
      FROM shows s
      JOIN theatres t ON s.theatre_id = t.theatre_id
      LEFT JOIN showtimes st ON s.show_id = st.show_id
      LEFT JOIN reservations r ON st.showtime_id = r.showtime_id AND r.status = 'confirmed'
      LEFT JOIN reservation_items ri ON r.reservation_id = ri.reservation_id
      GROUP BY s.show_id
      ORDER BY s.title
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/shows
router.post('/shows', imageUpload.single('image'), async (req, res) => {
  const { theatre_id, title, description, duration, age_rating, genre } = req.body;
  if (!theatre_id || !title || !duration) {
    return res.status(400).json({ error: 'theatre_id, title and duration are required' });
  }
  try {
    const image_url = showImageUrl(req.file);
    const [result] = await db.query(
      'INSERT INTO shows (theatre_id, title, description, duration, age_rating, genre, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [theatre_id, title, description || null, duration, age_rating || null, genre || null, image_url]
    );
    res.status(201).json({ show_id: result.insertId, message: 'Show created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/shows/:id
router.put('/shows/:id', imageUpload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { theatre_id, title, description, duration, age_rating, genre, clear_image } = req.body;
  const fields = [];
  const values = [];
  if (theatre_id !== undefined) { fields.push('theatre_id = ?'); values.push(theatre_id); }
  if (title !== undefined) { fields.push('title = ?'); values.push(title); }
  if (description !== undefined) { fields.push('description = ?'); values.push(description); }
  if (duration !== undefined) { fields.push('duration = ?'); values.push(duration); }
  if (age_rating !== undefined) { fields.push('age_rating = ?'); values.push(age_rating); }
  if (genre !== undefined) { fields.push('genre = ?'); values.push(genre); }
  if (req.file) { fields.push('image_url = ?'); values.push(showImageUrl(req.file)); }
  if (clear_image === 'true') { fields.push('image_url = ?'); values.push(null); }
  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
  values.push(id);
  try {
    await db.query(`UPDATE shows SET ${fields.join(', ')} WHERE show_id = ?`, values);
    res.json({ message: 'Show updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/shows/:id
router.delete('/shows/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [showtimes] = await db.query(
      'SELECT showtime_id FROM showtimes WHERE show_id = ?',
      [id]
    );
    if (showtimes.length > 0) {
      return res.status(409).json({ error: 'Show has showtimes attached and cannot be deleted' });
    }
    const [conflicts] = await db.query(
      `SELECT st.showtime_id FROM showtimes st
       JOIN reservations r ON st.showtime_id = r.showtime_id
       WHERE st.show_id = ? AND r.status = 'confirmed' AND CONCAT(st.date,' ',st.time) > NOW()`,
      [id]
    );
    if (conflicts.length > 0) {
      return res.status(409).json({ error: 'Show has confirmed future showtimes and cannot be deleted' });
    }
    await db.query('DELETE FROM shows WHERE show_id = ?', [id]);
    res.json({ message: 'Show deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// THEATRES
// ---------------------------------------------------------------------------

// GET /api/admin/theatres
router.get('/theatres', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM theatres ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/theatres
router.post('/theatres', async (req, res) => {
  const { name, location, description } = req.body;
  if (!name || !location) {
    return res.status(400).json({ error: 'name and location are required' });
  }
  try {
    const [result] = await db.query(
      'INSERT INTO theatres (name, location, description) VALUES (?, ?, ?)',
      [name, location, description || null]
    );
    res.status(201).json({ theatre_id: result.insertId, message: 'Theatre created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/theatres/:id
router.put('/theatres/:id', async (req, res) => {
  const { id } = req.params;
  const { name, location, description } = req.body;
  const fields = [];
  const values = [];
  if (name !== undefined) { fields.push('name = ?'); values.push(name); }
  if (location !== undefined) { fields.push('location = ?'); values.push(location); }
  if (description !== undefined) { fields.push('description = ?'); values.push(description); }
  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
  values.push(id);
  try {
    await db.query(`UPDATE theatres SET ${fields.join(', ')} WHERE theatre_id = ?`, values);
    res.json({ message: 'Theatre updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/theatres/:id
router.delete('/theatres/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [shows] = await db.query('SELECT show_id FROM shows WHERE theatre_id = ?', [id]);
    if (shows.length > 0) {
      return res.status(409).json({ error: 'Theatre has shows attached and cannot be deleted' });
    }
    await db.query('DELETE FROM theatres WHERE theatre_id = ?', [id]);
    res.json({ message: 'Theatre deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// SHOWTIMES
// ---------------------------------------------------------------------------

// GET /api/admin/showtimes
router.get('/showtimes', async (req, res) => {
  const { showId } = req.query;
  try {
    const params = [];
    let where = '';
    if (showId) {
      where = 'WHERE st.show_id = ?';
      params.push(showId);
    }
    const [rows] = await db.query(`
      SELECT
        st.showtime_id, st.show_id, DATE_FORMAT(st.date, '%Y-%m-%d') AS date, st.time, st.hall,
        st.total_seats, st.available_seats,
        s.title AS show_title,
        t.name AS theatre_name,
        COUNT(r.reservation_id) AS reservation_count,
        ROUND((st.total_seats - st.available_seats) / NULLIF(st.total_seats, 0) * 100, 1) AS occupancy_pct
      FROM showtimes st
      JOIN shows s ON st.show_id = s.show_id
      JOIN theatres t ON s.theatre_id = t.theatre_id
      LEFT JOIN reservations r ON st.showtime_id = r.showtime_id AND r.status = 'confirmed'
      ${where}
      GROUP BY st.showtime_id
      ORDER BY st.date DESC, st.time DESC
    `, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/showtimes
router.post('/showtimes', async (req, res) => {
  const {
    show_id, date, time, hall, total_seats,
    vip_pct = 20, vip_price = 35, std_price = 20, stu_price = 12,
  } = req.body;

  if (!show_id || !date || !time || !hall || !total_seats) {
    return res.status(400).json({ error: 'show_id, date, time, hall and total_seats are required' });
  }

  const vipSeats = Math.round(total_seats * (vip_pct / 100));
  const studentSeats = Math.round(total_seats * 0.20);
  const standardSeats = total_seats - vipSeats - studentSeats;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      'INSERT INTO showtimes (show_id, date, time, hall, total_seats, available_seats) VALUES (?, ?, ?, ?, ?, ?)',
      [show_id, date, time, hall, total_seats, total_seats]
    );
    const showtime_id = result.insertId;

    // Create seat categories ordered by price DESC: VIP, Standard, Student
    const categories = [
      { name: 'VIP', price: vip_price, total_seats: vipSeats },
      { name: 'Standard', price: std_price, total_seats: standardSeats },
      { name: 'Student', price: stu_price, total_seats: studentSeats },
    ];

    const categoryIds = [];
    for (const cat of categories) {
      const [catResult] = await conn.query(
        'INSERT INTO seat_categories (showtime_id, name, price, total_seats, available_seats) VALUES (?, ?, ?, ?, ?)',
        [showtime_id, cat.name, cat.price, cat.total_seats, cat.total_seats]
      );
      categoryIds.push({ category_id: catResult.insertId, total_seats: cat.total_seats });
    }

    // Populate seats table — same logic as populateSeats in app.js
    const inserts = [];
    let rowIdx = 0;
    for (const cat of categoryIds) {
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
      await conn.query(
        'INSERT IGNORE INTO seats (showtime_id, row, col, category_id) VALUES ?',
        [inserts]
      );
    }

    await conn.commit();
    res.status(201).json({ showtime_id, message: 'Showtime created' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// DELETE /api/admin/showtimes/:id
router.delete('/showtimes/:id', async (req, res) => {
  const { id } = req.params;
  const conn = await db.getConnection();
  try {
    const [conflicts] = await db.query(
      'SELECT reservation_id FROM reservations WHERE showtime_id = ?',
      [id]
    );
    if (conflicts.length > 0) {
      return res.status(409).json({ error: 'Showtime has reservations and cannot be deleted' });
    }
    await conn.beginTransaction();
    await conn.query('DELETE FROM seats WHERE showtime_id = ?', [id]);
    await conn.query('DELETE FROM seat_categories WHERE showtime_id = ?', [id]);
    await conn.query('DELETE FROM showtimes WHERE showtime_id = ?', [id]);
    await conn.commit();
    res.json({ message: 'Showtime deleted' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ---------------------------------------------------------------------------
// RESERVATIONS
// ---------------------------------------------------------------------------

// GET /api/admin/reservations
router.get('/reservations', async (req, res) => {
  const { status, showId } = req.query;
  try {
    const conditions = [];
    const params = [];
    if (status) { conditions.push('r.status = ?'); params.push(status); }
    if (showId) { conditions.push('s.show_id = ?'); params.push(showId); }
    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const [rows] = await db.query(`
      SELECT
        r.reservation_id, r.status, r.created_at,
        u.user_id, u.name AS user_name, u.email AS user_email,
        s.show_id, s.title AS show_title,
        st.showtime_id, DATE_FORMAT(st.date, '%Y-%m-%d') AS date, st.time, st.hall,
        t.name AS theatre_name,
        JSON_ARRAYAGG(JSON_OBJECT(
          'category_name', sc.name,
          'quantity', ri.quantity,
          'unit_price', ri.unit_price
        )) AS items,
        COALESCE(SUM(ri.unit_price * ri.quantity), 0) AS total
      FROM reservations r
      JOIN users u ON r.user_id = u.user_id
      JOIN showtimes st ON r.showtime_id = st.showtime_id
      JOIN shows s ON st.show_id = s.show_id
      JOIN theatres t ON s.theatre_id = t.theatre_id
      JOIN reservation_items ri ON r.reservation_id = ri.reservation_id
      JOIN seat_categories sc ON ri.category_id = sc.category_id
      ${where}
      GROUP BY r.reservation_id
      ORDER BY r.created_at DESC
    `, params);

    const parsed = rows.map(row => ({
      ...row,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
      total: parseFloat(row.total),
    }));
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/reservations/:id  (admin cancel — no date/user checks)
router.delete('/reservations/:id', async (req, res) => {
  const { id } = req.params;

  const [rows] = await db.query(
    "SELECT r.*, DATE_FORMAT(st.date, '%Y-%m-%d') AS date, st.time FROM reservations r JOIN showtimes st ON r.showtime_id = st.showtime_id WHERE r.reservation_id = ?",
    [id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Reservation not found' });
  const reservation = rows[0];
  if (reservation.status === 'cancelled') {
    return res.status(400).json({ error: 'Reservation already cancelled' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      "UPDATE reservations SET status = 'cancelled' WHERE reservation_id = ?",
      [id]
    );

    const [items] = await conn.query(
      'SELECT category_id, quantity FROM reservation_items WHERE reservation_id = ?',
      [id]
    );
    for (const item of items) {
      await conn.query(
        'UPDATE seat_categories SET available_seats = available_seats + ? WHERE category_id = ?',
        [item.quantity, item.category_id]
      );
      await conn.query(
        'UPDATE showtimes SET available_seats = available_seats + ? WHERE showtime_id = ?',
        [item.quantity, reservation.showtime_id]
      );
    }

    await conn.query(
      "UPDATE seats SET status = 'available', reservation_id = NULL WHERE reservation_id = ?",
      [id]
    );

    await conn.commit();
    res.json({ message: 'Reservation cancelled successfully' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: 'Failed to cancel reservation' });
  } finally {
    conn.release();
  }
});

// ---------------------------------------------------------------------------
// USERS
// ---------------------------------------------------------------------------

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        u.user_id, u.name, u.email, u.is_admin, u.created_at,
        COUNT(DISTINCT r.reservation_id) AS reservation_count,
        COALESCE(SUM(ri.unit_price * ri.quantity), 0) AS total_spent
      FROM users u
      LEFT JOIN reservations r ON u.user_id = r.user_id AND r.status = 'confirmed'
      LEFT JOIN reservation_items ri ON r.reservation_id = ri.reservation_id
      GROUP BY u.user_id
      ORDER BY u.name
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DASHBOARD HELPERS
// ---------------------------------------------------------------------------

// GET /api/admin/recent-reservations
router.get('/recent-reservations', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        r.reservation_id, r.status, r.created_at,
        u.name AS user_name, u.email AS user_email,
        s.title AS show_title,
        DATE_FORMAT(st.date, '%Y-%m-%d') AS date, st.time,
        COALESCE(SUM(ri.unit_price * ri.quantity), 0) AS total
      FROM reservations r
      JOIN users u ON r.user_id = u.user_id
      JOIN showtimes st ON r.showtime_id = st.showtime_id
      JOIN shows s ON st.show_id = s.show_id
      JOIN reservation_items ri ON r.reservation_id = ri.reservation_id
      GROUP BY r.reservation_id
      ORDER BY r.created_at DESC
      LIMIT 5
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/upcoming-shows
router.get('/upcoming-shows', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        st.showtime_id, DATE_FORMAT(st.date, '%Y-%m-%d') AS date, st.time, st.hall,
        st.total_seats, st.available_seats,
        s.title AS show_title,
        t.name AS theatre_name,
        ROUND((st.total_seats - st.available_seats) / NULLIF(st.total_seats, 0) * 100, 1) AS occupancy_pct
      FROM showtimes st
      JOIN shows s ON st.show_id = s.show_id
      JOIN theatres t ON s.theatre_id = t.theatre_id
      WHERE CONCAT(st.date,' ',st.time) > NOW()
      ORDER BY st.date ASC, st.time ASC
      LIMIT 5
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
