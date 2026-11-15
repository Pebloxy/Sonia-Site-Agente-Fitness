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
  matricula: '1001', nome: 'Lucas Almeida', idade: 24, pesoKg: 78, alturaM: 1.78,
  nivel: 'intermediário', objetivo: 'ganho de massa muscular', tempoDeTreino: '1 ano e 3 meses',
  instrutor: 'Carla Mendes',
};

// ---------- exercícios (os links de vídeo são buscas no YouTube: troquem por vídeos escolhidos pelo grupo;
//            se preencherem "videoId" com o código de um vídeo, ele passa a aparecer dentro do chat) ----------
const yt = (q) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);
const EXERCICIOS = [
  { nome: 'Supino reto', series: '4x10', musculo: 'peitoral', execucao: 'Deite no banco com os pés firmes no chão, segure a barra um pouco mais aberta que os ombros, desça até tocar de leve o peito e empurre sem tirar as costas do banco.', videoId: null, busca: 'supino reto execução correta' },
  { nome: 'Crucifixo', series: '3x12', musculo: 'peitoral', execucao: 'Com cotovelos levemente flexionados, abra os braços até sentir o peitoral alongar e volte como se abraçasse uma árvore.', videoId: null, busca: 'crucifixo halteres execução correta' },
  { nome: 'Tríceps testa', series: '3x12', musculo: 'tríceps', execucao: 'Deitado, mantenha os cotovelos fixos apontando para o teto e flexione só o antebraço, levando a barra em direção à testa.', videoId: null, busca: 'tríceps testa execução correta' },
  { nome: 'Puxada frontal', series: '4x10', musculo: 'costas', execucao: 'Segure a barra aberta, peito aberto, e puxe até a altura do queixo levando os cotovelos para baixo e para trás.', videoId: null, busca: 'puxada frontal execução correta' },
  { nome: 'Remada curvada', series: '4x10', musculo: 'costas', execucao: 'Com o tronco inclinado e a coluna neutra, puxe a barra em direção ao abdômen, sem balançar o corpo.', videoId: null, busca: 'remada curvada execução correta' },
  { nome: 'Rosca direta', series: '3x12', musculo: 'bíceps', execucao: 'Cotovelos colados ao corpo, suba a barra sem balançar o tronco e desça devagar.', videoId: null, busca: 'rosca direta execução correta' },
  { nome: 'Agachamento livre', series: '4x10', musculo: 'pernas', execucao: 'Pés na largura dos ombros, joelhos alinhados com a ponta dos pés, desça com o quadril para trás mantendo a coluna reta e suba empurrando o chão.', videoId: null, busca: 'agachamento livre execução correta' },
  { nome: 'Leg press', series: '4x12', musculo: 'pernas', execucao: 'Costas apoiadas, pés na largura dos ombros, desça até cerca de 90 graus nos joelhos e empurre sem travar os joelhos no final.', videoId: null, busca: 'leg press execução correta' },
  { nome: 'Cadeira extensora', series: '3x15', musculo: 'quadríceps', execucao: 'Ajuste o encosto, estenda os joelhos sem travar no final e volte devagar.', videoId: null, busca: 'cadeira extensora execução correta' },
  { nome: 'Desenvolvimento com halteres', series: '4x10', musculo: 'ombros', execucao: 'Sentado, empurre os halteres acima da cabeça sem arquear a lombar e desça até a altura das orelhas.', videoId: null, busca: 'desenvolvimento ombro halteres execução correta' },
  { nome: 'Elevação lateral', series: '3x15', musculo: 'ombros', execucao: 'Com leve flexão de cotovelos, suba os halteres até a altura dos ombros, sem impulso.', videoId: null, busca: 'elevação lateral execução correta' },
  { nome: 'Prancha abdominal', series: '3x40s', musculo: 'abdômen', execucao: 'Apoie antebraços e pontas dos pés, corpo em linha reta, abdômen contraído, sem deixar o quadril cair.', videoId: null, busca: 'prancha abdominal execução correta' },
  { nome: 'Alongamento geral', series: '10 min', musculo: 'corpo todo', execucao: 'Segure cada alongamento por 20 a 30 segundos, sem dor e respirando devagar.', videoId: null, busca: 'alongamento pós treino' },
];
const exerc = (n) => EXERCICIOS.find((e) => e.nome === n);

// ---------- rotina cadastrada pelo instrutor (a Sonia só consulta, RN08) ----------
const ROTINA = {
  1: { treino: 'Treino A – Peito e tríceps', itens: ['Supino reto', 'Crucifixo', 'Tríceps testa', 'Prancha abdominal'] },
  2: { treino: 'Treino B – Costas e bíceps', itens: ['Puxada frontal', 'Remada curvada', 'Rosca direta'] },
  3: { treino: 'Treino C – Pernas', itens: ['Agachamento livre', 'Leg press', 'Cadeira extensora'] },
  4: { treino: 'Treino D – Ombros e abdômen', itens: ['Desenvolvimento com halteres', 'Elevação lateral', 'Prancha abdominal'] },
  5: { treino: 'Treino E – Corpo todo (leve)', itens: ['Agachamento livre', 'Supino reto', 'Puxada frontal', 'Alongamento geral'] },
  6: { treino: 'Treino F – Alongamento e mobilidade', itens: ['Alongamento geral'] },
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
