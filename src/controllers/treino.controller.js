// src/controllers/treino.controller.js
const TreinoService = require('../services/treino.service');

class TreinoController {
  static async obterRotinaHoje(req, res, next) {
    try {
      const alunoId = req.user.id;
      const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
      const diaSemanaAtual = diasSemana[new Date().getDay()];

      const rotina = await TreinoService.obterRotinaDoDia(alunoId, diaSemanaAtual);
      res.status(200).json({ status: 'success', data: rotina });
    } catch (err) {
      next(err);
    }
  }

  static async obterAgendaSemanal(req, res, next) {
    try {
      const alunoId = req.user.id;
      const agenda = await TreinoService.obterAgendaSemanal(alunoId);
      res.status(200).json({ status: 'success', data: agenda });
    } catch (err) {
      next(err);
    }
  }

  static async obterExercicio(req, res, next) {
    try {
      const exercicioId = parseInt(req.params.id, 10);
      const exercicio = await TreinoService.obterDetalhesExercicio(exercicioId);
      res.status(200).json({ status: 'success', data: exercicio });
    } catch (err) {
      next(err);
    }
  }

  static async registrarTreino(req, res, next) {
    try {
      const alunoId = req.user.id;
      const resultado = await TreinoService.registrarTreinoConcluido(alunoId, req.body);
      res.status(201).json({ status: 'success', data: resultado });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = TreinoController;

