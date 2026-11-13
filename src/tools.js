// Ferramentas que a Sonia pode usar (function calling do Gemini). As regras de negócio ficam AQUI, no código,
// e não só no texto do prompt: assim a Sonia não consegue "furar" os limites.
const D = require('./data.js');

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const okData = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !isNaN(new Date(s + 'T12:00:00Z'));
const okHora = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s || '');
const inicioEmMin = (date, hora) => { // minutos entre agora e o início do bloco (negativo = já passou)
  const n = D.agora();
  const dias = Math.round((new Date(date + 'T12:00:00Z') - new Date(n.date + 'T12:00:00Z')) / 86400000);
  return dias * 1440 + D.minutosDe(hora) - n.minutos;
};
const rotulo = (a) => `${D.nomeDia(a.date)}, ${D.dataBR(a.date)}, ${a.hora} às ${String(D.minutosDe(a.hora) / 60 + 1).padStart(2, '0')}:00`;
const meus = () => D.agendamentos.filter((a) => a.matricula === D.ALUNO.matricula);
const ativoMeu = (date, hora) => meus().find((a) => a.date === date && a.hora === hora && a.status === 'agendado');
const livres = (date) => D.blocosDoDia(date)
  .map((h) => ({ hora: h, vagas: D.CAPACIDADE - D.ocupadas(date, h) }))
  .filter((b) => b.vagas > 0 && inicioEmMin(date, b.hora) > 0);
const falha = (mensagem, extra = {}) => ({ result: { ok: false, mensagem, ...extra }, cards: [] });
const card = (tipo, titulo, linhas, extra = {}) => ({ tipo, titulo, linhas, ...extra });
const validar = (date, hora) => {
  if (!okData(date)) return 'A data precisa estar no formato AAAA-MM-DD.';
  if (!okHora(hora)) return 'A hora precisa estar no formato HH:MM.';
  if (!D.blocosDoDia(date).includes(hora)) return `Não há aula nesse horário: ${D.nomeDia(date)}, ${D.dataBR(date)}, ${hora}. Funcionamento: ${D.ACADEMIA.funcionamento}. Os blocos começam em hora cheia.`;
  return null;
};

