// src/routes/aluno.routes.js
const { Router } = require('express');
const AlunoController = require('../controllers/aluno.controller');
const { authenticate } = require('../middlewares/auth');

const router = Router();

router.use(authenticate);

router.get('/perfil', AlunoController.obterMeuPerfil);
router.put('/perfil', AlunoController.atualizarMeuPerfil);

module.exports = router;

