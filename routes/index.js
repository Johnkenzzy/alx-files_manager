const express = require('express');
const AppController = require('../controllers/AppController');
const UsersController = require('../controllers/UsersController');
const AuthController = require('../controllers/AuthController');

const router = express.Router();

// Health check
router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);

// User signup
router.post('/users', UsersController.postNew);

// Authentication
router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisconnect);

// Authenticated user info
router.get('/users/me', UsersController.getMe);

module.exports = router;
