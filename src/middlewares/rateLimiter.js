// src/middlewares/rateLimiter.js
const rateLimit = require('express-rate-limit');

// Limitador geral da API: 150 requisições a cada 15 minutos por IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Muitas requisições deste IP. Por favor tente novamente após 15 minutos.',
  },
});

// Limitador para autenticação: 10 tentativas a cada 10 minutos por IP
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Muitas tentativas de login. Aguarde alguns minutos antes de tentar novamente.',
  },
});

// Limitador para envio de mensagens no Chat: 60 requisições por minuto
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Você está enviando mensagens muito rapidamente. Calma, respira fundo e tenta de novo!',
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  chatLimiter,
};

