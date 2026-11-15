// src/middlewares/errorHandler.js
const { AppError } = require('../utils/errors');

function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Erro interno do servidor';
  let details = err.details || null;

  // Log de erros não operacionais (bugs inesperados)
  if (!err.isOperational) {
    console.error('❌ ERRO INESPERADO:', err);
  }

  res.status(statusCode).json({
    status: err.status || 'error',
    message,
    ...(details && { details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = errorHandler;

