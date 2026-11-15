// src/services/aluno.service.js
const AlunoModel = require('../models/aluno.model');
const { NotFoundError } = require('../utils/errors');
const { calcularNivelAluno } = require('../utils/helpers');

class AlunoService {
  static async obterPerfil(alunoId) {
    const aluno = await AlunoModel.buscarPorId(alunoId);
    if (!aluno) {
      throw new NotFoundError('Aluno não encontrado');
    }

    // RN22: Verificar se faz mais de 30 dias desde a última atualização dos dados
    let precisaAtualizarDados = false;
    if (aluno.dados_atualizados_em) {
      const diffDias = Math.floor((Date.now() - new Date(aluno.dados_atualizados_em)) / (1000 * 60 * 60 * 24));
      if (diffDias >= 30) precisaAtualizarDados = true;
    } else {
      precisaAtualizarDados = true;
    }

    return {
      ...aluno,
      precisaAtualizarDados,
    };
  }

  static async atualizarPerfil(alunoId, dadosNovos) {
    const alunoAtual = await AlunoModel.buscarPorId(alunoId);
    if (!alunoAtual) {
      throw new NotFoundError('Aluno não encontrado');
    }

    // Se houve alteração de tempo de treino, recalcula o nível (RN26)
    let novoNivel = alunoAtual.nivel;
    if (dadosNovos.tempo_treino_meses !== undefined) {
      novoNivel = calcularNivelAluno(dadosNovos.tempo_treino_meses);
      dadosNovos.nivel = novoNivel;
    }

    await AlunoModel.atualizarPerfil(alunoId, dadosNovos);

    // Registra no histórico de evolução se houve mudança de peso/altura/nível
    const peso = dadosNovos.peso !== undefined ? dadosNovos.peso : alunoAtual.peso;
    const altura = dadosNovos.altura !== undefined ? dadosNovos.altura : alunoAtual.altura;
    await AlunoModel.registrarHistorico(alunoId, peso, altura, novoNivel);

    return await this.obterPerfil(alunoId);
  }
}

module.exports = AlunoService;

