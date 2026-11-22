// Dados FICTÍCIOS de demonstração da academia (em memória: voltam ao início quando o servidor reinicia).
const TZ = 'America/Sao_Paulo';
const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const CAPACIDADE = 3;          // RN02: no máximo 3 alunos por bloco de 1 hora
const MIN_CANCELAR = 120;      // RN04: cancelar/reagendar com pelo menos 2 horas de antecedência
const TOLERANCIA_CHECKIN = 10; // RN06: 10 minutos depois do início

// ---------- relógio (DEMO_NOW="2026-11-12 18:00" fixa a hora, útil para testes) ----------
function agora() {
  const s = process.env.DEMO_NOW || new Date().toLocaleString('sv-SE', { timeZone: TZ }); // "2026-11-12 18:00:05"
  const [date, time] = s.split(' ');
  const [h, m] = time.split(':').map(Number);
  return { date, time: time.slice(0, 5), minutos: h * 60 + m, dia: diaSemana(date) };
}
const diaSemana = (date) => new Date(date + 'T12:00:00Z').getUTCDay();
function somaDias(date, n) { const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
const minutosDe = (hora) => { const [h, m] = hora.split(':').map(Number); return h * 60 + m; };
const dataBR = (date) => date.split('-').reverse().join('/');
const nomeDia = (date) => DIAS[diaSemana(date)];

// ---------- horários da academia ----------
const FUNCIONAMENTO = { // dia da semana -> [primeiro bloco, último bloco] (hora de início)
  1: [6, 21], 2: [6, 21], 3: [6, 21], 4: [6, 21], 5: [6, 21], 6: [8, 13],
};
function blocosDoDia(date) {
  const f = FUNCIONAMENTO[diaSemana(date)];
  if (!f) return [];
  const out = [];
  for (let h = f[0]; h <= f[1]; h++) out.push(String(h).padStart(2, '0') + ':00');
  return out;
}

// ---------- aluno de demonstração ----------
const ALUNO = {
  matricula: '12345678912', nome: 'Pedro Gabriel', idade: 23, pesoKg: 77.5, alturaM: 1.78,
  nivel: 'intermediário', objetivo: 'hipertrofia e ganho de massa', tempoDeTreino: '1 ano e 6 meses',
  instrutor: 'Carla Mendes',
};

// ---------- exercícios (os links de vídeo são buscas no YouTube: troquem por vídeos escolhidos pelo grupo;
//            se preencherem "videoId" com o código de um vídeo, ele passa a aparecer dentro do chat) ----------
const yt = (q) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);
const EXERCICIOS = [
  // Perna
  { nome: 'Agachamento livre', series: '4x10', musculo: 'pernas', execucao: 'Pés na largura dos ombros, joelhos alinhados com a ponta dos pés, desça com o quadril para trás mantendo a coluna reta e suba empurrando o chão.', videoId: 'rM6SDUdl9fs', busca: 'agachamento livre execução correta' },
  { nome: 'Leg press', series: '4x12', musculo: 'pernas', execucao: 'Costas apoiadas, pés na largura dos ombros, desça até cerca de 90 graus nos joelhos e empurre sem travar os joelhos no final.', videoId: 'itJDw9I1qu4', busca: 'leg press execução correta' },
  { nome: 'Cadeira extensora', series: '3x12', musculo: 'quadríceps', execucao: 'Ajuste o encosto, estenda os joelhos sem travar no final e volte devagar.', videoId: 'RHgqvYAed_8', busca: 'cadeira extensora execução correta' },
  { nome: 'Mesa flexora', series: '3x12', musculo: 'posterior de coxa', execucao: 'Deitado de bruços, flexione as pernas trazendo os calcanhares em direção aos glúteos de forma controlada.', videoId: 'FpC9Q7vXyX4', busca: 'mesa flexora execução correta' },
  { nome: 'Panturrilha em pé', series: '4x15', musculo: 'panturrilhas', execucao: 'Suba na ponta dos pés estendendo ao máximo e desça alongando a musculatura abaixo da linha do degrau.', videoId: '3UWi44TX6kA', busca: 'panturrilha em pé execução correta' },

  // Costas e Bíceps
  { nome: 'Puxada frontal', series: '4x10', musculo: 'costas', execucao: 'Segure a barra aberta, peito aberto, e puxe até a altura do queixo levando os cotovelos para baixo e para trás.', videoId: 'ScK9NUack_k', busca: 'puxada frontal execução correta' },
  { nome: 'Remada curvada', series: '4x10', musculo: 'costas', execucao: 'Com o tronco inclinado e a coluna neutra, puxe a barra em direção ao abdômen, sem balançar o corpo.', videoId: 'VJHBEy2duVc', busca: 'remada curvada execução correta' },
  { nome: 'Remada baixa', series: '3x12', musculo: 'costas', execucao: 'Sentado no cabo com a coluna ereta, puxe o pegador triângulo em direção ao abdômen contraindo as escápulas.', videoId: 'GZbfZ033fBQ', busca: 'remada baixa triângulo execução' },
  { nome: 'Rosca direta', series: '3x10', musculo: 'bíceps', execucao: 'Cotovelos colados ao corpo, suba a barra sem balançar o tronco e desça devagar.', videoId: 'n158HS07tOE', busca: 'rosca direta execução correta' },
  { nome: 'Rosca martelo', series: '3x12', musculo: 'bíceps', execucao: 'Com pegada neutra (palmas viradas uma para a outra), flexione os cotovelos mantendo os braços firmes.', videoId: 'TwD-YGVP4Bk', busca: 'rosca martelo com halteres execução' },

  // Peito e Tríceps
  { nome: 'Supino reto', series: '4x10', musculo: 'peitoral', execucao: 'Deite no banco com os pés firmes no chão, segure a barra um pouco mais aberta que os ombros, desça até tocar de leve o peito e empurre sem tirar as costas do banco.', videoId: 'vIGvt-vgrvY', busca: 'supino reto execução correta' },
  { nome: 'Supino inclinado', series: '4x10', musculo: 'peitoral superior', execucao: 'No banco a 30-45 graus, empurre os halteres ou barra para cima estendendo os braços e desça controlando.', videoId: '0G2_XV7slIg', busca: 'supino inclinado halteres execução' },
  { nome: 'Crucifixo', series: '3x12', musculo: 'peitoral', execucao: 'Com cotovelos levemente flexionados, abra os braços até sentir o peitoral alongar e volte como se abraçasse uma árvore.', videoId: 'ohTfwQvg5u0', busca: 'crucifixo halteres execução correta' },
  { nome: 'Tríceps testa', series: '3x12', musculo: 'tríceps', execucao: 'Deitado, mantenha os cotovelos fixos apontando para o teto e flexione só o antebraço, levando a barra em direção à testa.', videoId: 'VakpIeaaeXA', busca: 'tríceps testa execução correta' },
  { nome: 'Tríceps pulley', series: '3x12', musculo: 'tríceps', execucao: 'Na polia alta com corda ou barra reta, estenda os antebraços para baixo até a contração máxima do tríceps.', videoId: '2-LAMcpzODU', busca: 'tríceps pulley corda execução' },

  // Outros
  { nome: 'Desenvolvimento com halteres', series: '4x10', musculo: 'ombros', execucao: 'Sentado, empurre os halteres acima da cabeça sem arquear a lombar e desça até a altura das orelhas.', videoId: 'eufDL9MmF8A', busca: 'desenvolvimento ombro halteres execução correta' },
  { nome: 'Elevação lateral', series: '3x15', musculo: 'ombros', execucao: 'Com leve flexão de cotovelos, suba os halteres até a altura dos ombros, sem impulso.', videoId: 'U_T4z45fhLw', busca: 'elevação lateral execução correta' },
  { nome: 'Prancha abdominal', series: '3x40s', musculo: 'abdômen', execucao: 'Apoie antebraços e pontas dos pés, corpo em linha reta, abdômen contraído, sem deixar o quadril cair.', videoId: '9dn5Fb3cSoE', busca: 'prancha abdominal execução correta' },
  { nome: 'Alongamento geral', series: '10 min', musculo: 'corpo todo', execucao: 'Segure cada alongamento por 20 a 30 segundos, sem dor e respirando devagar.', videoId: 'w4LCsSxB-SQ', busca: 'alongamento pós treino' },
];
const exerc = (n) => EXERCICIOS.find((e) => e.nome === n);

