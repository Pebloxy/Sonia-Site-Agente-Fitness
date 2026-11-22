// src/demo/treinos.demo.js
// Rotina e exercícios de DEMONSTRAÇÃO (usados quando o banco de dados não está disponível).
// Os vídeos são aulas do YouTube. Para trocar um vídeo, mude o "videoId" (o código depois de "watch?v=").

const sem = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const yt = (q) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);

const EXERCICIOS = [
  // Perna
  { id: 1, nome: 'Agachamento livre', grupo: 'Pernas', videoId: 'rM6SDUdl9fs', desc: 'O rei dos exercícios de perna e glúteo.',
    exec: 'Pés na largura dos ombros, peito aberto, joelhos alinhados com a ponta dos pés. Jogue o quadril para trás como se fosse sentar, desça mantendo a coluna reta e suba empurrando o chão.' },
  { id: 2, nome: 'Leg Press', grupo: 'Pernas', videoId: 'itJDw9I1qu4', desc: 'Fortalece quadríceps e glúteos com apoio nas costas.',
    exec: 'Costas apoiadas, pés na largura dos ombros, desça até cerca de 90 graus nos joelhos e empurre sem travar os joelhos no final.' },
  { id: 3, nome: 'Cadeira extensora', grupo: 'Quadríceps', videoId: 'RHgqvYAed_8', desc: 'Isolamento do quadríceps na máquina.',
    exec: 'Ajuste o encosto, estenda os joelhos sem travar no final e volte devagar com controle.' },
  { id: 4, nome: 'Mesa flexora', grupo: 'Posterior de Coxa', videoId: 'FpC9Q7vXyX4', desc: 'Isolamento dos isquiotibiais (posterior da coxa).',
    exec: 'Deite de bruços na máquina com os calcanhares sob o rolo. Flexione os joelhos trazendo os calcanhares em direção aos glúteos.' },
  { id: 5, nome: 'Panturrilha em pé', grupo: 'Panturrilhas', videoId: '3UWi44TX6kA', desc: 'Fortalecimento completo dos gastrocnêmios e sóleo.',
    exec: 'Apoie a ponta dos pés no degrau, eleve o corpo ao ponto máximo de contração e desça alongando a musculatura.' },

  // Costas e Bíceps
  { id: 6, nome: 'Puxada frontal', grupo: 'Costas', videoId: 'ScK9NUack_k', desc: 'Trabalha o latíssimo do dorso e o bíceps.',
    exec: 'Segure a barra aberta, peito aberto, e puxe até a altura do queixo levando os cotovelos para baixo e para trás.' },
  { id: 7, nome: 'Remada curvada', grupo: 'Costas', videoId: 'VJHBEy2duVc', desc: 'Fortalece a musculatura dorsal em profundidade.',
    exec: 'Com o tronco inclinado a 45° e coluna neutra, puxe a barra em direção ao abdômen com as escápulas aduzidas.' },
  { id: 8, nome: 'Remada baixa', grupo: 'Costas', videoId: 'GZbfZ033fBQ', desc: 'Exercício no cabo que trabalha o meio das costas e trapézio.',
    exec: 'Sentado com postura ereta, puxe o triângulo até a região da cintura aproximando as escápulas.' },
  { id: 9, nome: 'Rosca direta', grupo: 'Bíceps', videoId: 'n158HS07tOE', desc: 'Exercício clássico para desenvolvimento dos bíceps.',
    exec: 'Cotovelos fixos ao lado do corpo, suba a barra até os ombros e desça de forma lenta e controlada.' },
  { id: 10, nome: 'Rosca martelo', grupo: 'Bíceps e Antebraço', videoId: 'TwD-YGVP4Bk', desc: 'Trabalha bíceps braquial e braquiorradial com pegada neutra.',
    exec: 'Com halteres e palmas viradas uma para a outra, flexione os cotovelos sem girar o punho.' },

  // Peito e Tríceps
  { id: 11, nome: 'Supino reto', grupo: 'Peito', videoId: 'vIGvt-vgrvY', desc: 'Desenvolve peitoral maior, ombros anteriores e tríceps.',
    exec: 'Deite no banco com pés firmes, segure a barra um pouco além da largura dos ombros, desça ao peito e empurre.' },
  { id: 12, nome: 'Supino inclinado', grupo: 'Peito Superior', videoId: '0G2_XV7slIg', desc: 'Foco na porção clavicular do peitoral maior.',
    exec: 'Ajuste o banco em 30-45 graus. Empurre os halteres para cima e retorne controlando a descida.' },
  { id: 13, nome: 'Crucifixo', grupo: 'Peito', videoId: 'ohTfwQvg5u0', desc: 'Isola e promove grande alongamento das fibras do peitoral.',
    exec: 'Com os cotovelos levemente flexionados, abra os braços até sentir o alongamento e feche em arco.' },
  { id: 14, nome: 'Tríceps testa', grupo: 'Tríceps', videoId: 'VakpIeaaeXA', desc: 'Foco na cabeça longa do tríceps braquial.',
    exec: 'Deitado, mantenha os cotovelos fixos apontando para cima e desça a barra até próximo da testa.' },
  { id: 15, nome: 'Tríceps pulley', grupo: 'Tríceps', videoId: '2-LAMcpzODU', desc: 'Isolamento no cabo com contração contínua.',
    exec: 'De frente para a polia alta, empurre a corda ou barra para baixo até estender totalmente os cotovelos.' },
];
const porNome = (n) => EXERCICIOS.find((e) => e.nome.toLowerCase() === n.toLowerCase());

