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
// Voz de IA do Gemini (usa a mesma chave do chat). Desligue com GEMINI_TTS=off
const GEMINI_BASE = process.env.GEMINI_BASE || 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_TTS_MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-3.1-flash-tts-preview';
const GEMINI_TTS_VOICE = process.env.GEMINI_TTS_VOICE || 'Kore';
const GEMINI_TTS_ON = !!API_KEY && (process.env.GEMINI_TTS || 'off').toLowerCase() === 'on';   // desligado por padrão (cota grátis é de 10 pedidos/dia)
// Voz neural da Microsoft (edge-tts): grátis, sem chave. Precisa de Python + "pip install edge-tts" (opcional)
const EDGE_TTS_ON = (process.env.EDGE_TTS || 'on').toLowerCase() !== 'off';
const EDGE_VOICE = process.env.EDGE_TTS_VOICE || 'pt-BR-FranciscaNeural';   // outra: pt-BR-AntonioNeural, pt-BR-ThalitaNeural
const EDGE_RATE = process.env.EDGE_TTS_RATE || '+5%';
const EDGE_PITCH = process.env.EDGE_TTS_PITCH || '+0Hz';

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

// edge-tts: o server.js abre sozinho um ajudante em Python (tts/edge_worker.py) e o deixa rodando,
// assim cada fala não precisa abrir o Python de novo. Precisa de Python + "pip install edge-tts" (opcional).
const { spawn } = require('child_process');
const PY_CANDIDATES = process.env.PYTHON_CMD
  ? [process.env.PYTHON_CMD.split(' ').filter(Boolean)]
  : (process.platform === 'win32' ? [['py', '-3.12'], ['py', '-3'], ['python']] : [['python3'], ['python']]);
const WORKER = path.join(__dirname, 'tts', 'edge_worker.py');
let worker = null, workerStarting = null, reqId = 0;
const pending = new Map();

function failAll(msg) { for (const [, p] of pending) { clearTimeout(p.timer); p.reject(new Error(msg)); } pending.clear(); }

function startWorker(cmd) {
  return new Promise((resolve) => {
    let buf = '', ready = false;
    const p = spawn(cmd[0], [...cmd.slice(1), WORKER], { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
    const giveUp = setTimeout(() => { if (!ready) { p.kill(); resolve(null); } }, 10000);
    p.stdin.on('error', () => {});
    p.on('error', () => { clearTimeout(giveUp); if (!ready) resolve(null); });
    p.on('close', () => { clearTimeout(giveUp); if (worker === p) { worker = null; workerStarting = null; } failAll('ajudante de voz parou'); if (!ready) resolve(null); });
    p.stdout.setEncoding('utf8');
    p.stdout.on('data', (d) => {
      buf += d; let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1);
        let m; try { m = JSON.parse(line); } catch (_) { continue; }
        if (m.ready === true && !ready) { ready = true; clearTimeout(giveUp); resolve(p); }
        else if (m.id !== undefined && pending.has(m.id)) {
          const q = pending.get(m.id); pending.delete(m.id); clearTimeout(q.timer);
          m.ok ? q.resolve(Buffer.from(m.b64, 'base64')) : q.reject(new Error(m.error || 'falha'));
        }
      }
    });
  });
}
function pyEdge() {
  if (!EDGE_TTS_ON) return Promise.resolve(null);
  if (worker) return Promise.resolve(worker);
  if (!workerStarting) {
    workerStarting = (async () => {
      for (const c of PY_CANDIDATES) { const p = await startWorker(c); if (p) { worker = p; return p; } }
      return null;
    })().then((p) => { if (!p) setTimeout(() => { workerStarting = null; }, 60000); return p; });   // sem Python: tenta de novo só em 1 min
  }
  return workerStarting;
}
async function edgeTts(text) {
  const w = await pyEdge();
  if (!w) throw new Error('edge-tts (Python) não encontrado');
  return new Promise((resolve, reject) => {
    const id = ++reqId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('tempo esgotado')); }, 20000);
    pending.set(id, { resolve, reject, timer });
    w.stdin.write(JSON.stringify({ id, text, voice: EDGE_VOICE, rate: EDGE_RATE, pitch: EDGE_PITCH }) + '\n');
  });
}
process.on('exit', () => { if (worker) worker.kill(); });

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

  // voz da Sonia (Gemini TTS): o navegador pergunta se está disponível e pede o áudio de cada fala
  if (req.method === 'GET' && url.pathname === '/api/tts-status') {
    const edge = !!(await pyEdge());
    return send(res, 200, { available: edge || GEMINI_TTS_ON, engine: edge ? 'edge' : (GEMINI_TTS_ON ? 'gemini' : 'none') });
  }
  if (req.method === 'POST' && url.pathname === '/api/tts') {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 5000) req.destroy(); });
    req.on('end', async () => {
      try {
        const text = String(JSON.parse(raw || '{}').text || '').slice(0, 700).trim();
        if (!text) return send(res, 400, { error: 'Texto vazio.' });
        try { return send(res, 200, await edgeTts(text), 'audio/mpeg'); }
        catch (e) { if (EDGE_TTS_ON) console.error('Edge TTS:', e.message); }
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
  pyEdge().then((w) => console.log(w ? 'Voz neural (edge-tts): pronta' : 'Voz neural (edge-tts): indisponível, usando a voz do navegador'));
  console.log(`Sonia no ar: http://localhost:${PORT}  (modelo: ${MODEL}, chave: ${API_KEY ? 'ok' : 'FALTANDO'})`);
});
