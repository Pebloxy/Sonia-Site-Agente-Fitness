// src/middlewares/auth.js
const jwt = require('jsonwebtoken');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');

const JWT_SECRET = process.env.JWT_SECRET || 'troque_por_um_segredo_forte_aqui';

function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Token de autenticação não fornecido');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Anexa as informações do usuário logado à requisição
    req.user = decoded; // { id, matricula, nivel, etc. }
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Sessão expirada. Faça login novamente.'));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new UnauthorizedError('Token inválido'));
    }
    next(error);
  }
}

// Middleware opcional (permite requisições sem token mas anexa se houver)
function optionalAuthenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      req.user = jwt.verify(token, JWT_SECRET);
    }
  } catch (_) {
    // ignora erro no modo opcional
  }
  next();
}

module.exports = {
  authenticate,
  optionalAuthenticate,
};

