// Servidor da Sonia. Usa apenas recursos que já vêm no Node (18+): sem instalar pacotes.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { PERSONA } = require('./persona.js');

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

const MAX_MSG = 1000;      // caracteres por mensagem
const MAX_HISTORY = 20;    // mensagens enviadas ao Gemini

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

async function askGemini(history) {
  // Sem chave: resposta de teste, para a tela funcionar mesmo sem o Gemini configurado.
  if (!API_KEY) {
    return '[modo teste: falta a GEMINI_API_KEY no arquivo .env] Oi, eu sou a Sonia! Assim que a chave for configurada, eu respondo de verdade. 💪';
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: PERSONA }] },
      contents: history.map((m) => ({ role: m.role === 'sonia' ? 'model' : 'user', parts: [{ text: m.text }] })),
      generationConfig: { temperature: 0.7, maxOutputTokens: 400 },
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (data.error && data.error.message) || `erro ${r.status}`;
    console.error('Gemini:', r.status, msg);
    throw new Error(r.status === 429 ? 'limite' : 'gemini');
  }
  const parts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
  const text = parts && parts.map((p) => p.text || '').join('').trim();
  if (!text) throw new Error('vazio');
  return text;
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
        const reply = await askGemini(history);
        send(res, 200, { reply });
      } catch (e) {
        const friendly = e.message === 'limite'
          ? 'Eita, recebi mensagem demais agora! Espera um minutinho e tenta de novo, combinado?'
          : 'Ops, tive um probleminha aqui. Tenta de novo em instantes!';
        send(res, 200, { reply: friendly, error: true });
      }
    });
    return;
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
