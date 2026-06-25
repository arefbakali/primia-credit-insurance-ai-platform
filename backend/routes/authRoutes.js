const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.get('/users', authenticate, requireAdmin, authController.getUsers);
router.put('/users', authenticate, requireAdmin, authController.updateUserRole);

module.exports = router;
