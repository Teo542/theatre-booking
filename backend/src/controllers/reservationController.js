const db = require('../db');

async function createReservation(req, res) {
  const { showtime_id, seat_ids } = req.body;
  const user_id = req.user.user_id;

  if (!showtime_id || !seat_ids || seat_ids.length === 0) {
    return res.status(400).json({ error: 'showtime_id and seat_ids are required' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Parse seat labels (e.g. "A1", "B12") into row/col
    const parsed = seat_ids.map(id => ({
      label: id,
      row: id.match(/^[A-Z]+/)[0],
      col: parseInt(id.match(/\d+$/)[0]),
    }));

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
            st.date, st.time, st.hall,
            s.title AS show_title, s.duration,
            t.name AS theatre_name, t.location,
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
  }));

  res.json(parsed);
}

async function cancelReservation(req, res) {
  const user_id = req.user.user_id;
  const { id } = req.params;

  const [rows] = await db.query(
    'SELECT r.*, st.date, st.time FROM reservations r JOIN showtimes st ON r.showtime_id = st.showtime_id WHERE r.reservation_id = ? AND r.user_id = ?',
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
  const { items } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'items are required' });
  }

  const [rows] = await db.query(
    'SELECT r.*, st.date, st.time FROM reservations r JOIN showtimes st ON r.showtime_id = st.showtime_id WHERE r.reservation_id = ? AND r.user_id = ?',
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

    // Auto-assign new seats per category
    for (const item of items) {
      const [available] = await conn.query(
        "SELECT seat_id FROM seats WHERE showtime_id = ? AND category_id = ? AND status = 'available' LIMIT ? FOR UPDATE",
        [reservation.showtime_id, item.category_id, item.quantity]
      );
      if (available.length < item.quantity) {
        throw new Error(`Not enough seats in category ${item.category_id}`);
      }
      for (const seat of available) {
        await conn.query(
          "UPDATE seats SET status = 'reserved', reservation_id = ? WHERE seat_id = ?",
          [id, seat.seat_id]
        );
      }
    }

    await conn.query('DELETE FROM reservation_items WHERE reservation_id = ?', [id]);

    for (const item of items) {
      const [cats] = await conn.query(
        'SELECT price FROM seat_categories WHERE category_id = ?',
        [item.category_id]
      );
      await conn.query(
        'INSERT INTO reservation_items (reservation_id, category_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
        [id, item.category_id, item.quantity, cats[0].price]
      );
      await conn.query(
        'UPDATE seat_categories SET available_seats = available_seats - ? WHERE category_id = ?',
        [item.quantity, item.category_id]
      );
      await conn.query(
        'UPDATE showtimes SET available_seats = available_seats - ? WHERE showtime_id = ?',
        [item.quantity, reservation.showtime_id]
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
