// src/controllers/auth.controller.js
const AuthService = require('../services/auth.service');

class AuthController {
  static async cadastrar(req, res, next) {
    try {
      const ip = req.ip || req.connection.remoteAddress;
      const resultado = await AuthService.cadastrar(req.body, ip);
      res.status(201).json({
        status: 'success',
        message: 'Cadastro realizado com sucesso!',
        data: resultado,
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req, res, next) {
    try {
      const { matricula, senha } = req.body;
      const ip = req.ip || req.connection.remoteAddress;
      const resultado = await AuthService.login(matricula, senha, ip);
      res.status(200).json({
        status: 'success',
        message: 'Login realizado com sucesso!',
        data: resultado,
      });
    } catch (err) {
      next(err);
    }
  }

  static async consentimento(req, res, next) {
    try {
      const alunoId = req.user.id;
      const ip = req.ip || req.connection.remoteAddress;
      const resultado = await AuthService.registrarConsentimento(alunoId, ip);
      res.status(200).json({
        status: 'success',
        message: 'Termo de consentimento aceito com sucesso.',
        data: resultado,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AuthController;

