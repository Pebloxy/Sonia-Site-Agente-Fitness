// src/services/treino.service.js
const TreinoModel = require('../models/treino.model');
const { NotFoundError, BadRequestError } = require('../utils/errors');

class TreinoService {
  static async obterRotinaDoDia(alunoId, diaSemana) {
    const rotina = await TreinoModel.buscarRotinaAtiva(alunoId);
    if (!rotina) {
      return {
        possuiRotina: false,
        diaSemana,
        mensagem: 'Nenhuma rotina ativa cadastrada pelo seu instrutor no momento. Fale com seu treinador!',
        exercicios: [],
      };
    }

    const exercicios = await TreinoModel.buscarExerciciosRotina(rotina.id, diaSemana);
    return {
      possuiRotina: true,
      rotinaId: rotina.id,
      nomeRotina: rotina.nome,
      diaSemana,
      exercicios,
    };
  }

  static async obterAgendaSemanal(alunoId) {
    const rotina = await TreinoModel.buscarRotinaAtiva(alunoId);
    if (!rotina) {
      return { possuiRotina: false, dias: {} };
    }

    const todosExercicios = await TreinoModel.buscarExerciciosRotina(rotina.id);
    const dias = {
      segunda: [],
      terca: [],
      quarta: [],
      quinta: [],
      sexta: [],
      sabado: [],
    };

    todosExercicios.forEach(ex => {
      if (dias[ex.dia_semana]) {
        dias[ex.dia_semana].push(ex);
      }
    });

    return {
      possuiRotina: true,
      nomeRotina: rotina.nome,
      dias,
    };
  }

  static async obterDetalhesExercicio(exercicioId) {
    const exercicio = await TreinoModel.buscarExercicioPorId(exercicioId);
    if (!exercicio) {
      throw new NotFoundError('Exercício não encontrado');
    }

    const video = await TreinoModel.buscarVideoExercicio(exercicioId);
    return {
      ...exercicio,
      video: video ? { titulo: video.titulo, url: video.url, fonte: video.fonte } : null,
    };
  }

  static async registrarTreinoConcluido(alunoId, dados) {
    const { rotina_id, data_treino, inicio, fim, observacoes, exercicios, avaliacao, sincronizado } = dados;

    const registroTreinoId = await TreinoModel.criarRegistroTreino({
      aluno_id: alunoId,
      rotina_id,
      data_treino,
      inicio,
      fim,
      observacoes,
      sincronizado: sincronizado !== undefined ? sincronizado : true,
    });

    if (exercicios && exercicios.length) {
      const exerciciosMapeados = exercicios.map(e => ({
        registro_treino_id: registroTreinoId,
        exercicio_id: e.exercicio_id,
        serie_numero: e.serie_numero,
        repeticoes_realizadas: e.repeticoes_realizadas,
        carga_utilizada: e.carga_utilizada,
      }));
      await TreinoModel.registrarExerciciosExecutados(exerciciosMapeados);
    }

    if (avaliacao && avaliacao.nota) {
      await TreinoModel.salvarAvaliacao(alunoId, registroTreinoId, avaliacao.nota, avaliacao.comentario);
    }

    return {
      sucesso: true,
      registroTreinoId,
      mensagem: 'Treino registrado com sucesso! Parabéns pelo foco! 💪',
    };
  }
}

module.exports = TreinoService;

