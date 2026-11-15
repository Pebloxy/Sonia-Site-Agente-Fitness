// src/app.js
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const { requestLogger } = require('./middlewares/logger');
const { apiLimiter } = require('./middlewares/rateLimiter');
const errorHandler = require('./middlewares/errorHandler');
const routes = require('./routes');
const { NotFoundError } = require('./utils/errors');

const app = express();

// Configurações de segurança HTTP (Helmet) adaptadas para WebGL e scripts locais
app.use(
  helmet({
    contentSecurityPolicy: false, // permite WebGL e inline scripts do protótipo
    crossOriginEmbedderPolicy: false,
  })
);

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Logger de requisições
app.use(requestLogger);

// Rate limiter geral na API
app.use('/api', apiLimiter);

// Rotas da API
app.use('/api', routes);

// Servir arquivos estáticos da pasta public
const publicPath = path.join(__dirname, '..', 'public');

// Middleware para garantir Content-Type correto de modelos .glb
app.use((req, res, next) => {
  if (req.path.endsWith('.glb')) {
    res.setHeader('Content-Type', 'model/gltf-binary');
  }
  next();
});

app.use(express.static(publicPath));

// Fallback para rotas GET não-API (SPA / index.html) e 404 para API
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next(new NotFoundError(`Endpoint ${req.originalUrl} não encontrado`));
  }
  if (req.method === 'GET') {
    return res.sendFile(path.join(publicPath, 'index.html'));
  }
  next(new NotFoundError(`Recurso ${req.originalUrl} não encontrado`));
});

// Middleware centralizado de tratamento de erros
app.use(errorHandler);

module.exports = app;
