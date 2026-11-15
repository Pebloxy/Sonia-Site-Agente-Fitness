"""Ajudante de voz da Sonia (edge-tts). O server.js abre este programa sozinho e o deixa rodando,
para cada fala não precisar abrir o Python de novo. Requer: pip install edge-tts
Protocolo: lê uma linha JSON por pedido na entrada e responde uma linha JSON na saída."""
import asyncio, base64, json, sys

try:
    import edge_tts
except Exception as e:  # sem o pacote: avisa e sai (o site usa a voz do navegador)
    print(json.dumps({"ready": False, "error": str(e)}), flush=True)
    sys.exit(1)

sys.stdin.reconfigure(encoding="utf-8")


async def falar(pedido, escrever):
    try:
        com = edge_tts.Communicate(pedido["text"], pedido["voice"], rate=pedido.get("rate", "+0%"), pitch=pedido.get("pitch", "+0Hz"))
        audio = bytearray()
        async for pedaco in com.stream():
            if pedaco["type"] == "audio":
                audio += pedaco["data"]
        if not audio:
            raise RuntimeError("sem áudio")
        escrever({"id": pedido["id"], "ok": True, "b64": base64.b64encode(bytes(audio)).decode("ascii")})
    except Exception as e:
        escrever({"id": pedido["id"], "ok": False, "error": str(e)[:200]})


async def principal():
    loop = asyncio.get_running_loop()
    escrever = lambda obj: (sys.stdout.write(json.dumps(obj) + "\n"), sys.stdout.flush())
    escrever({"ready": True})
    tarefas = set()
    while True:
        linha = await loop.run_in_executor(None, sys.stdin.readline)
        if not linha:
            break  # o site fechou
        try:
            pedido = json.loads(linha)
        except Exception:
            continue
        t = asyncio.create_task(falar(pedido, escrever))
        tarefas.add(t); t.add_done_callback(tarefas.discard)
    if tarefas:
        await asyncio.gather(*tarefas, return_exceptions=True)


asyncio.run(principal())
