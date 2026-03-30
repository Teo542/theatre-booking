const db = require('../db');

async function getTheatres(req, res) {
  const { search } = req.query;
  let sql = 'SELECT * FROM theatres';
  const params = [];

  if (search) {
    sql += ' WHERE name LIKE ? OR location LIKE ?';
    params.push(`%${search}%`, `%${search}%`);
  }

  const [rows] = await db.query(sql, params);
  res.json(rows);
}

async function getTheatreById(req, res) {
  const [rows] = await db.query('SELECT * FROM theatres WHERE theatre_id = ?', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Theatre not found' });
  res.json(rows[0]);
}

module.exports = { getTheatres, getTheatreById };
