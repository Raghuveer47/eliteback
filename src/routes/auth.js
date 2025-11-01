const express = require('express');
const router = express.Router();
const { register, login, me, syncUser } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.get('/me', me);
router.post('/sync-user', syncUser);

module.exports = router;


