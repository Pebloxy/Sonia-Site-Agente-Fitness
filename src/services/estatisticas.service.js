// src/services/estatisticas.service.js
// Estatísticas FICTÍCIAS do aluno para o painel "Evolução" (demonstração).
// Os números são gerados de forma determinística a partir do id do aluno: sempre os mesmos para o mesmo aluno.
// Quando houver dados reais no banco (check-ins), basta trocar a função historico() por uma consulta.

const TZ = 'America/Sao_Paulo';
const NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const KCAL_MIN = { Musculação: 6.5, Dança: 7.5, Pilates: 4.5, 'Muay Thai': 10 };

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, pesos) => {
  let x = r() * pesos.reduce((s, p) => s + p[1], 0);
  for (const [v, p] of pesos) { if ((x -= p) <= 0) return v; }
  return pesos[0][0];
};

const hojeStr = () => new Date().toLocaleDateString('sv-SE', { timeZone: TZ }); // 2026-11-16
const diaSemana = (d) => new Date(d + 'T12:00:00Z').getUTCDay();
const somaDias = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const mesDe = (d) => d.slice(0, 7);
const somaMes = (ym, n) => { const [y, m] = ym.split('-').map(Number); return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7); };
const inicioSemana = (d) => somaDias(d, -((diaSemana(d) + 6) % 7)); // segunda-feira
const pct = (a, b) => (b ? Math.round(((a - b) / b) * 100) : (a ? 100 : 0));

// treinos já feitos: { date, hora, modalidade, min, kcal }
function historico(hoje, seed) {
  const r = rng(seed), out = [], forcados = new Set();
  for (let i = 1, achados = 0; achados < 9 && i < 16; i++) { // últimos dias úteis sem faltar: sequência bonita
    const d = somaDias(hoje, -i);
    if (diaSemana(d) !== 0) { forcados.add(d); achados++; }
  }
  for (let i = 400; i >= 1; i--) {
    const d = somaDias(hoje, -i), dow = diaSemana(d);
    if (dow === 0) continue; // domingo fechado
    const base = dow === 6 ? 0.5 : 0.8;
    const p = base * (0.62 + 0.38 * (1 - i / 400)); // quanto mais recente, mais constante (evolução)
    if (!forcados.has(d) && r() > p) continue;
    let modalidade = 'Musculação', hora = pick(r, [[6, 0.05], [7, 0.1], [12, 0.1], [17, 0.2], [18, 0.38], [19, 0.17]]);
    const x = r();
    if ((dow === 2 || dow === 4) && x < 0.3) { modalidade = 'Dança'; hora = 19; }
    else if ((dow === 1 || dow === 3) && x < 0.12) { modalidade = 'Pilates'; hora = 8; }
    else if ((dow === 1 || dow === 3 || dow === 5) && x > 0.8) { modalidade = 'Muay Thai'; hora = 20; }
    else if (dow === 6) hora = pick(r, [[8, 0.3], [9, 0.45], [10, 0.25]]);
    const min = modalidade === 'Musculação' ? 55 + Math.round(r() * 30) : 60;
    out.push({ date: d, hora, modalidade, min, kcal: Math.round(min * KCAL_MIN[modalidade] * (0.9 + r() * 0.2)) });
  }
  return out;
}

