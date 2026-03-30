const router = require('express').Router();
const verifyToken = require('../middleware/auth');
const {
  createReservation,
  cancelReservation,
  modifyReservation,
} = require('../controllers/reservationController');

router.use(verifyToken);

router.post('/', createReservation);
router.put('/:id', modifyReservation);
router.delete('/:id', cancelReservation);

module.exports = router;
