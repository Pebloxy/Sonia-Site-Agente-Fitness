// src/controllers/aluno.controller.js
const AlunoService = require('../services/aluno.service');

class AlunoController {
  static async obterMeuPerfil(req, res, next) {
    try {
      const alunoId = req.user.id;
      const perfil = await AlunoService.obterPerfil(alunoId);
      res.status(200).json({ status: 'success', data: perfil });
    } catch (err) {
      next(err);
    }
  }

  static async atualizarMeuPerfil(req, res, next) {
    try {
      const alunoId = req.user.id;
      const perfilAtualizado = await AlunoService.atualizarPerfil(alunoId, req.body);
      res.status(200).json({
        status: 'success',
        message: 'Perfil atualizado com sucesso!',
        data: perfilAtualizado,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AlunoController;

