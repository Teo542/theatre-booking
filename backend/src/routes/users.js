const router = require('express').Router();
const verifyToken = require('../middleware/auth');
const { getUserReservations } = require('../controllers/reservationController');

router.get('/reservations', verifyToken, getUserReservations);

module.exports = router;
