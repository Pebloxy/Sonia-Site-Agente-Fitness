// src/controllers/dashboard.controller.js
const DashboardService = require('../services/dashboard.service');

class DashboardController {
  static async obterDashboard(req, res, next) {
    try {
      const alunoId = req.user.id;
      const dados = await DashboardService.obterResumo(alunoId);
      res.status(200).json({ status: 'success', data: dados });
    } catch (err) {
      next(err);
    }
  }

  static async exportarCsv(req, res, next) {
    try {
      const alunoId = req.user.id;
      const csv = await DashboardService.exportarCsv(alunoId);
      res.header('Content-Type', 'text/csv; charset=utf-8');
      res.attachment(`historico_treinos_aluno_${alunoId}.csv`);
      res.send('\uFEFF' + csv); // BOM UTF-8 para Excel
    } catch (err) {
      next(err);
    }
  }

  static async criarMeta(req, res, next) {
    try {
      const alunoId = req.user.id;
      const { descricao, tipo } = req.body;
      const resultado = await DashboardService.adicionarMeta(alunoId, descricao, tipo);
      res.status(201).json({ status: 'success', data: resultado });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = DashboardController;

