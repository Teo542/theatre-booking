const router = require('express').Router();
const { getShowtimes } = require('../controllers/showtimeController');

router.get('/', getShowtimes);

module.exports = router;
