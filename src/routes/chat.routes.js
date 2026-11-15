// src/routes/chat.routes.js
const { Router } = require('express');
const ChatController = require('../controllers/chat.controller');
const { chatLimiter } = require('../middlewares/rateLimiter');
const { optionalAuthenticate, authenticate } = require('../middlewares/auth');

const router = Router();

// Endpoint de chat (pode receber token opcional ou não se o aluno estiver logado)
router.post('/', chatLimiter, optionalAuthenticate, ChatController.enviarMensagem);
router.get('/historico', authenticate, ChatController.obterHistorico);

module.exports = router;

