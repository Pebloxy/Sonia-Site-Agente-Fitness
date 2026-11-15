// src/routes/academia.routes.js
const { Router } = require('express');
const AcademiaController = require('../controllers/academia.controller');

const router = Router();

// Informações públicas da academia (RF18, RF19)
router.get('/', AcademiaController.obterInformacoes);
router.get('/modalidades', AcademiaController.listarModalidades);

module.exports = router;

