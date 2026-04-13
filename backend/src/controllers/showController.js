const db = require('../db');

async function getShows(req, res) {
  const { theatreId, title, search, date, genre } = req.query;
  let sql = `
    SELECT s.*, t.name AS theatre_name, t.location
    FROM shows s
    JOIN theatres t ON s.theatre_id = t.theatre_id
    WHERE 1=1
  `;
  const params = [];

  if (theatreId) {
    sql += ' AND s.theatre_id = ?';
    params.push(theatreId);
  }
  if (title) {
    sql += ' AND s.title LIKE ?';
    params.push(`%${title}%`);
  }
  if (search) {
    sql += ' AND (s.title LIKE ? OR t.name LIKE ? OR t.location LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }
  if (date) {
    sql += ' AND EXISTS (SELECT 1 FROM showtimes st WHERE st.show_id = s.show_id AND st.date = ?)';
    params.push(date);
  }
  if (genre) {
    sql += ' AND s.genre = ?';
    params.push(genre);
  }

  const [rows] = await db.query(sql, params);
  res.json(rows);
}

async function getShowById(req, res) {
  const [rows] = await db.query(
    `SELECT s.*, t.name AS theatre_name, t.location
     FROM shows s JOIN theatres t ON s.theatre_id = t.theatre_id
     WHERE s.show_id = ?`,
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Show not found' });
  res.json(rows[0]);
}

module.exports = { getShows, getShowById };
