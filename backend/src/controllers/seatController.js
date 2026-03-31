const db = require('../db');

async function getSeats(req, res) {
  const { showtimeId } = req.query;
  if (!showtimeId) return res.status(400).json({ error: 'showtimeId query param is required' });

  const [categories] = await db.query(
    'SELECT * FROM seat_categories WHERE showtime_id = ? ORDER BY price DESC',
    [showtimeId]
  );

  const [reserved] = await db.query(
    "SELECT CONCAT(row, col) AS label FROM seats WHERE showtime_id = ? AND status = 'reserved'",
    [showtimeId]
  );

  res.json({ categories, reserved: reserved.map(r => r.label) });
}

module.exports = { getSeats };
