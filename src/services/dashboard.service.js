// src/services/dashboard.service.js
const DashboardModel = require('../models/dashboard.model');
const AgendamentoModel = require('../models/agendamento.model');
const AlunoModel = require('../models/aluno.model');
const { jsonParaCsv } = require('../utils/helpers');
const EstatisticasService = require('./estatisticas.service');

class DashboardService {
  static async obterResumo(alunoId) {
    const aluno = await AlunoModel.buscarPorId(alunoId);
    const { metas, conquistas } = await DashboardModel.listarMetasEConquistas(alunoId);
    const checkins = await AgendamentoModel.listarCheckinsAluno(alunoId, 10);
    const evolucaoCargas = await DashboardModel.obterEvolucaoCargas(alunoId);

    return {
      aluno: {
        nome: aluno?.nome,
        nivel: aluno?.nivel,
        objetivo: aluno?.objetivo,
        peso: aluno?.peso,
        altura: aluno?.altura,
      },
      totalCheckinsRecentes: checkins.length,
      metas,
      conquistas,
      evolucaoCargas,
      estatisticas: EstatisticasService.gerar(alunoId, aluno || {}), // dados fictícios de demonstração
    };
  }

  static async exportarCsv(alunoId) {
    // RN16: Somente dados do próprio aluno
    const dados = await DashboardModel.obterHistoricoExportacao(alunoId);
    const csvString = jsonParaCsv(dados);
    return csvString;
  }

  static async adicionarMeta(alunoId, descricao, tipo) {
    const id = await DashboardModel.salvarMeta(alunoId, descricao, tipo);
    return { sucesso: true, metaId: id };
  }
}

module.exports = DashboardService;

