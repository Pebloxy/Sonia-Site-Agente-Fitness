// src/routes/index.js
const { Router } = require('express');
const authRoutes = require('./auth.routes');
const alunoRoutes = require('./aluno.routes');
const treinoRoutes = require('./treino.routes');
const agendamentoRoutes = require('./agendamento.routes');
const dashboardRoutes = require('./dashboard.routes');
const academiaRoutes = require('./academia.routes');
const chatRoutes = require('./chat.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/alunos', alunoRoutes);
router.use('/treinos', treinoRoutes);
router.use('/agendamentos', agendamentoRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/academia', academiaRoutes);
router.use('/chat', chatRoutes);

// Endpoint de status da API
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Sonia - Assistente Virtual para Academia',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;

