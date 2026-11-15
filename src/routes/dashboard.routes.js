// src/routes/dashboard.routes.js
const { Router } = require('express');
const DashboardController = require('../controllers/dashboard.controller');
const { authenticate } = require('../middlewares/auth');

const router = Router();

router.use(authenticate);

router.get('/', DashboardController.obterDashboard);
router.get('/exportar-csv', DashboardController.exportarCsv);
router.post('/meta', DashboardController.criarMeta);

module.exports = router;