// Rotina cadastrada pelo instrutor: dia -> [Título, [[exercício, séries, repetições, carga (kg)]]]
const SEMANA = {
  segunda: ['Treino A – Perna', [
    ['Agachamento livre', 4, 10, 60],
    ['Leg Press', 4, 12, 160],
    ['Cadeira extensora', 3, 12, 45],
    ['Mesa flexora', 3, 12, 35],
    ['Panturrilha em pé', 4, 15, 70],
  ]],
  terca: ['Treino B – Costas e Bíceps', [
    ['Puxada frontal', 4, 10, 50],
    ['Remada curvada', 4, 10, 40],
    ['Remada baixa', 3, 12, 45],
    ['Rosca direta', 3, 10, 22],
    ['Rosca martelo', 3, 12, 14],
  ]],
  quarta: ['Treino C – Peito e Tríceps', [
    ['Supino reto', 4, 10, 50],
    ['Supino inclinado', 4, 10, 40],
    ['Crucifixo', 3, 12, 14],
    ['Tríceps testa', 3, 12, 20],
    ['Tríceps pulley', 3, 12, 25],
  ]],
  quinta: ['Treino A – Perna', [
    ['Agachamento livre', 4, 10, 60],
    ['Leg Press', 4, 12, 160],
    ['Cadeira extensora', 3, 12, 45],
    ['Mesa flexora', 3, 12, 35],
    ['Panturrilha em pé', 4, 15, 70],
  ]],
  sexta: ['Treino B – Costas e Bíceps', [
    ['Puxada frontal', 4, 10, 50],
    ['Remada curvada', 4, 10, 40],
    ['Remada baixa', 3, 12, 45],
    ['Rosca direta', 3, 10, 22],
    ['Rosca martelo', 3, 12, 14],
  ]],
  sabado: ['Treino C – Peito e Tríceps', [
    ['Supino reto', 4, 10, 50],
    ['Supino inclinado', 4, 10, 40],
    ['Crucifixo', 3, 12, 14],
    ['Tríceps testa', 3, 12, 20],
    ['Tríceps pulley', 3, 12, 25],
  ]],
  domingo: ['Treino A – Perna (Opcional)', [
    ['Agachamento livre', 4, 10, 60],
    ['Leg Press', 4, 12, 160],
    ['Cadeira extensora', 3, 12, 45],
    ['Mesa flexora', 3, 12, 35],
    ['Panturrilha em pé', 4, 15, 70],
  ]],
};

const rotinaAtiva = () => ({ id: 1, aluno_id: null, nome: 'Divisão ABC – Pedro Gabriel', ativa: 1 });

function exerciciosDoDia(dia) {
  const dias = dia ? [dia] : Object.keys(SEMANA);
  const out = [];
  for (const d of dias) {
    const s = SEMANA[d];
    if (!s) continue;
    s[1].forEach(([nome, series, reps, carga], i) => {
      const e = porNome(nome);
      out.push({
        id: out.length + 1, rotina_id: 1, series, repeticoes: reps, carga_sugerida: carga, ordem: i + 1,
        dia_semana: d, etapa: e.nome === 'Alongamento geral' ? 'alongamento' : (i === 0 ? 'principal' : 'secundario'),
        exercicio_id: e.id, nome: e.nome, grupo_muscular: e.grupo, descricao: e.desc, instrucoes_execucao: e.exec,
        titulo_treino: s[0],
      });
    });
  }
  return out;
}

