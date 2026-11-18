// src/demo/treinos.demo.js
// Rotina e exercícios de DEMONSTRAÇÃO (usados quando o banco de dados não está disponível).
// Os vídeos são aulas do YouTube. Para trocar um vídeo, mude o "videoId" (o código depois de "watch?v=").

const sem = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const yt = (q) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);

const EXERCICIOS = [
  { id: 1, nome: 'Supino reto', grupo: 'Peito', videoId: 'vIGvt-vgrvY', desc: 'Desenvolve o peitoral, ombros e tríceps.',
    exec: 'Deite no banco com os pés firmes no chão, segure a barra um pouco mais aberta que os ombros, desça até tocar de leve o peito e empurre sem tirar as costas do banco.' },
  { id: 2, nome: 'Crucifixo', grupo: 'Peito', videoId: 'ohTfwQvg5u0', desc: 'Isola e alonga o peitoral.',
    exec: 'Com os cotovelos levemente flexionados, abra os braços até sentir o peitoral alongar e volte como se abraçasse uma árvore.' },
  { id: 3, nome: 'Tríceps testa', grupo: 'Tríceps', videoId: 'VakpIeaaeXA', desc: 'Foco na parte de trás dos braços.',
    exec: 'Deitado, mantenha os cotovelos fixos apontando para o teto e flexione só o antebraço, levando a barra em direção à testa.' },
  { id: 4, nome: 'Puxada frontal', grupo: 'Costas', videoId: 'ScK9NUack_k', desc: 'Trabalha o latíssimo do dorso e o bíceps.',
    exec: 'Segure a barra aberta, peito aberto, e puxe até a altura do queixo levando os cotovelos para baixo e para trás.' },
  { id: 5, nome: 'Remada curvada', grupo: 'Costas', videoId: 'VJHBEy2duVc', desc: 'Fortalece a musculatura das costas.',
    exec: 'Com o tronco inclinado e a coluna neutra, puxe a barra em direção ao abdômen, sem balançar o corpo.' },
  { id: 6, nome: 'Rosca direta', grupo: 'Bíceps', videoId: 'n158HS07tOE', desc: 'Foco no bíceps.',
    exec: 'Cotovelos colados ao corpo, suba a barra sem balançar o tronco e desça devagar.' },
  { id: 7, nome: 'Agachamento livre', grupo: 'Pernas', videoId: 'rM6SDUdl9fs', desc: 'O rei dos exercícios de perna e glúteo.',
    exec: 'Pés na largura dos ombros, peito aberto, joelhos alinhados com a ponta dos pés. Jogue o quadril para trás como se fosse sentar, desça mantendo a coluna reta e suba empurrando o chão.' },
  { id: 8, nome: 'Leg press', grupo: 'Pernas', videoId: 'itJDw9I1qu4', desc: 'Fortalece quadríceps e glúteos com apoio nas costas.',
    exec: 'Costas apoiadas, pés na largura dos ombros, desça até cerca de 90 graus nos joelhos e empurre sem travar os joelhos no final.' },
  { id: 9, nome: 'Cadeira extensora', grupo: 'Quadríceps', videoId: 'RHgqvYAed_8', desc: 'Isola o quadríceps.',
    exec: 'Ajuste o encosto, estenda os joelhos sem travar no final e volte devagar.' },
  { id: 10, nome: 'Desenvolvimento com halteres', grupo: 'Ombros', videoId: 'eufDL9MmF8A', desc: 'Constrói ombros fortes.',
    exec: 'Sentado, empurre os halteres acima da cabeça sem arquear a lombar e desça até a altura das orelhas.' },
  { id: 11, nome: 'Elevação lateral', grupo: 'Ombros', videoId: 'U_T4z45fhLw', desc: 'Foco na lateral do ombro.',
    exec: 'Com leve flexão de cotovelos, suba os halteres até a altura dos ombros, sem impulso.' },
  { id: 12, nome: 'Prancha abdominal', grupo: 'Abdômen', videoId: '9dn5Fb3cSoE', desc: 'Fortalece o core. Segure 40 segundos.',
    exec: 'Apoie antebraços e pontas dos pés, corpo em linha reta, abdômen contraído, sem deixar o quadril cair.' },
  { id: 13, nome: 'Alongamento geral', grupo: 'Corpo todo', videoId: 'w4LCsSxB-SQ', desc: 'Relaxa a musculatura. Cerca de 10 minutos.',
    exec: 'Segure cada alongamento por 20 a 30 segundos, sem dor e respirando devagar.' },
];
const porNome = (n) => EXERCICIOS.find((e) => e.nome === n);

// Rotina cadastrada pelo instrutor: dia -> [exercício, séries, repetições, carga (kg), etapa]
const SEMANA = {
  segunda: ['Treino A – Peito e tríceps', [['Supino reto', 4, 10, 40], ['Crucifixo', 3, 12, 14], ['Tríceps testa', 3, 12, 20], ['Prancha abdominal', 3, 1, null]]],
  terca: ['Treino B – Costas e bíceps', [['Puxada frontal', 4, 10, 45], ['Remada curvada', 4, 10, 35], ['Rosca direta', 3, 12, 20]]],
  quarta: ['Treino C – Pernas', [['Agachamento livre', 4, 10, 50], ['Leg press', 4, 12, 120], ['Cadeira extensora', 3, 15, 40]]],
  quinta: ['Treino D – Ombros e abdômen', [['Desenvolvimento com halteres', 4, 10, 14], ['Elevação lateral', 3, 15, 6], ['Prancha abdominal', 3, 1, null]]],
  sexta: ['Treino E – Corpo todo (leve)', [['Agachamento livre', 3, 12, 40], ['Supino reto', 3, 12, 35], ['Puxada frontal', 3, 12, 40], ['Alongamento geral', 1, 1, null]]],
  sabado: ['Treino F – Alongamento e mobilidade', [['Alongamento geral', 1, 1, null]]],
};

const rotinaAtiva = () => ({ id: 1, aluno_id: null, nome: 'Rotina de hipertrofia (demonstração)', ativa: 1 });

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

module.exports = { rotinaAtiva, exerciciosDoDia, exercicioPorId, buscarExercicio, videoDoExercicio, nomesExercicios, yt };
