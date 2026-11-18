// src/services/geminiTools.js
// Declaração de ferramentas determinísticas (Function Calling) para a API do Google Gemini
// Garante que o modelo não acesse diretamente o banco nem invente dados cadastrais (RNF05).

const TreinoService = require('./treino.service');
const AgendamentoService = require('./agendamento.service');
const AcademiaModel = require('../models/academia.model');
const DashboardService = require('./dashboard.service');
const Demo = require('../demo/treinos.demo');

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
    name: 'mostrar_video',
    description: 'Mostra ao aluno o vídeo de demonstração e a explicação de como executar um exercício. Use sempre que o aluno pedir vídeo, ou perguntar como fazer/executar um exercício.',
    parameters: {
      type: 'OBJECT',
      properties: {
        exercicio: { type: 'STRING', description: 'Nome do exercício, por exemplo: "agachamento livre", "supino reto", "puxada frontal".' },
      },
      required: ['exercicio'],
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
        const { estatisticas, ...resumo } = await DashboardService.obterResumo(alunoId); // sem os gráficos fictícios: pesado demais para a IA
        return resumo;
      }

      case 'consultar_disponibilidade_aulas': {
        return await AgendamentoService.listarDisponibilidade(args.diaSemana, args.data);
      }

      case 'mostrar_video': {
        const e = Demo.buscarExercicio(args.exercicio);
        if (!e) {
          return { encontrado: false, mensagem: 'Não tenho vídeo desse exercício.', exercicios_com_video: Demo.nomesExercicios() };
        }
        return { encontrado: true, exercicio: e.nome, grupo_muscular: e.grupo, como_executar: e.exec, video: 'exibido ao aluno no chat' };
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

// ---------- Cartões que aparecem no chat junto com a resposta da Sonia ----------
const NOMES_DIA = { segunda: 'Seg', terca: 'Ter', quarta: 'Qua', quinta: 'Qui', sexta: 'Sex', sabado: 'Sáb', domingo: 'Dom' };
const hhmm = (t) => String(t || '').slice(0, 5);

function agruparHorarios(horarios = []) {
  const grupos = [];
  for (const h of horarios) {
    const faixa = `${hhmm(h.abertura)} às ${hhmm(h.fechamento)}`;
    const ult = grupos[grupos.length - 1];
    if (ult && ult.faixa === faixa) ult.dias.push(h.dia_semana);
    else grupos.push({ faixa, dias: [h.dia_semana] });
  }
  return grupos.map((g) => ({
    titulo: g.dias.length > 1 ? `${NOMES_DIA[g.dias[0]] || g.dias[0]} a ${NOMES_DIA[g.dias[g.dias.length - 1]] || g.dias[g.dias.length - 1]}` : (NOMES_DIA[g.dias[0]] || g.dias[0]),
    detalhe: g.faixa,
  }));
}

function montarCartoes(nome, args, r) {
  if (!r || r.erro) return [];
  switch (nome) {
    case 'mostrar_video': {
      if (!r.encontrado) return [];
      const e = Demo.buscarExercicio(r.exercicio);
      return [{ tipo: 'video', titulo: e.nome, detalhe: e.grupo, videoId: e.videoId, url: 'https://www.youtube.com/watch?v=' + e.videoId, passos: e.exec }];
    }
    case 'consultar_horarios_academia': {
      const itens = agruparHorarios(r.horarios);
      if (r.ocupacao?.pico?.length) itens.push({ titulo: 'Mais cheio', detalhe: r.ocupacao.pico.join(' · ') });
      if (r.ocupacao?.tranquilo?.length) itens.push({ titulo: 'Mais tranquilo', detalhe: r.ocupacao.tranquilo.join(' · ') });
      return itens.length ? [{ tipo: 'lista', icone: '🕒', titulo: 'Horário da academia', itens }] : [];
    }
    case 'consultar_modalidades':
      return (r.modalidades || []).length
        ? [{ tipo: 'lista', icone: '🥋', titulo: 'Modalidades', itens: r.modalidades.map((m) => ({ titulo: m.nome, detalhe: m.horarios || '', extra: m.descricao || '' })) }]
        : [];
    case 'consultar_rotina_do_dia':
      return r.possuiRotina && (r.exercicios || []).length
        ? [{ tipo: 'lista', icone: '🏋️', titulo: `${r.exercicios[0].titulo_treino || r.nomeRotina || 'Treino'}`, subtitulo: ({ segunda: 'Segunda-feira', terca: 'Terça-feira', quarta: 'Quarta-feira', quinta: 'Quinta-feira', sexta: 'Sexta-feira', sabado: 'Sábado' })[r.diaSemana] || r.diaSemana, itens: r.exercicios.map((x) => ({
            titulo: x.nome,
            detalhe: `${x.series} x ${x.repeticoes}${x.carga_sugerida ? ` · ${x.carga_sugerida} kg` : ''}`,
            extra: x.grupo_muscular || '',
          })) }]
        : [];
    case 'consultar_disponibilidade_aulas':
      return Array.isArray(r) && r.length
        ? [{ tipo: 'lista', icone: '📅', titulo: 'Horários com vaga', itens: r.map((b) => ({ titulo: `${hhmm(b.hora_inicio)} às ${hhmm(b.hora_fim)}`, detalhe: `${b.vagas_restantes} vaga(s)` })) }]
        : [];
    default:
      return [];
  }
}

module.exports = {
  geminiFunctionDeclarations,
  executarFerramenta,
  montarCartoes,
};

