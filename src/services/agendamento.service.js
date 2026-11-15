// src/services/agendamento.service.js
const AgendamentoModel = require('../models/agendamento.model');
const { BadRequestError, NotFoundError, ConflictError } = require('../utils/errors');
const { auditLog } = require('../middlewares/logger');

class AgendamentoService {
  static async listarDisponibilidade(diaSemana, data) {
    if (!diaSemana || !data) {
      throw new BadRequestError('Dia da semana e data são obrigatórios');
    }
    return await AgendamentoModel.listarBlocosDisponiveis(diaSemana, data);
  }

  static async agendar(alunoId, blocoId, dataAula, ip = null) {
    if (!blocoId || !dataAula) {
      throw new BadRequestError('Bloco de horário e data da aula são obrigatórios');
    }

    // Valida se a data não é no passado
    const dataObj = new Date(dataAula);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    if (dataObj < hoje) {
      throw new BadRequestError('Não é possível agendar aulas em datas passadas');
    }

    // Regra RN03: Conflito de agendamento
    const conflito = await AgendamentoModel.verificarConflito(alunoId, dataAula, blocoId);
    if (conflito) {
      throw new ConflictError('Você já possui um agendamento para este bloco e dia (RN03)');
    }

    const agendamentoId = await AgendamentoModel.criar(alunoId, blocoId, dataAula);
    await auditLog(alunoId, 'AGENDAMENTO', 'agendamento', agendamentoId, { blocoId, dataAula }, ip);

    return {
      sucesso: true,
      agendamentoId,
      mensagem: 'Aula agendada com sucesso! Lembre-se de comparecer com antecedência. Bora treinar! 💪',
    };
  }

  static async cancelar(alunoId, agendamentoId, ip = null) {
    const agendamento = await AgendamentoModel.buscarPorId(agendamentoId);
    if (!agendamento || agendamento.aluno_id !== alunoId) {
      throw new NotFoundError('Agendamento não encontrado');
    }

    if (agendamento.status !== 'agendado') {
      throw new BadRequestError(`Este agendamento já está ${agendamento.status}`);
    }

    // Regra RN04: Prazo para cancelamento com antecedência mínima de 2 horas
    const dataHoraAula = new Date(`${agendamento.data_aula.toISOString().slice(0, 10)}T${agendamento.hora_inicio}`);
    const agora = new Date();
    const diffHoras = (dataHoraAula - agora) / (1000 * 60 * 60);

    if (diffHoras < 2) {
      throw new BadRequestError(
        'Cancelamento só é permitido com antecedência mínima de 2 horas do horário agendado (RN04).'
      );
    }

    await AgendamentoModel.cancelar(agendamentoId);
    await auditLog(alunoId, 'CANCELAMENTO_AGENDAMENTO', 'agendamento', agendamentoId, null, ip);

    return {
      sucesso: true,
      mensagem: 'Agendamento cancelado com sucesso.',
    };
  }

  static async realizarCheckin(alunoId, agendamentoId = null, ip = null) {
    const checkinId = await AgendamentoModel.realizarCheckin(alunoId, agendamentoId);
    await auditLog(alunoId, 'CHECKIN', 'checkin', checkinId, { agendamentoId }, ip);

    return {
      sucesso: true,
      checkinId,
      mensagem: 'Check-in confirmado! Bom treino, foco total hoje! 🔥',
    };
  }

  static async verificarStatusInatividade(alunoId) {
    // Regra RN07: 7 dias sem check-in = inativo; 14 dias = notificar instrutor
    const ultimo = await AgendamentoModel.buscarUltimoCheckin(alunoId);
    if (!ultimo) {
      return {
        status: 'sem_registros',
        diasSemCheckin: null,
        mensagemSonia: 'Que bom ter você por aqui! Registre seu primeiro check-in e bora começar com tudo! 💪',
      };
    }

    const agora = new Date();
    const ultimoCheckinData = new Date(ultimo.horario);
    const dias = Math.floor((agora - ultimoCheckinData) / (1000 * 60 * 60 * 24));

    return {
      diasSemCheckin: dias,
      inativo7Dias: dias >= 7,
      inativo14Dias: dias >= 14,
      mensagemSonia:
        dias >= 14
          ? 'Percebemos que faz 14 dias que você não vem treinar. Seu instrutor já foi avisado para te dar aquele apoio! Bora voltar?'
          : dias >= 7
          ? 'Ei! Faz 7 dias que não te vejo por aqui! Bateu saudade da academia? Bora retomar o foco hoje!'
          : 'Presença em dia! Parabéns pela consistência!',
    };
  }
}

module.exports = AgendamentoService;