class EstatisticasService {
  static gerar(alunoId, aluno = {}) {
    const hoje = hojeStr();
    const h = historico(hoje, 1000 + (Number(alunoId) || 1));
    const entre = (de, ate) => h.filter((t) => t.date >= de && t.date <= ate);

    // mês atual x mês anterior (mesmo trecho do mês)
    const mAtual = mesDe(hoje), mAnt = somaMes(mAtual, -1), diaDoMes = Number(hoje.slice(8, 10));
    const doMes = h.filter((t) => mesDe(t.date) === mAtual);
    const antTrecho = h.filter((t) => mesDe(t.date) === mAnt && Number(t.date.slice(8, 10)) <= diaDoMes);
    const horasMes = Math.round((doMes.reduce((s, t) => s + t.min, 0) / 60) * 10) / 10;
    const kcalMes = doMes.reduce((s, t) => s + t.kcal, 0);

    // semana atual x anterior
    const sem = inicioSemana(hoje), semAnt = somaDias(sem, -7);
    const feitosSemana = entre(somaDias(hoje, -6), hoje).length;             // últimos 7 dias
    const semanaAnterior = entre(somaDias(hoje, -13), somaDias(hoje, -7)).length; // 7 dias antes

    // sequência de dias de treino (ignora domingo)
    const datas = new Set(h.map((t) => t.date));
    let seq = 0;
    for (let i = 1; i < 120; i++) { const d = somaDias(hoje, -i); if (diaSemana(d) === 0) continue; if (datas.has(d)) seq++; else break; }
    if (datas.has(hoje)) seq++;

    // últimas 8 semanas (mini-linhas)
    const serieTreinos = [], serieHoras = [], serieKcal = [];
    for (let k = 7; k >= 0; k--) {
      const ini = somaDias(sem, -7 * k), l = entre(ini, somaDias(ini, 6));
      serieTreinos.push(l.length);
      serieHoras.push(Math.round(l.reduce((s, t) => s + t.min, 0) / 6) / 10);
      serieKcal.push(l.reduce((s, t) => s + t.kcal, 0));
    }

    // 12 meses
    const meses = [];
    for (let k = 11; k >= 0; k--) {
      const ym = somaMes(mAtual, -k);
      meses.push({ rotulo: NOMES_MES[Number(ym.slice(5)) - 1].slice(0, 3), total: h.filter((t) => mesDe(t.date) === ym).length, atual: ym === mAtual });
    }
    const completos = meses.filter((m) => !m.atual);
    const media = Math.round((completos.reduce((s, m) => s + m.total, 0) / (completos.length || 1)) * 10) / 10;

    // horários e modalidades (90 dias)
    const ult90 = entre(somaDias(hoje, -90), hoje);
    const porHorario = [];
    for (let hr = 6; hr <= 21; hr++) porHorario.push({ hora: hr, total: ult90.filter((t) => t.hora === hr).length });
    const pico = porHorario.reduce((a, b) => (b.total > a.total ? b : a), porHorario[0]).hora;
    const modalidades = Object.keys(KCAL_MIN).map((nome) => ({ nome, total: ult90.filter((t) => t.modalidade === nome).length })).filter((m) => m.total > 0);
    const totMod = modalidades.reduce((s, m) => s + m.total, 0) || 1;
    modalidades.forEach((m) => { m.pct = Math.round((m.total / totMod) * 100); });

    // calendário: 12 semanas (colunas) x 7 dias (seg..dom); nivel -1 = futuro
    const calendario = [];
    for (let w = 11; w >= 0; w--) {
      const col = [];
      for (let d = 0; d < 7; d++) {
        const date = somaDias(sem, -7 * w + d), t = h.filter((x) => x.date === date);
        col.push({ date, nivel: date > hoje ? -1 : (!t.length ? 0 : t[0].min >= 80 ? 4 : t[0].min >= 65 ? 3 : t[0].min >= 55 ? 2 : 1), modalidade: t.length ? t[0].modalidade : '', min: t.length ? t[0].min : 0 });
      }
      calendario.push(col);
    }

    // evolução de carga (kg), 8 semanas, crescente
    const rc = rng(7 + (Number(alunoId) || 1));
    const carga = (ini, fim) => Array.from({ length: 8 }, (_, i) => Math.round((ini + ((fim - ini) * i) / 7 + (rc() - 0.5) * 2) / 2.5) * 2.5);
    const cargas = [{ nome: 'Supino reto', valores: carga(60, 72.5) }, { nome: 'Agachamento livre', valores: carga(80, 102.5) }];

    // conquistas
    const madrugador = h.filter((t) => t.hora <= 7 && t.date >= somaDias(hoje, -60)).length;
    const dancas = ult90.filter((t) => t.modalidade === 'Dança').length;
    const conquistas = [
      { titulo: '7 treinos seguidos', desc: 'Sem faltar nos dias de treino', atual: Math.min(seq, 7), meta: 7 },
      { titulo: 'Mês de 20 treinos', desc: NOMES_MES[Number(mAtual.slice(5)) - 1], atual: Math.min(doMes.length, 20), meta: 20 },
      { titulo: 'Madrugador', desc: '5 treinos antes das 8h', atual: Math.min(madrugador, 5), meta: 5 },
      { titulo: 'Dançarino', desc: 'Faça 3 aulas de dança', atual: Math.min(dancas, 3), meta: 3 },
    ].map((c) => ({ ...c, feito: c.atual >= c.meta }));

    const vsMes = pct(doMes.length, antTrecho.length);
    let insight;
    if (seq >= 7) insight = `Você está numa sequência de ${seq} treinos seguidos. Isso é consistência de monstro! 🔥`;
    else if (vsMes >= 0) insight = `Você já treinou ${doMes.length}x este mês, ${vsMes}% a mais que no mesmo período do mês passado. Bora manter o ritmo!`;
    else insight = `Você treinou ${doMes.length}x este mês. Que tal agendar uma aula e voltar ao ritmo? Eu te ajudo!`;

    return {
      demo: true,
      primeiroNome: String(aluno.nome || 'Aluno').split(' ')[0],
      insight,
      kpis: {
        treinosMes: { valor: doMes.length, vs: vsMes, serie: serieTreinos },
        sequencia: { valor: seq, serie: serieTreinos.map((_, i) => Math.max(1, Math.round((seq * (i + 1)) / 8))) },
        horasMes: { valor: horasMes, serie: serieHoras },
        caloriasMes: { valor: kcalMes, serie: serieKcal },
      },
      metas: {
        semana: { feitos: feitosSemana, meta: 5, vs: pct(feitosSemana, semanaAnterior) },
        mes: { feitos: doMes.length, meta: 20, vs: vsMes },
      },
      meses, media, porHorario, pico, modalidades, calendario, cargas, conquistas,
    };
  }
}

module.exports = EstatisticasService;
