const router = require('express').Router();
const { getTheatres, getTheatreById } = require('../controllers/theatreController');

router.get('/', getTheatres);
router.get('/:id', getTheatreById);

module.exports = router;
