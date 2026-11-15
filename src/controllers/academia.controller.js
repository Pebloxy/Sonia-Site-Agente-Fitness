// src/controllers/academia.controller.js
const AcademiaModel = require('../models/academia.model');

class AcademiaController {
  static async obterInformacoes(req, res, next) {
    try {
      const academia = await AcademiaModel.obterDadosAcademia();
      const horarios = await AcademiaModel.listarHorariosFuncionamento();
      const modalidades = await AcademiaModel.listarModalidades();
      const ocupacao = await AcademiaModel.obterOcupacao();

      res.status(200).json({
        status: 'success',
        data: {
          ...academia,
          horarios,
          modalidades,
          ocupacao,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async listarModalidades(req, res, next) {
    try {
      const modalidades = await AcademiaModel.listarModalidades();
      res.status(200).json({ status: 'success', data: modalidades });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AcademiaController;

