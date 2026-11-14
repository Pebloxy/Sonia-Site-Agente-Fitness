// Servidor da Sonia. Usa apenas recursos que já vêm no Node (18+): sem instalar pacotes.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { PERSONA } = require('./persona.js');
const D = require('./src/data.js');
const { declaracoes, runTool } = require('./src/tools.js');

// ---- lê o arquivo .env (GEMINI_API_KEY, GEMINI_MODEL, PORT) ----
try {
  const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  for (const line of envFile.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch (_) { /* sem .env: usa variáveis do ambiente (ex.: serviço de hospedagem) */ }

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY || '';
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const PUBLIC = path.join(__dirname, 'public');
const TTS_URL = process.env.TTS_URL || 'http://127.0.0.1:8880';   // servidor de voz (tts/kokoro_server.py), opcional
const TTS_VOICE = process.env.TTS_VOICE || 'pf_dora';
// Voz de IA do Gemini (usa a mesma chave do chat). Desligue com GEMINI_TTS=off
const GEMINI_BASE = process.env.GEMINI_BASE || 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_TTS_MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-3.1-flash-tts-preview';
const GEMINI_TTS_VOICE = process.env.GEMINI_TTS_VOICE || 'Kore';
const GEMINI_TTS_ON = !!API_KEY && (process.env.GEMINI_TTS || 'on').toLowerCase() !== 'off';

const MAX_MSG = 1000;      // caracteres por mensagem
const MAX_HISTORY = 20;    // mensagens enviadas ao Gemini

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.wav': 'audio/wav' };

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function contexto() {
  const n = D.agora(), a = D.ALUNO;
  return `\n\nCONTEXTO (use nas ferramentas)\n- Agora: ${D.nomeDia(n.date)}, ${D.dataBR(n.date)} (${n.date}), ${n.time}, horário de Brasília.\n- Aluno logado: ${a.nome}, ${a.idade} anos, ${a.pesoKg} kg, ${a.alturaM} m, nível ${a.nivel}, objetivo: ${a.objetivo}, instrutor: ${a.instrutor}.\n- Os dados da academia são fictícios (demonstração).`;
}

async function callGemini(contents) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: PERSONA + contexto() }] },
      contents,
      tools: [{ functionDeclarations: declaracoes }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error('Gemini:', r.status, (data.error && data.error.message) || '');
    throw new Error(r.status === 429 ? 'limite' : 'gemini');
  }
  return data;
}

// Conversa com o Gemini: ele pode pedir ferramentas; executamos e devolvemos o resultado até vir a resposta final.
async function askGemini(history) {
  if (!API_KEY) {
    return { reply: '[modo teste: falta a GEMINI_API_KEY no arquivo .env] Oi, eu sou a Sonia! Assim que a chave for configurada, eu respondo de verdade. 💪', cards: [] };
  }
  const contents = history.map((m) => ({ role: m.role === 'sonia' ? 'model' : 'user', parts: [{ text: m.text }] }));
  const cards = [];
  for (let i = 0; i < 6; i++) {
    const data = await callGemini(contents);
    const cand = data.candidates && data.candidates[0];
    const parts = (cand && cand.content && cand.content.parts) || [];
    const calls = parts.filter((p) => p.functionCall);
    if (!calls.length) {
      const text = parts.map((p) => p.text || '').join('').trim();
      if (!text) throw new Error('vazio');
      return { reply: text, cards };
    }
    contents.push(cand.content); // devolve o turno do modelo exatamente como veio
    const respostas = calls.map((p) => {
      const out = runTool(p.functionCall.name, p.functionCall.args);
      cards.push(...out.cards);
      return { functionResponse: { name: p.functionCall.name, response: out.result } };
    });
    contents.push({ role: 'user', parts: respostas });
  }
  throw new Error('muitas-chamadas');
}

// PCM 16 bits mono 24 kHz (formato que o Gemini devolve) -> WAV, que o navegador toca direto
function pcmToWav(pcm, rate = 24000) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

