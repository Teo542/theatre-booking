const router = require('express').Router();
const { getShows, getShowById } = require('../controllers/showController');

router.get('/', getShows);
router.get('/:id', getShowById);

module.exports = router;
