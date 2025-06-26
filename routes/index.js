const express = require('express');
const AppController = require('../controllers/AppController');
const UsersController = require('../controllers/UsersController');
const AuthController = require('../controllers/AuthController');
const FilesController = require('../controllers/FilesController');

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

// Files
router.post('/files', FilesController.postUpload);
router.get('/files/:id', FilesController.getShow);
router.get('/files', FilesController.getIndex);
router.put('/files/:id/publish', FilesController.putPublish);
router.put('/files/:id/unpublish', FilesController.putUnpublish);
router.get('/files/:id/data', FilesController.getFile);

module.exports = router;
