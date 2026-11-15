// src/services/tts.service.js
// Serviço opcional de síntese de voz (Edge TTS e Gemini TTS)
const { spawn } = require('child_process');
const path = require('path');

const API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_BASE = process.env.GEMINI_BASE || 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_TTS_MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-3.1-flash-tts-preview';
const GEMINI_TTS_VOICE = process.env.GEMINI_TTS_VOICE || 'Kore';
const GEMINI_TTS_ON = !!API_KEY && (process.env.GEMINI_TTS || 'off').toLowerCase() === 'on';
const EDGE_TTS_ON = (process.env.EDGE_TTS || 'on').toLowerCase() !== 'off';
const EDGE_VOICE = process.env.EDGE_TTS_VOICE || 'pt-BR-FranciscaNeural';
const EDGE_RATE = process.env.EDGE_TTS_RATE || '+5%';
const EDGE_PITCH = process.env.EDGE_TTS_PITCH || '+0Hz';

let worker = null;
let workerStarting = null;
let reqId = 0;
const pending = new Map();

function spawnPyEdge() {
  const script = path.join(__dirname, '..', '..', 'tts', 'edge_worker.py');
  const py = process.env.PYTHON_CMD || (process.platform === 'win32' ? 'python' : 'python3');
  const p = spawn(py, [script], { stdio: ['pipe', 'pipe', 'inherit'] });
  p.on('error', () => {});
  return p;
}

function pyEdge() {
  if (!EDGE_TTS_ON) return Promise.resolve(null);
  if (worker && !worker.killed) return Promise.resolve(worker);
  if (!workerStarting) {
    workerStarting = new Promise(resolve => {
      let p;
      try {
        p = spawnPyEdge();
      } catch (_) {
        return resolve(null);
      }
      let first = true, buf = '';
      p.stdout.on('data', c => {
        buf += c;
        let idx;
        while ((idx = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line) continue;
          let m;
          try {
            m = JSON.parse(line);
          } catch (_) {
            continue;
          }
          if (first) {
            first = false;
            if (m.ready) {
              worker = p;
              resolve(p);
            } else {
              resolve(null);
            }
            continue;
          }
          const task = pending.get(m.id);
          if (task) {
            pending.delete(m.id);
            clearTimeout(task.timer);
            if (m.ok) task.resolve(Buffer.from(m.b64, 'base64'));
            else task.reject(new Error(m.error || 'falha no edge-tts'));
          }
        }
      });
      p.on('exit', () => {
        worker = null;
        if (first) {
          first = false;
          resolve(null);
        }
      });
    }).catch(() => {
      setTimeout(() => {
        workerStarting = null;
      }, 60000);
      return null;
    });
  }
  return workerStarting;
}

async function edgeTts(text) {
  const w = await pyEdge();
  if (!w) throw new Error('edge-tts não disponível');
  return new Promise((resolve, reject) => {
    const id = ++reqId;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('tempo esgotado'));
    }, 20000);
    pending.set(id, { resolve, reject, timer });
    w.stdin.write(JSON.stringify({ id, text, voice: EDGE_VOICE, rate: EDGE_RATE, pitch: EDGE_PITCH }) + '\n');
  });
}

function pcmToWav(pcm, sampleRate = 24000) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(sampleRate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

async function geminiTts(text) {
  if (!API_KEY) throw new Error('sem-chave');
  const r = await fetch(`${GEMINI_BASE}/models/${GEMINI_TTS_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Diga em português do Brasil, de forma animada, jovem e simpática: ${text}` }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: GEMINI_TTS_VOICE } } },
      },
    }),
    signal: AbortSignal.timeout(30000),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('gemini-tts');
  const part = (((data.candidates || [])[0] || {}).content || {}).parts;
  const inline = (part || []).map(p => p.inlineData).find(d => d && d.data);
  if (!inline) throw new Error('sem-audio');
  return pcmToWav(Buffer.from(inline.data, 'base64'));
}

async function sintetizarVoz(text) {
  try {
    const audioBuffer = await edgeTts(text);
    return { buffer: audioBuffer, type: 'audio/mpeg' };
  } catch (err) {
    if (GEMINI_TTS_ON) {
      const audioBuffer = await geminiTts(text);
      return { buffer: audioBuffer, type: 'audio/wav' };
    }
    throw err;
  }
}

async function obterStatusTts() {
  const edge = !!(await pyEdge());
  return {
    available: edge || GEMINI_TTS_ON,
    engine: edge ? 'edge' : GEMINI_TTS_ON ? 'gemini' : 'browser',
  };
}

module.exports = {
  sintetizarVoz,
  obterStatusTts,
  pyEdge,
};