const impl = {
  consultar_rotina({ dia } = {}) {
    const n = D.agora();
    let idx = n.dia, ref = n.date;
    const d = semAcento(dia);
    if (okData(dia)) { idx = D.diaSemana(dia); ref = dia; }
    else if (d && d !== 'hoje') {
      if (d === 'amanha') { ref = D.somaDias(n.date, 1); idx = D.diaSemana(ref); }
      else { const i = D.DIAS.findIndex((x) => semAcento(x).startsWith(d.replace('-feira', ''))); if (i >= 0) idx = i; }
    }
    const r = D.ROTINA[idx];
    if (!r) return { result: { ok: true, dia: D.DIAS[idx], mensagem: 'Dia de descanso: não há treino cadastrado pelo instrutor.' }, cards: [card('rotina', `${D.DIAS[idx]} – descanso`, ['Sem treino cadastrado pelo instrutor.'])] };
    const itens = r.itens.map((n2) => { const e = D.exerc(n2); return { exercicio: n2, series: e.series, musculo: e.musculo }; });
    return {
      result: { ok: true, dia: D.DIAS[idx], treino: r.treino, exercicios: itens, instrutor: D.ALUNO.instrutor },
      cards: [card('rotina', `${r.treino} (${D.DIAS[idx]})`, itens.map((i) => `${i.exercicio} – ${i.series}`))],
    };
  },

  mostrar_video({ exercicio } = {}) {
    const q = semAcento(exercicio);
    const e = D.EXERCICIOS.find((x) => semAcento(x.nome) === q) || D.EXERCICIOS.find((x) => semAcento(x.nome).includes(q) || q.includes(semAcento(x.nome)));
    if (!q || !e) return falha('Esse exercício não está no catálogo da academia.', { exercicios_disponiveis: D.EXERCICIOS.map((x) => x.nome) });
    const link = { texto: '▶ Ver vídeo no YouTube', url: D.yt(e.busca) };
    return {
      result: { ok: true, exercicio: e.nome, series: e.series, musculo: e.musculo, como_executar: e.execucao, video: 'exibido ao aluno no chat' },
      cards: [card('video', e.nome, [`${e.series} · ${e.musculo}`], e.videoId ? { embed: e.videoId } : { link })],
    };
  },

  horarios_disponiveis({ data } = {}) {
    if (!okData(data)) return falha('A data precisa estar no formato AAAA-MM-DD.');
    if (!D.blocosDoDia(data).length) return falha(`A academia não abre ${D.nomeDia(data)}, ${D.dataBR(data)}. Funcionamento: ${D.ACADEMIA.funcionamento}.`);
    const l = livres(data);
    const cheios = D.blocosDoDia(data).filter((h) => D.ocupadas(data, h) >= D.CAPACIDADE && inicioEmMin(data, h) > 0);
    return {
      result: { ok: true, data, dia: D.nomeDia(data), horarios_com_vaga: l, horarios_cheios: cheios },
      cards: [card('horarios', `Horários de ${D.nomeDia(data)}, ${D.dataBR(data)}`, l.length ? l.map((b) => `${b.hora} – ${b.vagas} ${b.vagas === 1 ? 'vaga' : 'vagas'}`) : ['Sem horários livres neste dia.'])],
    };
  },

  agendar_aula({ data, hora } = {}) {
    const erro = validar(data, hora); if (erro) return falha(erro);
    if (inicioEmMin(data, hora) <= 0) return falha('Esse horário já passou. Escolha um horário futuro.');
    if (ativoMeu(data, hora)) return falha('O aluno já tem uma aula agendada nesse mesmo dia e horário (RN03).');
    if (D.ocupadas(data, hora) >= D.CAPACIDADE) return falha('Esse bloco está cheio (máximo de 3 alunos por bloco de 1 hora).', { horarios_com_vaga_no_dia: livres(data) });
    const a = D.novoAgendamento({ matricula: D.ALUNO.matricula, nome: D.ALUNO.nome, date: data, hora });
    return { result: { ok: true, mensagem: 'Aula agendada.', agendamento: rotulo(a) }, cards: [card('agendamento', 'Aula agendada ✅', [rotulo(a), `Instrutor: ${D.ALUNO.instrutor}`, 'Aviso 10 minutos antes do treino.'])] };
  },

  meus_agendamentos() {
    const l = meus().filter((a) => a.status === 'agendado' && inicioEmMin(a.date, a.hora) > -D.TOLERANCIA_CHECKIN)
      .sort((a, b) => (a.date + a.hora).localeCompare(b.date + b.hora));
    return { result: { ok: true, agendamentos: l.map(rotulo) }, cards: [card('agendamento', 'Suas próximas aulas', l.length ? l.map(rotulo) : ['Nenhuma aula agendada.'])] };
  },

  cancelar_aula({ data, hora } = {}) {
    const erro = validar(data, hora); if (erro) return falha(erro);
    const a = ativoMeu(data, hora);
    if (!a) return falha('O aluno não tem aula agendada nesse dia e horário.', { agendamentos: meus().filter((x) => x.status === 'agendado').map(rotulo) });
    if (inicioEmMin(data, hora) < D.MIN_CANCELAR) return falha('Só é possível cancelar com pelo menos 2 horas de antecedência (RN04).');
    a.status = 'cancelado';
    return { result: { ok: true, mensagem: 'Aula cancelada.', cancelada: rotulo(a) }, cards: [card('agendamento', 'Aula cancelada', [rotulo(a)])] };
  },

  reagendar_aula({ data_atual, hora_atual, nova_data, nova_hora } = {}) {
    const e1 = validar(data_atual, hora_atual); if (e1) return falha(e1);
    const e2 = validar(nova_data, nova_hora); if (e2) return falha(e2);
    const a = ativoMeu(data_atual, hora_atual);
    if (!a) return falha('O aluno não tem aula agendada no horário atual informado.');
    if (inicioEmMin(data_atual, hora_atual) < D.MIN_CANCELAR) return falha('Só é possível reagendar com pelo menos 2 horas de antecedência da aula atual (RN04).');
    if (inicioEmMin(nova_data, nova_hora) <= 0) return falha('O novo horário já passou.');
    if (ativoMeu(nova_data, nova_hora)) return falha('O aluno já tem aula nesse novo horário (RN03).');
    if (D.ocupadas(nova_data, nova_hora) >= D.CAPACIDADE) return falha('O novo bloco está cheio (máximo de 3 alunos).', { horarios_com_vaga_no_dia: livres(nova_data) });
    const antes = rotulo(a); a.date = nova_data; a.hora = nova_hora;
    return { result: { ok: true, mensagem: 'Aula reagendada.', de: antes, para: rotulo(a) }, cards: [card('agendamento', 'Aula reagendada 🔁', [`De: ${antes}`, `Para: ${rotulo(a)}`])] };
  },

  fazer_checkin() {
    const n = D.agora();
    const c = meus().filter((x) => x.status === 'agendado' && x.date === n.date).sort((x, y) => x.hora.localeCompare(y.hora));
    const a = c.find((x) => inicioEmMin(x.date, x.hora) >= -D.TOLERANCIA_CHECKIN) || c[c.length - 1];
    if (!a) return falha('O aluno não tem aula agendada para hoje.');
    if (inicioEmMin(a.date, a.hora) < -D.TOLERANCIA_CHECKIN) {
      a.status = 'falta';
      return { result: { ok: false, mensagem: 'Passaram mais de 10 minutos do início: a vaga foi liberada e a falta foi registrada (RN06).', aula: rotulo(a) }, cards: [card('agendamento', 'Check-in não realizado', [rotulo(a), 'Falta registrada (tolerância de 10 minutos).'])] };
    }
    a.status = 'presente';
    return { result: { ok: true, mensagem: 'Check-in realizado.', aula: rotulo(a) }, cards: [card('agendamento', 'Check-in feito ✅', [rotulo(a)])] };
  },

  informacoes_academia() {
    const A = D.ACADEMIA;
    return {
      result: { ok: true, ...A },
      cards: [card('info', 'Informações da academia', [`Funcionamento: ${A.funcionamento}`, ...A.modalidades.map((m) => `${m.nome}: ${m.horarios}`), A.contato])],
    };
  },

  encaminhar_equipe({ assunto, destino } = {}) {
    if (!assunto) return falha('Faltou informar o assunto.');
    const para = semAcento(destino).startsWith('instrutor') ? 'instrutor' : 'recepção';
    encaminhamentos.push({ quando: D.agora(), de: D.ALUNO.nome, para, assunto });
    return { result: { ok: true, mensagem: `Assunto encaminhado à ${para}.` }, cards: [card('info', `Encaminhado para ${para === 'instrutor' ? 'o instrutor' : 'a recepção'}`, [assunto])] };
  },
};
const encaminhamentos = [];