// ---------- rotina cadastrada pelo instrutor (a Sonia só consulta, RN08) ----------
const ROTINA = {
  1: { treino: 'Treino A – Perna', itens: ['Agachamento livre', 'Leg press', 'Cadeira extensora', 'Mesa flexora', 'Panturrilha em pé'] },
  2: { treino: 'Treino B – Costas e bíceps', itens: ['Puxada frontal', 'Remada curvada', 'Remada baixa', 'Rosca direta', 'Rosca martelo'] },
  3: { treino: 'Treino C – Peito e tríceps', itens: ['Supino reto', 'Supino inclinado', 'Crucifixo', 'Tríceps testa', 'Tríceps pulley'] },
  4: { treino: 'Treino A – Perna', itens: ['Agachamento livre', 'Leg press', 'Cadeira extensora', 'Mesa flexora', 'Panturrilha em pé'] },
  5: { treino: 'Treino B – Costas e bíceps', itens: ['Puxada frontal', 'Remada curvada', 'Remada baixa', 'Rosca direta', 'Rosca martelo'] },
  6: { treino: 'Treino C – Peito e tríceps', itens: ['Supino reto', 'Supino inclinado', 'Crucifixo', 'Tríceps testa', 'Tríceps pulley'] },
};

const ACADEMIA = {
  nome: 'Academia (demonstração)',
  funcionamento: 'segunda a sexta, das 6h às 22h; sábado, das 8h às 14h; domingo fechado',
  endereco: 'Rua Exemplo, 123 – São Paulo/SP (endereço fictício)',
  contato: 'Recepção: (11) 4000-0000 (número fictício)',
  instrutores: ['Carla Mendes', 'Rafael Souza'],
  modalidades: [
    { nome: 'Musculação', horarios: 'todos os dias de funcionamento' },
    { nome: 'Pilates', horarios: 'segundas e quartas, às 8h' },
    { nome: 'Dança', horarios: 'terças e quintas, às 19h' },
    { nome: 'Muay Thai', horarios: 'segundas, quartas e sextas, às 20h' },
  ],
};

