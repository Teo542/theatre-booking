const router = require('express').Router();
const verifyToken = require('../middleware/auth');
const { getSeats } = require('../controllers/seatController');

router.get('/', verifyToken, getSeats);

module.exports = router;
