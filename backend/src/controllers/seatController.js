const db = require('../db');

async function getSeats(req, res) {
  const { showtimeId } = req.query;

  if (!showtimeId) {
    return res.status(400).json({ error: 'showtimeId query param is required' });
  }

  const [rows] = await db.query(
    'SELECT * FROM seat_categories WHERE showtime_id = ? ORDER BY price DESC',
    [showtimeId]
  );
  res.json(rows);
}

module.exports = { getSeats };
