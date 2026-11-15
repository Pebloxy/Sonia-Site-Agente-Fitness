// src/routes/auth.routes.js
const { Router } = require('express');
const AuthController = require('../controllers/auth.controller');
const { authLimiter } = require('../middlewares/rateLimiter');
const { authenticate } = require('../middlewares/auth');

const router = Router();

router.post('/cadastro', authLimiter, AuthController.cadastrar);
router.post('/login', authLimiter, AuthController.login);
router.post('/consentimento', authenticate, AuthController.consentimento);

module.exports = router;

