// src/routes/treino.routes.js
const { Router } = require('express');
const TreinoController = require('../controllers/treino.controller');
const { authenticate } = require('../middlewares/auth');

const router = Router();

router.use(authenticate);

router.get('/hoje', TreinoController.obterRotinaHoje);
router.get('/agenda-semanal', TreinoController.obterAgendaSemanal);
router.get('/exercicio/:id', TreinoController.obterExercicio);
router.post('/registro', TreinoController.registrarTreino);

module.exports = router;

