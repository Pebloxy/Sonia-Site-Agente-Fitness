// src/middlewares/logger.js
const { pool } = require('../config/database');

// Middleware para console logging de requisições HTTP
function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
}

/**
 * Registra uma ação importante na tabela log_auditoria (RNF16)
 * @param {number|null} usuarioId
 * @param {string} acao
 * @param {string} entidade
 * @param {number|null} entidadeId
 * @param {string|object} detalhes
 * @param {string} ip
 */
async function auditLog(usuarioId, acao, entidade, entidadeId = null, detalhes = null, ip = null) {
  try {
    const detalhesStr = typeof detalhes === 'object' ? JSON.stringify(detalhes) : detalhes;
    await pool.query(
      `INSERT INTO log_auditoria (usuario_id, acao, entidade, entidade_id, detalhes, ip)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [usuarioId, acao, entidade, entidadeId, detalhesStr, ip]
    );
  } catch (err) {
    // Não interrompe a requisição se o banco estiver indisponível
    console.warn('⚠️ Não foi possível salvar log de auditoria no BD:', err.message);
  }
}

module.exports = {
  requestLogger,
  auditLog,
};

