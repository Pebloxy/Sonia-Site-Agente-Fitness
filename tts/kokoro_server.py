"""Voz da Sonia com o Kokoro-82M (modelo aberto, roda no seu PC, sem chave).

Como usar (uma vez):
  1) Python 3.10 a 3.13  ->  https://www.python.org/downloads/   (marque "Add Python to PATH")
  2) espeak-ng           ->  Windows: baixe o .msi em https://github.com/espeak-ng/espeak-ng/releases
  3) No terminal:        pip install kokoro soundfile
Para rodar (em um terminal separado do "node server.js"):
     python tts/kokoro_server.py
Na primeira vez ele baixa o modelo (algumas centenas de MB). Quando aparecer "Voz pronta", reabra o site.
"""
import io, json, os, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import numpy as np
import soundfile as sf
from kokoro import KPipeline

PORT = int(os.environ.get("TTS_PORT", "8880"))
DEFAULT_VOICE = os.environ.get("TTS_VOICE", "pf_dora")   # pt-BR: pf_dora (feminina), pm_alex, pm_santa (masculinas)
DEFAULT_SPEED = float(os.environ.get("TTS_SPEED", "1.0"))
MAX_CHARS = 700

print("Carregando o Kokoro (a primeira vez baixa o modelo)...", flush=True)
pipeline = KPipeline(lang_code="p")   # 'p' = português do Brasil
SAMPLE_RATE = 24000


def falar(texto, voz, velocidade):
    pedacos = []
    for _, _, audio in pipeline(texto, voice=voz, speed=velocidade, split_pattern=r"\n+"):
        if audio is not None:
            pedacos.append(np.asarray(audio, dtype="float32"))
    if not pedacos:
        raise ValueError("sem áudio")
    buf = io.BytesIO()
    sf.write(buf, np.concatenate(pedacos), SAMPLE_RATE, format="WAV")
    return buf.getvalue()


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body, tipo="application/json"):
        self.send_response(code)
        self.send_header("Content-Type", tipo)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            return self._send(200, b'{"ok":true}')
        self._send(404, b"{}")

    def do_POST(self):
        if self.path != "/tts":
            return self._send(404, b"{}")
        try:
            n = int(self.headers.get("Content-Length", "0"))
            dados = json.loads(self.rfile.read(n) or b"{}")
            texto = str(dados.get("text", "")).strip()[:MAX_CHARS]
            if not texto:
                return self._send(400, b'{"error":"texto vazio"}')
            voz = str(dados.get("voice") or DEFAULT_VOICE)
            vel = float(dados.get("speed") or DEFAULT_SPEED)
            self._send(200, falar(texto, voz, vel), "audio/wav")
        except Exception as e:  # não derruba o servidor
            print("Erro ao gerar voz:", e, file=sys.stderr, flush=True)
            self._send(500, b'{"error":"falha"}')

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    # aquece o modelo para a primeira fala não demorar
    try:
        falar("Oi", DEFAULT_VOICE, DEFAULT_SPEED)
    except Exception as e:
        print("Aviso no aquecimento:", e, flush=True)
    print(f"Voz pronta: http://127.0.0.1:{PORT}  (voz: {DEFAULT_VOICE})", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
