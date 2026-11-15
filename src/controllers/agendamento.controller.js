// src/controllers/agendamento.controller.js
const AgendamentoService = require('../services/agendamento.service');

class AgendamentoController {
  static async listarDisponibilidade(req, res, next) {
    try {
      const { diaSemana, data } = req.query;
      const blocos = await AgendamentoService.listarDisponibilidade(diaSemana, data);
      res.status(200).json({ status: 'success', data: blocos });
    } catch (err) {
      next(err);
    }
  }

  static async agendar(req, res, next) {
    try {
      const alunoId = req.user.id;
      const { blocoId, dataAula } = req.body;
      const ip = req.ip || req.connection.remoteAddress;
      const resultado = await AgendamentoService.agendar(alunoId, blocoId, dataAula, ip);
      res.status(201).json({ status: 'success', data: resultado });
    } catch (err) {
      next(err);
    }
  }

  static async cancelar(req, res, next) {
    try {
      const alunoId = req.user.id;
      const agendamentoId = parseInt(req.params.id, 10);
      const ip = req.ip || req.connection.remoteAddress;
      const resultado = await AgendamentoService.cancelar(alunoId, agendamentoId, ip);
      res.status(200).json({ status: 'success', data: resultado });
    } catch (err) {
      next(err);
    }
  }

  static async checkin(req, res, next) {
    try {
      const alunoId = req.user.id;
      const { agendamentoId } = req.body;
      const ip = req.ip || req.connection.remoteAddress;
      const resultado = await AgendamentoService.realizarCheckin(alunoId, agendamentoId, ip);
      res.status(200).json({ status: 'success', data: resultado });
    } catch (err) {
      next(err);
    }
  }

  static async statusInatividade(req, res, next) {
    try {
      const alunoId = req.user.id;
      const status = await AgendamentoService.verificarStatusInatividade(alunoId);
      res.status(200).json({ status: 'success', data: status });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AgendamentoController;