async function geminiTts(text) {
  const r = await fetch(`${GEMINI_BASE}/models/${GEMINI_TTS_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Diga em português do Brasil, de forma animada, jovem e simpática: ${text}` }] }],
      generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: GEMINI_TTS_VOICE } } } },
    }),
    signal: AbortSignal.timeout(30000),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) { console.error('Gemini TTS:', r.status, (data.error && data.error.message) || ''); throw new Error('gemini-tts'); }
  const part = (((data.candidates || [])[0] || {}).content || {}).parts;
  const inline = (part || []).map((p) => p.inlineData).find((d) => d && d.data);
  if (!inline) throw new Error('sem-audio');
  return pcmToWav(Buffer.from(inline.data, 'base64'));
}

async function kokoroUp() {
  try { return (await fetch(`${TTS_URL}/health`, { signal: AbortSignal.timeout(1000) })).ok; } catch (_) { return false; }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'POST' && url.pathname === '/api/chat') {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 50000) req.destroy(); });
    req.on('end', async () => {
      try {
        const { messages } = JSON.parse(raw || '{}');
        if (!Array.isArray(messages) || !messages.length) return send(res, 400, { error: 'Mensagem vazia.' });
        const history = messages.slice(-MAX_HISTORY)
          .map((m) => ({ role: m.role === 'sonia' ? 'sonia' : 'user', text: String(m.text || '').slice(0, MAX_MSG) }))
          .filter((m) => m.text.trim());
        if (!history.length || history[history.length - 1].role !== 'user') return send(res, 400, { error: 'Mensagem inválida.' });
        const { reply, cards } = await askGemini(history);
        send(res, 200, { reply, cards });
      } catch (e) {
        const friendly = e.message === 'limite'
          ? 'Eita, recebi mensagem demais agora! Espera um minutinho e tenta de novo, combinado?'
          : 'Ops, tive um probleminha aqui. Tenta de novo em instantes!';
        send(res, 200, { reply: friendly, error: true });
      }
    });
    return;
  }

  // voz da Sonia (Kokoro): o navegador pergunta se está disponível e pede o áudio de cada fala
  if (req.method === 'GET' && url.pathname === '/api/tts-status') {
    const k = await kokoroUp();
    return send(res, 200, { available: k || GEMINI_TTS_ON, engine: k ? 'kokoro' : (GEMINI_TTS_ON ? 'gemini' : 'none') });
  }
  if (req.method === 'POST' && url.pathname === '/api/tts') {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 5000) req.destroy(); });
    req.on('end', async () => {
      try {
        const text = String(JSON.parse(raw || '{}').text || '').slice(0, 700).trim();
        if (!text) return send(res, 400, { error: 'Texto vazio.' });
        if (await kokoroUp()) {
          const r = await fetch(`${TTS_URL}/tts`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voice: TTS_VOICE }), signal: AbortSignal.timeout(30000),
          });
          if (r.ok) return send(res, 200, Buffer.from(await r.arrayBuffer()), 'audio/wav');
        }
        if (!GEMINI_TTS_ON) throw new Error('sem-voz');
        send(res, 200, await geminiTts(text), 'audio/wav');
      } catch (_) { send(res, 503, { error: 'Voz indisponível.' }); }
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/reset') { // reinicia os agendamentos de demonstração
    D.semear();
    return send(res, 200, { ok: true });
  }

  if (req.method === 'GET') {
    const file = path.normalize(path.join(PUBLIC, url.pathname === '/' ? 'index.html' : url.pathname));
    if (!file.startsWith(PUBLIC)) return send(res, 403, 'Proibido', 'text/plain');
    fs.readFile(file, (err, buf) => {
      if (err) return send(res, 404, 'Não encontrado', 'text/plain');
      send(res, 200, buf, TYPES[path.extname(file)] || 'application/octet-stream');
    });
    return;
  }
  send(res, 405, 'Método não permitido', 'text/plain');
});

server.listen(PORT, () => {
  console.log(`Sonia no ar: http://localhost:${PORT}  (modelo: ${MODEL}, chave: ${API_KEY ? 'ok' : 'FALTANDO'})`);
});