// ---------- agendamentos (inicia com outros alunos fictícios para mostrar blocos cheios) ----------
let seq = 1;
const agendamentos = [];
function novoAgendamento(a) { const r = { id: seq++, status: 'agendado', ...a }; agendamentos.push(r); return r; }
function semear() {
  agendamentos.length = 0; seq = 1;
  const outros = ['Marina Costa', 'Bruno Lima', 'Camila Rocha', 'Diego Martins', 'Fernanda Alves'];
  const hoje = agora().date;
  let dias = 0;
  for (let i = 0; i <= 6 && dias < 3; i++) {
    const d = somaDias(hoje, i);
    if (!blocosDoDia(d).length) continue;
    dias++;
    const f = FUNCIONAMENTO[diaSemana(d)];
    const noite = blocosDoDia(d).includes('18:00') ? '18:00' : blocosDoDia(d)[Math.min(2, blocosDoDia(d).length - 1)];
    [0, 1, 2].forEach((k) => novoAgendamento({ matricula: 'x' + k, nome: outros[k], date: d, hora: noite }));              // bloco cheio
    const n2 = blocosDoDia(d).includes('19:00') ? '19:00' : blocosDoDia(d)[Math.min(3, blocosDoDia(d).length - 1)];
    [3, 4].forEach((k) => novoAgendamento({ matricula: 'x' + k, nome: outros[k], date: d, hora: n2 }));                    // 2 de 3 vagas
  }
}
semear();

const ocupadas = (date, hora) => agendamentos.filter((a) => a.date === date && a.hora === hora && (a.status === 'agendado' || a.status === 'presente')).length;

module.exports = {
  TZ, DIAS, CAPACIDADE, MIN_CANCELAR, TOLERANCIA_CHECKIN, agora, somaDias, minutosDe, dataBR, nomeDia, diaSemana,
  blocosDoDia, ALUNO, EXERCICIOS, exerc, ROTINA, ACADEMIA, agendamentos, novoAgendamento, ocupadas, semear, yt,
};
