// Teste local das regras e do ciclo de ferramentas, com um "Gemini" simulado (não usa internet nem chave).
process.env.DEMO_NOW = '2026-11-12 10:00'; // quinta-feira
process.env.GEMINI_API_KEY = 'teste';
process.env.PORT = '3199';
const assert = require('assert');
const D = require('./src/data.js');
const { runTool } = require('./src/tools.js');
const hoje = '2026-11-12', amanha = '2026-11-13';

function t(nome, args) { return runTool(nome, args).result; }
let n = 0; const ok = (c, m) => { assert(c, m); n++; console.log('ok -', m); };

// semente: amanhã 18:00 está cheio; 19:00 com 2 de 3 vagas
ok(D.ocupadas(amanha, '18:00') === 3, 'bloco das 18:00 de amanhã começa cheio');
let r = t('agendar_aula', { data: amanha, hora: '18:00' });
ok(r.ok === false && /cheio/.test(r.mensagem) && r.horarios_com_vaga_no_dia.length > 0, 'RN02: bloco cheio recusa e oferece alternativas');
r = t('agendar_aula', { data: amanha, hora: '19:00' });
ok(r.ok === true, 'agenda o bloco das 19:00 (última vaga)');
r = t('agendar_aula', { data: amanha, hora: '19:00' });
ok(r.ok === false && /RN03/.test(r.mensagem), 'RN03: não agenda o mesmo dia/horário duas vezes');
r = t('agendar_aula', { data: '2026-11-15', hora: '10:00' });
ok(r.ok === false && /Não há aula/.test(r.mensagem), 'domingo fechado');
r = t('agendar_aula', { data: hoje, hora: '09:00' });
ok(r.ok === false && /passou/.test(r.mensagem), 'não agenda horário que já passou');
r = t('agendar_aula', { data: amanha, hora: '19:30' });
ok(r.ok === false, 'só aceita blocos de hora cheia');
r = t('horarios_disponiveis', { data: amanha });
ok(!r.horarios_com_vaga.find((b) => b.hora === '18:00') && !r.horarios_com_vaga.find((b) => b.hora === '19:00'), 'lista de vagas não mostra blocos cheios');

// RN04: cancelar/reagendar com 2h de antecedência
t('agendar_aula', { data: hoje, hora: '11:00' });  // daqui a 1h
r = t('cancelar_aula', { data: hoje, hora: '11:00' });
ok(r.ok === false && /2 horas/.test(r.mensagem), 'RN04: não cancela com menos de 2h');
t('agendar_aula', { data: hoje, hora: '13:00' });  // daqui a 3h
r = t('reagendar_aula', { data_atual: hoje, hora_atual: '13:00', nova_data: amanha, nova_hora: '07:00' });
ok(r.ok === true, 'RN04: reagenda com mais de 2h');
r = t('cancelar_aula', { data: amanha, hora: '07:00' });
ok(r.ok === true, 'cancela aula com antecedência');
r = t('cancelar_aula', { data: amanha, hora: '07:00' });
ok(r.ok === false, 'não cancela aula inexistente');

// RN06: check-in
D.semear();
process.env.DEMO_NOW = '2026-11-12 10:00'; t('agendar_aula', { data: hoje, hora: '12:00' });
process.env.DEMO_NOW = '2026-11-12 12:05'; r = t('fazer_checkin');
ok(r.ok === true, 'RN06: check-in dentro dos 10 minutos');
D.semear(); process.env.DEMO_NOW = '2026-11-12 10:00'; t('agendar_aula', { data: hoje, hora: '12:00' });
process.env.DEMO_NOW = '2026-11-12 12:11'; r = t('fazer_checkin');
ok(r.ok === false && /falta/.test(r.mensagem), 'RN06: após 10 minutos a vaga é liberada e a falta registrada');
process.env.DEMO_NOW = '2026-11-12 10:00'; D.semear();

// outras ferramentas
r = t('mostrar_video', { exercicio: 'Agachamento' });
ok(r.ok && r.como_executar, 'vídeo: encontra exercício por nome parcial');
r = t('mostrar_video', { exercicio: 'moonwalk' });
ok(r.ok === false, 'vídeo: exercício fora do catálogo');
r = t('consultar_rotina', { dia: 'hoje' });
ok(/Ombros/.test(r.treino), 'rotina de quinta = Treino D');
r = t('consultar_rotina', { dia: 'domingo' });
ok(/descanso/.test(r.mensagem), 'domingo = descanso');
r = t('encaminhar_equipe', { assunto: 'cancelar plano', destino: 'recepção' });
ok(r.ok, 'encaminha assunto à recepção');

// ---- ciclo do servidor com Gemini simulado ----
let chamadas = 0;
global.fetch = async (url, opts) => {
  const body = JSON.parse(opts.body); chamadas++;
  const ultimo = body.contents[body.contents.length - 1];
  const json = (o) => ({ ok: true, status: 200, json: async () => o });
  if (chamadas === 1) return json({ candidates: [{ content: { role: 'model', parts: [{ functionCall: { name: 'mostrar_video', args: { exercicio: 'supino' } }, thoughtSignature: 'abc' }] } }] });
  assert(ultimo.parts[0].functionResponse.name === 'mostrar_video', 'resposta da ferramenta devolvida ao modelo');
  assert(body.contents[body.contents.length - 2].parts[0].thoughtSignature === 'abc', 'turno do modelo devolvido intacto');
  assert(body.tools[0].functionDeclarations.length >= 10 && /CONTEXTO/.test(body.system_instruction.parts[0].text), 'ferramentas e contexto enviados');
  return json({ candidates: [{ content: { role: 'model', parts: [{ text: 'Bora de supino! 💪' }] } }] });
};
const http = require('http');
require('./server.js');
setTimeout(() => {
  const req = http.request({ port: 3199, path: '/api/chat', method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
    let b = ''; res.on('data', (c) => (b += c)); res.on('end', () => {
      const j = JSON.parse(b);
      ok(j.reply === 'Bora de supino! 💪' && j.cards.length === 1 && j.cards[0].tipo === 'video', 'servidor: ciclo de ferramentas devolve resposta + cartão de vídeo');
      console.log(`\n${n} verificações passaram.`); process.exit(0);
    });
  });
  req.end(JSON.stringify({ messages: [{ role: 'user', text: 'me mostra o supino' }] }));
}, 500);
