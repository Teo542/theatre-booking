require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/auth');
const theatreRoutes = require('./src/routes/theatres');
const showRoutes = require('./src/routes/shows');
const showtimeRoutes = require('./src/routes/showtimes');
const seatRoutes = require('./src/routes/seats');
const reservationRoutes = require('./src/routes/reservations');
const userRoutes = require('./src/routes/users');

const app = express();
app.use(cors());
app.use(express.json());

// Auth (POST /register, POST /login)
app.use('/', authRoutes);

// Resources
app.use('/theatres', theatreRoutes);
app.use('/shows', showRoutes);
app.use('/showtimes', showtimeRoutes);
app.use('/seats', seatRoutes);
app.use('/reservations', reservationRoutes);
app.use('/user', userRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
