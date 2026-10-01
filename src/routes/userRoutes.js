const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { getProfile } = require('../controllers/userController');

router.get('/profile', protect, getProfile);

module.exports = router;
