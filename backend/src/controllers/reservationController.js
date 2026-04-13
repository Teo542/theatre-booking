const db = require('../db');

function parseSeatIds(seatIds) {
  if (!Array.isArray(seatIds) || seatIds.length === 0) {
    throw new Error('seat_ids are required');
  }

  const seen = new Set();
  return seatIds.map((id) => {
    if (typeof id !== 'string') throw new Error('Invalid seat id');
    const match = id.match(/^([A-Z]+)(\d+)$/);
    if (!match) throw new Error(`Invalid seat id: ${id}`);
    if (seen.has(id)) throw new Error(`Duplicate seat id: ${id}`);
    seen.add(id);
    return {
      label: id,
      row: match[1],
      col: parseInt(match[2], 10),
    };
  });
}

async function createReservation(req, res) {
  const { showtime_id, seat_ids } = req.body;
  const user_id = req.user.user_id;

  if (!showtime_id || !Array.isArray(seat_ids) || seat_ids.length === 0) {
    return res.status(400).json({ error: 'showtime_id and seat_ids are required' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [showtimes] = await conn.query(
      "SELECT showtime_id FROM showtimes WHERE showtime_id = ? AND CONCAT(date, ' ', time) > NOW() FOR UPDATE",
      [showtime_id]
    );
    if (showtimes.length === 0) throw new Error('Cannot book past or unavailable showtime');

    const parsed = parseSeatIds(seat_ids);

    // Lock and verify all seats are available
    const whereClause = parsed.map(() => '(row = ? AND col = ?)').join(' OR ');
    const whereParams = parsed.flatMap(s => [s.row, s.col]);
    const [seats] = await conn.query(
      `SELECT * FROM seats WHERE showtime_id = ? AND (${whereClause}) FOR UPDATE`,
      [showtime_id, ...whereParams]
    );

    if (seats.length !== seat_ids.length) throw new Error('Some seats not found');
    const unavailable = seats.filter(s => s.status !== 'available');
    if (unavailable.length > 0) throw new Error('Some seats are already reserved');

    // Create reservation record
    const [result] = await conn.query(
      'INSERT INTO reservations (user_id, showtime_id) VALUES (?, ?)',
      [user_id, showtime_id]
    );
    const reservation_id = result.insertId;

    // Group seats by category
    const byCategory = {};
    for (const seat of seats) {
      byCategory[seat.category_id] = (byCategory[seat.category_id] || 0) + 1;
    }

    // Insert reservation_items and update counts
    for (const [category_id, quantity] of Object.entries(byCategory)) {
      const [cats] = await conn.query('SELECT price FROM seat_categories WHERE category_id = ?', [category_id]);
      await conn.query(
        'INSERT INTO reservation_items (reservation_id, category_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
        [reservation_id, category_id, quantity, cats[0].price]
      );
      await conn.query(
        'UPDATE seat_categories SET available_seats = available_seats - ? WHERE category_id = ?',
        [quantity, category_id]
      );
      await conn.query(
        'UPDATE showtimes SET available_seats = available_seats - ? WHERE showtime_id = ?',
        [quantity, showtime_id]
      );
    }

    // Lock individual seats
    for (const seat of seats) {
      await conn.query(
        "UPDATE seats SET status = 'reserved', reservation_id = ? WHERE seat_id = ?",
        [reservation_id, seat.seat_id]
      );
    }

    await conn.commit();
    res.status(201).json({ reservation_id, message: 'Reservation created successfully' });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
}

async function getUserReservations(req, res) {
  const user_id = req.user.user_id;

  const [rows] = await db.query(
    `SELECT r.reservation_id, r.status, r.created_at,
            r.showtime_id,
            DATE_FORMAT(st.date, '%Y-%m-%d') AS date, st.time, st.hall,
            s.title AS show_title, s.duration,
            t.name AS theatre_name, t.location,
            (SELECT JSON_ARRAYAGG(CONCAT(rs.row, rs.col))
             FROM seats rs
             WHERE rs.reservation_id = r.reservation_id) AS seats,
            JSON_ARRAYAGG(JSON_OBJECT(
              'category_name', sc.name,
              'quantity', ri.quantity,
              'unit_price', ri.unit_price
            )) AS items
     FROM reservations r
     JOIN showtimes st ON r.showtime_id = st.showtime_id
     JOIN shows s ON st.show_id = s.show_id
     JOIN theatres t ON s.theatre_id = t.theatre_id
     JOIN reservation_items ri ON r.reservation_id = ri.reservation_id
     JOIN seat_categories sc ON ri.category_id = sc.category_id
     WHERE r.user_id = ?
     GROUP BY r.reservation_id
     ORDER BY st.date DESC, st.time DESC`,
    [user_id]
  );

  const parsed = rows.map(row => ({
    ...row,
    items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
    seats: row.seats
      ? (typeof row.seats === 'string' ? JSON.parse(row.seats) : row.seats)
      : [],
  }));

  res.json(parsed);
}

async function cancelReservation(req, res) {
  const user_id = req.user.user_id;
  const { id } = req.params;

  const [rows] = await db.query(
    "SELECT r.*, DATE_FORMAT(st.date, '%Y-%m-%d') AS date, st.time FROM reservations r JOIN showtimes st ON r.showtime_id = st.showtime_id WHERE r.reservation_id = ? AND r.user_id = ?",
    [id, user_id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Reservation not found' });
  const reservation = rows[0];
  if (reservation.status === 'cancelled') {
    return res.status(400).json({ error: 'Reservation already cancelled' });
  }
  const showDatetime = new Date(`${reservation.date}T${reservation.time}`);
  if (showDatetime <= new Date()) {
    return res.status(400).json({ error: 'Cannot cancel past reservations' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      'UPDATE reservations SET status = ? WHERE reservation_id = ?',
      ['cancelled', id]
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
    // Release individual seats
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
}

async function modifyReservation(req, res) {
  const user_id = req.user.user_id;
  const { id } = req.params;
  const { seat_ids } = req.body;

  if (!Array.isArray(seat_ids) || seat_ids.length === 0) {
    return res.status(400).json({ error: 'seat_ids are required' });
  }

  const [rows] = await db.query(
    "SELECT r.*, DATE_FORMAT(st.date, '%Y-%m-%d') AS date, st.time FROM reservations r JOIN showtimes st ON r.showtime_id = st.showtime_id WHERE r.reservation_id = ? AND r.user_id = ?",
    [id, user_id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Reservation not found' });
  const reservation = rows[0];
  if (reservation.status === 'cancelled') {
    return res.status(400).json({ error: 'Cannot modify a cancelled reservation' });
  }
  const showDatetime = new Date(`${reservation.date}T${reservation.time}`);
  if (showDatetime <= new Date()) {
    return res.status(400).json({ error: 'Cannot modify past reservations' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const parsed = parseSeatIds(seat_ids);

    // Release old individual seats
    await conn.query(
      "UPDATE seats SET status = 'available', reservation_id = NULL WHERE reservation_id = ?",
      [id]
    );

    // Restore old category counts
    const [oldItems] = await conn.query(
      'SELECT category_id, quantity FROM reservation_items WHERE reservation_id = ?',
      [id]
    );
    for (const item of oldItems) {
      await conn.query(
        'UPDATE seat_categories SET available_seats = available_seats + ? WHERE category_id = ?',
        [item.quantity, item.category_id]
      );
      await conn.query(
        'UPDATE showtimes SET available_seats = available_seats + ? WHERE showtime_id = ?',
        [item.quantity, reservation.showtime_id]
      );
    }

    const whereClause = parsed.map(() => '(row = ? AND col = ?)').join(' OR ');
    const whereParams = parsed.flatMap(s => [s.row, s.col]);
    const [seats] = await conn.query(
      `SELECT * FROM seats WHERE showtime_id = ? AND (${whereClause}) FOR UPDATE`,
      [reservation.showtime_id, ...whereParams]
    );

    if (seats.length !== seat_ids.length) throw new Error('Some seats not found');
    const unavailable = seats.filter(s => s.status !== 'available');
    if (unavailable.length > 0) throw new Error('Some seats are already reserved');

    const byCategory = {};
    for (const seat of seats) {
      byCategory[seat.category_id] = (byCategory[seat.category_id] || 0) + 1;
    }

    await conn.query('DELETE FROM reservation_items WHERE reservation_id = ?', [id]);

    for (const [category_id, quantity] of Object.entries(byCategory)) {
      const [cats] = await conn.query(
        'SELECT price FROM seat_categories WHERE category_id = ?',
        [category_id]
      );
      await conn.query(
        'INSERT INTO reservation_items (reservation_id, category_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
        [id, category_id, quantity, cats[0].price]
      );
      await conn.query(
        'UPDATE seat_categories SET available_seats = available_seats - ? WHERE category_id = ?',
        [quantity, category_id]
      );
      await conn.query(
        'UPDATE showtimes SET available_seats = available_seats - ? WHERE showtime_id = ?',
        [quantity, reservation.showtime_id]
      );
    }

    for (const seat of seats) {
      await conn.query(
        "UPDATE seats SET status = 'reserved', reservation_id = ? WHERE seat_id = ?",
        [id, seat.seat_id]
      );
    }

    await conn.commit();
    res.json({ message: 'Reservation updated successfully' });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
}

module.exports = { createReservation, getUserReservations, cancelReservation, modifyReservation };
