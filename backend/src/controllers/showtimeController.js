const db = require('../db');

async function getShowtimes(req, res) {
  const { showId } = req.query;

  if (!showId) {
    return res.status(400).json({ error: 'showId query param is required' });
  }

  const [rows] = await db.query(
    `SELECT st.*, s.title AS show_title
     FROM showtimes st
     JOIN shows s ON st.show_id = s.show_id
     WHERE st.show_id = ?
     ORDER BY st.date, st.time`,
    [showId]
  );
  res.json(rows);
}

module.exports = { getShowtimes };
