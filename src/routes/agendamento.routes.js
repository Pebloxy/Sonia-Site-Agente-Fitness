// src/routes/agendamento.routes.js
const { Router } = require('express');
const AgendamentoController = require('../controllers/agendamento.controller');
const { authenticate } = require('../middlewares/auth');

const router = Router();

router.use(authenticate);

router.get('/disponibilidade', AgendamentoController.listarDisponibilidade);
router.post('/', AgendamentoController.agendar);
router.delete('/:id', AgendamentoController.cancelar);
router.post('/checkin', AgendamentoController.checkin);
router.get('/inatividade', AgendamentoController.statusInatividade);

module.exports = router;

