// src/services/geminiTools.js
// Declaração de ferramentas determinísticas (Function Calling) para a API do Google Gemini
// Garante que o modelo não acesse diretamente o banco nem invente dados cadastrais (RNF05).

const TreinoService = require('./treino.service');
const AgendamentoService = require('./agendamento.service');
const AcademiaModel = require('../models/academia.model');
const DashboardService = require('./dashboard.service');

// Declarações de função no formato da API Gemini (Tools Schema)
const geminiFunctionDeclarations = [
  {
    name: 'consultar_rotina_do_dia',
    description: 'Consulta os exercícios, séries e repetições cadastrados na rotina de treino do aluno para um dia específico.',
    parameters: {
      type: 'OBJECT',
      properties: {
        diaSemana: {
          type: 'STRING',
          enum: ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'],
          description: 'Dia da semana a consultar. Se não informado, assume o dia atual.',
        },
      },
    },
  },
  {
    name: 'consultar_horarios_academia',
    description: 'Consulta os horários de funcionamento, horários de pico e períodos mais tranquilos da academia.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'consultar_modalidades',
    description: 'Consulta as modalidades esportivas oferecidas pela academia (dança, pilates, lutas, funcional, etc.).',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'consultar_evolucao_aluno',
    description: 'Consulta as conquistas, metas e o nível atual do aluno no sistema.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'consultar_disponibilidade_aulas',
    description: 'Consulta blocos horários de 1 hora disponíveis para agendamento de aula em uma data específica.',
    parameters: {
      type: 'OBJECT',
      properties: {
        diaSemana: {
          type: 'STRING',
          enum: ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'],
          description: 'Dia da semana.',
        },
        data: {
          type: 'STRING',
          description: 'Data no formato YYYY-MM-DD.',
        },
      },
      required: ['diaSemana', 'data'],
    },
  },
  {
    name: 'realizar_checkin',
    description: 'Registra a presença presencial do aluno na academia no momento atual.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
];

// Executor determinístico das ferramentas no backend
async function executarFerramenta(nomeFuncao, args, alunoId) {
  try {
    switch (nomeFuncao) {
      case 'consultar_rotina_do_dia': {
        const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
        const dia = args.diaSemana || diasSemana[new Date().getDay()];
        if (dia === 'domingo') {
          return { mensagem: 'Aos domingos a academia está fechada para descanso muscular!' };
        }
        if (!alunoId) {
          return { mensagem: 'Para consultar sua ficha de treino é necessário estar logado na sua conta.' };
        }
        return await TreinoService.obterRotinaDoDia(alunoId, dia);
      }

      case 'consultar_horarios_academia': {
        const horarios = await AcademiaModel.listarHorariosFuncionamento();
        const ocupacao = await AcademiaModel.obterOcupacao();
        return { horarios, ocupacao };
      }

      case 'consultar_modalidades': {
        const modalidades = await AcademiaModel.listarModalidades();
        return { modalidades };
      }

      case 'consultar_evolucao_aluno': {
        if (!alunoId) {
          return { mensagem: 'Faça login para consultar suas metas e conquistas.' };
        }
        return await DashboardService.obterResumo(alunoId);
      }

      case 'consultar_disponibilidade_aulas': {
        return await AgendamentoService.listarDisponibilidade(args.diaSemana, args.data);
      }

      case 'realizar_checkin': {
        if (!alunoId) {
          return { mensagem: 'Faça login para registrar seu check-in.' };
        }
        return await AgendamentoService.realizarCheckin(alunoId);
      }

      default:
        return { erro: `Ferramenta desconhecida: ${nomeFuncao}` };
    }
  } catch (err) {
    return { erro: `Falha ao executar ${nomeFuncao}: ${err.message}` };
  }
}

module.exports = {
  geminiFunctionDeclarations,
  executarFerramenta,
};

