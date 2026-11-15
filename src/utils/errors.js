// src/utils/errors.js
// Classes de erros customizadas para padronização de respostas da API

class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Requisição inválida', details = null) {
    super(message, 400, details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Não autorizado', details = null) {
    super(message, 401, details);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado', details = null) {
    super(message, 403, details);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado', details = null) {
    super(message, 404, details);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflito de dados', details = null) {
    super(message, 409, details);
  }
}

class TooManyRequestsError extends AppError {
  constructor(message = 'Muitas requisições. Tente novamente mais tarde.', details = null) {
    super(message, 429, details);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
};