const exercicioPorId = (id) => {
  const e = EXERCICIOS.find((x) => x.id === Number(id));
  return e ? { id: e.id, nome: e.nome, grupo_muscular: e.grupo, descricao: e.desc, instrucoes_execucao: e.exec } : null;
};

// Procura um exercício pelo nome que o aluno falou (sem acento, "agachamento" acha "Agachamento livre")
function buscarExercicio(nome) {
  const q = sem(nome);
  if (!q) return null;
  return EXERCICIOS.find((e) => sem(e.nome) === q)
    || EXERCICIOS.find((e) => sem(e.nome).includes(q) || q.includes(sem(e.nome)))
    || EXERCICIOS.find((e) => q.split(/\s+/).some((p) => p.length > 3 && sem(e.nome).includes(p)))
    || null;
}

const videoDoExercicio = (id) => {
  const e = EXERCICIOS.find((x) => x.id === Number(id));
  return e ? { titulo: 'Como fazer ' + e.nome.toLowerCase(), url: 'https://www.youtube.com/watch?v=' + e.videoId, fonte: 'YouTube' } : null;
};

const nomesExercicios = () => EXERCICIOS.map((e) => e.nome);

function obterFichas() {
  return [
    {
      id: 'perna',
      titulo: 'Perna',
      icone: '🦵',
      dias: 'Segunda e Quinta',
      exercicios: [
        { nome: 'Agachamento livre', series: 4, repeticoes: 10, carga_sugerida: 60, grupo_muscular: 'Pernas', etapa: 'principal' },
        { nome: 'Leg Press', series: 4, repeticoes: 12, carga_sugerida: 160, grupo_muscular: 'Pernas', etapa: 'principal' },
        { nome: 'Cadeira extensora', series: 3, repeticoes: 12, carga_sugerida: 45, grupo_muscular: 'Quadríceps', etapa: 'secundario' },
        { nome: 'Mesa flexora', series: 3, repeticoes: 12, carga_sugerida: 35, grupo_muscular: 'Posterior de Coxa', etapa: 'secundario' },
        { nome: 'Panturrilha em pé', series: 4, repeticoes: 15, carga_sugerida: 70, grupo_muscular: 'Panturrilhas', etapa: 'secundario' },
      ],
    },
    {
      id: 'costas_biceps',
      titulo: 'Costas e Bíceps',
      icone: '🦾',
      dias: 'Terça e Sexta',
      exercicios: [
        { nome: 'Puxada frontal', series: 4, repeticoes: 10, carga_sugerida: 50, grupo_muscular: 'Costas', etapa: 'principal' },
        { nome: 'Remada curvada', series: 4, repeticoes: 10, carga_sugerida: 40, grupo_muscular: 'Costas', etapa: 'principal' },
        { nome: 'Remada baixa', series: 3, repeticoes: 12, carga_sugerida: 45, grupo_muscular: 'Costas', etapa: 'secundario' },
        { nome: 'Rosca direta', series: 3, repeticoes: 10, carga_sugerida: 22, grupo_muscular: 'Bíceps', etapa: 'secundario' },
        { nome: 'Rosca martelo', series: 3, repeticoes: 12, carga_sugerida: 14, grupo_muscular: 'Bíceps e Antebraço', etapa: 'secundario' },
      ],
    },
    {
      id: 'peito_triceps',
      titulo: 'Peito e Tríceps',
      icone: '🏋️',
      dias: 'Quarta e Sábado',
      exercicios: [
        { nome: 'Supino reto', series: 4, repeticoes: 10, carga_sugerida: 50, grupo_muscular: 'Peito', etapa: 'principal' },
        { nome: 'Supino inclinado', series: 4, repeticoes: 10, carga_sugerida: 40, grupo_muscular: 'Peito Superior', etapa: 'principal' },
        { nome: 'Crucifixo', series: 3, repeticoes: 12, carga_sugerida: 14, grupo_muscular: 'Peito', etapa: 'secundario' },
        { nome: 'Tríceps testa', series: 3, repeticoes: 12, carga_sugerida: 20, grupo_muscular: 'Tríceps', etapa: 'secundario' },
        { nome: 'Tríceps pulley', series: 3, repeticoes: 12, carga_sugerida: 25, grupo_muscular: 'Tríceps', etapa: 'secundario' },
      ],
    },
  ];
}

module.exports = { rotinaAtiva, exerciciosDoDia, exercicioPorId, buscarExercicio, videoDoExercicio, nomesExercicios, obterFichas, yt };