const S = (description) => ({ type: 'STRING', description });
const declaracoes = [
  { name: 'consultar_rotina', description: 'Mostra o treino cadastrado pelo instrutor para um dia. A Sonia nunca cria nem altera rotinas.', parameters: { type: 'OBJECT', properties: { dia: S('"hoje", "amanhã", nome do dia da semana ou data AAAA-MM-DD. Padrão: hoje.') } } },
  { name: 'mostrar_video', description: 'Mostra o vídeo de demonstração e a explicação de execução de um exercício do catálogo.', parameters: { type: 'OBJECT', properties: { exercicio: S('Nome do exercício, ex.: "agachamento livre".') }, required: ['exercicio'] } },
  { name: 'horarios_disponiveis', description: 'Lista os blocos de 1 hora com vaga em um dia (máximo de 3 alunos por bloco).', parameters: { type: 'OBJECT', properties: { data: S('Data AAAA-MM-DD.') }, required: ['data'] } },
  { name: 'agendar_aula', description: 'Agenda uma aula/treino guiado com o instrutor num bloco de 1 hora. Confirme dia e hora com o aluno antes, se ele não tiver sido claro.', parameters: { type: 'OBJECT', properties: { data: S('Data AAAA-MM-DD.'), hora: S('Hora de início do bloco, HH:MM (hora cheia).') }, required: ['data', 'hora'] } },
  { name: 'meus_agendamentos', description: 'Lista as próximas aulas agendadas do aluno.', parameters: { type: 'OBJECT', properties: {} } },
  { name: 'cancelar_aula', description: 'Cancela uma aula agendada (exige 2 horas de antecedência). Peça confirmação ao aluno antes de cancelar.', parameters: { type: 'OBJECT', properties: { data: S('Data AAAA-MM-DD.'), hora: S('Hora do bloco, HH:MM.') }, required: ['data', 'hora'] } },
  { name: 'reagendar_aula', description: 'Troca uma aula agendada por outro horário (exige 2 horas de antecedência da aula atual). Confirme com o aluno antes.', parameters: { type: 'OBJECT', properties: { data_atual: S('Data atual AAAA-MM-DD.'), hora_atual: S('Hora atual HH:MM.'), nova_data: S('Nova data AAAA-MM-DD.'), nova_hora: S('Nova hora HH:MM.') }, required: ['data_atual', 'hora_atual', 'nova_data', 'nova_hora'] } },
  { name: 'fazer_checkin', description: 'Registra o check-in do aluno na aula de hoje (tolerância de 10 minutos após o início).', parameters: { type: 'OBJECT', properties: {} } },
  { name: 'informacoes_academia', description: 'Horário de funcionamento, modalidades e horários, contato e instrutores.', parameters: { type: 'OBJECT', properties: {} } },
  { name: 'encaminhar_equipe', description: 'Encaminha à recepção ou ao instrutor um assunto específico que a Sonia não resolve (matrícula, cancelamento de plano, dúvida técnica profunda, problema na academia).', parameters: { type: 'OBJECT', properties: { assunto: S('Resumo do assunto.'), destino: S('"recepção" ou "instrutor".') }, required: ['assunto', 'destino'] } },
];

function runTool(name, args) {
  const f = impl[name];
  if (!f) return falha('Ferramenta desconhecida.');
  try { return f(args || {}); } catch (e) { console.error('tool', name, e); return falha('Erro interno ao executar a ferramenta.'); }
}

module.exports = { declaracoes, runTool, encaminhamentos };
